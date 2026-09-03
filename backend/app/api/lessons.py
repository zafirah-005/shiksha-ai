import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.store import LESSONS, LessonState, PendingRecord
from app.avatar.avatar_client import get_avatar_asset
from app.core.state_machine import LessonSession, SegmentRecord
from app.profile import store as profile_store
from app.teaching.report import generate_report
from app.voice.tts import synthesize_speech

router = APIRouter(prefix="/lessons")


class CreateLessonRequest(BaseModel):
    topic: str
    learner_id: str
    level: str = "beginner"
    doc_path: Optional[str] = None
    language: str = "en"
    # Accepted for the landing page's time selector; not yet threaded into
    # planning -- same "captured but not deeply wired" status as language,
    # matching Phase 2's brief ("we'll wire it properly in Phase 3").
    time_minutes: Optional[int] = None


class EvaluateRequest(BaseModel):
    answer: str


def _get_state(lesson_id: str) -> LessonState:
    state = LESSONS.get(lesson_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return state


def _current_segment(state: LessonState):
    return state.session.plan.segments[state.segment_index]


def _speech_payload(text: str, language: str) -> dict:
    filename = synthesize_speech(text, language=language)
    avatar = get_avatar_asset(filename)
    return {"audio_url": f"/media/audio/{filename}", "avatar": avatar}


def _sanitize_quiz(quiz) -> dict:
    """Strip is_correct / misconception_label from options before sending to
    the client -- those are grading-only fields, never shown before an answer."""
    return {
        "segment_id": quiz.segment_id,
        "question_type": quiz.question_type,
        "question": quiz.question,
        "options": [{"text": o.text} for o in quiz.options],
    }


@router.post("")
def create_lesson(req: CreateLessonRequest):
    profile_store.get_or_create_learner(req.learner_id)
    history_summary = profile_store.summarize_history_for_prompt(req.learner_id)

    session = LessonSession(
        topic=req.topic,
        learner_level=req.level,
        doc_path=req.doc_path,
        learner_history_summary=history_summary,
        language=req.language,
        # req.learner_id is the raw display name the landing page collected
        # (e.g. "Priya"), not yet normalized to a slug -- exactly what the
        # Evaluate step needs for a personalized reaction.
        learner_display_name=req.learner_id,
    )
    session.understand()
    plan = session.make_plan()

    lesson_id = uuid.uuid4().hex
    LESSONS[lesson_id] = LessonState(session=session, learner_id=req.learner_id, language=req.language)

    return {
        "lesson_id": lesson_id,
        "plan": plan.model_dump(),
        "current_segment": plan.segments[0].model_dump(),
    }


@router.get("/{lesson_id}")
def get_lesson(lesson_id: str):
    state = _get_state(lesson_id)
    plan = state.session.plan
    done = state.segment_index >= len(plan.segments)
    return {
        "plan": plan.model_dump(),
        "segment_index": state.segment_index,
        "current_segment": None if done else _current_segment(state).model_dump(),
        "done": done,
    }


@router.post("/{lesson_id}/explain")
def explain_segment(lesson_id: str):
    state = _get_state(lesson_id)
    segment = _current_segment(state)

    explanation = state.session.explain(segment)
    state.explanation = explanation
    state.quiz = None
    state.evaluation = None
    state.pending = PendingRecord()

    return {
        **explanation.model_dump(),
        **_speech_payload(explanation.explanation, state.language),
    }


@router.post("/{lesson_id}/question")
def question_for_segment(lesson_id: str):
    state = _get_state(lesson_id)
    if state.explanation is None:
        raise HTTPException(status_code=400, detail="Call /explain before /question")

    segment = _current_segment(state)
    quiz = state.session.make_question(segment, state.explanation)
    state.quiz = quiz

    return _sanitize_quiz(quiz)


@router.post("/{lesson_id}/evaluate")
def evaluate_answer(lesson_id: str, req: EvaluateRequest):
    state = _get_state(lesson_id)
    if state.quiz is None:
        raise HTTPException(status_code=400, detail="Call /question before /evaluate")

    evaluation = state.session.evaluate(state.quiz, req.answer)
    state.evaluation = evaluation

    if state.pending.awaiting_retry:
        state.pending.retry_answer = req.answer
        state.pending.final_correct = evaluation.correct
    else:
        state.pending.first_answer = req.answer
        state.pending.first_correct = evaluation.correct
        state.pending.misconception_label = evaluation.misconception_label
        state.pending.final_correct = evaluation.correct
        if not evaluation.correct:
            state.pending.awaiting_retry = True

    return evaluation.model_dump()


@router.post("/{lesson_id}/adapt")
def adapt_segment(lesson_id: str):
    state = _get_state(lesson_id)
    if state.explanation is None or state.evaluation is None:
        raise HTTPException(status_code=400, detail="Call /explain and /evaluate before /adapt")
    if state.evaluation.correct:
        raise HTTPException(status_code=400, detail="No misconception to adapt for -- answer was correct")

    segment = _current_segment(state)
    adaptation = state.session.adapt(segment, state.explanation, state.evaluation)

    return {
        **adaptation.model_dump(),
        **_speech_payload(adaptation.reteach_explanation, state.language),
    }


@router.post("/{lesson_id}/continue")
def continue_lesson(lesson_id: str):
    state = _get_state(lesson_id)
    segment = _current_segment(state)
    pending = state.pending

    record = SegmentRecord(
        segment_id=segment.id,
        title=segment.title,
        question=state.quiz.question if state.quiz else "",
        first_answer=pending.first_answer or "",
        first_correct=bool(pending.first_correct),
        misconception_label=pending.misconception_label,
        retried=pending.awaiting_retry,
        retry_answer=pending.retry_answer,
        final_correct=pending.final_correct,
    )
    state.session.record(record)

    state.segment_index += 1
    state.explanation = None
    state.quiz = None
    state.evaluation = None
    state.pending = PendingRecord()

    done = state.segment_index >= len(state.session.plan.segments)
    return {
        "done": done,
        "current_segment": None if done else _current_segment(state).model_dump(),
    }


@router.get("/{lesson_id}/report")
def get_report(lesson_id: str):
    state = _get_state(lesson_id)
    report = generate_report(state.session)

    if not state.report_saved:
        profile_store.save_lesson_history(state.learner_id, state.session.topic, report)
        state.report_saved = True

    return {**report.model_dump(), "learner_id": state.learner_id}
