"""
Mock data seeder for Hospital Manager — Pune & Mumbai.

Populates Firestore with:
  • Admin user
  • 20 doctors across Pune & Mumbai hospitals
  • 30 patients
  • Availability slots for each doctor
  • Appointments (past + upcoming)
  • Medical records, prescriptions, invoices

Usage:
  cd backend
  python -m scripts.seed_mock_data
"""

import os
import sys
import uuid
import random
from datetime import datetime, timedelta, date, time

# ---------------------------------------------------------------------------
# Ensure project root is on path so `app.*` imports work
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv

load_dotenv()

from firebase_admin import firestore as gcf
from app.auth.firebase import init_firebase
from app.firestore_store import Store, _now_iso

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SPECIALIZATIONS = [
    "Cardiology",
    "Dermatology",
    "ENT",
    "General Medicine",
    "Gynecology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Psychiatry",
    "Pulmonology",
    "Ophthalmology",
    "Urology",
    "Gastroenterology",
    "Endocrinology",
    "Nephrology",
]

QUALIFICATIONS = [
    "MBBS, MD",
    "MBBS, MS",
    "MBBS, DNB",
    "MBBS, DM",
    "MBBS, MCh",
    "MBBS, DGO",
    "MBBS, DCH",
    "MBBS, DLO",
]

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
GENDERS = ["male", "female"]
CHIEF_COMPLAINTS = [
    "Fever and headache",
    "Chest pain",
    "Back pain",
    "Skin rash",
    "Cold and cough",
    "Stomach ache",
    "Joint pain",
    "Fatigue",
    "Dizziness",
    "Shortness of breath",
    "Eye irritation",
    "Ear pain",
    "Allergies",
    "Diabetes checkup",
    "Blood pressure checkup",
    "Annual health checkup",
    "Pregnancy consultation",
    "Child vaccination",
]

DRUGS = [
    ("Paracetamol 500mg", "1 tablet", "Twice daily", "5 days", "After meals"),
    ("Amoxicillin 250mg", "1 capsule", "Three times daily", "7 days", "Before meals"),
    ("Omeprazole 20mg", "1 capsule", "Once daily", "14 days", "Before breakfast"),
    ("Cetirizine 10mg", "1 tablet", "Once daily", "7 days", "At night"),
    ("Ibuprofen 400mg", "1 tablet", "Twice daily", "5 days", "After meals"),
    ("Metformin 500mg", "1 tablet", "Twice daily", "30 days", "With meals"),
    ("Amlodipine 5mg", "1 tablet", "Once daily", "30 days", "Morning"),
    ("Pantoprazole 40mg", "1 tablet", "Once daily", "14 days", "Before breakfast"),
    ("Azithromycin 500mg", "1 tablet", "Once daily", "3 days", "After meals"),
    ("Montelukast 10mg", "1 tablet", "Once daily", "30 days", "At night"),
]

# ---------------------------------------------------------------------------
# Pune Doctors
# ---------------------------------------------------------------------------

PUNE_DOCTORS = [
    {
        "name": "Rajesh Patil",
        "email": "rajesh.patil@rubyhall.com",
        "phone": "+919876543210",
        "hospital": "Ruby Hall Clinic, Pune",
        "specialization": "Cardiology",
        "qualification": "MBBS, DM Cardiology",
        "experience_years": 18,
        "consultation_fee": 1200,
        "bio": "Senior Cardiologist at Ruby Hall Clinic with 18 years of experience in interventional cardiology.",
    },
    {
        "name": "Sneha Kulkarni",
        "email": "sneha.kulkarni@rubyhall.com",
        "phone": "+919876543211",
        "hospital": "Ruby Hall Clinic, Pune",
        "specialization": "Dermatology",
        "qualification": "MBBS, MD Dermatology",
        "experience_years": 12,
        "consultation_fee": 800,
        "bio": "Dermatologist specializing in cosmetic dermatology and skin disorders.",
    },
    {
        "name": "Amit Deshmukh",
        "email": "amit.deshmukh@sahyadri.com",
        "phone": "+919876543212",
        "hospital": "Sahyadri Hospital, Pune",
        "specialization": "Orthopedics",
        "qualification": "MBBS, MS Ortho",
        "experience_years": 15,
        "consultation_fee": 1000,
        "bio": "Orthopedic surgeon specializing in joint replacement and sports injuries.",
    },
    {
        "name": "Priya Joshi",
        "email": "priya.joshi@sahyadri.com",
        "phone": "+919876543213",
        "hospital": "Sahyadri Hospital, Pune",
        "specialization": "Gynecology",
        "qualification": "MBBS, DGO",
        "experience_years": 14,
        "consultation_fee": 900,
        "bio": "Obstetrician and Gynecologist with expertise in high-risk pregnancies.",
    },
    {
        "name": "Vikram Jadhav",
        "email": "vikram.jadhav@deenamangeshkar.com",
        "phone": "+919876543214",
        "hospital": "Deenanath Mangeshkar Hospital, Pune",
        "specialization": "Neurology",
        "qualification": "MBBS, DM Neurology",
        "experience_years": 20,
        "consultation_fee": 1500,
        "bio": "Head of Neurology department, expert in stroke and epilepsy management.",
    },
    {
        "name": "Meera Bhosale",
        "email": "meera.bhosale@deenamangeshkar.com",
        "phone": "+919876543215",
        "hospital": "Deenanath Mangeshkar Hospital, Pune",
        "specialization": "Pediatrics",
        "qualification": "MBBS, DCH",
        "experience_years": 10,
        "consultation_fee": 700,
        "bio": "Pediatrician passionate about child healthcare and vaccination programs.",
    },
    {
        "name": "Suresh Pawar",
        "email": "suresh.pawar@jehangir.com",
        "phone": "+919876543216",
        "hospital": "Jehangir Hospital, Pune",
        "specialization": "General Medicine",
        "qualification": "MBBS, MD Medicine",
        "experience_years": 22,
        "consultation_fee": 800,
        "bio": "Senior Physician with extensive experience in managing chronic diseases.",
    },
    {
        "name": "Anita Gaikwad",
        "email": "anita.gaikwad@jehangir.com",
        "phone": "+919876543217",
        "hospital": "Jehangir Hospital, Pune",
        "specialization": "ENT",
        "qualification": "MBBS, DLO, MS ENT",
        "experience_years": 11,
        "consultation_fee": 750,
        "bio": "ENT specialist performing endoscopic sinus surgeries and hearing rehabilitation.",
    },
    {
        "name": "Rohan Shinde",
        "email": "rohan.shinde@kem.com",
        "phone": "+919876543218",
        "hospital": "KEM Hospital, Pune",
        "specialization": "Pulmonology",
        "qualification": "MBBS, MD Chest",
        "experience_years": 9,
        "consultation_fee": 650,
        "bio": "Pulmonologist focused on asthma, COPD, and interventional pulmonology.",
    },
    {
        "name": "Kavita More",
        "email": "kavita.more@kem.com",
        "phone": "+919876543219",
        "hospital": "KEM Hospital, Pune",
        "specialization": "Psychiatry",
        "qualification": "MBBS, MD Psychiatry",
        "experience_years": 8,
        "consultation_fee": 900,
        "bio": "Psychiatrist specializing in anxiety, depression, and cognitive behavioral therapy.",
    },
]

# ---------------------------------------------------------------------------
# Mumbai Doctors
# ---------------------------------------------------------------------------

MUMBAI_DOCTORS = [
    {
        "name": "Arjun Mehta",
        "email": "arjun.mehta@lilavati.com",
        "phone": "+919820000001",
        "hospital": "Lilavati Hospital, Mumbai",
        "specialization": "Cardiology",
        "qualification": "MBBS, DM Cardiology",
        "experience_years": 25,
        "consultation_fee": 2000,
        "bio": "Chief Cardiologist at Lilavati Hospital. Pioneer in minimally invasive cardiac surgery.",
    },
    {
        "name": "Fatima Sheikh",
        "email": "fatima.sheikh@lilavati.com",
        "phone": "+919820000002",
        "hospital": "Lilavati Hospital, Mumbai",
        "specialization": "Endocrinology",
        "qualification": "MBBS, DM Endocrinology",
        "experience_years": 16,
        "consultation_fee": 1500,
        "bio": "Endocrinologist specializing in diabetes management and thyroid disorders.",
    },
    {
        "name": "Rahul Kapoor",
        "email": "rahul.kapoor@hinduja.com",
        "phone": "+919820000003",
        "hospital": "P.D. Hinduja Hospital, Mumbai",
        "specialization": "Neurology",
        "qualification": "MBBS, DM Neurology",
        "experience_years": 19,
        "consultation_fee": 1800,
        "bio": "Neurologist with expertise in movement disorders and Parkinson's disease.",
    },
    {
        "name": "Neha Agarwal",
        "email": "neha.agarwal@hinduja.com",
        "phone": "+919820000004",
        "hospital": "P.D. Hinduja Hospital, Mumbai",
        "specialization": "Ophthalmology",
        "qualification": "MBBS, MS Ophthalmology",
        "experience_years": 13,
        "consultation_fee": 1000,
        "bio": "Ophthalmologist specializing in cataract and refractive surgery.",
    },
    {
        "name": "Vivek Nair",
        "email": "vivek.nair@kokilaben.com",
        "phone": "+919820000005",
        "hospital": "Kokilaben Dhirubhai Ambani Hospital, Mumbai",
        "specialization": "Gastroenterology",
        "qualification": "MBBS, DM Gastro",
        "experience_years": 17,
        "consultation_fee": 1600,
        "bio": "Gastroenterologist performing advanced endoscopic procedures and liver transplants.",
    },
    {
        "name": "Pooja Sharma",
        "email": "pooja.sharma@kokilaben.com",
        "phone": "+919820000006",
        "hospital": "Kokilaben Dhirubhai Ambani Hospital, Mumbai",
        "specialization": "Gynecology",
        "qualification": "MBBS, MD Gynecology",
        "experience_years": 14,
        "consultation_fee": 1200,
        "bio": "Gynecologist and IVF specialist helping families for over 14 years.",
    },
    {
        "name": "Sanjay Gupta",
        "email": "sanjay.gupta@tata.com",
        "phone": "+919820000007",
        "hospital": "Tata Memorial Hospital, Mumbai",
        "specialization": "General Medicine",
        "qualification": "MBBS, MD Medicine",
        "experience_years": 21,
        "consultation_fee": 900,
        "bio": "Senior Oncologist and Physician at Tata Memorial Hospital.",
    },
    {
        "name": "Deepa Krishnan",
        "email": "deepa.krishnan@breachcandy.com",
        "phone": "+919820000008",
        "hospital": "Breach Candy Hospital, Mumbai",
        "specialization": "Nephrology",
        "qualification": "MBBS, DM Nephrology",
        "experience_years": 12,
        "consultation_fee": 1400,
        "bio": "Nephrologist specializing in kidney transplant and dialysis management.",
    },
    {
        "name": "Arun Fernandes",
        "email": "arun.fernandes@jaslok.com",
        "phone": "+919820000009",
        "hospital": "Jaslok Hospital, Mumbai",
        "specialization": "Urology",
        "qualification": "MBBS, MCh Urology",
        "experience_years": 18,
        "consultation_fee": 1500,
        "bio": "Urologist expert in robotic urological surgeries and prostate treatment.",
    },
    {
        "name": "Sunita Reddy",
        "email": "sunita.reddy@nanavati.com",
        "phone": "+919820000010",
        "hospital": "Nanavati Max Super Speciality Hospital, Mumbai",
        "specialization": "Pediatrics",
        "qualification": "MBBS, DCH, MD Pediatrics",
        "experience_years": 15,
        "consultation_fee": 1000,
        "bio": "Pediatrician and Neonatologist with special interest in premature baby care.",
    },
]

ALL_DOCTORS = PUNE_DOCTORS + MUMBAI_DOCTORS

# ---------------------------------------------------------------------------
# Patient names
# ---------------------------------------------------------------------------

PATIENT_NAMES = [
    "Aditya Sharma",
    "Riya Patel",
    "Karan Singh",
    "Ananya Gupta",
    "Rohan Kulkarni",
    "Sakshi Deshmukh",
    "Arjun Reddy",
    "Priya Nair",
    "Vikram Joshi",
    "Neha Pawar",
    "Siddharth Rao",
    "Kavita Iyer",
    "Manish Verma",
    "Divya Chatterjee",
    "Akshay Malhotra",
    "Pooja Bansal",
    "Rahul Thakur",
    "Megha Saxena",
    "Nikhil Kapoor",
    "Swati Hegde",
    "Amit Trivedi",
    "Deepika Menon",
    "Suresh Yadav",
    "Anjali Mishra",
    "Prateek Agarwal",
    "Sneha Dubey",
    "Ravi Pandey",
    "Isha Chopra",
    "Gaurav Bhatia",
    "Shruti Deshpande",
]

PATIENT_EMAILS = [
    "aditya.sharma@gmail.com",
    "riya.patel@gmail.com",
    "karan.singh@gmail.com",
    "ananya.gupta@gmail.com",
    "rohan.kulkarni@gmail.com",
    "sakshi.deshmukh@gmail.com",
    "arjun.reddy@gmail.com",
    "priya.nair@gmail.com",
    "vikram.joshi@gmail.com",
    "neha.pawar@gmail.com",
    "siddharth.rao@gmail.com",
    "kavita.iyer@gmail.com",
    "manish.verma@gmail.com",
    "divya.chatterjee@gmail.com",
    "akshay.malhotra@gmail.com",
    "pooja.bansal@gmail.com",
    "rahul.thakur@gmail.com",
    "megha.saxena@gmail.com",
    "nikhil.kapoor@gmail.com",
    "swati.hegde@gmail.com",
    "amit.trivedi@gmail.com",
    "deepika.menon@gmail.com",
    "suresh.yadav@gmail.com",
    "anjali.mishra@gmail.com",
    "prateek.agarwal@gmail.com",
    "sneha.dubey@gmail.com",
    "ravi.pandey@gmail.com",
    "isha.chopra@gmail.com",
    "gaurav.bhatia@gmail.com",
    "shruti.deshpande@gmail.com",
]

PATIENT_PHONES = [
    "+919000000001",
    "+919000000002",
    "+919000000003",
    "+919000000004",
    "+919000000005",
    "+919000000006",
    "+919000000007",
    "+919000000008",
    "+919000000009",
    "+919000000010",
    "+919000000011",
    "+919000000012",
    "+919000000013",
    "+919000000014",
    "+919000000015",
    "+919000000016",
    "+919000000017",
    "+919000000018",
    "+919000000019",
    "+919000000020",
    "+919000000021",
    "+919000000022",
    "+919000000023",
    "+919000000024",
    "+919000000025",
    "+919000000026",
    "+919000000027",
    "+919000000028",
    "+919000000029",
    "+919000000030",
]


def random_dob(min_age=18, max_age=75):
    age = random.randint(min_age, max_age)
    d = date.today() - timedelta(days=age * 365 + random.randint(0, 364))
    return d.isoformat()


def random_date_between(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(0, delta)))


def seed():
    print("Initializing Firebase...")
    init_firebase()
    db = gcf.client()
    store = Store(db)
    ts = _now_iso()

    created_ids = {"users": [], "doctors": [], "patients": []}

    # ------------------------------------------------------------------
    # 1. Admin user
    # ------------------------------------------------------------------
    admin_id = str(uuid.uuid4())
    store.user_set(
        admin_id,
        {
            "email": "admin@hospitalmanager.com",
            "name": "Clinic Admin",
            "role": "admin",
            "phone": "+919999999999",
            "profile_picture": None,
            "google_id": None,
            "is_active": True,
            "created_at": ts,
            "updated_at": ts,
        },
        merge=False,
    )
    created_ids["users"].append(admin_id)
    print(f"  Admin: {admin_id}")

    # ------------------------------------------------------------------
    # 2. Doctors (users + doctor profiles + availability)
    # ------------------------------------------------------------------
    for doc in ALL_DOCTORS:
        uid = str(uuid.uuid4())
        store.user_set(
            uid,
            {
                "email": doc["email"],
                "name": doc["name"],
                "role": "doctor",
                "phone": doc["phone"],
                "profile_picture": None,
                "google_id": None,
                "is_active": True,
                "created_at": ts,
                "updated_at": ts,
            },
            merge=False,
        )
        created_ids["users"].append(uid)

        did = store.doctor_create(
            {
                "user_id": uid,
                "specialization": doc["specialization"],
                "qualification": doc["qualification"],
                "experience_years": doc["experience_years"],
                "bio": doc["bio"],
                "consultation_fee": doc["consultation_fee"],
                "avg_consultation_minutes": random.choice([15, 20, 30]),
                "hospital": doc["hospital"],
            }
        )
        created_ids["doctors"].append({"id": did, "user_id": uid, "name": doc["name"]})

        # Availability: Mon-Sat, 1-3 slots per day
        slots = []
        for day in range(1, 7):  # Mon-Sat
            n_slots = random.choice([1, 2, 2, 3])
            start_hours = random.sample([9, 10, 11, 14, 16, 17], n_slots)
            for sh in sorted(start_hours):
                eh = sh + random.choice([2, 3])
                slots.append(
                    {
                        "day_of_week": day,
                        "start_time": f"{sh:02d}:00",
                        "end_time": f"{min(eh, 21):02d}:00",
                        "is_active": True,
                    }
                )
        store.availability_replace(did, slots)

        print(
            f"  Doctor: {doc['name']} ({doc['hospital']}) → {did}  [{len(slots)} slots]"
        )

    # ------------------------------------------------------------------
    # 3. Patients
    # ------------------------------------------------------------------
    for i, name in enumerate(PATIENT_NAMES):
        uid = str(uuid.uuid4())
        store.user_set(
            uid,
            {
                "email": PATIENT_EMAILS[i],
                "name": name,
                "role": "patient",
                "phone": PATIENT_PHONES[i],
                "profile_picture": None,
                "google_id": None,
                "is_active": True,
                "created_at": ts,
                "updated_at": ts,
            },
            merge=False,
        )
        created_ids["users"].append(uid)

        pid = str(uuid.uuid4())
        store.db.collection("patients").document(pid).set(
            {
                "user_id": uid,
                "date_of_birth": random_dob(),
                "gender": random.choice(GENDERS),
                "blood_group": random.choice(BLOOD_GROUPS),
                "allergies": random.choice(
                    ["None", "Penicillin", "Dust", "Pollen", "Peanuts", "None"]
                ),
                "chronic_conditions": random.choice(
                    ["None", "Diabetes", "Hypertension", "Asthma", "None", "None"]
                ),
                "emergency_contact_name": f"Contact of {name}",
                "emergency_contact_phone": f"+91900000{random.randint(1000, 9999)}",
                "address": random.choice(
                    [
                        "Shivaji Nagar, Pune",
                        "Kothrud, Pune",
                        "Viman Nagar, Pune",
                        "Hinjewadi, Pune",
                        "Baner, Pune",
                        "Koregaon Park, Pune",
                        "Andheri West, Mumbai",
                        "Bandra East, Mumbai",
                        "Juhu, Mumbai",
                        "Powai, Mumbai",
                        "Lower Parel, Mumbai",
                        "Dadar, Mumbai",
                    ]
                ),
                "created_at": ts,
            }
        )
        created_ids["patients"].append({"id": pid, "user_id": uid, "name": name})
        print(f"  Patient: {name} → {pid}")

    # ------------------------------------------------------------------
    # 4. Appointments (past 30 days + next 14 days)
    # ------------------------------------------------------------------
    today = date.today()
    appointment_ids = []
    statuses_by_age = {
        "past": [
            "completed",
            "completed",
            "completed",
            "completed",
            "no_show",
            "cancelled",
        ],
        "today": ["pending", "confirmed", "confirmed"],
        "future": ["pending", "confirmed"],
    }

    for day_offset in range(-30, 15):
        appt_date = today + timedelta(days=day_offset)
        if appt_date.weekday() == 6:  # skip Sunday
            continue

        # Pick random subset of doctors working this day
        working_doctors = random.sample(
            created_ids["doctors"],
            k=random.randint(4, min(8, len(created_ids["doctors"]))),
        )

        for doc_info in working_doctors:
            did = doc_info["id"]
            # 2-5 appointments per doctor per day
            n_appts = random.randint(2, 5)
            patients_today = random.sample(
                created_ids["patients"], k=min(n_appts, len(created_ids["patients"]))
            )

            token = 1
            for patient_info in patients_today:
                hour = random.randint(9, 17)
                minute = random.choice([0, 15, 30, 45])
                start_t = time(hour, minute)
                duration = random.choice([15, 20, 30])
                end_dt = datetime.combine(appt_date, start_t) + timedelta(
                    minutes=duration
                )
                end_t = end_dt.time().replace(second=0, microsecond=0)

                if day_offset < 0:
                    status = random.choice(statuses_by_age["past"])
                elif day_offset == 0:
                    status = random.choice(statuses_by_age["today"])
                else:
                    status = random.choice(statuses_by_age["future"])

                payment_status = (
                    "paid"
                    if status == "completed"
                    else random.choice(["pending", "pending", "paid"])
                )
                payment_amount = float(random.choice([500, 700, 800, 1000, 1200, 1500]))

                aid = store.appointment_create(
                    {
                        "patient_id": patient_info["id"],
                        "doctor_id": did,
                        "appointment_date": appt_date.isoformat(),
                        "start_time": start_t.strftime("%H:%M"),
                        "end_time": end_t.strftime("%H:%M"),
                        "status": status,
                        "type": "in_person",
                        "chief_complaint": random.choice(CHIEF_COMPLAINTS),
                        "token_number": token,
                        "payment_status": payment_status,
                        "payment_amount": payment_amount,
                    }
                )
                appointment_ids.append(
                    {
                        "id": aid,
                        "doctor_id": did,
                        "patient_id": patient_info["id"],
                        "date": appt_date.isoformat(),
                        "status": status,
                        "payment_amount": payment_amount,
                        "payment_status": payment_status,
                    }
                )
                token += 1

        if day_offset % 10 == 0:
            print(f"  Appointments seeded through {appt_date.isoformat()}")

    print(f"  Total appointments: {len(appointment_ids)}")

    # ------------------------------------------------------------------
    # 5. Medical records for completed appointments
    # ------------------------------------------------------------------
    completed_appts = [a for a in appointment_ids if a["status"] == "completed"]
    for appt in random.sample(completed_appts, k=min(len(completed_appts), 40)):
        n_rx = random.randint(1, 3)
        prescriptions = random.sample(DRUGS, n_rx)
        rx_list = [
            {
                "drug_name": d[0],
                "dosage": d[1],
                "frequency": d[2],
                "duration": d[3],
                "instructions": d[4],
            }
            for d in prescriptions
        ]
        store.record_create(
            {
                "appointment_id": appt["id"],
                "patient_id": appt["patient_id"],
                "doctor_id": appt["doctor_id"],
                "subjective": random.choice(CHIEF_COMPLAINTS),
                "objective": "Vitals stable. Examination findings within normal limits.",
                "assessment": "Uncomplicated presentation.",
                "plan": "Medications prescribed. Follow up in 1 week if symptoms persist.",
                "vital_bp": f"{random.randint(110, 140)}/{random.randint(70, 90)}",
                "vital_pulse": str(random.randint(68, 90)),
                "vital_temp": round(random.uniform(97.5, 99.5), 1),
                "vital_weight": round(random.uniform(50, 95), 1),
            },
            rx_list,
        )

    print(f"  Medical records created for {min(len(completed_appts), 40)} appointments")

    # ------------------------------------------------------------------
    # 6. Invoices
    # ------------------------------------------------------------------
    for appt in appointment_ids:
        if appt["payment_status"] == "paid":
            inv_number = store.next_invoice_number()
            store.invoice_create(
                {
                    "invoice_number": inv_number,
                    "appointment_id": appt["id"],
                    "patient_id": appt["patient_id"],
                    "total_amount": appt["payment_amount"],
                    "status": "paid",
                    "paid_at": f"{appt['date']}T12:00:00Z",
                }
            )
        elif random.random() < 0.4:
            inv_number = store.next_invoice_number()
            store.invoice_create(
                {
                    "invoice_number": inv_number,
                    "appointment_id": appt["id"],
                    "patient_id": appt["patient_id"],
                    "total_amount": appt["payment_amount"],
                    "status": "unpaid",
                    "paid_at": None,
                }
            )

    print("  Invoices created")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)
    print(
        f"  Users:      {len(created_ids['users'])} (1 admin + {len(ALL_DOCTORS)} doctors + {len(PATIENT_NAMES)} patients)"
    )
    print(
        f"  Doctors:    {len(created_ids['doctors'])} (Pune: {len(PUNE_DOCTORS)}, Mumbai: {len(MUMBAI_DOCTORS)})"
    )
    print(f"  Patients:   {len(created_ids['patients'])}")
    print(f"  Appointments: {len(appointment_ids)}")
    print(
        f"  Date range:  {(today - timedelta(days=30)).isoformat()} → {(today + timedelta(days=14)).isoformat()}"
    )
    print("=" * 60)
    print("\nAdmin login:")
    print(f"  Email: admin@hospitalmanager.com")
    print(f"  ID:    {admin_id}")
    print("\nDoctors can log in with their emails (e.g. rajesh.patil@rubyhall.com).")
    print("Patients can log in with their emails (e.g. aditya.sharma@gmail.com).")
    print("\nNOTE: Login requires Firebase Auth — create matching accounts in")
    print(
        "      Firebase Console or use the firebase-login endpoint with a valid token."
    )


if __name__ == "__main__":
    seed()
