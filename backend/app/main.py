from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.staticfiles import StaticFiles

from app.routes.auth import router as auth_router
from app.routes.complaints import router as complaints_router
from app.routes.admin import router as admin_router
from app.routes.notifications import router as notifications_router
from app.models.user import User
from app.models.complaint import Complaint
from app.models.complaint_history import ComplaintStatusHistory
from app.models.complaint_response import ComplaintResponse
from app.models.notification import Notification


app = FastAPI(
    title="CivicFix API",
    description="Civic complaint management backend",
    version="1.0.0",
)


# =========================================================
# STATIC FILES / UPLOADED COMPLAINT IMAGES
# =========================================================

# =========================================================
# STATIC FILES / UPLOADED COMPLAINT IMAGES
# =========================================================

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)

# =========================================================
# CORS
# =========================================================

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:5178",
    "http://127.0.0.1:5178",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(admin_router)
app.include_router(notifications_router)


@app.get("/")
def root():
    return {
        "message": "CivicFix API is running"
    }