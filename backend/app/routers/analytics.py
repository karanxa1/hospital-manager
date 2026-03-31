from collections import defaultdict
from datetime import date, datetime, timedelta
import time
from typing import Any
import concurrent.futures

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_admin
from app.domain_types import User
from app.fs_client import get_store
from app.firestore_store import Store
from app.cache import get_cache

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _parse_day(ts: str | None) -> date | None:
    if not ts:
        return None
    s = str(ts).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        return None


def _build_dashboard_summary(store: Store) -> dict:
    import time

    t_start = time.time()

    today = date.today()
    month_start = today.replace(day=1)

    month_start_str = month_start.isoformat()
    today_str = today.isoformat()
    thirty_days_ago = today - timedelta(days=30)
    thirty_days_str = thirty_days_ago.isoformat()

    # We discovered ThreadPoolExecutor with Firestore stream() can hang or take >25s due to grpc thread deadlocks or connection saturation on Firebase free tier. Let's do them sequentially.
    total_patients = store.db.collection("patients").count().get()[0][0].value

    total_doctors = store.db.collection("doctors").count().get()[0][0].value

    total_hospitals = store.db.collection("hospitals").count().get()[0][0].value

    appts_today = (
        store.db.collection("appointments")
        .where("appointment_date", "==", today_str)
        .count()
        .get()[0][0]
        .value
    )

    thirty_days_appts = list(
        store.db.collection("appointments")
        .where("appointment_date", ">=", thirty_days_str)
        .stream()
    )

    thirty_days_inv = list(
        store.db.collection("invoices")
        .where("created_at", ">=", thirty_days_str)
        .stream()
    )

    # Split month vs 30d

    month_appts = [
        doc
        for doc in thirty_days_appts
        if doc.to_dict().get("appointment_date", "") >= month_start_str
    ]
    month_invoices = [
        inv
        for inv in thirty_days_inv
        if inv.to_dict().get("created_at", "") >= month_start_str
    ]

    # Get recent pending appointments directly from today's/month's stream (it's already in memory!)
    recent_appts = []

    for doc in sorted(
        month_appts, key=lambda x: x.to_dict().get("created_at", ""), reverse=True
    ):
        d = doc.to_dict()
        if d.get("status") == "pending":
            recent_appts.append({"id": doc.id, **d})
            if len(recent_appts) >= 10:
                break

    all_docs = store.doctors_list(None)
    doc_map = {str(d["id"]): d for d in all_docs}

    for appty in recent_appts:
        # Get doctor name using in-memory map
        doc = doc_map.get(str(appty.get("doctor_id")))
        doc_u = doc.get("_user") if doc else None
        appty["doctor_name"] = (
            f"Dr. {doc_u['name']}" if (doc_u and "name" in doc_u) else ""
        )
        appty["payment_amount"] = float(appty.get("payment_amount") or 0)

    appts_month = len(month_appts)
    no_shows = 0
    doctor_counts: dict[str, int] = defaultdict(int)
    for doc in month_appts:
        d = doc.to_dict()
        if d.get("status") == "no_show":
            no_shows += 1
        did = d.get("doctor_id")
        if did:
            doctor_counts[str(did)] += 1

    revenue_month = sum(
        float(inv.to_dict().get("total_amount") or 0)
        for inv in month_invoices
        if inv.to_dict().get("status") == "paid"
    )
    no_show_rate = f"{(no_shows / appts_month * 100):.1f}%" if appts_month > 0 else "0%"

    top_ids = sorted(
        doctor_counts.keys(), key=lambda k: doctor_counts[k], reverse=True
    )[:5]
    top_doctors = []

    # Batch get doctors to avoid N+1 over all doctors
    if top_ids:
        docs = [d for d in all_docs if d["id"] in top_ids]
        top_map = {d["id"]: d for d in docs}
        for did in top_ids:
            doctor = top_map.get(did)
            doc_user = doctor.get("_user") if doctor else None
            top_doctors.append(
                {
                    "doctor_name": f"Dr. {doc_user['name']}"
                    if doc_user and doc_user.get("name")
                    else "",
                    "appointment_count": doctor_counts[did],
                }
            )

    # Process Appt Trend (last 30d)
    appt_counts = defaultdict(int)
    for doc in thirty_days_appts:
        ad = doc.to_dict().get("appointment_date")
        if ad:
            appt_counts[ad] += 1
    appt_trend = [
        {"date": k, "count": appt_counts[k]} for k in sorted(appt_counts.keys())
    ][-7:]  # Just return 7 days for the chart, frontend can filter

    # Process Revenue Trend (last 30d)
    rev_sums = defaultdict(float)
    for doc in thirty_days_inv:
        d = doc.to_dict()
        if d.get("status") == "paid":
            cd = _parse_day(d.get("created_at"))
            if cd and cd >= thirty_days_ago:
                rev_sums[cd.isoformat()] += float(d.get("total_amount") or 0)
    rev_trend = [{"date": k, "amount": rev_sums[k]} for k in sorted(rev_sums.keys())]

    # Process Doctor Utilization (from month appts)
    doc_booked = defaultdict(int)
    for doc in month_appts:
        d = doc.to_dict()
        if d.get("status") in {"pending", "confirmed", "completed"}:
            doc_booked[str(d.get("doctor_id"))] += 1

    days_in_month = (today - month_start).days + 1
    utilization = []

    # Pre-fetch all availability to avoid N+1 queries

    all_avail = list(store.db.collection("doctor_availability").stream())
    avail_by_doc = defaultdict(list)
    for doc_a in all_avail:
        ad = doc_a.to_dict()
        if ad.get("is_active", True):
            avail_by_doc[str(ad.get("doctor_id"))].append(ad)

    for doc in all_docs:
        did = str(doc["id"])
        doc_user = doc.get("_user") or {}
        booked = doc_booked.get(did, 0)
        slots_per_day = len(avail_by_doc.get(did, []))
        # If no slots defined, assume a default capacity so math works, or use 1
        available = max(1, slots_per_day) * days_in_month
        utilization.append(
            {
                "doctor_name": f"Dr. {doc_user.get('name')}" if doc_user else "",
                "booked_slots": booked,
                "available_slots": available,
                "utilization": round(booked / available * 100, 1)
                if available > 0
                else 0,
            }
        )

    data = {
        "overview": {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_hospitals": total_hospitals,
            "appointments_today": appts_today,
            "appointments_this_month": appts_month,
            "revenue_this_month": revenue_month,
            "no_show_rate": no_show_rate,
            "top_doctors": top_doctors,
        },
        "charts": {
            "appointmentsTrend": appt_trend,
            "revenueTrend": rev_trend,
            "doctorUtilization": utilization,
        },
        "recentAppointments": recent_appts,
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
    }
    return data


@router.get("/dashboard-summary", response_model=dict)
def get_dashboard_summary(
    force_refresh: bool = Query(False),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    """
    Returns pre-aggregated data for the admin dashboard.
    Massively reduces Firestore reads by fetching exactly 1 document caching it.

    Cache hierarchy:
    1. Global in-memory cache (fastest, shared across requests)
    2. Firestore SDR document (single read, persists across restarts)
    3. Full aggregation (slowest, only on force_refresh or cold start)
    """
    cache = get_cache()

    if not force_refresh:
        # Level 1: Check global memory cache
        cached = cache.get("dashboard", "summary")
        if cached:
            return {
                "success": True,
                "data": cached,
                "source": "memory-cache",
                "message": "Dashboard fetched from memory cache",
            }

        # Level 2: Check Firestore SDR document
        doc_ref = store.db.collection("dashboard").document("summary").get()
        if doc_ref.exists:
            data = doc_ref.to_dict()
            # Store in memory cache for future requests
            cache.set("dashboard", data, "summary", ttl=600)
            return {
                "success": True,
                "data": data,
                "source": "firestore-1-read",
                "message": "Dashboard fetched from SDR Firestore",
            }

    # Level 3: Generate data (fallback or force_refresh)
    start = time.time()
    data = _build_dashboard_summary(store)

    # Save SDR to Firestore for future cold starts
    store.db.collection("dashboard").document("summary").set(data)
    # Store in memory cache
    cache.set("dashboard", data, "summary", ttl=600)

    return {
        "success": True,
        "data": data,
        "source": "aggregation-engine",
        "message": f"Generated new summary in {time.time() - start:.2f}s",
    }


# To support backward compatibility while making sure it's fast
@router.get("/overview", response_model=dict)
def overview(
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    sum_data = get_dashboard_summary(False, store, _current_user)
    return {
        "success": True,
        "data": sum_data["data"].get("overview", {}),
        "message": "Overview fetched from summary",
    }


@router.get("/appointments", response_model=dict)
def appointment_trend(
    range: str = Query("30d"),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    sum_data = get_dashboard_summary(False, store, _current_user)
    return {
        "success": True,
        "data": sum_data["data"].get("charts", {}).get("appointmentsTrend", []),
        "message": "Trend fetched from summary",
    }


@router.get("/revenue", response_model=dict)
def revenue_trend(
    range: str = Query("30d"),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    sum_data = get_dashboard_summary(False, store, _current_user)
    return {
        "success": True,
        "data": sum_data["data"].get("charts", {}).get("revenueTrend", []),
        "message": "Revenue fetched from summary",
    }


@router.get("/doctor-utilization", response_model=dict)
def doctor_utilization(
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin),
):
    sum_data = get_dashboard_summary(False, store, _current_user)
    return {
        "success": True,
        "data": sum_data["data"].get("charts", {}).get("doctorUtilization", []),
        "message": "Utilization fetched from summary",
    }
