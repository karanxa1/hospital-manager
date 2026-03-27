import requests
import uuid
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import get_current_user, require_admin
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

@router.post("/sync", response_model=dict)
def sync_hospitals(
    city: str = Query("Pune"),
    store: Store = Depends(get_store),
    _admin: User = Depends(require_admin),
):
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json];
    area["name"="{city}"]->.searchArea;
    (
      node["amenity"="hospital"](area.searchArea);
      way["amenity"="hospital"](area.searchArea);
      relation["amenity"="hospital"](area.searchArea);
    );
    out center;
    """
    
    try:
        response = requests.post(overpass_url, data={'data': overpass_query}, timeout=30)
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail={"success": False, "message": f"OSM Fetch failed: {str(e)}"})
    
    # Get existing OSM IDs to avoid duplicates
    existing_hospitals = store.hospitals_list()
    existing_osm_ids = {h.get("osm_id") for h in existing_hospitals if h.get("osm_id")}
    
    new_hospitals = []
    for element in data.get('elements', []):
        tags = element.get('tags', {})
        name = tags.get('name')
        osm_id = element.get('id')
        
        if not name or osm_id in existing_osm_ids:
            continue
            
        lat = element.get('lat') or element.get('center', {}).get('lat')
        lon = element.get('lon') or element.get('center', {}).get('lon')
        
        if lat is None or lon is None:
            continue
            
        street = tags.get('addr:street', '')
        city_tag = tags.get('addr:city', city)
        suburb = tags.get('addr:suburb', '')
        house = tags.get('addr:housenumber', '')
        
        address_parts = [house, street, suburb]
        address = ", ".join([p for p in address_parts if p]).strip()
        if not address:
            address = tags.get('address', f"Near {name}, {city_tag}")
            
        new_hospitals.append({
            "name": name,
            "address": address,
            "city": city_tag,
            "latitude": float(lat),
            "longitude": float(lon),
            "specialties": ["General Medicine"],
            "osm_id": osm_id
        })
        
    # Bulk write
    for h in new_hospitals:
        hid = str(uuid.uuid4())
        h["id"] = hid
        store.hospital_set(hid, h)
        
    return {
        "success": True, 
        "data": {"added": len(new_hospitals)}, 
        "message": f"Synced {len(new_hospitals)} new hospitals from {city}"
    }

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

