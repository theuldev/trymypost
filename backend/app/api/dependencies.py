from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.ai.generators.code_generator import CodeGenerator
from app.services.llm_service import LLMService


async def get_code_generator(
    db: AsyncSession = Depends(get_db),
) -> CodeGenerator:
    llm = await LLMService.get_llm(db)
    return CodeGenerator(llm)