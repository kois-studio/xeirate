# Data and persistence

## Ownership

The browser user owns the local Xeirate workspace. The application has no server-side copy in the first release. Local data can include participant aliases, month sessions, conditions, generated candidates, fairness notes, and export-ready schedule content.

## Persistence envelope

Persisted data must use a versioned envelope rather than storing an unstructured object directly:

```ts
type StorageEnvelope = {
  schemaVersion: number;
  updatedAt: string;
  workspace: Workspace;
};
```

The current workspace contains participants, month sessions, provisional conditions, and the latest generated schedule. A condition has a person, an optional session scope, kind (`restriction`, `preference`, or legacy `clarification`), optional `avoid`/`prefer` mode, optional date range, optional selected recurring weekdays, a coordinator note, a reusable flag, and a creation timestamp. A `sessionId` of `null` means the condition belongs to the person and is reused by future sessions. Restrictions drive hard availability; preferences influence the heuristic; clarifications become review warnings. The editor exposes only requirement or preference for new and edited conditions. These semantics are intentionally provisional until the department rules are validated.

The current envelope is `schemaVersion: 5` stored under `xeirate.workspace`. Runtime validation is required when reading localStorage. Invalid or unsupported data must be rejected safely, with a recoverable reset path and no silent corruption.

## Lifecycle

- Create: when the coordinator saves participants, a session, or a condition.
- Read: on application startup, after schema validation.
- Update: after accepted user actions, using a deterministic serialization path.
- Delete/reset: through an explicit user action that clearly states the local scope.
- Export: creates a user-controlled file or rendered artifact; it does not upload data.
- Migration: the implemented v1-to-v5 migration adds conditions and empty schedules; the v2-to-v5 migration adds empty schedules and defaults legacy preferences to `avoid`; the v3-to-v5 migration adds the fixed-condition model; and the v4-to-v5 migration converts the single `weekday` field into selected `weekdays`. No migration loses existing participants or sessions. Future schema versions need named migration functions and tests before release.

## Validation and safety

- User input is untrusted runtime data even when it comes from a local form.
- Use runtime schemas at localStorage, import, and form boundaries.
- Render aliases and notes as text, never as raw HTML.
- Bound lengths and collection sizes to keep the UI and storage predictable.
- Handle unavailable, disabled, malformed, or quota-exceeded storage without crashing the page.
- Do not write names or requests to logs, telemetry, URLs, or build artifacts.

## Retention and reset

The first release retains data until the coordinator resets it or clears browser storage. The UI should expose the local-only nature of this retention and the reset action. A future export/import feature needs an explicit privacy and file-format decision before implementation.
