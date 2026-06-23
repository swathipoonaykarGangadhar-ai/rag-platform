import os
from fastapi import FastAPI, UploadFile, File, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
from backend.ingestor import save_uploaded_file, extract_text, chunk_text
from backend.embedder import embed_and_store
from backend.retriever import search_with_sources
from backend.hybrid_search import hybrid_search
from backend.generator import generate_answer, summarize_document
from backend.history import save_message, get_history, clear_history
from backend.exporter import export_chat_to_pdf
from backend.auth import register_user, login_user, verify_token

load_dotenv()

app = FastAPI(title="RAG Document Intelligence Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    return email

@app.get("/")
def home():
    return {"message": "RAG Platform is running!"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/auth/register")
def register(data: dict):
    return register_user(
        email=data.get("email"),
        username=data.get("username"),
        password=data.get("password")
    )

@app.post("/auth/login")
def login(data: dict):
    return login_user(
        email=data.get("email"),
        password=data.get("password")
    )

@app.get("/documents")
def list_documents(user=None):
    data_dir = "data"
    if not os.path.exists(data_dir):
        return {"documents": []}
    allowed = (".pdf", ".docx", ".txt", ".csv",
               ".md", ".png", ".jpg", ".jpeg", ".mp3", ".wav", ".m4a")
    files = [f for f in os.listdir(data_dir)
             if f.endswith(allowed) and f != "chat_history.json"]
    return {"documents": files}

@app.delete("/documents/{filename}")
def delete_document(filename: str):
    filepath = os.path.join("data", filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"message": f"Deleted {filename}"}

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

@app.post("/summarize/{filename}")
async def summarize_doc(filename: str):
    filepath = os.path.join("data", filename)
    if not os.path.exists(filepath):
        return {"error": "File not found"}
    text = extract_text(filepath)
    chunks = chunk_text(text)
    if not chunks:
        return {"summary": "Could not extract text from this document."}
    summary = summarize_document(chunks)
    return {"filename": filename, "summary": summary}

@app.post("/ask")
async def ask_question(query: dict):
    question = query.get("question", "")
    chunks_with_sources = hybrid_search(question)
    if not chunks_with_sources:
        chunks_with_sources = search_with_sources(question)
    result = generate_answer(question, chunks_with_sources)
    save_message(question, result["answer"], result["sources"])
    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"]
    }

@app.get("/history")
def get_chat_history():
    return {"history": get_history()}

@app.delete("/history")
def clear_chat_history():
    return clear_history()

@app.post("/export/pdf")
async def export_pdf(data: dict):
    messages = data.get("messages", [])
    pdf_bytes = export_chat_to_pdf(messages)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=rag-chat-export.pdf"}
    )