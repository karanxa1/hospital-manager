import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    specialization = Column(String)
    qualification = Column(String)
    experience_years = Column(Integer)
    bio = Column(String)
    consultation_fee = Column(Numeric(10, 2))
    avg_consultation_minutes = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="doctor")
    availabilities = relationship("DoctorAvailability", back_populates="doctor")
    leaves = relationship("DoctorLeave", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    token_queue = relationship("TokenQueue", back_populates="doctor")
