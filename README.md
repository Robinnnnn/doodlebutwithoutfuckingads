# doodlebutwithoutfuckingads

A fast, ad-free group scheduler with no accounts and no email gate.

Polls and votes live in Cloudflare D1. Temporary drafts and anonymous voter
tokens stay in the browser so people can return and edit their response without
creating an account.

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
npm run dev
npm test
```

## Deployment

The production Worker deploys automatically from `main`. The deployment applies
any pending D1 migrations before publishing the new Worker version.
