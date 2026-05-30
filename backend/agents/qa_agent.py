"""
Agent 4 — QA & Conflict Agent (The Reviewer)
==============================================
Scans the finalised task list and detects:

  1. **Contradictions** — opposing requests at nearby timestamps
     (e.g. "make it brighter" at 01:15 vs "darken the mood" at 01:20).
  2. **Ambiguities** — self-contradicting language within a single task.
  3. **Duplicates** — near-identical tasks for the same timecode.

Each issue is appended as a QAFlag with a human-readable suggestion.
"""

from __future__ import annotations

import re
from itertools import combinations

from .schemas import PipelineState, QAFlag, RefinedTask

# ── Opposing concept pairs ──────────────────────────────────────────────────

_OPPOSING_PAIRS: list[tuple[set[str], set[str]]] = [
    (
        {"bright", "brighter", "brighten", "lighter", "more intense", "increase brightness"},
        {"dark", "darker", "darken", "dim", "moody", "drop exposure", "desaturated"},
    ),
    (
        {"loud", "louder", "turn up", "more intense", "increase volume"},
        {"quiet", "quieter", "turn down", "softer", "breathing room", "subtle", "lower"},
    ),
    (
        {"fast", "faster", "tighten", "snappier", "quicker", "speed up"},
        {"slow", "slower", "longer", "hold", "pause", "breathe", "slow down"},
    ),
    (
        {"warm", "warmer", "warmth"},
        {"cold", "cool", "cooler", "isolated"},
    ),
    (
        {"saturated", "vibrant", "vivid", "colorful"},
        {"desaturated", "muted", "black and white", "monochrome"},
    ),
    (
        {"add", "include", "insert", "more"},
        {"remove", "delete", "cut", "less"},
    ),
]

_PROXIMITY_THRESHOLD_SECS = 45  # tasks within 45s are "nearby"


def _terms_in_text(text: str, terms: set[str]) -> list[str]:
    """Return which terms from the set appear in text."""
    text_lower = text.lower()
    return [t for t in terms if re.search(rf'\b{re.escape(t)}\b', text_lower)]


def _detect_cross_task_contradictions(tasks: list[RefinedTask]) -> list[QAFlag]:
    """Compare every pair of nearby tasks for opposing language."""
    flags: list[QAFlag] = []
    flag_counter = 0

    for t1, t2 in combinations(tasks, 2):
        delta = abs(t1.timestamp_seconds - t2.timestamp_seconds)
        if delta > _PROXIMITY_THRESHOLD_SECS:
            continue

        for side_a, side_b in _OPPOSING_PAIRS:
            hits_a1 = _terms_in_text(t1.original_text, side_a)
            hits_b2 = _terms_in_text(t2.original_text, side_b)

            hits_a2 = _terms_in_text(t2.original_text, side_a)
            hits_b1 = _terms_in_text(t1.original_text, side_b)

            if (hits_a1 and hits_b2) or (hits_a2 and hits_b1):
                flag_counter += 1
                a_terms = hits_a1 or hits_a2
                b_terms = hits_b2 or hits_b1
                flags.append(QAFlag(
                    flag_id=f"QA-{flag_counter:03d}",
                    flag_type="contradiction",
                    severity="warning",
                    affected_task_ids=[t1.id, t2.id],
                    message=(
                        f"Contradicting direction between {t1.id} ({t1.timestamp}) "
                        f"and {t2.id} ({t2.timestamp}): "
                        f"'{', '.join(a_terms)}' vs '{', '.join(b_terms)}' "
                        f"({delta}s apart)."
                    ),
                    suggestion=(
                        "Clarify with client whether the intent is a gradual "
                        "transition between the two moments or if one note "
                        "supersedes the other."
                    ),
                ))
    return flags


def _detect_internal_ambiguity(tasks: list[RefinedTask], existing_count: int) -> list[QAFlag]:
    """Detect self-contradicting language within a single task."""
    flags: list[QAFlag] = []
    counter = existing_count

    for task in tasks:
        for side_a, side_b in _OPPOSING_PAIRS:
            hits_a = _terms_in_text(task.original_text, side_a)
            hits_b = _terms_in_text(task.original_text, side_b)
            if hits_a and hits_b:
                counter += 1
                flags.append(QAFlag(
                    flag_id=f"QA-{counter:03d}",
                    flag_type="ambiguity",
                    severity="warning",
                    affected_task_ids=[task.id],
                    message=(
                        f"{task.id} ({task.timestamp}) contains opposing terms "
                        f"'{', '.join(hits_a)}' AND '{', '.join(hits_b)}' "
                        f"in the same comment."
                    ),
                    suggestion=(
                        "Client may want a nuanced look (e.g. dark overall "
                        "but with warm shadows). Confirm exact intent before "
                        "starting work."
                    ),
                ))
    return flags


def _detect_duplicates(tasks: list[RefinedTask], existing_count: int) -> list[QAFlag]:
    """Flag tasks at the same timecode and department."""
    flags: list[QAFlag] = []
    counter = existing_count
    seen: dict[tuple[str, str], str] = {}

    for task in tasks:
        key = (task.timestamp, task.department.value)
        if key in seen:
            counter += 1
            flags.append(QAFlag(
                flag_id=f"QA-{counter:03d}",
                flag_type="duplicate",
                severity="warning",
                affected_task_ids=[seen[key], task.id],
                message=(
                    f"Multiple tasks for {task.department.value} at "
                    f"{task.timestamp}: {seen[key]} and {task.id}."
                ),
                suggestion="Consider merging into a single task.",
            ))
        else:
            seen[key] = task.id

    return flags


# ── Public API ──────────────────────────────────────────────────────────────

async def run(state: PipelineState) -> PipelineState:
    """
    Agent 4 node function.
    Scans refined_tasks and populates qa_flags with any issues found.
    """
    all_flags: list[QAFlag] = []

    cross = _detect_cross_task_contradictions(state.refined_tasks)
    all_flags.extend(cross)

    ambig = _detect_internal_ambiguity(state.refined_tasks, len(all_flags))
    all_flags.extend(ambig)

    dupes = _detect_duplicates(state.refined_tasks, len(all_flags))
    all_flags.extend(dupes)

    state.qa_flags = all_flags
    return state
