import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.core import config

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx"}


@router.post("/upload")
async def upload_document(file: UploadFile):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    dest_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = config.UPLOADS_DIR / dest_name
    contents = await file.read()
    dest_path.write_bytes(contents)

    return {"doc_path": str(dest_path)}
