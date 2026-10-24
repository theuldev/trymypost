from typing import List, Optional, Tuple
from uuid import uuid4
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_analysis import JobAnalysis


class JobAnalysisRepository:

    @staticmethod
    async def create(db: AsyncSession, data: dict) -> JobAnalysis:
        """Create a new job analysis record."""
        analysis = JobAnalysis(
            id=str(uuid4()),
            **data,
        )
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def get_by_id(db: AsyncSession, analysis_id: str) -> Optional[JobAnalysis]:
        """Get a job analysis by id."""
        return await db.get(JobAnalysis, analysis_id)

    @staticmethod
    async def get_by_task_id(db: AsyncSession, task_id: str) -> Optional[JobAnalysis]:
        """Get job analysis by task_id."""
        result = await db.execute(
            select(JobAnalysis).where(JobAnalysis.task_id == task_id)
        )
        return result.scalars().first()

    @staticmethod
    async def list_history(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
    ) -> Tuple[List[JobAnalysis], int]:
        """List job analyses with pagination and optional search."""
        query = select(JobAnalysis).order_by(JobAnalysis.created_at.desc())

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    JobAnalysis.job_title.ilike(search_term),
                    JobAnalysis.company_name.ilike(search_term),
                    JobAnalysis.location.ilike(search_term),
                )
            )

        total_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(total_query) or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = result.scalars().all()

        return list(items), total

    @staticmethod
    async def delete(db: AsyncSession, analysis: JobAnalysis) -> None:
        """Delete a job analysis record."""
        await db.delete(analysis)
        await db.commit()
