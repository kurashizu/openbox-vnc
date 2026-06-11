# Agents

## Dev Commands

```bash
npm run dev      # Next.js dev server on port 9999
npm run build    # Next.js build
npm run preview  # Preview with Cloudflare runtime (requires build first)
npm run deploy   # Build + deploy to Cloudflare
npm run lint     # ESLint
```

## Cloudflare Bindings Access

Use `getCloudflareContext` from `@opennextjs/cloudflare` (not `request.cloudflare_context`):

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";
const ctx = await getCloudflareContext({ async: true });
const db = ctx.env.emails_db;
```

## D1 Database

- Database: `emails-db` (binding: `emails_db`)
- Schema: `schema.sql`
- Sliding window: max 20 emails per recipient address
- Remote schema update: `npx wrangler d1 execute emails-db --file=./schema.sql --remote`

## Routes

| Path | Method | Description |
|------|--------|-------------|
| `/mailbox/route.ts` | POST | Receives Resend webhooks, stores to D1 |
| `/api/email/route.ts` | POST | Query emails by recipient address |
| `/api/*` | GET/POST | Proxy routes to external API |

## SQL Reserved Words

`to`, `from`, `subject` must be quoted: `"to"`, `"from"`, `"subject"`

## Components

- `src/components/Navbar.tsx` - Top navbar with controls, status, help
- `src/components/MailboxModal.tsx` - Email viewer modal
- `src/components/AudioPlayer.tsx` - Audio on/off, dispatches `audio-level` event
- `src/components/openbox.tsx` - VNC viewer

## Audio Background Effect

AudioPlayer dispatches `audio-level` CustomEvent on window. dash/page.tsx listens and applies dynamic CSS gradient based on audio level. Events use `detail: number` (0-1 range).

## Secrets

`wrangler.jsonc` is gitignored. Use `vars` for non-sensitive config, or `npx wrangler secret put <NAME>` for secrets.