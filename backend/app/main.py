from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.config import cfg
from app.db.postgres import init_db, close_db
from app.db.neo4j import init_neo4j, close_neo4j
from app.api import sessions, health, graph, analytics

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup.begin")
    await init_db()
    await init_neo4j()
    log.info("startup.complete", env=cfg.app_env)
    yield
    await close_db()
    await close_neo4j()
    log.info("shutdown.complete")


app = FastAPI(
    title="Graph-Augmented ARS",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(sessions.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/")
async def root():
    return {"service": "Graph-Augmented ARS", "version": "0.1.0", "status": "running"}
