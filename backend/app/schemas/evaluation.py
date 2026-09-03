from typing import Literal, Optional

from pydantic import BaseModel, Field


class EvaluationResult(BaseModel):
    correct: bool
    misconception_label: Optional[str] = Field(
        default=None,
        description="Specific named misconception the learner's wrong answer reflects. Null if correct.",
    )
    misconception_explanation: Optional[str] = Field(
        default=None,
        description="One sentence explaining the misconception in plain terms. Null if correct.",
    )
    feedback: str = Field(description="Short direct feedback to show the learner")
    reaction_text: str = Field(
        description=(
            "A short, warm, personalized one-line reaction using the learner's name if one "
            "was given (vary the phrasing each time, don't reuse the same line) -- e.g. "
            "'Nice work, Priya!' if correct, or 'Not quite, Priya -- let's look at this "
            "differently.' if wrong. If no name was given, use a warm generic line instead "
            "of a placeholder name."
        )
    )
    reaction_gesture: Literal["positive", "attentive", "neutral"] = Field(
        description=(
            "Which avatar gesture this reaction should trigger: 'positive' for a correct "
            "answer, 'attentive' for a wrong answer, 'neutral' otherwise."
        )
    )


class Adaptation(BaseModel):
    segment_id: str
    targeted_misconception: str
    new_analogy: str = Field(description="A different analogy/framing than the original explanation")
    reteach_explanation: str = Field(
        description="Full re-teach explanation using the new analogy, directly addressing the misconception"
    )
