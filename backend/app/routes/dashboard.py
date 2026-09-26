from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_current_user
from app.models.complaint import Complaint
from app.schemas.dashboard import DashboardResponse


router = APIRouter(
    prefix="/admin",
    tags=["Admin Dashboard"]
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
# ADMIN DASHBOARD
# =========================================================

@router.get(
    "/dashboard",
    response_model=DashboardResponse
)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    # -----------------------------------------------------
    # ADMIN CHECK
    # -----------------------------------------------------

    if current_user.role != "admin":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access the dashboard"
        )

    # -----------------------------------------------------
    # TOTAL COMPLAINTS
    # -----------------------------------------------------

    total_complaints = (
        db.query(Complaint)
        .count()
    )

    # -----------------------------------------------------
    # STATUS COUNTS
    # -----------------------------------------------------

    submitted = (
        db.query(Complaint)
        .filter(
            Complaint.status == "submitted"
        )
        .count()
    )

    under_review = (
        db.query(Complaint)
        .filter(
            Complaint.status == "under_review"
        )
        .count()
    )

    in_progress = (
        db.query(Complaint)
        .filter(
            Complaint.status == "in_progress"
        )
        .count()
    )

    resolved = (
        db.query(Complaint)
        .filter(
            Complaint.status == "resolved"
        )
        .count()
    )

    # -----------------------------------------------------
    # PRIORITY COUNTS
    # -----------------------------------------------------

    high_priority = (
        db.query(Complaint)
        .filter(
            Complaint.priority == "high"
        )
        .count()
    )

    medium_priority = (
        db.query(Complaint)
        .filter(
            Complaint.priority == "medium"
        )
        .count()
    )

    low_priority = (
        db.query(Complaint)
        .filter(
            Complaint.priority == "low"
        )
        .count()
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "total_complaints": total_complaints,

        "submitted": submitted,
        "under_review": under_review,
        "in_progress": in_progress,
        "resolved": resolved,

        "high_priority": high_priority,
        "medium_priority": medium_priority,
        "low_priority": low_priority
    }