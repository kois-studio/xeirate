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

The first bounded slice is intended to cover:

1. create or select a local participant list using aliases;
2. create a monthly guardia session;
3. persist that local setup in the browser; and
4. establish the scheduling workspace boundary for later conditions and generation.

The current UI does not generate assignments. The solver, fairness policy, conflict resolution, reusable conditions, and export formats are not yet current implementation facts.

## Known gaps

- Browser source is implemented under `src/`, with the Astro page at `src/pages/index.astro`, the Preact island at `src/components/WorkspaceApp.tsx`, and domain/persistence modules under `src/lib/`.
- The first persisted schema is implemented as `xeirate.workspace.v1` and validated with Zod. Migration functions are not yet needed because no later schema exists.
- No deterministic scheduler exists yet.
- No browser journey or rendered accessibility audit is configured yet.
- Hosting, PWA behavior, and export implementation remain open.

See [`../work/TODO.md`](../work/TODO.md) for the active work queue and [`../questions.md`](../questions.md) for domain questions.
