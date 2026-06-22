import os
from groq import Groq

api_key = os.environ.get("GROQ_API_KEY", "").strip()
client = Groq(api_key=api_key)

def generate_answer(query: str, chunks_with_sources: list) -> dict:
    context = "\n\n".join([c["text"] for c in chunks_with_sources])
    
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
    
    sources = []
    for chunk in chunks_with_sources:
        sources.append({
            "source": chunk["source"],
            "chunk_index": chunk["chunk_index"],
            "preview": chunk["text"][:150] + "..."
        })
    
    return {
        "answer": answer,
        "sources": sources
    }
def summarize_document(chunks: list) -> str:
    # Take first 10 chunks for summary to avoid token limits
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