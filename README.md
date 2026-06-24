## Devvit React Starter

A starter to build web applications on Reddit's developer platform

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [React](https://react.dev/): For UI
- [Hono](https://hono.dev/): For backend logic
- [Tailwind](https://tailwindcss.com/): For styles
- [TypeScript](https://www.typescriptlang.org/): For type safety

## Domain access (allcourt.pro)

This app’s server fetches live ATP/WTA match results from AllCourt Pro’s public API at `https://www.allcourt.pro/api/tennis-results/recently-added` (match lines, timestamps, and optional charting stats). Reddit Devvit blocks outbound HTTP to domains that are not on your app’s allowlist, so `allcourt.pro` and `www.allcourt.pro` are listed under **Domain exceptions** in `devvit.json`. Until Reddit approves that domain in Developer Settings (currently **Pending**), those requests fail and the app shows sample data instead; once approved, the same endpoints serve real recently-added matches with no code changes.

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


<!-- Ignore max age limit -->
curl -s "http://localhost:3000/api/tennis-results/recently-added?limit=1&ignoreMaxAge=1" | jq

<!-- Gets the matches that have recently been added to allcourt pro -->
curl -s "http://localhost:3000/api/tennis-results/recently-added" | jq