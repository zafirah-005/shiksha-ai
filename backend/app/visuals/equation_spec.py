from pydantic import BaseModel, Field


class EquationSpec(BaseModel):
    latex: str = Field(
        default="",
        description="LaTeX for the key equation, without $ or $$ delimiters. Empty if unused.",
    )
    caption: str = Field(
        default="", description="Short caption explaining what the equation represents."
    )
