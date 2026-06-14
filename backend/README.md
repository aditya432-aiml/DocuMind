# DocuMind Python Backend API

A secure FastAPI backend service that manages user registration/login, validates and processes PDF uploads via an Unstructured layout-aware parsing pipeline, generates vector embeddings, and performs isolated semantic queries in ChromaDB.

---

## 🛠️ Tech Stack & Libraries

- **Framework**: FastAPI (ASGI)
- **PDF Partitioning**: `unstructured[pdf]` (uses layout-aware `hi_res` partitioning and fallback to `fast` strategies)
- **Vector Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`)
- **Vector Database**: `chromadb` (persistent, local deployment)
- **Authentication**: `PyJWT` (tokens) and `pwdlib[argon2]` (password hashing)
- **Database**: `sqlite3` (user credentials)
- **Package Manager**: `uv` (reproducible environments)

---

## 🔒 Security Features & Protections

1. **Endpoint Authentication**:
   All core document endpoints require signature-verified JWT claims using `Depends(decode_access_token)`.
2. **Strict File Upload Constraints**:
   - **Pre-check**: Validates the request's `Content-Length` header and immediately rejects files larger than 20MB.
   - **Stream Verification**: Reads files in 1MB chunks and tracks total written bytes, raising a `413 Payload Too Large` exception and cleaning up disk space if the limit is exceeded.
   - **Format Spoofing Defense**: Inspects the `Content-Type` header (must be `application/pdf`) and parses the first 4 magic bytes of the file stream to ensure they match the PDF signature `b"%PDF"`.
3. **User Document Isolation**:
   - The user's ID (`sub` claim) is stored within the metadata dictionary of every indexed text chunk.
   - All check, query, and deletion requests filter chunks using ChromaDB's logical query operators (`$and`) to isolate user files completely.
4. **Vector Database Pollution Prevention**:
   - Chunks are stripped and checked. Empty or whitespace-only PDF text blocks are discarded before passing to the embedding model to preserve resources.
5. **Disk Space Exhaustion Prevention**:
   - In `/api/upload`, the uploaded temporary PDF file is tracked and guaranteed to be deleted in a `finally` block, ensuring no disk space is leaked regardless of success or failure.
6. **Graceful Error Containment**:
   - Low-level LLM and database connection errors are swallowed and mapped to clean, user-friendly `502 Bad Gateway` or `500 Internal Server Error` responses, preventing internal traceback leakage.
7. **Endpoint Rate Limiting**:
   - Simple IP-based in-memory rate limiter protecting crucial endpoints from spamming and brute-forcing (e.g. signup, login, upload, query).
8. **Thread-Safe State Scoping**:
   - Moved heavy model loading (`SentenceTransformer`) and database connections to the FastAPI lifespan startup context. State references are stored on the thread-safe `app.state` and injected into routers via FastAPI `Depends`.

---

## 🗂️ API Directory Structure

```
backend/
├── main.py                # Server entry point & lifespan startup hooks
├── pyproject.toml         # Dependencies and python version requirements
├── uv.lock                # Locked python dependencies
├── .env                   # Configuration variables (ignored by git)
│
├── auth/
│   ├── database.py        # SQLite connection builder & tables initialization
│   ├── security.py        # JWT coding, Argon2 password utility & rate limiter
│   └── routers/
│       └── auth.py        # Auth router (/signup, /login, /me, /refresh)
│
├── routers/
│   └── document.py        # PDF parser, ChromaDB, and query LLM endpoint
│
├── uploads/               # Temporary uploads folder (auto-cleaned)
└── chroma_db/             # Local database for ChromaDB vector embeddings (ignored by git)
```

---

## 🔌 API Endpoints Reference

### Authentication Endpoints (`/auth`)

- **`POST /auth/signup`**: Creates a user account. Rate limit: 5 req/min.
- **`POST /auth/login`**: Authenticates user and issues JWT. Rate limit: 10 req/min.
- **`GET /auth/me`**: Fetches user info (requires active token).
- **`POST /auth/refresh`**: Generates a renewed JWT access token by exchanging a valid (even if expired) access token. Rate limit: 15 req/min.

### Document/Q&A Endpoints (`/api`)

- **`GET /api/check?filename=...`**: Checks if a document has been processed for the current user. Rate limit: 20 req/min.
- **`POST /api/upload`**: Uploads, chunks, embeds, and indexes a PDF. Rate limit: 10 req/min.
- **`POST /api/query`**: Queries the vector database and passes relevant context to the model runner engine. Rate limit: 30 req/min.

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the `backend/` folder to customize configurations:

| Variable | Default Value | Description |
|---|---|---|
| `JWT_SECRET` | `change-this-secret...` | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | `HS256` | Encryption algorithm for token signatures |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiration duration |
| `CHROMA_DB_PATH` | `<backend>/chroma_db` | Persistent folder path for ChromaDB files |
| `UPLOAD_DIR` | `<backend>/uploads` | Target directory for temporary PDF files |
| `AUTH_DB_PATH` | `<backend>/auth/auth.db` | Custom path to the SQLite credentials database |

---

## 🏃 Running the Backend

The recommended way to run the backend is using **Docker**. Alternatively, you can build and run it locally.

### Method 1: Docker Setup (Recommended)

Build and run the backend image:

```bash
# Build the Docker image
docker build -t documind-backend .

# Run the container
docker run -d -p 8000:8000 --name documind-backend documind-backend
```

---

### Method 2: Local Setup (Alternative)

To build and run locally, make sure you have Python 3.13+ and uv installed:

```bash
# Navigate to the backend directory
cd backend

# Install uv if not installed
pip install uv

# Install python and activate environment
uv venv --python 3.13
source .venv/bin/activate

# Sync dependencies
uv sync

# Run database setup to initialize schema
python3 -c "from auth.database import init_db; init_db()"

# Start the uvicorn development server
uvicorn main:app --reload --port 8000
```


