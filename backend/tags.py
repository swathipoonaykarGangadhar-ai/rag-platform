import os
from tinydb import TinyDB, Query

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, 'document_tags.json')

def get_db():
    try:
        db = TinyDB(DB_PATH)
        db.tables()
        return db
    except Exception:
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
        return TinyDB(DB_PATH)

def save_tags(filename: str, tags: dict):
    try:
        db = get_db()
        tags_table = db.table('tags')
        Tag = Query()
        tags_table.upsert({'filename': filename, **tags}, Tag.filename == filename)
    except Exception as e:
        print(f"Error saving tags: {e}")

def get_tags(filename: str):
    try:
        db = get_db()
        tags_table = db.table('tags')
        Tag = Query()
        result = tags_table.search(Tag.filename == filename)
        return result[0] if result else {}
    except Exception:
        return {}

def get_all_tags():
    try:
        db = get_db()
        tags_table = db.table('tags')
        return tags_table.all()
    except Exception:
        return []

def delete_tags(filename: str):
    try:
        db = get_db()
        tags_table = db.table('tags')
        Tag = Query()
        tags_table.remove(Tag.filename == filename)
    except Exception:
        pass