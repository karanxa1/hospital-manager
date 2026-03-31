from datetime import datetime as dt
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import get_current_user, require_admin, require_admin_or_doctor
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store
from app.schemas.doctor import (
    AvailabilitySlotCreate,
    DoctorCreate,
    DoctorUpdate,
    LeaveCreate,
)
from app.services.doctor_service import get_available_slots

router = APIRouter(prefix="/api/v1/doctors", tags=["doctors"])


def _doc_row(d: dict) -> dict:
    u = d.get("_user") or {}
    fee = d.get("consultation_fee")
    return {
        "id": d["id"],
        "user_id": d.get("user_id"),
        "user_name": u.get("name") or "",
        "user_email": u.get("email") or "",
        "user_profile_picture": u.get("profile_picture"),
        "specialization": d.get("specialization") or "",
        "qualification": d.get("qualification") or "",
        "experience_years": d.get("experience_years") or 0,
        "bio": d.get("bio"),
        "consultation_fee": float(fee) if fee is not None else 0,
        "avg_consultation_minutes": d.get("avg_consultation_minutes") or 15,
        "created_at": d.get("created_at") or "",
    }


@router.get("", response_model=dict)
def list_doctors(
    specialization: str = None,
    store: Store = Depends(get_store),
    _current_user: User = Depends(get_current_user),
):
    doctors = store.doctors_list(specialization)
    return {
        "success": True,
        "data": [_doc_row(d) for d in doctors],
        "message": "Doctors fetched",
    }


@router.get("/me", response_model=dict)
def get_me(
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    doc = store.doctor_by_user(str(current_user.id))
    if not doc:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Doctor profile not found"}
        )
    u = store.user_get(doc.get("user_id", ""))
    row = {**doc, "_user": u or {}}
    return {"success": True, "data": _doc_row(row), "message": "Doctor profile fetched"}


@router.get("/{doctor_id}", response_model=dict)
def get_doctor(
    doctor_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(get_current_user),
):
    doc = store.doctor_get(str(doctor_id))
    if not doc:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Doctor not found"}
        )
    u = store.user_get(doc.get("user_id", ""))
    row = {**doc, "_user": u or {}}
    return {"success": True, "data": _doc_row(row), "message": "Doctor fetched"}


@router.post("", response_model=dict)
def create_doctor(
    body: DoctorCreate,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    uid = str(body.user_id)
    user = store.user_get(uid)
    if not user:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "User not found"}
        )
    if store.doctor_by_user(uid):
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Doctor profile already exists"},
        )
    store.user_set(uid, {"role": UserRole.doctor.value}, merge=True)
    did = store.doctor_create(
        {
            "user_id": uid,
            "specialization": body.specialization,
            "qualification": body.qualification,
            "experience_years": body.experience_years,
            "bio": body.bio,
            "consultation_fee": body.consultation_fee,
            "avg_consultation_minutes": body.avg_consultation_minutes,
        }
    )
    return {
        "success": True,
        "data": {"id": did, "user_id": uid, "user_name": user.get("name") or ""},
        "message": "Doctor created",
    }


@router.put("/{doctor_id}", response_model=dict)
def update_doctor(
    doctor_id: UUID,
    body: DoctorUpdate,
    store: Store = Depends(get_store),
    current_user: User = Depends(require_admin_or_doctor),
):
    doc = store.doctor_get(str(doctor_id))
    if not doc:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Doctor not found"}
        )
    if current_user.role == UserRole.doctor and str(doc.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={"success": False, "message": "You can only update your own profile"},
        )
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if patch:
        store.doctor_set(str(doctor_id), patch)
    return {"success": True, "data": {"id": str(doctor_id)}, "message": "Doctor updated"}


@router.get("/{doctor_id}/availability", response_model=dict)
def get_availability(
    doctor_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(get_current_user),
):
    slots = store.availability_for_doctor(str(doctor_id))
    result = [
        {
            "id": s["id"],
            "doctor_id": str(doctor_id),
            "day_of_week": s.get("day_of_week"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "is_active": s.get("is_active", True),
        }
        for s in slots
    ]
    return {"success": True, "data": result, "message": "Availability fetched"}


@router.post("/{doctor_id}/availability", response_model=dict)
def set_availability(
    doctor_id: UUID,
    slots: List[AvailabilitySlotCreate],
    store: Store = Depends(get_store),
    current_user: User = Depends(require_admin_or_doctor),
):
    if current_user.role == UserRole.doctor:
        doc = store.doctor_get(str(doctor_id))
        if not doc or str(doc.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403,
                detail={"success": False, "message": "You can only update your own availability"},
            )
    slots_data = [
        {
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_active": True,
        }
        for s in slots
    ]
    store.availability_replace(str(doctor_id), slots_data)
    created = [
        {"id": x["id"], "day_of_week": x.get("day_of_week")}
        for x in store.availability_for_doctor(str(doctor_id))
    ]
    return {"success": True, "data": created, "message": "Availability updated"}


@router.delete("/{doctor_id}/availability/{slot_id}", response_model=dict)
def delete_availability_slot(
    doctor_id: UUID,
    slot_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    if not store.availability_delete_slot(str(doctor_id), str(slot_id)):
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Slot not found"}
        )
    return {"success": True, "data": None, "message": "Slot deleted"}


@router.get("/{doctor_id}/leave", response_model=dict)
def get_leaves(
    doctor_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    leaves = store.leaves_for_doctor(str(doctor_id))
    result = [
        {
            "id": l["id"],
            "doctor_id": str(doctor_id),
            "leave_date": l.get("leave_date"),
            "reason": l.get("reason"),
            "created_at": l.get("created_at") or "",
        }
        for l in leaves
    ]
    return {"success": True, "data": result, "message": "Leaves fetched"}


@router.post("/{doctor_id}/leave", response_model=dict)
def mark_leave(
    doctor_id: UUID,
    body: LeaveCreate,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    ds = body.leave_date.isoformat()
    if store.leave_find(str(doctor_id), ds):
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Leave already exists for this date"},
        )
    lid = store.leave_create(str(doctor_id), ds, body.reason)
    return {
        "success": True,
        "data": {"id": lid, "leave_date": ds},
        "message": "Leave marked",
    }


@router.delete("/{doctor_id}/leave/{leave_id}", response_model=dict)
def cancel_leave(
    doctor_id: UUID,
    leave_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    if not store.leave_delete(str(doctor_id), str(leave_id)):
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Leave not found"}
        )
    return {"success": True, "data": None, "message": "Leave cancelled"}


@router.get("/{doctor_id}/slots", response_model=dict)
def get_slots_for_date(
    doctor_id: UUID,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    store: Store = Depends(get_store),
    _current_user: User = Depends(get_current_user),
):
    try:
        target_date = dt.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Invalid date format. Use YYYY-MM-DD"},
        )
    slots = get_available_slots(store, doctor_id, target_date)
    return {"success": True, "data": slots, "message": "Slots fetched"}
