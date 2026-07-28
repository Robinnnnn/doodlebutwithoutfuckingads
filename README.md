# doodlebutwithoutfuckingads

A fast, ad-free group scheduler with no accounts and no email gate.

Polls and votes live in Cloudflare D1. Temporary drafts and anonymous voter
tokens stay in the browser so people can return and edit their response without
creating an account.

New polls get memorable three-word links such as:

```text
/p/amber-otter-garden
```

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
