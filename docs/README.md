# Xeirate project documentation

This directory is the maintained handoff surface for the project. Start with [`AGENTS.md`](AGENTS.md), then use the map below to find the source of truth for the work at hand.

## Documentation map

- [`architecture/current-state.md`](architecture/current-state.md) — verified implementation facts and known gaps.
- [`architecture/proposed-system.md`](architecture/proposed-system.md) — intended product and system shape, clearly separated from current facts.
- [`architecture/data-and-persistence.md`](architecture/data-and-persistence.md) — local data ownership, schema direction, lifecycle, and migration expectations.
- [`decisions/README.md`](decisions/README.md) — durable decisions and their ADRs.
- [`questions.md`](questions.md) — unresolved product and domain questions.
- [`work/README.md`](work/README.md) — work-queue conventions.
- [`work/TODO.md`](work/TODO.md) — active, proposed, blocked, and deferred work.
- [`project-standards.yml`](project-standards.yml) — pinned engineering standards, applicability, evidence, exceptions, and deferred work.

The private local discovery specification is `docs/SPEC.md` when present. It is deliberately ignored because it contains personal and real-world discovery context. Tracked docs use synthetic examples and must remain safe to publish.

## Documentation conventions

Use these labels consistently:

- **Current** means verified in the repository or explicitly confirmed by the user.
- **Proposed** means an intended design that is not yet fully implemented or confirmed as a durable decision.
- **Question** means the project needs a product/domain answer before the behavior is finalized.
- **Deferred** means intentionally postponed work with a recorded reason.

Keep one source of truth per topic. Prefer linking to the authoritative document over copying the same requirements into several files.
