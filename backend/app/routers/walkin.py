import uuid
from datetime import date, datetime, time as t, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import require_admin
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store, _now_iso
from app.schemas.appointment import WalkInCreate
from app.services.appointment_service import get_next_token

router = APIRouter(prefix="/api/v1/walkin", tags=["walkin"])


@router.post("", response_model=dict)
def create_walkin(
    body: WalkInCreate,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    today = date.today()
    patient = store.patient_by_phone_user(body.patient_phone)
    if not patient:
        uid = str(uuid.uuid4())
        digits = "".join(c for c in body.patient_phone if c.isdigit())
        store.user_set(
            uid,
            {
                "email": f"{digits or 'unknown'}@walkin.local",
                "name": body.patient_name,
                "phone": body.patient_phone,
                "role": UserRole.patient.value,
                "is_active": True,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            },
            merge=False,
        )
        patient = store.patient_ensure(uid)

    doctor = store.doctor_get(str(body.doctor_id))
    if not doctor:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Doctor not found"}
        )

    slot_duration = int(doctor.get("avg_consultation_minutes") or 15)
    start_dt = datetime.combine(today, t(9, 0))
    end_dt = start_dt + timedelta(minutes=slot_duration)
    start_time, end_time = start_dt.time(), end_dt.time()

    token = get_next_token(store, body.doctor_id, today)
    fee = float(doctor.get("consultation_fee") or 0)
    aid = store.appointment_create(
        {
            "patient_id": patient["id"],
            "doctor_id": str(body.doctor_id),
            "appointment_date": today.isoformat(),
            "start_time": start_time.strftime("%H:%M"),
            "end_time": end_time.strftime("%H:%M"),
            "status": "pending",
            "type": "in_person",
            "chief_complaint": body.chief_complaint,
            "token_number": token,
            "payment_status": "pending",
            "payment_amount": fee,
        }
    )
    store.queue_ensure(str(body.doctor_id), today)
    store.queue_set(str(body.doctor_id), today, {"last_token_issued": token})

    return {
        "success": True,
        "data": {
            "id": aid,
            "token_number": token,
            "patient_name": body.patient_name,
            "start_time": start_time.strftime("%H:%M"),
            "end_time": end_time.strftime("%H:%M"),
        },
        "message": "Walk-in appointment created",
    }


@router.get("/queue/{doctor_id}", response_model=dict)
def get_walkin_queue(
    doctor_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    today = date.today()
    appointments = store.appointments_for_doctor_date(str(doctor_id), today)
    appointments.sort(key=lambda x: (x.get("token_number") is None, x.get("token_number") or 0))
    queue_state = store.queue_get(str(doctor_id), today)
    result = []
    for appt in appointments:
        patient = store.patient_get(appt["patient_id"])
        pat_user = store.user_get(patient["user_id"]) if patient else None
        result.append(
            {
                "id": appt["id"],
                "token_number": appt.get("token_number"),
                "patient_name": pat_user.get("name") if pat_user else "",
                "status": appt.get("status"),
                "start_time": appt.get("start_time"),
            }
        )
    return {
        "success": True,
        "data": {
            "current_token": queue_state.get("current_token", 0) if queue_state else 0,
            "appointments": result,
        },
        "message": "Queue fetched",
    }
