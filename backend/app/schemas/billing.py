from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class InvoiceCreate(BaseModel):
    appointment_id: UUID
    amount: float


class CashfreeOrderRequest(BaseModel):
    invoice_id: UUID


class CashfreeVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
