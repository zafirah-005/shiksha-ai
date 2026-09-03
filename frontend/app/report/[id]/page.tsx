"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getReport, type FinalReport } from "@/lib/api";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;

  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReport(lessonId)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report.");
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-clay-pink-dark">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-clay-ink-soft">Generating your report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-clay-ink">Lesson report</h1>

        <div className="glass-card mt-6 flex flex-col items-center rounded-clay-lg p-8 text-center">
          <div className="shadow-clay-sm flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-b from-clay-lavender to-clay-lavender-dark">
            <p className="text-4xl font-bold text-white">{report.overall_score_percent}%</p>
          </div>
          <p className="mt-3 text-sm text-clay-ink-soft">Score</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Section title="Strong areas" tone="mint" items={report.strong_areas} />
          <Section title="Weak areas" tone="pink" items={report.weak_areas} />
        </div>

        <Section
          title="Misconceptions found"
          tone="cream"
          items={report.misconceptions_found}
          className="mt-4"
        />
        <Section
          title="Recommended next topics"
          tone="lavender"
          items={report.recommended_next_topics}
          className="mt-4"
        />

        <div className="glass-card mt-6 rounded-clay p-6">
          <p className="text-sm font-semibold text-clay-ink">Summary</p>
          <p className="mt-1 text-sm text-clay-ink-soft">{report.summary}</p>
        </div>

        {report.further_reading.length > 0 && (
          <div className="glass-card mt-4 rounded-clay p-6">
            <p className="text-sm font-semibold text-clay-ink">Further reading</p>
            <ul className="mt-3 space-y-2">
              {report.further_reading.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-lift block rounded-clay-sm bg-white/50 p-3 text-sm transition hover:bg-white/70"
                  >
                    <span className="font-medium text-clay-ink">{link.title}</span>
                    <span className="ml-2 text-xs text-clay-ink-faint">{link.source_name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="hover-lift shadow-clay-sm inline-block rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
          >
            Start another lesson
          </Link>
          <Link
            href={`/profile/${report.learner_id}`}
            className="hover-lift glass-card inline-block rounded-full px-6 py-2.5 text-sm font-medium text-clay-ink transition"
          >
            View my profile
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  tone,
  className = "",
}: {
  title: string;
  items: string[];
  tone: "mint" | "pink" | "cream" | "lavender";
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    mint: "glass-mint",
    pink: "glass-pink",
    cream: "glass-cream",
    lavender: "glass-lavender",
  };

  return (
    <div className={`glass-card rounded-clay p-5 ${toneClasses[tone]} ${className}`}>
      <p className="text-sm font-semibold text-clay-ink">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 list-inside list-disc text-sm text-clay-ink-soft">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-clay-ink-faint">None recorded.</p>
      )}
    </div>
  );
}
