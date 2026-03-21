from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.auth.dependencies import (
    get_current_user,
    require_admin_or_doctor,
    require_patient,
)
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store
from app.schemas.patient import PatientProfileUpdate
from app.utils.file_upload import save_lab_report

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])


def _patient_json(p: dict, store: Store) -> dict:
    user = store.user_get(p.get("user_id", ""))
    dob = p.get("date_of_birth")
    if hasattr(dob, "isoformat"):
        dob = dob.isoformat()
    return {
        "id": p["id"],
        "user_id": p.get("user_id"),
        "user_name": user.get("name") if user else "",
        "user_email": user.get("email") if user else "",
        "user_phone": user.get("phone") if user else None,
        "date_of_birth": dob[:10] if isinstance(dob, str) and len(dob) >= 10 else dob,
        "gender": p.get("gender"),
        "blood_group": p.get("blood_group"),
        "allergies": p.get("allergies"),
        "chronic_conditions": p.get("chronic_conditions"),
        "emergency_contact_name": p.get("emergency_contact_name"),
        "emergency_contact_phone": p.get("emergency_contact_phone"),
        "address": p.get("address"),
        "created_at": p.get("created_at") or "",
    }


def _serialize_patient_records(store: Store, patient_id: str) -> list:
    result = []
    for rec in store.records_for_patient(patient_id):
        doctor = store.doctor_get(rec["doctor_id"])
        doc_user = store.user_get(doctor["user_id"]) if doctor else None
        prescriptions = store.prescriptions_for_record(rec["id"])
        result.append(
            {
                "id": rec["id"],
                "doctor_name": f"Dr. {doc_user['name']}" if doc_user and doc_user.get("name") else "",
                "subjective": rec.get("subjective"),
                "objective": rec.get("objective"),
                "assessment": rec.get("assessment"),
                "plan": rec.get("plan"),
                "vital_bp": rec.get("vital_bp"),
                "vital_pulse": rec.get("vital_pulse"),
                "vital_temp": float(rec["vital_temp"]) if rec.get("vital_temp") is not None else None,
                "vital_weight": float(rec["vital_weight"]) if rec.get("vital_weight") is not None else None,
                "prescriptions": [
                    {
                        "drug_name": x.get("drug_name"),
                        "dosage": x.get("dosage"),
                        "frequency": x.get("frequency"),
                        "duration": x.get("duration"),
                        "instructions": x.get("instructions"),
                    }
                    for x in prescriptions
                ],
                "created_at": rec.get("created_at") or "",
            }
        )
    return result


def _profile_fields(body: PatientProfileUpdate) -> dict:
    d = body.model_dump()
    d["date_of_birth"] = body.date_of_birth.isoformat()
    d["gender"] = body.gender.value
    return d


@router.get("", response_model=dict)
def list_patients(
    search: Optional[str] = Query(None),
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    rows = store.patients_list(search)
    result = []
    for p in rows:
        u = p.get("_user") or {}
        dob = p.get("date_of_birth")
        if isinstance(dob, str) and len(dob) >= 10:
            dob_out = dob[:10]
        else:
            dob_out = dob.isoformat() if hasattr(dob, "isoformat") else dob
        result.append(
            {
                "id": p["id"],
                "user_id": p.get("user_id"),
                "user_name": u.get("name") or "",
                "user_email": u.get("email") or "",
                "user_phone": u.get("phone"),
                "date_of_birth": dob_out,
                "gender": p.get("gender"),
                "blood_group": p.get("blood_group"),
                "created_at": p.get("created_at") or "",
            }
        )
    return {"success": True, "data": result, "message": "Patients fetched"}


@router.get("/me", response_model=dict)
def get_my_patient(
    store: Store = Depends(get_store),
    current_user: User = Depends(require_patient),
):
    p = store.patient_ensure(str(current_user.id))
    return {"success": True, "data": _patient_json(p, store), "message": "Patient fetched"}


@router.get("/me/records", response_model=dict)
def get_my_patient_records(
    store: Store = Depends(get_store),
    current_user: User = Depends(require_patient),
):
    p = store.patient_ensure(str(current_user.id))
    return {
        "success": True,
        "data": _serialize_patient_records(store, p["id"]),
        "message": "Records fetched",
    }


@router.get("/me/appointments", response_model=dict)
def get_my_patient_appointments(
    store: Store = Depends(get_store),
    current_user: User = Depends(require_patient),
):
    p = store.patient_ensure(str(current_user.id))
    return get_patient_appointments(UUID(p["id"]), store, current_user)


@router.get("/me/lab-reports", response_model=dict)
def get_my_lab_reports(
    store: Store = Depends(get_store),
    current_user: User = Depends(require_patient),
):
    p = store.patient_ensure(str(current_user.id))
    return list_lab_reports(UUID(p["id"]), store, current_user)


@router.get("/{patient_id}", response_model=dict)
def get_patient(
    patient_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    p = store.patient_get(str(patient_id))
    if not p:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Patient not found"}
        )
    if current_user.role == UserRole.patient and str(p.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403, detail={"success": False, "message": "Access denied"}
        )
    return {"success": True, "data": _patient_json(p, store), "message": "Patient fetched"}


@router.post("/profile", response_model=dict)
def upsert_patient_profile(
    body: PatientProfileUpdate,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_by_user(str(current_user.id))
    if not patient:
        patient = store.patient_ensure(str(current_user.id))
    store.patient_update(patient["id"], _profile_fields(body))
    return {"success": True, "data": {"id": patient["id"]}, "message": "Profile saved"}


@router.put("/{patient_id}", response_model=dict)
def update_patient(
    patient_id: UUID,
    body: PatientProfileUpdate,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    p = store.patient_get(str(patient_id))
    if not p:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Patient not found"}
        )
    if current_user.role == UserRole.patient and str(p.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={"success": False, "message": "You can only update your own profile"},
        )
    store.patient_update(p["id"], _profile_fields(body))
    return {"success": True, "data": {"id": p["id"]}, "message": "Patient updated"}


@router.post("/{patient_id}/lab-reports", response_model=dict)
async def upload_lab_report(
    patient_id: UUID,
    file: UploadFile = File(...),
    report_name: str = "",
    store: Store = Depends(get_store),
    current_user: User = Depends(require_admin_or_doctor),
):
    file_url = await save_lab_report(file)
    lid = store.lab_report_create(
        {
            "patient_id": str(patient_id),
            "report_name": report_name or file.filename or "report",
            "file_url": file_url,
            "uploaded_by": str(current_user.id),
        }
    )
    snap = store.lab_reports_for_patient(str(patient_id))
    row = next((x for x in snap if x["id"] == lid), snap[0] if snap else {})
    return {
        "success": True,
        "data": {
            "id": lid,
            "report_name": row.get("report_name"),
            "file_url": row.get("file_url"),
            "uploaded_at": row.get("uploaded_at"),
        },
        "message": "Lab report uploaded",
    }


@router.get("/{patient_id}/lab-reports", response_model=dict)
def list_lab_reports(
    patient_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_get(str(patient_id))
    if not patient:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Patient not found"}
        )
    if current_user.role == UserRole.patient and str(patient.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403, detail={"success": False, "message": "Access denied"}
        )
    reports = store.lab_reports_for_patient(str(patient_id))
    result = [
        {
            "id": r["id"],
            "report_name": r.get("report_name"),
            "file_url": r.get("file_url"),
            "uploaded_at": r.get("uploaded_at") or "",
        }
        for r in reports
    ]
    return {"success": True, "data": result, "message": "Lab reports fetched"}


@router.get("/{patient_id}/appointments", response_model=dict)
def get_patient_appointments(
    patient_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_get(str(patient_id))
    if not patient:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Patient not found"}
        )
    if current_user.role == UserRole.patient and str(patient.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403, detail={"success": False, "message": "Access denied"}
        )
    appointments = store.appointments_for_patient(str(patient_id))
    result = []
    for appt in appointments:
        doctor = store.doctor_get(appt["doctor_id"])
        doc_user = store.user_get(doctor["user_id"]) if doctor else None
        result.append(
            {
                "id": appt["id"],
                "doctor_name": f"Dr. {doc_user['name']}" if doc_user and doc_user.get("name") else "",
                "doctor_specialization": doctor.get("specialization") if doctor else "",
                "appointment_date": appt.get("appointment_date"),
                "start_time": appt.get("start_time"),
                "end_time": appt.get("end_time"),
                "status": appt.get("status"),
                "token_number": appt.get("token_number"),
                "chief_complaint": appt.get("chief_complaint"),
            }
        )
    return {"success": True, "data": result, "message": "Appointments fetched"}


@router.get("/{patient_id}/records", response_model=dict)
def get_patient_records(
    patient_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    patient = store.patient_get(str(patient_id))
    if not patient:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Patient not found"}
        )
    if current_user.role == UserRole.patient and str(patient.get("user_id")) != str(current_user.id):
        raise HTTPException(
            status_code=403, detail={"success": False, "message": "Access denied"}
        )
    return {
        "success": True,
        "data": _serialize_patient_records(store, str(patient_id)),
        "message": "Records fetched",
    }
