# OpenBox VNC

Browser-based VNC client running on Cloudflare Workers with Next.js.

## Features

- noVNC-based VNC viewer
- Browser audio playback via WebSocket
- Email storage with Resend integration (D1 database)

## Routes

- `/dash` - VNC dashboard with viewer
- `/mailbox` - Email webhook endpoint (POST)
- `/api/*` - Proxy routes to external API

## Commands

```bash
npm run dev      # Next.js dev server (port 9999)
npm run build    # Next.js build
npm run preview  # Preview with Cloudflare runtime
npm run deploy   # Build + deploy to Cloudflare
npm run lint     # ESLint
```

## D1 Database

Emails stored with sliding window: max 20 per recipient address.

```bash
# Update remote schema
npx wrangler d1 execute emails-db --file=./schema.sql --remote
```

## Docs

- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Next.js](https://nextjs.org/docs)