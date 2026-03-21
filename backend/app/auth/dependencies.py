from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.jwt import verify_token
from app.domain_types import User, UserRole
from app.fs_client import get_store
from app.firestore_store import Store

security = HTTPBearer(auto_error=False)

unauthorized_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={
        "success": False,
        "message": "Not authenticated",
        "detail": "Invalid or expired token",
    },
)

forbidden_exc = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail={
        "success": False,
        "message": "Access denied",
        "detail": "Insufficient permissions",
    },
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    store: Store = Depends(get_store),
) -> User:
    if not credentials or not credentials.credentials:
        raise unauthorized_exc

    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise unauthorized_exc

    user_id = payload.get("sub")
    if not user_id:
        raise unauthorized_exc

    try:
        uid = str(UUID(str(user_id)))
    except (ValueError, TypeError):
        raise unauthorized_exc

    raw = store.user_get(uid)
    if not raw:
        raise unauthorized_exc

    return User.from_firestore(uid, {k: v for k, v in raw.items() if k != "id"})


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise forbidden_exc
    return current_user


def require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.doctor:
        raise forbidden_exc
    return current_user


def require_patient(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.patient:
        raise forbidden_exc
    return current_user


def require_admin_or_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.admin, UserRole.doctor]:
        raise forbidden_exc
    return current_user
