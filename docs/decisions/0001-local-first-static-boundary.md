# ADR 0001: Keep the first release local-first and static

- **Status:** Accepted
- **Date:** 2026-09-19
- **Supersedes:** None
- **Superseded by:** None

## Context

Xeirate is intended to help a coordinator organize workplace guardias data that can contain names, availability, vacations, and internal requests. The first product goal is a useful demo that is cheap to host and simple to explain. A backend, account system, and native iPhone distribution would add cost, privacy responsibilities, and operational scope before the scheduling model is understood.

## Decision

The first release will be a statically generated website with browser-local persistence. It will not require accounts, a backend, remote storage, analytics, or a native iPhone application. Any future move to shared or server-side data requires a new privacy and architecture decision.

## Consequences

- The coordinator can use the tool without registration or subscription cost.
- Data remains on the device/browser profile and is not available for collaboration by default.
- The app must validate local data and provide reset/recovery behavior.
- Export and sharing are user-controlled and require careful handling of generated files.
- A future multi-user or shared-history workflow will require explicit authentication, authorization, storage, retention, and data-protection work.

## Alternatives considered

- **Hosted backend from the start:** deferred because it increases privacy, deployment, and operational scope before the domain rules are validated.
- **Native iPhone app:** deferred because the initial audience can use a website/PWA-style home-screen shortcut without paying for Apple distribution.
- **In-memory-only demo:** rejected because the coordinator should be able to return to the workspace without re-entering all setup data.
