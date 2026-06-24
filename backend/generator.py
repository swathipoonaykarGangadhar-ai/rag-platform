import json
import os
from groq import Groq

api_key = os.environ.get("GROQ_API_KEY", "").strip()
client = Groq(api_key=api_key)

def calculate_confidence(answer: str, chunks: list) -> dict:
    if not chunks:
        return {"score": 0, "label": "No Sources", "color": "gray"}
    
    answer_words = set(answer.lower().split())
    context = " ".join([c.get("text", "") if isinstance(c, dict) else c for c in chunks])
    context_words = set(context.lower().split())
    
    # Remove common stop words
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been",
                  "have", "has", "had", "do", "does", "did", "will", "would",
                  "could", "should", "may", "might", "shall", "can", "to",
                  "of", "in", "on", "at", "by", "for", "with", "about",
                  "and", "or", "but", "if", "then", "that", "this", "it",
                  "i", "you", "he", "she", "we", "they", "not", "no"}
    
    answer_keywords = answer_words - stop_words
    
    if not answer_keywords:
        return {"score": 50, "label": "Medium Confidence", "color": "yellow"}
    
    # Check how many answer keywords appear in source context
    matched = answer_keywords.intersection(context_words)
    score = round((len(matched) / len(answer_keywords)) * 100)
    
    if score >= 70:
        return {"score": score, "label": "High Confidence", "color": "green"}
    elif score >= 40:
        return {"score": score, "label": "Medium Confidence", "color": "yellow"}
    else:
        return {"score": score, "label": "Low Confidence - May Hallucinate", "color": "red"}

def generate_answer(query: str, chunks_with_sources: list) -> dict:
    context = "\n\n".join([
        c.get("text", c) if isinstance(c, dict) else c
        for c in chunks_with_sources
    ])

    prompt = f"""You are a helpful document assistant.
Answer the user's question based ONLY on the provided context.
If the answer is not in the context, say "I couldn't find that in the documents."

Context from documents:
{context}

User question: {query}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1024
    )

    answer = response.choices[0].message.content
    confidence = calculate_confidence(answer, chunks_with_sources)

    sources = []
    for chunk in chunks_with_sources:
        if isinstance(chunk, dict):
            sources.append({
                "source": chunk.get("source", "Unknown"),
                "chunk_index": chunk.get("chunk_index", 0),
                "preview": chunk.get("text", "")[:150] + "...",
                "hybrid_score": round(chunk.get("hybrid_score", 0), 3),
                "vector_score": chunk.get("vector_score", 0),
                "bm25_score": chunk.get("bm25_score", 0)
            })

    return {
        "answer": answer,
        "sources": sources,
        "confidence": confidence
    }

def summarize_document(chunks: list) -> str:
    sample_chunks = chunks[:10]
    context = "\n\n".join(sample_chunks)

    prompt = f"""You are a document analyst. Read the following document content and provide a concise summary in 3-5 sentences covering:
- What this document is about
- Key topics or information it contains
- Who it might be intended for

Document content:
{context}

Summary:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=300
    )

    return response.choices[0].message.content
def generate_answer_with_memory(query: str, chunks_with_sources: list, chat_history: list) -> dict:
    context = "\n\n".join([
        c.get("text", c) if isinstance(c, dict) else c
        for c in chunks_with_sources
    ])

    # Build conversation history string
    history_text = ""
    if chat_history:
        history_text = "Previous conversation:\n"
        for msg in chat_history[-6:]:  # Last 3 exchanges
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"{role}: {msg.get('text', '')}\n"
        history_text += "\n"

    prompt = f"""You are a helpful document assistant with memory of the conversation.
Answer the user's question based on the provided context AND the conversation history.
If referring to something mentioned earlier in the conversation, use that context.
If the answer is not in the context or history, say "I couldn't find that in the documents."

{history_text}
Context from documents:
{context}

Current question: {query}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1024
    )

    answer = response.choices[0].message.content
    confidence = calculate_confidence(answer, chunks_with_sources)

    sources = []
    for chunk in chunks_with_sources:
        if isinstance(chunk, dict):
            sources.append({
                "source": chunk.get("source", "Unknown"),
                "chunk_index": chunk.get("chunk_index", 0),
                "preview": chunk.get("text", "")[:150] + "...",
                "hybrid_score": round(chunk.get("hybrid_score", 0), 3),
                "vector_score": chunk.get("vector_score", 0),
                "bm25_score": chunk.get("bm25_score", 0)
            })

    return {
        "answer": answer,
        "sources": sources,
        "confidence": confidence
    }
def compare_documents(doc1_chunks: list, doc2_chunks: list, doc1_name: str, doc2_name: str) -> dict:
    doc1_text = "\n\n".join(doc1_chunks[:3])
    doc2_text = "\n\n".join(doc2_chunks[:3])

    prompt = f"""You are an expert document analyst. Compare these two documents and provide a detailed analysis.

Document 1: {doc1_name}
{doc1_text}

Document 2: {doc2_name}
{doc2_text}

Provide a structured comparison with these sections:
1. OVERVIEW - Brief summary of each document
2. SIMILARITIES - Key topics or points both documents share
3. DIFFERENCES - Key differences between the documents
4. UNIQUE TO DOC 1 - Important points only in {doc1_name}
5. UNIQUE TO DOC 2 - Important points only in {doc2_name}
6. RECOMMENDATION - Which document is more comprehensive or relevant for what purpose

Format your response clearly with these exact section headers."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1000
    )

    return {
        "comparison": response.choices[0].message.content,
        "doc1": doc1_name,
        "doc2": doc2_name
    }
def tag_document(chunks: list, filename: str) -> dict:
    sample_text = "\n\n".join(chunks[:5])

    prompt = f"""You are a document classifier. Analyze this document and return ONLY a JSON object with these fields:
- category: one of [Technical, Legal, Finance, HR, Marketing, Research, Personal, Other]
- topics: array of 3-5 key topics found in the document
- type: one of [Resume, Report, Interview, Guide, Contract, Presentation, Data, Email, Other]
- summary_line: one sentence describing the document

Document filename: {filename}
Document content:
{sample_text}

Return ONLY valid JSON, no other text:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=200
    )

    try:
        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        tags = json.loads(raw)
        return tags
    except:
        return {
            "category": "Other",
            "topics": [],
            "type": "Other",
            "summary_line": filename
        }