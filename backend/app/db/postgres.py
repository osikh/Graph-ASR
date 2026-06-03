from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Float, Integer, DateTime, Text, JSON, func
from datetime import datetime
from app.config import cfg

engine = create_async_engine(cfg.postgres_url, echo=cfg.app_env == "development")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class SessionRow(Base):
    __tablename__ = "sessions"

    id:         Mapped[str]      = mapped_column(String, primary_key=True)
    question:   Mapped[str]      = mapped_column(Text)
    status:     Mapped[str]      = mapped_column(String, default="pending")
    confidence: Mapped[float]    = mapped_column(Float, default=0.0)
    node_count: Mapped[int]      = mapped_column(Integer, default=0)
    edge_count: Mapped[int]      = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class EventRow(Base):
    __tablename__ = "events"

    id:         Mapped[str]   = mapped_column(String, primary_key=True)
    session_id: Mapped[str]   = mapped_column(String, index=True)
    t:          Mapped[float] = mapped_column(Float)
    agent:      Mapped[str]   = mapped_column(String)
    kind:       Mapped[str]   = mapped_column(String)
    title:      Mapped[str]   = mapped_column(String)
    payload:    Mapped[dict]  = mapped_column(JSON)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    await engine.dispose()
