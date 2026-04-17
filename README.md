# Claude Event Screensaver

A web-based screensaver for Claude Code community events — displays a pixelated "CLAUDE" title with rotating thinking-verbs, an event agenda with urgency ramp, venue/wifi details, and scuttling Clawd crab mascots.

This is a **fork in spirit** of [maxtattonbrown/claude-code-screensaver](https://github.com/maxtattonbrown/claude-code-screensaver) — the Python/Pygame original — reimagined as a web app so you can share a config by URL and project it on any screen with a browser.

## What it does

- `/new` — create a new event config (subtitle, date, venue, wifi, agenda, thinking-words, go-home messages, urgency threshold) and set an admin password.
- `/:id` — public, read-only screensaver view. Share this URL with the room; hit `f` for fullscreen.
- `/:id/edit` — password-gated editor.
- `/:id/copy` — clone an existing config into a new one (mints a new ID, set a new password).

Configs are stored in Cloudflare KV, keyed by a 6-character uppercase-alphanumeric ID. Passwords are hashed with PBKDF2-SHA256 (150k iters) via Web Crypto.

## Stack

- [TanStack Start](https://tanstack.com/start) (file-based routing + server functions)
- Cloudflare Workers + KV (`@cloudflare/vite-plugin`, `wrangler`)
- React 19, Tailwind CSS, shadcn/ui
- react-hook-form + zod, react-day-picker, sonner

## Local dev

```bash
bun install
bun dev
```

The dev server runs against a local miniflare KV namespace — no Cloudflare account needed for local work.

## Deploy

1. Create a KV namespace and put its ID in `wrangler.jsonc` under `kv_namespaces`.
2. `bun run deploy` (runs `vite build && wrangler deploy`).

## Credits

- Original Python screensaver: [maxtattonbrown/claude-code-screensaver](https://github.com/maxtattonbrown/claude-code-screensaver)
- Color palette and typography inspired by [Claudience](https://claudience.com)
