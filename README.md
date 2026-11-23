# Daybook

Try the [dummy demo](https://nstambovsky.github.io/daybook-demo/), then clone this repository to run your own private app. MIT licensed: use, modify, and host your own copy.

- **Root:** a static portfolio demo with fictional data. Edits stay in this tab’s memory and reset on refresh. No account, password, backend, or live data connection.
- **self-hosted/:** the real password-protected Cloudflare Worker + D1 app, starting with an empty database. You supply your own Cloudflare account and secrets.

## Use it yourself

```sh
git clone https://github.com/NStambovsky/daybook-demo.git
cd daybook-demo
```

Follow [Cloudflare setup](docs/CLOUDFLARE.md), [phone home-screen instructions](docs/PHONE.md), or give your coding agent [AGENTS.md](AGENTS.md). Neither edition contains the author’s personal records or credentials. Self-hosted records belong in your own private database, never in Git.

## Try the demo locally

```sh
npm start
```

Open http://localhost:8081. Python 3 required. `npm test` runs the demo checks with Node 22+. The deployed private app needs Node 22+ for the pinned setup tooling.

## Features

Food and movement logging, editable nutrition, quick-add usual meals, weekly charts, CSV export, and cross-device sync. Optional Workers AI estimates use your own Cloudflare account and are disabled by default.

The public demo does not save real records. The private app is a personal shared-password tool, not a service with separate user accounts. Hosting and optional AI usage are charged to whoever deploys it under their provider’s current terms.
