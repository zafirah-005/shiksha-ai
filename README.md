# AI Teacher

**Adaptive AI teacher — plans lessons, catches specific misconceptions, re-teaches with new analogies, remembers your progress. Not a chatbot.**

## What this is

AI Teacher is a full-stack tutoring app built for **AI Innovation Hackathon 2026**. Give it a topic or upload a document, and it runs a real teaching loop — not a Q&A chatbot, and not a single generated video — that plans a lesson, explains one segment at a time, asks a comprehension-check question, diagnoses *why* a wrong answer is wrong, and re-teaches that specific gap with a genuinely different explanation before moving on. It remembers you across sessions and brings your past struggles into the next lesson's plan.

## Key features

- **Real teaching loop** — Understand → Plan → Explain → Question → Evaluate → Adapt → Continue, not a single prompt-and-response
- **RAG-grounded lessons** — upload a PDF, DOCX, or PPTX and the lesson plan and explanations are grounded in your material (local embeddings + vector search), or teach from a plain topic with no upload at all
- **Specific misconception detection** — wrong answers are classified into a named misconception ("believes motion requires a continuous force"), never just marked "incorrect"
- **Adaptive re-teaching** — when a misconception is caught, the segment is re-taught with a genuinely different analogy targeting that exact gap
- **Subject-aware visuals** — equations (LaTeX/KaTeX), diagrams (Mermaid), code (syntax highlighting), timelines, comparison charts, and real photos (Pexels) — the model picks the right one per segment, not a fixed template
- **Multilingual** — full lessons (explanations, questions, feedback) in English, Hindi, or Hinglish, with matching TTS voice
- **Illustrated avatar** — an animated SVG teacher character with blinking, eyebrow movement, a multi-frame talking mouth, and arm/hand teaching gestures, synced to lesson audio and quiz reactions
- **Personalized feedback** — per-answer reactions use the learner's name and vary in phrasing, with a distinct avatar gesture for correct vs. incorrect
- **Learner profile that persists** — score trends, recurring weak areas, and recurring misconceptions tracked across sessions
- **Final report** — score, strong/weak areas, misconceptions found, recommended next topics, and further-reading links

## Why this is different

Most "AI tutor" demos are a chatbot with a syllabus prompt. Three things here are structurally different:

1. **Misconceptions are named, not scored.** The Evaluate step doesn't return `correct: false` — it returns *which specific wrong mental model* produced that answer. That's what makes a real re-teach possible instead of just repeating the same explanation louder.
2. **Re-teaching is adaptive, not repetitive.** The Adapt step is explicitly instructed to use a different angle than the original explanation, targeted at the diagnosed misconception — confirmed working end-to-end in testing, not just a documented intent.
3. **It remembers you, and *uses* it.** A learner's past weak areas and misconceptions are injected into the next session's Plan step. In real testing, a learner who got "inertia is not a force" wrong in session 1 started session 2 (a different topic) with a plan segment titled *"Quick Review of Inertia: eliminate the misconception that inertia is a force"* — unprompted, generated purely from the stored history. That's the callback other tutoring demos don't do.

## Tech stack

| Layer | Choice |
|---|---|
| LLM | Groq (`openai/gpt-oss-120b` planning, `openai/gpt-oss-20b` fast grading) via strict JSON-schema structured output |
| Backend | Python, FastAPI |
| RAG | `pypdf`/`python-docx`/`python-pptx` parsing, local `sentence-transformers` embeddings, ChromaDB |
| Voice | `edge-tts` (free, no key, English + Hindi voices) |
| Photos | Pexels API |
| Learner profile | SQLite + SQLAlchemy |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Visuals | KaTeX (equations), Mermaid (diagrams), Recharts (charts), react-syntax-highlighter (code) |

## Setup

Full instructions (env vars, API keys, running both servers) are in **[docs/SETUP.md](docs/SETUP.md)**. Quick version:

```bash
# backend
cd backend
./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000

# frontend (separate terminal)
cd frontend
npm run dev
```

Then open `http://localhost:3000`.

## Known limitations

- **No AI-generated avatar video** — a real talking-head video API needs a card even for "free" trials and burns credits fast; self-hosted lip-sync needs a GPU we didn't have time to set up. We use an illustrated, gesture-animated SVG character instead — a deliberate trade-off, not an oversight.
- **`edge-tts` is an unofficial client** against Microsoft's consumer TTS service, not an SLA'd API — great for a demo, not for production.
- **Further-reading links are LLM-generated**, steered toward real Wikipedia articles to reduce hallucination risk, but not live-verified against the actual web.
- **LLM free-tier quota is finite** — heavy testing can hit Groq's daily token limit; the app fails fast with a clear message when this happens rather than hanging.
- **No real authentication** — a learner is identified by the name they type, no password. Fine for a hackathon demo, not for production.
- **Time/duration selector** on the landing page is captured but not yet deeply wired into lesson length.

## More detail

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — system design, the teaching-loop state machine, RAG pipeline
- **[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)** — scripted walkthrough for judges

Submitted to AI Innovation Hackathon 2026.
