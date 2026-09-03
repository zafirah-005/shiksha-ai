from pydantic import BaseModel, Field


class CodeSpec(BaseModel):
    code: str = Field(default="", description="The code snippet. Empty if unused.")
    language: str = Field(
        default="", description="Language identifier for syntax highlighting, e.g. 'python'."
    )
    caption: str = Field(
        default="", description="Short caption explaining what the code demonstrates."
    )
