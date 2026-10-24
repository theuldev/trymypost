from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app_settings import AppSettings


class AppSettingsRepository:

    @staticmethod
    async def get(db: AsyncSession) -> Optional[AppSettings]:
        """O app mantém uma única linha de configuração."""
        result = await db.execute(select(AppSettings).limit(1))
        return result.scalars().first()
