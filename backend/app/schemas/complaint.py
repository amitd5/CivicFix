from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# =========================================================
# CREATE COMPLAINT
# =========================================================

class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    latitude: float
    longitude: float
    image_url: Optional[str] = None


# =========================================================
# UPDATE COMPLAINT
# =========================================================

# =========================================================
# UPDATE COMPLAINT
# =========================================================

class ComplaintUpdate(BaseModel):
    title: str
    description: str
    category: str
    priority: str
    latitude: float
    longitude: float
    image_url: Optional[str] = None


# =========================================================
# COMPLAINT STATUS UPDATE
# =========================================================

class ComplaintStatusUpdate(BaseModel):
    status: str

# =========================================================
# COMPLAINT ASSIGNMENT
# =========================================================

class ComplaintAssignment(BaseModel):
    assigned_to: int

# =========================================================
# COMPLAINT RESPONSE
# =========================================================

class ComplaintResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    category_confidence: Optional[float] = None
    priority: str
    priority_confidence: Optional[float] = None
    department: Optional[str] = None
    department_confidence: Optional[float] = None
    status: str
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    created_by: int
    assigned_to: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# =========================================================
# COMPLAINT STATUS HISTORY RESPONSE
# =========================================================

class ComplaintStatusHistoryResponse(BaseModel):
    id: int
    complaint_id: int
    old_status: str
    new_status: str
    changed_by: int
    changed_at: datetime

    class Config:
        from_attributes = True