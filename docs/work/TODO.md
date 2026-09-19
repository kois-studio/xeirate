# Xeirate work queue

### [XEIRATE-003] [P1] [domain] Define condition types and conflict semantics

- **Status:** In progress / provisional
- **Origin:** discovery / open domain questions
- **Goal:** Give the coordinator a clear way to translate informal notes into hard restrictions, soft preferences, and clarification-needed items.
- **Why now:** The solver cannot be trustworthy until condition semantics and guardia rules are explicit.
- **Scope:** condition taxonomy, dates/ranges, areas, travel/courses, fixed reusable conditions, conflict explanation, concession/fairness record.
- **Non-goals:** importing real workplace requests into tests or making clinical staffing policy decisions.
- **Acceptance criteria:** A coordinator can enter bounded restrictions/preferences/clarifications, generate and retry a monthly proposal, see unresolved or impossible cases, and review a synthetic November-style fixture without real personal data.
- **Current implementation note:** A provisional intake schema, deterministic heuristic, fairness summary, conflict warnings, grouped per-person session rows, fixed recurring weekday conditions, anonymized fixture, and text/print export exist. Areas, doubletes, concession history, and department-specific policies must not be inferred from this demo.
- **Verification:** domain examples, decision record, deterministic unit tests.
- **Affected areas:** domain, scheduling, persistence, docs.
- **Dependencies:** The initial implementation slice and answers to `docs/questions.md`.
- **Risks:** Misrepresenting internal terminology or safety constraints.
- **Blocker or question:** Needs domain clarification.
- **Next action:** Review the open questions and the anonymized fixture with a clinician/coordinator; record only confirmed semantics before expanding the solver.
- **Owner:** product/domain owner
- **Last updated:** 2026-09-19

### [XEIRATE-004] [P2] [quality] Add CI and rendered browser checks

- **Status:** Proposed
- **Origin:** standards assessment
- **Goal:** Run the documented quality gates and a critical browser-flow/a11y audit automatically.
- **Why now:** Required before relying on the demo outside local development.
- **Scope:** CI install, format, lint, type-check, tests, build, dependency audit, and rendered checks.
- **Non-goals:** deployment automation before a hosting target is chosen.
- **Acceptance criteria:** To be defined with the hosting target and browser test approach.
- **Verification:** CI run on a clean checkout and retained rendered audit result.
- **Affected areas:** `.github/workflows/`, package scripts, docs, work queue.
- **Dependencies:** The local quality baseline and a hosting decision.
- **Risks:** Browser checks can become brittle if the critical journey is not clearly bounded.
- **Blocker or question:** Hosting and browser-test tooling are not selected.
- **Next action:** Add the local quality baseline first, then choose the smallest CI/browser setup.
- **Owner:** implementation agent
- **Last updated:** 2026-09-19
