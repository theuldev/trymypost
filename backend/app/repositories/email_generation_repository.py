from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_generation import EmailGeneration


class EmailGenerationRepository:

    @staticmethod
    async def create(db: AsyncSession, data: dict) -> EmailGeneration:
        """Create a new email generation record."""
        import uuid
        email_gen = EmailGeneration(
            id=str(uuid.uuid4()),
            **data
        )
        db.add(email_gen)
        await db.commit()
        await db.refresh(email_gen)
        return email_gen

    @staticmethod
    async def get_by_task_id(db: AsyncSession, task_id: str) -> Optional[EmailGeneration]:
        """Get email generation by task_id."""
        result = await db.execute(
            select(EmailGeneration).where(EmailGeneration.task_id == task_id)
        )
        return result.scalars().first()

    @staticmethod
    async def list_history(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None
    ) -> Tuple[List[EmailGeneration], int]:
        """List email generation history with pagination and optional search."""
        query = select(EmailGeneration).order_by(EmailGeneration.created_at.desc())

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    EmailGeneration.job_title.ilike(search_term),
                    EmailGeneration.company_name.ilike(search_term),
                    EmailGeneration.subject.ilike(search_term),
                    EmailGeneration.recipient_email.ilike(search_term),
                )
            )

        # Count total
        total_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(total_query) or 0

        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = result.scalars().all()

        return list(items), total