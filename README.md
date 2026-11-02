# HVAC Academy

Interactive HVAC training from absolute beginner to professional diagnostics: Duolingo-style lessons, 12 training games, a realistic Field Simulator, spaced review, certification practice exams and an admin console. Built with Next.js 16, TypeScript, Tailwind CSS v4 and PostgreSQL (Drizzle ORM).

## What's inside

| Area | Details |
| --- | --- |
| **Curriculum** | 10 levels · 61 lessons · 240+ graded questions · 115-term glossary. Each lesson cites sources (ACCA, EPA 608, OSHA, NFPA, NATE, ASHRAE, manufacturer IOMs) and has a revision date and a *general* vs *equipment-specific* scope flag. |
| **Lesson player** | Concept → example → safety → interactive widget → practice. Six question types (single, multi, true/false, ordering, matching, numeric) with per-option feedback and glossary links. 12 interactive widgets (refrigeration-cycle explorer, PT/superheat/subcooling calculator, Ohm's law, thermostat simulator, virtual multimeter, static-pressure explorer, furnace sequence with fault injection, evacuation/decay-test simulator, …). |
| **Field Simulator** | 19 service calls (cooling, gas heat, heat pump; beginner → multi-fault). Ask the customer, inspect 6–7 locations, take ~27 kinds of readings with 6 tools. Readings come from the hidden fault and the power state. Lockout/tagout, verifying zero voltage and capacitor discharge are enforced. Scored on diagnosis, repair, *evidence gathered before acting*, safety, verification and efficiency, with a full debrief. |
| **Games A–L** | Name That Part · Build the System · Wire It Right · Find the Fault · Pressure Detective · HVAC Crossword · Match the Component · Repair Shop · Installation Challenge · Electrical Detective · Speed Round · Mystery Service Call. |
| **Progression** | XP ledger, rank levels, streaks (time-zone aware), 17 badges, daily & weekly challenges, Leitner spaced repetition, skill mastery, personalized "recommended next", level unlocks with test-out checkpoints, verifiable certificates, opt-in weekly leaderboard, beginner/advanced modes. |
| **Cert prep** | EPA 608 Core / Type I / II / III, NATE-style knowledge areas, HVAC Excellence-style Employment Ready, apprenticeship readiness — timed, randomized, explained. Clearly labeled as practice, unaffiliated. |
| **Admin** | Stats, audit log, user role/plan management, and a schema-validated JSON editor to edit or add lessons, questions and field scenarios without code changes (with draft/publish and revert). |
| **Billing** | Optional Stripe subscription (Checkout, Customer Portal, signed webhooks). With no Stripe keys, everything is unlocked ("early access"). |

## Security model

* **Server-authoritative scoring.** Answers, explanations, hidden faults and game solutions never reach the browser. Lessons, reviews, exams, games and simulator runs live in a server-side `runs` table. Every answer is graded on the server. The simulator replays a validated action log to compute state and score. XP is only written by the server (ledger + atomic "claim finish" so a run can't be awarded twice). Game and simulator XP only rewards first plays or improvement.
* **Auth.** scrypt password hashing, opaque 256-bit session tokens stored as SHA-256 hashes, `httpOnly`/`SameSite=Lax`/`Secure` cookies, per-account lockout after 5 failures, per-IP rate limits, generic error messages and timing equalization.
* **Authorization.** Every server action re-checks the session. Admin pages and actions call `requireAdmin()`. Runs are always scoped to their owner.
* Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`), zod validation on all inputs, and safe redirects.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: set ADMIN_EMAILS to your email
npm run dev                  # http://localhost:3000
```

No database setup is needed locally: an embedded Postgres (PGlite) is created in `.data/`. Migrations run automatically.

## Tests

```bash
npm test            # 114 unit + integration tests (grading, XP, streaks, SRS, sim engine, every scenario, every game, auth, anti-cheat, authorization)
npm run typecheck
npm run lint

# End-to-end (Playwright) against a running server started with ADMIN_EMAILS=admin@example.com
npm run build && ADMIN_EMAILS=admin@example.com PORT=3100 npm start &
BASE_URL=http://localhost:3100 npx tsx tests/e2e/smoke.ts
```

## Deploying (Vercel + Supabase)

1. Create a Supabase project and copy its **transaction pooler** connection string.
2. Import this repo in Vercel and set `DATABASE_URL`, `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL` (plus the Stripe variables when you're ready to charge).
3. Deploy. Migrations in `drizzle/` run on first boot (or set `DB_AUTO_MIGRATE=false` and run `npx drizzle-kit migrate` from CI).

## Project structure

```
src/content/        curriculum data: levels, lessons (per level), questions, glossary, sources, cert banks, components
src/engine/         pure logic: grading, progression (XP/streaks/SRS/mastery), achievements, challenges, PT chart,
                    sim/ (catalog, scenarios, engine), games/ (12 games, server-held secrets + graders)
src/server/         database (Drizzle schema + client), auth, curriculum overrides, learning/play/progress services, Stripe
src/app/            routes: (site) public pages, (app) authenticated app, admin, API routes, server actions
src/components/     UI kit, diagrams, widgets, lesson player, simulator UI, game players
drizzle/            SQL migrations
tests/              vitest suites + Playwright e2e smoke test
```

### Adding content

* **In code:** add a lesson to `src/content/lessons/levelN.ts` using the helpers in `dsl.ts`, or a scenario to `src/engine/sim/scenarios.ts`. `npm test` validates ids, sources, answers, diagrams, widgets and that every scenario can be solved for an A.
* **Without deploying:** Admin → Curriculum & content. Edits are validated against the same zod schemas and take effect immediately.

## Disclaimer

Educational software only. It does not certify, license or authorize anyone to perform hazardous or regulated work. Always follow manufacturer instructions, applicable codes, permits, EPA Section 608 rules and your employer's safety program. Not affiliated with or endorsed by EPA, NATE, HVAC Excellence, ESCO Group, ACCA, ASHRAE, NFPA or OSHA.
