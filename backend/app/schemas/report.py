from pydantic import BaseModel, Field


class FurtherReadingLink(BaseModel):
    title: str = Field(description="Short, descriptive title for this resource.")
    url: str = Field(
        description=(
            "A real, working URL. Strongly prefer Wikipedia "
            "(https://en.wikipedia.org/wiki/Article_Title) or other well-known stable "
            "domains (official/educational sites) you are confident actually exist. Never "
            "invent a plausible-looking URL you are not sure is real."
        )
    )
    source_name: str = Field(description="The source/publisher name, e.g. 'Wikipedia', 'Khan Academy'.")


class FinalReport(BaseModel):
    overall_score_percent: int
    strong_areas: list[str]
    weak_areas: list[str]
    misconceptions_found: list[str]
    recommended_next_topics: list[str]
    summary: str
    further_reading: list[FurtherReadingLink] = Field(
        default_factory=list,
        description="2-4 real, relevant further-reading links related to the lesson topic.",
    )
