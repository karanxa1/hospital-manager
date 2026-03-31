"""
Cached wrapper for FirestoreStore.

This module wraps the Store class methods with caching behavior:
- Read methods check cache first, then fall back to Firestore
- Write methods invalidate relevant cache entries after completion
- Cache warmers pre-populate frequently accessed data

Usage:
    from app.cached_store import CachedStore, register_warmers

    # In your dependency
    def get_store():
        return CachedStore(get_firestore_client())
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import date
from typing import Any

from app.firestore_store import Store
from app.cache import get_cache, CacheManager

logger = logging.getLogger(__name__)


def _hash_args(*args, **kwargs) -> str:
    """Create a deterministic hash from function arguments."""

    # Convert args to a serializable format
    def serialize(obj):
        if obj is None:
            return None
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, (list, tuple)):
            return [serialize(x) for x in obj]
        if isinstance(obj, dict):
            return {k: serialize(v) for k, v in sorted(obj.items())}
        return str(obj)

    data = json.dumps(
        {"args": serialize(args), "kwargs": serialize(kwargs)}, sort_keys=True
    )
    return hashlib.md5(data.encode()).hexdigest()[:16]


class CachedStore(Store):
    """
    Store subclass that adds caching to read operations and
    invalidation to write operations.
    """

    def __init__(self, db):
        super().__init__(db)
        self._cache = get_cache()

    # -------------------------------------------------------------------------
    # CACHED READ METHODS
    # -------------------------------------------------------------------------

    def doctors_list(self, specialization: str | None = None) -> list[dict]:
        """Get all doctors with optional specialization filter (cached)."""
        subkey = f"spec:{specialization}" if specialization else "all"
        cached = self._cache.get("doctors", subkey)
        if cached is not None:
            logger.debug(f"Cache HIT: doctors:{subkey}")
            return cached

        logger.debug(f"Cache MISS: doctors:{subkey}")
        result = super().doctors_list(specialization)
        self._cache.set("doctors", result, subkey)
        return result

    def patients_list(self, search: str | None = None) -> list[dict]:
        """Get all patients with optional search filter (cached)."""
        # Only cache when no search filter (full list)
        if search:
            return super().patients_list(search)

        cached = self._cache.get("patients", "all")
        if cached is not None:
            logger.debug("Cache HIT: patients:all")
            return cached

        logger.debug("Cache MISS: patients:all")
        result = super().patients_list(search)
        self._cache.set("patients", result, "all")
        return result

    def hospitals_list(self) -> list[dict]:
        """Get all hospitals (cached)."""
        cached = self._cache.get("hospitals", "all")
        if cached is not None:
            logger.debug("Cache HIT: hospitals:all")
            return cached

        logger.debug("Cache MISS: hospitals:all")
        result = super().hospitals_list()
        self._cache.set("hospitals", result, "all")
        return result

    def availability_for_doctor(self, doctor_id: str) -> list[dict]:
        """Get availability slots for a doctor (cached)."""
        subkey = f"doc:{doctor_id}"
        cached = self._cache.get("doctor_availability", subkey)
        if cached is not None:
            logger.debug(f"Cache HIT: doctor_availability:{subkey}")
            return cached

        logger.debug(f"Cache MISS: doctor_availability:{subkey}")
        result = super().availability_for_doctor(doctor_id)
        self._cache.set("doctor_availability", result, subkey)
        return result

    def leaves_for_doctor(self, doctor_id: str) -> list[dict]:
        """Get leave dates for a doctor (cached)."""
        subkey = f"doc:{doctor_id}"
        cached = self._cache.get("doctor_leave", subkey)
        if cached is not None:
            logger.debug(f"Cache HIT: doctor_leave:{subkey}")
            return cached

        logger.debug(f"Cache MISS: doctor_leave:{subkey}")
        result = super().leaves_for_doctor(doctor_id)
        self._cache.set("doctor_leave", result, subkey)
        return result

    def users_all(self) -> list[dict]:
        """Get all users (cached)."""
        cached = self._cache.get("users", "all")
        if cached is not None:
            logger.debug("Cache HIT: users:all")
            return cached

        logger.debug("Cache MISS: users:all")
        result = super().users_all()
        self._cache.set("users", result, "all")
        return result

    def invoices_all(self) -> list[dict]:
        """Get all invoices (cached)."""
        cached = self._cache.get("invoices", "all")
        if cached is not None:
            logger.debug("Cache HIT: invoices:all")
            return cached

        logger.debug("Cache MISS: invoices:all")
        result = super().invoices_all()
        self._cache.set("invoices", result, "all")
        return result

    # -------------------------------------------------------------------------
    # INVALIDATING WRITE METHODS
    # -------------------------------------------------------------------------

    def user_set(self, uid: str, data: dict, merge: bool = True) -> None:
        """Update user and invalidate cache."""
        super().user_set(uid, data, merge)
        self._cache.invalidate_collection("users")

    def patient_ensure(self, user_id: str) -> dict:
        """Create patient if not exists and invalidate cache."""
        result = super().patient_ensure(user_id)
        self._cache.invalidate_collection("patients")
        return result

    def patient_update(self, pid: str, fields: dict) -> None:
        """Update patient and invalidate cache."""
        super().patient_update(pid, fields)
        self._cache.invalidate_collection("patients")

    def doctor_create(self, data: dict) -> str:
        """Create doctor and invalidate cache."""
        result = super().doctor_create(data)
        self._cache.invalidate_collection("doctors")
        return result

    def doctor_set(self, did: str, data: dict) -> None:
        """Update doctor and invalidate cache."""
        super().doctor_set(did, data)
        self._cache.invalidate_collection("doctors")

    def doctor_ensure(self, user_id: str) -> dict:
        """Create doctor if not exists and invalidate cache."""
        result = super().doctor_ensure(user_id)
        self._cache.invalidate_collection("doctors")
        return result

    def availability_replace(self, doctor_id: str, slots: list[dict]) -> None:
        """Replace availability slots and invalidate cache."""
        super().availability_replace(doctor_id, slots)
        self._cache.invalidate_collection("doctor_availability")

    def availability_delete_slot(self, doctor_id: str, slot_id: str) -> bool:
        """Delete availability slot and invalidate cache."""
        result = super().availability_delete_slot(doctor_id, slot_id)
        if result:
            self._cache.invalidate_collection("doctor_availability")
        return result

    def leave_create(self, doctor_id: str, leave_date: str, reason: str | None) -> str:
        """Create leave and invalidate cache."""
        result = super().leave_create(doctor_id, leave_date, reason)
        self._cache.invalidate_collection("doctor_leave")
        return result

    def leave_delete(self, doctor_id: str, leave_id: str) -> bool:
        """Delete leave and invalidate cache."""
        result = super().leave_delete(doctor_id, leave_id)
        if result:
            self._cache.invalidate_collection("doctor_leave")
        return result

    def appointment_create(self, data: dict) -> str:
        """Create appointment and invalidate cache."""
        result = super().appointment_create(data)
        self._cache.invalidate_collection("appointments")
        return result

    def appointment_update(self, aid: str, fields: dict) -> None:
        """Update appointment and invalidate cache."""
        super().appointment_update(aid, fields)
        self._cache.invalidate_collection("appointments")

    def invoice_create(self, data: dict) -> str:
        """Create invoice and invalidate cache."""
        result = super().invoice_create(data)
        self._cache.invalidate_collection("invoices")
        return result

    def invoice_update(self, iid: str, fields: dict) -> None:
        """Update invoice and invalidate cache."""
        super().invoice_update(iid, fields)
        self._cache.invalidate_collection("invoices")

    def record_create(self, data: dict, prescriptions: list[dict]) -> str:
        """Create medical record and invalidate cache."""
        result = super().record_create(data, prescriptions)
        self._cache.invalidate_collection("medical_records")
        return result

    def record_update(self, rid: str, fields: dict) -> None:
        """Update medical record and invalidate cache."""
        super().record_update(rid, fields)
        self._cache.invalidate_collection("medical_records")

    def prescriptions_clear(self, record_id: str) -> None:
        """Clear prescriptions and invalidate cache."""
        super().prescriptions_clear(record_id)
        self._cache.invalidate_collection("medical_records")

    def prescriptions_add_batch(self, record_id: str, items: list[dict]) -> None:
        """Add prescriptions and invalidate cache."""
        super().prescriptions_add_batch(record_id, items)
        self._cache.invalidate_collection("medical_records")

    def lab_report_create(self, data: dict) -> str:
        """Create lab report and invalidate cache."""
        result = super().lab_report_create(data)
        self._cache.invalidate_collection("lab_reports")
        return result

    def hospital_create(self, data: dict) -> str:
        """Create hospital and invalidate cache."""
        result = super().hospital_create(data)
        self._cache.invalidate_collection("hospitals")
        return result

    def hospital_set(self, hid: str, data: dict) -> None:
        """Update hospital and invalidate cache."""
        super().hospital_set(hid, data)
        self._cache.invalidate_collection("hospitals")

    def queue_set(self, doctor_id: str, d: date, fields: dict) -> None:
        """Update queue and invalidate cache."""
        super().queue_set(doctor_id, d, fields)
        self._cache.invalidate_collection("token_queue")


def register_warmers(store: CachedStore) -> None:
    """
    Register cache warming functions.

    These functions pre-populate the cache with commonly accessed data
    to ensure fast responses after cache warming.
    """
    cache = get_cache()

    def warm_doctors():
        """Pre-load all doctors."""
        logger.info("Warming: doctors list")
        # Call the uncached parent method directly
        result = Store.doctors_list(store, None)
        cache.set("doctors", result, "all")

    def warm_patients():
        """Pre-load all patients."""
        logger.info("Warming: patients list")
        result = Store.patients_list(store, None)
        cache.set("patients", result, "all")

    def warm_hospitals():
        """Pre-load all hospitals."""
        logger.info("Warming: hospitals list")
        result = Store.hospitals_list(store)
        cache.set("hospitals", result, "all")

    def warm_users():
        """Pre-load all users."""
        logger.info("Warming: users list")
        result = Store.users_all(store)
        cache.set("users", result, "all")

    def warm_dashboard():
        """Pre-generate dashboard summary and store in Firestore + cache."""
        logger.info("Warming: dashboard summary")
        from app.routers.analytics import _build_dashboard_summary

        try:
            # Generate the full dashboard summary
            data = _build_dashboard_summary(store)

            # Store in Firestore as SDR (Single Document Read) for future fast access
            store.db.collection("dashboard").document("summary").set(data)

            # Also store in memory cache
            cache.set("dashboard", data, "summary", ttl=600)

            logger.info("Warming: dashboard summary completed")
        except Exception as e:
            logger.error(f"Warming: dashboard summary failed: {e}")

    # Register all warmers
    cache.register_warmer(warm_doctors)
    cache.register_warmer(warm_patients)
    cache.register_warmer(warm_hospitals)
    cache.register_warmer(warm_users)
    cache.register_warmer(warm_dashboard)

    logger.info("Cache warmers registered")
