import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as vocalis  # noqa: E402

SAMPLE = {
    "text": "Hello world. This is a test.\n\nనమస్తే తెలుగు. नमस्ते",
    "title": "Test Doc",
    "author": "Tester",
    "fontSize": 14,
    "align": "justify",
}

MAGIC = {
    "pdf": b"%PDF",
    "docx": b"PK",      # DOCX is a zip archive
    "rtf": b"{\\rtf1",
    "html": b"<!doctype html>",
    "md": b"# Test Doc",
    "txt": b"Test Doc",
}


@pytest.fixture
def client():
    vocalis.app.config["TESTING"] = True
    with vocalis.app.test_client() as c:
        yield c


def test_homepage_loads(client):
    res = client.get("/")
    assert res.status_code == 200
    assert b"Vocal<span>is</span>" in res.data


@pytest.mark.parametrize("fmt", list(MAGIC))
def test_every_format_downloads(client, fmt):
    res = client.post("/convert", json={**SAMPLE, "format": fmt})
    assert res.status_code == 200, res.get_json()
    assert res.data.startswith(MAGIC[fmt])
    assert f"Test_Doc.{fmt}" in res.headers["Content-Disposition"]


def test_empty_text_rejected(client):
    res = client.post("/convert", json={"text": "   ", "format": "pdf"})
    assert res.status_code == 400


def test_unknown_format_rejected(client):
    res = client.post("/convert", json={"text": "hi", "format": "exe"})
    assert res.status_code == 400


def test_safe_filename():
    assert vocalis.safe_filename("My ../Report: v2") == "My_Report_v2"
    assert vocalis.safe_filename("").startswith("document_")
