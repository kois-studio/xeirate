# ADR 0009: Model generic coverage slots and configurable calendar modes

- **Status:** Accepted
- **Date:** 2026-09-26
- **Supersedes:** The one-assignment-per-calendar-day demo boundary
- **Superseded by:** None

## Context

The first real output examples show two valid schedule presentations. One groups several people inside each date cell. The other renders dates as rows and configurable areas or categories as columns. Users may also need different coverage cadences, such as one eight-hour turn per day or a 24-hour turn followed by two rest days.

The previous model stored only `{ date, participantId }` and therefore could not represent multiple assignments, independent categories, eligibility, or cadence.

## Decision

Represent a session as a coverage configuration with:

- a `single` or `columns` presentation mode;
- one or more configurable coverage columns;
- active weekdays and an interval in days for each column;
- a required number of people per active column/date;
- optional shift duration and start/end metadata;
- a rest-day rule after an assignment; and
- per-session participant eligibility for each column.

The scheduler expands this configuration into normalized coverage slots. Each assignment points to a slot, date, column, and participant. The single calendar groups assignments by date. The columns calendar renders the configured columns explicitly.

All participants are eligible for all columns by default. The coordinator can toggle eligibility per person and column. The model allows multiple same-day assignments; the session UI keeps that behavior opt-in by default to reduce accidental double assignment.

The persistence envelope moves to schema version 6. Existing v5 sessions migrate to a default `General` column with the former one-person-per-day behavior and all session participants eligible for it.

## Consequences

- The scheduling core is no longer tied to the word “guardia” or to one slot per date.
- The two output examples use the same generated schedule and differ only in grouping/rendering.
- New sessions can express basic daily, weekday, interval, multi-person, column, and rest patterns without a backend.
- Exact overnight semantics and time-overlap validation remain future domain work; time fields are currently preserved as schedule metadata while date-level assignment remains authoritative.
- The solver and export layers must group assignments rather than assume one record per date.
- Real department rules still need validation before the heuristic is treated as a staffing policy.
