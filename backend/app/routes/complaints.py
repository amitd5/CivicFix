import os
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_current_user, require_admin

from app.services.ai.classifier import classify_complaint
from app.services.ai.priority import classify_priority
from app.services.ai.department import classify_department
from app.services.ai.duplicate import (
    calculate_text_similarity,
    calculate_distance_km,
)
from app.services.ai.duplicate import detect_duplicate


from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintStatusHistory
from app.models.complaint_response import ComplaintResponse as ComplaintResponseModel
from app.models.notification import Notification
from app.models.user import User



from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintUpdate,
    ComplaintStatusUpdate,
    ComplaintAssignment,
)

from app.schemas.complaint_response import (
    ComplaintResponseCreate,
    ComplaintResponseOut,
)


router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"],
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
# CONSTANTS
# =========================================================

ALLOWED_STATUSES = [
    "submitted",
    "under_review",
    "in_progress",
    "resolved",
]

ALLOWED_PRIORITIES = [
    "low",
    "medium",
    "high",
]

ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
]

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post(
    "",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_complaint(
    complaint: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # CLEAN INPUT
    # -----------------------------------------------------

    title = complaint.title.strip()
    description = complaint.description.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint title cannot be empty",
        )

    if not description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint description cannot be empty",
        )

    # -----------------------------------------------------
    # AI CATEGORY CLASSIFICATION
    # -----------------------------------------------------

    category_result = classify_complaint(
        title,
        description,
    )

    detected_category = category_result["category"]
    category_confidence = category_result["confidence"]

    # -----------------------------------------------------
    # AI PRIORITY CLASSIFICATION
    # -----------------------------------------------------

    priority_result = classify_priority(
        title,
        description,
    )

    detected_priority = priority_result["priority"]
    priority_confidence = priority_result["confidence"]

    # -----------------------------------------------------
    # AI DEPARTMENT CLASSIFICATION
    # -----------------------------------------------------

    department_result = classify_department(
        detected_category
    )

    detected_department = department_result["department"]
    department_confidence = department_result["confidence"]

    # -----------------------------------------------------
    # DUPLICATE COMPLAINT DETECTION
    # -----------------------------------------------------

    recent_complaints = (
        db.query(Complaint)
        .filter(
            Complaint.status != "resolved",
            Complaint.category == detected_category,
        )
        .order_by(Complaint.created_at.desc())
        .limit(100)
        .all()
    )

    for existing_complaint in recent_complaints:

        text_similarity = calculate_text_similarity(
            title,
            description,
            existing_complaint.title,
            existing_complaint.description,
        )

        # -------------------------------------------------
        # CALCULATE DISTANCE
        # -------------------------------------------------

        if (
            complaint.latitude is None
            or complaint.longitude is None
            or existing_complaint.latitude is None
            or existing_complaint.longitude is None
        ):
            distance_km = None

        else:
            distance_km = calculate_distance_km(
                complaint.latitude,
                complaint.longitude,
                existing_complaint.latitude,
                existing_complaint.longitude,
            )

        # -------------------------------------------------
        # DUPLICATE DECISION
        # -------------------------------------------------

        if (
            text_similarity >= 0.85
            and distance_km is not None
            and distance_km <= 0.10
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Possible duplicate complaint detected",
                    "existing_complaint_id": existing_complaint.id,
                    "similarity": text_similarity,
                    "distance_km": distance_km,
                },
            )

    # -----------------------------------------------------
    # CREATE COMPLAINT
    # -----------------------------------------------------

    new_complaint = Complaint(
        title=title,
        description=description,

        # AI-detected values
        category=detected_category,
        priority=detected_priority,
        department=detected_department,

        # AI confidence values
        category_confidence=category_confidence,
        priority_confidence=priority_confidence,
        department_confidence=department_confidence,

        latitude=complaint.latitude,
        longitude=complaint.longitude,
        image_url=complaint.image_url,

        status="submitted",
        created_by=current_user.id,
    )

    # -----------------------------------------------------
    # SAVE COMPLAINT
    # -----------------------------------------------------

    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)

    # -----------------------------------------------------
    # CREATE ADMIN NOTIFICATIONS
    # -----------------------------------------------------

    admins = (
        db.query(User)
        .filter(User.role == "admin")
        .all()
    )

    for admin in admins:
        admin_notification = Notification(
            user_id=admin.id,
            complaint_id=new_complaint.id,
            type="new_complaint",
            message=(
                f"New complaint #{new_complaint.id} "
                f"has been submitted."
            ),
        )

        db.add(admin_notification)

    # -----------------------------------------------------
    # SAVE NOTIFICATIONS
    # -----------------------------------------------------

    db.commit()

    # -----------------------------------------------------
    # RETURN
    # -----------------------------------------------------

    return new_complaint

# =========================================================
# GET COMPLAINTS
# FILTERS + PAGINATION
# =========================================================

@router.get(
    "",
    response_model=list[ComplaintResponse],
)
def get_complaints(
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    category: str | None = None,
    priority: str | None = None,
    department: str | None = None,
    page: int = Query(
        default=1,
        ge=1,
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Complaint)

    # -----------------------------------------------------
    # ROLE-BASED ACCESS
    # -----------------------------------------------------

    if current_user.role != "admin":
        query = query.filter(
            Complaint.created_by == current_user.id
        )

    # -----------------------------------------------------
    # STATUS FILTER
    # -----------------------------------------------------

    if status_filter is not None:

        if status_filter not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Invalid status",
                    "allowed_statuses": ALLOWED_STATUSES,
                },
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

        if priority not in ALLOWED_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Invalid priority",
                    "allowed_priorities": ALLOWED_PRIORITIES,
                },
            )

        query = query.filter(
            Complaint.priority == priority
        )
    
    # -----------------------------------------------------
    # DEPARTMENT FILTER
    # -----------------------------------------------------

    if department is not None:
        query = query.filter(
            Complaint.department == department
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


# =========================================================
# GET SINGLE COMPLAINT
# =========================================================

@router.get(
    "/{complaint_id}",
    response_model=ComplaintResponse,
)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # PERMISSION
    # -----------------------------------------------------

    if (
        complaint.created_by != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this complaint",
        )

    return complaint


# =========================================================
# UPDATE COMPLAINT
# =========================================================

@router.put(
    "/{complaint_id}",
    response_model=ComplaintResponse,
)
def update_complaint(
    complaint_id: int,
    complaint_data: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # PERMISSION
    # -----------------------------------------------------

    if (
        complaint.created_by != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this complaint",
        )

    # -----------------------------------------------------
    # VALIDATE PRIORITY
    # -----------------------------------------------------

    if complaint_data.priority not in ALLOWED_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid priority",
                "allowed_priorities": ALLOWED_PRIORITIES,
            },
        )

    # -----------------------------------------------------
    # UPDATE FIELDS
    # -----------------------------------------------------

    complaint.title = complaint_data.title.strip()
    complaint.description = complaint_data.description.strip()
    complaint.category = complaint_data.category.strip()
    complaint.priority = complaint_data.priority
    complaint.latitude = complaint_data.latitude
    complaint.longitude = complaint_data.longitude
    complaint.image_url = complaint_data.image_url

    db.commit()
    db.refresh(complaint)

    return complaint


# =========================================================
# DELETE COMPLAINT
# =========================================================

@router.delete(
    "/{complaint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # PERMISSION
    # -----------------------------------------------------

    if (
        complaint.created_by != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this complaint",
        )

    db.delete(complaint)
    db.commit()

    return None


# =========================================================
# ADMIN - UPDATE COMPLAINT STATUS
# =========================================================

@router.patch(
    "/{complaint_id}/status",
    response_model=ComplaintResponse,
)
def update_complaint_status(
    complaint_id: int,
    status_data: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # VALIDATE STATUS
    # -----------------------------------------------------

    if status_data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid status",
                "allowed_statuses": ALLOWED_STATUSES,
            },
        )

    # -----------------------------------------------------
    # SAVE OLD STATUS
    # -----------------------------------------------------

    old_status = complaint.status
    new_status = status_data.status

    # -----------------------------------------------------
    # NO-OP PROTECTION
    # -----------------------------------------------------

    if old_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint is already in this status",
        )

    # -----------------------------------------------------
    # UPDATE STATUS
    # -----------------------------------------------------

    complaint.status = new_status

    # -----------------------------------------------------
    # CREATE STATUS HISTORY
    # -----------------------------------------------------

    history = ComplaintStatusHistory(
        complaint_id=complaint.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=current_user.id,
    )

    db.add(history)

    # -----------------------------------------------------
    # CREATE STATUS NOTIFICATION
    # -----------------------------------------------------

    status_notification = Notification(
        user_id=complaint.created_by,
        complaint_id=complaint.id,
        type="status_changed",
        message=(
            f"Your complaint #{complaint.id} status "
            f"changed from '{old_status}' to '{new_status}'."
        ),
    )

    db.add(status_notification)

    # -----------------------------------------------------
    # CREATE RESOLVED NOTIFICATION
    # -----------------------------------------------------

    if new_status == "resolved":
        resolved_notification = Notification(
            user_id=complaint.created_by,
            complaint_id=complaint.id,
            type="complaint_resolved",
            message=(
                f"Your complaint #{complaint.id} "
                "has been resolved."
            ),
        )

        db.add(resolved_notification)

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    db.commit()
    db.refresh(complaint)

    return complaint


# =========================================================
# ADMIN - ASSIGN COMPLAINT
# =========================================================

@router.patch(
    "/{complaint_id}/assign",
    response_model=ComplaintResponse,
)
def assign_complaint(
    complaint_id: int,
    assignment: ComplaintAssignment,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    # -----------------------------------------------------
    # ADMIN CHECK
    # -----------------------------------------------------

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign complaints",
        )

    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # FIND ASSIGNED USER
    # -----------------------------------------------------

    assigned_user = (
        db.query(User)
        .filter(
            User.id == assignment.assigned_to
        )
        .first()
    )

    if not assigned_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned user not found",
        )

    # -----------------------------------------------------
    # ASSIGN COMPLAINT
    # -----------------------------------------------------

    complaint.assigned_to = assigned_user.id

    # -----------------------------------------------------
    # NOTIFICATION
    # -----------------------------------------------------

    notification = Notification(
        user_id=assigned_user.id,
        complaint_id=complaint.id,
        type="complaint_assigned",
        message=(
            f"Complaint #{complaint.id} has been assigned to you."
        ),
    )

    db.add(notification)

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    db.commit()
    db.refresh(complaint)

    return complaint

# =========================================================
# GET COMPLAINT STATUS HISTORY
# =========================================================

@router.get(
    "/{complaint_id}/history",
)
def get_complaint_history(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # PERMISSION
    # -----------------------------------------------------

    if (
        complaint.created_by != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this complaint history",
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


# =========================================================
# ADMIN - ADD COMPLAINT RESPONSE
# =========================================================

@router.post(
    "/{complaint_id}/responses",
    response_model=ComplaintResponseOut,
)
def create_complaint_response(
    complaint_id: int,
    response_data: ComplaintResponseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # ADMIN CHECK
    # -----------------------------------------------------

    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can respond to complaints",
        )

    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # VALIDATE MESSAGE
    # -----------------------------------------------------

    message = response_data.message.strip()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Response message cannot be empty",
        )

    if len(message) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Response message cannot exceed 5000 characters",
        )

    # -----------------------------------------------------
    # CREATE RESPONSE
    # -----------------------------------------------------

    complaint_response = ComplaintResponseModel(
        complaint_id=complaint.id,
        responded_by=current_user.id,
        message=message,
    )

    db.add(complaint_response)

    # -----------------------------------------------------
    # CREATE ADMIN RESPONSE NOTIFICATION
    # -----------------------------------------------------

    notification = Notification(
        user_id=complaint.created_by,
        complaint_id=complaint.id,
        type="admin_response",
        message=(
            f"An administrator responded to "
            f"your complaint #{complaint.id}."
        ),
    )

    db.add(notification)

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    db.commit()
    db.refresh(complaint_response)

    # -----------------------------------------------------
    # RETURN RESPONSE
    # -----------------------------------------------------

    return {
        "id": complaint_response.id,
        "complaint_id": complaint_response.complaint_id,
        "responded_by": complaint_response.responded_by,
        "responder_name": current_user.name,
        "message": complaint_response.message,
        "created_at": complaint_response.created_at,
    }


# =========================================================
# GET COMPLAINT RESPONSES
# =========================================================

@router.get(
    "/{complaint_id}/responses",
    response_model=list[ComplaintResponseOut],
)
def get_complaint_responses(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # PERMISSION
    # -----------------------------------------------------

    if (
        complaint.created_by != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view responses",
        )

    # -----------------------------------------------------
    # GET RESPONSES
    # -----------------------------------------------------

    responses = (
        db.query(
            ComplaintResponseModel,
            User.name.label("responder_name"),
        )
        .join(
            User,
            User.id == ComplaintResponseModel.responded_by,
        )
        .filter(
            ComplaintResponseModel.complaint_id == complaint_id
        )
        .order_by(
            ComplaintResponseModel.created_at.asc()
        )
        .all()
    )

    # -----------------------------------------------------
    # RETURN RESPONSES
    # -----------------------------------------------------

    return [
        {
            "id": response.id,
            "complaint_id": response.complaint_id,
            "responded_by": response.responded_by,
            "responder_name": responder_name,
            "message": response.message,
            "created_at": response.created_at,
        }
        for response, responder_name in responses
    ]


# =========================================================
# UPLOAD COMPLAINT IMAGE
# =========================================================

@router.post(
    "/{complaint_id}/image",
)
async def upload_complaint_image(
    complaint_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # FIND COMPLAINT
    # -----------------------------------------------------

    complaint = (
        db.query(Complaint)
        .filter(
            Complaint.id == complaint_id
        )
        .first()
    )

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        )

    # -----------------------------------------------------
    # PERMISSION
    # -----------------------------------------------------

    if (
        complaint.created_by != current_user.id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload an image for this complaint",
        )

    # -----------------------------------------------------
    # VALIDATE CONTENT TYPE
    # -----------------------------------------------------

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid image type",
                "allowed_types": ALLOWED_IMAGE_TYPES,
            },
        )

    # -----------------------------------------------------
    # READ FILE
    # -----------------------------------------------------

    contents = await file.read()

    # -----------------------------------------------------
    # VALIDATE FILE SIZE
    # -----------------------------------------------------

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size cannot exceed 5 MB",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is empty",
        )

    # -----------------------------------------------------
    # CREATE UPLOAD DIRECTORY
    # -----------------------------------------------------

    upload_directory = "app/uploads/complaints"

    os.makedirs(
        upload_directory,
        exist_ok=True,
    )

    # -----------------------------------------------------
    # GET FILE EXTENSION
    # -----------------------------------------------------

    original_filename = file.filename or ""

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    allowed_extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    # Use MIME type instead of trusting the original extension.
    extension = allowed_extensions[file.content_type]

    # -----------------------------------------------------
    # GENERATE UNIQUE FILE NAME
    # -----------------------------------------------------

    filename = f"{uuid.uuid4()}{extension}"

    file_path = os.path.join(
        upload_directory,
        filename,
    )

    # -----------------------------------------------------
    # SAVE FILE
    # -----------------------------------------------------

    with open(
        file_path,
        "wb",
    ) as buffer:
        buffer.write(contents)

    # -----------------------------------------------------
    # SAVE IMAGE URL
    # -----------------------------------------------------

    image_url = f"/uploads/complaints/{filename}"

    complaint.image_url = image_url

    db.commit()
    db.refresh(complaint)

    # -----------------------------------------------------
    # RETURN RESPONSE
    # -----------------------------------------------------

    return {
        "message": "Image uploaded successfully",
        "complaint_id": complaint.id,
        "image_url": image_url,
    }