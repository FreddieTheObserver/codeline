// Read-only summary of what a database holds beyond the seeded sample data, to decide whether it needs cleaning.
// Usage: bun scripts/db-report.ts [ENV_VAR]. It reads the connection string from DATABASE_URL by default;
// for production, put the Session pooler string in .env as PROD_DATABASE_URL and pass that name.
import "dotenv/config";
import postgres from "postgres";

const name = process.argv[2] ?? "DATABASE_URL";
const url = process.env[name];
if (!url) throw new Error(`Set ${name}, for example in .env`);
let host = "unknown host";
try {
  host = new URL(url).hostname;
} catch {}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
const SEEDED_SIM = "^sim-[0-9]{3}-[0-9]+$";
const KIND_LABEL: Record<string, string> = {
  sample: "sample account (lecturer, ta, student)",
  seeded_sim: "seeded simulated student",
  tool_sim: "simulated student added with the demo tool",
  smoke: "test account made by scripts/smoke.ts",
};

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "-");
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

async function main() {
  console.log(`Reading ${name} (${host}) in a read-only transaction.\n`);
  await sql.begin("read only", async (tx) => {
    // Sorts every account once, so "real" means a person who signed up, not sample, simulated or test data.
    const people = tx`
      select id, role, created_at, case
          when login_id in ('lecturer', 'ta', 'student') then 'sample'
          when is_simulated and login_id ~ ${SEEDED_SIM} then 'seeded_sim'
          when is_simulated then 'tool_sim'
          when login_id ~ '^smoke[0-9]+$' and name = 'Smoke Tester' then 'smoke'
          else 'real'
        end as kind
      from users`;

    // The seed backdates its Sessions and creates its courses and Exercises before its simulated students,
    // so anything created after the last seeded simulated student came later.
    const [cut] = await tx<{ seed_end: Date | null }[]>`
      select coalesce(
        (select max(created_at) from users where login_id ~ ${SEEDED_SIM}),
        (select created_at from users where login_id = 'lecturer')
      ) as seed_end`;
    const seedEnd = cut.seed_end;
    console.log(seedEnd ? `Sample data seeded around ${day(seedEnd)}.\n` : "No seeded sample data found.\n");

    const kinds = await tx<{ kind: string; role: string; n: number; first: Date; last: Date }[]>`
      with people as (${people})
      select kind, case when kind = 'real' then role else '' end as role,
        count(*)::int as n, min(created_at) as first, max(created_at) as last
      from people group by 1, 2 order by 1, 2`;
    console.log("Accounts");
    for (const k of kinds) {
      const label = k.kind === "real" ? `real ${k.role} account` : KIND_LABEL[k.kind];
      console.log(`  ${String(k.n).padStart(4)}  ${label}  (created ${day(k.first)} to ${day(k.last)})`);
    }

    const courses = await tx<{ code: string; title: string; is_sample: boolean; created_at: Date; real: number; test: number; simulated: number }[]>`
      with people as (${people})
      select c.code, c.title, c.is_sample, c.created_at,
        count(p.id) filter (where p.kind = 'real')::int as real,
        count(p.id) filter (where p.kind = 'smoke')::int as test,
        count(p.id) filter (where p.kind in ('seeded_sim', 'tool_sim'))::int as simulated
      from courses c
      left join enrolments e on e.course_id = c.id
      left join people p on p.id = e.user_id
      group by c.id order by c.created_at`;
    console.log("\nCourses");
    for (const c of courses) {
      const origin = c.is_sample && seedEnd && c.created_at <= seedEnd ? "sample" : `added ${day(c.created_at)}`;
      console.log(`  ${c.code} ${c.title} [${origin}]: ${count(c.real, "real student", "real students")}, ${c.test} test, ${c.simulated} simulated`);
    }

    const exercises = seedEnd
      ? await tx<{ code: string; title: string; created_at: Date }[]>`
          select c.code, x.title, x.created_at from exercises x join courses c on c.id = x.course_id
          where x.created_at > ${seedEnd} order by x.created_at`
      : [];
    console.log(`\nExercises added after the seed: ${exercises.length}`);
    for (const x of exercises) console.log(`  ${x.code} ${x.title} (${day(x.created_at)})`);

    const sessions = await tx<{ id: string; code: string; status: string; created_at: Date; rounds: number; placements: number; real: number; test: number; sample: number; simulated: number }[]>`
      with people as (${people})
      select s.id, c.code, s.status, s.created_at,
        (select count(*)::int from rounds r where r.session_id = s.id) as rounds,
        (select count(*)::int from placements pl join rounds r on r.id = pl.round_id where r.session_id = s.id) as placements,
        count(p.id) filter (where p.kind = 'real')::int as real,
        count(p.id) filter (where p.kind = 'smoke')::int as test,
        count(p.id) filter (where p.kind = 'sample')::int as sample,
        count(p.id) filter (where p.kind in ('seeded_sim', 'tool_sim'))::int as simulated
      from sessions s
      join courses c on c.id = s.course_id
      left join participants pa on pa.session_id = s.id
      left join people p on p.id = pa.user_id
      group by s.id, c.code order by s.created_at`;
    const later = sessions.filter((s) => !seedEnd || s.created_at > seedEnd);
    console.log(`\nSessions: ${sessions.length - later.length} seeded, ${later.length} added after the seed`);
    for (const s of later) {
      // A Session left open blocks its course from opening a new one.
      const open = s.status === "closed" ? "closed" : `${s.status}, STILL OPEN`;
      console.log(
        `  ${s.id}  ${s.code}  ${day(s.created_at)}  ${open}  ${count(s.rounds, "Round", "Rounds")}, ${count(s.placements, "Placement", "Placements")}; ` +
          `players: ${s.real} real, ${s.test} test, ${s.sample} sample, ${s.simulated} simulated`,
      );
    }
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
