import os
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.auth.firebase import verify_firebase_token
from app.auth.jwt import create_access_token
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store, _now_iso

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class FirebaseLoginRequest(BaseModel):
    id_token: str
    role: str | None = None


@router.post("/firebase-login")
def firebase_login(body: FirebaseLoginRequest, store: Store = Depends(get_store)):
    decoded = verify_firebase_token(body.id_token)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Invalid Firebase token"},
        )

    firebase_uid = decoded.get("uid")
    email = decoded.get("email")
    name = decoded.get("name")
    picture = decoded.get("picture")
    phone = decoded.get("phone_number")

    row = None
    uid_str = None
    if firebase_uid:
        row = store.user_by_google_id(firebase_uid)
        if row:
            uid_str = row["id"]

    # Link by email if UID not found
    if not row and email:
        row = store.user_by_email(email)
        if row:
            uid_str = row["id"]
            
    # Link by phone if still not found
    if not row and phone:
        row = store.user_by_phone(phone)
        if row:
            uid_str = row["id"]


    if not row:
        effective_email = email
        if not effective_email and firebase_uid:
            effective_email = f"{firebase_uid}@firebase.uid.local"
        if not effective_email and phone:
            digits = "".join(c for c in phone if c.isdigit())
            effective_email = f"phone_{digits or 'unknown'}@phone.local"
        if not effective_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "message": "Cannot create account without email, phone, or Firebase uid",
                },
            )

        uid_str = str(uuid.uuid4())
        ts = _now_iso()
        requested_role = body.role if body.role in [UserRole.patient.value, UserRole.doctor.value] else UserRole.patient.value
        store.user_set(
            uid_str,
            {
                "email": effective_email,
                "name": name or (email.split("@")[0] if email else "User"),
                "profile_picture": picture,
                "role": requested_role,
                "google_id": firebase_uid,
                "phone": phone,
                "is_active": True,
                "created_at": ts,
                "updated_at": ts,
            },
            merge=False,
        )
        row = store.user_get(uid_str)
    else:
        patch = {}
        if firebase_uid and not row.get("google_id"):
            patch["google_id"] = firebase_uid
        if picture and not row.get("profile_picture"):
            patch["profile_picture"] = picture
        if name and not row.get("name"):
            patch["name"] = name
        if patch:
            patch["updated_at"] = _now_iso()
            store.user_set(uid_str, patch, merge=True)
        row = store.user_get(uid_str)

    u = User.from_firestore(uid_str, {k: v for k, v in row.items() if k != "id"})
    if u.role == UserRole.patient:
        store.patient_ensure(uid_str)
    elif u.role == UserRole.doctor:
        store.doctor_ensure(uid_str)

    jwt_token = create_access_token({"sub": uid_str, "role": u.role.value})

    return {
        "success": True,
        "data": {
            "token": jwt_token,
            "user": {
                "id": uid_str,
                "email": u.email,
                "name": u.name,
                "profile_picture": u.profile_picture,
                "role": u.role.value,
                "phone": u.phone,
                "is_active": u.is_active,
            },
        },
        "message": "Login successful",
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.name,
            "profile_picture": current_user.profile_picture,
            "role": current_user.role.value,
            "phone": current_user.phone,
            "is_active": current_user.is_active,
        },
        "message": "User fetched successfully",
    }
