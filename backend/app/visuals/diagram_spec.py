from pydantic import BaseModel, Field


class DiagramSpec(BaseModel):
    mermaid_code: str = Field(
        default="",
        description=(
            "Valid Mermaid diagram syntax (e.g. 'graph TD; A-->B;' for a process/flow, "
            "or a labeled diagram of a structure or cycle). Empty if unused."
        ),
    )
    caption: str = Field(
        default="", description="Short caption explaining what the diagram shows."
    )


_VALID_DIAGRAM_STARTS = (
    "graph",
    "flowchart",
    "sequencediagram",
    "classdiagram",
    "statediagram",
    "erdiagram",
    "journey",
    "gantt",
    "pie",
    "mindmap",
    "timeline",
    "gitgraph",
)


def validate_mermaid_syntax(code: str) -> bool:
    """Heuristic Mermaid syntax sanity check.

    This is NOT a full grammar parser -- Mermaid's real grammar lives in a JS
    package with no Python equivalent, and shelling out to Node on every
    /explain call wasn't worth the latency/fragility for a hackathon build.
    Instead this catches the failure modes the LLM actually produces in
    practice (missing diagram-type header, unbalanced brackets/quotes, empty
    output). The frontend's try/catch around mermaid.render() is the real
    safety net; this is just a cheap first filter to avoid sending obviously
    broken syntax in the first place.
    """
    if not code or not code.strip():
        return False

    stripped = code.strip()
    first_line = stripped.splitlines()[0].strip().lower()
    if not any(first_line.startswith(start) for start in _VALID_DIAGRAM_STARTS):
        return False

    pairs = {"(": ")", "[": "]", "{": "}"}
    closers = set(pairs.values())
    stack: list[str] = []
    for ch in stripped:
        if ch in pairs:
            stack.append(pairs[ch])
        elif ch in closers:
            if not stack or stack.pop() != ch:
                return False
    if stack:
        return False

    if stripped.count('"') % 2 != 0:
        return False

    return True
