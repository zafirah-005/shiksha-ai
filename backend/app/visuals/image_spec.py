"""
Real photos via the Pexels API (free, key-based, no card required).

Important design choice: the LLM only ever supplies `photo_query` (a search
phrase) -- it never generates image_url/photographer itself, because it has
no way to know a real photo exists at a URL it invents. This module takes
that query, calls the real Pexels API, and returns actual resolved photo
data. If no key is configured, the search fails, or nothing comes back,
callers must treat that as "no photo" and fall back gracefully -- never
fabricate a URL to fill the gap.
"""

from typing import Optional

import httpx
from pydantic import BaseModel, Field

from app.core import config


class PhotoSpec(BaseModel):
    image_url: str = Field(
        default="",
        description=(
            "Resolved photo URL. This is filled in by the backend after a real "
            "Pexels search -- always leave it empty/null yourself, you cannot know "
            "a real photo URL. Use photo_query on the parent object to request one."
        ),
    )
    photographer: str = Field(default="", description="Backend-populated. Leave empty.")
    photographer_url: str = Field(default="", description="Backend-populated. Leave empty.")
    caption: str = Field(default="", description="Short caption describing what the photo shows.")


def search_pexels_photo(query: str) -> Optional[PhotoSpec]:
    """Search Pexels for one relevant landscape photo. Returns None if no API
    key is configured, the request fails, or no results come back -- callers
    must handle that by simply not showing a photo, never by inventing one."""
    if not config.PEXELS_API_KEY or not query.strip():
        return None

    try:
        response = httpx.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            headers={"Authorization": config.PEXELS_API_KEY},
            timeout=10,
        )
        response.raise_for_status()
        photos = response.json().get("photos") or []
        if not photos:
            return None

        photo = photos[0]
        return PhotoSpec(
            image_url=photo["src"]["large"],
            photographer=photo["photographer"],
            photographer_url=photo["photographer_url"],
            caption=query,
        )
    except (httpx.HTTPError, KeyError, ValueError):
        return None
