# Demo Script

A live LLM demo has real failure modes (latency, rate limits) — this script is built around **proven-good example content** (topics and wrong answers that produced strong, concrete results during development) and a pre-flight checklist, not just a feature tour.

## Pre-demo checklist (do this 10 minutes before presenting)

- [ ] Backend running: `curl http://127.0.0.1:8000/api/health` → `{"status":"ok"}`
- [ ] Frontend running, `http://localhost:3000` loads
- [ ] Quick live check that the LLM is actually responding (not quota-exhausted): start one throwaway lesson and confirm the plan generates in a few seconds
- [ ] `backend/.env` has a valid `GROQ_API_KEY` — if quota looks tight, see `docs/SETUP.md` → Troubleshooting for the model-swap fallback
- [ ] Have a **second browser tab** open to `/profile/<name>` ready, for the personalization callback (see Act 3)
- [ ] Know your two demo topics in advance (below) — don't improvise topic choice live, since some topics reliably trigger richer visuals than others

## The demo (aim for ~5 minutes)

### Act 1 — Start a lesson, show the loop is real (60s)

1. Landing page: enter your name (say it out loud — "this is how it remembers me later"), topic: **"Newton's First Law"**, level: beginner.
2. Point out the avatar teaching the first segment with audio + an on-screen diagram — call out that this is **not a single pre-rendered video**, each segment is generated and played independently, which is what makes pausing for a question possible at all.

### Act 2 — Misconception detection + adaptive re-teach (90s) — the core differentiator

3. When the quiz appears, answer **wrong on purpose** with something like: *"Objects naturally slow down and need a constant push to keep moving."* (the classic Aristotelian misconception — reliably produces a clean, specific diagnosis).
4. Point at the result: it doesn't just say "incorrect" — it names the misconception (something like *"believes motion requires a continuous force"*) and explains *why* that's wrong.
5. Click through to the re-teach and read the new analogy out loud — point out it's **not the same explanation repeated**, it's a different angle chosen specifically to correct that misconception.
6. Answer correctly on the retry, continue.

### Act 3 — Personalization across sessions (90s) — the second differentiator

This is the strongest, least-common feature — worth setting up in advance rather than live-generating both sessions during the demo (an LLM plan call takes a few seconds and adds a dead pause).

7. Finish the lesson (fastest path: answer correctly on the remaining segments) and land on the report page — point out the score, weak areas, and the misconception that was caught.
8. Switch to the **second tab**, already on `/profile/<your name>`. Refresh it. Point out the score trend and the recurring weak area/misconception now on record.
9. Go back to the landing page and start a **second, related lesson** — e.g. **"Newton's Second Law"** — same name.
10. When the plan and first explanation come back, read the segment titles/opening lines out loud: they explicitly reference the first session's misconception (in testing, this produced a segment literally titled *"Quick Review of Inertia: eliminate the misconception that inertia is a force"*, unprompted). This is the moment to slow down and make sure judges register it — it's not obviously visible, it's a sentence you have to read.

### Act 4 — Breadth, quickly (30s)

11. Mention (don't necessarily demo live, to save time): RAG grounding from an uploaded PDF/DOCX/PPTX, Hindi/Hinglish language support, the other visual types (equation/code/chart/photo — a comparison topic like *"comparing renewable energy sources"* reliably produces a chart; a biology/geography topic sometimes produces a real photo, though that's the model's judgment call each time, not guaranteed).

## If something breaks live

- **Slow/hanging response**: talk through what's happening while waiting — "it's generating a structured lesson plan grounded in the topic" — most calls resolve in a few seconds; if one is visibly stuck past ~10s, refresh and retry rather than waiting it out on stage.
- **A clear rate-limit error appears**: this is expected behavior working correctly, not a bug — say so. ("It just told us clearly what's wrong and how long to wait, instead of hanging silently — that's deliberate.") Have a pre-recorded screen capture of a full run as backup if this happens right when you need to demo.
- **No photo/chart shows up when you expected one**: don't apologize for it live — the model makes that call per segment, and diagrams are the more common (and arguably more broadly useful) pick anyway.
