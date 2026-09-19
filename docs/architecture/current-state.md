# Current architecture and implementation state

## Status

This document describes repository facts, not the complete product intention. It is updated as implementation lands.

## Repository

- Project: Xeirate.
- Lifecycle: greenfield / early implementation.
- Branch at documentation bootstrap: `main`.
- The repository currently contains the project README, license, Git attributes/ignore configuration, and the tracked documentation package.
- `docs/SPEC.md` is a local-only ignored file containing private discovery context. It is not a source file or a public project artifact.

## Runtime and deployment

The project uses Astro 7 with static output, Preact 10 for the interactive island, TypeScript 6 with Astro's `strictest` preset, Zod 4 for runtime schemas, Bun 1.3.4, and Biome 2.5.14 configured for four-space indentation. The site builds to static output. There is currently no backend, database, account system, API, analytics, or remote logging.

The package scripts currently support development, formatting, linting, Astro type-checking, Bun tests, static build, and Bun dependency scanning. A hosted deployment target and CI workflow are not yet selected.

## User workflow currently in scope

The first bounded slice now covers:

1. create or select a local participant list using aliases;
2. create a monthly guardia session;
3. persist that local setup in the browser; and
4. translate a request into a provisional restriction, preference, or clarification condition;
5. optionally attach a date range, coordinator note, and reusable flag; and
6. generate a deterministic monthly proposal from the structured conditions;
7. retry with a different deterministic seed while keeping the same conditions;
8. surface impossible days, broken preferences, and unresolved requests; and
9. share the proposal as text or open the print dialog for a PDF.

The current scheduler assigns one guardia per calendar day. Restrictions are hard limits; preferences are soft `avoid` or `prefer` signals; and clarification items remain visible warnings. The fairness heuristic balances assignment counts, weekends, and consecutive days. This is an honest demo boundary, not a validated staffing policy: areas, doubletes, shift types, concession history, and department-specific rules remain open domain work. The condition taxonomy is a provisional intake vocabulary, not a claim about the department's final scheduling policy.

## Known gaps

- Browser source is implemented under `src/`, with the Astro page at `src/pages/index.astro`, the Preact island at `src/components/WorkspaceApp.tsx`, and domain/persistence modules under `src/lib/`.
- The current persisted schema is `schemaVersion: 3` under `xeirate.workspace`, validated with Zod. It contains participants, sessions, provisional conditions, and the latest generated schedule. Legacy `xeirate.workspace.v1` and `schemaVersion: 2` envelopes are migrated in memory and covered by deterministic tests.
- The scheduling engine is a local deterministic heuristic in `src/lib/scheduler.ts`; retrying increments the attempt seed and never uploads data.
- `src/lib/demo-fixture.ts` contains only synthetic aliases and anonymized November-style conditions for product review. Private discovery context remains in ignored `docs/SPEC.md`.
- No browser journey or rendered accessibility audit is configured yet.
- A lightweight web manifest and mobile app-shell metadata are implemented; a service worker/offline cache remains open. A downloadable file export and hosting remain open. Print-to-PDF and Web Share/clipboard fallback are implemented.

See [`../work/TODO.md`](../work/TODO.md) for the active work queue and [`../questions.md`](../questions.md) for domain questions.
