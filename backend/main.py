"""
Agentic Video Feedback Manager — FastAPI Server
=================================================
Exposes:
  • POST  /api/process     — synchronous batch processing
  • WS    /ws/process      — real-time WebSocket with per-agent updates
  • GET   /api/health      — liveness probe
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from agents.pipeline import run_pipeline
from agents.schemas import ProcessRequest


# ── App setup ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Agentic Video Feedback Manager - backend online")
    yield
    print("[INFO] Shutting down...")



app = FastAPI(
    title="Agentic Video Feedback Manager",
    description="4-agent pipeline that turns chaotic client feedback into structured production tasks.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST endpoint ───────────────────────────────────────────────────────────

@app.post("/api/process")
async def process_feedback(request: ProcessRequest):
    """
    Submit raw client feedback; receive structured tasks and QA flags.
    This is a synchronous call — all 4 agents run before returning.
    """
    result = await run_pipeline(request.raw_feedback)
    return result


# ── WebSocket endpoint (real-time agent status) ────────────────────────────

@app.websocket("/ws/process")
async def ws_process(websocket: WebSocket):
    """
    WebSocket for real-time processing.
    Client sends: {"type": "process", "feedback": "..."}
    Server pushes: {"type": "state_update", "data": {...}} after each agent
    Server sends:  {"type": "complete", "data": {...}} when done
    """
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "process":
                feedback_text = data.get("feedback", "")
                if not feedback_text.strip():
                    await websocket.send_json({
                        "type": "error",
                        "data": {"message": "Empty feedback text"},
                    })
                    continue

                async def push_update(state_dict):
                    await websocket.send_json({
                        "type": "state_update",
                        "data": state_dict,
                    })

                result = await run_pipeline(feedback_text, on_update=push_update)
                await websocket.send_json({
                    "type": "complete",
                    "data": result.model_dump(),
                })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({
                "type": "error",
                "data": {"message": str(exc)},
            })
        except Exception:
            pass


# ── Health check ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "agentic-video-feedback-manager"}


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
