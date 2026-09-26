import re


# =========================================================
# PRIORITY KEYWORDS
# =========================================================

HIGH_PRIORITY_KEYWORDS = [
    "danger",
    "dangerous",
    "accident",
    "accidents",
    "injury",
    "injured",
    "life threatening",
    "life-threatening",
    "emergency",
    "fire",
    "flood",
    "collapsed",
    "collapse",
    "broken bridge",
    "open manhole",
    "electric shock",
    "exposed wire",
    "short circuit",
    "gas leak",
    "major damage",
    "severe damage",
    "blocked road",
    "road blocked",
]

MEDIUM_PRIORITY_KEYWORDS = [
    "damaged",
    "damage",
    "broken",
    "not working",
    "leaking",
    "leak",
    "pothole",
    "garbage",
    "overflow",
    "street light",
    "streetlight",
    "traffic",
    "congestion",
    "drainage",
]


# =========================================================
# PRIORITY CLASSIFIER
# =========================================================

def classify_priority(title: str, description: str) -> dict:
    """
    Determine complaint priority using keyword-based scoring.

    Returns:
        {
            "priority": "low" | "medium" | "high",
            "confidence": float,
            "matched_keywords": list[str]
        }
    """

    text = f"{title} {description}".lower()

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    high_matches = [
        keyword
        for keyword in HIGH_PRIORITY_KEYWORDS
        if keyword in text
    ]

    medium_matches = [
        keyword
        for keyword in MEDIUM_PRIORITY_KEYWORDS
        if keyword in text
    ]

    # =====================================================
    # HIGH PRIORITY
    # =====================================================

    if high_matches:
        confidence = min(
            1.0,
            0.7 + (0.1 * len(high_matches))
        )

        return {
            "priority": "high",
            "confidence": round(confidence, 2),
            "matched_keywords": high_matches,
        }

    # =====================================================
    # MEDIUM PRIORITY
    # =====================================================

    if medium_matches:
        confidence = min(
            1.0,
            0.6 + (0.1 * len(medium_matches))
        )

        return {
            "priority": "medium",
            "confidence": round(confidence, 2),
            "matched_keywords": medium_matches,
        }

    # =====================================================
    # LOW PRIORITY
    # =====================================================

    return {
        "priority": "low",
        "confidence": 0.5,
        "matched_keywords": [],
    }