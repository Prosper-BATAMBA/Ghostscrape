from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoint_ws import router as ws_router

app = FastAPI(
    title="GhostScrape",
    version="0.2.0",
    description="WebSocket relay for GhostScrape extension",
)

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

app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
