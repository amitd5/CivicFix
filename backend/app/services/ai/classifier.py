# =========================================================
# CIVICFIX AI - COMPLAINT CATEGORY CLASSIFIER
# =========================================================

import re


CATEGORY_KEYWORDS = {
    "roads": [
        "road",
        "pothole",
        "potholes",
        "street",
        "highway",
        "bridge",
        "footpath",
        "pavement",
        "traffic",
        "road damage",
        "broken road",
    ],

    "streetlight": [
        "street light",
        "streetlight",
        "street lamp",
        "lamp post",
        "light pole",
        "lamp",
        "street lights",
    ],

    "electricity": [
        "electricity",
        "power",
        "power cut",
        "power outage",
        "electric pole",
        "electric wire",
        "transformer",
        "current",
    ],

    "sanitation": [
        "garbage",
        "trash",
        "waste",
        "dump",
        "dirty",
        "sanitation",
        "dustbin",
        "rubbish",
        "garbage collection",
    ],

    "water": [
        "water",
        "water supply",
        "water leakage",
        "water leak",
        "pipeline",
        "pipe",
        "drinking water",
        "sewage",
        "sewer",
    ],

    "drainage": [
        "drain",
        "drainage",
        "flooding",
        "flood",
        "waterlogging",
        "blocked drain",
        "sewer blockage",
    ],

    "public_transport": [
        "bus",
        "bus stop",
        "metro",
        "train",
        "public transport",
        "transport",
        "bus service",
    ],

    "parks": [
        "park",
        "playground",
        "garden",
        "green space",
        "public garden",
    ],

    "noise": [
        "noise",
        "loud music",
        "loudspeaker",
        "sound pollution",
        "construction noise",
    ],
}


def normalize_text(text: str) -> str:
    """
    Normalize complaint text before classification.
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


def classify_complaint(
    title: str,
    description: str,
) -> dict:
    """
    Classify a civic complaint into a category.

    Returns:
        {
            "category": str,
            "confidence": float,
            "matched_keywords": list[str],
        }
    """

    text = normalize_text(
        f"{title} {description}"
    )

    scores = {}

    matched_keywords = {}

    for category, keywords in CATEGORY_KEYWORDS.items():

        score = 0
        matches = []

        for keyword in keywords:

            keyword_normalized = normalize_text(
                keyword
            )

            if keyword_normalized in text:

                # Longer/more specific phrases
                # receive a slightly higher score.
                score += len(
                    keyword_normalized.split()
                )

                matches.append(keyword)

        scores[category] = score
        matched_keywords[category] = matches

    # -----------------------------------------------------
    # NO MATCH
    # -----------------------------------------------------

    if not scores or max(scores.values()) == 0:

        return {
            "category": "other",
            "confidence": 0.0,
            "matched_keywords": [],
        }

    # -----------------------------------------------------
    # BEST CATEGORY
    # -----------------------------------------------------

    best_category = max(
        scores,
        key=scores.get,
    )

    best_score = scores[best_category]

    # -----------------------------------------------------
    # CONFIDENCE
    # -----------------------------------------------------

    total_score = sum(
        scores.values()
    )

    confidence = (
        best_score / total_score
        if total_score > 0
        else 0.0
    )

    return {
        "category": best_category,
        "confidence": round(
            confidence,
            2,
        ),
        "matched_keywords": matched_keywords[
            best_category
        ],
    }