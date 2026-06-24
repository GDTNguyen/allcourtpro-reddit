## Devvit React Starter

A starter to build web applications on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [React](https://react.dev/): For UI
- [Hono](https://hono.dev/): For backend logic
- [Tailwind](https://tailwindcss.com/): For styles
- [TypeScript](https://www.typescriptlang.org/): For type safety

## Domain access (Supabase)

This app’s server fetches live ATP/WTA match results from AllCourt Pro’s Supabase project at `https://amspslqidldfolaborfi.supabase.co` (PostgREST on `tennis_results_matches`: match lines, timestamps, and optional charting stats). AllCourt Pro’s cron writes new ATP/WTA results there; the Devvit app reads the same rows directly instead of calling `allcourt.pro`.

Reddit Devvit blocks outbound HTTP to domains that are not on your app’s allowlist. `supabase.com` is an approved limited-scope cloud provider, so **`amspslqidldfolaborfi.supabase.co`** is listed under **Domain exceptions** in `devvit.json` (request the most granular subdomain in Developer Settings). Until Reddit approves that host, fetches fail and the app shows sample data instead.

### Devvit settings

This app does **not** use `allcourt-partner-pins-secret`. That setting belongs to **find10spartner** — it stores the Bearer token for syncing partner pins to `https://www.allcourt.pro/api/reddit/partner-pins` and must match `REDDIT_PARTNER_PINS_API_SECRET` in the AllCourt Pro `.env`.

For tennis results here, set the Supabase anon key once the server reads from Supabase (local dev can use `.env` instead):

```bash
npx devvit settings set supabase-anon-key
```

Use the same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the AllCourt Pro project. The Supabase URL is fixed in code / `devvit.json`; only the key is secret.

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Run `npm create devvit@latest --template=react`
2. Go through the installation wizard. You will need to create a Reddit account and connect it to Reddit developers
3. Copy the command on the success page into your terminal

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: Type checks, lints, and prettifies your app


## Test Supabase data (PostgREST)

Replace `YOUR_ANON_KEY` with `NEXT_PUBLIC_SUPABASE_ANON_KEY` from AllCourt Pro.

```bash
# Recently added (default ~10 min window — set first_seen_at cutoff to now minus 10m)
curl -s "https://amspslqidldfolaborfi.supabase.co/rest/v1/tennis_results_matches?select=event_key,line,match_date,match_time,first_seen_at&order=first_seen_at.desc&limit=10&first_seen_at=gte.2026-06-24T12:00:00Z" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq

# Ignore max age (no cutoff filter)
curl -s "https://amspslqidldfolaborfi.supabase.co/rest/v1/tennis_results_matches?select=event_key,line,match_date,match_time,first_seen_at&order=first_seen_at.desc&limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" | jq
```

AllCourt Pro local API (same data, includes charting markdown enrichment):

```bash
curl -s "http://localhost:3000/api/tennis-results/recently-added?limit=1&ignoreMaxAge=1" | jq
curl -s "http://localhost:3000/api/tennis-results/recently-added" | jq
```