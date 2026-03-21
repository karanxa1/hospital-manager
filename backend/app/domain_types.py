"""Domain types for API (replaces SQLAlchemy model instances in auth layer)."""
from __future__ import annotations

import enum
from dataclasses import dataclass
from uuid import UUID


class UserRole(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    patient = "patient"


@dataclass
class User:
    id: UUID
    email: str
    name: str | None
    profile_picture: str | None
    role: UserRole
    phone: str | None
    is_active: bool

    @classmethod
    def from_firestore(cls, uid: str, d: dict) -> User:
        return cls(
            id=UUID(uid),
            email=d.get("email") or "",
            name=d.get("name"),
            profile_picture=d.get("profile_picture"),
            role=UserRole(d.get("role", "patient")),
            phone=d.get("phone"),
            is_active=d.get("is_active", True),
        )
