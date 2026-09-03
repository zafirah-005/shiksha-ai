from app.core import config
from app.rag import embeddings as emb
from app.rag import ingest
from app.rag import vector_store as vs


def index_document(doc_id: str, path: str) -> int:
    """Parse, chunk, embed, and store a document. Returns number of chunks indexed."""
    text = ingest.load_document(path)
    chunks = ingest.chunk_text(text)
    vectors = emb.embed_texts(chunks)
    vs.add_chunks(doc_id, chunks, vectors)
    return len(chunks)


def retrieve(doc_id: str, query: str, top_k: int = None) -> list[str]:
    top_k = top_k or config.RETRIEVAL_TOP_K
    query_vector = emb.embed_query(query)
    return vs.query(doc_id, query_vector, top_k=top_k)
