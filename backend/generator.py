import os
from groq import Groq

api_key = os.environ.get("GROQ_API_KEY", "").strip()
client = Groq(api_key=api_key)

def generate_answer(query: str, context_chunks: list) -> str:
    context = "\n\n".join(context_chunks)
    
    prompt = f"""You are a helpful document assistant. 
Answer the user's question based ONLY on the provided context.
If the answer is not in the context, say "I couldn't find that in the documents."

Context from documents:
{context}

User question: {query}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,
        max_tokens=1024
    )
    
    return response.choices[0].message.content