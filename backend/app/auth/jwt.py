from datetime import datetime, timedelta
from jose import JWTError, jwt
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def _require_secret() -> str:
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not set (check backend .env)")
    return SECRET_KEY


def create_access_token(data: dict) -> str:
    key = _require_secret()
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _require_secret(), algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
