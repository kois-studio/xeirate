# ADR 0005: Host the static release on Vercel

- **Status:** Accepted
- **Date:** 2026-09-25
- **Supersedes:** None
- **Superseded by:** None

## Context

Xeirate is a static Astro site with one bounded interactive browser island. The first public deployment needs a stable HTTPS URL without adding a backend, account system, or hosted application data. The project is published as a public Kois repository and should use the Kois domain family for its public URL.

## Decision

Deploy the static Astro site to the Vercel project `xeirate` under the `dawichis-projects` scope. Use `https://xeirate.kois.app` as the production URL, configured as a subdomain of the Vercel-managed `kois.app` domain. The default `.vercel.app` aliases may remain available for inspection and fallback.

The deployment was created and verified through the Vercel CLI. The Vercel GitHub integration is not yet connected to `kois-studio/xeirate`; until that external authorization is completed, production deployments are explicit/manual and pushes to `main` do not deploy automatically.

## Consequences

- The release remains static and compatible with the local-first product boundary.
- The public URL is stable and communicates the Kois project family.
- Future agents must not assume that a GitHub push currently creates a Vercel deployment.
- Once GitHub integration is connected, related changes should be batched into reviewable slices to avoid unnecessary production deployments.
- Deployment credentials and local `.vercel` metadata must remain outside version control.

## Verification

- Vercel reports the custom domain as configured correctly and verified.
- `https://xeirate.kois.app` returns `200 OK` over HTTPS.
- The production build runs `bun run build` and completes successfully.
