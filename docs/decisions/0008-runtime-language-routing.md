# ADR 0008: Use runtime language routing for English and Spanish

- **Status:** Accepted
- **Date:** 2026-09-26
- **Supersedes:** 0004 (route shape only)
- **Superseded by:** None

## Context

Xeirate needs to support English and Spanish while remaining one static Angular application. Users may switch language while working, and the app must remember that choice locally. Angular's built-in localization flow is compile-time oriented, which would create separate build variants rather than a runtime switchable interface.

## Decision

Use a small runtime `LanguageService`, shared translation dictionaries, and a pure application `t` pipe. Every public route is language-prefixed: `/:lang/` for the landing page and `/:lang/app` for the workspace. The root route redirects to the language stored in localStorage, then the browser's preferred language when it is Spanish, and otherwise English.

Changing language updates the URL, persists `xeirate.language`, updates the document `lang`, title, and description, and drives locale-sensitive dates and share text. English and Spanish UI copy is owned by `src/app/i18n/translations.ts`. User-entered names and request notes are preserved as data and are not machine-translated.

## Consequences

- Deep links communicate the active language and can be shared directly.
- The application remains a single static build with no translation server or backend.
- Runtime translations require a stable key dictionary and a non-pure pipe that observes the language signal.
- New user-visible UI copy must be added to both dictionaries rather than embedded in templates or services.
- Angular compile-time locale extraction is not used for this two-language runtime switch.

## Alternatives considered

- **Angular compile-time i18n:** useful for separate fully localized builds, but it does not provide the requested in-session language switch and localStorage preference without additional runtime infrastructure.
- **A third-party runtime i18n package:** not needed for two languages and would add dependency and configuration overhead to a deliberately small local-first application.
