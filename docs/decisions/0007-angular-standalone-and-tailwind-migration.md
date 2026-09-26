# ADR 0007: Migrate the static application to Angular standalone components and Tailwind

- **Status:** Accepted
- **Date:** 2026-09-25
- **Supersedes:** 0002-astro-island-architecture
- **Superseded by:** None

## Context

Xeirate has grown beyond the small interactive island that motivated the original Astro and Preact boundary. The workspace had become a single `WorkspaceApp.tsx` component with UI, browser persistence orchestration, and multiple workflows in one file. The project also needs one predictable styling system as the application expands.

## Decision

Use Angular 22 standalone components and Angular routing as the application renderer and build system. Keep the static local-first deployment boundary, with localized `/:lang/` and `/:lang/app` routes for the landing page and workspace.

Own workspace state and browser persistence in a typed, signal-backed, root-injectable `WorkspaceService` under `src/app/services/`. Keep route pages in `/src/app/pages/<route>/` with a `.ts`/`.html` pair, and compose them from focused standalone components in one-folder-per-component directories under `src/app/components/`. Use signal-based component inputs and outputs (`input`, `input.required`, and `output`) rather than decorator APIs. Keep domain, persistence, scheduler, and export logic framework-independent under `src/lib/`.

Use Tailwind CSS 4 utilities directly in Angular templates as the primary and effectively only styling system. The global stylesheet contains only the Tailwind import. Manual CSS requires a documented exception for behavior that utilities cannot express. The shared Angular button component standardizes button semantics and provides visible click feedback with `active:scale-105`.

## Consequences

- The application remains a static client-side site with no backend or account boundary.
- Components have smaller presentation/orchestration responsibilities and the store gives state ownership an explicit home.
- Angular strict templates and reactive forms provide stronger contracts around UI state and user input.
- Tailwind class strings are more verbose, but there is one styling source of truth and no component-specific stylesheet drift.
- The prior Astro/Preact architecture remains in history as a superseded ADR; the domain modules and schema migrations remain reusable.
- Browser journey and rendered accessibility checks are still deferred work.

## Alternatives considered

- **Continue with Astro and split the Preact island:** preserves the existing renderer but keeps the project in a hybrid model and does not address the user’s desire to move the growing application to Angular.
- **Angular with component CSS:** viable, but rejected for now to avoid reintroducing a second styling system after the migration.
- **React or another SPA framework:** not selected because the repository now has an explicit Angular engineering profile and Angular provides the requested component/state structure.
