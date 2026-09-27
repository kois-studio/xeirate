# ADR 0010: Make the workspace a focused setup wizard

- **Status:** Accepted
- **Date:** 2026-09-26
- **Supersedes:** The two-section workspace navigation described in ADR 0004
- **Superseded by:** None

## Context

The workspace is primarily used on a phone. The previous layout opened with a large explanatory header and presented people and sessions as broad sections, which forced the coordinator to infer the next action and spent valuable mobile space on landing-page copy.

## Decision

The workspace uses four compact, navigable steps: `People`, `Conditions`, `Session`, and `Proposal`. Each step has one primary task and the workspace header remains minimal. The public landing owns the product explanation; the workspace only provides short task guidance where the current form needs it.

The steps remain directly selectable when their prerequisites exist, and the primary next/back controls preserve a linear path for first-time users. Existing local workspace data determines the initial step so returning users can resume a session or proposal.

## Consequences

- First-time mobile users see a clear next action instead of a promotional introduction.
- Reusable person conditions are visibly separated from monthly session configuration.
- The existing domain model and local persistence remain unchanged; the wizard only orchestrates the current commands.
- Users can still move directly between completed steps to review or adjust setup.
