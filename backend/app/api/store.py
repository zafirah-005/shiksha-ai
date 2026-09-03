from dataclasses import dataclass, field
from typing import Optional

from app.core.state_machine import LessonSession
from app.schemas.evaluation import EvaluationResult
from app.schemas.lesson import Explanation
from app.schemas.quiz import QuizItem


@dataclass
class PendingRecord:
    """Accumulates one segment's attempt(s) across the explain/question/evaluate/
    adapt/continue call sequence, mirroring what the Phase 1 CLI tracked inline
    in its loop, so /continue can build the SegmentRecord the state machine expects."""

    first_answer: Optional[str] = None
    first_correct: Optional[bool] = None
    misconception_label: Optional[str] = None
    awaiting_retry: bool = False
    retry_answer: Optional[str] = None
    final_correct: Optional[bool] = None


@dataclass
class LessonState:
    session: LessonSession
    learner_id: str
    language: str = "en"
    segment_index: int = 0
    explanation: Optional[Explanation] = None
    quiz: Optional[QuizItem] = None
    evaluation: Optional[EvaluationResult] = None
    pending: PendingRecord = field(default_factory=PendingRecord)
    # Guards against saving duplicate history rows if /report is fetched more
    # than once (e.g. the report page re-fetching on a refresh).
    report_saved: bool = False


# In-memory store: fine for a single-process hackathon demo. Phase 3's learner
# profile work will decide whether this needs to move to persistent storage.
LESSONS: dict[str, LessonState] = {}
