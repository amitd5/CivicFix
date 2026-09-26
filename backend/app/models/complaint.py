from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(50),
        nullable=False
    )

    priority = Column(
        String(20),
        default="medium",
        nullable=False
    )

    category_confidence = Column(
        Float,
        nullable=True
    )

    priority_confidence = Column(
        Float,
        nullable=True
    )

    department = Column(
        String(100),
        nullable=True
    )

    department_confidence = Column(
        Float,
        nullable=True
    )

    status = Column(
        String(30),
        default="submitted",
        nullable=False
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    image_url = Column(
        String(500),
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    assigned_to = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )