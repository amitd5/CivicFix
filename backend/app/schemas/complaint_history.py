from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ComplaintHistoryResponse(BaseModel):
    id: int
    complaint_id: int
    old_status: str | None
    new_status: str
    changed_by: int
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)