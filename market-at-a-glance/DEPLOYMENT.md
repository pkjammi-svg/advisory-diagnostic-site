# Deploying Market at a Glance (Render + Vercel)

This gets you a real, public URL: the backend (FastAPI + SQLite) on Render,
the frontend (React dashboard) on Vercel. Both have free tiers — no card
required for Render's free web service; Vercel's Hobby plan is free.

Everything code-side is already set up (`render.yaml`, `frontend/vercel.json`,
env-configurable CORS and API URL). The steps below are the account/dashboard
actions that only you can do — each takes a couple of minutes.

---

## Step 1 — Deploy the backend on Render

1. Go to [render.com](https://render.com) and sign in (GitHub sign-in is easiest).
2. **New +** → **Blueprint**.
3. Connect your GitHub account if you haven't, then pick the
   `advisory-diagnostic-site` repo.
4. Render will detect `render.yaml` at the repo root and propose a service
   called **market-at-a-glance-api**. Review it and click **Apply**.
5. First deploy takes a few minutes (installing Python dependencies). Once
   live, Render gives you a URL like:
   `https://market-at-a-glance-api.onrender.com`
6. Sanity check — open `https://market-at-a-glance-api.onrender.com/api/health`
   in your browser; you should see `{"status":"ok"}`. The dashboard data
   itself takes another minute or two after that to finish auto-seeding
   (see "How data loads" below) — refresh
   `https://market-at-a-glance-api.onrender.com/api/dashboard` until
   `shortlist` is non-empty.

**Note on free-tier behavior**: Render's free web services sleep after ~15
minutes idle and take 30-60 seconds to wake on the next request — that's
normal, not a bug. The filesystem is also ephemeral, so the database resets
on every redeploy/restart; the app re-populates itself automatically on
startup (see below), so this is expected rather than something to fix.

## Step 2 — Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with the same GitHub
   account you already use for the existing advisory-diagnostic-site.
2. **Add New** → **Project** → import the `advisory-diagnostic-site` repo
   again (as a *second* Vercel project — this is independent of your
   existing site's Vercel project).
3. On the configuration screen:
   - **Root Directory**: click "Edit" and set it to `market-at-a-glance/frontend`
   - Framework preset should auto-detect as **Vite** (from `vercel.json`)
4. Before deploying, add one **Environment Variable**:
   - `VITE_API_BASE_URL` = `https://market-at-a-glance-api.onrender.com/api`
     (use the exact URL Render gave you in Step 1, with `/api` on the end)
5. Click **Deploy**. In about a minute you'll get a live URL like
   `market-at-a-glance.vercel.app`.

## Step 3 — Connect the two (CORS)

The backend only accepts browser requests from origins you've explicitly
allowed, so the dashboard can talk to the API:

1. Copy your Vercel URL from Step 2 (e.g. `https://market-at-a-glance.vercel.app`).
2. In Render: your service → **Environment** tab → edit `MAAG_CORS_ORIGINS`
   → set it to that URL (comma-separate if you later add a custom domain).
3. Save — Render redeploys automatically with the new setting.

Open your Vercel URL — you should see the live dashboard.

## How data loads (no manual step needed)

Unlike the sandboxed build environment, **Render's servers have normal
outbound internet access** — so once deployed, the live-fetch code paths in
`app/data/prices.py` / `app/data/options.py` / `app/data/news.py` will
actually reach yfinance, NSE, and the news RSS feeds for real. On startup,
the API auto-seeds itself in the background (`MAAG_AUTO_SEED_ON_STARTUP`,
on by default) — no shell access or manual script run required — and an
in-process scheduler (`MAAG_ENABLE_SCHEDULER`) keeps it refreshed through
the trading day (08:45 IST pre-market, every 30 min 09:00-15:30 IST). If
any individual source is still unreachable or rate-limited, that instrument
falls back to the same clearly-labeled synthetic data as in local dev — the
dashboard never silently mixes labels.

## Optional: your own domain, paid tier, persistent disk

- **Custom domain**: add it in Vercel (Project → Settings → Domains) same
  as your existing site; add the DNS records it shows you at your
  registrar. Update `MAAG_CORS_ORIGINS` on Render to include the new domain.
- **Avoid cold starts / keep the DB between restarts**: upgrade the Render
  service to a paid instance type and attach a persistent disk mounted at
  `market-at-a-glance/backend/data_store` (Render dashboard → your service
  → **Disks** → **Add Disk**). Once attached, you can optionally set
  `MAAG_AUTO_SEED_ON_STARTUP=false` since the DB will now survive restarts.
- **Paid data feeds**: see the "Plugging in a paid data feed" section of
  `market-at-a-glance/README.md` for Kite Connect / Upstox / Global
  Datafeeds / NewsAPI / GNews keys — add them as Render environment
  variables the same way as `MAAG_CORS_ORIGINS` above.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Dashboard shows "Couldn't reach the backend" | `VITE_API_BASE_URL` missing/wrong on Vercel, or backend still asleep | Check the env var value and that it ends in `/api`; hit the Render `/api/health` URL directly to wake it |
| Dashboard loads but is empty/loading forever | Auto-seed still running (first request after a cold start), or it failed | Check Render's **Logs** tab for `Auto-seed:` lines; `POST /api/pipeline/run` re-runs strategy generation on whatever data is already stored |
| Browser console shows a CORS error | Vercel URL not yet in `MAAG_CORS_ORIGINS` | Update the env var on Render (Step 3) and wait for the redeploy |
