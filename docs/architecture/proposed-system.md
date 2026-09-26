# Proposed system shape

## Product boundary

Xeirate is a local-first assistant for turning informal staff requests into a reviewable monthly guardia schedule. A coordinator translates real-world language into structured conditions; the application generates candidate schedules and makes conflicts visible. It is a decision-support tool, not a replacement for clinical or institutional responsibility.

The first release is intentionally small: no accounts, no server persistence, no patient data, no analytics, and no remote processing.

## Rendering and client boundary

- Angular standalone components are the primary renderer and build system.
- The public landing and workspace are localized routes (`/:lang/` and `/:lang/app`) in one static Angular application. The language is selected from localStorage, then the browser preference, with English as the fallback.
- `WorkspaceService` owns signal state, browser persistence, and domain commands under `src/app/services/`; route pages live under `src/app/pages/`, and focused standalone components render people, sessions, schedule review, condition rows, and the condition dialog under `src/app/components/`.
- Components receive only the local workspace state and typed events they need. No server-only or secret data is passed to the browser.
- The first release remains static so it can be hosted cheaply or opened locally after a build.
- The mobile shell includes a manifest and home-screen metadata; offline caching is deliberately deferred.

## Domain boundaries

The implementation keeps these responsibilities separate:

- `domain`: participants, month sessions, conditions, candidate schedule models, conflict/fairness concepts, and pure validation.
- `persistence`: versioned localStorage envelope, migrations, safe parsing, and browser capability handling.
- `scheduling`: deterministic candidate generation and scoring within the provisional demo rule set.
- `ui`: Angular standalone pages and shared components; `WorkspaceService` translates coordinator actions into domain commands and owns client state.
- `export`: share text plus print-to-PDF through the browser; a downloadable file/image format remains open.
- `i18n`: runtime English/Spanish dictionaries, language preference persistence, and the translation pipe. User-entered request notes are data, not UI copy, and are never automatically translated.

The initial slice may keep these boundaries in a small number of files, but it must avoid coupling solver rules directly to DOM event handlers.

## User workflow

1. The public landing explains the product and links to the localized workspace route.
2. The coordinator introduces department participants using aliases in `Personas`.
3. The coordinator records fixed conditions for people, including recurring weekdays.
4. The coordinator starts or selects a session for a specific month in `Sesiones`.
5. The coordinator adds one structured condition at a time, choosing whether it is a hard requirement, a soft preference, or a request that needs clarification.
6. The coordinator generates a candidate schedule after accepted conditions.
7. The coordinator retries generation to explore another candidate with the same inputs.
8. The coordinator reviews conflicts, clarification warnings, and fairness summary.
9. The coordinator shares text or opens the browser print flow to save a PDF.

The current implementation covers this workflow with one guardia per calendar day. The rule set remains provisional until the open domain questions are resolved; the app intentionally does not infer areas, doubletes, or institutional policies.

## Styling and interaction

Use Tailwind CSS as the one coherent primary styling system. Templates should favor semantic HTML, a calm and friendly visual language, mobile-first layout, visible focus states, reduced-motion support, and clear status messaging. Manual CSS is limited to Tailwind's import entrypoint and future documented specialized exceptions.

## Privacy and trust boundaries

User-entered names, requests, vacations, and schedules are personal workplace data. They stay in the browser’s local storage in the first release and are never sent to Xeirate servers. The user is responsible for the device, browser profile, backups, screenshots, exported files, and any future hosting provider. The app must explain local persistence and provide a clear way to reset it.
