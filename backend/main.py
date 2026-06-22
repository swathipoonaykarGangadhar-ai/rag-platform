import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.ingestor import save_uploaded_file, extract_text, chunk_text
from backend.embedder import embed_and_store
from backend.retriever import search_with_sources
from backend.generator import generate_answer

load_dotenv()

app = FastAPI(title="RAG Document Intelligence Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "RAG Platform is running!"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    contents = await file.read()
    filepath = save_uploaded_file(contents, file.filename)
    text = extract_text(filepath)
    chunks = chunk_text(text)
    count = embed_and_store(chunks, file.filename)
    return {
        "message": f"Successfully processed {file.filename}",
        "chunks_stored": count
    }

@app.post("/ask")
async def ask_question(query: dict):
    question = query.get("question", "")
    chunks_with_sources = search_with_sources(question)
    result = generate_answer(question, chunks_with_sources)
    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"]
    }