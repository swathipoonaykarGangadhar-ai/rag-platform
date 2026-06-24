from tinydb import TinyDB, Query
from datetime import datetime
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

db = TinyDB(os.path.join(DATA_DIR, 'workspaces.json'))
workspaces_table = db.table('workspaces')
members_table = db.table('members')

def create_workspace(name: str, description: str, created_by: str) -> dict:
    Workspace = Query()
    existing = workspaces_table.search(Workspace.name == name)
    if existing:
        return {"error": "Workspace already exists"}
    workspace_id = name.lower().replace(" ", "-")
    workspaces_table.insert({
        "id": workspace_id,
        "name": name,
        "description": description,
        "created_by": created_by,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    members_table.insert({
        "workspace_id": workspace_id,
        "email": created_by,
        "role": "admin",
        "joined_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    return {"id": workspace_id, "name": name, "description": description}

def get_workspaces() -> list:
    return workspaces_table.all()

def get_user_workspace(email: str) -> str:
    Member = Query()
    result = members_table.search(Member.email == email)
    if result:
        return result[0]["workspace_id"]
    return "default"

def get_workspace_members(workspace_id: str) -> list:
    Member = Query()
    return members_table.search(Member.workspace_id == workspace_id)

def add_member(workspace_id: str, email: str, role: str = "member") -> dict:
    Workspace = Query()
    workspace = workspaces_table.search(Workspace.id == workspace_id)
    if not workspace:
        return {"error": "Workspace not found"}
    Member = Query()
    existing = members_table.search(
        (Member.workspace_id == workspace_id) & (Member.email == email)
    )
    if existing:
        return {"error": "User already in workspace"}
    members_table.insert({
        "workspace_id": workspace_id,
        "email": email,
        "role": role,
        "joined_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    return {"message": f"Added {email} to {workspace_id}"}

def remove_member(workspace_id: str, email: str) -> dict:
    Member = Query()
    members_table.remove(
        (Member.workspace_id == workspace_id) & (Member.email == email)
    )
    return {"message": f"Removed {email} from {workspace_id}"}

def get_workspace_documents(workspace_id: str) -> list:
    docs_db = TinyDB(os.path.join(DATA_DIR, 'workspace_docs.json'))
    docs_table = docs_db.table('docs')
    Doc = Query()
    results = docs_table.search(Doc.workspace_id == workspace_id)
    return [r["filename"] for r in results]

def add_workspace_document(workspace_id: str, filename: str):
    docs_db = TinyDB(os.path.join(DATA_DIR, 'workspace_docs.json'))
    docs_table = docs_db.table('docs')
    Doc = Query()
    docs_table.upsert(
        {"workspace_id": workspace_id, "filename": filename},
        (Doc.workspace_id == workspace_id) & (Doc.filename == filename)
    )

def remove_workspace_document(workspace_id: str, filename: str):
    docs_db = TinyDB(os.path.join(DATA_DIR, 'workspace_docs.json'))
    docs_table = docs_db.table('docs')
    Doc = Query()
    docs_table.remove(
        (Doc.workspace_id == workspace_id) & (Doc.filename == filename)
    )