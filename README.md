# DocuMind 🧠 — Intelligent Multi-PDF Document Q&A Platform

DocuMind is an AI-powered document intelligence platform that allows users to create accounts, securely upload PDF documents, and perform context-aware semantic searches and Q&A queries. 

The application utilizes a layout-aware PDF parsing pipeline, generates dense vector embeddings, stores them in an isolated persistent database per user, and leverages a local LLM or OpenAI-compatible completion engine to answer questions strictly from the uploaded document context.

---

## 🚀 Quick Start (Run the Entire Project)

To run the application locally, you will start the **FastAPI Backend** and the **Next.js Frontend**.

### Prerequisites
1. **Python 3.13+** (managed with [uv](https://github.com/astral-sh/uv) or pip)
2. **Node.js 18+** & **npm**
3. **Tesseract OCR** (optional, recommended for scanned/image-based PDFs)
   - *macOS*: `brew install tesseract`
   - *Ubuntu*: `sudo apt-get install tesseract-ocr`

---

### Step 1: Start the Backend Server

Navigate to the `backend/` directory, set up the environment, and launch the API server:

```bash
cd backend

# 1. Install 'uv' if not already installed
pip install uv

# 2. Create virtual environment & sync dependencies
uv venv --python 3.13
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync

# 3. Initialize SQLite Database & start dev server
python3 -c "from auth.database import init_db; init_db()"
uvicorn main:app --reload --port 8000
```

The backend API will be running at [http://localhost:8000](http://localhost:8000).

---

### Step 2: Start the Frontend Application

Open a new terminal window, navigate to the `frontend/` directory, and run the Next.js development server:

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run the Next.js development server
npm run dev
```

The frontend web app will be running at [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Architecture & Tech Stack

```
   ┌──────────────────────────────────────────────────────────┐
   │                     Next.js Frontend                     │
   │            (TypeScript, CSS Custom Variables)            │
   └────────────────────────────┬─────────────────────────────┘
                                │
                        REST API (JWT Auth)
                                │
   ┌────────────────────────────▼─────────────────────────────┐
   │                     FastAPI Backend                      │
   │    (lifespan state management, in-memory rate limiting)  │
   └───────┬──────────────────────────────────────────┬───────┘
           │                                          │
   ┌───────▼────────────────┐                  ┌───────▼───────┐
   │        SQLite          │                  │   ChromaDB    │
   │  (User Registration &  │                  │ (User-Isolated│
   │   Hashed Credentials)  │                  │  Embeddings)  │
   └────────────────────────┘                  └───────────────┘
```

- **Frontend**: [Next.js 15](file:///Users/adityabhagwat/Projects/DocuMind/frontend) (App Router), React 19, TypeScript, Vanilla CSS design tokens.
- **Backend**: [FastAPI](file:///Users/adityabhagwat/Projects/DocuMind/backend), sentence-transformers (`all-MiniLM-L6-v2`), unstructured (`partition_pdf` & `chunk_by_title`), PyJWT, and pwdlib (Argon2 hashes).
- **Databases**: SQLite (User Auth Store) and ChromaDB (Vector Store).

---

## 📖 Sub-Project Documentation

For specific setup, parameters, and architectural guides, see:
- 🐍 **[Backend README](file:///Users/adityabhagwat/Projects/DocuMind/backend/README.md)**: Python pipeline, API endpoints, thread safety models, rate limiting, and magic-byte security checks.
- ⚛️ **[Frontend README](file:///Users/adityabhagwat/Projects/DocuMind/frontend/README.md)**: React components, state variables, design customization, and silent token refresh/renewal mechanics.
