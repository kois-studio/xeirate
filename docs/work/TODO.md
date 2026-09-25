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

- **Status:** Blocked / external setup
- **Origin:** production deployment setup
- **Goal:** Connect `kois-studio/xeirate` to the Vercel project `xeirate` so approved pushes to `main` deploy to `https://xeirate.kois.app` automatically.
- **Why now:** The production site exists, but the Vercel GitHub integration currently rejects the Kois organization repository.
- **Scope:** Authorize/install Vercel's GitHub integration for `kois-studio/xeirate`, confirm the `main` production branch, and verify one deployment from a controlled push.
- **Non-goals:** Deploying every intermediate local edit; related changes should be batched into reviewable slices.
- **Acceptance criteria:** A push to `main` creates a successful Vercel production deployment at `xeirate.kois.app`.
- **Verification:** GitHub commit status, Vercel deployment log, and HTTPS smoke check on the custom domain.
- **Affected areas:** Vercel project settings, GitHub organization integration, docs.
- **Dependencies:** Access to configure Vercel's GitHub App for the `kois-studio` organization.
- **Risks:** A misconfigured integration could deploy incomplete or unreviewed changes.
- **Blocker or question:** Requires Vercel/GitHub integration authorization outside the repository CLI.
- **Next action:** In Vercel Project Settings → Git, install or authorize the GitHub integration for `kois-studio/xeirate`, then verify with one deliberate push.
- **Owner:** implementation agent / repository owner
- **Last updated:** 2026-09-25
