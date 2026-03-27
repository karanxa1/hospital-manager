import requests
import json
from uuid import uuid4
from google.cloud import firestore

# Initialize Firestore
db = firestore.Client()
hospitals_ref = db.collection("hospitals")

def fetch_osm_hospitals(city="Pune"):
    print(f"Fetching hospitals for {city} from OpenStreetMap...")
    
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
    
    response = requests.post(overpass_url, data={'data': overpass_query})
    data = response.json()
    
    hospitals = []
    for element in data.get('elements', []):
        tags = element.get('tags', {})
        name = tags.get('name')
        if not name:
            continue
            
        # Get lat/lng
        lat = element.get('lat') or element.get('center', {}).get('lat')
        lon = element.get('lon') or element.get('center', {}).get('lon')
        
        if lat is None or lon is None:
            continue
            
        # Address construction
        street = tags.get('addr:street', '')
        city_tag = tags.get('addr:city', city)
        suburb = tags.get('addr:suburb', '')
        house = tags.get('addr:housenumber', '')
        
        address_parts = [house, street, suburb]
        address = ", ".join([p for p in address_parts if p]).strip()
        if not address:
            address = tags.get('address', f"Near {name}, {city_tag}")
            
        hospitals.append({
            "name": name,
            "address": address,
            "city": city_tag,
            "latitude": float(lat),
            "longitude": float(lon),
            "specialties": ["General Medicine"], # Default since OSM doesn't always have this
            "osm_id": element.get('id')
        })
        
    return hospitals

def sync_to_firestore(hospitals):
    print(f"Syncing {len(hospitals)} hospitals to Firestore...")
    
    # Get existing OSM IDs to avoid duplicates
    existing_ids = set()
    docs = hospitals_ref.stream()
    for doc in docs:
        d = doc.to_dict()
        if 'osm_id' in d:
            existing_ids.add(d['osm_id'])
            
    added_count = 0
    batch = db.batch()
    
    for h in hospitals:
        if h['osm_id'] in existing_ids:
            continue
            
        hid = str(uuid4())
        doc_ref = hospitals_ref.document(hid)
        h['id'] = hid
        batch.set(doc_ref, h)
        added_count += 1
        
        if added_count % 500 == 0:
            batch.commit()
            batch = db.batch()
            
    batch.commit()
    print(f"Done! Added {added_count} new hospitals.")
    return added_count

if __name__ == "__main__":
    # You can change city here or pass via sys.argv
    city_name = "Pune"
    results = fetch_osm_hospitals(city_name)
    if results:
        sync_to_firestore(results)
    else:
        print("No results found.")
