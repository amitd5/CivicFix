import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Form
from datetime import datetime, timezone
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.user import User
from app.services.email import (
    generate_otp,
    otp_expiry,
    send_otp_email,
    send_password_reset_email,
)
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

def generate_reset_token():
    return secrets.token_urlsafe(32)

# =========================================================
# DATABASE DEPENDENCY
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()



# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
async def register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    # -----------------------------------------------------
    # CLEAN INPUT
    # -----------------------------------------------------

    name = name.strip()
    email = email.strip().lower()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email cannot be empty",
        )

    # -----------------------------------------------------
    # CHECK EXISTING USER
    # -----------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:

        if existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Existing but unverified account
        otp = generate_otp()

        existing_user.verification_otp = otp
        existing_user.otp_expires_at = otp_expiry()

        db.commit()

        # Send new OTP
        await send_otp_email(
            email,
            otp,
        )

        return {
            "message": "A new verification OTP has been sent to your email",
            "email": email,
            "requires_verification": True,
        }

    # -----------------------------------------------------
    # GENERATE OTP
    # -----------------------------------------------------

    otp = generate_otp()

    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------

    new_user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role="citizen",

        # Email verification
        is_verified=False,
        verification_otp=otp,
        otp_expires_at=otp_expiry(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # -----------------------------------------------------
    # SEND OTP
    # -----------------------------------------------------

    await send_otp_email(
        email,
        otp,
    )

    # -----------------------------------------------------
    # RETURN
    # -----------------------------------------------------

    return {
        "message": "Registration successful. Please verify your email.",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "requires_verification": True,
    }


# =========================================================
# VERIFY EMAIL OTP
# =========================================================

@router.post("/verify-email")
def verify_email(
    email: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()
    otp = otp.strip()

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # -----------------------------------------------------
    # ALREADY VERIFIED
    # -----------------------------------------------------

    if user.is_verified:
        return {
            "message": "Email already verified",
        }

    # -----------------------------------------------------
    # CHECK OTP
    # -----------------------------------------------------

    if not user.verification_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification OTP found",
        )

    if user.verification_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    # -----------------------------------------------------
    # CHECK EXPIRY
    # -----------------------------------------------------

    if (
        not user.otp_expires_at
        or user.otp_expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired",
        )

    # -----------------------------------------------------
    # VERIFY USER
    # -----------------------------------------------------

    user.is_verified = True
    user.verification_otp = None
    user.otp_expires_at = None

    db.commit()
    db.refresh(user)

    return {
        "message": "Email verified successfully",
        "user_id": user.id,
        "email": user.email,
    }


# =========================================================
# RESEND OTP
# =========================================================

@router.post("/resend-otp")
async def resend_otp(
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified",
        )

    # -----------------------------------------------------
    # GENERATE NEW OTP
    # -----------------------------------------------------

    otp = generate_otp()

    user.verification_otp = otp
    user.otp_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=10)
    )

    db.commit()

    # -----------------------------------------------------
    # SEND EMAIL
    # -----------------------------------------------------

    try:

        await send_otp_email(
            recipient_email=user.email,
            otp=otp,
        )

    except Exception as e:

        print("EMAIL ERROR:", e)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send verification email",
        )

    return {
        "message": "New OTP sent to your email",
        "email": user.email,
    }


    # -----------------------------------------------------
    # CLEAN INPUT
    # -----------------------------------------------------

    email = email.strip().lower()
    otp = otp.strip()

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # -----------------------------------------------------
    # ALREADY VERIFIED
    # -----------------------------------------------------

    if user.is_verified:
        return {
            "message": "Email is already verified",
            "verified": True,
        }

    # -----------------------------------------------------
    # CHECK OTP EXISTS
    # -----------------------------------------------------

    if not user.verification_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification OTP found. Please request a new OTP.",
        )

    # -----------------------------------------------------
    # CHECK OTP EXPIRY
    # -----------------------------------------------------

    if (
        not user.otp_expires_at
        or user.otp_expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP.",
        )

    # -----------------------------------------------------
    # CHECK OTP
    # -----------------------------------------------------

    if user.verification_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    # -----------------------------------------------------
    # VERIFY USER
    # -----------------------------------------------------

    user.is_verified = True

    # Clear OTP after successful verification
    user.verification_otp = None
    user.otp_expires_at = None

    db.commit()
    db.refresh(user)

    # -----------------------------------------------------
    # RETURN
    # -----------------------------------------------------

    return {
        "message": "Email verified successfully",
        "verified": True,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
    }

# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post("/forgot-password")
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    # Don't reveal whether an email exists
    if not user:
        return {
            "message": "If an account exists with this email, a password recovery link has been sent."
        }

    # Generate secure reset token
    reset_token = generate_reset_token()

    # Token valid for 15 minutes
    reset_expiry = (
        datetime.now(timezone.utc)
        + timedelta(minutes=15)
    )

    user.reset_token = reset_token
    user.reset_token_expires_at = reset_expiry

    db.commit()

    # Recovery link
    frontend_url = "http://localhost:5174"

    reset_link = (
        f"{frontend_url}/reset-password?token={reset_token}"
    )

    # Send email
    try:
        await send_password_reset_email(
            recipient_email=user.email,
            reset_link=reset_link,
        )

    except Exception as e:
        print("PASSWORD RESET EMAIL ERROR:", e)

        # Clear token if email failed
        user.reset_token = None
        user.reset_token_expires_at = None
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send password recovery email",
        )

    return {
        "message": "If an account exists with this email, a password recovery link has been sent."
    }
# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    token: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
):
    token = token.strip()

    user = (
        db.query(User)
        .filter(User.reset_token == token)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link",
        )

    # Check expiry
    if (
        not user.reset_token_expires_at
        or user.reset_token_expires_at < datetime.now(timezone.utc)
    ):
        user.reset_token = None
        user.reset_token_expires_at = None
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired",
        )

    # Update password
    user.password_hash = hash_password(new_password)

    # Token can only be used once
    user.reset_token = None
    user.reset_token_expires_at = None

    db.commit()

    return {
        "message": "Password reset successfully. You can now login with your new password."
    }
# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == form_data.username.strip().lower())
        .first()
    )

    # -----------------------------------------------------
    # USER CHECK
    # -----------------------------------------------------

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # -----------------------------------------------------
    # EMAIL VERIFICATION CHECK
    # -----------------------------------------------------

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )

    # -----------------------------------------------------
    # PASSWORD CHECK
    # -----------------------------------------------------

    if not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # -----------------------------------------------------
    # CREATE JWT
    # -----------------------------------------------------

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }