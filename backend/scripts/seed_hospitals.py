import os
import sys
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv
load_dotenv()

from firebase_admin import firestore as gcf
from app.auth.firebase import init_firebase
from app.firestore_store import Store

def seed_hospitals():
    print("Initializing Firebase...")
    init_firebase()
    db = gcf.client()
    store = Store(db)
    
    # Delete existing hospitals to be safe
    existing = store.hospitals_list()
    for h in existing:
        db.collection("hospitals").document(h["id"]).delete()
    
    hospitals = [
        {"name": "Ruby Hall Clinic", "address": "Sassoon Road", "city": "Pune", "latitude": 18.5366, "longitude": 73.8797, "specialties": ["Cardiology", "Dermatology"]},
        {"name": "Sahyadri Hospital", "address": "Deccan Gymkhana", "city": "Pune", "latitude": 18.5186, "longitude": 73.8407, "specialties": ["Orthopedics", "Gynecology"]},
        {"name": "Deenanath Mangeshkar Hospital", "address": "Erandwane", "city": "Pune", "latitude": 18.4984, "longitude": 73.8188, "specialties": ["Neurology", "Pediatrics"]},
        {"name": "Jehangir Hospital", "address": "Sassoon Road", "city": "Pune", "latitude": 18.5345, "longitude": 73.8741, "specialties": ["General Medicine", "ENT"]},
        {"name": "KEM Hospital", "address": "Rasta Peth", "city": "Pune", "latitude": 18.5190, "longitude": 73.8710, "specialties": ["Pulmonology", "Psychiatry"]},
        {"name": "Lilavati Hospital", "address": "Bandra West", "city": "Mumbai", "latitude": 19.0527, "longitude": 72.8277, "specialties": ["Cardiology", "Endocrinology"]},
        {"name": "P.D. Hinduja Hospital", "address": "Mahim", "city": "Mumbai", "latitude": 19.0345, "longitude": 72.8396, "specialties": ["Neurology", "Ophthalmology"]},
        {"name": "Kokilaben Dhirubhai Ambani Hospital", "address": "Andheri West", "city": "Mumbai", "latitude": 19.1308, "longitude": 72.8252, "specialties": ["Gastroenterology", "Gynecology"]},
        {"name": "Tata Memorial Hospital", "address": "Parel", "city": "Mumbai", "latitude": 19.0069, "longitude": 72.8465, "specialties": ["General Medicine", "Oncology"]},
        {"name": "Breach Candy Hospital", "address": "Breach Candy", "city": "Mumbai", "latitude": 18.9715, "longitude": 72.8028, "specialties": ["Nephrology"]},
        {"name": "Jaslok Hospital", "address": "Pedder Road", "city": "Mumbai", "latitude": 18.9723, "longitude": 72.8095, "specialties": ["Urology"]},
        {"name": "Nanavati Max Super Speciality Hospital", "address": "Vile Parle", "city": "Mumbai", "latitude": 19.0965, "longitude": 72.8384, "specialties": ["Pediatrics"]}
    ]

    for h in hospitals:
        hid = store.hospital_create(h)
        print(f"Created hospital {h['name']} with ID: {hid}")

if __name__ == "__main__":
    seed_hospitals()
