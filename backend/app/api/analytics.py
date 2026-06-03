from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.services import analytics_service as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def get_analytics(db: AsyncSession = Depends(get_db)):
    return await svc.get_analytics(db)
