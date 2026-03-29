import asyncio
from app.fs_client import get_store

def test():
    store = next(get_store())
    try:
        res = store.db.collection("patients").count().get()
        print("Count result format:", res)
        try:
            print("Value:", res[0][0].value)
        except Exception as e:
            print("Error accessing value:", e)
    except Exception as e:
        print("Error doing count:", e)

if __name__ == "__main__":
    test()