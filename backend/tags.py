from tinydb import TinyDB, Query

db = TinyDB('data/document_tags.json')
tags_table = db.table('tags')

def save_tags(filename: str, tags: dict):
    Doc = Query()
    tags_table.upsert(
        {"filename": filename, **tags},
        Doc.filename == filename
    )

def get_tags(filename: str) -> dict:
    Doc = Query()
    result = tags_table.search(Doc.filename == filename)
    return result[0] if result else {}

def get_all_tags() -> list:
    return tags_table.all()

def delete_tags(filename: str):
    Doc = Query()
    tags_table.remove(Doc.filename == filename)