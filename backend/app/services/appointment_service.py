from datetime import date, time
from uuid import UUID

from app.firestore_store import Store
from app.utils.sms import send_sms, BOOKING_CONFIRMED


def get_next_token(store: Store, doctor_id: UUID, target_date: date) -> int:
    return store.max_token(str(doctor_id), target_date) + 1


def check_slot_available(
    store: Store, doctor_id: UUID, target_date: date, start_time: time, end_time: time
) -> bool:
    return not store.slot_overlap(str(doctor_id), target_date, start_time, end_time)


def book_appointment(
    store: Store,
    patient_id: UUID,
    doctor_id: UUID,
    target_date: date,
    start_time: time,
    end_time: time,
    appt_type: str,
    chief_complaint: str,
) -> dict:
    if not check_slot_available(store, doctor_id, target_date, start_time, end_time):
        raise ValueError("This slot is no longer available")

    token = get_next_token(store, doctor_id, target_date)
    doctor = store.doctor_get(str(doctor_id))
    patient = store.patient_get(str(patient_id))
    patient_user = store.user_get(patient["user_id"]) if patient else None
    doctor_user = store.user_get(doctor["user_id"]) if doctor else None

    fee = float(doctor.get("consultation_fee") or 0) if doctor else 0
    aid = store.appointment_create(
        {
            "patient_id": str(patient_id),
            "doctor_id": str(doctor_id),
            "appointment_date": target_date.isoformat(),
            "start_time": start_time.strftime("%H:%M"),
            "end_time": end_time.strftime("%H:%M"),
            "status": "pending",
            "type": appt_type,
            "chief_complaint": chief_complaint,
            "token_number": token,
            "payment_status": "pending",
            "payment_amount": fee,
        }
    )
    appt = store.appointment_get(aid)

    if patient_user and patient_user.get("phone") and doctor_user:
        send_sms(
            patient_user["phone"],
            BOOKING_CONFIRMED.format(
                name=patient_user.get("name") or "",
                doctor=doctor_user.get("name") or "",
                date=target_date.strftime("%d-%m-%Y"),
                time=start_time.strftime("%I:%M %p"),
                token=token,
            ),
        )

    return appt
