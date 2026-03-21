from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import logging

from dotenv import load_dotenv

load_dotenv()

from app.auth.firebase import init_firebase
from app.auth.router import router as auth_router
from app.routers.doctors import router as doctors_router
from app.routers.patients import router as patients_router
from app.routers.appointments import router as appointments_router
from app.routers.records import router as records_router
from app.routers.billing import router as billing_router
from app.routers.queue import router as queue_router
from app.routers.analytics import router as analytics_router
from app.routers.walkin import router as walkin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    init_firebase()
    logger.info("Firebase / Firestore ready (no SQL migrations)")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Clinic Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def catch_unhandled_exceptions(request: Request, call_next):
    """Return 500 JSON for unexpected errors. HTTPException / validation stay on FastAPI defaults."""
    try:
        return await call_next(request)
    except Exception as exc:
        logger.exception("Unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "detail": str(exc) if os.getenv("ENV") == "development" else None,
            },
        )


app.include_router(auth_router)
app.include_router(doctors_router)
app.include_router(patients_router)
app.include_router(appointments_router)
app.include_router(records_router)
app.include_router(billing_router)
app.include_router(queue_router)
app.include_router(analytics_router)
app.include_router(walkin_router)


@app.get("/")
async def root():
    return {"success": True, "message": "Clinic Management Platform API", "data": None}


@app.get("/health")
async def health():
    return {"success": True, "message": "Healthy", "data": {"status": "ok"}}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
