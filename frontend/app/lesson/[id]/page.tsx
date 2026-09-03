"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AvatarPlayer, { TeacherCharacter } from "@/components/AvatarPlayer";
import VisualStage from "@/components/VisualStage";
import QuizPanel from "@/components/QuizPanel";
import {
  adaptSegment,
  continueLesson,
  evaluateAnswer,
  explainSegment,
  getLesson,
  questionForSegment,
  type Adaptation,
  type EvaluationResult,
  type Explanation,
  type LessonPlan,
  type LessonSegment,
  type QuizItem,
} from "@/lib/api";

type Phase =
  | "loading"
  | "explaining"
  | "quiz"
  | "evaluated"
  | "adapting"
  | "retry_quiz"
  | "retry_evaluated"
  | "advancing"
  | "error";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [segment, setSegment] = useState<LessonSegment | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);

  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [adaptation, setAdaptation] = useState<Adaptation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExplain = useCallback(async () => {
    setPhase("loading");
    try {
      const exp = await explainSegment(lessonId);
      setExplanation(exp);
      setQuiz(null);
      setEvaluation(null);
      setAdaptation(null);
      setPhase("explaining");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load explanation.");
      setPhase("error");
    }
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getLesson(lessonId);
        if (cancelled) return;
        setPlan(data.plan);
        setSegment(data.current_segment);
        setSegmentIndex(data.segment_index);
        if (!data.current_segment) {
          router.push(`/report/${lessonId}`);
          return;
        }
        await runExplain();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load lesson.");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function handleShowQuiz() {
    setPhase("loading");
    try {
      const q = await questionForSegment(lessonId);
      setQuiz(q);
      setPhase("quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load question.");
      setPhase("error");
    }
  }

  async function handleSubmitAnswer(answer: string) {
    const wasRetry = phase === "retry_quiz";
    setPhase("loading");
    try {
      const result = await evaluateAnswer(lessonId, answer);
      setEvaluation(result);
      setPhase(wasRetry ? "retry_evaluated" : "evaluated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grade answer.");
      setPhase("error");
    }
  }

  async function handleAdapt() {
    setPhase("loading");
    try {
      const a = await adaptSegment(lessonId);
      setAdaptation(a);
      setPhase("adapting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load re-teach.");
      setPhase("error");
    }
  }

  async function handleContinue() {
    setPhase("advancing");
    try {
      const result = await continueLesson(lessonId);
      if (result.done || !result.current_segment) {
        router.push(`/report/${lessonId}`);
        return;
      }
      setSegment(result.current_segment);
      setSegmentIndex((i) => i + 1);
      await runExplain();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance lesson.");
      setPhase("error");
    }
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-clay-pink-dark">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {plan && segment && (
          <div className="glass-card mb-7 rounded-clay-lg p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-clay-lavender-dark">
              {plan.topic} &middot; segment {segmentIndex + 1} of {plan.segments.length}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-clay-ink">{segment.title}</h1>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-clay-lavender-dark to-clay-blue-dark transition-all duration-500"
                style={{
                  width: `${((segmentIndex + 1) / plan.segments.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {phase === "loading" && <p className="text-clay-ink-soft">Loading...</p>}
        {phase === "advancing" && (
          <p className="text-clay-ink-soft">Moving to the next segment...</p>
        )}

        {phase === "explaining" && explanation && (
          <div className="space-y-6">
            <AvatarPlayer
              audioUrl={explanation.audio_url}
              avatar={explanation.avatar}
              caption={explanation.explanation}
              onEnded={() => {}}
            />
            <VisualStage visual={explanation.visual} />
            <div className="glass-card rounded-clay p-5">
              <p className="text-sm font-semibold text-clay-ink">Key points</p>
              <ul className="mt-2 list-inside list-disc text-sm text-clay-ink-soft">
                {explanation.key_points.map((kp, i) => (
                  <li key={i}>{kp}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleShowQuiz}
              className="hover-lift shadow-clay-sm rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
            >
              I&apos;m ready -- quiz me
            </button>
          </div>
        )}

        {phase === "quiz" && quiz && <QuizPanel quiz={quiz} onSubmit={handleSubmitAnswer} />}
        {phase === "retry_quiz" && quiz && <QuizPanel quiz={quiz} onSubmit={handleSubmitAnswer} />}

        {phase === "evaluated" && evaluation && (
          <FeedbackCard evaluation={evaluation}>
            {evaluation.correct ? (
              <button
                onClick={handleContinue}
                className="hover-lift shadow-clay-sm rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleAdapt}
                className="hover-lift shadow-clay-sm rounded-full bg-gradient-to-b from-clay-pink to-clay-pink-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
              >
                Show me a different way
              </button>
            )}
          </FeedbackCard>
        )}

        {phase === "adapting" && adaptation && (
          <div className="space-y-6">
            <AvatarPlayer
              audioUrl={adaptation.audio_url}
              avatar={adaptation.avatar}
              caption={adaptation.reteach_explanation}
              onEnded={() => {}}
            />
            <button
              onClick={() => setPhase("retry_quiz")}
              className="hover-lift shadow-clay-sm rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
            >
              Try the question again
            </button>
          </div>
        )}

        {phase === "retry_evaluated" && evaluation && (
          <FeedbackCard evaluation={evaluation}>
            <button
              onClick={handleContinue}
              className="hover-lift shadow-clay-sm rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
            >
              Continue
            </button>
          </FeedbackCard>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({
  evaluation,
  children,
}: {
  evaluation: EvaluationResult;
  children: React.ReactNode;
}) {
  // The reaction (avatar gesture + personalized line) plays as a short beat
  // before the rest of the feedback (misconception detail + action button)
  // reveals -- not instead of it. Correct answers get a shorter beat since
  // there's nothing further to digest before continuing.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const delay = evaluation.correct ? 700 : 1600;
    const timeout = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(timeout);
  }, [evaluation]);

  const toneClass = evaluation.correct ? "glass-mint" : "glass-pink";

  return (
    <div className={`glass-card ${toneClass} rounded-clay-lg p-6`}>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <TeacherCharacter
            playing={false}
            gesture={evaluation.reaction_gesture === "neutral" ? null : evaluation.reaction_gesture}
            size={84}
          />
        </div>
        <p className="text-lg font-semibold text-clay-ink">{evaluation.reaction_text}</p>
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ${
          revealed ? "mt-4 max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-sm text-clay-ink-soft">{evaluation.feedback}</p>
        {!evaluation.correct && evaluation.misconception_label && (
          <div className="shadow-clay-sm mt-3 rounded-clay bg-white/60 p-4 text-sm">
            <p className="font-semibold text-clay-pink-dark">
              Misconception detected: {evaluation.misconception_label}
            </p>
            <p className="mt-1 text-clay-ink-soft">{evaluation.misconception_explanation}</p>
          </div>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
