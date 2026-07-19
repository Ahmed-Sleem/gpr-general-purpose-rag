"""
Text & Markdown Parser (`src/backend/services/ingestion/parsers/text_parser.py`).

Extracts headings (`#`, `##`, `###`), list items, and paragraphs from `.md` or `.txt` files.
"""

import re
import aiofiles
from typing import List, Dict, Any
from ..normalizer import fix_kerning


def parse_text_file(file_path: str) -> List[Dict[str, Any]]:
    """Extract structural blocks (`heading`, `text`) from a plain text or Markdown file synchronously."""
    blocks: List[Dict[str, Any]] = []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    lines = [fix_kerning(l) for l in content.split("\n")]
    for idx, line in enumerate(lines):
        if not line:
            continue

        # Check Markdown heading syntax (`# Heading 1`, `## Heading 2`)
        md_match = re.match(r"^(#{1,4})\s+(.+)$", line)
        if md_match:
            level = len(md_match.group(1))
            title = md_match.group(2).strip()
            blocks.append({
                "type": "heading",
                "level": level,
                "code": f"sec_{idx}",
                "title": title,
                "content": title,
                "page_number": 1
            })
        else:
            if blocks and blocks[-1]["type"] == "text":
                blocks[-1]["content"] += f"\n{line}"
            else:
                blocks.append({
                    "type": "text",
                    "level": 0,
                    "title": line[:50] + ("..." if len(line) > 50 else ""),
                    "content": line,
                    "page_number": 1
                })

    return blocks
