# Run your own Daybook on Cloudflare

This deploys a private app in **your** account, with an empty database and a shared password you choose. The dummy demo is separate. Never point a public demo at a private app’s database.

## 1. Get ready

Install Git and Node.js 22 or newer. Create a Cloudflare account and review its current Workers/D1 pricing. Clone the repository, then:

```sh
cd self-hosted
npm ci
npx wrangler login
npx wrangler whoami
```

Confirm that the account is yours. All following commands run inside `self-hosted/`. The pinned Wrangler version and lockfile make installation repeatable.

## 2. Choose names and create an empty database

Edit `wrangler.jsonc`: choose a Worker `name` unique in your account and a `database_name` for your database. Keep the binding name **DB** and the assets binding **ASSETS**.

```sh
npx wrangler d1 create my-daybook-db
```

If you chose a different database name, use it in the command. Copy the returned **database_id** into `d1_databases[0].database_id`, replacing the all-zero placeholder. Keep only one DB binding if Wrangler offers to add it automatically. Do not copy a database ID from another person’s deployment.

Initialize only your new database:

```sh
npm run db:remote
```

`schema.sql` creates empty tables and contains no personal records or seed data. `db:remote` explicitly targets Cloudflare; `db:local` targets only a local simulator.

## 3. Deploy and set your password

```sh
npm run smoke
npm run check
npm run deploy
npx wrangler secret put APP_PASSWORD
npx wrangler secret put SESSION_SECRET
```

At the first prompt, enter a strong, unique password or passphrase. At the second, enter a separately generated random secret of at least 32 characters from your password manager. Save both in your own password manager. **Do not use the example placeholders, put values in source files, pass them as command arguments, or paste them into an AI chat.**

The first deployment refuses app requests until both real secrets are configured. Secret updates create and deploy a new Worker version. Open the HTTPS URL printed by Wrangler and sign in. You can share that URL and password with another caregiver/household member; everyone using that deployment shares one log. This is not a multi-user service with individual accounts.

The configuration uses America/New_York for calendar dates. Change timezone-dependent formatting in the app too if adapting it for another region; changing one environment variable does not update every chart and filter.

## 4. Check it works

- In a private browser window, verify that the app requires a password and that unauthenticated data requests return 401.
- Confirm a wrong password is rejected and your password works.
- Add a test entry, refresh, and check it remains. Open the same URL on a second device and confirm the entry appears there.
- Edit/delete the test entry and confirm the change on both devices.
- Follow [PHONE.md](PHONE.md) to add your own URL to your phone’s home screen.

## Change the password or sign out every device

Run `npx wrangler secret put APP_PASSWORD` to set a new password. Existing signed-in sessions can remain valid, so also run `npx wrangler secret put SESSION_SECRET` with a fresh random value to invalidate all existing sessions. Other devices will need to sign in again. Do not delete your D1 database to reset a password.

`npm run smoke` uses only a local D1 simulator and disposable generated test secrets. Run it in a clean checkout before creating `.dev.vars`; it refuses to overwrite an existing secret file. It verifies login and saved-record operations without touching Cloudflare data.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and replace both placeholders with local-only test values. That file is ignored by Git. Never reuse your production password for testing.

```sh
npm run db:local
npx wrangler dev --local-protocol https
```

Open the printed local HTTPS URL; your browser may ask you to trust the local development certificate. Local HTTPS lets the secure session cookie work. Local D1 data lives under the ignored `.wrangler/` folder. Cloudflare secrets are not automatically downloaded to your local machine.

## Backups and updates

Daybook also has a **My data → Export all entries as CSV** button, including pending changes on the current device. Keep pending changes until they sync.

For a database backup, choose a private folder outside this repository and run:

```sh
npx wrangler d1 export DB --remote --output /absolute/private/folder/diary-backup.sql
```

Backups contain your private data. Keep them out of Git, public hosting folders, and screenshots. No Google Sheet is connected automatically. An optional backup-token API exists for custom integrations; leave BACKUP_TOKEN unset unless you deliberately configure one. Database exports work without that token.

For updates: review upstream changes, back up first, run `npm ci`, tests, and `npm run check`, then deploy. Do not overwrite your names, database ID, or secrets with someone else’s configuration. Do not assume reverting code also restores database contents.

## Optional AI estimates

Manual calorie entry works without AI. To enable food estimates in your own app, add this top-level binding to `wrangler.jsonc`:

```json
"ai": { "binding": "AI" }
```

Set `vars.ENABLE_AI` to `"true"`, then run `npm run check` and `npm run deploy`. The Worker uses `@cf/meta/llama-3.1-8b-instruct-fast`. Confirm model availability, account eligibility, and current Workers AI pricing first. Requests send the food description to Cloudflare AI. The public demo never uses this service. Estimates are approximate and editable.

## References

- [Wrangler and D1 commands](https://developers.cloudflare.com/workers/wrangler/commands/d1/)
- [Worker secrets and local secret files](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare pricing](https://www.cloudflare.com/plans/developer-platform/)
