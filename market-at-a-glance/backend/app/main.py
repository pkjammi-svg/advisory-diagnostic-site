"""FastAPI entrypoint — Market at a Glance backend.

Run: uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.api.routes import router

app = FastAPI(
    title="Market at a Glance API",
    description="Personal research/decision-support tool for Indian equity markets. Not investment advice.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"app": "Market at a Glance API", "docs": "/docs"}
