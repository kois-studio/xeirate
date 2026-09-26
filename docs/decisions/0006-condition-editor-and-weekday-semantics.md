# ADR 0006: Use a two-way condition editor and selected recurring weekdays

- **Status:** Accepted
- **Date:** 2026-09-25
- **Supersedes:** The provisional three-option condition editor and single fixed weekday field.
- **Superseded by:** None

## Context

The condition dialog presented three meanings even though the coordinator's current workflow distinguishes only a hard requirement from a soft preference. A single weekday selector also made recurring person conditions awkward when a request applied on several days each week. The original request text is still useful as a future reference after it has been translated.

## Decision

The condition editor exposes exactly two choices: `Requisito` and `Preferencia`, with `Requisito` selected by default. Existing `clarification` records remain readable and continue to produce review warnings, but new conditions are not created as clarification items through this dialog.

Reusable person conditions store a selected set of weekdays. The fixed-condition editor displays all seven weekdays as pressed toggle buttons by default; pressing a day adds or removes it from the condition. Session-scoped conditions continue to use an optional date range. The original request or coordinator note remains in the `note` field.

## Consequences

- The editor matches the two meanings the coordinator can currently act on.
- Multiple weekly recurrence days are explicit and reviewable.
- Persisted data moves from schema version 4 to 5, with a named migration for the old single `weekday` field.
- The domain still accepts legacy clarification records until the provisional taxonomy is replaced through a future domain decision.
