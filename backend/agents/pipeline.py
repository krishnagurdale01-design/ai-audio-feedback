"""
Pipeline Orchestrator — LangGraph-inspired Sequential State Graph
==================================================================
Defines a directed acyclic graph of agent nodes and executes them
sequentially, threading a shared PipelineState through each node.

The graph structure:
  START → intake_agent → router_agent → refiner_agent → qa_agent → END

Each node receives PipelineState and returns a mutated copy.
An optional async callback fires after every node for real-time
WebSocket status updates to the frontend.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

from .schemas import AgentLog, AgentStatus, PipelineState, ProcessResponse
from . import intake_agent, router_agent, refiner_agent, qa_agent


# ── Agent Node definition ──────────────────────────────────────────────────

@dataclass
class AgentNode:
    """A single node in the agent execution graph."""
    name: str
    display_name: str
    description: str
    run_fn: Callable[[PipelineState], Awaitable[PipelineState]]


# ── Agent Graph (sequential DAG) ───────────────────────────────────────────

@dataclass
class AgentGraph:
    """
    Sequential agent graph inspired by LangGraph's StateGraph.
    Nodes execute in insertion order, passing shared state.
    """
    nodes: list[AgentNode] = field(default_factory=list)

    def add_node(
        self,
        name: str,
        display_name: str,
        description: str,
        run_fn: Callable[[PipelineState], Awaitable[PipelineState]],
    ) -> "AgentGraph":
        self.nodes.append(AgentNode(name, display_name, description, run_fn))
        return self

    async def execute(
        self,
        state: PipelineState,
        on_update: Optional[Callable[[dict[str, Any]], Awaitable[None]]] = None,
    ) -> PipelineState:
        """
        Run every node sequentially.
        `on_update` is called with the serialised state after each node
        so the frontend can animate progress in real time.
        """
        total = len(self.nodes)

        # Initialise log entries for every agent (so the UI shows them all)
        state.agent_logs = [
            AgentLog(
                agent_name=n.name,
                display_name=n.display_name,
                status=AgentStatus.PENDING,
            )
            for n in self.nodes
        ]

        state.status = AgentStatus.RUNNING
        if on_update:
            await on_update(state.model_dump())

        for i, node in enumerate(self.nodes):
            log = state.agent_logs[i]
            log.status = AgentStatus.RUNNING
            log.started_at = datetime.now(timezone.utc).isoformat()

            state.current_agent = node.name
            state.progress = round(i / total, 2)
            if on_update:
                await on_update(state.model_dump())

            # ── Execute agent ──
            start = time.perf_counter()
            try:
                # Simulate realistic processing latency for demo UX
                await asyncio.sleep(0.8)
                state = await node.run_fn(state)
                log.status = AgentStatus.COMPLETED
            except Exception as exc:
                log.status = AgentStatus.ERROR
                log.summary = str(exc)
                state.status = AgentStatus.ERROR
                if on_update:
                    await on_update(state.model_dump())
                raise

            elapsed_ms = int((time.perf_counter() - start) * 1000)
            log.completed_at = datetime.now(timezone.utc).isoformat()
            log.duration_ms = elapsed_ms

            # Populate per-agent summary
            if node.name == "intake":
                log.items_processed = len(state.timestamp_entries)
                log.summary = f"Extracted {log.items_processed} timestamped comments"
            elif node.name == "router":
                log.items_processed = len(state.routed_entries)
                log.summary = f"Classified {log.items_processed} entries across departments"
            elif node.name == "refiner":
                log.items_processed = len(state.refined_tasks)
                log.summary = f"Generated {log.items_processed} actionable tasks"
            elif node.name == "qa":
                log.items_processed = len(state.qa_flags)
                log.summary = f"Detected {log.items_processed} potential issues"

            if on_update:
                await on_update(state.model_dump())

        state.status = AgentStatus.COMPLETED
        state.current_agent = "done"
        state.progress = 1.0
        if on_update:
            await on_update(state.model_dump())

        return state


# ── Build the default 4-agent graph ────────────────────────────────────────

def build_graph() -> AgentGraph:
    """Construct the production agent graph."""
    graph = AgentGraph()
    graph.add_node(
        "intake",
        "Intake & Timeline Agent",
        "Extracts timestamps and segments feedback",
        intake_agent.run,
    )
    graph.add_node(
        "router",
        "Department Router Agent",
        "Classifies comments by post-production department",
        router_agent.run,
    )
    graph.add_node(
        "refiner",
        "Task Refiner Agent",
        "Rewrites comments into professional Kanban tasks",
        refiner_agent.run,
    )
    graph.add_node(
        "qa",
        "QA & Conflict Agent",
        "Scans for contradictions and flags issues",
        qa_agent.run,
    )
    return graph


# ── Convenience runner ──────────────────────────────────────────────────────

async def run_pipeline(
    raw_feedback: str,
    on_update: Optional[Callable[[dict[str, Any]], Awaitable[None]]] = None,
) -> ProcessResponse:
    """
    One-shot convenience function: feed in raw text, get back structured tasks.
    """
    state = PipelineState(
        session_id=str(uuid.uuid4()),
        raw_feedback=raw_feedback,
    )

    graph = build_graph()
    state = await graph.execute(state, on_update=on_update)

    return ProcessResponse(
        session_id=state.session_id,
        tasks=state.refined_tasks,
        flags=state.qa_flags,
        agent_logs=state.agent_logs,
        metadata={
            "total_tasks": len(state.refined_tasks),
            "total_flags": len(state.qa_flags),
            "departments_hit": list({t.department.value for t in state.refined_tasks}),
        },
    )
