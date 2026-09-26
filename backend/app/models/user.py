from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(20),
        default="citizen",
        nullable=False
    )

    # =====================================================
    # EMAIL VERIFICATION
    # =====================================================

    is_verified = Column(
        Boolean,
        default=False,
        nullable=False
    )

    verification_otp = Column(
        String(6),
        nullable=True
    )

    otp_expires_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # =====================================================
    # CREATED AT
    # =====================================================

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # =====================================================
    # PASSWORD RESET
    # =====================================================

    reset_token = Column(
        String(255),
        nullable=True,
        unique=True
    )

    reset_token_expires_at = Column(
        DateTime(timezone=True),
        nullable=True
    )