# Xeirate agent instructions

This is the canonical project-specific instruction entry point for AI developer agents.

## Read first

1. Read this file.
2. Read [`docs/README.md`](README.md).
3. Read [`docs/project-standards.yml`](project-standards.yml).
4. Read the relevant architecture, decision, and work-queue documents before changing implementation.
5. Read the private local `docs/SPEC.md` only when it exists and only as discovery context. It is ignored by Git and must never be committed, copied into tracked documentation, or used with real personal data in examples.

## Source of truth

- Current implementation facts: [`architecture/current-state.md`](architecture/current-state.md) and the source tree.
- Intended architecture: [`architecture/proposed-system.md`](architecture/proposed-system.md).
- Local data contract and persistence: [`architecture/data-and-persistence.md`](architecture/data-and-persistence.md).
- Durable decisions: [`decisions/README.md`](decisions/README.md).
- Open product and domain questions: [`questions.md`](questions.md).
- Unfinished work: [`work/TODO.md`](work/TODO.md).
- Standards gaps and deferred work: [`project-standards.yml`](project-standards.yml).

When a document and the implementation disagree, mark the documentation stale and update it in the same change. Do not silently turn a proposal or open question into a requirement.

## Working rules

- Keep the product local-first: no backend, account system, analytics, remote logging, or external data transfer without a new explicit decision.
- Treat all staff names, requests, schedules, and examples as potentially sensitive. Use synthetic fixtures in source, tests, screenshots, and documentation.
- TypeScript extends Astro's `strictest` preset. Biome is the single formatter/linter and uses four spaces for indentation; keep these conventions unless a documented project decision changes them.
- Validate data at runtime boundaries, especially localStorage, imported files, and user input. Never trust TypeScript types alone.
- Keep scheduling rules separate from UI code so the solver can be tested deterministically.
- Use one coherent styling system and keep interactive browser code inside justified Astro islands.
- Update current-state docs when architecture, persistence, commands, or user-visible behavior changes.
- Add or update an ADR for durable architecture, privacy, persistence, export, or deployment decisions.
- Keep unfinished work in [`work/TODO.md`](work/TODO.md), including discoveries that are intentionally deferred.

## Verification commands

These commands become the supported project checks once the Astro scaffold is installed:

- Install: `bun install --frozen-lockfile`
- Format check: `bun run format:check`
- Lint: `bun run lint`
- Type-check: `bun run typecheck`
- Tests: `bun test`
- Build: `bun run build`
- Dependency scan: deferred; Bun `bun pm scan` requires a configured security scanner package.

If a command is unavailable or intentionally deferred, document that fact rather than claiming it passed.

## Safe change boundaries

Do not add a server, account system, remote persistence, third-party analytics, or real staff data without an explicit product decision recorded in the project docs. Do not rewrite Git history or remove user-authored data without approval. Changes to the scheduling model must include deterministic tests and an update to the relevant architecture or decision document.
