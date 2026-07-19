"""Ingestion services package exporting the universal multi-document pipeline and normalizer."""
from .universal_pipeline import process_document_pipeline
from .normalizer import fix_kerning, normalize_table_cell, is_arabic
from .chunker import build_chunks_and_toc
from .graph_builder import build_graph_connections
