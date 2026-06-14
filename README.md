# DocuMind 🧠 — Secure, Multi-User Intelligent PDF Q&A Platform

DocuMind is a state-of-the-art, AI-powered document intelligence platform designed to let users create secure accounts, upload PDF documents, and query them using context-aware semantic Q&A. 

The system leverages a layout-aware PDF parsing pipeline, generates dense vector embeddings, isolates document embeddings by user ID, and interfaces with a local LLM or OpenAI-compatible inference engine to guarantee that answers are drawn strictly and safely from the uploaded context.

---

## 🔒 Key Security & Architectural Features

DocuMind is engineered from the ground up to prevent common LLM-app vulnerabilities, offering:
- **Strict Endpoint Authentication**: All core PDF upload and query endpoints are protected by signature-verified JWT access tokens.
- **Payload & Spoofing Defense**: Uploads are restricted to a hard **20MB limit** using streaming size counters. Files are checked for both `application/pdf` MIME type and `%PDF` magic bytes.
- **Complete User Isolation**: Uploaded documents and vectors are tagged with the owner's user ID. Logical query filters guarantee that users can only query, list, or access their own documents.
- **Thread-Safe Model Operations**: Heavy machine learning models (e.g. SentenceTransformer) and persistent clients are managed safely within the FastAPI lifespan startup context to avoid thread contention.
- **Session Continuity (Silent Token Refresh)**: The React client continuously evaluates token expiration and silently fetches renewed tokens from the backend before expiry, ensuring a seamless user experience.
- **Custom Markdown & HTML UI Rendering**: A custom, safe HTML/Markdown rendering engine handles complex LLM outputs (like markdown/HTML tables, lists, and formatted text) securely on the UI.

---

## 🛠️ Architecture & Data Flow

```
   ┌──────────────────────────────────────────────────────────┐
   │                     Next.js Frontend                     │
   │            (React 19, TypeScript, Vanilla CSS)           │
   └────────────────────────────┬─────────────────────────────┘
                                │
                        REST API (JWT Auth)
                                │
   ┌────────────────────────────▼─────────────────────────────┐
   │                     FastAPI Backend                      │
   │  (Lifespan State, In-Memory Rate Limiting, PDF Parsing)  │
   └───────┬──────────────────────────────────────────┬───────┘
            │                                          │
   ┌───────▼────────────────┐                  ┌───────▼───────┐
   │   SQLite (Auth DB)     │                  │   ChromaDB    │
   │  (User Records & Safe  │                  │ (User-Isolated│
   │   Argon2 Password pH)  │                  │  Embeddings)  │
   └────────────────────────┘                  └───────────────┘
```

- **Frontend**: [Next.js 15](file:///Users/adityabhagwat/Projects/DocuMind/frontend) (App Router), React 19, TypeScript, Vanilla CSS design tokens.
- **Backend**: [FastAPI](file:///Users/adityabhagwat/Projects/DocuMind/backend), SentenceTransformers (`all-MiniLM-L6-v2`), Unstructured (`partition_pdf` & `chunk_by_title`), PyJWT, and pwdlib (Argon2 hashes).
- **Databases**: SQLite (credentials storage) and ChromaDB (persistent vector embeddings).

---

## 🚀 Quick Start (Running the Entire Project)

The recommended way to run the entire DocuMind application is using **Docker Compose**. Alternatively, you can build and run each service locally.

### Prerequisites (For Both Methods)
- **Local LLM Runner**: Make sure your local engine (e.g., Ollama or LocalAI) is running on the host machine at `http://localhost:12434/engines/v1` with the model `ai/ministral3:3B-Q4_K_M` loaded.

---

### Method 1: Running with Docker Compose 🐳 (Recommended)

To build and start both the frontend and backend using Docker:

```bash
docker compose up --build
```

This will automatically:
1. Build the FastAPI backend container (exposing port `8000`).
2. Build the Next.js frontend container (exposing port `3000`).
3. Set up persistent Docker volumes for the SQLite credentials database, ChromaDB vector database, and temporary upload folder so that no data is lost when containers restart.

Once finished, open [http://localhost:3000](http://localhost:3000) to view the application.

---

### Method 2: Manual Local Installation (Alternative)

If you prefer to run the services without Docker, make sure you have the following additional prerequisites installed:
1. **Python 3.13+** (managed with [uv](https://github.com/astral-sh/uv) or pip)
2. **Node.js 18+** & **npm**
3. **Tesseract OCR** (optional, recommended for scanned/image-based PDFs)
   - *macOS*: `brew install tesseract`
   - *Ubuntu*: `sudo apt-get install tesseract-ocr`

#### Step 1: Start the Backend Server

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Set up the Python virtual environment and install dependencies:
   ```bash
   # Install 'uv' if not already installed
   pip install uv

   # Create virtual environment & sync dependencies
   uv venv --python 3.13
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   uv sync
   ```

3. Initialize the SQLite user database and start the API development server:
   ```bash
   # Create database tables
   python3 -c "from auth.database import init_db; init_db()"

   # Launch the FastAPI app
   uvicorn main:app --reload --port 8000
   ```

The backend API will run at [http://localhost:8000](http://localhost:8000).

#### Step 2: Start the Frontend Application

1. Open a new terminal window and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies and run the Next.js development server:
   ```bash
   # Install Node packages
   npm install

   # Start dev server
   npm run dev
   ```

The frontend application will be running at [http://localhost:3000](http://localhost:3000).

---

## 📖 Detailed Guides

For specific setup configurations, environment variables, and inner workings:
- 🐍 **[Backend Documentation](file:///Users/adityabhagwat/Projects/DocuMind/backend/README.md)**: Details on the parsing pipeline, secure endpoints, rate limits, and SQLite/ChromaDB models.
- ⚛️ **[Frontend Documentation](file:///Users/adityabhagwat/Projects/DocuMind/frontend/README.md)**: Details on components, silent renewal loop, custom markdown renderer, and styling tokens.
