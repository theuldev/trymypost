from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import LLMFactory
from app.models.app_settings import AppSettings


class LLMService:

    @staticmethod
    async def get_settings(
        db: AsyncSession,
    ) -> AppSettings:
        settings = await db.get(
            AppSettings,
            1,
        )

        if not settings:
            raise ValueError(
                "AI settings have not been configured."
            )

        return settings

    @staticmethod
    def create_llm(
        settings: AppSettings,
    ) -> BaseChatModel:
        return LLMFactory.create(settings)

    @staticmethod
    async def get_llm(
        db: AsyncSession,
    ) -> BaseChatModel:
        settings = await LLMService.get_settings(db)

        return LLMService.create_llm(settings)