import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Text, Enum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    date_of_birth = Column(Date)
    gender = Column(Enum(Gender))
    blood_group = Column(String)
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    lab_reports = relationship("LabReport", back_populates="patient")
    invoices = relationship("Invoice", back_populates="patient")
