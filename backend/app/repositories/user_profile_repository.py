from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_profile import UserProfile
from app.schemas.email_generation import UserProfileUpdate


class UserProfileRepository:

    @staticmethod
    async def get_by_app_settings_id(db: AsyncSession, app_settings_id: str) -> Optional[UserProfile]:
        """Get user profile by app_settings_id."""
        result = await db.execute(
            select(UserProfile).where(UserProfile.app_settings_id == app_settings_id)
        )
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, app_settings_id: str) -> UserProfile:
        """Create a new user profile for the given app_settings_id."""
        import uuid
        profile = UserProfile(
            id=str(uuid.uuid4()),
            app_settings_id=app_settings_id,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def update(db: AsyncSession, profile: UserProfile, data: UserProfileUpdate) -> UserProfile:
        """Update user profile with provided data."""
        for field, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(profile, field, value)
        await db.commit()
        await db.refresh(profile)
        return profile

    @staticmethod
    async def get_or_create(db: AsyncSession, app_settings_id: str) -> UserProfile:
        """Get existing profile or create a new one."""
        profile = await UserProfileRepository.get_by_app_settings_id(db, app_settings_id)
        if not profile:
            profile = await UserProfileRepository.create(db, app_settings_id)
        return profile