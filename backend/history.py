import os
from datetime import datetime
from tinydb import TinyDB, Query

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
db = TinyDB(os.path.join(DATA_DIR, 'chat_history.json'))
chats = db.table('chats')

def save_message(question: str, answer: str, sources: list):
    chats.insert({
        "question": question,
        "answer": answer,
        "sources": sources,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

def get_history(limit: int = 50) -> list:
    all_chats = chats.all()
    return all_chats[-limit:]

def clear_history():
    chats.truncate()
    return {"message": "History cleared"}