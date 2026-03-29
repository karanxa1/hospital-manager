import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv

load_dotenv()

def add_admin_to_auth():
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    
    print(f"Using cred_path: {cred_path}")
    
    try:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})
            
        email = "admin@hospitalmanager.com"
        password = "Admin@123"
        
        try:
            user = auth.get_user_by_email(email)
            print(f"User {email} already exists. Resetting password...")
            auth.update_user(user.uid, password=password)
            print("Password reset successfully.")
        except auth.UserNotFoundError:
            user = auth.create_user(
                email=email,
                password=password,
                display_name="Clinic Admin"
            )
            print(f"Successfully created new admin user: {user.uid}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_admin_to_auth()
