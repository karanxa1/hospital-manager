import enum
from pydantic import BaseModel
from typing import Optional
from datetime import date
from uuid import UUID


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class PatientProfileUpdate(BaseModel):
    date_of_birth: date
    gender: Gender
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    address: Optional[str] = None


class PatientResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    user_phone: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str]
    blood_group: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    address: Optional[str]
    created_at: str

    class Config:
        from_attributes = True
