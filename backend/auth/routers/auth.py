import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..database import get_connection
from ..schemas import AuthResponse, UserCreate, UserLogin, UserOut
from ..security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
    rate_limiter,
    decode_expired_access_token,
)

router = APIRouter()


def row_to_user(row: sqlite3.Row) -> UserOut:
    return UserOut(id=row["id"], name=row["name"], email=row["email"])


def issue_auth_response(row: sqlite3.Row) -> AuthResponse:
    user = row_to_user(row)
    token = create_access_token(subject=str(user.id), extra_claims={"email": user.email})
    return AuthResponse(access_token=token, user=user)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post(
    "/auth/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limiter(limit=5, window=60))],
)
def create_account(payload: UserCreate) -> AuthResponse:
    name = payload.name.strip()
    email = payload.email.lower()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name is required",
        )

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash)
                VALUES (?, ?, ?)
                """,
                (name, email, hash_password(payload.password)),
            )
            row = connection.execute(
                "SELECT id, name, email FROM users WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        ) from exc

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create account",
        )

    return issue_auth_response(row)


@router.post(
    "/auth/login",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limiter(limit=10, window=60))],
)
def sign_in(payload: UserLogin) -> AuthResponse:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (payload.email.lower(),),
        ).fetchone()

    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return issue_auth_response(row)


@router.get("/auth/me", response_model=UserOut)
def current_user(claims: dict = Depends(decode_access_token)) -> UserOut:
    user_id = claims.get("sub")
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return row_to_user(row)


@router.post(
    "/auth/refresh",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limiter(limit=15, window=60))],
)
def refresh_token(claims: dict = Depends(decode_expired_access_token)) -> AuthResponse:
    user_id = claims.get("sub")
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return issue_auth_response(row)
