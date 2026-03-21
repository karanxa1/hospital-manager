import os
import uuid
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads",
    "lab_reports",
)
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_lab_report(file: UploadFile) -> str:
    ensure_upload_dir()

    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": f"File type {ext} not allowed",
                "detail": "Allowed: pdf, jpg, png",
            },
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "File too large",
                "detail": "Max size: 10MB",
            },
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return f"/uploads/lab_reports/{filename}"
