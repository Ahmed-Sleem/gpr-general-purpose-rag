"""
Bilingual Text Normalizer (`src/backend/services/ingestion/normalizer.py`).

Provides character shaping, kerning repair (`fix_kerning`), RTL table reversal repair,
and whitespace/acronym normalization across Arabic and English text blocks.
"""

import re


def is_arabic(s: str) -> bool:
    """Check if string contains Arabic letters."""
    return any("\u0600" <= c <= "\u06FF" for c in s)


def fix_kerning(text: str) -> str:
    """Normalize multi-space kerning and single-letter splits in Arabic words."""
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"([أ-ي]{3,})\s+([أ-ي]{1,2})(?![أ-ي\w])", r"\1\2", text)
    return text


def normalize_table_cell(text: str) -> str:
    """
    Normalize table cells where PDF generators store RTL characters reversed.
    Reverses whole strings when needed while preserving numbers (`100`, `200,000`) and English terms (`TRIR`, `PMO`).
    """
    if not text:
        return ""
    text = str(text).strip().replace("\n", " ")
    if not is_arabic(text):
        return fix_kerning(text)

    # Reverse string to restore logical order
    rev = text[::-1]
    # Mirror brackets back to forward orientation
    table = str.maketrans("()[]{}", ")(][}{")
    rev = rev.translate(table)
    # Restore reversed numeric sequences back to forward (e.g. "001" -> "100", "000,002" -> "200,000")
    rev = re.sub(r"\d+(?:[.,]\d+)*", lambda m: m.group(0)[::-1], rev)
    # Restore reversed English acronyms/words back to forward (e.g. "RIRT" -> "TRIR", "OMP" -> "PMO")
    rev = re.sub(r"[A-Za-z]+", lambda m: m.group(0)[::-1], rev)
    rev = rev.replace("السالمة", "السلامة").replace("اإل", "الإ").replace("األهداف", "الأهداف").replace("االسياتيجية", "الاستراتيجية").replace("المعايري", "المعايير").replace("يرياعملل", "للمعايير").replace("المشاري ع", "المشاريع")
    return fix_kerning(rev)
