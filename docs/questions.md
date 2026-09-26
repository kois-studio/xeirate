# Open questions

These questions are intentionally not requirements yet. Answers should be recorded in an ADR or the relevant architecture document before the behavior becomes durable.

## Domain and scheduling

- What exact start/end semantics should apply when a shift crosses midnight or has partial-day availability?
- Which requests are hard restrictions, which are soft preferences, and which are ambiguous notes for the coordinator to translate?
- How should incompatible requests be surfaced and resolved? Can a coordinator record who yielded and carry that fairness credit into a later session?
- Are double shifts allowed, and what rest or safety rules apply after a doublete?
- How should rotations, holidays, qualifications, and course travel be represented across configurable columns?
- Should time ranges affect overlap validation and rest calculations, or remain descriptive metadata for the first validated release?
- What fairness dimensions matter: number of guardias, weekends, holidays, undesirable areas, consecutive work, or historical concessions?
- What is the smallest synthetic schedule fixture that represents real complexity without importing private data?

## Product and delivery

- Should session-scoped conditions ever support recurring weekdays too, and how should the coordinator review or disable them?
- Which export is most useful first: print view, image, PDF, or a structured file?
- Is a service worker/offline cache worth the maintenance cost for a later release? The first release has a manifest and supports an iPhone home-screen shortcut.
- Which static hosting target will be used, and what headers/404 behavior does it require?
- What license should the open-source repository use?
