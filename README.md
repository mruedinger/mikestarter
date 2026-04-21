# Mike's Beach Bar

A small donation site for stocking the bar at our summer beach trip. Built with
[Astro](https://astro.build) on the frontend, Cloudflare Pages + Pages Functions
for hosting, [Cloudflare D1](https://developers.cloudflare.com/d1/) for storage,
and [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/)
for the admin login.

Live at <https://mike.rued.ing>.

## What it does

- Public landing page with the menu, funding milestones ($500 / $750 / $1000),
  suggested donation amounts, and a live progress meter
- Pledge form: name, dollar amount, Venmo handle, and a "keep my name private"
  checkbox (defaults to private)
- Public pledge list shows real names or "Anonymous"; Venmo handles are admin-only
- Pledgers can edit or delete their own pledge from the same browser without
  signing in (capability cookie tied to a per-row edit token)
- Admin page (`/admin`) gated by Cloudflare Access — view all pledges with real
  names + Venmo handles, mark them paid, or delete them

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars
cp .env.example .env
npm run dev
```

The Astro dev server runs the static page only. To exercise the API and database
locally, build and run under Wrangler:

```sh
npm run db:migrate:local   # apply the schema to a local SQLite DB
npm run build
npm run preview            # serves dist/ + /functions via wrangler pages dev
```

`DEV=1` in `.dev.vars` bypasses the Cloudflare Access check on `/api/admin/*`
so you can test the admin page locally.

## First-time deploy

1. **Create the D1 database**

   ```sh
   npx wrangler d1 create mikestarter
   ```

   Copy the printed `database_id` into `wrangler.toml`.

2. **Apply migrations to the remote DB**

   ```sh
   npm run db:migrate:remote
   ```

3. **Create a Cloudflare Pages project** and connect this repo (or do a direct
   upload via `npm run deploy`). In the Pages dashboard:

   - Build command: `npm run build`
   - Build output directory: `dist`
   - Bind D1: variable name `DB`, database `mikestarter`
   - Environment variables (Production):
     - `TURNSTILE_SECRET_KEY` — from your Turnstile widget
     - `PUBLIC_TURNSTILE_SITE_KEY` — same widget's site key (build-time)
   - **Do not** set `DEV` in production

4. **Custom domain**: in Pages → Custom domains, add `mike.rued.ing`.
   Cloudflare adds the CNAME automatically since `rued.ing` is on Cloudflare.

5. **Protect the admin route with Cloudflare Access**:
   Zero Trust dashboard → Access → Applications → Add a self-hosted application.

   - Application domain: `mike.rued.ing`
   - Path: `/admin` (add a second application for `/api/admin/*`)
   - Identity provider: Google (or whichever you prefer)
   - Policy: allow only your email

6. **Turnstile**: create a new widget at
   <https://dash.cloudflare.com/?to=/:account/turnstile>, add `mike.rued.ing` as
   the hostname, and copy the site/secret keys into the Pages env vars above.

## Project layout

```
.
├── astro.config.mjs
├── migrations/
│   └── 0001_init.sql           # D1 schema
├── functions/
│   ├── _utils.ts               # validation, cookies, Turnstile, Access guard
│   └── api/
│       ├── pledges.ts          # GET (public list) / POST (create)
│       ├── pledges/
│       │   ├── me.ts           # GET self via cookie
│       │   └── [id].ts         # PATCH / DELETE self via cookie
│       └── admin/
│           ├── pledges.ts      # GET all (Access-gated)
│           └── pledges/[id].ts # PATCH paid / DELETE (Access-gated)
├── src/
│   ├── layouts/Layout.astro
│   └── pages/
│       ├── index.astro         # public page
│       └── admin.astro         # admin table
├── wrangler.toml
└── package.json
```

## License

MIT — see [LICENSE](./LICENSE).
