# Agent guide: Daybook

## Two editions

The repository root is the public, fictional-data demo, served by GitHub Pages and copied into the author’s personal site. `self-hosted/` is a separate password-protected Cloudflare Worker + D1 app. Never wire the public demo to a real database, login, secret, or external AI endpoint.

## Set up a user’s private copy

Read `docs/CLOUDFLARE.md` and `docs/PHONE.md` first. Use the pinned Wrangler from `self-hosted/package-lock.json` (`npm ci` inside that folder). This project already uses Wrangler; preserve that workflow.

1. Determine the user’s intended Cloudflare account and choose their own Worker/database names. Verify with `npx wrangler whoami` before remote changes. Do not reuse upstream author resources.
2. Create a new D1 database in that account; retain binding `DB`. Replace the all-zero ID in `self-hosted/wrangler.jsonc` with the returned ID. Never import example personal data: `schema.sql` is schema-only.
3. Use `npm run db:local` for local tests and `npm run db:remote` only against the confirmed new database. Preserve existing records if configuring an already populated installation.
4. Have the user enter APP_PASSWORD and SESSION_SECRET through Wrangler’s interactive secret prompts or their dashboard. Never ask them to paste values in chat, read existing secret files, print values, put secrets in commands, or commit secrets. SESSION_SECRET needs at least 32 random characters. The app refuses missing/example credentials.
5. Run root `npm test`, self-hosted `npm run check`, and a local Worker login/CRUD smoke check. Deploy only to the intended user-owned target. Verify unauthenticated APIs reject access, wrong passwords fail, a saved record survives refresh, and a second device sees changes.
6. Return the user’s URL and link `docs/PHONE.md`. Explain that rotating SESSION_SECRET invalidates existing sessions; changing only APP_PASSWORD does not necessarily do so.

## Boundaries

Do not touch the upstream author’s live apps or databases. No account IDs, real database IDs, personal records, private exports, `.dev.vars`, `.env`, `.secrets.json`, or `.wrangler` state belong in a public commit. Keep runtime backups outside the repository. Do not clear browser pending changes to fix sync errors. Inspect the queue and preserve/export pending records first.

Daybook AI is optional and off by default; enabling it needs the user’s own AI binding and account, with disclosure that food descriptions go to Cloudflare. Never enable it on the dummy demo.

## Validation

- Root `npm test` checks that the demo remains isolated and resettable.
- `cd self-hosted && npm ci && npm run check` validates Worker packaging.
- `docs/CLOUDFLARE.md` describes runtime checks; use only local or deliberately created test resources.
- Review staged filenames and scan for credentials/private references before publishing. Include only reviewed files; never copy an entire private project directory.
