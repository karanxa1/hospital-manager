import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=False
    )
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    subjective = Column(Text)
    objective = Column(Text)
    assessment = Column(Text)
    plan = Column(Text)
    vital_bp = Column(String)
    vital_pulse = Column(Integer)
    vital_temp = Column(Numeric(5, 2))
    vital_weight = Column(Numeric(5, 2))
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="medical_record")
    patient = relationship("Patient", back_populates="medical_records")
    prescriptions = relationship("Prescription", back_populates="medical_record")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medical_record_id = Column(
        UUID(as_uuid=True), ForeignKey("medical_records.id"), nullable=False
    )
    drug_name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    duration = Column(String, nullable=False)
    instructions = Column(String)

    medical_record = relationship("MedicalRecord", back_populates="prescriptions")


class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"))
    report_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="lab_reports")
