import firebase_admin
from firebase_admin import credentials, auth, firestore
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

def setup_admin():
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    
    print(f"Using project: {project_id}")
    
    try:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})
            
        db = firestore.client()
        
        email = "admin@hospitalmanager.com"
        password = "Admin@123"
        display_name = "Clinic Admin"
        
        # 1. Ensure user exists in Auth
        try:
            user = auth.get_user_by_email(email)
            print(f"Admin already in Auth (UID: {user.uid}). Updating password...")
            auth.update_user(user.uid, password=password)
        except auth.UserNotFoundError:
            user = auth.create_user(
                email=email,
                password=password,
                display_name=display_name
            )
            print(f"Created Admin in Auth (UID: {user.uid})")
            
        # 2. Sync with Firestore
        # Find existing record or create new one
        users_ref = db.collection("users")
        query = users_ref.where("email", "==", email).limit(1).stream()
        docs = list(query)
        
        admin_data = {
            "email": email,
            "name": display_name,
            "role": "admin",
            "google_id": user.uid, # This is the Firebase UID
            "is_active": True,
            "plain_password": password # As requested by user
        }
        
        if docs:
            doc = docs[0]
            print(f"Updating existing Firestore admin record: {doc.id}")
            users_ref.document(doc.id).update(admin_data)
        else:
            doc_id = str(uuid.uuid4())
            print(f"Creating new Firestore admin record: {doc_id}")
            users_ref.document(doc_id).set(admin_data)
            
        print("\nAdmin setup complete!")
        print(f"Login Email: {email}")
        print(f"Login Password: {password}")
        
    except Exception as e:
        print(f"Error during admin setup: {e}")

if __name__ == "__main__":
    setup_admin()
