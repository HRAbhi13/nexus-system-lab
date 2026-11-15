"""
test_categorizer.py - Unit Tests for File Categorizer Service
Milestone 2: File Management, Hashing & Storage Layer
"""

import os
import sys
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.categorizer import categorize_file, detect_mime_type, get_category_list, CATEGORIES


class TestCategorizer(unittest.TestCase):
    """
    Test suite for file extension and MIME categorization.
    """

    def test_extension_categorization(self):
        """
        Verify that file extensions map to appropriate canonical categories.
        """
        test_cases = [
            # Documents
            ("annual_report.pdf", "Document"),
            ("resume.docx", "Document"),
            ("notes.txt", "Document"),
            ("README.md", "Document"),

            # Spreadsheets
            ("financials.xlsx", "Spreadsheet"),
            ("dataset.csv", "Spreadsheet"),
            ("export.tsv", "Spreadsheet"),

            # Images
            ("photo.jpg", "Image"),
            ("banner.png", "Image"),
            ("diagram.svg", "Image"),
            ("preview.webp", "Image"),

            # Videos
            ("presentation.mp4", "Video"),
            ("recording.mkv", "Video"),
            ("clip.mov", "Video"),

            # Audio
            ("podcast.mp3", "Audio"),
            ("track.flac", "Audio"),
            ("audio.wav", "Audio"),

            # Archives
            ("bundle.zip", "Archive"),
            ("backup.tar.gz", "Archive"),
            ("source.7z", "Archive"),

            # Code
            ("main.py", "Code"),
            ("script.js", "Code"),
            ("index.html", "Code"),
            ("styles.css", "Code"),
            ("query.sql", "Code"),
            ("config.json", "Code"),

            # Other
            ("unknown_binary.dat", "Other"),
            ("no_extension_file", "Other"),
        ]

        for filename, expected_category in test_cases:
            with self.subTest(filename=filename):
                category = categorize_file(filename)
                self.assertEqual(category, expected_category)

    def test_case_insensitivity(self):
        """
        Verify that uppercase and mixed-case extensions categorize identically.
        """
        self.assertEqual(categorize_file("DOCUMENT.PDF"), "Document")
        self.assertEqual(categorize_file("IMAGE.PNG"), "Image")
        self.assertEqual(categorize_file("VIDEO.Mp4"), "Video")
        self.assertEqual(categorize_file("DATA.Csv"), "Spreadsheet")

    def test_mime_type_detection(self):
        """
        Verify standard MIME type detection for common file extensions.
        """
        self.assertEqual(detect_mime_type("document.pdf"), "application/pdf")
        self.assertEqual(detect_mime_type("photo.png"), "image/png")
        self.assertEqual(detect_mime_type("song.mp3"), "audio/mpeg")
        self.assertEqual(detect_mime_type("unknown_file.xyz123"), "application/octet-stream")

    def test_mime_fallback_categorization(self):
        """
        Verify category detection using MIME type fallback when extension is absent or unfamiliar.
        """
        self.assertEqual(categorize_file("blob_without_extension", mime_type="image/jpeg"), "Image")
        self.assertEqual(categorize_file("blob_without_extension", mime_type="video/mp4"), "Video")
        self.assertEqual(categorize_file("blob_without_extension", mime_type="audio/ogg"), "Audio")
        self.assertEqual(categorize_file("blob_without_extension", mime_type="text/plain"), "Document")

    def test_category_list_validity(self):
        """
        Verify that get_category_list contains all defined categories.
        """
        categories = get_category_list()
        self.assertEqual(categories, CATEGORIES)
        self.assertIn("Document", categories)
        self.assertIn("Spreadsheet", categories)
        self.assertIn("Image", categories)
        self.assertIn("Video", categories)
        self.assertIn("Audio", categories)
        self.assertIn("Archive", categories)
        self.assertIn("Code", categories)
        self.assertIn("Other", categories)


if __name__ == "__main__":
    unittest.main()
