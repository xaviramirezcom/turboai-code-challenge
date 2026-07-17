"""Shared kernel — tiny, generic building blocks reused across bounded contexts.

Stays framework- and context-agnostic (enforced by ``backend/.importlinter``):
it must never import Django, DRF, or a bounded context.
"""
