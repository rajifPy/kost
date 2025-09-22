# Next.js Kost Landing (Supabase)

Project: Landing page + payment receipts + admin dashboard for a kost (boarding house).

Features:
- Landing page with rooms list, gallery, reviews, maps
- Payment form: upload receipt -> stored in Supabase Storage -> insert payments row (status: pending)
- Admin dashboard: toggle room availability, verify payments, send notifications (Telegram / WhatsApp / SMS)
- Built with Next.js, Tailwind CSS, Supabase

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill values (Supabase, Twilio keys).

3. Create tables in Supabase using `db/schema.sql`, and create storage bucket `receipts`.

4. Run dev:
   ```
   npm run dev
   ```

## Seeding Supabase (automatic insert)

A seed script is available at `scripts/seed_supabase.js`. It uses the Supabase **service role key** to perform inserts/updates.

Usage (local):
```bash
# set your supabase service role key and url
export NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# run seed
npm run seed
```

The script will insert sample rooms from `db/seed_rooms.json` and a sample payment (if none exist). It is idempotent (will update rooms with same `number`).

## Deploy to Vercel (script & GitHub Actions)

Two deployment helpers were added:
- `scripts/deploy_vercel.sh` — a helper that uses the Vercel CLI to add env vars from a `.env.production` file and deploy. Requires `vercel` CLI and `VERCEL_TOKEN` environment variable set.
- GitHub Actions workflow `.github/workflows/vercel-deploy.yml` — deploys on push to `main` using GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

### Quick deploy via CLI
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Create a Vercel token (Vercel Dashboard → Settings → Tokens) and export it:
   ```bash
   export VERCEL_TOKEN=your_token_here
   ```
3. (Optional) Prepare `.env.production` with environment variables you want to upload to Vercel, e.g.:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon
   SUPABASE_SERVICE_ROLE_KEY=very_secret
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```
4. Run:
   ```bash
   bash scripts/deploy_vercel.sh .env.production
   ```

### Quick deploy via GitHub Actions
1. Push repo to GitHub.
2. In your GitHub repository → Settings → Secrets → Actions add:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
3. Push to `main` branch; workflow will run and deploy automatically.

Note: For security, set production secrets in Vercel Dashboard as well (for runtime env). The deploy scripts attempt to upload envs but you may prefer to set them manually in Vercel UI.
