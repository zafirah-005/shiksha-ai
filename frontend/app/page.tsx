"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createLesson, normalizeLearnerId, uploadDocument } from "@/lib/api";

const LEARNER_NAME_KEY = "ai-teacher-learner-name";

export default function Home() {
  const router = useRouter();
  const [learnerName, setLearnerName] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState("beginner");
  const [timeMinutes, setTimeMinutes] = useState(15);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LEARNER_NAME_KEY);
    if (saved) setLearnerName(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!learnerName.trim()) {
      setError("Tell us who you are so we can remember your progress.");
      return;
    }
    if (!topic.trim()) {
      setError("Tell the teacher what to cover -- a topic, or the focus of your uploaded file.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      localStorage.setItem(LEARNER_NAME_KEY, learnerName.trim());
      let docPath: string | undefined;
      if (file) {
        const uploaded = await uploadDocument(file);
        docPath = uploaded.doc_path;
      }
      const lesson = await createLesson({
        topic,
        learner_id: learnerName.trim(),
        level,
        doc_path: docPath,
        language,
        time_minutes: timeMinutes,
      });
      router.push(`/lesson/${lesson.lesson_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong starting the lesson.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <main className="glass-card w-full max-w-xl rounded-clay-lg p-9">
        <div className="mb-1 flex items-center gap-2">
          <div className="shadow-clay-sm flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-clay-pink to-clay-pink-dark text-lg">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-clay-ink">AI Teacher</h1>
        </div>
        <p className="mt-2 text-sm text-clay-ink-soft">
          Type a topic or upload material, and get a real lesson: explained, questioned,
          adapted to your answers.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label className="block text-sm font-medium text-clay-ink">Your name</label>
            <input
              type="text"
              value={learnerName}
              onChange={(e) => setLearnerName(e.target.value)}
              placeholder="e.g. Priya"
              className="mt-1.5 w-full rounded-clay-sm border-2 border-transparent bg-white/50 px-4 py-2.5 text-sm text-clay-ink placeholder:text-clay-ink-faint focus:border-clay-lavender-dark focus:outline-none"
            />
            <p className="mt-1 text-xs text-clay-ink-faint">
              We use this to remember your progress across sessions -- no password, just
              re-enter the same name next time.
              {learnerName.trim() && (
                <>
                  {" "}
                  <Link
                    href={`/profile/${normalizeLearnerId(learnerName)}`}
                    className="font-medium text-clay-lavender-dark hover:underline"
                  >
                    View my profile
                  </Link>
                </>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-clay-ink">
              Topic (or what the uploaded file should focus on)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Newton's First Law"
              className="mt-1.5 w-full rounded-clay-sm border-2 border-transparent bg-white/50 px-4 py-2.5 text-sm text-clay-ink placeholder:text-clay-ink-faint focus:border-clay-lavender-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-clay-ink">
              Upload material (optional -- PDF, DOCX, or PPTX)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 w-full text-sm text-clay-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-clay-lavender/40 file:px-4 file:py-2 file:text-sm file:font-medium file:text-clay-ink hover:file:bg-clay-lavender/60"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-clay-ink">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-1.5 w-full rounded-clay-sm border-2 border-transparent bg-white/50 px-2 py-2.5 text-sm text-clay-ink focus:border-clay-lavender-dark focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-clay-ink">Time</label>
              <select
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(Number(e.target.value))}
                className="mt-1.5 w-full rounded-clay-sm border-2 border-transparent bg-white/50 px-2 py-2.5 text-sm text-clay-ink focus:border-clay-lavender-dark focus:outline-none"
              >
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-clay-ink">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1.5 w-full rounded-clay-sm border-2 border-transparent bg-white/50 px-2 py-2.5 text-sm text-clay-ink focus:border-clay-lavender-dark focus:outline-none"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="hinglish">Hinglish</option>
              </select>
              <p className="mt-1 text-xs text-clay-ink-faint">Full support lands in Phase 3.</p>
            </div>
          </div>

          {error && <p className="text-sm text-clay-pink-dark">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="hover-lift shadow-clay-sm w-full rounded-full bg-gradient-to-b from-clay-blue to-clay-blue-dark px-4 py-3 text-sm font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:from-clay-ink-faint disabled:to-clay-ink-faint disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100"
          >
            {loading ? "Starting your lesson..." : "Start lesson"}
          </button>
        </form>
      </main>
    </div>
  );
}
