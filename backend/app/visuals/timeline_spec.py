from pydantic import BaseModel, Field


class TimelineEventSpec(BaseModel):
    date: str = Field(description="Date or period label, e.g. '1969' or 'Early 1900s'.")
    title: str = Field(description="Short title for this event.")
    description: str = Field(description="One or two sentences describing the event.")


class TimelineSpec(BaseModel):
    events: list[TimelineEventSpec] = Field(
        default_factory=list, description="Ordered chronological events. Empty if unused."
    )
    caption: str = Field(default="", description="Short caption for the timeline.")
