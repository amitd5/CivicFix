# =========================================================
# CIVICFIX AI - DEPARTMENT CLASSIFIER
# =========================================================

DEPARTMENT_MAPPING = {
    "roads": "Public Works Department",
    "streetlight": "Electrical Department",
    "electricity": "Electrical Department",
    "sanitation": "Sanitation Department",
    "water": "Water Supply Department",
    "drainage": "Drainage Department",
    "public_transport": "Transport Department",
    "parks": "Parks & Recreation Department",
    "noise": "Pollution Control Department",
    "other": "General Administration",
}


def classify_department(category: str) -> dict:
    """
    Map an AI-detected complaint category
    to the responsible civic department.

    Returns:
        {
            "department": str,
            "confidence": float
        }
    """

    department = DEPARTMENT_MAPPING.get(
        category,
        "General Administration",
    )

    confidence = (
        1.0
        if category in DEPARTMENT_MAPPING
        else 0.5
    )

    return {
        "department": department,
        "confidence": confidence,
    }