# Deployment Guide

This is a real, working Next.js website: homepage + 4 category diagnostic pages, a secure
backend that talks to Claude, and a database for leads. Everything I could build for you is
done. The steps below are the parts that need your own accounts — I can't do these for you,
but each one takes a few minutes.

## What you'll need (all free to start)
1. A GitHub account (to hold the code)
2. A Vercel account (hosting) — sign up at vercel.com, free tier
3. A Supabase account (database) — sign up at supabase.com, free tier
4. Your own Claude API key — from console.anthropic.com (separate from your claude.ai
   subscription; billed pay-as-you-go, roughly $8-15/month at ~100 conversations)
5. (Optional) A domain name, if you want your own instead of the free vercel.app one

---

## Step 1 — Put the code on GitHub
1. Create a new empty repository on GitHub (e.g. "advisory-diagnostic-site")
2. Upload this entire folder's contents to that repository
   (easiest way: GitHub Desktop, or drag-and-drop upload via GitHub's web UI)

## Step 2 — Set up Supabase (the database)
1. Go to supabase.com, create a new project (pick any name/region)
2. Once created, go to the SQL Editor (left sidebar) → New query
3. Open `supabase/schema.sql` from this project, paste its contents in, click Run
4. Go to Project Settings → API — copy the "Project URL" and the "service_role" key
   (NOT the "anon" key — the service role key is what the backend uses)

## Step 3 — Get your Claude API key
1. Go to console.anthropic.com → API Keys → Create Key
2. Copy the key (you won't be able to see it again after leaving the page)

## Step 4 — Deploy to Vercel
1. Go to vercel.com → New Project → import the GitHub repo you created in Step 1
2. Before deploying, add these Environment Variables (Vercel will prompt you):
   - `ANTHROPIC_API_KEY` → your key from Step 3
   - `SUPABASE_URL` → from Step 2
   - `SUPABASE_SERVICE_ROLE_KEY` → from Step 2
   - `NEXT_PUBLIC_SUPABASE_URL` → same Project URL as above
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the "anon" / public key from Project Settings → API
   - `ADMIN_EMAILS` → your own login email(s), comma separated — these accounts get the
     consultant dashboard (see "Client portal" below)
   - `NOTIFY_WEBHOOK_URL` → optional, leave blank for now (see below)
3. Click Deploy. In about a minute, you'll get a live URL like
   `your-project.vercel.app` — this is your real, working website.

## Step 5 — (Optional) Connect your own domain
1. In Vercel: Project → Settings → Domains → add your domain
2. Vercel will show you 1-2 DNS records to add at wherever you bought the domain
   (GoDaddy, Namecheap, etc.) — add those, and it connects automatically (can take
   a few hours to fully propagate)

## Step 6 — (Optional) Get notified when a lead comes in
The simplest option: create a free Slack workspace (or use an existing one),
add an "Incoming Webhook" app, copy the webhook URL it gives you, and paste it
into the `NOTIFY_WEBHOOK_URL` environment variable in Vercel, then redeploy.
Every new callback request will post a message there.
(A Zapier "Catch Hook" URL works the same way if you'd rather route it to email instead.)

---

## Testing it once live
Visit your Vercel URL, pick a category, run a full dummy conversation through to the
one-pager, and submit the scheduling form. Then check your Supabase "leads" table
(Table Editor, left sidebar) — you should see the row appear with the transcript,
one-pager, and contact details saved.

## What's intentionally NOT included yet (from our tracker)
- Legal documents (NDA, Terms, Privacy Policy) — draft separately, get lawyer-reviewed,
  link them from the footer once ready
- Payment collection — add a Razorpay/Stripe link once you're ready to charge
- Real calendar booking (Calendly/Cal.com) — the current form captures a preferred
  day/time as text; swap in an embedded calendar later if you want clients picking
  from your real availability instead
- The 2 additional ad-matched landing pages with custom headlines per ad — right now
  all 4 categories share one generic layout; can be customized once ad copy is final

---

## Client portal (the main workflow)

Send prospects from LinkedIn etc. to `https://your-site/login`. The flow is:

1. **Login / sign up** (`/login`, `/signup`) — clients create an account with name, company, phone.
2. **Choose a service** (`/services`) — the 4 services:
   - New Business Evaluation & Investor Readiness
   - Business Problem — Root Cause & Solution
   - Business Performance Analysis
   - Risk Assessment, SOPs & Controls
3. **Share data** (`/engagement/<id>/data`) — guided questions plus a document checklist with
   uploads (up to 50 MB per file, stored privately in Supabase Storage). Clients can save and return.
4. **Confirmation** (`/engagement/<id>/confirmation`) — exactly what was received, what is still
   needed (missing answers, missing required documents, anything you requested), and next steps.
5. **Solution** (`/engagement/<id>/solution`) — your write-up and deliverable files, once you publish.
6. **Client dashboard** (`/dashboard`) — every request with status and % complete.

### Your consultant dashboard (`/admin`)
Sign in with an email listed in `ADMIN_EMAILS` and you land on `/admin`: all clients, all requests,
filters, and who each request is waiting on. Open a request to:
- review answers and download files, with a missing-items checklist
- **Request more info** — add items; they appear on the client's data and confirmation pages
- **Analysis tools** — 5-year projection (startup), starter risk & control matrix (risk), and a CSV
  performance comparison (rank customers / salespeople / products / expenses from any uploaded CSV)
- **Solution** — edit the per-service template, optionally generate an AI first draft
  (uses `ANTHROPIC_API_KEY`), attach deliverable files, then **Publish to client**
- **Private notes** — never shown to the client

### Setup for the portal
1. In the Supabase SQL editor, run the "Client portal" section at the bottom of `supabase/schema.sql`
   (everything from the `Client portal` comment down; if this is a brand-new project, run the whole file) — it adds the
   `engagements` and `engagement_files` tables and the private `engagement-files` storage bucket.
2. Set `ADMIN_EMAILS` in Vercel and redeploy.
3. Supabase → Authentication → URL Configuration: set the Site URL to your live domain so
   confirmation and password-reset emails link back correctly.
