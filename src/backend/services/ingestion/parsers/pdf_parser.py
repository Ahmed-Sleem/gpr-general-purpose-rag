"""
PDF Structural Parser (`src/backend/services/ingestion/parsers/pdf_parser.py`).

Extracts multi-page text hierarchy (`pypdf`) and multi-column structured tables (`pdfplumber`).
"""

import re
from typing import List, Dict, Any, Optional
import pypdf
import pdfplumber
from ..normalizer import fix_kerning, normalize_table_cell, is_arabic


def parse_pdf_file(file_path: str) -> List[Dict[str, Any]]:
    """Extract raw structural blocks (`heading`, `text`, `table`) from a PDF file."""
    blocks: List[Dict[str, Any]] = []
    reader = pypdf.PdfReader(file_path)

    # 1. Text blocks & Headings via `pypdf`
    for page_idx, page in enumerate(reader.pages):
        page_num = page_idx + 1
        text = page.extract_text()
        if not text:
            continue

        lines = [fix_kerning(l) for l in text.split("\n") if fix_kerning(l)]
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check single line or split line headings
            sec_match_1 = re.match(r"^([0-9]+(?:\.[0-9]+)*)\s+([^\.\d].+)$", line)
            sec_match_2 = re.match(r"^([0-9]+(?:\.[0-9]+)*)$", line)
            
            if sec_match_1 and len(line) < 130:
                code = sec_match_1.group(1)
                title = fix_kerning(sec_match_1.group(2))
                level = len(code.split("."))
                blocks.append({
                    "type": "heading",
                    "level": min(level, 4),
                    "code": code,
                    "title": f"{code} {title}",
                    "content": f"{code} {title}",
                    "page_number": page_num
                })
                i += 1
            elif sec_match_2 and i + 1 < len(lines):
                nxt = fix_kerning(lines[i+1])
                if not re.match(r"^([0-9]+(?:\.[0-9]+)*)$", nxt) and len(nxt) < 110:
                    code = line.strip()
                    level = len(code.split("."))
                    blocks.append({
                        "type": "heading",
                        "level": min(level, 4),
                        "code": code,
                        "title": f"{code} {nxt}",
                        "content": f"{code} {nxt}",
                        "page_number": page_num
                    })
                    i += 2
                else:
                    blocks.append({
                        "type": "text",
                        "level": 0,
                        "title": line[:50],
                        "content": line,
                        "page_number": page_num
                    })
                    i += 1
            else:
                # Accumulate consecutive text lines under current paragraph block
                if blocks and blocks[-1]["type"] == "text" and blocks[-1]["page_number"] == page_num:
                    blocks[-1]["content"] += f"\n{line}"
                else:
                    blocks.append({
                        "type": "text",
                        "level": 0,
                        "title": line[:50] + ("..." if len(line) > 50 else ""),
                        "content": line,
                        "page_number": page_num
                    })
                i += 1

    # 2. Structured Tables via `pdfplumber`
    try:
        with pdfplumber.open(file_path) as plumber_pdf:
            for page_idx, plumber_page in enumerate(plumber_pdf.pages):
                page_num = page_idx + 1
                tables = plumber_page.extract_tables()
                if not tables:
                    continue

                for t_idx, table in enumerate(tables):
                    if len(table) < 2:
                        continue
                    headers = [normalize_table_cell(c) for c in table[0] if c]
                    rows = []
                    for row in table[1:]:
                        clean_row = [normalize_table_cell(c) for c in row if c and str(c).strip() != ""]
                        if len(clean_row) >= 2:
                            rows.append(clean_row)
                    
                    if rows and headers:
                        table_title = f"Table {t_idx+1} (Page {page_num}): {headers[0] if headers else 'Data Table'}"
                        blocks.append({
                            "type": "table",
                            "level": 2,
                            "title": table_title[:80],
                            "content": f"Table Headers: {' | '.join(headers)}\nRows:\n" + "\n".join([" | ".join(r) for r in rows[:15]]),
                            "page_number": page_num,
                            "table_headers": headers,
                            "table_rows": rows
                        })
    except Exception as e:
        print(f"[WARN] pdfplumber table extraction warning on {file_path}: {e}")

    return blocks
