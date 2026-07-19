"""Parsers package supporting multi-format structural text/table extraction (`pdf`, `docx`, `txt`, `md`)."""
from .pdf_parser import parse_pdf_file
from .docx_parser import parse_docx_file
from .text_parser import parse_text_file
