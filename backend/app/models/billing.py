import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, Date, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class InvoiceStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    partial = "partial"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(
        UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=False
    )
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    invoice_number = Column(String, unique=True, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    gst_amount = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.unpaid)
    due_date = Column(Date)
    paid_at = Column(DateTime)
    cashfree_order_id = Column(String)
    cashfree_payment_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="invoice")
    patient = relationship("Patient", back_populates="invoices")
