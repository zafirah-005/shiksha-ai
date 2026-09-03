"use client";

import { useState } from "react";
import type { QuizItem } from "@/lib/api";

export default function QuizPanel({
  quiz,
  disabled = false,
  onSubmit,
}: {
  quiz: QuizItem;
  disabled?: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string>("");
  const [freeText, setFreeText] = useState<string>("");

  const answer = quiz.question_type === "mcq" ? selected : freeText;
  const canSubmit = answer.trim().length > 0 && !disabled;

  return (
    <div className="glass-card rounded-clay-lg p-7">
      <p className="text-lg font-semibold text-clay-ink">{quiz.question}</p>

      {quiz.question_type === "mcq" ? (
        <div className="mt-5 space-y-3">
          {quiz.options.map((opt, i) => (
            <label
              key={i}
              className={`hover-lift flex cursor-pointer items-start gap-3 rounded-clay border-2 p-4 text-sm ${
                selected === opt.text
                  ? "border-clay-lavender-dark bg-clay-lavender/30"
                  : "border-transparent bg-white/50 hover:bg-white/70"
              }`}
            >
              <input
                type="radio"
                name="quiz-option"
                className="mt-1 accent-clay-lavender-dark"
                checked={selected === opt.text}
                onChange={() => setSelected(opt.text)}
                disabled={disabled}
              />
              <span className="text-clay-ink">{opt.text}</span>
            </label>
          ))}
        </div>
      ) : (
        <textarea
          className="mt-5 w-full rounded-clay border-2 border-transparent bg-white/50 p-4 text-sm text-clay-ink placeholder:text-clay-ink-faint focus:border-clay-lavender-dark focus:outline-none"
          rows={3}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Type your answer..."
          disabled={disabled}
        />
      )}

      <button
        onClick={() => onSubmit(answer)}
        disabled={!canSubmit}
        className="hover-lift shadow-clay-sm mt-6 rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:from-clay-ink-faint disabled:to-clay-ink-faint disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100"
      >
        Submit answer
      </button>
    </div>
  );
}
