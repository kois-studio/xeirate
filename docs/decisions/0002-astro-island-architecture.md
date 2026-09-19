# ADR 0002: Use Astro with a bounded interactive scheduling island

- **Status:** Proposed
- **Date:** 2026-09-19
- **Supersedes:** None
- **Superseded by:** None

## Context

The product has a mostly static shell but also needs immediate updates as a coordinator enters participants and conditions. The project should keep the initial browser JavaScript focused while leaving room for a richer scheduling workspace.

## Decision

Use Astro as the primary renderer and build system. Keep the stateful scheduling workflow inside a deliberately bounded client island. The island may use Preact if the initial scaffold benefits from its small runtime, but the island boundary and domain modules must remain independent of the view library.

## Consequences

- Static pages remain simple and cheap to deploy.
- Interactive behavior is explicit and reviewable at the island boundary.
- Domain and persistence code can be tested without a browser.
- The project must resist turning the entire site into an unbounded client application.
- Preact remains a proposal until the scaffold and first slice demonstrate that it is useful.

## Alternatives considered

- **Client-rendered SPA:** simpler for all-state interactions but loses the intended static boundary and makes JavaScript the default for every page.
- **Astro-only HTML forms:** insufficient for immediate candidate updates and local workspace state.
- **React:** capable but larger than needed for the first small island; reconsider if the project’s UI requirements materially expand.
