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

The current workspace contains participants, month sessions, and provisional conditions. A condition has a person, session, kind (`restriction`, `preference`, or `clarification`), optional start/end dates, a coordinator note, a reusable flag, and a creation timestamp. These kinds support translation and review; they do not yet drive a scheduling solver.

The current envelope is `schemaVersion: 2` stored under `xeirate.workspace`. Runtime validation is required when reading localStorage. Invalid or unsupported data must be rejected safely, with a recoverable reset path and no silent corruption.

## Lifecycle

- Create: when the coordinator saves participants, a session, or a condition.
- Read: on application startup, after schema validation.
- Update: after accepted user actions, using a deterministic serialization path.
- Delete/reset: through an explicit user action that clearly states the local scope.
- Export: creates a user-controlled file or rendered artifact; it does not upload data.
- Migration: the implemented v1-to-v2 migration adds an empty condition collection without losing existing participants or sessions. Future schema versions need named migration functions and tests before release.

## Validation and safety

- User input is untrusted runtime data even when it comes from a local form.
- Use runtime schemas at localStorage, import, and form boundaries.
- Render aliases and notes as text, never as raw HTML.
- Bound lengths and collection sizes to keep the UI and storage predictable.
- Handle unavailable, disabled, malformed, or quota-exceeded storage without crashing the page.
- Do not write names or requests to logs, telemetry, URLs, or build artifacts.

## Retention and reset

The first release retains data until the coordinator resets it or clears browser storage. The UI should expose the local-only nature of this retention and the reset action. A future export/import feature needs an explicit privacy and file-format decision before implementation.
