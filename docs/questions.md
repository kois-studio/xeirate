# Open questions

These questions are intentionally not requirements yet. Answers should be recorded in an ADR or the relevant architecture document before the behavior becomes durable.

## Domain and scheduling

- What exactly is a guardia: one 24-hour assignment per calendar day, named shifts, or a combination of areas and times?
- Which requests are hard restrictions, which are soft preferences, and which are ambiguous notes for the coordinator to translate?
- How should incompatible requests be surfaced and resolved? Can a coordinator record who yielded and carry that fairness credit into a later session?
- Are double shifts allowed, and what rest or safety rules apply after a doublete?
- How should rotations, areas, weekends, holidays, and course travel be represented?
- What fairness dimensions matter: number of guardias, weekends, holidays, undesirable areas, consecutive work, or historical concessions?
- What is the smallest synthetic schedule fixture that represents real complexity without importing private data?

## Product and delivery

- Should repeatable person-level conditions support more recurrence patterns than one weekday, and how does the coordinator review or disable them?
- Which export is most useful first: print view, image, PDF, or a structured file?
- Is a service worker/offline cache worth the maintenance cost for a later release? The first release has a manifest and supports an iPhone home-screen shortcut.
- Which static hosting target will be used, and what headers/404 behavior does it require?
- What license should the open-source repository use?
