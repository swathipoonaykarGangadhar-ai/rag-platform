import json
import os
from datetime import datetime
from collections import Counter
from tinydb import TinyDB, Query

db = TinyDB('data/audit_log.json')
audit_table = db.table('audit_logs')

def log_query(
    user_email: str,
    question: str,
    answer: str,
    sources: list,
    confidence: dict,
    response_time_ms: int = 0
):
    audit_table.insert({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "hour": datetime.now().hour,
        "user_email": user_email,
        "question": question,
        "answer_preview": answer[:200] + "..." if len(answer) > 200 else answer,
        "sources_used": [s.get("source", "") for s in sources],
        "confidence_score": confidence.get("score", 0),
        "confidence_label": confidence.get("label", ""),
        "response_time_ms": response_time_ms,
        "num_sources": len(sources)
    })

def get_audit_logs(limit: int = 100) -> list:
    logs = audit_table.all()
    return logs[-limit:]

def get_audit_stats() -> dict:
    logs = audit_table.all()
    if not logs:
        return {
            "total_queries": 0,
            "avg_confidence": 0,
            "avg_response_time": 0,
            "unique_users": 0,
            "high_confidence": 0,
            "medium_confidence": 0,
            "low_confidence": 0,
            "top_documents": [],
            "top_questions": [],
            "queries_by_date": [],
            "queries_by_hour": []
        }

    total = len(logs)
    avg_conf = round(sum(l.get("confidence_score", 0) for l in logs) / total)
    avg_time = round(sum(l.get("response_time_ms", 0) for l in logs) / total)
    unique_users = len(set(l.get("user_email", "") for l in logs))
    high = len([l for l in logs if l.get("confidence_score", 0) >= 70])
    medium = len([l for l in logs if 40 <= l.get("confidence_score", 0) < 70])
    low = len([l for l in logs if l.get("confidence_score", 0) < 40])

    # Top documents
    all_sources = []
    for log in logs:
        all_sources.extend(log.get("sources_used", []))
    doc_counter = Counter(all_sources)
    top_docs = [{"name": k, "count": v} for k, v in doc_counter.most_common(5)]

    # Top questions
    questions = [l.get("question", "") for l in logs if not l.get("question", "").startswith("[AGENT]")]
    question_counter = Counter(questions)
    top_questions = [{"question": k, "count": v} for k, v in question_counter.most_common(5)]

    # Queries by date
    date_counter = Counter(l.get("date", "") for l in logs)
    queries_by_date = [{"date": k, "count": v} for k, v in sorted(date_counter.items())[-7:]]

    # Queries by hour
    hour_counter = Counter(l.get("hour", 0) for l in logs)
    queries_by_hour = [{"hour": k, "count": v} for k, v in sorted(hour_counter.items())]

    return {
        "total_queries": total,
        "avg_confidence": avg_conf,
        "avg_response_time": avg_time,
        "unique_users": unique_users,
        "high_confidence": high,
        "medium_confidence": medium,
        "low_confidence": low,
        "top_documents": top_docs,
        "top_questions": top_questions,
        "queries_by_date": queries_by_date,
        "queries_by_hour": queries_by_hour
    }