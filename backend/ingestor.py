import os
import json
import csv
import fitz
import whisper
import pytesseract
from PIL import Image
from docx import Document
from pathlib import Path

pytesseract.pytesseract.tesseract_cmd = r'C:\Users\swath\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

def save_uploaded_file(file_bytes: bytes, filename: str) -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return filepath

def extract_text_from_pdf(filepath: str) -> str:
    doc = fitz.open(filepath)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_docx(filepath: str) -> str:
    doc = Document(filepath)
    return "\n".join([p.text for p in doc.paragraphs])

def extract_text_from_txt(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def extract_text_from_csv(filepath: str) -> str:
    text = ""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        for row in reader:
            text += " | ".join(row) + "\n"
    return text

def extract_text_from_json(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        data = json.load(f)
    return json.dumps(data, indent=2)

def extract_text_from_md(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def extract_text_from_image(filepath: str) -> str:
    image = Image.open(filepath)
    return pytesseract.image_to_string(image)

def extract_text_from_audio(filepath: str) -> str:
    model = whisper.load_model("base")
    result = model.transcribe(filepath)
    return result["text"]

def extract_text(filepath: str) -> str:
    ext = Path(filepath).suffix.lower()
    extractors = {
        ".pdf": extract_text_from_pdf,
        ".docx": extract_text_from_docx,
        ".txt": extract_text_from_txt,
        ".csv": extract_text_from_csv,
        ".json": extract_text_from_json,
        ".md": extract_text_from_md,
        ".png": extract_text_from_image,
        ".jpg": extract_text_from_image,
        ".jpeg": extract_text_from_image,
        ".mp3": extract_text_from_audio,
        ".wav": extract_text_from_audio,
        ".m4a": extract_text_from_audio,
    }
    extractor = extractors.get(ext)
    if extractor:
        return extractor(filepath)
    return ""

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks