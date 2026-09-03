from fastapi import APIRouter, HTTPException

from app.profile import store

router = APIRouter(prefix="/learners")


@router.get("/{learner_id}/profile")
def get_profile(learner_id: str):
    learner = store.get_learner(learner_id)
    if learner is None:
        raise HTTPException(status_code=404, detail="Learner not found")

    history = store.get_learner_history(learner_id)
    latest = history[-1] if history else None

    return {
        "learner_id": learner["id"],
        "display_name": learner["display_name"],
        "history": history,
        "recurring_weak_areas": store.recurring_items(history, "weak_areas"),
        "recurring_misconceptions": store.recurring_items(history, "misconceptions_found"),
        "latest_recommended_topics": latest["recommended_next_topics"] if latest else [],
    }
