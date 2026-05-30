"""
Agent 1 — Intake & Timeline Agent
==================================
Parses raw client feedback, extracts every mentioned timestamp
(explicit or natural-language), and segments the surrounding text
into structured TimestampEntry records.

Supported formats:
  • 01:23 / 1:23 / 01:23:45        (MM:SS or HH:MM:SS)
  • "at the 2-minute mark"         (natural-language minutes)
  • "around 0:45"                  (prefixed timestamps)
  • "the opening" / "the ending"   (contextual anchors)
"""

from __future__ import annotations

import re
from typing import Callable, Optional

from .schemas import PipelineState, TimestampEntry


# ── Timestamp regex patterns ────────────────────────────────────────────────

_PATTERNS: list[tuple[str, Callable[[re.Match], tuple[str, int]]]] = []


def _register(pattern: str):
    """Decorator that registers a regex + converter pair."""
    def _wrap(fn: Callable[[re.Match], tuple[str, int]]):
        _PATTERNS.append((pattern, fn))
        return fn
    return _wrap


@_register(r'(\d{1,2}):(\d{2}):(\d{2})')
def _hhmmss(m: re.Match) -> tuple[str, int]:
    h, mi, s = int(m.group(1)), int(m.group(2)), int(m.group(3))
    total = h * 3600 + mi * 60 + s
    return f"{mi + h * 60:02d}:{s:02d}", total


@_register(r'(?<!\d[:])(\d{1,2}):(\d{2})(?!:\d)')
def _mmss(m: re.Match) -> tuple[str, int]:
    mi, s = int(m.group(1)), int(m.group(2))
    total = mi * 60 + s
    return f"{mi:02d}:{s:02d}", total


@_register(r'(?:at\s+)?the\s+(\d+)[- ]?minute\s+mark')
def _minute_mark(m: re.Match) -> tuple[str, int]:
    mi = int(m.group(1))
    return f"{mi:02d}:00", mi * 60


@_register(r'(\d+)\s*min(?:ute)?s?\s+(\d+)\s*sec(?:ond)?s?')
def _min_sec(m: re.Match) -> tuple[str, int]:
    mi, s = int(m.group(1)), int(m.group(2))
    return f"{mi:02d}:{s:02d}", mi * 60 + s


# ── Contextual anchors ──────────────────────────────────────────────────────

_ANCHORS = {
    "opening": ("00:00", 0),
    "beginning": ("00:00", 0),
    "start": ("00:00", 0),
    "intro": ("00:05", 5),
    "ending": ("99:99", 0),       # placeholder — resolved later
    "final": ("99:99", 0),
    "outro": ("99:99", 0),
    "closing": ("99:99", 0),
}


def _find_all_timestamps(text: str) -> list[tuple[str, int, int, int]]:
    """
    Returns a list of (formatted_ts, total_seconds, char_start, char_end)
    sorted by position in the text.
    """
    results: list[tuple[str, int, int, int]] = []
    seen_spans: set[tuple[int, int]] = set()

    # Regex-based timestamps
    for pattern, converter in _PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            span = (m.start(), m.end())
            if any(s <= span[0] < e or s < span[1] <= e for s, e in seen_spans):
                continue
            ts, secs = converter(m)
            results.append((ts, secs, m.start(), m.end()))
            seen_spans.add(span)

    # Contextual anchors (only if no better timestamp nearby)
    for anchor, (ts, secs) in _ANCHORS.items():
        for m in re.finditer(rf'\bthe\s+{anchor}\b', text, re.IGNORECASE):
            if not any(abs(m.start() - r[2]) < 30 for r in results):
                results.append((ts, secs, m.start(), m.end()))

    results.sort(key=lambda r: r[2])
    return results


def _segment_text(raw: str, timestamps: list[tuple[str, int, int, int]]) -> list[TimestampEntry]:
    """
    Splits the raw feedback into blocks, each anchored to a timestamp.
    Text between two timestamps belongs to the earlier one.
    """
    if not timestamps:
        return []

    entries: list[TimestampEntry] = []
    lines = raw.split("\n")
    full = raw

    for i, (ts, secs, cs, ce) in enumerate(timestamps):
        # Find sentence boundary before this timestamp
        block_start = max(0, full.rfind("\n", 0, cs))
        if block_start > 0:
            block_start += 1

        # End at the sentence boundary before the NEXT timestamp
        if i + 1 < len(timestamps):
            next_cs = timestamps[i + 1][2]
            block_end = full.rfind("\n", 0, next_cs)
            if block_end <= block_start:
                block_end = next_cs
        else:
            block_end = len(full)

        chunk = full[block_start:block_end].strip()
        # Remove markdown headers and blank noise
        chunk = re.sub(r'^#+\s+.*$', '', chunk, flags=re.MULTILINE).strip()
        if not chunk:
            continue

        # Resolve "ending" placeholder to max_secs + 60
        if ts == "99:99":
            max_s = max((t[1] for t in timestamps if t[1] < 5999), default=300)
            secs = max_s + 60
            mi, s = divmod(secs, 60)
            ts = f"{mi:02d}:{s:02d}"

        entries.append(TimestampEntry(
            timestamp=ts,
            timestamp_seconds=secs,
            raw_text=chunk,
        ))

    return entries


# ── Public API ──────────────────────────────────────────────────────────────

async def run(state: PipelineState) -> PipelineState:
    """
    Agent 1 node function.
    Parses raw_feedback → list[TimestampEntry] on the state.
    """
    timestamps = _find_all_timestamps(state.raw_feedback)
    state.timestamp_entries = _segment_text(state.raw_feedback, timestamps)
    return state
