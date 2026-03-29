import asyncio
import time
from app.fs_client import get_store
from app.auth.firebase import init_firebase

init_firebase()
store = next(get_store())

print("Testing patients_list...")
try:
    start = time.time()
    pts = store.patients_list(None)
    print(f"Loaded {len(pts)} patients in {time.time()-start:.2f}s")
except Exception as e:
    print("Error patients_list:", e)

print("Testing doctors_list...")
try:
    start = time.time()
    docs = store.doctors_list()
    print(f"Loaded {len(docs)} doctors in {time.time()-start:.2f}s")
except Exception as e:
    print("Error doctors_list:", e)

print("Testing overview ...")
try:
    from app.routers.analytics import overview
    # overview needs auth user, but we can pass a dummy
    start = time.time()
    from collections import namedtuple
    DummyUser = namedtuple('User', ['id', 'role'])
    res = overview(store=store, _current_user=DummyUser('test', 'admin'))
    print(f"Loaded overview in {time.time()-start:.2f}s", res)
except Exception as e:
    import traceback
    traceback.print_exc()
