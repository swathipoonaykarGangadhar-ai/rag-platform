import chromadb
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

client = chromadb.PersistentClient(path="./data/vectordb")
collection = client.get_or_create_collection(name="documents")

def embed_and_store(chunks: list, filename: str):
    for i, chunk in enumerate(chunks):
        embedding = model.encode(chunk).tolist()
        collection.add(
            ids=[f"{filename}_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{"source": filename, "chunk_index": i}]
        )
    return len(chunks)

def search_similar(query: str, n_results: int = 5) -> list:
    query_embedding = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    return results["documents"][0]