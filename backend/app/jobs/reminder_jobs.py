import logging
from datetime import date, datetime, timedelta

from firebase_admin import firestore

from app.auth.firebase import init_firebase
from app.firestore_store import Store
from app.utils.sms import send_sms, REMINDER_24H, REMINDER_1H

logger = logging.getLogger(__name__)


def _store() -> Store:
    init_firebase()
    return Store(firestore.client())


def send_24h_reminders():
    store = _store()
    try:
        tomorrow = date.today() + timedelta(days=1)
        ds = tomorrow.isoformat()
        
        # Only fetch appointments for tomorrow
        for doc in store.db.collection("appointments").where("appointment_date", "==", ds).stream():
            appt = {"id": doc.id, **(doc.to_dict() or {})}
            if appt.get("status") not in ("pending", "confirmed"):
                continue
            patient = store.patient_get(appt["patient_id"])
            pat_user = store.user_get(patient["user_id"]) if patient else None
            doctor = store.doctor_get(appt["doctor_id"])
            doc_user = store.user_get(doctor["user_id"]) if doctor else None
            if pat_user and pat_user.get("phone") and doc_user:
                st = datetime.strptime(appt["start_time"], "%H:%M").time()
                send_sms(
                    pat_user["phone"],
                    REMINDER_24H.format(
                        doctor=doc_user.get("name") or "",
                        time=st.strftime("%I:%M %p"),
                        token=appt.get("token_number", ""),
                    ),
                )
        logger.info("24h reminders sent")
    except Exception as e:
        logger.error(f"24h reminder error: {e}")


def send_1h_reminders():
    store = _store()
    try:
        today = date.today()
        now = datetime.now()
        window_start = now + timedelta(minutes=50)
        window_end = now + timedelta(minutes=70)

        # Only fetch appointments for today
        for doc in store.db.collection("appointments").where("appointment_date", "==", today.isoformat()).stream():
            appt = {"id": doc.id, **(doc.to_dict() or {})}
            if appt.get("status") not in ("pending", "confirmed"):
                continue
            st = datetime.strptime(appt["start_time"], "%H:%M").time()
            appt_time = datetime.combine(today, st)
            if window_start <= appt_time <= window_end:
                patient = store.patient_get(appt["patient_id"])
                pat_user = store.user_get(patient["user_id"]) if patient else None
                doctor = store.doctor_get(appt["doctor_id"])
                doc_user = store.user_get(doctor["user_id"]) if doctor else None
                if pat_user and pat_user.get("phone") and doc_user:
                    send_sms(
                        pat_user["phone"],
                        REMINDER_1H.format(
                            doctor=doc_user.get("name") or "",
                            time=st.strftime("%I:%M %p"),
                        ),
                    )
        logger.info("1h reminders processed")
    except Exception as e:
        logger.error(f"1h reminder error: {e}")


def start_scheduler():
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler()
    scheduler.add_job(send_24h_reminders, "cron", hour=8, minute=0)
    scheduler.add_job(send_1h_reminders, "interval", hours=1)
    scheduler.start()
    logger.info("Scheduler started")
    return scheduler
