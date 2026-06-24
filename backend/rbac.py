from tinydb import TinyDB, Query
import os
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
db = TinyDB(os.path.join(DATA_DIR, 'document_permissions.json'))
permissions_table = db.table('permissions')

ROLES = {
    "admin": ["upload", "delete", "search", "view_all", "manage_users"],
    "editor": ["upload", "delete_own", "search", "view_own"],
    "viewer": ["search", "view_all"]
}

def can_do(role: str, action: str) -> bool:
    allowed = ROLES.get(role, [])
    return action in allowed

def set_document_owner(filename: str, email: str):
    Doc = Query()
    permissions_table.upsert(
        {"filename": filename, "owner": email},
        Doc.filename == filename
    )

def get_document_owner(filename: str) -> str:
    Doc = Query()
    result = permissions_table.search(Doc.filename == filename)
    return result[0]["owner"] if result else "admin"

def can_access_document(filename: str, email: str, role: str) -> bool:
    if role == "admin":
        return True
    if role == "viewer":
        return True
    owner = get_document_owner(filename)
    return owner == email

def get_accessible_documents(all_docs: list, email: str, role: str) -> list:
    if role in ["admin", "viewer"]:
        return all_docs
    accessible = []
    for doc in all_docs:
        if can_access_document(doc, email, role):
            accessible.append(doc)
    return accessible