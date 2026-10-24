import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditService:
    """Service for audit logging and event tracking."""

    @staticmethod
    def _sanitize_data(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Remove sensitive fields from data before logging."""
        if not data:
            return None
        
        sanitized = data.copy()
        sensitive_fields = {
            'api_key', 'password', 'secret', 'token', 'authorization',
            'tavily_api_key', 'image_api_key', 'jwt_secret'
        }
        
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = "[REDACTED]"
        
        return sanitized

    @staticmethod
    async def log_event(
        db: AsyncSession,
        event_type: str,
        event_category: str,
        action: str,
        status: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        message: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_data: Optional[Dict[str, Any]] = None,
        error_details: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None,
        correlation_id: Optional[str] = None,
        parent_event_id: Optional[str] = None,
    ) -> AuditLog:
        """Log an audit event."""
        
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            event_type=event_type,
            event_category=event_category,
            action=action,
            status=status,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            message=message,
            request_data=AuditService._sanitize_data(request_data),
            response_data=AuditService._sanitize_data(response_data),
            error_details=error_details,
            duration_ms=str(duration_ms) if duration_ms else None,
            correlation_id=correlation_id,
            parent_event_id=parent_event_id,
        )
        
        db.add(audit_log)
        await db.commit()
        await db.refresh(audit_log)
        
        return audit_log

    @staticmethod
    async def log_email_generation_started(
        db: AsyncSession,
        task_id: str,
        job_description: str,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log the start of email generation."""
        return await AuditService.log_event(
            db=db,
            event_type="email_generation_started",
            event_category="email",
            action="generate",
            status="pending",
            resource_type="email_generation",
            resource_id=task_id,
            message=f"Email generation started for task {task_id}",
            request_data={"job_description_length": len(job_description)},
            correlation_id=correlation_id,
        )

    @staticmethod
    async def log_email_generation_completed(
        db: AsyncSession,
        task_id: str,
        result: Dict[str, Any],
        duration_ms: int,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log successful email generation."""
        return await AuditService.log_event(
            db=db,
            event_type="email_generation_completed",
            event_category="email",
            action="generate",
            status="success",
            resource_type="email_generation",
            resource_id=task_id,
            message=f"Email generated successfully for task {task_id}",
            response_data={
                "recipient_email": result.get("recipient_email"),
                "subject": result.get("subject"),
                "body_length": len(result.get("body", "")),
                "extracted_job_title": result.get("extracted_info", {}).get("job_title"),
            },
            duration_ms=duration_ms,
            correlation_id=correlation_id,
        )

    @staticmethod
    async def log_email_generation_failed(
        db: AsyncSession,
        task_id: str,
        error: str,
        duration_ms: int,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log failed email generation."""
        return await AuditService.log_event(
            db=db,
            event_type="email_generation_failed",
            event_category="email",
            action="generate",
            status="failure",
            resource_type="email_generation",
            resource_id=task_id,
            message=f"Email generation failed for task {task_id}: {error}",
            error_details={"error": error},
            duration_ms=duration_ms,
            correlation_id=correlation_id,
        )

    @staticmethod
    async def log_profile_updated(
        db: AsyncSession,
        profile_id: str,
        updated_fields: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log profile update."""
        return await AuditService.log_event(
            db=db,
            event_type="profile_updated",
            event_category="profile",
            action="update",
            status="success",
            resource_type="user_profile",
            resource_id=profile_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            message=f"User profile updated: {', '.join(updated_fields.keys())}",
            request_data={"updated_fields": list(updated_fields.keys())},
            response_data={"profile_id": profile_id},
        )

    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 50,
        event_type: Optional[str] = None,
        event_category: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        correlation_id: Optional[str] = None,
    ) -> tuple[List[AuditLog], int]:
        """Get paginated audit logs with filters."""
        query = select(AuditLog).order_by(AuditLog.created_at.desc())

        if event_type:
            query = query.where(AuditLog.event_type == event_type)
        if event_category:
            query = query.where(AuditLog.event_category == event_category)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if resource_id:
            query = query.where(AuditLog.resource_id == resource_id)
        if status:
            query = query.where(AuditLog.status == status)
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        if correlation_id:
            query = query.where(AuditLog.correlation_id == correlation_id)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0

        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = result.scalars().all()

        return list(items), total

    @staticmethod
    async def get_audit_log_by_id(db: AsyncSession, log_id: str) -> Optional[AuditLog]:
        """Get a single audit log by ID."""
        result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
        return result.scalars().first()

    @staticmethod
    async def get_audit_summary(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Get audit summary statistics."""
        query = select(AuditLog)
        
        if start_date:
            query = query.where(AuditLog.created_at >= start_date)
        if end_date:
            query = query.where(AuditLog.created_at <= end_date)
        
        result = await db.execute(query)
        logs = result.scalars().all()
        
        total = len(logs)
        by_category = {}
        by_status = {}
        by_event_type = {}
        
        for log in logs:
            by_category[log.event_category] = by_category.get(log.event_category, 0) + 1
            by_status[log.status] = by_status.get(log.status, 0) + 1
            by_event_type[log.event_type] = by_event_type.get(log.event_type, 0) + 1
        
        return {
            "total_events": total,
            "by_category": by_category,
            "by_status": by_status,
            "by_event_type": by_event_type,
        }