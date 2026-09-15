# Deploying to Cloudflare

The site is already build-compatible: `npm run build` produces a `dist/`
folder containing **only `index.html`, plain `.js` bundles, and one `.css`
file** (TypeScript never ships to visitors — it's compiled away). Cloudflare
Pages serves that folder as-is.

## Architecture — what goes where

| Piece | Runs on | Notes |
|---|---|---|
| Frontend (pages, UI) | **Cloudflare Pages** | static files from `dist/` |
| Backend + database + auth + file storage | **Convex** (stays as-is) | Cloudflare only hosts the frontend; API calls go to `https://<deployment>.convex.cloud` |
| `GITHUB_TOKEN` (ticket → issue feature) | **Convex env**, not Cloudflare | secrets are server-side only |

## One-time setup

### 1. Get your own Convex deployment

The Freebuff preview uses a managed Convex deployment. For a self-hosted
site you need your own (free tier is fine):

```bash
npx convex login        # creates/uses your Convex account
npx convex deploy       # creates a production deployment and pushes functions
```

`npx convex deploy` prints your deployment URL — a
`https://<name>.convex.cloud` value. **Use the `.cloud` URL** (the browser
client needs it), not the `.site` one.

> Note: the new deployment starts empty. To bring existing data over, run
> `npx convex export` on the old deployment and `npx convex import` on the
> new one, or just start fresh.

### 2. Set the GitHub keys on Convex (only if using the ticket → GitHub feature)

```bash
npx convex env set GITHUB_TOKEN ghpx_...   # fine-grained PAT with "Issues: read & write" on the repo
npx convex env set GITHUB_REPO Couthi3/couthi3s-school-shop
```

If you're staying on the Freebuff-hosted Convex deployment, add these two
values in the **Keys tab** instead — same names.

### 3. Create the Cloudflare Pages project

1. Push this repo to GitHub (already at `Couthi3/couthi3s-school-shop`).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repo, then use these build settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |

4. Under **Environment variables (production)** add:

| Variable | Value |
|---|---|
| `VITE_CONVEX_URL` | `https://<your-deployment>.convex.cloud` (from step 1) |
| `NODE_VERSION` | `22` |

5. **Save and Deploy.** Every push to the connected branch redeploys automatically.

### 4. Done — verify

- Open the `*.pages.dev` URL; shops, orders, chat, admin should all work.
- If you see the "Missing configuration" screen, `VITE_CONVEX_URL` wasn't
  set before the build — add it and **trigger a rebuild** (Vite bakes the
  variable in at build time, not runtime).
- 404s on deep links like `/shop/abc123` mean the `_redirects` file is
  missing from the deploy (it lives in `public/` and is copied to `dist/`
  automatically).

## Custom domain (optional)

Pages project → **Custom domains** → add your domain. Cloudflare handles
DNS + HTTPS automatically.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Missing configuration" screen | `VITE_CONVEX_URL` missing at build time — set it, rebuild |
| Blank page, console shows `Failed to fetch dynamically imported module` | Hard-refresh; if it persists, check that `dist/` was the output dir |
| Convex errors like "Did you forget to run convex dev?" | Functions weren't pushed — run `npx convex deploy` again |
| GitHub "Push" button fails with 401/404 | `GITHUB_TOKEN`/`GITHUB_REPO` env vars on Convex are missing or the token can't see the repo |
