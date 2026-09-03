"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLearnerProfile, type LearnerHistoryEntry, type LearnerProfile } from "@/lib/api";

const CHART_HEIGHT = 140;

// Score is a magnitude with a meaningful threshold, not an arbitrary
// category, so color reinforces the already-encoded bar height rather than
// being the only signal (bars are also directly labeled with the % value).
function scoreBandClasses(score: number): string {
  if (score >= 70) return "from-clay-mint to-clay-mint-dark";
  if (score >= 40) return "from-clay-lavender to-clay-lavender-dark";
  return "from-clay-pink to-clay-pink-dark";
}

function ScoreTrendChart({ history }: { history: LearnerHistoryEntry[] }) {
  return (
    <div className="glass-card rounded-clay p-6">
      <p className="text-sm font-semibold text-clay-ink">Score trend</p>
      <div className="relative mt-8" style={{ height: CHART_HEIGHT }}>
        {/* Recessive reference lines at 50% and 100%, not the data itself */}
        <div className="absolute left-0 right-0 top-0 h-px bg-clay-ink-faint/25" />
        <div
          className="absolute left-0 right-0 h-px bg-clay-ink-faint/25"
          style={{ top: CHART_HEIGHT * 0.5 }}
        />
        <div className="absolute inset-0 flex items-end gap-3">
          {history.map((h) => {
            const barHeight = Math.max(6, (h.overall_score_percent / 100) * CHART_HEIGHT);
            return (
              <div key={h.id} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="mb-1 text-center text-xs font-medium text-clay-ink">
                  {h.overall_score_percent}%
                </span>
                <div
                  className={`mx-auto w-full max-w-10 rounded-t-2xl bg-gradient-to-b transition-all ${scoreBandClasses(
                    h.overall_score_percent
                  )}`}
                  style={{ height: barHeight }}
                />
                {/* Hover tooltip -- pure CSS, no JS needed */}
                <div className="shadow-clay-sm pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[180px] -translate-x-1/2 rounded-clay-sm bg-clay-ink px-3 py-1.5 text-xs text-white group-hover:block">
                  <p className="font-medium">{h.topic}</p>
                  <p className="text-clay-ink-faint">
                    {new Date(h.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        {history.map((h) => (
          <div
            key={h.id}
            className="flex-1 truncate text-center text-[11px] text-clay-ink-soft"
            title={h.topic}
          >
            {h.topic}
          </div>
        ))}
      </div>
    </div>
  );
}

// Accessible non-chart fallback showing the same data as a table, and
// doubles as the "past topics studied" list the dashboard needs.
function HistoryTable({ history }: { history: LearnerHistoryEntry[] }) {
  return (
    <div className="glass-card overflow-x-auto rounded-clay p-6">
      <p className="text-sm font-semibold text-clay-ink">Past topics studied</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-clay-ink-faint">
            <th className="pb-2 pr-4 font-medium">Topic</th>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((h) => (
            <tr key={h.id} className="border-t border-white/40">
              <td className="py-2 pr-4 text-clay-ink">{h.topic}</td>
              <td className="py-2 pr-4 text-clay-ink-soft">
                {new Date(h.created_at).toLocaleDateString()}
              </td>
              <td className="py-2 text-clay-ink-soft">{h.overall_score_percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecurringList({
  title,
  items,
  tone,
}: {
  title: string;
  items: { item: string; count: number }[];
  tone: "pink" | "lavender";
}) {
  const toneClasses = tone === "pink" ? "glass-pink" : "glass-lavender";
  const badgeClasses =
    tone === "pink" ? "bg-clay-pink-dark text-white" : "bg-clay-lavender-dark text-white";

  return (
    <div className={`glass-card rounded-clay p-5 ${toneClasses}`}>
      <p className="text-sm font-semibold text-clay-ink">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((entry) => (
            <li key={entry.item} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-clay-ink-soft">{entry.item}</span>
              {entry.count > 1 && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClasses}`}
                >
                  &times;{entry.count}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-clay-ink-faint">None recorded yet.</p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams<{ learnerId: string }>();
  const learnerId = params.learnerId;

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLearnerProfile(learnerId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message.includes("404")
              ? "No profile yet -- complete a lesson first and it'll show up here."
              : err instanceof Error
                ? err.message
                : "Failed to load profile."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-clay-ink-soft">{error}</p>
        <Link
          href="/"
          className="hover-lift shadow-clay-sm mt-6 inline-block rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
        >
          Start a lesson
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-clay-ink-soft">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="shadow-clay-sm flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-clay-lavender to-clay-lavender-dark text-xl text-white">
            {profile.display_name.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-clay-ink">{profile.display_name}</h1>
            <p className="text-sm text-clay-ink-soft">
              {profile.history.length} lesson{profile.history.length === 1 ? "" : "s"} completed
            </p>
          </div>
        </div>

        {profile.history.length === 0 ? (
          <p className="mt-8 text-sm text-clay-ink-soft">
            No lessons completed yet -- once you finish one, it&apos;ll show up here.
          </p>
        ) : (
          <div className="mt-7 space-y-4">
            <ScoreTrendChart history={profile.history} />

            <div className="grid gap-4 sm:grid-cols-2">
              <RecurringList
                title="Recurring weak areas"
                items={profile.recurring_weak_areas}
                tone="pink"
              />
              <RecurringList
                title="Recurring misconceptions"
                items={profile.recurring_misconceptions}
                tone="lavender"
              />
            </div>

            {profile.latest_recommended_topics.length > 0 && (
              <div className="glass-card glass-blue rounded-clay p-5">
                <p className="text-sm font-semibold text-clay-ink">
                  Current learning path (from your last lesson)
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-clay-ink-soft">
                  {profile.latest_recommended_topics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            <HistoryTable history={profile.history} />
          </div>
        )}

        <Link
          href="/"
          className="hover-lift shadow-clay-sm mt-8 inline-block rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-105"
        >
          Start a new lesson
        </Link>
      </div>
    </div>
  );
}
