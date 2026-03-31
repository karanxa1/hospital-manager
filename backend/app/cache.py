"""
Centralized cache manager with deterministic invalidation and periodic warming.

This module provides:
1. In-memory TTL cache for Firestore read results
2. Automatic invalidation when related collections are modified
3. Cache keys that are deterministic based on collection + filters
4. Background cache warming every 30 minutes

Cache invalidation rules:
- When a document in collection X is written, all cache entries
  that depend on collection X are invalidated.
- Cross-collection dependencies (e.g., doctors depend on users)
  are handled via dependency mapping.
"""

from __future__ import annotations

import threading
import time
import logging
import asyncio
from typing import Any, Callable, TypeVar
from functools import wraps
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheEntry:
    """Single cache entry with TTL tracking."""

    __slots__ = ("value", "expires_at", "created_at")

    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl

    def is_expired(self) -> bool:
        return time.time() >= self.expires_at

    def age_seconds(self) -> float:
        return time.time() - self.created_at


class CacheManager:
    """
    Thread-safe in-memory cache with collection-based invalidation.

    Keys are structured as: "{collection}:{subkey}" where subkey can be
    a document ID, filter hash, or "all" for full collection queries.
    """

    # Collections that depend on other collections for their data
    # When a dependency is modified, dependents are also invalidated
    DEPENDENCIES: dict[str, set[str]] = {
        "doctors": {"users"},  # doctors_list fetches user data
        "patients": {"users"},  # patients_list fetches user data
        "appointments": {"doctors", "patients"},  # appointments fetch doctor/patient
        "dashboard": {
            "appointments",
            "invoices",
            "doctors",
            "patients",
            "hospitals",
            "doctor_availability",
        },
    }

    # Default TTLs per collection (in seconds)
    COLLECTION_TTLS: dict[str, int] = {
        "doctors": 600,  # 10 minutes - doctors don't change often
        "patients": 600,  # 10 minutes
        "hospitals": 1800,  # 30 minutes - rarely changes
        "doctor_availability": 300,  # 5 minutes
        "appointments": 120,  # 2 minutes - more dynamic
        "dashboard": 300,  # 5 minutes
    }

    # Cache warming interval in seconds
    WARM_INTERVAL = 1800  # 30 minutes

    def __init__(self, default_ttl: int = 300):
        """
        Args:
            default_ttl: Default time-to-live in seconds (5 minutes)
        """
        self.default_ttl = default_ttl
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        # Track which collections each cache key depends on
        self._key_collections: dict[str, set[str]] = {}
        # Registered warm-up functions
        self._warmers: list[Callable[[], None]] = []
        # Warming state
        self._warming_task: asyncio.Task | None = None
        self._stop_warming = threading.Event()
        self._last_warm_time: datetime | None = None

    def _make_key(self, collection: str, subkey: str = "all") -> str:
        return f"{collection}:{subkey}"

    def get_ttl(self, collection: str) -> int:
        """Get the TTL for a specific collection."""
        return self.COLLECTION_TTLS.get(collection, self.default_ttl)

    def get(self, collection: str, subkey: str = "all") -> Any | None:
        """
        Get a cached value if it exists and hasn't expired.

        Returns None if not found or expired (cache miss).
        """
        key = self._make_key(collection, subkey)
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            if entry.is_expired():
                del self._cache[key]
                self._key_collections.pop(key, None)
                return None
            return entry.value

    def set(
        self,
        collection: str,
        value: Any,
        subkey: str = "all",
        ttl: int | None = None,
        depends_on: set[str] | None = None,
    ) -> None:
        """
        Store a value in the cache.

        Args:
            collection: Primary collection this cache entry is for
            value: The data to cache
            subkey: Sub-identifier (doc ID, filter hash, etc.)
            ttl: Time-to-live in seconds (uses collection default if None)
            depends_on: Additional collections this entry depends on
        """
        key = self._make_key(collection, subkey)
        effective_ttl = ttl if ttl is not None else self.get_ttl(collection)

        # Build full dependency set
        collections = {collection}
        if depends_on:
            collections.update(depends_on)
        # Add implicit dependencies
        for dep in self.DEPENDENCIES.get(collection, set()):
            collections.add(dep)

        with self._lock:
            self._cache[key] = CacheEntry(value, effective_ttl)
            self._key_collections[key] = collections

    def invalidate_collection(self, collection: str) -> int:
        """
        Invalidate all cache entries that depend on the given collection.

        Returns the number of entries invalidated.
        """
        count = 0
        with self._lock:
            keys_to_remove = []
            for key, deps in self._key_collections.items():
                if collection in deps:
                    keys_to_remove.append(key)
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._key_collections.pop(key, None)
                count += 1
        if count > 0:
            logger.info(
                f"Cache: invalidated {count} entries for collection '{collection}'"
            )
        return count

    def invalidate_key(self, collection: str, subkey: str = "all") -> bool:
        """Invalidate a specific cache key."""
        key = self._make_key(collection, subkey)
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._key_collections.pop(key, None)
                return True
        return False

    def clear(self) -> None:
        """Clear all cached entries."""
        with self._lock:
            self._cache.clear()
            self._key_collections.clear()
        logger.info("Cache: cleared all entries")

    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total = len(self._cache)
            expired = sum(1 for e in self._cache.values() if e.is_expired())
            collections_cached = set()
            for key in self._cache.keys():
                coll = key.split(":")[0]
                collections_cached.add(coll)
            return {
                "total_entries": total,
                "active_entries": total - expired,
                "expired_entries": expired,
                "collections_cached": list(collections_cached),
                "last_warm_time": self._last_warm_time.isoformat()
                if self._last_warm_time
                else None,
            }

    # -------------------------------------------------------------------------
    # Cache Warming
    # -------------------------------------------------------------------------

    def register_warmer(self, func: Callable[[], None]) -> None:
        """
        Register a function to be called during cache warming.

        The function should populate the cache with commonly accessed data.
        """
        self._warmers.append(func)
        logger.info(f"Cache: registered warmer '{func.__name__}'")

    def warm(self) -> dict:
        """
        Execute all registered warmers to populate the cache.

        Returns statistics about the warming operation.
        """
        start_time = time.time()
        results = {"success": 0, "failed": 0, "errors": []}

        logger.info(f"Cache: starting warm-up with {len(self._warmers)} warmers")

        for warmer in self._warmers:
            try:
                warmer()
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{warmer.__name__}: {str(e)}")
                logger.error(f"Cache warmer '{warmer.__name__}' failed: {e}")

        elapsed = time.time() - start_time
        results["elapsed_seconds"] = round(elapsed, 2)
        self._last_warm_time = datetime.utcnow()

        logger.info(
            f"Cache: warm-up completed in {elapsed:.2f}s - {results['success']} success, {results['failed']} failed"
        )

        return results

    async def start_warming_loop(self) -> None:
        """
        Start the background cache warming loop.

        This runs every WARM_INTERVAL seconds (30 minutes by default).
        Should be called from FastAPI lifespan startup.
        """
        self._stop_warming.clear()

        # Initial warm-up
        logger.info("Cache: performing initial warm-up")
        self.warm()

        async def warming_loop():
            while not self._stop_warming.is_set():
                try:
                    # Wait for the interval or until stopped
                    await asyncio.sleep(self.WARM_INTERVAL)
                    if not self._stop_warming.is_set():
                        logger.info("Cache: periodic warm-up triggered")
                        # Run warming in thread pool to not block event loop
                        loop = asyncio.get_event_loop()
                        await loop.run_in_executor(None, self.warm)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Cache warming loop error: {e}")

        self._warming_task = asyncio.create_task(warming_loop())
        logger.info(f"Cache: warming loop started (interval: {self.WARM_INTERVAL}s)")

    async def stop_warming_loop(self) -> None:
        """Stop the background cache warming loop."""
        self._stop_warming.set()
        if self._warming_task:
            self._warming_task.cancel()
            try:
                await self._warming_task
            except asyncio.CancelledError:
                pass
        logger.info("Cache: warming loop stopped")


# Global cache instance - shared across all requests
_cache = CacheManager(default_ttl=300)


def get_cache() -> CacheManager:
    """Get the global cache manager instance."""
    return _cache


def cached(
    collection: str,
    ttl: int | None = None,
    key_func: Callable[..., str] | None = None,
    depends_on: set[str] | None = None,
):
    """
    Decorator to cache function results.

    Args:
        collection: The collection this cache is associated with
        ttl: Cache TTL in seconds (uses collection default if None)
        key_func: Function to generate cache subkey from arguments
        depends_on: Additional collections this cache depends on

    Example:
        @cached("doctors", ttl=300)
        def get_all_doctors(store):
            return store.doctors_list()

        @cached("doctors", key_func=lambda store, spec: spec or "all")
        def get_doctors_by_spec(store, specialization):
            return store.doctors_list(specialization)
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            cache = get_cache()

            # Generate subkey
            if key_func:
                subkey = key_func(*args, **kwargs)
            else:
                subkey = "all"

            # Check cache
            cached_value = cache.get(collection, subkey)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(collection, result, subkey, ttl, depends_on)

            return result

        # Expose method to bypass cache
        wrapper.uncached = func
        return wrapper

    return decorator


def invalidate_on_write(collection: str):
    """
    Decorator to invalidate cache after a write operation.

    Apply to Store methods that modify Firestore documents.

    Example:
        @invalidate_on_write("doctors")
        def doctor_set(self, did: str, data: dict) -> None:
            self.db.collection("doctors").document(did).set(data, merge=True)
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            result = func(*args, **kwargs)
            get_cache().invalidate_collection(collection)
            return result

        return wrapper

    return decorator
