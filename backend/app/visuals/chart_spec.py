from pydantic import BaseModel, Field


class ChartDataPoint(BaseModel):
    label: str = Field(description="Category/option label, e.g. 'Mercury' or 'Option A'.")
    value: float = Field(description="Numeric value for this category.")


class ChartSpec(BaseModel):
    data: list[ChartDataPoint] = Field(
        default_factory=list,
        description="3-6 data points comparing quantities or options. Empty if unused.",
    )
    x_label: str = Field(default="", description="Label for the category axis.")
    y_label: str = Field(default="", description="Label for the value axis (what's being measured).")
    caption: str = Field(default="", description="Short caption explaining what's being compared.")
