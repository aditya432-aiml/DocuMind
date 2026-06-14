FROM python:3.13-slim

# Install system dependencies for unstructured PDF extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies (creates .venv)
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application files
COPY . .

# Expose FastAPI server port
EXPOSE 8000

# Set environment variables and path to use virtual environment binary folder
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

# Initialize SQLite database and start FastAPI server
CMD ["sh", "-c", "python -c 'from auth.database import init_db; init_db()' && uvicorn main:app --host 0.0.0.0 --port 8000"]
