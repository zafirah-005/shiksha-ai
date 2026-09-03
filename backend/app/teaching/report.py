from app.core import config
from app.core.llm import structured_call
from app.core.state_machine import LessonSession
from app.schemas.report import FinalReport


def generate_report(session: LessonSession) -> FinalReport:
    """Final report step: aggregate the session history into a score + strong/weak areas."""
    total = len(session.history)
    correct_first_try = sum(1 for r in session.history if r.first_correct)

    lines = []
    for r in session.history:
        if r.first_correct:
            status = "correct on first try"
        elif r.retried and r.final_correct:
            status = f"wrong first ({r.misconception_label}), then correct after re-teach"
        else:
            status = f"wrong first ({r.misconception_label}), still incorrect after re-teach"
        lines.append(f"- {r.title}: {status}")
    history_desc = "\n".join(lines) if lines else "(no segments completed)"

    system = (
        "You are a teacher writing a short, encouraging but honest final report for a "
        "learner based on their session performance. Also include 2-4 further-reading "
        "links genuinely relevant to the topic -- strongly prefer real Wikipedia articles "
        "or other well-known stable sources you're confident actually exist; never invent "
        "a plausible-looking URL."
    )
    user = (
        f"Topic: {session.topic}\n"
        f"Learner level: {session.learner_level}\n"
        f"Segments attempted: {total}, correct on first try: {correct_first_try}\n"
        f"Per-segment results:\n{history_desc}\n\n"
        "Produce the final report."
    )
    return structured_call(
        model=config.PLANNING_MODEL,
        system=system,
        user=user,
        schema_model=FinalReport,
        tool_name="submit_final_report",
        tool_description="Submit the structured final report.",
    )
