from typing import Literal, Optional

from pydantic import BaseModel, Field


class QuizOption(BaseModel):
    text: str
    is_correct: bool
    misconception_label: Optional[str] = Field(
        default=None,
        description=(
            "If this option is wrong, a short specific name for the misconception it "
            "represents (e.g. 'confuses velocity with acceleration'). Null if is_correct is true."
        ),
    )


class QuizItem(BaseModel):
    segment_id: str
    question_type: Literal["mcq", "short_answer"]
    question: str
    options: list[QuizOption] = Field(
        default_factory=list,
        description=(
            "Populated for mcq questions: 3-4 options with exactly one is_correct=true and "
            "specific misconception labels on the wrong ones. Empty for short_answer."
        ),
    )
    correct_answer: Optional[str] = Field(
        default=None,
        description="Reference correct answer text; required for short_answer questions.",
    )
