import uuid

import chromadb

from app.core import config

_client: chromadb.ClientAPI | None = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    return _client


def get_or_create_collection(doc_id: str):
    client = get_client()
    return client.get_or_create_collection(name=f"doc_{doc_id}")


def add_chunks(doc_id: str, chunks: list[str], embeddings: list[list[float]]) -> None:
    collection = get_or_create_collection(doc_id)
    ids = [f"{doc_id}-{i}-{uuid.uuid4().hex[:8]}" for i in range(len(chunks))]
    collection.add(ids=ids, documents=chunks, embeddings=embeddings)


def query(doc_id: str, query_embedding: list[float], top_k: int = 5) -> list[str]:
    collection = get_or_create_collection(doc_id)
    if collection.count() == 0:
        return []
    result = collection.query(
        query_embeddings=[query_embedding], n_results=min(top_k, collection.count())
    )
    documents = result.get("documents") or []
    return documents[0] if documents else []
