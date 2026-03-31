from typing import Generator

from firebase_admin import firestore

from app.auth.firebase import init_firebase
from app.cached_store import CachedStore


# Singleton cached store instance (reused across requests)
_cached_store: CachedStore | None = None


def get_store() -> Generator[CachedStore, None, None]:
    """
    Dependency that provides a CachedStore instance.

    Uses a singleton pattern to ensure the same store instance
    is reused across requests, which allows the cache to be shared.
    """
    global _cached_store

    if _cached_store is None:
        init_firebase()
        db = firestore.client()
        _cached_store = CachedStore(db)

    yield _cached_store


def get_cached_store_instance() -> CachedStore:
    """
    Get the singleton CachedStore instance directly.

    Used for cache warming registration during startup.
    """
    global _cached_store

    if _cached_store is None:
        init_firebase()
        db = firestore.client()
        _cached_store = CachedStore(db)

    return _cached_store
