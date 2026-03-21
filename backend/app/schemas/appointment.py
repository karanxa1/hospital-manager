import enum
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time
from uuid import UUID


class AppointmentType(str, enum.Enum):
    in_person = "in_person"
    online = "online"


class AppointmentCreate(BaseModel):
    doctor_id: UUID
    appointment_date: date
    start_time: str
    end_time: str
    type: AppointmentType = AppointmentType.in_person
    chief_complaint: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    doctor_name: str
    doctor_specialization: str
    appointment_date: date
    start_time: str
    end_time: str
    status: str
    type: str
    chief_complaint: Optional[str]
    token_number: Optional[int]
    payment_status: str
    payment_amount: Optional[float]
    created_at: str

    class Config:
        from_attributes = True


class WalkInCreate(BaseModel):
    doctor_id: UUID
    patient_name: str
    patient_phone: str
    chief_complaint: Optional[str] = None
