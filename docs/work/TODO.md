# Xeirate work queue

### [XEIRATE-003] [P1] [domain] Define condition types and conflict semantics

- **Status:** In progress / provisional
- **Origin:** discovery / open domain questions
- **Goal:** Give the coordinator a clear way to translate informal notes into hard restrictions, soft preferences, and clarification-needed items.
- **Why now:** The solver cannot be trustworthy until condition semantics and guardia rules are explicit.
- **Scope:** condition taxonomy, dates/ranges, areas, travel/courses, fixed reusable conditions, conflict explanation, concession/fairness record.
- **Non-goals:** importing real workplace requests into tests or making clinical staffing policy decisions.
- **Acceptance criteria:** A coordinator can enter bounded restrictions/preferences/clarifications, generate and retry a monthly proposal, see unresolved or impossible cases, and review a synthetic November-style fixture without real personal data.
- **Current implementation note:** A provisional intake schema, deterministic heuristic, fairness summary, conflict warnings, grouped per-person session rows, fixed conditions with selected recurring weekdays, anonymized fixture, and text/print export exist. Areas, doubletes, concession history, and department-specific policies must not be inferred from this demo.
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
- **Non-goals:** deployment automation beyond the selected Vercel project and its pending repository connection.
- **Acceptance criteria:** To be defined with the hosting target and browser test approach.
- **Verification:** CI run on a clean checkout and retained rendered audit result.
- **Affected areas:** `.github/workflows/`, package scripts, docs, work queue.
- **Dependencies:** The local quality baseline and the selected Vercel deployment.
- **Risks:** Browser checks can become brittle if the critical journey is not clearly bounded.
- **Blocker or question:** Browser-test tooling is not selected; hosting is now Vercel.
- **Next action:** Add the local quality baseline first, then choose the smallest CI/browser setup.
- **Owner:** implementation agent
- **Last updated:** 2026-09-19

### [XEIRATE-005] [P2] [deployment] Connect GitHub pushes to Vercel production deployments

- **Status:** Ready for verification
- **Origin:** production deployment setup
- **Goal:** Connect `kois-studio/xeirate` to the Vercel project `xeirate` so approved pushes to `main` deploy to `https://xeirate.kois.app` automatically.
- **Why now:** The production site exists and the GitHub integration is now connected; this item is retained for the first deliberate end-to-end deployment verification.
- **Scope:** Authorize/install Vercel's GitHub integration for `kois-studio/xeirate`, confirm the `main` production branch, and verify one deployment from a controlled push.
- **Non-goals:** Deploying every intermediate local edit; related changes should be batched into reviewable slices.
- **Acceptance criteria:** A push to `main` creates a successful Vercel production deployment at `xeirate.kois.app`.
- **Verification:** GitHub commit status, Vercel deployment log, and HTTPS smoke check on the custom domain.
- **Affected areas:** Vercel project settings, GitHub organization integration, docs.
- **Dependencies:** Access to configure Vercel's GitHub App for the `kois-studio` organization.
- **Risks:** A misconfigured integration could deploy incomplete or unreviewed changes.
- **Blocker or question:** Requires one deliberate push and production smoke check.
- **Next action:** Verify the next approved push creates a successful Vercel production deployment.
- **Owner:** implementation agent / repository owner
- **Last updated:** 2026-09-25

### [XEIRATE-006] [P2] [quality] Add Angular browser journey and rendered accessibility audit

- **Status:** Proposed
- **Origin:** Angular migration / engineering-standards ANGULAR-011, WEB-001, A11Y-002
- **Goal:** Retain the critical landing → workspace → condition → schedule flow in a browser check.
- **Why now:** The migration has compiler-level verification, but rendered keyboard, responsive, and local-storage behavior still need an automated safety net.
- **Scope:** One deterministic browser journey, visible focus review, dialog keyboard flow, mobile layout, and storage-unavailable presentation.
- **Non-goals:** Introducing accounts, remote persistence, or a backend.
- **Acceptance criteria:** A clean build serves the landing and workspace routes, the condition dialog can be opened and saved, weekday toggles remain reversible, and a generated schedule renders without console errors.
- **Verification:** Retained browser test and documented manual accessibility review.
- **Affected areas:** browser test tooling, package scripts, docs, standards evidence.
- **Dependencies:** A browser test runner decision.
- **Risks:** Overly broad visual assertions becoming brittle.
- **Next action:** Choose the smallest browser runner compatible with Bun and Angular's static build.
- **Owner:** implementation agent
- **Last updated:** 2026-09-25
