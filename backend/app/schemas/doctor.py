from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, time, date
from uuid import UUID


class DoctorCreate(BaseModel):
    user_id: UUID
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str] = None
    consultation_fee: float
    avg_consultation_minutes: int = 15


class DoctorUpdate(BaseModel):
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    avg_consultation_minutes: Optional[int] = None


class DoctorResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    user_email: str
    user_profile_picture: Optional[str]
    specialization: str
    qualification: str
    experience_years: int
    bio: Optional[str]
    consultation_fee: float
    avg_consultation_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True


class AvailabilitySlotCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time


class AvailabilitySlotResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool

    class Config:
        from_attributes = True


class LeaveCreate(BaseModel):
    leave_date: date
    reason: Optional[str] = None


class LeaveResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    leave_date: date
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TimeSlot(BaseModel):
    start_time: time
    end_time: time
