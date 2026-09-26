from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_current_user

from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintStatusHistory

from app.schemas.complaint_history import ComplaintHistoryResponse


router = APIRouter(
    prefix="/complaints",
    tags=["Complaint History"]
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
# GET COMPLAINT STATUS HISTORY
# =========================================================

@router.get(
    "/{complaint_id}/history",
    response_model=list[ComplaintHistoryResponse]
)
def get_complaint_history(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(Complaint.id == complaint_id)
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )

    # -----------------------------------------------------
    # ROLE-BASED ACCESS
    # -----------------------------------------------------

    if (
        current_user.role != "admin"
        and complaint.created_by != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this complaint history"
        )

    # -----------------------------------------------------
    # GET HISTORY
    # -----------------------------------------------------

    history = (
        db.query(ComplaintStatusHistory)
        .filter(
            ComplaintStatusHistory.complaint_id == complaint_id
        )
        .order_by(
            ComplaintStatusHistory.changed_at.asc()
        )
        .all()
    )

    return history