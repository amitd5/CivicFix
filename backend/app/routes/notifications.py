from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_current_user

from app.models.notification import Notification

from app.schemas.notification import (
    NotificationResponse,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


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
# GET NOTIFICATIONS
# =========================================================

@router.get(
    "",
    response_model=list[NotificationResponse],
)
def get_notifications(
    unread_only: bool = Query(
        default=False
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id
        )
    )

    # -----------------------------------------------------
    # UNREAD FILTER
    # -----------------------------------------------------

    if unread_only:
        query = query.filter(
            Notification.is_read == False
        )

    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------

    offset = (page - 1) * limit

    notifications = (
        query
        .order_by(
            Notification.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return notifications


# =========================================================
# GET UNREAD COUNT
# =========================================================

@router.get(
    "/unread-count",
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .count()
    )

    return {
        "unread_count": count
    }


# =========================================================
# MARK NOTIFICATION AS READ
# =========================================================

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@router.patch(
    "/read-all",
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update(
            {
                Notification.is_read: True
            },
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count,
    }