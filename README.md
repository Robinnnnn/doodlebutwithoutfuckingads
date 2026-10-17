# doodlebutwithoutfuckingads

A fast, ad-free group scheduler with no accounts and no email gate.

The browser UI is plain HTML, CSS, and JavaScript. A small Cloudflare Worker
serves the app shell, adds poll-specific sharing metadata, and handles the JSON
API. There is no client framework or hydration step.

Polls and votes live in Cloudflare D1. Temporary drafts and anonymous voter
tokens stay in the browser so people can return and edit their response without
creating an account.

The built-in sample is generated directly in the Worker response. It never
reads from or writes to D1, and it does not wait for a follow-up API request
before rendering.

New polls keep a memorable three-word prefix and add a cryptographically random
64-bit suffix so public links cannot be guessed through practical enumeration:

```text
/p/amber-otter-garden-k7nq4x2pQ_s
```

Existing three-word links remain supported.

Public API routes use Cloudflare's distributed rate-limiting bindings. The
current policy allows 10 poll creations, 240 poll reads, and 60 response writes
per client per minute. Throttled requests return `429 Too Many Requests` with a
`Retry-After: 60` header. Local development fails open when Cloudflare bindings
or edge client headers are unavailable.

## Development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run db:migrate:local
npm run dev
npm test
```

The local migration command is only needed when setting up a fresh local
database.

## Deployment

The production Worker deploys automatically from `main`. The deployment applies
any pending D1 migrations before publishing the new Worker version.

## Self-hosting

The checked-in `wrangler.jsonc` targets the hosted app. Its Cloudflare account
and D1 database IDs identify deployment resources; they are not credentials.
Use your own account and database when deploying a copy:

1. Copy `wrangler.example.jsonc` over `wrangler.jsonc` in your checkout.
2. Choose a unique Worker name and D1 database name in that file.
3. Run `npx wrangler d1 create <your-database-name>` and replace the example
   `database_id` with the returned ID. If you use multiple Cloudflare accounts,
   select yours with `CLOUDFLARE_ACCOUNT_ID`.
4. Run `npm run db:migrate:local` and `npm run dev` to try your copy locally.
5. Run `npm run deploy` when ready to apply the remote migrations and publish
   to your own account. The example uses a `workers.dev` address; add your own
   custom domain in Cloudflare if desired.

Cloudflare credentials stay in Wrangler's local authentication or your CI
environment. Never commit API tokens, local D1 state, or real poll exports.
The built-in sample poll uses fictional names and does not access the database.
