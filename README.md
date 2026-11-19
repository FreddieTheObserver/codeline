# CodeLine

CodeLine is a classroom exercise for turning an algorithm in plain words into code.
Each pseudocode step is a signpost beside an empty plot, each student holds a pouch of real code lines, and students plant each line in the plot where it belongs while the projector shows the class garden growing.

It is the interactive prototype for CSC213 Term Project 2.
Domain terms are in [GLOSSARY.md](GLOSSARY.md), design decisions in [docs/design.md](docs/design.md), and the reasoning behind the bigger choices in [docs/adr](docs/adr).

## Stack

- Next.js 16 (App Router, Cache Components) on Vercel, in the Singapore region.
- Postgres through Drizzle ORM, hosted on Supabase.
- Supabase Realtime for content-free "something changed" pushes; students fall back to polling.
- CodeLine's own sign-in: scrypt-hashed passwords and an httpOnly session cookie.
- Bun for packages and scripts, Vitest for the domain rules, Playwright (driving Edge) for screenshots.

## Run it locally

You need Bun and Docker.

```sh
bun install
docker run -d --name codeline-pg -e POSTGRES_USER=codeline -e POSTGRES_PASSWORD=codeline -e POSTGRES_DB=codeline -p 54329:5432 -v codeline-pg-data:/var/lib/postgresql/data postgres:17-alpine
cp .env.example .env
bun run db:migrate
bun run db:seed -- --reset
bun run dev
```

Demo accounts all use the password `codeline-demo`: `lecturer`, `ta` and `student`.
Join codes: `MEADOW` for CSC101 (Java) and `GROVE7` for PY101 (Python).
All seeded data is sample data and is marked as such in the app.

## Checks

```sh
bun run typecheck
bun run lint
bun run test
bun scripts/smoke.ts            # end-to-end API test against a running server (BASE_URL, default :3210)
node scripts/ui-check.mjs       # browser checks: dialogs, sign-in and sign-out, returning to a page
```

Both end-to-end checks create data, so run them only against a local database, then reseed.
They and the capture script stop if the address isn't on this machine, unless `--allow-remote` is the last argument.

## Deploy

1. Create a Supabase project in the Singapore region.
   From its Connect panel, copy the Transaction pooler string (port 6543) and the Session pooler string (port 5432).
   From its API keys, copy the project URL, the publishable key and the secret key.
2. Apply the schema and the sample data from your laptop, using the Session pooler string:

   ```sh
   MIGRATION_DATABASE_URL="<session pooler string>" bun run db:migrate
   MIGRATION_DATABASE_URL="<session pooler string>" bun run db:seed -- --reset
   ```

3. Import the GitHub repo into Vercel and set these environment variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Transaction pooler string (port 6543) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key (server only) |
   | `NEXT_PUBLIC_SITE_URL` | `https://codeline.layaungphyo.dev`, the address join links and QR codes use |

   `vercel.json` pins the functions to Singapore, next to the database.
4. Add `codeline.layaungphyo.dev` under the project's Domains, then create the `codeline` CNAME record with the target Vercel shows.
5. Free Supabase projects pause after 7 days without activity: open the app or the dashboard before a demo.

## Screens and the UI deliverable PDF

```sh
node scripts/capture-screens.mjs http://localhost:3210 ../codeline-deliverables/screens
node scripts/build-pdf.mjs ../codeline-deliverables/screens ../codeline-deliverables/CodeLine-UI-Prototype.pdf https://codeline.layaungphyo.dev
```

The capture script needs freshly seeded data and walks every business process through the real app.
Start the server with `NEXT_PUBLIC_SITE_URL=https://codeline.layaungphyo.dev`, so the projector's join link and QR code show the live address rather than localhost.
`scripts/demo-live.ts` opens a live CSC101 Session with simulated classmates for a quick demo.
