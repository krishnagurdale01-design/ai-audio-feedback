"""
Agent 3 — Task Refiner Agent
=============================
Converts each RoutedEntry's casual/emotional client text into a
professional, actionable Jira/Kanban-style task with:
  • A concise task title (≤ 80 chars)
  • A clear multi-sentence description
  • A Priority level (High / Medium / Low) with reasoning
"""

from __future__ import annotations

import re

from .schemas import Department, PipelineState, Priority, RefinedTask, RoutedEntry

# ── Priority keyword banks ──────────────────────────────────────────────────

_HIGH_KEYWORDS = {
    "asap", "urgent", "immediately", "showstopper", "critical", "must",
    "broken", "wrong", "old branding", "hero shot", "inaudible", "fake",
}
_MEDIUM_KEYWORDS = {
    "needs", "should", "fix", "update", "change", "improve", "better",
    "too", "dragging", "jarring", "inconsisten", "rushed",
}
_LOW_KEYWORDS = {
    "maybe", "consider", "might", "could", "subtle", "minor", "possibly",
    "i guess", "figure it out", "actually",
}

# ── Emotional / filler words to strip ───────────────────────────────────────

_FILLER = re.compile(
    r'\b(super|basically|really|like|just|honestly|literally|totally|'
    r'OK\s+so|I\s+don\'t\s+care\s+which|oh\s+and|one\s+more\s+thing|'
    r'um+|uh+|hmm+)\b',
    re.IGNORECASE,
)

# ── Department-specific action verb suggestions ────────────────────────────

_DEPT_VERBS: dict[Department, list[str]] = {
    Department.VFX: ["Composite", "Add", "Fix", "Replace", "Enhance", "Create"],
    Department.AUDIO: ["Mix", "Replace", "Add", "Adjust", "Design", "Layer"],
    Department.COLOR: ["Grade", "Adjust", "Match", "Correct", "Apply", "Shift"],
    Department.EDITING: ["Re-cut", "Trim", "Extend", "Replace", "Tighten", "Add"],
}


def _assign_priority(text: str) -> tuple[Priority, str]:
    """Score urgency from keyword presence."""
    text_lower = text.lower()
    high_hits = [k for k in _HIGH_KEYWORDS if k in text_lower]
    med_hits = [k for k in _MEDIUM_KEYWORDS if k in text_lower]
    low_hits = [k for k in _LOW_KEYWORDS if k in text_lower]

    if high_hits:
        return Priority.HIGH, f"Urgent language detected: {', '.join(high_hits[:3])}"
    if len(med_hits) >= 2 or (med_hits and not low_hits):
        return Priority.MEDIUM, f"Actionable language: {', '.join(med_hits[:3])}"
    if low_hits:
        return Priority.LOW, f"Tentative language: {', '.join(low_hits[:3])}"
    return Priority.MEDIUM, "Default priority — no strong urgency signals"


def _clean_text(text: str) -> str:
    """Remove filler, reduce whitespace, drop markdown."""
    cleaned = re.sub(r'^#+\s+.*$', '', text, flags=re.MULTILINE)
    cleaned = _FILLER.sub('', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned


def _generate_title(text: str, dept: Department) -> str:
    """Extract a short, professional task title from the raw text."""
    cleaned = _clean_text(text)

    # Try to extract the core request (after "can we", "needs to", etc.)
    request_patterns = [
        r'(?:can\s+(?:we|you))\s+(.{10,80}?)(?:\.|!|\?|$)',
        r'(?:needs?\s+(?:to\s+)?(?:be\s+)?)\s*(.{10,60}?)(?:\.|!|\?|$)',
        r'(?:(?:please|pls)\s+)(.{10,80}?)(?:\.|!|\?|$)',
        r'(?:I\s+want\s+(?:to\s+)?)\s*(.{10,60}?)(?:\.|!|\?|$)',
    ]
    for pat in request_patterns:
        m = re.search(pat, cleaned, re.IGNORECASE)
        if m:
            core = _FILLER.sub('', m.group(1)).strip().rstrip(',;')
            if len(core) > 15:
                # Capitalize first letter
                title = core[0].upper() + core[1:]
                return title[:80]

    # Fallback: take first meaningful sentence, trim to 80 chars
    sentences = re.split(r'[.!?\n]', cleaned)
    for sent in sentences:
        sent = sent.strip()
        if len(sent) > 15:
            title = sent[0].upper() + sent[1:]
            return title[:80]

    return f"{dept.value} adjustment at timestamp"


def _generate_description(entry: RoutedEntry) -> str:
    """Build a professional multi-sentence task description."""
    cleaned = _clean_text(entry.raw_text)
    # Truncate overly long descriptions
    if len(cleaned) > 400:
        cleaned = cleaned[:397] + "..."

    lines = [
        f"**Timecode:** {entry.timestamp}",
        f"**Department:** {entry.department.value}",
        f"**Action Required:** {cleaned}",
        "",
        f"*Routing confidence: {entry.confidence:.0%} — {entry.routing_reason}*",
    ]
    return "\n".join(lines)


# ── Public API ──────────────────────────────────────────────────────────────

async def run(state: PipelineState) -> PipelineState:
    """
    Agent 3 node function.
    Converts each RoutedEntry → RefinedTask with title, description, priority.
    """
    tasks: list[RefinedTask] = []

    for idx, entry in enumerate(state.routed_entries, start=1):
        priority, reason = _assign_priority(entry.raw_text)
        title = _generate_title(entry.raw_text, entry.department)

        tasks.append(RefinedTask(
            id=f"TASK-{idx:03d}",
            timestamp=entry.timestamp,
            timestamp_seconds=entry.timestamp_seconds,
            department=entry.department,
            original_text=entry.raw_text,
            task_title=title,
            task_description=_generate_description(entry),
            priority=priority,
            priority_reason=reason,
        ))

    state.refined_tasks = tasks
    return state
