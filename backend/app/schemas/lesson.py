from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.visuals.chart_spec import ChartSpec
from app.visuals.code_spec import CodeSpec
from app.visuals.diagram_spec import DiagramSpec
from app.visuals.equation_spec import EquationSpec
from app.visuals.image_spec import PhotoSpec
from app.visuals.timeline_spec import TimelineSpec


class VisualSpec(BaseModel):
    visual_type: Literal["equation", "diagram", "code", "timeline", "chart", "photo", "none"] = Field(
        description=(
            "Which single visual best supports this explanation: 'equation' for math, "
            "'diagram' for a process/structure/cycle (physics, biology, ...), 'code' for "
            "programming, 'timeline' for a historical/chronological sequence, 'chart' when "
            "the segment compares quantities or options (e.g. sizes, speeds, percentages "
            "across a few items), 'photo' when a real photo would genuinely help a learner "
            "picture something concrete (biology, history, geography, real-world objects/"
            "places -- never for pure math/code/abstract-logic segments), or 'none' if the "
            "explanation doesn't benefit from a visual. Populate ONLY the matching field "
            "below (or photo_query for 'photo') and leave the others at their empty defaults."
        )
    )
    equation: Optional[EquationSpec] = None
    diagram: Optional[DiagramSpec] = None
    code: Optional[CodeSpec] = None
    timeline: Optional[TimelineSpec] = None
    chart: Optional[ChartSpec] = None
    photo_query: Optional[str] = Field(
        default=None,
        description=(
            "If visual_type is 'photo', a short specific English search phrase for a real "
            "photo (e.g. 'Amazon rainforest canopy', 'DNA double helix model', 'Great Wall "
            "of China'). Null otherwise."
        ),
    )
    photo: Optional[PhotoSpec] = None


class LessonSegmentPlan(BaseModel):
    id: str = Field(description="Short unique id/slug for this segment, e.g. 'seg-1'")
    title: str = Field(description="Short title of this segment")
    objective: str = Field(description="What the learner should understand after this segment")
    order: int = Field(description="1-based order in the lesson")


class LessonPlan(BaseModel):
    topic: str
    learner_level: Literal["beginner", "intermediate", "advanced"]
    grounded_in_document: bool = Field(
        description="True if this plan was built from retrieved document content"
    )
    segments: list[LessonSegmentPlan]


class Explanation(BaseModel):
    segment_id: str
    explanation: str = Field(
        description="The full spoken explanation text for this segment, teacher-style"
    )
    key_points: list[str] = Field(description="2-4 short bullet takeaways")
    analogy_used: str = Field(description="The core analogy or framing used to explain this segment")
    visual: VisualSpec
