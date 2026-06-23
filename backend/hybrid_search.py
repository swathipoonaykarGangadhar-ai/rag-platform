import numpy as np
from rank_bm25 import BM25Okapi
from backend.embedder import model, collection

def hybrid_search(query: str, n_results: int = 5) -> list:
    # Step 1 — Get ALL stored chunks from vector DB
    all_data = collection.get(include=["documents", "metadatas"])
    all_docs = all_data["documents"]
    all_metas = all_data["metadatas"]

    if not all_docs:
        return []

    # Step 2 — BM25 keyword search
    tokenized_docs = [doc.lower().split() for doc in all_docs]
    bm25 = BM25Okapi(tokenized_docs)
    tokenized_query = query.lower().split()
    bm25_scores = bm25.get_scores(tokenized_query)

    # Normalize BM25 scores to 0-1
    bm25_max = max(bm25_scores) if max(bm25_scores) > 0 else 1
    bm25_scores_norm = bm25_scores / bm25_max

    # Step 3 — Vector semantic search
    query_embedding = model.encode(query).tolist()
    vector_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results * 2, len(all_docs)),
        include=["documents", "metadatas", "distances"]
    )

    # Build vector score map
    vector_score_map = {}
    distances = vector_results["distances"][0]
    vector_docs = vector_results["documents"][0]
    vector_metas = vector_results["metadatas"][0]

    for i, doc in enumerate(vector_docs):
        # Convert distance to similarity score (0-1)
        score = 1 - (distances[i] / 2)
        vector_score_map[doc] = {
            "score": score,
            "metadata": vector_metas[i]
        }

    # Step 4 — Combine scores (60% vector + 40% BM25)
    combined = []
    for i, doc in enumerate(all_docs):
        vector_score = vector_score_map.get(doc, {}).get("score", 0)
        bm25_score = float(bm25_scores_norm[i])
        hybrid_score = (0.6 * vector_score) + (0.4 * bm25_score)
        combined.append({
            "text": doc,
            "source": all_metas[i].get("source", "Unknown"),
            "chunk_index": all_metas[i].get("chunk_index", i),
            "hybrid_score": hybrid_score,
            "vector_score": round(vector_score, 3),
            "bm25_score": round(bm25_score, 3)
        })

    # Step 5 — Sort by hybrid score and return top N
    combined.sort(key=lambda x: x["hybrid_score"], reverse=True)
    return combined[:n_results]