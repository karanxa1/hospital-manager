import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    Column,
    Integer,
    Time,
    Date,
    Boolean,
    String,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DoctorAvailability(Base):
    __tablename__ = "doctor_availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)

    doctor = relationship("Doctor", back_populates="availabilities")


class DoctorLeave(Base):
    __tablename__ = "doctor_leave"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    leave_date = Column(Date, nullable=False)
    reason = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="leaves")
