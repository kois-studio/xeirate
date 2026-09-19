# ADR 0004: Separate the public landing from the workspace

- **Status:** Accepted
- **Date:** 2026-09-20
- **Supersedes:** None
- **Superseded by:** None

## Context

Xeirate will be hosted at `xeirate.kois.app`. The public URL needs to explain the product to a first-time visitor, while the coordinator needs a focused place to maintain people and prepare sessions. Mixing both concerns in one screen makes the operational workflow feel unnecessarily promotional.

## Decision

Use `/` as the public landing page and `/app` as the local-first workspace. Inside the workspace, keep two primary sections: `Personas` for the permanent team and fixed recurring conditions, and `Sesiones` for month-specific requests and generated schedules.

Conditions are grouped by person in the session view. Their left-hand badge can toggle between requirement and preference; editing opens a structured dialog. Clarification items remain visible but are not silently converted into solver rules.

## Consequences

- The landing can use explanatory copy and a clear call to action without adding noise to the working UI.
- The workspace can become a home-screen app while the root URL remains an easy product explanation.
- The local browser data model needs to distinguish person-level conditions from session-level conditions.
- A future authenticated or shared workspace would need a separate navigation and privacy decision.
