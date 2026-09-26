from datetime import datetime

from pydantic import BaseModel


class ComplaintResponseCreate(BaseModel):
    message: str


class ComplaintResponseOut(BaseModel):
    id: int
    complaint_id: int
    responded_by: int
    responder_name: str
    message: str
    created_at: datetime