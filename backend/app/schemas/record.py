from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class PrescriptionCreate(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class MedicalRecordCreate(BaseModel):
    appointment_id: UUID
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    vital_bp: Optional[str] = None
    vital_pulse: Optional[int] = None
    vital_temp: Optional[float] = None
    vital_weight: Optional[float] = None
    prescriptions: Optional[List[PrescriptionCreate]] = []


class MedicalRecordUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    vital_bp: Optional[str] = None
    vital_pulse: Optional[int] = None
    vital_temp: Optional[float] = None
    vital_weight: Optional[float] = None
