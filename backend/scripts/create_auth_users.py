"""
Create Firebase Auth accounts for all seeded users and print credentials.

Reads users from Firestore, creates Firebase Auth accounts with auto-generated
passwords, and prints a credentials table.

Usage:
  cd backend
  python3 -m scripts.create_auth_users
"""

import os
import sys
import string
import random
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv

load_dotenv()

import firebase_admin
from firebase_admin import auth, credentials, firestore as gcf
from app.auth.firebase import init_firebase


def gen_password(length=12):
    """Generate a readable password: 2 words + 2 digits + 1 special."""
    words = [
        "apple",
        "brave",
        "cloud",
        "delta",
        "eagle",
        "flame",
        "grace",
        "honey",
        "ivory",
        "jolly",
        "karma",
        "lemon",
        "mango",
        "noble",
        "ocean",
        "pearl",
        "quest",
        "river",
        "stone",
        "tiger",
        "unity",
        "vivid",
        "whale",
        "xenon",
        "youth",
        "zebra",
        "blaze",
        "crest",
        "dream",
        "frost",
        "globe",
        "haven",
        "jewel",
        "knack",
        "lunar",
    ]
    w = random.choice(words).capitalize() + random.choice(words).capitalize()
    d = str(random.randint(10, 99))
    s = random.choice("!@#$%&*")
    return w + d + s


def main():
    print("Initializing Firebase...")
    init_firebase()
    db = gcf.client()

    # Collect all users from Firestore
    users_ref = db.collection("users").stream()
    users = []
    for doc in users_ref:
        data = doc.to_dict() or {}
        data["_doc_id"] = doc.id
        users.append(data)

    if not users:
        print("No users found in Firestore. Run seed_mock_data.py first.")
        sys.exit(1)

    print(f"Found {len(users)} users in Firestore.\n")

    credentials_list = []
    created = 0
    skipped = 0
    errors = 0

    for u in users:
        email = u.get("email")
        name = u.get("name", "Unknown")
        role = u.get("role", "patient")
        phone = u.get("phone", "")
        doc_id = u.get("_doc_id", "")

        if not email:
            print(f"  SKIP (no email): {name} ({doc_id})")
            skipped += 1
            continue

        password = gen_password()

        try:
            # Check if user already exists in Firebase Auth
            try:
                existing = auth.get_user_by_email(email)
                # Update password
            except firebase_admin.auth.UserNotFoundError:
                existing = None

            if existing:
                auth.update_user(existing.uid, password=password)
                uid = existing.uid
                action = "UPDATED"
            else:
                user_record = auth.create_user(
                    email=email,
                    password=password,
                    display_name=name,
                    phone_number=phone if phone else None,
                    email_verified=True,
                )
                uid = user_record.uid
                action = "CREATED"

            # Update Firestore with firebase_uid
            db.collection("users").document(doc_id).set({"google_id": uid}, merge=True)

            credentials_list.append(
                {
                    "name": name,
                    "email": email,
                    "password": password,
                    "role": role,
                    "uid": uid,
                    "action": action,
                }
            )
            created += 1

        except Exception as e:
            print(f"  ERROR: {email} → {e}")
            errors += 1

    # ------------------------------------------------------------------
    # Print results
    # ------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("FIREBASE AUTH CREDENTIALS")
    print("=" * 80)

    # Group by role
    admins = [c for c in credentials_list if c["role"] == "admin"]
    doctors = [c for c in credentials_list if c["role"] == "doctor"]
    patients = [c for c in credentials_list if c["role"] == "patient"]

    def print_table(title, items):
        print(f"\n{'─' * 80}")
        print(f"  {title} ({len(items)} users)")
        print(f"{'─' * 80}")
        print(f"  {'Name':<28} {'Email':<38} {'Password':<16} {'Role'}")
        print(f"  {'─' * 27} {'─' * 37} {'─' * 15} {'─' * 10}")
        for c in items:
            print(f"  {c['name']:<28} {c['email']:<38} {c['password']:<16} {c['role']}")

    if admins:
        print_table("ADMIN", admins)
    if doctors:
        print_table("DOCTORS", doctors)
    if patients:
        print_table("PATIENTS", patients)

    print(f"\n{'=' * 80}")
    print(f"SUMMARY")
    print(f"{'=' * 80}")
    print(f"  Created/Updated: {created}")
    print(f"  Skipped:         {skipped}")
    print(f"  Errors:          {errors}")
    print(f"  Total:           {len(credentials_list)}")
    print(f"{'=' * 80}")

    # Save to JSON file for reference
    output_path = os.path.join(ROOT, "scripts", "credentials.json")
    with open(output_path, "w") as f:
        json.dump(credentials_list, f, indent=2)
    print(f"\nCredentials saved to: {output_path}")

    # Print quick login summary
    print(f"\n{'=' * 80}")
    print("QUICK LOGIN")
    print(f"{'=' * 80}")
    print(f"  Admin:   {admins[0]['email']}  /  {admins[0]['password']}")
    if doctors:
        print(f"  Doctor:  {doctors[0]['email']}  /  {doctors[0]['password']}")
    if patients:
        print(f"  Patient: {patients[0]['email']}  /  {patients[0]['password']}")
    print(f"{'=' * 80}")
    print("\nLogin at: http://localhost:5173/login")
    print("Use the email + password above with Firebase Email/Password auth.\n")


if __name__ == "__main__":
    main()
