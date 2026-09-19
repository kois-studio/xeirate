# ADR 0003: Add a lightweight mobile app shell

- **Status:** Accepted
- **Date:** 2026-09-19
- **Supersedes:** None
- **Superseded by:** None

## Context

Xeirate is primarily used from a phone. A native iPhone application would add distribution cost and maintenance before the scheduling rules are validated. A full service worker also adds cache invalidation and offline-release complexity.

## Decision

Ship a web manifest, theme metadata, and mobile-first layout so users can add Xeirate to a phone home screen. Do not add a service worker yet. The app remains local-first through browser storage, but the initial page still depends on the chosen host being reachable when opened for the first time.

## Consequences

- The website can appear as a lightweight home-screen app on supported browsers.
- No Apple Developer account or native distribution is required.
- A future offline cache needs a separate decision covering update and recovery behavior.
