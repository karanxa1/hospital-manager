import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

def check_firestore():
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    
    print(f"Using cred_path: {cred_path}")
    print(f"Using project_id: {project_id}")
    
    try:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})
            
        db = firestore.client()
        collections = db.collections()
        print("Connected to Firestore successfully!")
        for col in collections:
            docs = list(col.stream())
            print(f"Collection '{col.id}': {len(docs)} documents")
    except Exception as e:
        print(f"Error connecting to Firestore: {e}")

if __name__ == "__main__":
    check_firestore()
