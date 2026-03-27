from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID

from app.auth.dependencies import get_current_user
from app.domain_types import User
from app.fs_client import get_store
from app.firestore_store import Store

router = APIRouter(prefix="/api/v1/hospitals", tags=["hospitals"])

@router.get("", response_model=dict)
def list_hospitals(
    store: Store = Depends(get_store),
    _current_user: User = Depends(get_current_user),
):
    hospitals = store.hospitals_list()
    return {"success": True, "data": hospitals, "message": "Hospitals fetched"}

@router.get("/{hospital_id}", response_model=dict)
def get_hospital(
    hospital_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(get_current_user),
):
    h = store.hospital_get(str(hospital_id))
    if not h:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Hospital not found"})
    return {"success": True, "data": h, "message": "Hospital fetched"}
