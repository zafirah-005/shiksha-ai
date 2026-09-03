import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import lessons, profile, upload
from app.core import config
from app.core.llm import LessonGenerationError

logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")
logger = logging.getLogger("app.main")

app = FastAPI(title="AI Teacher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media/audio", StaticFiles(directory=config.AUDIO_DIR), name="audio")

app.include_router(lessons.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(profile.router, prefix="/api")


# FastAPI's default behavior on an unhandled exception is to return a bare
# "Internal Server Error" with NO detail -- confirmed by testing it directly.
# That's the right default for a public API, but it means every backend
# failure in this app (LLM errors included) was reaching the frontend as an
# opaque 500 with nothing to show the learner or debug from. These handlers
# fix that: real detail comes through, without leaking a full stack trace.
@app.exception_handler(LessonGenerationError)
async def lesson_generation_error_handler(request: Request, exc: LessonGenerationError):
    return JSONResponse(
        status_code=503,
        content={"detail": str(exc), "retry_after_seconds": exc.retry_after_seconds},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})


@app.get("/api/health")
def health():
    return {"status": "ok"}
