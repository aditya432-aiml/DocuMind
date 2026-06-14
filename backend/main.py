from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.database import init_db
from auth.routers.auth import router as auth_router
from routers.document import router as document_router, init_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        init_pipeline(app)
    except Exception as e:
        print(f"[Lifespan] Failed to initialize pipeline: {e}")
    yield


app = FastAPI(title="DocuMind API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(document_router)
