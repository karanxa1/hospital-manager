from typing import Generator

from firebase_admin import firestore

from app.auth.firebase import init_firebase
from app.firestore_store import Store


def get_store() -> Generator[Store, None, None]:
    init_firebase()
    db = firestore.client()
    yield Store(db)
