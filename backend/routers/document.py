import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import chromadb
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request, FastAPI
from openai import OpenAI
from auth.security import decode_access_token, rate_limiter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from unstructured.chunking.title import chunk_by_title
from unstructured.partition.pdf import partition_pdf

# Load environment variables from .env file
load_dotenv()

router = APIRouter(prefix="/api")

# Configuration
BACKEND_DIR = Path(__file__).resolve().parent.parent
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(BACKEND_DIR / "chroma_db"))
COLLECTION_NAME = "new_multi_pdf_pipeline_collection"
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BACKEND_DIR / "uploads")))

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def init_pipeline(app: FastAPI):
    """Initialize the embedding model and ChromaDB client during lifespan."""
    print(f"[Pipeline] Loading embedding model: {EMBEDDING_MODEL_NAME}...")
    app.state.embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, device="cpu")
    
    print(f"[Pipeline] Initializing ChromaDB at: {CHROMA_DB_PATH}...")
    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    app.state.collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

def get_embedding_model(request: Request) -> SentenceTransformer:
    model = getattr(request.app.state, "embedding_model", None)
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding model not initialized.",
        )
    return model

def get_collection(request: Request) -> chromadb.Collection:
    coll = getattr(request.app.state, "collection", None)
    if coll is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database collection not initialized.",
        )
    return coll

def partition_pdf_safe(file_path: str):
    """
    Partition the PDF layout.
    Falls back to 'fast' strategy if 'hi_res' fails due to missing system packages.
    """
    try:
        print(f"[Pipeline] Partitioning PDF using hi_res: {file_path}")
        return partition_pdf(
            filename=file_path,
            strategy="hi_res",
            languages=["eng"],
            include_metadata=True,
            infer_table_structure=True,
            extract_images_in_pdf=False,
        )
    except Exception as e:
        print(f"[Pipeline] hi_res failed ({e}). Falling back to fast strategy...")
        return partition_pdf(
            filename=file_path,
            strategy="fast",
            languages=["eng"],
            include_metadata=True,
        )


class QueryRequest(BaseModel):
    document_name: Optional[str] = None
    question: str


class SearchResult(BaseModel):
    content: str
    page_number: int
    section: str
    element_type: str
    source_file: str


class QueryResponse(BaseModel):
    answer: str
    results: List[SearchResult]


@router.get("/check", dependencies=[Depends(rate_limiter(limit=20, window=60))])
async def check_document_exists(
    filename: str,
    claims: dict = Depends(decode_access_token),
    collection = Depends(get_collection),
):
    """
    Check if a document with the given filename has already been processed and exists in ChromaDB.
    """
    try:
        user_id = str(claims.get("sub"))
        existing = collection.get(where={"$and": [{"source_file": filename}, {"user_id": user_id}]}, limit=1)
        exists = len(existing["ids"]) > 0 if existing else False
        return {"exists": exists}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Check failed: {str(e)}",
        )


MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB limit

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limiter(limit=10, window=60))],
)
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    claims: dict = Depends(decode_access_token),
    embedding_model = Depends(get_embedding_model),
    collection = Depends(get_collection),
):
    """
    Upload a PDF file, run the semantic parsing & chunking pipeline,
    and persist the vector embeddings in ChromaDB.
    """
    # Quick header size check
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum size allowed is {MAX_FILE_SIZE // (1024 * 1024)}MB."
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Content-Length header."
            )

    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    # Read first 4 bytes to check magic bytes (%PDF) and verify MIME type
    header_bytes = await file.read(4)
    await file.seek(0)
    if file.content_type != "application/pdf" or header_bytes != b"%PDF":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only valid PDF files are allowed.",
        )

    user_id = str(claims.get("sub"))

    # Skip processing if the file has already been indexed in ChromaDB
    try:
        existing = collection.get(where={"$and": [{"source_file": file.filename}, {"user_id": user_id}]}, limit=1)
        if existing and existing["ids"]:
            document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, file.filename))
            return {
                "document_id": document_id,
                "filename": file.filename,
                "status": "already_present",
            }
    except Exception as e:
        print(f"[Pipeline] Pre-check failed: {e}")

    # Save file to uploads folder
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-").strip()
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{safe_filename}"
    try:
        total_bytes = 0
        with file_path.open("wb") as buffer:
            while True:
                # Read file in 1MB chunks to enforce hard size limit
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File too large. Maximum size allowed is {MAX_FILE_SIZE // (1024 * 1024)}MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        # Clean up file on size limit exception
        if file_path.exists():
            file_path.unlink()
        raise
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )

    try:
        # Run semantic processing pipeline
        elements = partition_pdf_safe(str(file_path))
        chunks = chunk_by_title(
            elements,
            max_characters=1200,
            new_after_n_chars=1000,
            combine_text_under_n_chars=200,
        )

        # Normalize elements and filter out empty chunks
        normalized_chunks = []
        for idx, el in enumerate(chunks):
            text = el.text.strip()
            if not text:
                continue
            normalized_chunks.append({
                "id": f"chunk_{idx}",
                "text": text,
                "element_type": el.category or "NarrativeText",
                "page_number": getattr(el.metadata, "page_number", None) or 1,
                "section": getattr(el.metadata, "section", None) or getattr(el.metadata, "title", None) or "",
            })

        if not normalized_chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract any readable chunks from the PDF.",
            )

        # Generate embeddings
        chunk_texts = [c["text"] for c in normalized_chunks]
        embeddings = embedding_model.encode(
            chunk_texts,
            batch_size=32,
            show_progress_bar=False,
        )

        # Store in ChromaDB
        document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, file.filename))
        created_at = datetime.now(timezone.utc).isoformat()

        ids, documents, embeds, metadatas = [], [], [], []
        for i, chunk in enumerate(normalized_chunks):
            ids.append(str(uuid.uuid4()))
            documents.append(chunk["text"])
            embeds.append(embeddings[i].tolist())
            metadatas.append({
                "document_id": document_id,
                "chunk_id": chunk["id"],
                "element_type": chunk["element_type"],
                "page_number": chunk["page_number"],
                "section": chunk["section"],
                "source_file": file.filename,  # store user-facing filename as reference
                "created_at": created_at,
                "user_id": user_id,  # Add user ID for user isolation
            })

        # Check if already processed to clean older ones if we want to overwrite under the same user
        existing = collection.get(where={"$and": [{"source_file": file.filename}, {"user_id": user_id}]}, limit=10000)
        if existing and existing["ids"]:
            collection.delete(ids=existing["ids"])

        collection.add(ids=ids, documents=documents, embeddings=embeds, metadatas=metadatas)

        return {
            "document_id": document_id,
            "filename": file.filename,
            "num_chunks": len(normalized_chunks),
            "status": "success",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing PDF: {str(e)}",
        )
    finally:
        # Clean up file in both success and error cases
        if file_path.exists():
            file_path.unlink()


@router.post(
    "/query",
    response_model=QueryResponse,
    dependencies=[Depends(rate_limiter(limit=30, window=60))],
)
async def query_document(
    payload: QueryRequest,
    claims: dict = Depends(decode_access_token),
    embedding_model = Depends(get_embedding_model),
    collection = Depends(get_collection),
):
    """
    Search ChromaDB for chunks matching the natural language question,
    pass them to the docker model runner model as context to generate a response,
    and return the response and source chunks to the user.
    """
    try:
        # Encode question
        query_embedding = embedding_model.encode([payload.question])[0].tolist()

        # Build filter with user isolation
        user_id = str(claims.get("sub"))
        where_filter = {"user_id": user_id}
        if payload.document_name and payload.document_name != "No document":
            where_filter = {"$and": [{"source_file": payload.document_name}, {"user_id": user_id}]}

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=10,
            where=where_filter,
        )

        raw_results = []
        if results and "documents" in results and results["documents"]:
            for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                raw_results.append({
                    "content": doc,
                    "page_number": meta.get("page_number", 1),
                    "section": meta.get("section") or "",
                    "element_type": meta.get("element_type", "NarrativeText"),
                    "source_file": meta.get("source_file", ""),
                    "chunk_id": meta.get("chunk_id", "chunk_0"),
                })
        
        # Sort results sequentially by page number and chunk index to keep document context logically ordered
        def get_chunk_index(chunk_id_str):
            try:
                return int(chunk_id_str.split("_")[1])
            except Exception:
                return 0
                
        raw_results.sort(key=lambda x: (x["page_number"], get_chunk_index(x["chunk_id"])))
        
        search_results = []
        for r in raw_results:
            search_results.append(SearchResult(
                content=r["content"],
                page_number=r["page_number"],
                section=r["section"],
                element_type=r["element_type"],
                source_file=r["source_file"],
            ))

        # Generate answer using local model using docker model runner
        answer = ""
        if search_results:
            # Construct context from search results
            context_text = "\n\n".join([
                f"[Source: {res.source_file}, Page: {res.page_number}, Section: {res.section or 'N/A'}]\n{res.content}"
                for res in search_results
            ])
            
            system_prompt = """
            You are DocuMind, an expert document intelligence and information extraction assistant.

            Your responsibility is to answer questions strictly using the information available in the provided document context.

            ### CORE RULES

            1. SOURCE OF TRUTH
            - Use only the supplied context.
            - Do not use external knowledge, assumptions, or inference beyond what is explicitly stated.
            - If information is unavailable, respond:
                "The requested information is not mentioned in the provided context."

            2. SHORTHAND & QUERY NORMALIZATION
            Interpret common abbreviations and user shorthand before answering:
            - exp → experience
            - edu → education
            - cert → certification
            - yrs → years
            - org → organization
            - mgr → manager
            - emp → employment
            - prof → professional
            - loc → location

            3. SUBJECT RESOLUTION
            Unless explicitly stated otherwise:
            - user
            - candidate
            - applicant
            - profile owner
            - author
            - person
            - employee
            - individual

            all refer to the primary person or entity described in the document.

            4. EXPERIENCE & TIMELINE CALCULATIONS
            When asked about:
            - total experience
            - years of experience
            - tenure
            - work duration
            - employment history
            - career timeline

            perform the following steps:

            a. Identify every relevant role and date range.
            b. Convert each role duration into months.
            c. For ongoing roles marked:
                - Present
                - Current
                - Ongoing
                - Active

                use the current date provided in the prompt.

            d. Do NOT double-count overlapping employment periods.

            e. Merge overlapping date ranges before calculating totals.

            f. Show calculations clearly.

            Example:

            Role A:
            Jan 2024 - July 2024 = 7 months

            Role B:
            August 2024 - Present = 23 months

            Total:
            7 + 23 = 30 months
            30 / 12 = 2.5 years

            5. DATE HANDLING
            - Use explicit dates from the document whenever available.
            - Only use the supplied current date for active or ongoing entries.
            - Never estimate missing dates.

            6. STRUCTURED EXTRACTION QUESTIONS
            For requests involving:
            - skills
            - certifications
            - education
            - projects
            - achievements
            - organizations
            - technologies

            return concise structured lists whenever possible.

            7. ANSWER QUALITY
            - Be precise and factual.
            - Quote key values exactly as written.
            - Preserve names, dates, titles, and organizations.
            - Avoid unnecessary explanation.
            - Prefer bullet points when multiple items are present.

            8. AMBIGUOUS QUESTIONS
            If multiple interpretations are possible:
            - Explain the ambiguity.
            - Answer using the most contextually relevant interpretation.

            9. RESPONSE FORMAT
            - Start with the direct answer.
            - Provide supporting evidence from the context.
            - Include calculations when applicable.
            - Do not include information not found in the document.
            """

            current_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            user_prompt = f"""
                DOCUMENT CONTEXT
                ---------------
                {context_text}

                USER QUESTION
                -------------
                {payload.question}

                INSTRUCTIONS
                ------------
                The context above DOES contain relevant information. Read it carefully before responding.
                Do NOT say information is missing unless you have thoroughly checked all sections above.
                ------------
                1. Answer using only the document context above.
                2. If information is missing, explicitly state that it is not mentioned.
                3. For experience, tenure, employment history, or timeline questions:
                - Calculate duration for each role.
                - Merge overlapping periods.
                - Show month-by-month calculations.
                - Convert total months into years.
                4. Use the current date ({current_date_str}) only for roles marked Present, Current, Active, or Ongoing.
                5. If the answer involves multiple records, present them in a clear table or bullet list.
                6. Provide evidence from the document supporting your answer.

                Generate a complete and accurate response.
            """
            
            try:
                # Check for local model runner if not found
                client = OpenAI(base_url="http://localhost:12434/engines/v1", api_key="docker")
                model_name = "ai/ministral3:3B-Q4_K_M"
                    
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.0,
                )
                answer = response.choices[0].message.content
            except Exception as oe:
                print(f"[OpenAI] API call failed: {oe}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="LLM service failed to generate a response. Please try again later.",
                )
        else:
            answer = "No relevant context chunks were found in the database. Please verify that the document is uploaded."

        return QueryResponse(answer=answer, results=search_results)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}",
        )
