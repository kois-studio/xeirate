# Proposed system shape

## Product boundary

Xeirate is a local-first assistant for turning informal staff requests into a reviewable monthly guardia schedule. A coordinator translates real-world language into structured conditions; the application generates candidate schedules and makes conflicts visible. It is a decision-support tool, not a replacement for clinical or institutional responsibility.

The first release is intentionally small: no accounts, no server persistence, no patient data, no analytics, and no remote processing.

## Rendering and client boundary

- Astro is the primary renderer and build system.
- The public shell and static metadata are rendered by Astro.
- The stateful scheduling workspace is a justified client island because it must react immediately to form input, candidate generation, and local persistence.
- The browser island receives only the local workspace state it needs. No server-only or secret data is passed to it.
- The first release is expected to use static output so it can be hosted cheaply or opened locally after a build.

## Domain boundaries

The implementation should keep these responsibilities separate:

- `domain`: participants, month sessions, conditions, candidate schedule models, conflict/fairness concepts, and pure validation.
- `persistence`: versioned localStorage envelope, migrations, safe parsing, and browser capability handling.
- `scheduling`: deterministic candidate generation and scoring once the domain rules are clarified.
- `ui`: Astro pages and the interactive workspace; it translates coordinator actions into domain commands and displays outcomes.
- `export`: printable/image/PDF representations, added only after the schedule model is stable.

The initial slice may keep these boundaries in a small number of files, but it must avoid coupling solver rules directly to DOM event handlers.

## User workflow

1. The coordinator introduces department participants using aliases.
2. The coordinator starts a session for a specific month.
3. The coordinator adds one structured condition at a time, choosing whether it is a hard restriction, a soft preference, or a request that needs clarification.
4. The candidate schedule updates after accepted conditions.
5. The coordinator retries generation to explore another valid candidate.
6. The coordinator reviews conflicts and fairness explanations.
7. The coordinator exports a shareable result.

Only the first two steps and the workspace boundary belong to the initial implementation slice. The remainder is proposed behavior until the open questions are resolved.

## Styling and interaction

Use one coherent primary styling system. The first implementation should favor semantic HTML, a calm and friendly visual language, mobile-first layout, visible focus states, reduced-motion support, and clear status messaging. A small local CSS system is acceptable if it remains the single source of truth; Tailwind and Lucide remain considered options rather than mandatory dependencies.

## Privacy and trust boundaries

User-entered names, requests, vacations, and schedules are personal workplace data. They stay in the browser’s local storage in the first release and are never sent to Xeirate servers. The user is responsible for the device, browser profile, backups, screenshots, exported files, and any future hosting provider. The app must explain local persistence and provide a clear way to reset it.
