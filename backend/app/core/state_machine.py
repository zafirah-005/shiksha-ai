from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from app.core import config
from app.core.llm import structured_call
from app.rag import retriever
from app.schemas.evaluation import Adaptation, EvaluationResult
from app.schemas.lesson import Explanation, LessonPlan, LessonSegmentPlan, VisualSpec
from app.schemas.quiz import QuizItem
from app.visuals.diagram_spec import validate_mermaid_syntax
from app.visuals.image_spec import search_pexels_photo

_LANGUAGE_NAMES = {
    "hi": "Hindi (Devanagari script)",
    "hinglish": (
        "Hinglish (a natural mix of Hindi and English the way young urban Indians "
        "actually speak/write it -- Latin script, freely code-switching between "
        "Hindi and English words, not pure Hindi transliterated)"
    ),
}


def _language_instruction(language: str) -> str:
    """English needs no special instruction (it's the model's default); any
    other language gets an explicit, repeated instruction on every call,
    since nothing else in these prompts implies a language."""
    name = _LANGUAGE_NAMES.get(language)
    if not name:
        return ""
    return f" Respond entirely in {name} -- all text, including questions and feedback."


@dataclass
class SegmentRecord:
    segment_id: str
    title: str
    question: str
    first_answer: str
    first_correct: bool
    misconception_label: Optional[str] = None
    retried: bool = False
    retry_answer: Optional[str] = None
    final_correct: Optional[bool] = None


@dataclass
class LessonSession:
    topic: str
    learner_level: str = "beginner"
    doc_path: Optional[str] = None
    doc_id: Optional[str] = None
    is_grounded: bool = False
    plan: Optional[LessonPlan] = None
    history: list[SegmentRecord] = field(default_factory=list)
    # Optional text block summarizing this learner's past sessions (weak
    # areas, misconceptions, topics), injected into the Plan step so it
    # actually shapes the lesson instead of just sitting in a database.
    learner_history_summary: str = ""
    # "en", "hi", "hinglish", ... -- threaded into every generation prompt
    # below so the whole lesson (not just some of it) is in one language.
    language: str = "en"
    # Raw display name (e.g. "Priya"), not the normalized learner_id -- used
    # to personalize the Evaluate step's reaction text. Empty is fine; the
    # prompt falls back to a warm generic line instead of a placeholder name.
    learner_display_name: str = ""

    def understand(self) -> None:
        """Understand step: ingest and index the source document, if one was given."""
        if self.doc_path:
            self.doc_id = uuid.uuid4().hex[:12]
            n_chunks = retriever.index_document(self.doc_id, self.doc_path)
            self.is_grounded = n_chunks > 0

    def _context_for(self, query: str) -> str:
        if not self.is_grounded or not self.doc_id:
            return ""
        chunks = retriever.retrieve(self.doc_id, query)
        if not chunks:
            return ""
        joined = "\n\n---\n\n".join(chunks)
        return f"Use ONLY the following source material as ground truth where relevant:\n\n{joined}"

    def make_plan(self) -> LessonPlan:
        """Plan step: produce an ordered lesson plan, grounded in the document if present
        and personalized against the learner's past session history if available."""
        context = self._context_for(self.topic)
        system = (
            "You are an expert curriculum designer creating a short, focused lesson plan. "
            "Break the topic into 3-5 small teachable segments in a sensible order, easiest "
            "concepts first. Keep it realistic for a single short tutoring session."
            + _language_instruction(self.language)
        )
        history_block = f"\n{self.learner_history_summary}\n" if self.learner_history_summary else ""
        user = (
            f"Topic: {self.topic}\n"
            f"Learner level: {self.learner_level}\n"
            f"{context}\n"
            f"{history_block}\n"
            "Produce the lesson plan."
        )
        self.plan = structured_call(
            model=config.PLANNING_MODEL,
            system=system,
            user=user,
            schema_model=LessonPlan,
            tool_name="submit_lesson_plan",
            tool_description="Submit the structured lesson plan.",
        )
        return self.plan

    def explain(self, segment: LessonSegmentPlan) -> Explanation:
        """Explain step: grounded explanation for a single segment."""
        context = self._context_for(f"{segment.title} {segment.objective}")
        system = (
            "You are a warm, clear real teacher explaining one segment of a lesson. "
            "Use a concrete analogy suited to the learner's level. Be specific and correct. "
            "Also decide whether a visual would help: an equation for math, a diagram for "
            "a process/structure/cycle (physics, biology, ...), code for programming, a "
            "timeline for a historical/chronological sequence, a chart when comparing "
            "quantities or options, or a photo when a real image would genuinely help a "
            "learner picture something concrete (biology, history, geography, real-world "
            "objects/places -- never for pure math/code/abstract-logic segments). Pick at "
            "most one, or none if the explanation doesn't call for one.\n"
            "If you pick 'diagram', the mermaid_code MUST be syntactically valid Mermaid: "
            "start with a diagram type keyword on its own (e.g. 'graph TD'), keep node IDs "
            "short and alphanumeric (A, B, Step1), put any label containing spaces, "
            "punctuation, or parentheses in square brackets with double quotes "
            "(e.g. A[\"Turns on (cooling mode)\"]), and never leave a bracket, paren, or "
            "quote unclosed. When in doubt, prefer a simpler diagram over a complex one. "
            "Node IDs (A, B, Step1) must stay plain alphanumeric regardless of language -- "
            "only the quoted labels and caption follow the language instruction below.\n"
            "If you pick 'photo', set photo_query to a short specific English search "
            "phrase and leave the 'photo' field itself null -- a real photo will be looked "
            "up separately; you cannot know a real image URL."
            + _language_instruction(self.language)
        )
        user = (
            f"Topic: {self.topic}\n"
            f"Learner level: {self.learner_level}\n"
            f"Segment title: {segment.title}\n"
            f"Segment objective: {segment.objective}\n"
            f"{context}\n\n"
            "Produce the explanation for this segment only."
        )

        explanation = structured_call(
            model=config.PLANNING_MODEL,
            system=system,
            user=user,
            schema_model=Explanation,
            tool_name="submit_explanation",
            tool_description="Submit the structured explanation for this segment.",
        )

        if explanation.visual.visual_type == "diagram" and explanation.visual.diagram:
            if not validate_mermaid_syntax(explanation.visual.diagram.mermaid_code):
                # Retry once -- regenerate the whole explanation rather than
                # just the diagram, since there's no separate "fix this
                # snippet" step in the schema and a full retry is simple and
                # already the pattern used elsewhere in this codebase.
                explanation = structured_call(
                    model=config.PLANNING_MODEL,
                    system=system,
                    user=user,
                    schema_model=Explanation,
                    tool_name="submit_explanation",
                    tool_description="Submit the structured explanation for this segment.",
                )
                still_invalid = explanation.visual.visual_type == "diagram" and (
                    not explanation.visual.diagram
                    or not validate_mermaid_syntax(explanation.visual.diagram.mermaid_code)
                )
                if still_invalid:
                    explanation.visual = VisualSpec(visual_type="none")

        if explanation.visual.visual_type == "photo":
            # The LLM only ever supplies a search phrase (see the system prompt
            # above) -- resolve it against the real Pexels API here. If no key
            # is configured or nothing relevant comes back, fall back to no
            # visual entirely rather than showing a broken/empty photo card.
            resolved = None
            if explanation.visual.photo_query:
                resolved = search_pexels_photo(explanation.visual.photo_query)
            explanation.visual.photo = resolved
            if resolved is None:
                explanation.visual = VisualSpec(visual_type="none")

        return explanation

    def make_question(self, segment: LessonSegmentPlan, explanation: Explanation) -> QuizItem:
        """Question step: one comprehension-check item with misconception-labeled distractors."""
        system = (
            "You are writing one comprehension-check question for the segment just taught. "
            "Prefer multiple choice with 3-4 options, exactly one correct. Every wrong option "
            "must correspond to a specific, plausible, named misconception a real learner would "
            "have -- not a random distractor."
            + _language_instruction(self.language)
        )
        user = (
            f"Segment title: {segment.title}\n"
            f"Segment objective: {segment.objective}\n"
            f"Explanation given to the learner:\n{explanation.explanation}\n\n"
            "Produce the quiz item."
        )
        return structured_call(
            model=config.PLANNING_MODEL,
            system=system,
            user=user,
            schema_model=QuizItem,
            tool_name="submit_quiz_item",
            tool_description="Submit the structured quiz item.",
        )

    def evaluate(self, quiz: QuizItem, learner_answer: str) -> EvaluationResult:
        """Evaluate step: grade the answer and, if wrong, name the specific misconception."""
        system = (
            "You are grading a learner's answer to a comprehension-check question. "
            "If the answer is wrong, identify the SPECIFIC misconception it reflects "
            "(reuse one of the question's known misconception labels if it matches, "
            "otherwise name a new specific one) -- never just say 'incorrect'. Also write "
            "a short, warm, personalized reaction_text using the learner's name (vary the "
            "phrasing each time -- don't reuse the same line across calls), and set "
            "reaction_gesture to match."
            + _language_instruction(self.language)
        )
        options_desc = "\n".join(
            f"- {o.text} (correct={o.is_correct}"
            + (f", misconception={o.misconception_label}" if o.misconception_label else "")
            + ")"
            for o in quiz.options
        )
        name_line = (
            f"Learner's name: {self.learner_display_name}\n"
            if self.learner_display_name
            else "Learner's name: (not given -- use a warm generic line, no placeholder name)\n"
        )
        user = (
            f"{name_line}"
            f"Question: {quiz.question}\n"
            f"Options:\n{options_desc or '(short answer question)'}\n"
            f"Reference correct answer: {quiz.correct_answer or '(see correct option above)'}\n"
            f"Learner's answer: {learner_answer}\n\n"
            "Grade this answer."
        )
        return structured_call(
            model=config.FAST_MODEL,
            system=system,
            user=user,
            schema_model=EvaluationResult,
            tool_name="submit_evaluation",
            tool_description="Submit the structured grading result.",
        )

    def adapt(
        self, segment: LessonSegmentPlan, explanation: Explanation, evaluation: EvaluationResult
    ) -> Adaptation:
        """Adapt step: re-teach the segment with a different analogy targeting the misconception."""
        system = (
            "You are re-teaching a concept to a learner who just revealed a specific "
            "misconception. Do NOT repeat the same analogy as before. Use a genuinely "
            "different angle that directly confronts and corrects that misconception."
            + _language_instruction(self.language)
        )
        user = (
            f"Segment title: {segment.title}\n"
            f"Original analogy used: {explanation.analogy_used}\n"
            f"Original explanation: {explanation.explanation}\n"
            f"Learner's misconception: {evaluation.misconception_label} -- "
            f"{evaluation.misconception_explanation}\n\n"
            "Produce a re-teach explanation with a new analogy."
        )
        return structured_call(
            model=config.PLANNING_MODEL,
            system=system,
            user=user,
            schema_model=Adaptation,
            tool_name="submit_adaptation",
            tool_description="Submit the structured re-teach adaptation.",
        )

    def record(self, segment_record: SegmentRecord) -> None:
        self.history.append(segment_record)
