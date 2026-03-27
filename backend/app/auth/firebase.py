import firebase_admin
from firebase_admin import credentials, auth
import os
import logging

logger = logging.getLogger(__name__)

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "")

    try:
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase initialized with credentials: {cred_path}")
        elif project_id:
            firebase_admin.initialize_app(options={"projectId": project_id})
            logger.info(f"Firebase initialized with project ID: {project_id}")
        else:
            logger.warning("Firebase not configured - auth will fail")
    except Exception as e:
        logger.warning(f"Firebase init failed: {e}")

    _firebase_initialized = True


def verify_firebase_token(id_token: str) -> dict | None:
    init_firebase()
    try:
        decoded = auth.verify_id_token(id_token, clock_skew_seconds=60)
        return decoded
    except Exception as e:
        logger.warning(f"Firebase token verification failed: {e}")
        return None
