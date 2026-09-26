# ADR 0005: Host the static release on Vercel

- **Status:** Accepted
- **Date:** 2026-09-25
- **Supersedes:** None
- **Superseded by:** None

## Context

Xeirate is a static Angular application with a local interactive workspace. The first public deployment needs a stable HTTPS URL without adding a backend, account system, or hosted application data. The project is published as a public Kois repository and should use the Kois domain family for its public URL.

## Decision

Deploy the static Angular site to the Vercel project `xeirate` under the `dawichis-projects` scope. Use `https://xeirate.kois.app` as the production URL, configured as a subdomain of the Vercel-managed `kois.app` domain. The default `.vercel.app` aliases may remain available for inspection and fallback.

The deployment was created and verified through the Vercel CLI. The Vercel GitHub integration is connected to `kois-studio/xeirate` with deployments enabled for `main`, so approved pushes to `main` create production deployments automatically.

The Vercel project uses its Angular framework preset. Vercel auto-detects the `bun run build` command, consumes the Angular build emitted to `dist/xeirate`, and provides the client-side fallback required for direct `/app` navigation. No repository-level `vercel.json` is required.

## Consequences

- The release remains static and compatible with the local-first product boundary.
- The public URL is stable and communicates the Kois project family.
- Future agents should batch related changes into reviewable slices because pushes to `main` create production deployments.
- Deployment credentials and local `.vercel` metadata must remain outside version control.

## Verification

- Vercel reports the custom domain as configured correctly and verified.
- `https://xeirate.kois.app` returns `200 OK` over HTTPS.
- The production build runs `bun run build` and completes successfully.
