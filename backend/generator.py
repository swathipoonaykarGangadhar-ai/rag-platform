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