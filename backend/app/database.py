"""Database access: Firestore only (PostgreSQL removed)."""
from app.fs_client import get_store

# Backward-compatible name for gradual migration; prefer get_store in new code.
get_db = get_store
