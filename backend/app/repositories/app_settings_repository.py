from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings


class AppSettingsRepository:

    @staticmethod
    def get(db: Session) -> AppSettings | None:
        return (
            db.query(AppSettings)
            .filter(AppSettings.id == 1)
            .first()
        )