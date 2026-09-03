"""
TTS choice: edge-tts (free, no API key).

edge-tts is an unofficial Python client for the free text-to-speech service
behind Microsoft Edge's "Read Aloud" feature. It costs nothing, needs no
signup/API key, has no meaningful rate limit for a hackathon demo's traffic,
and gives genuinely natural neural voices (the same ones Edge ships) rather
than a robotic free-tier fallback. It also already covers Hindi
(hi-IN-SwaraNeural), which Phase 3 needs anyway. The trade-off: it's an
unofficial client against a Microsoft consumer service, not a stable public
API with an uptime SLA -- fine for a hackathon demo, worth swapping for
Azure/Google Cloud TTS (paid) if this ever needs to be a production service.
"""

import asyncio
import logging
import uuid
from pathlib import Path

import edge_tts

from app.core import config

logger = logging.getLogger("app.voice.tts")

# Minimal language -> voice mapping; Phase 3 will select from this properly
# once language selection is wired end to end.
VOICE_BY_LANGUAGE = {
    "en": "en-US-AriaNeural",
    "hi": "hi-IN-SwaraNeural",
}
DEFAULT_VOICE = VOICE_BY_LANGUAGE["en"]


async def _synthesize(text: str, voice: str, out_path: Path) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(out_path))


def synthesize_speech(text: str, language: str = "en") -> str:
    """Generate speech audio for the given text and return the audio
    filename (relative to backend/data/audio, served at /media/audio/<name>)."""
    voice = VOICE_BY_LANGUAGE.get(language, DEFAULT_VOICE)
    logger.info("synthesize_speech: language=%r -> voice=%r", language, voice)
    filename = f"{uuid.uuid4().hex}.mp3"
    out_path = config.AUDIO_DIR / filename
    asyncio.run(_synthesize(text, voice, out_path))
    return filename
