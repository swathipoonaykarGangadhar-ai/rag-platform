from backend.embedder import model, collection

def search_with_sources(query: str, n_results: int = 5) -> list:
    query_embedding = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas"]
    )
    
    chunks_with_sources = []
    for i, doc in enumerate(results["documents"][0]):
        metadata = results["metadatas"][0][i]
        chunks_with_sources.append({
            "text": doc,
            "source": metadata.get("source", "Unknown"),
            "chunk_index": metadata.get("chunk_index", i)
        })
    
    return chunks_with_sources