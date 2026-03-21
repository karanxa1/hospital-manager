import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    Text,
    Date,
    Time,
    Enum,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class AppointmentType(str, enum.Enum):
    in_person = "in_person"
    online = "online"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    waived = "waived"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending)
    type = Column(Enum(AppointmentType), default=AppointmentType.in_person)
    chief_complaint = Column(Text)
    token_number = Column(Integer)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    payment_amount = Column(Numeric(10, 2))
    cashfree_order_id = Column(String)
    cashfree_payment_id = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    medical_record = relationship(
        "MedicalRecord", back_populates="appointment", uselist=False
    )
    invoice = relationship("Invoice", back_populates="appointment", uselist=False)
