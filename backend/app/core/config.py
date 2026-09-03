import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = DATA_DIR / "chroma_db"
UPLOADS_DIR = DATA_DIR / "uploads"
AUDIO_DIR = DATA_DIR / "audio"
LEARNER_DB_PATH = DATA_DIR / "learner.db"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")

# Generic, provider-agnostic names: PLANNING_MODEL for planning/explaining/reports,
# FAST_MODEL for cheap high-frequency calls (grading, misconception classification).
# llama-3.3-70b-versatile / llama-3.1-8b-instant have been retired from Groq's
# lineup; openai/gpt-oss-120b and openai/gpt-oss-20b are the current large/small
# pair. NOTE: Groq's free-tier daily quota is PER MODEL, not per account -- if
# PLANNING_MODEL's quota runs out, qwen/qwen3.8-27b is a confirmed-working
# fallback with its own separate quota (tested live against our actual
# strict-schema Explanation model, including the nested visual spec). Avoid
# qwen3.6 for this -- it emits a <think> preamble that breaks JSON parsing.
PLANNING_MODEL = os.getenv("GROQ_PLANNING_MODEL", "openai/gpt-oss-120b")
FAST_MODEL = os.getenv("GROQ_FAST_MODEL", "openai/gpt-oss-20b")

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

CHUNK_SIZE_WORDS = 220
CHUNK_OVERLAP_WORDS = 40
RETRIEVAL_TOP_K = 5

DATA_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
