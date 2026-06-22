import os
from datetime import datetime
from tinydb import TinyDB, Query

db = TinyDB('data/chat_history.json')
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