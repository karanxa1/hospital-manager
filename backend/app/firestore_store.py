"""Firestore persistence — replaces PostgreSQL/SQLAlchemy for this API."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any, Iterator
from uuid import UUID

from google.cloud import firestore as gcf  # type: ignore


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class Store:
    def __init__(self, db: gcf.Client):
        self.db = db

    # --- users ---
    def user_get(self, uid: str) -> dict | None:
        snap = self.db.collection("users").document(uid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def user_set(self, uid: str, data: dict, merge: bool = True) -> None:
        self.db.collection("users").document(uid).set(data, merge=merge)

    def user_by_email(self, email: str) -> dict | None:
        for doc in self.db.collection("users").where("email", "==", email).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def user_by_phone(self, phone: str) -> dict | None:
        for doc in self.db.collection("users").where("phone", "==", phone).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def user_by_google_id(self, gid: str) -> dict | None:
        for doc in self.db.collection("users").where("google_id", "==", gid).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def users_all(self) -> list[dict]:
        return [{"id": d.id, **(d.to_dict() or {})} for d in self.db.collection("users").stream()]

    # --- patients ---
    def patient_get(self, pid: str) -> dict | None:
        snap = self.db.collection("patients").document(pid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def patient_by_user(self, user_id: str) -> dict | None:
        for doc in self.db.collection("patients").where("user_id", "==", user_id).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def patient_ensure(self, user_id: str) -> dict:
        existing = self.patient_by_user(user_id)
        if existing:
            return existing
        pid = str(uuid.uuid4())
        data = {"user_id": user_id, "created_at": _now_iso()}
        self.db.collection("patients").document(pid).set(data)
        return {"id": pid, **data}

    def patients_list(self, search: str | None) -> list[dict]:
        out: list[dict] = []
        for doc in self.db.collection("patients").stream():
            row = {"id": doc.id, **(doc.to_dict() or {})}
            u = self.user_get(row.get("user_id", ""))
            if not u or not u.get("is_active", True):
                continue
            if search:
                s = search.lower()
                if s not in (u.get("name") or "").lower() and s not in (u.get("phone") or "" or "").lower():
                    continue
            row["_user"] = u
            out.append(row)
        out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        return out

    def patient_update(self, pid: str, fields: dict) -> None:
        self.db.collection("patients").document(pid).set(fields, merge=True)

    # --- doctors ---
    def doctor_get(self, did: str) -> dict | None:
        snap = self.db.collection("doctors").document(did).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def doctor_by_user(self, user_id: str) -> dict | None:
        for doc in self.db.collection("doctors").where("user_id", "==", user_id).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def doctors_list(self, specialization: str | None = None) -> list[dict]:
        out = []
        for doc in self.db.collection("doctors").stream():
            d = {"id": doc.id, **(doc.to_dict() or {})}
            u = self.user_get(d.get("user_id", ""))
            if not u or not u.get("is_active", True):
                continue
            if specialization and d.get("specialization") != specialization:
                continue
            d["_user"] = u
            out.append(d)
        return out

    def doctor_create(self, data: dict) -> str:
        did = str(uuid.uuid4())
        data = {**data, "created_at": _now_iso()}
        self.db.collection("doctors").document(did).set(data)
        return did

    def doctor_set(self, did: str, data: dict) -> None:
        self.db.collection("doctors").document(did).set(data, merge=True)

    # --- availability / leave ---
    def availability_for_doctor(self, doctor_id: str) -> list[dict]:
        q = self.db.collection("doctor_availability").where("doctor_id", "==", doctor_id).stream()
        rows = [{"id": d.id, **(d.to_dict() or {})} for d in q]
        rows.sort(key=lambda x: (x.get("day_of_week", 0), x.get("start_time", "")))
        return rows

    def availability_replace(self, doctor_id: str, slots: list[dict]) -> None:
        batch = self.db.batch()
        for doc in self.db.collection("doctor_availability").where("doctor_id", "==", doctor_id).stream():
            batch.delete(doc.reference)
        batch.commit()
        for s in slots:
            sid = str(uuid.uuid4())
            self.db.collection("doctor_availability").document(sid).set(
                {"doctor_id": doctor_id, **s}
            )

    def availability_delete_slot(self, doctor_id: str, slot_id: str) -> bool:
        ref = self.db.collection("doctor_availability").document(slot_id)
        snap = ref.get()
        if not snap.exists or snap.to_dict().get("doctor_id") != doctor_id:
            return False
        ref.delete()
        return True

    def leaves_for_doctor(self, doctor_id: str) -> list[dict]:
        q = self.db.collection("doctor_leave").where("doctor_id", "==", doctor_id).stream()
        rows = [{"id": d.id, **(d.to_dict() or {})} for d in q]
        rows.sort(key=lambda x: x.get("leave_date", ""), reverse=True)
        return rows

    def leave_create(self, doctor_id: str, leave_date: str, reason: str | None) -> str:
        lid = str(uuid.uuid4())
        self.db.collection("doctor_leave").document(lid).set(
            {
                "doctor_id": doctor_id,
                "leave_date": leave_date,
                "reason": reason,
                "created_at": _now_iso(),
            }
        )
        return lid

    def leave_find(self, doctor_id: str, leave_date: str) -> dict | None:
        for doc in self.db.collection("doctor_leave").where("doctor_id", "==", doctor_id).stream():
            if (doc.to_dict() or {}).get("leave_date") == leave_date:
                return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def leave_delete(self, doctor_id: str, leave_id: str) -> bool:
        ref = self.db.collection("doctor_leave").document(leave_id)
        snap = ref.get()
        if not snap.exists or snap.to_dict().get("doctor_id") != doctor_id:
            return False
        ref.delete()
        return True

    # --- appointments ---
    def appointments_iter(self) -> Iterator[dict]:
        for doc in self.db.collection("appointments").stream():
            yield {"id": doc.id, **(doc.to_dict() or {})}

    def appointment_get(self, aid: str) -> dict | None:
        snap = self.db.collection("appointments").document(aid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def appointment_create(self, data: dict) -> str:
        aid = str(uuid.uuid4())
        data = {**data, "created_at": _now_iso(), "updated_at": _now_iso()}
        self.db.collection("appointments").document(aid).set(data)
        return aid

    def appointment_update(self, aid: str, fields: dict) -> None:
        fields["updated_at"] = _now_iso()
        self.db.collection("appointments").document(aid).set(fields, merge=True)

    def appointments_for_patient(self, patient_id: str) -> list[dict]:
        rows = []
        for doc in self.db.collection("appointments").where("patient_id", "==", patient_id).stream():
            rows.append({"id": doc.id, **(doc.to_dict() or {})})
        rows.sort(key=lambda x: x.get("appointment_date", ""), reverse=True)
        return rows

    def appointments_for_doctor_date(self, doctor_id: str, d: date) -> list[dict]:
        ds = d.isoformat()
        rows = []
        for doc in self.db.collection("appointments").where("doctor_id", "==", doctor_id).stream():
            row = {"id": doc.id, **(doc.to_dict() or {})}
            if row.get("appointment_date") == ds:
                rows.append(row)
        return rows

    def appointments_filter(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
        doctor_id: str | None = None,
        status: str | None = None,
    ) -> list[dict]:
        rows = list(self.appointments_iter())
        out = []
        for r in rows:
            ad = r.get("appointment_date")
            if date_from and ad < date_from.isoformat():
                continue
            if date_to and ad > date_to.isoformat():
                continue
            if doctor_id and r.get("doctor_id") != str(doctor_id):
                continue
            if status and r.get("status") != status:
                continue
            out.append(r)
        out.sort(key=lambda x: x.get("appointment_date", ""), reverse=True)
        return out

    def max_token(self, doctor_id: str, d: date) -> int:
        m = 0
        for r in self.appointments_for_doctor_date(doctor_id, d):
            t = r.get("token_number") or 0
            if isinstance(t, int) and t > m:
                m = t
        return m

    def slot_overlap(
        self, doctor_id: str, d: date, start: time, end: time, exclude_id: str | None = None
    ) -> bool:
        ds = d.isoformat()
        st, et = start.strftime("%H:%M"), end.strftime("%H:%M")
        active = {"pending", "confirmed"}
        for doc in self.db.collection("appointments").where("doctor_id", "==", doctor_id).stream():
            if doc.id == exclude_id:
                continue
            row = doc.to_dict() or {}
            if row.get("appointment_date") != ds:
                continue
            if row.get("status") not in active:
                continue
            rs, re = row.get("start_time", ""), row.get("end_time", "")
            if rs < et and re > st:
                return True
        return False

    # --- medical records ---
    def record_get(self, rid: str) -> dict | None:
        snap = self.db.collection("medical_records").document(rid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def record_by_appointment(self, appt_id: str) -> dict | None:
        for doc in self.db.collection("medical_records").where("appointment_id", "==", appt_id).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def records_for_patient(self, patient_id: str) -> list[dict]:
        rows = []
        for doc in self.db.collection("medical_records").where("patient_id", "==", patient_id).stream():
            rows.append({"id": doc.id, **(doc.to_dict() or {})})
        rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return rows

    def record_create(self, data: dict, prescriptions: list[dict]) -> str:
        rid = str(uuid.uuid4())
        data = {**data, "created_at": _now_iso()}
        ref = self.db.collection("medical_records").document(rid)
        ref.set(data)
        for p in prescriptions:
            pid = str(uuid.uuid4())
            ref.collection("prescriptions").document(pid).set(p)
        return rid

    def prescriptions_for_record(self, record_id: str) -> list[dict]:
        ref = self.db.collection("medical_records").document(record_id)
        return [
            {"id": d.id, **(d.to_dict() or {})}
            for d in ref.collection("prescriptions").stream()
        ]

    def record_update(self, rid: str, fields: dict) -> None:
        self.db.collection("medical_records").document(rid).set(fields, merge=True)

    def prescriptions_clear(self, record_id: str) -> None:
        ref = self.db.collection("medical_records").document(record_id)
        for d in ref.collection("prescriptions").stream():
            d.reference.delete()

    def prescriptions_add_batch(self, record_id: str, items: list[dict]) -> None:
        ref = self.db.collection("medical_records").document(record_id)
        for p in items:
            ref.collection("prescriptions").document(str(uuid.uuid4())).set(p)

    # --- lab reports ---
    def lab_reports_for_patient(self, patient_id: str) -> list[dict]:
        rows = []
        for doc in self.db.collection("lab_reports").where("patient_id", "==", patient_id).stream():
            rows.append({"id": doc.id, **(doc.to_dict() or {})})
        rows.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
        return rows

    def lab_report_create(self, data: dict) -> str:
        lid = str(uuid.uuid4())
        data = {**data, "uploaded_at": _now_iso()}
        self.db.collection("lab_reports").document(lid).set(data)
        return lid

    # --- invoices ---
    def invoice_get(self, iid: str) -> dict | None:
        snap = self.db.collection("invoices").document(iid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def invoice_by_appointment(self, appt_id: str) -> dict | None:
        for doc in self.db.collection("invoices").where("appointment_id", "==", appt_id).limit(1).stream():
            return {"id": doc.id, **(doc.to_dict() or {})}
        return None

    def invoices_for_patient(self, patient_id: str) -> list[dict]:
        rows = []
        for doc in self.db.collection("invoices").where("patient_id", "==", patient_id).stream():
            rows.append({"id": doc.id, **(doc.to_dict() or {})})
        rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return rows

    def invoices_all(self) -> list[dict]:
        return [{"id": d.id, **(d.to_dict() or {})} for d in self.db.collection("invoices").stream()]

    def next_invoice_number(self) -> str:
        ref = self.db.collection("counters").document("invoice")
        snap = ref.get()
        now = datetime.utcnow()
        prefix = f"INV-{now.strftime('%Y%m')}"
        n = 1
        if snap.exists:
            d = snap.to_dict() or {}
            if d.get("prefix") == prefix:
                n = int(d.get("seq", 0)) + 1
        ref.set({"prefix": prefix, "seq": n})
        return f"{prefix}-{n:04d}"

    def invoice_create(self, data: dict) -> str:
        iid = str(uuid.uuid4())
        data = {**data, "created_at": _now_iso()}
        self.db.collection("invoices").document(iid).set(data)
        return iid

    def invoice_update(self, iid: str, fields: dict) -> None:
        self.db.collection("invoices").document(iid).set(fields, merge=True)

    # --- token queue ---
    def queue_doc_id(self, doctor_id: str, d: date) -> str:
        return f"{doctor_id}_{d.isoformat()}"

    def queue_get(self, doctor_id: str, d: date) -> dict | None:
        qid = self.queue_doc_id(doctor_id, d)
        snap = self.db.collection("token_queue").document(qid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def queue_ensure(self, doctor_id: str, d: date) -> dict:
        existing = self.queue_get(doctor_id, d)
        if existing:
            return existing
        qid = self.queue_doc_id(doctor_id, d)
        data = {
            "doctor_id": doctor_id,
            "queue_date": d.isoformat(),
            "current_token": 0,
            "last_token_issued": 0,
            "is_active": True,
            "updated_at": _now_iso(),
        }
        self.db.collection("token_queue").document(qid).set(data)
        return {"id": qid, **data}

    def queue_set(self, doctor_id: str, d: date, fields: dict) -> None:
        qid = self.queue_doc_id(doctor_id, d)
        fields["updated_at"] = _now_iso()
        self.db.collection("token_queue").document(qid).set(fields, merge=True)

    # --- walk-in: patient by phone join ---
    def patient_by_phone_user(self, phone: str) -> dict | None:
        u = self.user_by_phone(phone)
        if not u:
            return None
        return self.patient_by_user(u["id"])

    # --- hospitals ---
    def hospitals_list(self) -> list[dict]:
        out = []
        for doc in self.db.collection("hospitals").stream():
            out.append({"id": doc.id, **(doc.to_dict() or {})})
        return out

    def hospital_get(self, hid: str) -> dict | None:
        snap = self.db.collection("hospitals").document(hid).get()
        if not snap.exists:
            return None
        return {"id": snap.id, **(snap.to_dict() or {})}

    def hospital_create(self, data: dict) -> str:
        hid = str(uuid.uuid4())
        self.db.collection("hospitals").document(hid).set(data)
        return hid

    def hospital_set(self, hid: str, data: dict) -> None:
        self.db.collection("hospitals").document(hid).set(data, merge=True)

