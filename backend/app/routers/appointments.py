from datetime import date, datetime as dt
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import get_current_user, require_admin_or_doctor, require_doctor
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store
from app.schemas.appointment import AppointmentCreate
from app.services.appointment_service import book_appointment

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


def _serialize_appointment(store: Store, appt: dict) -> dict:
    doctor = store.doctor_get(appt["doctor_id"])
    doc_user = store.user_get(doctor["user_id"]) if doctor else None
    return {
        "id": appt["id"],
        "patient_id": appt.get("patient_id"),
        "doctor_id": appt.get("doctor_id"),
        "doctor_name": f"Dr. {doc_user['name']}" if doc_user and doc_user.get("name") else "",
        "doctor_specialization": doctor.get("specialization") if doctor else "",
        "appointment_date": appt.get("appointment_date"),
        "start_time": appt.get("start_time"),
        "end_time": appt.get("end_time"),
        "status": appt.get("status"),
        "type": appt.get("type") or "offline_checkup",
        "chief_complaint": appt.get("chief_complaint"),
        "token_number": appt.get("token_number"),
        "payment_status": appt.get("payment_status") or "pending",
        "payment_amount": float(appt["payment_amount"]) if appt.get("payment_amount") is not None else 0,
        "cashfree_order_id": appt.get("cashfree_order_id"),
        "created_at": appt.get("created_at") or "",
    }


@router.get("", response_model=dict)
def list_all_appointments(
    date_from: date = Query(None),
    date_to: date = Query(None),
    doctor_id: UUID = Query(None),
    status: str = Query(None),
    limit: int = Query(None),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    rows = store.appointments_filter(
        date_from=date_from,
        date_to=date_to,
        doctor_id=str(doctor_id) if doctor_id else None,
        status=status,
        limit=limit,
    )
    return {
        "success": True,
        "data": [_serialize_appointment(store, a) for a in rows],
        "message": "Appointments fetched",
    }


@router.get("/my", response_model=dict)
def my_appointments(
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_by_user(str(current_user.id))
    if not patient:
        return {
            "success": True,
            "data": [],
            "message": "No patient profile yet — complete your profile to book.",
            "needs_patient_profile": True,
        }
    appointments = store.appointments_for_patient(patient["id"])
    return {
        "success": True,
        "data": [_serialize_appointment(store, a) for a in appointments],
        "message": "Appointments fetched",
    }


@router.get("/doctor/today", response_model=dict)
def doctor_today_queue(
    store: Store = Depends(get_store),
    current_user: User = Depends(require_doctor),
):
    doctor = store.doctor_by_user(str(current_user.id))
    if not doctor:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Doctor profile not found"},
        )
    today = date.today()
    appointments = store.appointments_for_doctor_date(doctor["id"], today)
    appointments.sort(key=lambda x: (x.get("token_number") is None, x.get("token_number") or 0))
    result = []
    for appt in appointments:
        patient = store.patient_get(appt["patient_id"])
        p_user = store.user_get(patient["user_id"]) if patient else None
        result.append(
            {
                "id": appt["id"],
                "patient_name": p_user.get("name") if p_user else "",
                "patient_phone": p_user.get("phone") if p_user else "",
                "appointment_date": appt.get("appointment_date"),
                "start_time": appt.get("start_time"),
                "end_time": appt.get("end_time"),
                "status": appt.get("status"),
                "token_number": appt.get("token_number"),
                "chief_complaint": appt.get("chief_complaint"),
                "type": appt.get("type") or "offline_checkup",
            }
        )
    return {"success": True, "data": result, "message": "Today's queue fetched"}


@router.post("", response_model=dict)
def create_appointment(
    body: AppointmentCreate,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_by_user(str(current_user.id))
    if not patient:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Patient profile not found"},
        )
    start = dt.strptime(body.start_time, "%H:%M").time()
    end = dt.strptime(body.end_time, "%H:%M").time()
    try:
        appt = book_appointment(
            store,
            patient_id=UUID(patient["id"]),
            doctor_id=body.doctor_id,
            target_date=body.appointment_date,
            start_time=start,
            end_time=end,
            appt_type=body.type.value,
            chief_complaint=body.chief_complaint or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"success": False, "message": str(e)})
    return {
        "success": True,
        "data": _serialize_appointment(store, appt),
        "message": "Appointment booked",
    }


@router.put("/{appointment_id}/confirm", response_model=dict)
def confirm_appointment(
    appointment_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    appt = store.appointment_get(str(appointment_id))
    if not appt:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Appointment not found"},
        )
    store.appointment_update(str(appointment_id), {"status": "confirmed"})
    return {
        "success": True,
        "data": {"id": str(appointment_id), "status": "confirmed"},
        "message": "Appointment confirmed",
    }


@router.put("/{appointment_id}/cancel", response_model=dict)
def cancel_appointment(
    appointment_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    appt = store.appointment_get(str(appointment_id))
    if not appt:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Appointment not found"},
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(appt["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    elif current_user.role not in (UserRole.admin, UserRole.doctor):
        raise HTTPException(
            status_code=403, detail={"success": False, "message": "Access denied"}
        )
    store.appointment_update(str(appointment_id), {"status": "cancelled"})
    return {
        "success": True,
        "data": {"id": str(appointment_id), "status": "cancelled"},
        "message": "Appointment cancelled",
    }


@router.put("/{appointment_id}/complete", response_model=dict)
def complete_appointment(
    appointment_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_doctor),
):
    appt = store.appointment_get(str(appointment_id))
    if not appt:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Appointment not found"},
        )
    store.appointment_update(str(appointment_id), {"status": "completed"})
    return {
        "success": True,
        "data": {"id": str(appointment_id), "status": "completed"},
        "message": "Appointment completed",
    }


@router.put("/{appointment_id}/no-show", response_model=dict)
def mark_no_show(
    appointment_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    appt = store.appointment_get(str(appointment_id))
    if not appt:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Appointment not found"},
        )
    store.appointment_update(str(appointment_id), {"status": "no_show"})
    return {
        "success": True,
        "data": {"id": str(appointment_id), "status": "no_show"},
        "message": "Marked as no-show",
    }
