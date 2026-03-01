"""
RAG Engine for AlumniTrust AI
Handles vector embeddings, document retrieval, and answer generation.

Uses:
  - ChromaDB PersistentClient for vector storage
  - LangChain LCEL pipe for RAG chain
  - Google Gemini 2.0 Flash via langchain-google-genai
"""

import os
from typing import List, Tuple, Optional
import chromadb
import numpy as np
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

# ─────────────────────────────────────────────
# ChromaDB — Persistent Client (0.5+ API)
# ─────────────────────────────────────────────
CHROMA_DB_PATH = "./chroma_db"
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

COLLECTION_NAME = "alumnistrust_docs"
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)

# ─────────────────────────────────────────────
# LLM — Groq LPU (llama-3.3-70b) via LangChain LCEL
# Free tier: 6000 req/min, ~10x faster than OpenAI/Gemini
# ─────────────────────────────────────────────
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.2,
    groq_api_key=os.getenv("GROQ_API_KEY"),
    max_tokens=500
)

# Text splitter for chunking uploaded docs
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100,
    separators=["\n\n", "\n", " ", ""]
)

# ─────────────────────────────────────────────
# RAG Prompt + LCEL Chain
# ─────────────────────────────────────────────
RAG_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are AlumniTrust AI, an expert compliance assistant specializing in Higher Education security frameworks (HECVAT, SOC2 Type II, FERPA).

Use ONLY the reference documents provided below to answer the question. Do not invent information.

REFERENCE DOCUMENTS:
{context}

QUESTION:
{question}

ANSWER:
If the answer is not clearly supported by the documents, respond with exactly:
Not found in references

Otherwise, provide a precise, concise answer (2–4 sentences) grounded in the context above."""
)

# LCEL chain: prompt -> llm -> parse string
rag_chain = RAG_PROMPT | llm | StrOutputParser()

# Minimum cosine similarity required to use a retrieved chunk
SIMILARITY_THRESHOLD = 0.30  # cosine distance<0.7 → similarity>0.3 (generous for short docs)


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────

def ingest_document(document_text: str, document_name: str, user_id: int, doc_id: int) -> List[str]:
    """
    Chunk a document and upsert into the ChromaDB vector store.
    Returns the list of created chunk IDs.
    """
    chunks = text_splitter.split_text(document_text)
    chunk_ids = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"user_{user_id}_doc_{doc_id}_chunk_{i}"
        chunk_ids.append(chunk_id)

        # upsert is idempotent — safe to re-run
        collection.upsert(
            ids=[chunk_id],
            documents=[chunk],
            metadatas=[{
                "user_id": str(user_id),
                "doc_id": str(doc_id),
                "document_name": document_name,
                "chunk_index": str(i)
            }]
        )

    return chunk_ids


def retrieve_context(
    query: str, user_id: int, top_k: int = 2
) -> Tuple[str, List[dict], float]:
    """
    Retrieve the top-k most relevant chunks for a query.

    Returns:
        context_text      — Formatted string of chunks for the LLM prompt
        metadatas_list    — List of dicts with chunk metadata + similarity score
        avg_similarity    — Average cosine similarity (0–1, higher = more relevant)
    """
    try:
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where={"user_id": str(user_id)}
        )

        if (not results
                or not results["documents"]
                or len(results["documents"][0]) == 0):
            return "", [], 0.0

        contexts = []
        similarities = []
        metadatas_list = []

        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if i < len(results["metadatas"][0]) else {}
            # ChromaDB cosine space returns distance; convert to similarity
            distance = results["distances"][0][i] if i < len(results["distances"][0]) else 1.0
            similarity = max(0.0, 1.0 - distance)

            similarities.append(similarity)
            contexts.append(f"[Source: {meta.get('document_name', 'Unknown')}]\n{doc}")
            metadatas_list.append({
                "document_name": meta.get("document_name", "Unknown"),
                "chunk_index": meta.get("chunk_index", "0"),
                "similarity": round(similarity, 4),
                "text": doc
            })

        context_text = "\n\n---\n\n".join(contexts)
        avg_similarity = float(np.mean(similarities)) if similarities else 0.0

        return context_text, metadatas_list, round(avg_similarity, 4)

    except Exception as e:
        print(f"[RAG] retrieve_context error: {e}")
        return "", [], 0.0


def generate_answer(
    question: str, user_id: int
) -> Tuple[str, float, Optional[dict]]:
    """
    Full RAG pipeline: retrieve → threshold check → generate.

    Returns:
        answer_text      — AI-generated answer or "Not found in references"
        confidence_pct   — Confidence score as 0–100 float
        source_info      — Dict with document name, snippet, similarity (or None)
    """
    try:
        context_text, sources, similarity = retrieve_context(question, user_id, top_k=2)

        if not context_text or similarity < SIMILARITY_THRESHOLD:
            return "Not found in references", 0.0, None

        # Invoke LCEL chain
        answer = rag_chain.invoke({"context": context_text, "question": question})
        answer = answer.strip()

        if "Not found in references" in answer:
            return "Not found in references", 0.0, None

        source_info = None
        if sources:
            source_info = {
                "document": sources[0]["document_name"],
                "snippet": sources[0]["text"][:400],  # truncate for DB storage
                "similarity": sources[0]["similarity"]
            }

        # Confidence = avg similarity converted to 0–100 pct
        confidence_pct = round(similarity * 100, 1)
        return answer, confidence_pct, source_info

    except Exception as e:
        print(f"[RAG] generate_answer error: {e}")
        return f"Error processing question: {str(e)}", 0.0, None


def batch_process_questionnaire(questions: List[str], user_id: int) -> List[dict]:
    """
    Process a list of questions from an uploaded questionnaire CSV/XLSX.
    Returns a list of result dicts ready to be saved as Answer rows.
    """
    results = []
    for i, question in enumerate(questions):
        if not question or str(question).strip() in ("", "nan", "None"):
            continue

        question_str = str(question).strip()
        answer, confidence_pct, source_info = generate_answer(question_str, user_id)

        results.append({
            "question": question_str,
            "answer": answer,
            "confidence": confidence_pct,
            "source_document": source_info["document"] if source_info else "N/A",
            "source_snippet": source_info["snippet"] if source_info else "",
            "is_found": "Not found" not in answer
        })
        # No delay needed — Groq handles 6000 req/min on free tier

    return results


def delete_user_documents(user_id: int, doc_id: int) -> None:
    """Remove all chunks for a given document from the vector store."""
    try:
        existing = collection.get(where={
            "user_id": str(user_id),
            "doc_id": str(doc_id)
        })
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception as e:
        print(f"[RAG] delete_user_documents error: {e}")


def reset_collection() -> None:
    """Delete and recreate the collection (for testing/dev use only)."""
    global collection
    try:
        chroma_client.delete_collection(name=COLLECTION_NAME)
    except Exception:
        pass
    collection = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )
