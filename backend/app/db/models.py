"""SQLAlchemy ORM Data Models for NoBugs AI"""
import datetime
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    Index,
    JSON,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow_dt():
    return datetime.datetime.now(datetime.timezone.utc)


class LogFileModel(Base):
    __tablename__ = "log_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    upload_timestamp = Column(DateTime(timezone=True), default=utcnow_dt, nullable=False)
    parsing_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, PARSED, FAILED
    total_lines = Column(Integer, default=0, nullable=False)
    parsed_events_count = Column(Integer, default=0, nullable=False)
    error_events_count = Column(Integer, default=0, nullable=False)
    time_range_start = Column(DateTime, nullable=True)
    time_range_end = Column(DateTime, nullable=True)
    processing_errors = Column(JSON, default=list, nullable=False)
    raw_preview = Column(Text, nullable=True)
    redaction_count = Column(Integer, default=0, nullable=False)

    events = relationship("LogEventModel", back_populates="log_file", cascade="all, delete-orphan")


class LogEventModel(Base):
    __tablename__ = "log_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    file_id = Column(String(36), ForeignKey("log_files.id", ondelete="CASCADE"), nullable=False, index=True)
    original_line_number = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=True, index=True)
    log_level = Column(String(20), default="INFO", nullable=False, index=True)  # DEBUG, INFO, WARN, ERROR, CRITICAL
    component = Column(String(100), nullable=True, index=True)
    message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    trace_id = Column(String(100), nullable=True, index=True)
    request_id = Column(String(100), nullable=True, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Anomaly / Classification
    is_error = Column(Boolean, default=False, nullable=False, index=True)
    error_type = Column(String(100), nullable=True)  # Exception name or category
    signature = Column(String(64), nullable=True, index=True)  # MD5/SHA256 fingerprint of error template
    is_malformed = Column(Boolean, default=False, nullable=False)

    log_file = relationship("LogFileModel", back_populates="events")
    incident = relationship("IncidentModel", back_populates="events")

    __table_args__ = (
        Index("idx_log_event_file_line", "file_id", "original_line_number"),
        Index("idx_log_event_time_error", "timestamp", "is_error"),
    )


class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="Mild", nullable=False, index=True)  # Critical, High, Mild
    lifecycle_status = Column(String(20), default="Open", nullable=False, index=True)  # Open, Investigating, Resolved, Reopened
    first_seen = Column(DateTime, nullable=True, index=True)
    last_seen = Column(DateTime, nullable=True, index=True)
    occurrence_count = Column(Integer, default=1, nullable=False)
    related_event_ids = Column(JSON, default=list, nullable=False)
    affected_components = Column(JSON, default=list, nullable=False)

    # AI Diagnosis / RCA
    root_cause_hypothesis = Column(Text, nullable=True)
    supporting_evidence = Column(JSON, default=list, nullable=False)
    alternative_hypotheses = Column(JSON, default=list, nullable=False)
    ai_confidence = Column(String(20), nullable=True)  # High, Medium, Low
    ai_confidence_rationale = Column(Text, nullable=True)
    recommended_fixes = Column(JSON, default=list, nullable=False)
    verification_steps = Column(JSON, default=list, nullable=False)
    missing_information = Column(JSON, default=list, nullable=False)
    limitations = Column(JSON, default=list, nullable=False)
    last_analysis_timestamp = Column(DateTime, nullable=True)
    ai_analyzed = Column(Boolean, default=False, nullable=False)
    ai_provider_used = Column(String(50), nullable=True)

    events = relationship("LogEventModel", back_populates="incident")
    analyses = relationship("AIAnalysisModel", back_populates="incident", cascade="all, delete-orphan")


class AIAnalysisModel(Base):
    __tablename__ = "ai_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)
    analysis_timestamp = Column(DateTime(timezone=True), default=utcnow_dt, nullable=False)
    diagnosis = Column(Text, nullable=False)
    evidence_references = Column(JSON, default=list, nullable=False)
    confidence_rationale = Column(Text, nullable=True)
    recommended_actions = Column(JSON, default=list, nullable=False)
    limitations_and_missing = Column(JSON, default=list, nullable=False)
    raw_response = Column(JSON, nullable=True)

    incident = relationship("IncidentModel", back_populates="analyses")


class IncidentRelationshipModel(Base):
    __tablename__ = "incident_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(36), nullable=False, index=True)  # Event or incident ID
    target_id = Column(String(36), nullable=False, index=True)  # Event or incident ID
    relationship_type = Column(String(50), nullable=False)  # CAUSED_BY, SYMPTOM_OF, CO_OCCURRING, DUPLICATE_OF
    supporting_evidence = Column(Text, nullable=True)
    confidence = Column(String(20), default="Medium", nullable=False)  # High, Medium, Low
    created_at = Column(DateTime(timezone=True), default=utcnow_dt, nullable=False)

