"""
Avatar generation trade-off -- read before changing this file.

Researched options for turning a segment's audio into a talking-head video:

- D-ID / HeyGen / Synthesia: the realistic talking-head APIs. All require a
  credit card on file for their "free" trial even when you never intend to
  pay, and burn through a handful of minutes of trial credit fast. A
  hackathon build that "must actually work reliably after deployment" can't
  depend on a trial credit balance that runs out mid-demo, or a card
  requirement that blocks setup entirely.
- Self-hosted lip-sync (SadTalker, Wav2Lip): genuinely free and unlimited,
  but needs a GPU to run at usable speed -- on CPU a single short clip can
  take minutes to render, which breaks the "mid-lesson, ask a question"
  interaction loop this app depends on. Not worth the setup risk in
  hackathon time for a payoff that's still choppy.

So Phase 2 ships the fallback the plan explicitly allows for: no generated
video. The frontend renders a simple CSS/SVG avatar that animates a
"talking" state while the segment's audio plays, synced with on-screen
captions -- always available, zero cost, zero external dependency. This
function's job is just to tell the frontend which mode to render; swapping
in a real provider later means adding a branch here that returns
mode="video" with a video_url, with no change needed to any caller.
"""

from typing import Optional, TypedDict


class AvatarAsset(TypedDict):
    mode: str
    video_url: Optional[str]


def get_avatar_asset(audio_filename: str) -> AvatarAsset:
    """Return the avatar asset to pair with a segment's audio."""
    return {"mode": "static_fallback", "video_url": None}
