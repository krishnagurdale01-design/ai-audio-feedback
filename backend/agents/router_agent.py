"""
Agent 2 — Department Router Agent
==================================
Classifies each TimestampEntry into one of four post-production departments
using a weighted keyword scoring system (tool-calling style).

Departments:
  • VFX           — visual effects, compositing, CG elements
  • Audio         — sound design, dialogue, music, foley
  • Color Grading — colour correction, exposure, look/mood
  • Editing       — cuts, pacing, transitions, timing
"""

from __future__ import annotations

import re

from .schemas import Department, PipelineState, RoutedEntry, TimestampEntry

# ── Keyword scoring dictionaries (simulates specialised classifier tools) ───

_DEPARTMENT_KEYWORDS: dict[Department, dict[str, int]] = {
    Department.VFX: {
        "vfx": 6, "cgi": 6, "effect": 4, "particle": 5, "composite": 5,
        "compositing": 5, "green screen": 6, "explosion": 5, "explode": 5,
        "3d": 4, "render": 4, "simulation": 5, "matte": 5, "rotoscope": 6,
        "keying": 5, "wire removal": 6, "morph": 5, "warp": 4, "glitch": 4,
        "debris": 5, "camera shake": 4, "motion tracking": 6, "cleanup": 3,
        "digital": 3, "logo": 3, "branding": 3, "lower third": 4,
        "title card": 4, "energy burst": 5, "film grain": 4,
    },
    Department.AUDIO: {
        "sound": 5, "audio": 6, "music": 5, "voice": 4, "dialogue": 5,
        "mix": 4, "bass": 5, "volume": 5, "sfx": 6, "foley": 6,
        "noise": 4, "echo": 5, "reverb": 5, "loud": 4, "quiet": 4,
        "mute": 5, "soundtrack": 6, "score": 5, "dub": 5, "lip sync": 6,
        "ambient": 5, "whoosh": 6, "boom": 4, "thud": 4, "clang": 5,
        "swoosh": 5, "inaudible": 5, "hear": 3, "metallic": 4,
        "plastic sticks": 4,
    },
    Department.COLOR: {
        "color": 5, "colour": 5, "bright": 4, "dark": 4, "contrast": 5,
        "saturation": 6, "desaturate": 6, "desaturated": 6, "hue": 6,
        "grade": 5, "grading": 5, "tone": 4, "warm": 5, "cool": 5,
        "cold": 4, "lut": 6, "exposure": 5, "highlight": 5, "shadow": 5,
        "teal": 5, "orange": 4, "cinematic": 4, "mood": 4, "moody": 4,
        "vibrant": 5, "muted": 4, "bleach": 5, "black and white": 6,
        "monochrome": 6, "warmth": 5, "flat": 3,
    },
    Department.EDITING: {
        "cut": 5, "edit": 4, "pace": 5, "pacing": 6, "transition": 6,
        "trim": 5, "slow": 4, "fast": 4, "sequence": 5, "flow": 4,
        "timing": 5, "jump cut": 6, "montage": 6, "dissolve": 5,
        "fade": 5, "crossfade": 6, "speed": 4, "ramp": 5, "whip pan": 6,
        "remove": 3, "swap": 4, "reorder": 6, "tighten": 5, "drag": 4,
        "longer": 4, "shorter": 4, "hold": 4, "snappier": 5,
        "hard cut": 5, "rushed": 4, "breathe": 4, "pause": 4,
    },
}


def _score_department(text: str) -> tuple[Department, float, str]:
    """
    Score text against every department's keyword bank.
    Returns (best_department, confidence, reason).
    """
    text_lower = text.lower()
    scores: dict[Department, tuple[int, list[str]]] = {}

    for dept, keywords in _DEPARTMENT_KEYWORDS.items():
        total = 0
        matched: list[str] = []
        for kw, weight in keywords.items():
            # Count occurrences (whole-word-ish match)
            count = len(re.findall(rf'\b{re.escape(kw)}\b', text_lower))
            if count:
                total += weight * count
                matched.append(kw)
        scores[dept] = (total, matched)

    # Pick winner
    best_dept = max(scores, key=lambda d: scores[d][0])
    best_score, best_kws = scores[best_dept]

    if best_score == 0:
        # Fallback: default to Editing for generic comments
        return Department.EDITING, 0.3, "No strong keyword match; defaulting to Editing."

    # Normalise confidence to 0–1 range (cap at ~30 raw points)
    confidence = min(best_score / 30.0, 1.0)
    reason = f"Matched keywords: {', '.join(best_kws[:5])}"
    return best_dept, round(confidence, 2), reason


# ── Public API ──────────────────────────────────────────────────────────────

async def run(state: PipelineState) -> PipelineState:
    """
    Agent 2 node function.
    Routes each TimestampEntry → RoutedEntry with department classification.
    """
    routed: list[RoutedEntry] = []
    for entry in state.timestamp_entries:
        dept, conf, reason = _score_department(entry.raw_text)
        routed.append(RoutedEntry(
            timestamp=entry.timestamp,
            timestamp_seconds=entry.timestamp_seconds,
            raw_text=entry.raw_text,
            department=dept,
            confidence=conf,
            routing_reason=reason,
        ))
    state.routed_entries = routed
    return state
