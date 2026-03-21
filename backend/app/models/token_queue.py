import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    Date,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TokenQueue(Base):
    __tablename__ = "token_queue"
    __table_args__ = (
        UniqueConstraint("doctor_id", "queue_date", name="uq_doctor_queue_date"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    queue_date = Column(Date, nullable=False, default=date.today)
    current_token = Column(Integer, default=0)
    last_token_issued = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="token_queue")
