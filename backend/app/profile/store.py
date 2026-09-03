from __future__ import annotations

from collections import Counter

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core import config
from app.profile.models import Base, Learner, LessonHistory
from app.schemas.report import FinalReport

_engine = create_engine(f"sqlite:///{config.LEARNER_DB_PATH}")
Base.metadata.create_all(_engine)


def _normalize_id(identifier: str) -> str:
    return identifier.strip().lower().replace(" ", "-")


def _learner_to_dict(learner: Learner) -> dict:
    return {
        "id": learner.id,
        "display_name": learner.display_name,
        "created_at": learner.created_at.isoformat(),
    }


def _history_to_dict(entry: LessonHistory) -> dict:
    return {
        "id": entry.id,
        "topic": entry.topic,
        "created_at": entry.created_at.isoformat(),
        "overall_score_percent": entry.overall_score_percent,
        "strong_areas": entry.strong_areas,
        "weak_areas": entry.weak_areas,
        "misconceptions_found": entry.misconceptions_found,
        "recommended_next_topics": entry.recommended_next_topics,
        "summary": entry.summary,
    }


def get_or_create_learner(identifier: str) -> dict:
    learner_id = _normalize_id(identifier)
    with Session(_engine) as session:
        learner = session.get(Learner, learner_id)
        if learner is None:
            learner = Learner(id=learner_id, display_name=identifier.strip())
            session.add(learner)
            session.commit()
        return _learner_to_dict(learner)


def get_learner(identifier: str) -> dict | None:
    learner_id = _normalize_id(identifier)
    with Session(_engine) as session:
        learner = session.get(Learner, learner_id)
        return _learner_to_dict(learner) if learner else None


def get_learner_history(identifier: str) -> list[dict]:
    """Chronological (oldest first) history for one learner."""
    learner_id = _normalize_id(identifier)
    with Session(_engine) as session:
        rows = session.scalars(
            select(LessonHistory)
            .where(LessonHistory.learner_id == learner_id)
            .order_by(LessonHistory.created_at)
        ).all()
        return [_history_to_dict(r) for r in rows]


def save_lesson_history(identifier: str, topic: str, report: FinalReport) -> None:
    learner_id = _normalize_id(identifier)
    with Session(_engine) as session:
        if session.get(Learner, learner_id) is None:
            session.add(Learner(id=learner_id, display_name=identifier.strip()))
            session.flush()
        session.add(
            LessonHistory(
                learner_id=learner_id,
                topic=topic,
                overall_score_percent=report.overall_score_percent,
                strong_areas=report.strong_areas,
                weak_areas=report.weak_areas,
                misconceptions_found=report.misconceptions_found,
                recommended_next_topics=report.recommended_next_topics,
                summary=report.summary,
            )
        )
        session.commit()


def summarize_history_for_prompt(identifier: str) -> str:
    """Compact text block injected into the Plan step's prompt so past
    weak areas/misconceptions actually shape the new lesson, not just sit
    in a database no one reads."""
    history = get_learner_history(identifier)
    if not history:
        return ""

    lines = []
    for h in history[-5:]:
        weak = ", ".join(h["weak_areas"]) or "none noted"
        misconceptions = ", ".join(h["misconceptions_found"]) or "none noted"
        lines.append(
            f"- {h['topic']} (score {h['overall_score_percent']}%): "
            f"weak areas -- {weak}; misconceptions -- {misconceptions}"
        )

    return (
        "This learner has studied with us before. Past session history "
        "(oldest to most recent):\n"
        + "\n".join(lines)
        + "\n\nIf any past weak area or misconception is relevant to the current topic, "
        "explicitly and directly address it by name in the plan and explanations, and "
        "make sure this lesson closes that specific gap -- don't assume it's already resolved."
    )


def recurring_items(history: list[dict], field: str) -> list[dict]:
    """Frequency-ranked items (weak areas or misconceptions) across a
    learner's whole history, most recurring first."""
    counter: Counter[str] = Counter()
    for h in history:
        for item in h[field]:
            counter[item] += 1
    return [
        {"item": item, "count": count}
        for item, count in sorted(counter.items(), key=lambda pair: (-pair[1], pair[0]))
    ]
