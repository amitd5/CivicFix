# =========================================================
# CIVICFIX AI - DUPLICATE COMPLAINT DETECTOR
# =========================================================

import math
import re
from difflib import SequenceMatcher


# =========================================================
# CONFIGURATION
# =========================================================

TEXT_SIMILARITY_THRESHOLD = 0.60
LOCATION_DISTANCE_THRESHOLD_KM = 0.50


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize_text(text: str) -> str:
    """
    Normalize complaint text for similarity comparison.
    """

    text = text.lower()

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# =========================================================
# TEXT SIMILARITY
# =========================================================

def calculate_text_similarity(
    title_a: str,
    description_a: str,
    title_b: str,
    description_b: str,
) -> float:
    """
    Calculate similarity between two complaints.

    Uses Python's built-in SequenceMatcher.
    """

    text_a = normalize_text(
        f"{title_a} {description_a}"
    )

    text_b = normalize_text(
        f"{title_b} {description_b}"
    )

    if not text_a or not text_b:
        return 0.0

    similarity = SequenceMatcher(
        None,
        text_a,
        text_b,
    ).ratio()

    return round(similarity, 2)


# =========================================================
# LOCATION DISTANCE
# =========================================================

def calculate_distance_km(
    latitude_a: float | None,
    longitude_a: float | None,
    latitude_b: float | None,
    longitude_b: float | None,
) -> float | None:
    """
    Calculate approximate distance between two coordinates
    using the Haversine formula.

    Returns distance in kilometers.
    """

    if (
        latitude_a is None
        or longitude_a is None
        or latitude_b is None
        or longitude_b is None
    ):
        return None

    earth_radius_km = 6371.0

    lat1 = math.radians(latitude_a)
    lat2 = math.radians(latitude_b)

    delta_lat = math.radians(
        latitude_b - latitude_a
    )

    delta_lon = math.radians(
        longitude_b - longitude_a
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return round(
        earth_radius_km * c,
        3,
    )


# =========================================================
# DUPLICATE SCORE
# =========================================================

def calculate_duplicate_score(
    text_similarity: float,
    distance_km: float | None,
    same_category: bool,
) -> float:
    """
    Calculate overall duplicate likelihood.

    Scoring:
        60% text similarity
        30% location similarity
        10% category match
    """

    text_score = text_similarity * 0.60

    if distance_km is None:
        location_score = 0.0
    elif distance_km <= LOCATION_DISTANCE_THRESHOLD_KM:
        location_score = 0.30
    else:
        location_score = 0.0

    category_score = (
        0.10
        if same_category
        else 0.0
    )

    score = (
        text_score
        + location_score
        + category_score
    )

    return round(
        min(score, 1.0),
        2,
    )


# =========================================================
# DUPLICATE CLASSIFICATION
# =========================================================

def detect_duplicate(
    title: str,
    description: str,
    category: str,
    latitude: float | None,
    longitude: float | None,
    existing_complaint,
) -> dict:
    """
    Compare a new complaint against an existing complaint.

    Returns:

        {
            "is_duplicate": bool,
            "confidence": float,
            "text_similarity": float,
            "distance_km": float | None,
            "same_category": bool,
        }
    """

    text_similarity = calculate_text_similarity(
        title,
        description,
        existing_complaint.title,
        existing_complaint.description,
    )

    distance_km = calculate_distance_km(
        latitude,
        longitude,
        existing_complaint.latitude,
        existing_complaint.longitude,
    )

    same_category = (
        normalize_text(category)
        == normalize_text(
            existing_complaint.category
        )
    )

    duplicate_score = calculate_duplicate_score(
        text_similarity=text_similarity,
        distance_km=distance_km,
        same_category=same_category,
    )

    # Strong textual similarity is enough to identify
    # a likely duplicate even when location is unavailable.
    is_duplicate = (
        text_similarity >= TEXT_SIMILARITY_THRESHOLD
        and (
            distance_km is None
            or distance_km <= LOCATION_DISTANCE_THRESHOLD_KM
        )
    )

    return {
        "is_duplicate": is_duplicate,
        "confidence": duplicate_score,
        "text_similarity": text_similarity,
        "distance_km": distance_km,
        "same_category": same_category,
    }