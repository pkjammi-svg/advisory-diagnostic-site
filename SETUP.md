# Go-live checklist (about 10 minutes)

The code is finished and deploys automatically from `main` on Vercel.
These last steps need your own Supabase and Vercel logins.

## 1. Supabase — create the portal database (2 min)
1. Open your project at https://supabase.com/dashboard
2. Left sidebar → **SQL Editor** → **New query**
3. Paste the whole of `supabase/schema.sql` from this repo → **Run**
   (safe to run more than once). You should see "Success. No rows returned".
4. Left sidebar → **Storage**: check that a bucket called `engagement-files` now exists.

## 2. Supabase — email links (1 min)
1. **Authentication → URL Configuration**
2. **Site URL**: your live website address (e.g. `https://advisory-diagnostic-site.vercel.app` or your own domain)
3. **Redirect URLs**: add `https://<your-site>/**`

## 3. Vercel — environment variables (3 min)
Vercel → your `advisory-diagnostic-site` project → **Settings → Environment Variables**.
Make sure all of these exist (tick Production, Preview and Development):

| Name | Value (from Supabase → Project Settings → API) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_URL` | Project URL (same as above) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |
| `ADMIN_EMAILS` | the email you will log in with as the consultant |
| `ANTHROPIC_API_KEY` | optional — only for the "AI first draft" button |

Then **Deployments → latest → ⋯ → Redeploy** so the new values take effect.

## 4. Test it (4 min)
1. Open `https://<your-site>/signup` and create an account with your `ADMIN_EMAILS` address;
   confirm the email, then sign in → you land on **/admin**.
2. In a private/incognito window, sign up as a test client → choose a service →
   fill a few answers → upload a file → **Submit & review** → check the confirmation page.
3. Back in **/admin**, open the request → try **Request more info**, **Analysis tools**,
   then write a short solution and **Publish to client**.
4. As the test client, open **My dashboard** → **View solution**.

Share `https://<your-site>/login` with prospects on LinkedIn.
