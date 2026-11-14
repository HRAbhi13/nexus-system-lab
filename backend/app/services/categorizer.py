"""
categorizer.py - Intelligent File Categorization Service
NEXUS - Intelligent Cloud Storage Optimization System

Analyzes file extensions and MIME types to categorize files into high-level
storage classifications (Document, Spreadsheet, Image, Video, Audio, Archive, Code, Other).
"""

import mimetypes
from pathlib import Path
from typing import Optional, List, Dict, Set


# Canonical category definitions
CATEGORIES = [
    "Document",
    "Spreadsheet",
    "Image",
    "Video",
    "Audio",
    "Archive",
    "Code",
    "Other",
]

# Mapping of lowercase file extensions to categories
EXTENSION_MAP: Dict[str, str] = {
    # Documents
    ".pdf": "Document",
    ".doc": "Document",
    ".docx": "Document",
    ".txt": "Document",
    ".rtf": "Document",
    ".odt": "Document",
    ".md": "Document",
    ".tex": "Document",
    ".epub": "Document",

    # Spreadsheets
    ".xlsx": "Spreadsheet",
    ".xls": "Spreadsheet",
    ".csv": "Spreadsheet",
    ".tsv": "Spreadsheet",
    ".ods": "Spreadsheet",

    # Images
    ".jpg": "Image",
    ".jpeg": "Image",
    ".png": "Image",
    ".gif": "Image",
    ".bmp": "Image",
    ".webp": "Image",
    ".svg": "Image",
    ".tiff": "Image",
    ".ico": "Image",

    # Videos
    ".mp4": "Video",
    ".mkv": "Video",
    ".avi": "Video",
    ".mov": "Video",
    ".wmv": "Video",
    ".webm": "Video",
    ".flv": "Video",
    ".m4v": "Video",

    # Audio
    ".mp3": "Audio",
    ".wav": "Audio",
    ".flac": "Audio",
    ".aac": "Audio",
    ".ogg": "Audio",
    ".m4a": "Audio",
    ".wma": "Audio",

    # Archives / Compressed
    ".zip": "Archive",
    ".tar": "Archive",
    ".gz": "Archive",
    ".tgz": "Archive",
    ".7z": "Archive",
    ".rar": "Archive",
    ".bz2": "Archive",
    ".xz": "Archive",

    # Source Code / Structured Configs
    ".py": "Code",
    ".js": "Code",
    ".ts": "Code",
    ".html": "Code",
    ".htm": "Code",
    ".css": "Code",
    ".json": "Code",
    ".xml": "Code",
    ".sql": "Code",
    ".c": "Code",
    ".cpp": "Code",
    ".h": "Code",
    ".hpp": "Code",
    ".java": "Code",
    ".cs": "Code",
    ".go": "Code",
    ".rs": "Code",
    ".php": "Code",
    ".sh": "Code",
    ".bat": "Code",
    ".yaml": "Code",
    ".yml": "Code",
    ".ini": "Code",
}


def detect_mime_type(filename: str) -> str:
    """
    Detect the standard MIME type for a given filename based on its extension.

    Args:
        filename (str): Name or path of the file.

    Returns:
        str: Detected MIME type string, or 'application/octet-stream' fallback.
    """
    guessed_type, _ = mimetypes.guess_type(filename)
    if guessed_type:
        return guessed_type
    return "application/octet-stream"


def categorize_file(filename: str, mime_type: Optional[str] = None) -> str:
    """
    Determine the storage category of a file using extension and optional MIME type.

    Args:
        filename (str): Name or path of the file.
        mime_type (str, optional): Pre-detected MIME type.

    Returns:
        str: Category name from CATEGORIES list.
    """
    path = Path(filename)
    ext = path.suffix.lower()

    # 1. Primary check: Extension-based mapping
    if ext in EXTENSION_MAP:
        return EXTENSION_MAP[ext]

    # 2. Secondary check: MIME type prefix evaluation
    target_mime = (mime_type or detect_mime_type(filename)).lower()

    if target_mime.startswith("image/"):
        return "Image"
    elif target_mime.startswith("video/"):
        return "Video"
    elif target_mime.startswith("audio/"):
        return "Audio"
    elif target_mime.startswith("text/"):
        return "Document"
    elif "pdf" in target_mime or "word" in target_mime:
        return "Document"
    elif "spreadsheet" in target_mime or "excel" in target_mime or "csv" in target_mime:
        return "Spreadsheet"
    elif "zip" in target_mime or "compressed" in target_mime or "tar" in target_mime:
        return "Archive"

    return "Other"


def get_category_list() -> List[str]:
    """Return the list of all supported category names."""
    return list(CATEGORIES)
