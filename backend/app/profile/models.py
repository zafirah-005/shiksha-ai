from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Learner(Base):
    __tablename__ = "learners"

    # No real auth for a hackathon demo -- id is a normalized slug of the
    # name/identifier the learner types on the landing page, so re-entering
    # the same name resumes the same profile.
    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    history: Mapped[list["LessonHistory"]] = relationship(
        back_populates="learner",
        order_by="LessonHistory.created_at",
        cascade="all, delete-orphan",
    )


class LessonHistory(Base):
    __tablename__ = "lesson_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id"))
    topic: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    overall_score_percent: Mapped[int] = mapped_column(Integer)
    strong_areas: Mapped[list[str]] = mapped_column(JSON, default=list)
    weak_areas: Mapped[list[str]] = mapped_column(JSON, default=list)
    misconceptions_found: Mapped[list[str]] = mapped_column(JSON, default=list)
    recommended_next_topics: Mapped[list[str]] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text)

    learner: Mapped["Learner"] = relationship(back_populates="history")
