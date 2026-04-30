# Project info

- Stack: Cloudflare Worker, TypeScript, Wrangler.
- Entry point: `src/index.ts`.
- Deploy: `npx wrangler deploy`.
- Local dev: `npx wrangler dev`.
- Config: `wrangler.jsonc` con `main`, `name`, `compatibility_date`.

La soluzione deve restare stateless: non sono previsti KV, D1, Durable Objects o code per il livello richiesto.
