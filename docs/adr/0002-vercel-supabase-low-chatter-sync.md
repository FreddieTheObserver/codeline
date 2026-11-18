# Vercel and Supabase, own sign-in, low-chatter live sync

The prototype runs on Vercel with Supabase Postgres and Supabase Realtime, both in Singapore, because a real multi-device demo on 26 Nov needs a real backend and both have free tiers.
Two limits shape the design.
Supabase Realtime's free plan allows 100 events per second, and a broadcast counts once for every receiving client, so pushing every Placement to 200 students is impossible; and Vercel runs only short request handlers, so no server process can tick a timer.
Therefore Placements go over HTTP, Rounds end on a stored deadline, the projector and console poll a summary about once a second, and students get only a few content-free control pushes per Round.
Supabase Auth allows 30 sign-ins per 5 minutes per IP by default and signs in by email, while a classroom on one Wi-Fi is one IP and students sign in by student ID, so CodeLine signs people in itself with hashed passwords and an httpOnly session cookie.
The backend needs only a Postgres connection string and Realtime, and students fall back to polling, so the backup if Supabase misbehaves is to point at any other Postgres; an in-browser mock was considered and dropped, because it would have meant writing every service twice.

## Consequences

- Up to about 90 students per Session fit the free plan; the 200 at the same time named by IT support (S1-IT-03) need Supabase's paid tier or a dedicated room server.
- Free Supabase projects pause after 7 days without activity, so the project must be woken before the demo.
