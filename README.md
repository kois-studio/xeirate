# Xeirate

Xeirate is a local-first web tool for translating informal staff requests into a clear, reviewable monthly guardia schedule.

The project is in early implementation. The tracked project documentation lives in [`docs/README.md`](docs/README.md). A separate private discovery specification may exist locally at `docs/SPEC.md`; it is intentionally ignored and must not be committed because it contains personal and real-world context.

The public landing lives at `/en/` or `/es/`; the operational workspace lives at `/en/app` or `/es/app`. The static Angular application detects the browser language, remembers a manual language choice in localStorage, and keeps schedule data in the user’s browser. It is not a native iPhone application, does not require an account, and does not send staff data to a server.

## Local development

```sh
bun install --frozen-lockfile
bun run dev
```

The supported checks are `bun run format:check`, `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build`. Bun 1.3.4 and Node 22.12+ are the pinned project toolchain expectations.

Angular standalone components live under `src/app/`, framework-independent domain, persistence, scheduler, and export code lives under `src/lib/`, and Tailwind utilities are used directly in Angular templates. The maintained architecture and migration decisions are indexed in [`docs/README.md`](docs/README.md).
