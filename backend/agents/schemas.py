"""
Pydantic schemas shared across all 4 agents and the pipeline orchestrator.
Each agent consumes the previous agent's output via the shared PipelineState.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class Department(str, Enum):
    VFX = "VFX"
    AUDIO = "Audio"
    COLOR = "Color Grading"
    EDITING = "Editing"


class Priority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


# ── Agent 1 outputs ─────────────────────────────────────────────────────────

class TimestampEntry(BaseModel):
    """A single timestamped feedback comment extracted by the Intake Agent."""
    timestamp: str = Field(..., description="Standardised MM:SS format")
    timestamp_seconds: int = Field(..., description="Total seconds for proximity math")
    raw_text: str = Field(..., description="Original client wording")


# ── Agent 2 outputs ─────────────────────────────────────────────────────────

class RoutedEntry(BaseModel):
    """Timestamped comment with a department classification from the Router."""
    timestamp: str
    timestamp_seconds: int
    raw_text: str
    department: Department
    confidence: float = Field(..., ge=0.0, le=1.0)
    routing_reason: str


# ── Agent 3 outputs ─────────────────────────────────────────────────────────

class RefinedTask(BaseModel):
    """A professional Jira/Kanban-ready task produced by the Refiner Agent."""
    id: str = Field(..., description="e.g. TASK-001")
    timestamp: str
    timestamp_seconds: int
    department: Department
    original_text: str
    task_title: str
    task_description: str
    priority: Priority
    priority_reason: str


# ── Agent 4 outputs ─────────────────────────────────────────────────────────

class QAFlag(BaseModel):
    """A warning or conflict flag raised by the QA & Conflict Agent."""
    flag_id: str
    flag_type: str = Field(..., description="contradiction | ambiguity | duplicate")
    severity: str = Field(..., description="warning | error")
    affected_task_ids: list[str]
    message: str
    suggestion: str


# ── Pipeline state (passed through every agent node) ────────────────────────

class AgentLog(BaseModel):
    """Execution trace for a single agent run."""
    agent_name: str
    display_name: str
    status: AgentStatus = AgentStatus.PENDING
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None
    items_processed: int = 0
    summary: str = ""


class PipelineState(BaseModel):
    """
    The mutable state object carried through the entire agent graph.
    Inspired by LangGraph's TypedDict state pattern.
    """
    session_id: str = ""
    raw_feedback: str = ""
    current_agent: str = "idle"
    status: AgentStatus = AgentStatus.PENDING
    progress: float = 0.0

    # Accumulated outputs from each agent
    timestamp_entries: list[TimestampEntry] = []
    routed_entries: list[RoutedEntry] = []
    refined_tasks: list[RefinedTask] = []
    qa_flags: list[QAFlag] = []

    agent_logs: list[AgentLog] = []


# ── API request / response ──────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    raw_feedback: str


class ProcessResponse(BaseModel):
    session_id: str
    tasks: list[RefinedTask]
    flags: list[QAFlag]
    agent_logs: list[AgentLog]
    metadata: dict
