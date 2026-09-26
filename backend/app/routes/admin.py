from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import require_admin
from app.models.complaint import Complaint
from app.schemas.complaint import ComplaintResponse


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
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
# ADMIN DASHBOARD STATISTICS
# =========================================================

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    total_complaints = db.query(Complaint).count()

    submitted = (
        db.query(Complaint)
        .filter(Complaint.status == "submitted")
        .count()
    )

    under_review = (
        db.query(Complaint)
        .filter(Complaint.status == "under_review")
        .count()
    )

    in_progress = (
        db.query(Complaint)
        .filter(Complaint.status == "in_progress")
        .count()
    )

    resolved = (
        db.query(Complaint)
        .filter(Complaint.status == "resolved")
        .count()
    )

    high_priority = (
        db.query(Complaint)
        .filter(Complaint.priority == "high")
        .count()
    )

    medium_priority = (
        db.query(Complaint)
        .filter(Complaint.priority == "medium")
        .count()
    )

    low_priority = (
        db.query(Complaint)
        .filter(Complaint.priority == "low")
        .count()
    )

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


# =========================================================
# ADMIN - GET ALL COMPLAINTS
# =========================================================

@router.get(
    "/complaints",
    response_model=list[ComplaintResponse]
)
def get_all_complaints(
    page: int = Query(
        default=1,
        ge=1
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status"
    ),
    category: str | None = None,
    priority: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):

    query = db.query(Complaint)

    # -----------------------------------------------------
    # STATUS FILTER
    # -----------------------------------------------------

    if status_filter is not None:

        allowed_statuses = [
            "submitted",
            "under_review",
            "in_progress",
            "resolved"
        ]

        if status_filter not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Invalid status",
                    "allowed_statuses": allowed_statuses
                }
            )

        query = query.filter(
            Complaint.status == status_filter
        )

    # -----------------------------------------------------
    # CATEGORY FILTER
    # -----------------------------------------------------

    if category is not None:
        query = query.filter(
            Complaint.category == category
        )

    # -----------------------------------------------------
    # PRIORITY FILTER
    # -----------------------------------------------------

    if priority is not None:

        allowed_priorities = [
            "low",
            "medium",
            "high"
        ]

        if priority not in allowed_priorities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Invalid priority",
                    "allowed_priorities": allowed_priorities
                }
            )

        query = query.filter(
            Complaint.priority == priority
        )

    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------

    offset = (page - 1) * limit

    complaints = (
        query
        .order_by(Complaint.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return complaints