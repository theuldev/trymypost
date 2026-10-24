from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, DateTime, Text, JSON, Index
from sqlalchemy.sql import func
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, index=True)
    
    # Event identification
    event_type = Column(String(50), nullable=False, index=True)  # email_generation_started, email_generation_completed, email_generation_failed, profile_updated, etc.
    event_category = Column(String(50), nullable=False, index=True)  # email, profile, system, security
    
    # Actor (who performed the action)
    user_id = Column(String(36), nullable=True, index=True)  # Future: when auth is added
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Resource affected
    resource_type = Column(String(50), nullable=True, index=True)  # email_generation, user_profile, etc.
    resource_id = Column(String(36), nullable=True, index=True)  # task_id, profile_id, etc.
    
    # Event details
    action = Column(String(100), nullable=False)  # create, update, delete, generate, failed
    status = Column(String(20), nullable=False, index=True)  # success, failure, pending
    message = Column(Text, nullable=True)  # Human-readable description
    
    # Request/Response metadata (JSON for flexibility)
    request_data = Column(JSON, nullable=True)  # Sanitized request payload
    response_data = Column(JSON, nullable=True)  # Sanitized response summary
    error_details = Column(JSON, nullable=True)  # Error info if failed
    
    # Performance metrics
    duration_ms = Column(String(20), nullable=True)  # How long the operation took
    
    # Correlation
    correlation_id = Column(String(36), nullable=True, index=True)  # For tracing related events
    parent_event_id = Column(String(36), nullable=True, index=True)  # For event chaining
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index("ix_audit_logs_event_type_created", "event_type", "created_at"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_correlation", "correlation_id"),
    )