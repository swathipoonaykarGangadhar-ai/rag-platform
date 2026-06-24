import os
import json
from groq import Groq
from backend.hybrid_search import hybrid_search

api_key = os.environ.get("GROQ_API_KEY", "").strip()
client = Groq(api_key=api_key)

def run_agent(question: str, max_steps: int = 3) -> dict:
    steps = []
    all_chunks = []
    all_sources = []

    # Step 1 — Plan what to search for
    plan_prompt = f"""You are a research planning assistant.
Given this question: "{question}"

Generate {max_steps} different search queries to find comprehensive information.
Return ONLY a JSON array of strings, nothing else.
Example: ["query 1", "query 2", "query 3"]"""

    plan_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": plan_prompt}],
        temperature=0.3,
        max_tokens=200
    )

    try:
        raw = plan_response.choices[0].message.content.strip()
        # Clean up response
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        search_queries = json.loads(raw)
        if not isinstance(search_queries, list):
            search_queries = [question]
    except:
        search_queries = [question]

    steps.append({
        "step": "Planning",
        "description": "Breaking down the question into search queries",
        "queries": search_queries
    })

    # Step 2 — Execute searches
    seen_texts = set()
    for query in search_queries[:max_steps]:
        results = hybrid_search(query, n_results=3)
        for chunk in results:
            text = chunk.get("text", "")
            if text not in seen_texts:
                seen_texts.add(text)
                all_chunks.append(chunk)
                source = chunk.get("source", "Unknown")
                if source not in all_sources:
                    all_sources.append(source)

        steps.append({
            "step": "Searching",
            "description": f'Searched for: "{query}"',
            "results_found": len(results)
        })

    # Step 3 — Reason and synthesize
    context = "\n\n".join([
        f"[Source: {c.get('source', 'Unknown')}]\n{c.get('text', '')}"
        for c in all_chunks[:10]
    ])

    synthesis_prompt = f"""You are an expert research assistant.
You have gathered information from multiple searches to answer this question comprehensively.

Question: {question}

Research findings:
{context}

Provide a comprehensive, well-structured answer that:
1. Directly answers the question
2. Includes specific details from the documents
3. Organizes information clearly
4. Notes if any part couldn't be found in the documents

Answer:"""

    final_response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": synthesis_prompt}],
        temperature=0.1,
        max_tokens=1500
    )

    answer = final_response.choices[0].message.content

    steps.append({
        "step": "Synthesizing",
        "description": f"Combined {len(all_chunks)} chunks from {len(all_sources)} sources",
        "sources": all_sources
    })

    # Calculate confidence
    answer_words = set(answer.lower().split())
    context_words = set(context.lower().split())
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "and", "or"}
    keywords = answer_words - stop_words
    matched = keywords.intersection(context_words)
    confidence_score = round((len(matched) / len(keywords)) * 100) if keywords else 50

    sources = []
    for chunk in all_chunks[:5]:
        sources.append({
            "source": chunk.get("source", "Unknown"),
            "chunk_index": chunk.get("chunk_index", 0),
            "preview": chunk.get("text", "")[:150] + "...",
            "hybrid_score": round(chunk.get("hybrid_score", 0), 3)
        })

    return {
        "answer": answer,
        "steps": steps,
        "sources": sources,
        "confidence": {
            "score": confidence_score,
            "label": "High Confidence" if confidence_score >= 70 else "Medium Confidence" if confidence_score >= 40 else "Low Confidence",
            "color": "green" if confidence_score >= 70 else "yellow" if confidence_score >= 40 else "red"
        },
        "total_chunks_searched": len(all_chunks),
        "sources_searched": all_sources
    }