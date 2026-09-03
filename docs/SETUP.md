# Setup

## Prerequisites

- Python 3.11+
- Node.js 20+ / npm
- A [Groq](https://console.groq.com/keys) API key (free, no card)
- A [Pexels](https://www.pexels.com/api/) API key (free, no card) — optional; without it, the "photo" visual type is silently skipped and everything else still works

## Backend

```bash
cd backend
python -m venv .venv
```

**Windows note:** `torch` (a `sentence-transformers` dependency, used for local RAG embeddings) resolves a huge CUDA build by default even on CPU-only machines, and can hang for a long time on a slow connection. Install the small CPU-only wheel first:

```bash
./.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
./.venv/Scripts/python -m pip install -r requirements.txt
```

(On macOS/Linux, drop `./.venv/Scripts/` → `./.venv/bin/`, and the CUDA-hang issue doesn't apply — a plain `pip install -r requirements.txt` is fine.)

Copy the env template and fill in your keys:

```bash
cp .env.example .env
```

```
GROQ_API_KEY=your-groq-api-key-here
PEXELS_API_KEY=your-pexels-api-key-here   # optional
```

Run the server:

```bash
./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://127.0.0.1:8000/api/health` should return `{"status":"ok"}`.

## Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verifying it works end to end

1. On the landing page, enter a name, type a topic (e.g. "Newton's First Law"), leave level/time/language at defaults, and start the lesson.
2. Confirm the avatar plays audio and a visual (diagram/equation/etc.) appears.
3. Click through to the quiz, answer **wrong on purpose**, and confirm you get a named misconception (not just "incorrect") followed by a re-teach with a different analogy.
4. Finish the lesson and check the report page shows a score, weak areas, and further-reading links.
5. Visit `/profile/<the name you typed>` and confirm the completed lesson shows up.

## Troubleshooting

- **`[Errno 10048] address already in use`** on backend startup: a previous `uvicorn` process is still holding port 8000. Find and kill it:
  ```bash
  netstat -ano | findstr :8000
  taskkill /PID <pid> /F
  ```
- **`uvicorn --reload` silently not picking up a code change**: this happened repeatedly during development — the reloader can leave stale worker processes behind. If an edit doesn't seem to take effect, kill all `python` processes and start a fresh (non-`--reload`) instance rather than trusting the reloader.
- **A request hangs for a long time, then fails**: almost certainly the Groq free-tier daily token quota. The backend fails fast (a few seconds, not minutes) with a clear `503` and a wait-time estimate once it detects this — if you see a long hang instead, you're running older code without that fix in `backend/app/core/llm.py`.
- **Groq quota genuinely exhausted for the day**: Groq's quota is *per model*, not per account. Try swapping `GROQ_PLANNING_MODEL` in `.env` to another chat model on your key (check with a quick `client.models.list()` call) — confirmed working fallback: `qwen/qwen3.8-27b` (avoid `qwen3.6`, it emits a `<think>` preamble that breaks structured-output parsing). A key from a genuinely different Groq account also works (per-account quota is separate); a second key on the *same* account does not (quota is per-organization).
- **No photos ever appear**: either `PEXELS_API_KEY` isn't set, or the model simply didn't judge any segment as photo-appropriate for that particular topic (it's a judgment call made per-segment, not guaranteed every lesson) — this is expected, not a bug.
