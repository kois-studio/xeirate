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
- TypeScript uses Angular's strict template/compiler settings plus the shared checked-index baseline. Biome is the single formatter/linter for TypeScript and JSON and uses four spaces for indentation; Angular templates are compiler-checked and styled with Tailwind utilities.
- Validate data at runtime boundaries, especially localStorage, imported files, and user input. Never trust TypeScript types alone.
- Keep scheduling rules separate from UI code so the solver can be tested deterministically.
- Use Tailwind CSS as the one coherent styling system. Keep manual CSS limited to the Tailwind import entrypoint or a documented exception.
- Update current-state docs when architecture, persistence, commands, or user-visible behavior changes.
- Add or update an ADR for durable architecture, privacy, persistence, export, or deployment decisions.
- Keep unfinished work in [`work/TODO.md`](work/TODO.md), including discoveries that are intentionally deferred.

## Deployment

- The public repository is [`kois-studio/xeirate`](https://github.com/kois-studio/xeirate).
- The production site is [xeirate.kois.app](https://xeirate.kois.app), served by the Vercel project `xeirate` under the `dawichis-projects` scope.
- As of 2026-09-25, the deployment was verified through the Vercel CLI and the GitHub-to-Vercel integration is connected to `kois-studio/xeirate` with deployments enabled for `main`.
- Batch related implementation changes and push at the end of a reviewable slice so each push produces a meaningful deployment.
- Keep the Vercel project linked locally only through ignored `.vercel` metadata; do not commit deployment credentials or private discovery data.

## Verification commands

These are the supported project checks:

- Install: `bun install --frozen-lockfile`
- Format check: `bun run format:check`
- Lint: `bun run lint`
- Type-check: `bun run typecheck` (Angular compiler with strict templates)
- Tests: `bun test`
- Build: `bun run build`
- Dependency scan: deferred; Bun `bun pm scan` requires a configured security scanner package.

If a command is unavailable or intentionally deferred, document that fact rather than claiming it passed.

## Safe change boundaries

Do not add a server, account system, remote persistence, third-party analytics, or real staff data without an explicit product decision recorded in the project docs. Do not rewrite Git history or remove user-authored data without approval. Changes to the scheduling model must include deterministic tests and an update to the relevant architecture or decision document.
