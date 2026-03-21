from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_admin
from app.domain_types import User
from app.fs_client import get_store
from app.firestore_store import Store

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _parse_day(ts: str | None) -> date | None:
    if not ts:
        return None
    s = str(ts).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        return None


@router.get("/overview", response_model=dict)
def overview(
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    today = date.today()
    month_start = today.replace(day=1)

    patients = list(store.db.collection("patients").stream())
    doctors = list(store.db.collection("doctors").stream())
    total_patients = len(patients)
    total_doctors = len(doctors)

    appts_today = 0
    appts_month = 0
    appts_month_for_rate = []
    no_shows = 0
    doctor_counts: dict[str, int] = defaultdict(int)

    for doc in store.appointments_iter():
        ad = doc.get("appointment_date")
        if not ad:
            continue
        try:
            ad_d = date.fromisoformat(ad[:10])
        except Exception:
            continue
        if ad == today.isoformat():
            appts_today += 1
        if month_start <= ad_d <= today:
            appts_month += 1
            appts_month_for_rate.append(doc)
            if doc.get("status") == "no_show":
                no_shows += 1
            did = doc.get("doctor_id")
            if did:
                doctor_counts[str(did)] += 1

    revenue_month = 0.0
    for inv in store.invoices_all():
        if inv.get("status") != "paid":
            continue
        cd = _parse_day(inv.get("created_at"))
        if cd and cd >= month_start:
            revenue_month += float(inv.get("total_amount") or 0)

    total_appts = len([x for x in appts_month_for_rate])
    no_show_rate = f"{(no_shows / total_appts * 100):.1f}%" if total_appts > 0 else "0%"

    top_ids = sorted(doctor_counts.keys(), key=lambda k: doctor_counts[k], reverse=True)[:5]
    top_doctors = []
    for did in top_ids:
        doctor = store.doctor_get(did)
        doc_user = store.user_get(doctor["user_id"]) if doctor else None
        top_doctors.append(
            {
                "doctor_name": f"Dr. {doc_user['name']}" if doc_user and doc_user.get("name") else "",
                "appointment_count": doctor_counts[did],
            }
        )

    return {
        "success": True,
        "data": {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "appointments_today": appts_today,
            "appointments_this_month": appts_month,
            "revenue_this_month": revenue_month,
            "no_show_rate": no_show_rate,
            "top_doctors": top_doctors,
        },
        "message": "Overview fetched",
    }


@router.get("/appointments", response_model=dict)
def appointment_trend(
    range: str = Query("30d"),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    days = {"7d": 7, "30d": 30, "90d": 90}.get(range, 30)
    start_date = date.today() - timedelta(days=days)
    counts: dict[str, int] = defaultdict(int)
    for doc in store.appointments_iter():
        ad = doc.get("appointment_date")
        if not ad:
            continue
        try:
            ad_d = date.fromisoformat(ad[:10])
        except Exception:
            continue
        if ad_d >= start_date:
            counts[ad] += 1
    data = [{"date": k, "count": counts[k]} for k in sorted(counts.keys())]
    return {"success": True, "data": data, "message": "Appointment trend fetched"}


@router.get("/revenue", response_model=dict)
def revenue_trend(
    range: str = Query("30d"),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    days = {"7d": 7, "30d": 30, "90d": 30}.get(range, 30)
    start_date = date.today() - timedelta(days=days)
    sums: dict[str, float] = defaultdict(float)
    for inv in store.invoices_all():
        if inv.get("status") != "paid":
            continue
        cd = _parse_day(inv.get("created_at"))
        if not cd or cd < start_date:
            continue
        key = cd.isoformat()
        sums[key] += float(inv.get("total_amount") or 0)
    data = [{"date": k, "amount": sums[k]} for k in sorted(sums.keys())]
    return {"success": True, "data": data, "message": "Revenue trend fetched"}


@router.get("/doctor-utilization", response_model=dict)
def doctor_utilization(
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    today = date.today()
    month_start = today.replace(day=1)
    days_in_month = (today - month_start).days + 1
    active_statuses = {"pending", "confirmed", "completed"}
    result = []
    for doc in store.doctors_list(None):
        did = doc["id"]
        doc_user = doc.get("_user") or store.user_get(doc.get("user_id", ""))
        booked = 0
        for a in store.appointments_iter():
            if str(a.get("doctor_id")) != str(did):
                continue
            ad = a.get("appointment_date")
            if not ad:
                continue
            try:
                ad_d = date.fromisoformat(ad[:10])
            except Exception:
                continue
            if month_start <= ad_d <= today and a.get("status") in active_statuses:
                booked += 1
        slots_per_day = len(
            [x for x in store.availability_for_doctor(did) if x.get("is_active", True)]
        )
        slot_duration = int(doc.get("avg_consultation_minutes") or 15)
        available = max(1, slots_per_day) * days_in_month
        result.append(
            {
                "doctor_name": f"Dr. {doc_user.get('name')}" if doc_user else "",
                "booked_slots": booked,
                "available_slots": available,
                "utilization": round(booked / available * 100, 1) if available > 0 else 0,
            }
        )
    return {"success": True, "data": result, "message": "Doctor utilization fetched"}
