# Deployment

## Vercel (recommended for the web app)

1. Push `goliath/` to a Git repository (or set the Vercel project root to `goliath/`).
2. Import the project; Vercel detects Next.js.
3. Add every variable from `.env.example` in **Settings → Environment Variables**
   (mark `SUPABASE_SERVICE_ROLE_KEY`, `GOLIATH_TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`,
   `GEMINI_API_KEY` as secret).
4. Set `GOOGLE_REDIRECT_URI=https://<your-domain>/api/google/oauth/callback` and add the same URI in
   Google Cloud → Credentials → OAuth client.
5. Deploy, then apply `supabase/migrations/0001_init.sql` to the production database.

Notes:

- Node runtime (not Edge) is required: the crypto and Drive routes use `node:crypto`, `Buffer`, and
  streaming `Response` bodies.
- Upload chunk routes can take a while for large chunks. On Vercel, raise
  `maxDuration` in the route (`export const maxDuration = 60`) if your plan allows it, or lower
  `GOLIATH_UPLOAD_CHUNK_BYTES` (e.g. 1 MB) so each request stays short.
- Downloads of large files are proxied through a function; for multi-GB files use the desktop client.

## Self-hosted (Docker)

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY goliath/package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY goliath/ ./
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
```

Run with `--env-file .env.local`. Put it behind TLS (Caddy/Traefik) because OAuth requires HTTPS for
any non-localhost redirect URI.

## Supabase

- Apply migrations with the CLI (`supabase db push`) or the SQL editor.
- Rotate the service-role key if it was ever pasted into a client bundle or log.
- Enable **Auth → Email** and set the site URL to your deployed origin.

## Post-deploy checklist

- [ ] `/api/health` returns `integrations.googleDrive: true` and `supabase: true`
- [ ] Login works and a profile row is created by the trigger
- [ ] Google consent completes and `/account` shows the account + scopes
- [ ] A test upload appears in Drive under `GOLIATH/`
- [ ] A test download round-trips the bytes
- [ ] One AI query returns a real answer (or a clear "not configured")
- [ ] `GOLIATH_TOKEN_ENCRYPTION_KEY` is stored outside the repo

## Rollback

Previous builds are immutable on Vercel — promote the last good deployment from the dashboard. For
self-hosted, keep the previous image tag and redeploy it.

## Monitoring

There is no external monitoring dependency. Useful signals:

- Server logs: `[goliath] unhandled error` lines come from `lib/api.ts`.
- `agent_action_logs` for agent behaviour.
- `transfers` table for failed uploads/downloads.