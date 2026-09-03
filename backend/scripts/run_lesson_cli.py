import sys
from pathlib import Path

# Allow running this script directly (`python scripts/run_lesson_cli.py`) from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# LLM output often contains Unicode punctuation (em dashes, smart quotes, non-
# breaking hyphens) that Windows' default console codepage (cp1252) can't
# encode, crashing print() mid-lesson. Force UTF-8 on stdout/stderr.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from app.core.state_machine import LessonSession, SegmentRecord  # noqa: E402
from app.teaching.report import generate_report  # noqa: E402


def divider() -> None:
    print("\n" + "=" * 60 + "\n")


def main() -> None:
    print("AI Teacher -- Phase 1 CLI (text-only)")
    divider()

    raw_value = input("Enter a topic to learn, OR a path to a PDF/DOCX/PPTX file: ").strip()

    doc_path = None
    topic = raw_value
    candidate = Path(raw_value)
    if candidate.exists() and candidate.is_file():
        doc_path = str(candidate)
        topic = input(
            "What topic/focus should the lesson cover from this document? "
        ).strip() or candidate.stem

    level = input("Your level (beginner/intermediate/advanced) [beginner]: ").strip().lower()
    if level not in ("beginner", "intermediate", "advanced"):
        level = "beginner"

    session = LessonSession(topic=topic, learner_level=level, doc_path=doc_path)

    print("\nUnderstanding input...")
    session.understand()
    if doc_path:
        print(f"Indexed document. Grounded retrieval: {session.is_grounded}")

    print("Planning lesson...")
    plan = session.make_plan()
    divider()
    print(f"LESSON PLAN: {plan.topic} ({plan.learner_level}, grounded={plan.grounded_in_document})")
    for seg in plan.segments:
        print(f"  {seg.order}. {seg.title} -- {seg.objective}")
    divider()

    for seg in sorted(plan.segments, key=lambda s: s.order):
        print(f"--- Segment {seg.order}: {seg.title} ---\n")
        explanation = session.explain(seg)
        print(explanation.explanation)
        print("\nKey points:")
        for kp in explanation.key_points:
            print(f"  - {kp}")

        quiz = session.make_question(seg, explanation)
        print(f"\nQuestion: {quiz.question}")
        if quiz.question_type == "mcq":
            for i, opt in enumerate(quiz.options, 1):
                print(f"  {i}. {opt.text}")

        first_answer = input("\nYour answer: ").strip()
        evaluation = session.evaluate(quiz, first_answer)

        record = SegmentRecord(
            segment_id=seg.id,
            title=seg.title,
            question=quiz.question,
            first_answer=first_answer,
            first_correct=evaluation.correct,
        )

        if evaluation.correct:
            print(f"\nCorrect! {evaluation.feedback}")
            record.final_correct = True
        else:
            print(f"\nNot quite. {evaluation.feedback}")
            print(f"Misconception detected: {evaluation.misconception_label}")
            print(f"  -> {evaluation.misconception_explanation}")
            record.misconception_label = evaluation.misconception_label

            adaptation = session.adapt(seg, explanation, evaluation)
            print(f"\nLet's try a different way ({adaptation.targeted_misconception}):\n")
            print(adaptation.reteach_explanation)

            retry_answer = input("\nTry the question again -- your answer: ").strip()
            retry_eval = session.evaluate(quiz, retry_answer)
            record.retried = True
            record.retry_answer = retry_answer
            record.final_correct = retry_eval.correct
            if retry_eval.correct:
                print(f"\nCorrect this time! {retry_eval.feedback}")
            else:
                print(f"\nStill not quite -- moving on. {retry_eval.feedback}")

        session.record(record)
        divider()

    print("Generating final report...\n")
    report = generate_report(session)
    print(f"FINAL REPORT -- {session.topic}")
    print(f"Score: {report.overall_score_percent}%")

    print("\nStrong areas:")
    for a in report.strong_areas:
        print(f"  + {a}")

    print("\nWeak areas:")
    for a in report.weak_areas:
        print(f"  - {a}")

    print("\nMisconceptions found:")
    for m in report.misconceptions_found:
        print(f"  * {m}")

    print("\nRecommended next topics:")
    for t in report.recommended_next_topics:
        print(f"  -> {t}")

    print(f"\nSummary: {report.summary}")


if __name__ == "__main__":
    main()
