from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoint_ws import router as ws_router
from app.api.endpoint_scrape import router as scrape_router
from app.api.endpoint_playwright import router as playwright_router

app = FastAPI(
    title="GhostScrape",
    version="0.3.0",
    description="GhostScrape API — WebSocket relay + anti-blocking scraper",
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
app.include_router(scrape_router)
app.include_router(playwright_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
