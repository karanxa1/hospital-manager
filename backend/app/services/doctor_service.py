from datetime import date, datetime, time, timedelta
from uuid import UUID

from app.firestore_store import Store


def get_available_slots(store: Store, doctor_id: UUID, target_date: date) -> list:
    doctor = store.doctor_get(str(doctor_id))
    if not doctor:
        return []

    day_of_week = target_date.weekday()
    availabilities = [
        a
        for a in store.availability_for_doctor(str(doctor_id))
        if a.get("day_of_week") == day_of_week and a.get("is_active", True)
    ]

    if not availabilities:
        return []

    leave = store.leave_find(str(doctor_id), target_date.isoformat())
    if leave:
        return []

    existing = [
        r
        for r in store.appointments_for_doctor_date(str(doctor_id), target_date)
        if r.get("status") in ("pending", "confirmed")
    ]

    booked_intervals = set()
    for appt in existing:
        st = datetime.strptime(appt["start_time"], "%H:%M").time()
        et = datetime.strptime(appt["end_time"], "%H:%M").time()
        current = datetime.combine(target_date, st)
        end = datetime.combine(target_date, et)
        while current < end:
            booked_intervals.add(current.time())
            current += timedelta(minutes=1)

    slot_minutes = int(doctor.get("avg_consultation_minutes") or 15)
    slot_duration = timedelta(minutes=slot_minutes)
    free_slots = []

    for avail in availabilities:
        current_dt = datetime.combine(
            target_date, datetime.strptime(avail["start_time"], "%H:%M").time()
        )
        end_dt = datetime.combine(
            target_date, datetime.strptime(avail["end_time"], "%H:%M").time()
        )

        while current_dt + slot_duration <= end_dt:
            slot_start = current_dt.time()
            slot_end = (current_dt + slot_duration).time()

            is_booked = False
            check = current_dt
            while check < current_dt + slot_duration:
                if check.time() in booked_intervals:
                    is_booked = True
                    break
                check += timedelta(minutes=1)

            if not is_booked:
                free_slots.append(
                    {
                        "start_time": slot_start.strftime("%H:%M"),
                        "end_time": slot_end.strftime("%H:%M"),
                    }
                )

            current_dt += slot_duration

    return free_slots
