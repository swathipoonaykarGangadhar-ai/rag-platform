import os
from backend.workspace import (
    create_workspace, get_workspaces, get_user_workspace,
    get_workspace_members, add_member, remove_member,
    get_workspace_documents, add_workspace_document, remove_workspace_document
)
from backend.auth import register_user, login_user, verify_token, get_user, get_all_users, update_user_role
from backend.rbac import can_do, set_document_owner, get_accessible_documents, can_access_document
from backend.tags import save_tags, get_tags, get_all_tags, delete_tags
from backend.generator import generate_answer, generate_answer_with_memory, summarize_document, compare_documents, tag_document
from backend.generator import generate_answer, generate_answer_with_memory, summarize_document, compare_documents
from backend.generator import generate_answer, generate_answer_with_memory, summarize_document
from backend.agent import run_agent
from backend.audit import log_query, get_audit_logs, get_audit_stats
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
def list_documents(authorization: str = Header(None)):
    data_dir = "data"
    if not os.path.exists(data_dir):
        return {"documents": [], "role": "viewer", "workspace": "default"}
    allowed = (".pdf", ".docx", ".txt", ".csv",
               ".md", ".png", ".jpg", ".jpeg", ".mp3", ".wav", ".m4a")
    all_files = [f for f in os.listdir(data_dir)
             if f.endswith(allowed) and f != "chat_history.json"]

    email = "anonymous"
    role = "viewer"
    workspace_id = "default"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or "anonymous"
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
            workspace_id = get_user_workspace(email)

    # Filter by workspace if not default
    if workspace_id != "default":
        workspace_docs = get_workspace_documents(workspace_id)
        if workspace_docs:
            files = [f for f in all_files if f in workspace_docs]
        else:
            files = all_files
    else:
        files = all_files

    accessible = get_accessible_documents(files, email, role)
    return {"documents": accessible, "role": role, "workspace": workspace_id}

@app.delete("/documents/{filename}")
def delete_document(filename: str):
    filepath = os.path.join("data", filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    delete_tags(filename)
    return {"message": f"Deleted {filename}"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), authorization: str = Header(None)):
    email = "anonymous"
    role = "editor"
    workspace_id = "default"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or "anonymous"
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
            workspace_id = get_user_workspace(email)

    if not can_do(role, "upload"):
        raise HTTPException(status_code=403, detail="You don't have permission to upload")

    contents = await file.read()
    filepath = save_uploaded_file(contents, file.filename)
    text = extract_text(filepath)
    chunks = chunk_text(text)
    count = embed_and_store(chunks, file.filename)

    set_document_owner(file.filename, email)
    add_workspace_document(workspace_id, file.filename)

    tags = {}
    if chunks:
        tags = tag_document(chunks, file.filename)
        save_tags(file.filename, tags)

    return {
        "message": f"Successfully processed {file.filename}",
        "chunks_stored": count,
        "tags": tags,
        "workspace": workspace_id
    }

@app.get("/tags")
def list_all_tags():
    return {"tags": get_all_tags()}

@app.get("/tags/{filename}")
def get_document_tags(filename: str):
    return get_tags(filename)

@app.delete("/tags/{filename}")
def remove_tags(filename: str):
    delete_tags(filename)
    return {"message": f"Tags deleted for {filename}"}

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
async def ask_question(query: dict, authorization: str = Header(None)):
    import time
    question = query.get("question", "")
    chat_history = query.get("chat_history", [])
    start_time = time.time()

    chunks_with_sources = hybrid_search(question)
    if not chunks_with_sources:
        chunks_with_sources = search_with_sources(question)

    # Use memory-aware generation if history provided
    if chat_history:
        result = generate_answer_with_memory(question, chunks_with_sources, chat_history)
    else:
        result = generate_answer(question, chunks_with_sources)

    response_time = int((time.time() - start_time) * 1000)

    user_email = "anonymous"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token)
        if email:
            user_email = email

    log_query(
        user_email=user_email,
        question=question,
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"],
        response_time_ms=response_time
    )

    save_message(question, result["answer"], result["sources"])

    return {
        "question": question,
        "answer": result["answer"],
        "sources": result["sources"],
        "confidence": result["confidence"],
        "response_time_ms": response_time
    }

@app.post("/agent")
async def agent_question(query: dict, authorization: str = Header(None)):
    import time
    question = query.get("question", "")
    start_time = time.time()

    result = run_agent(question)

    response_time = int((time.time() - start_time) * 1000)

    user_email = "anonymous"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token)
        if email:
            user_email = email

    log_query(
        user_email=user_email,
        question=f"[AGENT] {question}",
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"],
        response_time_ms=response_time
    )

    save_message(question, result["answer"], result["sources"])

    return {
        "question": question,
        "answer": result["answer"],
        "steps": result["steps"],
        "sources": result["sources"],
        "confidence": result["confidence"],
        "total_chunks_searched": result["total_chunks_searched"],
        "sources_searched": result["sources_searched"],
        "response_time_ms": response_time
    }

@app.get("/audit/logs")
def get_logs():
    return {"logs": get_audit_logs()}

@app.get("/audit/stats")
def get_stats():
    return get_audit_stats()

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
@app.post("/compare")
async def compare_docs(data: dict):
    doc1 = data.get("doc1", "")
    doc2 = data.get("doc2", "")

    if not doc1 or not doc2:
        return {"error": "Please provide two documents to compare"}

    filepath1 = os.path.join("data", doc1)
    filepath2 = os.path.join("data", doc2)

    if not os.path.exists(filepath1) or not os.path.exists(filepath2):
        return {"error": "One or both documents not found"}

    text1 = extract_text(filepath1)
    text2 = extract_text(filepath2)

    chunks1 = chunk_text(text1)
    chunks2 = chunk_text(text2)

    result = compare_documents(chunks1, chunks2, doc1, doc2)
    return result
@app.get("/users")
def list_users(authorization: str = Header(None)):
    email = ""
    role = "viewer"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or ""
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return {"users": get_all_users()}

@app.post("/users/role")
def change_user_role(data: dict, authorization: str = Header(None)):
    email = ""
    role = "viewer"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or ""
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return update_user_role(data.get("email"), data.get("role"))
@app.post("/tags/tag-all")
async def tag_all_documents():
    data_dir = "data"
    allowed = (".pdf", ".docx", ".txt", ".csv",
               ".md", ".png", ".jpg", ".jpeg", ".mp3", ".wav", ".m4a")
    files = [f for f in os.listdir(data_dir)
             if f.endswith(allowed) and f != "chat_history.json"]
    
    tagged = []
    for filename in files:
        filepath = os.path.join(data_dir, filename)
        text = extract_text(filepath)
        chunks = chunk_text(text)
        if chunks:
            tags = tag_document(chunks, filename)
            save_tags(filename, tags)
            tagged.append(filename)
    
    return {"message": f"Tagged {len(tagged)} documents", "tagged": tagged}

@app.get("/workspaces")
def list_workspaces(authorization: str = Header(None)):
    return {"workspaces": get_workspaces()}

@app.post("/workspaces")
def create_new_workspace(data: dict, authorization: str = Header(None)):
    email = ""
    role = "viewer"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or ""
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return create_workspace(
        name=data.get("name"),
        description=data.get("description", ""),
        created_by=email
    )

@app.get("/workspaces/my")
def my_workspace(authorization: str = Header(None)):
    email = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or ""
    workspace_id = get_user_workspace(email)
    members = get_workspace_members(workspace_id)
    return {"workspace_id": workspace_id, "members": members}

@app.post("/workspaces/{workspace_id}/members")
def add_workspace_member(workspace_id: str, data: dict, authorization: str = Header(None)):
    email = ""
    role = "viewer"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or ""
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return add_member(workspace_id, data.get("email"), data.get("role", "member"))

@app.delete("/workspaces/{workspace_id}/members/{member_email}")
def remove_workspace_member(workspace_id: str, member_email: str, authorization: str = Header(None)):
    email = ""
    role = "viewer"
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        email = verify_token(token) or ""
        user = get_user(email)
        if user:
            role = user.get("role", "viewer")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return remove_member(workspace_id, member_email)