# Going live on Netlify (with Supabase Postgres)

**Yes, you need a database.** Netlify runs the app as serverless functions with
an ephemeral, read-only filesystem, so the local SQLite file (`dev.db`) cannot
persist there. You need a hosted Postgres, and **Supabase** is the right fit.

Good news: our existing email + password login keeps working on Postgres. You do
**not** need to switch to Supabase Auth to go live. We just use Supabase for the
database. (Supabase Auth stays an easy future option.)

## One-time setup

### 1. Create the Supabase database

1. Create a Supabase project (any region near your team).
2. In the project: **Settings → Database → Connection string → URI**. Copy the
   **pooled** connection string (port `6543`, host contains `pooler`). Serverless
   functions must use the pooled connection.
3. That string, with `?pgbouncer=true&connection_limit=1` appended, is your
   `DATABASE_URL`.

### 2. Point the app at Postgres

In `prisma/schema.prisma`, change the datasource provider and add serverless-safe
binary targets to the generator:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The String-based JSON columns and String "enums" (`role`, `status`, `kind`) were
chosen precisely so this swap needs no data-model changes.

Then create the schema and seed once, from your machine, against Supabase:

```bash
DATABASE_URL="<supabase-uri>" npx prisma db push
DATABASE_URL="<supabase-uri>" npm run seed   # optional: loads the demo team
```

### 3. Push the repo to GitHub (or GitLab)

Netlify deploys from a Git repo. Create an empty GitHub repo and push this
project to it.

### 4. Connect Netlify

1. Netlify → **Add new site → Import from Git** → pick the repo.
2. Build command and Node version come from `netlify.toml` (already set).
3. **Site settings → Environment variables**, add:
   - `DATABASE_URL` = your Supabase pooled URI
   - `SESSION_SECRET` = a long random string
     (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`)
   - `ANTHROPIC_API_KEY` = optional, turns on the Claude question assistant
4. Deploy. Netlify auto-installs the Next.js plugin and hosts the SSR app +
   server actions as functions.

## After go-live

- Every push to the main branch redeploys automatically.
- To invite real teammates: sign in as the admin, go to **Admin → invite**, and
  send each person their temporary password. They set their own on first login.
- Change the seeded demo passwords (or reset the data) before real use.

## Notes

- **Backups & pausing:** Supabase's free tier pauses a project after ~7 days of
  inactivity and has no automatic backups. For real team data, budget for
  Supabase Pro ($25/mo).
- **Local dev is unaffected:** keep `provider = "sqlite"` locally by working on a
  branch, or switch back for local runs. The cleanest long-term setup is a small
  local Postgres (or a second free Supabase project) so local and prod match.
