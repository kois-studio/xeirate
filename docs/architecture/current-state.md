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

The project uses Angular 22 standalone components with the Angular application builder, Tailwind CSS 4.3 for utility styling, TypeScript 6 with strict compiler and Angular template settings, Zod 4 for runtime schemas, Bun 1.3.4, and Biome 2.5.14 configured for four-space indentation. The site builds to static output. There is currently no backend, database, account system, API, analytics, or remote logging.

The package scripts currently support Angular development, formatting, linting, Angular template/type-checking, Bun tests, and the static Angular build. The selected hosting target is Vercel; a CI workflow is not yet configured.

The public repository is [`kois-studio/xeirate`](https://github.com/kois-studio/xeirate). The current production deployment is [xeirate.kois.app](https://xeirate.kois.app), a verified subdomain of `kois.app` attached to the Vercel project `xeirate` under the `dawichis-projects` scope. The `.vercel.app` alias remains available. The deployment was created through the Vercel CLI on 2026-09-25. The Vercel project now uses the Angular framework preset, which auto-detects `bun run build`, the Angular `dist/xeirate` output, and the client-side route fallback. The Vercel GitHub integration is connected to `kois-studio/xeirate` with deployments enabled for `main`; pushing `main` triggers production deployment automatically.

## User workflow currently in scope

The current browser workflow now covers:

1. enter and maintain a reusable local people list;
2. add fixed person conditions, including recurring rules for any selected weekdays;
3. create and select monthly sessions;
4. translate a request into a requirement or preference; existing clarification items remain visible for review;
5. edit a condition through a structured dialog or toggle requirement/preference directly;
6. generate a deterministic monthly proposal from the structured conditions;
7. retry with a different deterministic seed while keeping the same conditions;
8. surface impossible days, broken preferences, and unresolved requests; and
9. share the proposal as text or open the print dialog for a PDF.

The current scheduler generates coverage slots from a session configuration. The default is one general slot per day, while sessions can configure visible columns for areas, roles, or other categories, independent active weekdays, interval cadence, required people, optional shift metadata, and rest days after an assignment. The simple calendar groups all assignments by date; the column calendar renders the configured categories as columns. Restrictions are hard limits; preferences are soft `avoid` or `prefer` signals; and clarification items remain visible warnings. Person eligibility is configured per session and column, defaulting to eligible for every column. Multiple same-day assignments are supported when explicitly enabled. This remains an honest demo boundary, not a validated staffing policy: exact overnight time semantics, doubletes, concession history, and department-specific rules remain open domain work.

## Known gaps

- The public landing and workspace routes are localized Angular standalone pages under `src/app/pages/landing/` and `src/app/pages/workspace/`: `/en/`, `/es/`, `/en/app`, and `/es/app`. The root route redirects to the stored or browser-preferred language. Each page folder contains only its `.ts` and `.html` pair. Shared UI blocks live in one-folder-per-component directories under `src/app/components/`; the workspace page composes people, sessions, schedule, condition-row, and condition-dialog components. `WorkspaceService` owns state transitions and local persistence under `src/app/services/`. Domain/persistence modules remain under `src/lib/`.
- Component APIs use Angular signal inputs and outputs (`input.required`, `input`, and `output`); decorator-based `@Input`/`@Output` APIs are not used. Tailwind utilities are the only application styling system. `src/styles.css` contains only the Tailwind import; the shared Angular button component owns the consistent button contract and active click feedback (`active:scale-105`).
- The current persisted schema is `schemaVersion: 6` under `xeirate.workspace`, validated with Zod. It contains participants, sessions, schedule configuration, per-session participant/column eligibility, session conditions, reusable person conditions, selected recurring weekdays, and the latest generated schedule. Legacy `xeirate.workspace.v1` and schema versions 2–5 are migrated in memory and covered by deterministic tests.
- The application separates the reusable `Personas` view from the monthly `Sesiones` view. Fixed conditions use `sessionId: null` and can recur on selected weekdays; session conditions are scoped to one month.
- English and Spanish runtime translations live in `src/app/i18n/translations.ts`, exposed through `LanguageService` and the `t` pipe. The selected language updates document metadata, date formatting, notices, sharing text, and the demo fixture while user-entered notes remain unchanged.
- The scheduling engine is a local deterministic heuristic in `src/lib/scheduler.ts`; retrying increments the attempt seed and never uploads data.
- `src/lib/demo-fixture.ts` contains only synthetic aliases and anonymized November-style conditions for product review. Private discovery context remains in ignored `docs/SPEC.md`.
- No browser journey or rendered accessibility audit is configured yet. The Angular migration has compiler-checked semantic forms, status messaging, keyboard escape handling for the dialog, visible focus utilities, and responsive utility classes, but those behaviors still need a retained rendered audit.
- A lightweight web manifest and mobile app-shell metadata are implemented; a service worker/offline cache remains open. A downloadable file export and CI/rendered browser audit remain open. Print-to-PDF and Web Share/clipboard fallback are implemented.

See [`../work/TODO.md`](../work/TODO.md) for the active work queue and [`../questions.md`](../questions.md) for domain questions.
