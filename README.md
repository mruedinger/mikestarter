# Mike's Beach Bar

A small donation site for stocking the bar at our summer beach trip. Built with
[Astro](https://astro.build) on the frontend, Cloudflare Pages + Pages Functions
for hosting, [Cloudflare D1](https://developers.cloudflare.com/d1/) for storage,
and [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/)
for the admin login.

Live at <https://grunglebird.com>.

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

   If your `CLOUDFLARE_API_TOKEN` doesn't have D1 write scope, paste the contents
   of `migrations/0001_init.sql` into the D1 Console in the dashboard instead.

3. **Create a Cloudflare Pages project** and connect this repo (or do a direct
   upload via `npm run deploy`). In the Pages dashboard:

   - Build command: `npm run build`
   - Build output directory: `dist`
   - Bind D1: variable name `DB`, database `mikestarter` (Settings → Functions)

   Env vars on this project are managed through `wrangler.toml`, not the
   dashboard, because it declares bindings. Concretely:

   - `PUBLIC_TURNSTILE_SITE_KEY` — declared under `[vars]` in `wrangler.toml`
     (it's public — it ships in the HTML). Set the real value there, commit,
     push to trigger a rebuild.
   - `TURNSTILE_SECRET_KEY` — set as an encrypted **Secret** in the Pages
     dashboard (Settings → Environment variables). Secrets stay in the dashboard
     even when bindings live in `wrangler.toml`.
   - **Do not** set `DEV` in production.

4. **Custom domain**: in Pages → Custom domains, add your domain (e.g.
   `grunglebird.com`). Cloudflare adds the CNAME automatically if the domain
   is on Cloudflare.

5. **Protect the admin routes with Cloudflare Access**:
   Zero Trust dashboard → Access → Applications → Add a self-hosted application.

   - Application domain: your site's domain
   - Paths (add all three on the same application):
     - `/admin`
     - `/admin/*`
     - `/api/admin/*`
   - Identity provider: Google (requires a Google Cloud OAuth client — set up
     the OAuth consent screen and credentials first, then wire the client ID
     and secret under Zero Trust → Settings → Authentication → Login methods).
     OneTimePin is simpler if you don't want to set up Google.
   - Policy: `Allow` with an email rule listing you (and any co-admins).

   The admin API (`functions/api/admin/*`) reads the `cf-access-jwt-assertion`
   header injected by Access to confirm the request was authorized upstream.

6. **Turnstile**: create a new widget at
   <https://dash.cloudflare.com/?to=/:account/turnstile>, list your site's
   hostname(s) under "Hostnames" (e.g. `grunglebird.com`), and copy:

   - Site key → `[vars]` block in `wrangler.toml` as `PUBLIC_TURNSTILE_SITE_KEY`
   - Secret key → Pages dashboard as a Secret named `TURNSTILE_SECRET_KEY`

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
