from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_complaints: int

    submitted: int
    under_review: int
    in_progress: int
    resolved: int

    high_priority: int
    medium_priority: int
    low_priority: int