from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user, require_doctor
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store
from app.schemas.record import MedicalRecordCreate, MedicalRecordUpdate
from app.utils.pdf_service import generate_prescription_pdf

router = APIRouter(prefix="/api/v1/records", tags=["records"])


def _parse_created(ts: str) -> datetime:
    if not ts:
        return datetime.min.replace(tzinfo=timezone.utc)
    s = str(ts).replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)


@router.post("", response_model=dict)
def create_record(
    body: MedicalRecordCreate,
    store: Store = Depends(get_store),
    current_user: User = Depends(require_doctor),
):
    doctor = store.doctor_by_user(str(current_user.id))
    if not doctor:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Doctor profile not found"},
        )
    appt = store.appointment_get(str(body.appointment_id))
    if not appt:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Appointment not found"},
        )
    if str(appt.get("doctor_id")) != str(doctor["id"]):
        raise HTTPException(
            status_code=403,
            detail={
                "success": False,
                "message": "You can only create records for your own appointments",
            },
        )
    if store.record_by_appointment(str(body.appointment_id)):
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Record already exists"},
        )
    rx = [
        {
            "drug_name": p.drug_name,
            "dosage": p.dosage,
            "frequency": p.frequency,
            "duration": p.duration,
            "instructions": p.instructions,
        }
        for p in (body.prescriptions or [])
    ]
    rid = store.record_create(
        {
            "appointment_id": str(body.appointment_id),
            "patient_id": appt["patient_id"],
            "doctor_id": doctor["id"],
            "subjective": body.subjective,
            "objective": body.objective,
            "assessment": body.assessment,
            "plan": body.plan,
            "vital_bp": body.vital_bp,
            "vital_pulse": body.vital_pulse,
            "vital_temp": body.vital_temp,
            "vital_weight": body.vital_weight,
        },
        rx,
    )
    store.appointment_update(str(body.appointment_id), {"status": "completed"})
    return {"success": True, "data": {"id": rid}, "message": "Record created"}


@router.get("/{record_id}", response_model=dict)
def get_record(
    record_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    record = store.record_get(str(record_id))
    if not record:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Record not found"}
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(record["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    prescriptions = store.prescriptions_for_record(str(record_id))
    return {
        "success": True,
        "data": {
            "id": record["id"],
            "appointment_id": record.get("appointment_id"),
            "patient_id": record.get("patient_id"),
            "doctor_id": record.get("doctor_id"),
            "subjective": record.get("subjective"),
            "objective": record.get("objective"),
            "assessment": record.get("assessment"),
            "plan": record.get("plan"),
            "vital_bp": record.get("vital_bp"),
            "vital_pulse": record.get("vital_pulse"),
            "vital_temp": float(record["vital_temp"]) if record.get("vital_temp") is not None else None,
            "vital_weight": float(record["vital_weight"]) if record.get("vital_weight") is not None else None,
            "prescriptions": [
                {
                    "id": p["id"],
                    "drug_name": p.get("drug_name"),
                    "dosage": p.get("dosage"),
                    "frequency": p.get("frequency"),
                    "duration": p.get("duration"),
                    "instructions": p.get("instructions"),
                }
                for p in prescriptions
            ],
            "created_at": record.get("created_at") or "",
        },
        "message": "Record fetched",
    }


@router.put("/{record_id}", response_model=dict)
def update_record(
    record_id: UUID,
    body: MedicalRecordUpdate,
    store: Store = Depends(get_store),
    current_user: User = Depends(require_doctor),
):
    record = store.record_get(str(record_id))
    if not record:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Record not found"}
        )
    doctor = store.doctor_by_user(str(current_user.id))
    if not doctor or str(record.get("doctor_id")) != str(doctor["id"]):
        raise HTTPException(
            status_code=403,
            detail={"success": False, "message": "You can only update your own records"},
        )
    created = _parse_created(record.get("created_at") or "")
    if (datetime.now(timezone.utc) - created).total_seconds() > 86400:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "message": "Can only update within 24 hours"},
        )
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if patch:
        store.record_update(str(record_id), patch)
    return {"success": True, "data": {"id": str(record_id)}, "message": "Record updated"}


@router.get("/{record_id}/prescription/pdf")
def get_prescription_pdf(
    record_id: UUID,
    store: Store = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    record = store.record_get(str(record_id))
    if not record:
        raise HTTPException(
            status_code=404, detail={"success": False, "message": "Record not found"}
        )
    if current_user.role == UserRole.patient:
        patient = store.patient_get(record["patient_id"])
        if not patient or str(patient.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=403, detail={"success": False, "message": "Access denied"}
            )
    try:
        pdf_buffer = generate_prescription_pdf(store, record_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"success": False, "message": str(e)})
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=prescription_{record_id}.pdf"},
    )


@router.get("/patient/{patient_id}", response_model=dict)
def get_patient_history(
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
    result = []
    for rec in store.records_for_patient(str(patient_id)):
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
                        "drug_name": p.get("drug_name"),
                        "dosage": p.get("dosage"),
                        "frequency": p.get("frequency"),
                        "duration": p.get("duration"),
                        "instructions": p.get("instructions"),
                    }
                    for p in prescriptions
                ],
                "created_at": rec.get("created_at") or "",
            }
        )
    return {"success": True, "data": result, "message": "Records fetched"}
