from pydantic import BaseModel
from typing import List, Optional

class HospitalCreate(BaseModel):
    name: str
    address: str
    city: str
    latitude: float
    longitude: float
    specialties: List[str]

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    specialties: Optional[List[str]] = None

class HospitalResponse(BaseModel):
    id: str
    name: str
    address: str
    city: str
    latitude: float
    longitude: float
    specialties: List[str]
