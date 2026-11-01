/**
 * End-to-end smoke test. Run against a running server:
 *   BASE_URL=http://localhost:3100 ADMIN_EMAIL=admin@example.com npx tsx tests/e2e/smoke.ts
 * (The server must be started with ADMIN_EMAILS containing ADMIN_EMAIL.)
 */
import { chromium, type Page } from "playwright";
import { BASE_CURRICULUM, lessonQuestions } from "../../src/content";
import type { Question } from "../../src/content/types";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS;
const failures: string[] = [];
const ok = (cond: unknown, msg: string) => {
  if (!cond) failures.push(msg);
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
};

async function answer(p: Page, q: Question) {
  if (q.type === "single") await p.getByRole("radio", { name: new RegExp(escape(q.options.find((o) => o.id === q.answer)!.text)) }).click();
  if (q.type === "multi") for (const id of q.answer) await p.getByRole("checkbox", { name: new RegExp(escape(q.options.find((o) => o.id === id)!.text)) }).click();
  if (q.type === "truefalse") await p.getByRole("radio", { name: q.answer ? "True" : "False", exact: true }).click();
  if (q.type === "numeric") await p.locator('input[type="number"]').fill(String(q.answer));
  if (q.type === "order") {
    for (let target = 0; target < q.items.length; target++) {
      const texts = await p.locator("ol li span.flex-1").allTextContents();
      let idx = texts.indexOf(q.items[target].text);
      while (idx > target) {
        await p.getByRole("button", { name: `Move "${q.items[target].text}" up` }).click();
        idx--;
      }
    }
  }
  if (q.type === "match") {
    for (const pair of q.pairs) {
      await p.getByRole("button", { name: pair.left, exact: true }).click();
      await p.getByRole("button", { name: pair.right, exact: true }).click();
    }
  }
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !m.text().includes("favicon") && errors.push(m.text()));

  // Registration
  const email = `e2e${Date.now()}@example.com`;
  await p.goto(`${BASE}/register`);
  await p.fill("input[name=displayName]", "E2E Student");
  await p.fill("input[name=email]", email);
  await p.fill("input[name=password]", "short");
  await p.click('button:has-text("Create free account")');
  await p.waitForTimeout(800);
  ok(await p.getByText("Use at least 10 characters").isVisible(), "registration validates weak passwords");
  await p.fill("input[name=password]", "hvacrocks123");
  await p.click('button:has-text("Create free account")');
  await p.waitForURL("**/dashboard**");
  ok(true, "registered and landed on dashboard");

  // Complete the first lesson through the UI
  const lesson = BASE_CURRICULUM.lessons[0];
  await p.goto(`${BASE}/learn/${lesson.id}`);
  await p.click('button:has-text("Start lesson")');
  for (const step of lesson.steps) {
    if (step.kind === "question") {
      await p.waitForSelector('button:has-text("Check answer")');
      await answer(p, step.question);
      await p.click('button:has-text("Check answer")');
      await p.waitForSelector("text=/Nice work!|Correct!|Exactly right.|You've got it./");
      await p.click('button:has-text("Continue"), button:has-text("Finish lesson")');
    } else {
      await p.click('button:has-text("Continue"), button:has-text("Finish lesson")');
    }
  }
  await p.waitForSelector("text=Lesson complete!");
  ok(await p.getByText("+49").isVisible().catch(() => false) || (await p.getByText(/^\+\d+$/).count()) > 0, "lesson completion awards XP");
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/lesson-complete.png` });

  // A wrong answer shows feedback and allows retry
  const l2 = BASE_CURRICULUM.lessons[1];
  await p.goto(`${BASE}/learn/${l2.id}`);
  await p.click('button:has-text("Start lesson")');
  while (!(await p.locator('button:has-text("Check answer")').isVisible())) await p.click('button:has-text("Continue")');
  const q2 = lessonQuestions(l2)[0];
  if (q2.type === "match") {
    // match intentionally wrong: pair everything to the last option
    for (const pair of q2.pairs) {
      await p.getByRole("button", { name: pair.left, exact: true }).click();
      await p.getByRole("button", { name: q2.pairs[(q2.pairs.indexOf(pair) + 1) % q2.pairs.length].right, exact: true }).click();
    }
    await p.click('button:has-text("Check answer")');
    const fb = await p.waitForSelector("text=/Not quite|Partly right/", { timeout: 10000 }).catch(() => null);
    ok(!!fb, "wrong answers show corrective feedback");
    ok(await p.getByRole("button", { name: "Try again" }).isVisible(), "wrong answers can be retried");
  }

  // Simulator: expert run through the UI
  await p.goto(`${BASE}/simulator/sim-bad-contactor`);
  await p.click('button:has-text("Arrive on site")');
  await p.waitForSelector("text=Walk the site");
  await p.getByRole("button", { name: "Outdoor condenser" }).click();
  await p.getByRole("button", { name: /Line voltage at outdoor disconnect/ }).click();
  await p.getByRole("button", { name: /Voltage across contactor coil/ }).click();
  await p.getByRole("button", { name: /Lock out & tag out/ }).click();
  await p.getByRole("button", { name: /Verify zero voltage/ }).click();
  await p.getByRole("button", { name: /Discharge capacitors/ }).click();
  await p.getByRole("button", { name: /Contactor coil resistance/ }).click();
  await p.waitForTimeout(300);
  ok(await p.getByText("OL (open coil)").isVisible(), "simulator returns readings from the hidden fault");
  await p.getByRole("button", { name: /Replace contactor/ }).first().click();
  await p.getByRole("button", { name: "Yes" }).click();
  await p.getByRole("button", { name: /Remove lock & restore power/ }).click();
  await p.getByRole("button", { name: /Compressor amps/ }).click();
  await p.getByRole("button", { name: /Close ticket/ }).click();
  await p.getByLabel("Failed contactor (coil or contacts)").check();
  await p.getByRole("button", { name: "Submit", exact: true }).click();
  await p.waitForSelector("text=How you were scored");
  ok(await p.getByText(/^A$/).first().isVisible(), "expert simulator run earns an A");
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/sim-debrief.png`, fullPage: true });

  // Games: every game page loads and starts
  for (const g of ["name-that-part", "build-the-system", "wire-it-right", "find-the-fault", "pressure-detective", "crossword", "match-the-component", "repair-shop", "installation-challenge", "electrical-detective", "speed-round", "mystery-call"]) {
    await p.goto(`${BASE}/games/${g}`);
    await p.click('button:has-text("Play")');
    const started = await p.waitForFunction(() => !Array.from(document.querySelectorAll("button")).some((b) => b.textContent?.trim() === "Play"), null, { timeout: 10000 }).then(() => true).catch(() => false);
    const failed = await p.locator(".border-bad-400\\/40").count();
    ok(started && !failed, `game ${g} starts`);
    if (SHOTS && ["wire-it-right", "build-the-system", "electrical-detective", "crossword"].includes(g)) await p.screenshot({ path: `${SHOTS}/game-${g}.png` });
  }
  // Play the mystery to the end
  await p.goto(`${BASE}/games/mystery-call`);
  await p.click('button:has-text("Play")');
  for (let k = 0; k < 8; k++) {
    const end = p.locator("button", { hasText: /—|Low airflow|loose|Venting/ });
    if (await end.count()) break;
    await p.locator(".grid.gap-2 > button").first().click();
    await p.waitForTimeout(300);
  }
  const endBtn = p.locator("button", { hasText: /Low airflow from a clogged filter|A loose, overheating connection|Venting failure/ });
  if (await endBtn.count()) {
    await endBtn.first().click();
    await p.waitForSelector("text=Play again");
    ok(true, "mystery call can be completed and scored");
  } else ok(false, "mystery call reaches an ending");

  // Every app page renders
  for (const path of ["/dashboard", "/learn", "/simulator", "/games", "/review", "/exams", "/exams/level:l1", "/exams/cert:epa-core", "/achievements", "/leaderboard", "/glossary", "/profile", "/pricing", "/safety"]) {
    const r = await p.goto(`${BASE}${path}`);
    ok(r?.status() === 200, `GET ${path} → ${r?.status()}`);
  }
  // Students can't reach admin
  await p.goto(`${BASE}/admin`);
  ok(p.url().endsWith("/dashboard"), "students are redirected away from /admin");
  await p.goto(`${BASE}/admin/content/lesson/l1-what-is-hvac`);
  ok(p.url().endsWith("/dashboard"), "students can't open the content editor");

  // Exam: start and submit
  await p.goto(`${BASE}/exams/cert:epa-type1`);
  await p.click('button:has-text("Start timed exam")');
  await p.waitForSelector("text=Question 1 of");
  for (let k = 0; k < 9; k++) await p.click('button:has-text("Next")');
  await p.click('button:has-text("Submit exam")');
  await p.waitForSelector("text=/correct ·/");
  ok(true, "exam can be taken and graded");

  // Mobile layout
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, storageState: await ctx.storageState() });
  const mp = await m.newPage();
  for (const path of ["/dashboard", "/learn", "/simulator/sim-dirty-filter", "/games/wire-it-right"]) {
    await mp.goto(`${BASE}${path}`);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 1, `mobile ${path} has no horizontal scroll (${overflow}px)`);
    if (SHOTS) await mp.screenshot({ path: `${SHOTS}/mobile-${path.replace(/\W+/g, "_")}.png` });
  }

  // Admin
  const a = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ap = await a.newPage();
  await ap.goto(`${BASE}/register`);
  await ap.fill("input[name=displayName]", "Admin Person");
  await ap.fill("input[name=email]", process.env.ADMIN_EMAIL ?? "admin@example.com");
  await ap.fill("input[name=password]", "adminpass123");
  await ap.click('button:has-text("Create free account")');
  await ap.waitForURL("**/dashboard**").catch(async () => {
    await ap.goto(`${BASE}/login`);
    await ap.fill("input[name=email]", process.env.ADMIN_EMAIL ?? "admin@example.com");
    await ap.fill("input[name=password]", "adminpass123");
    await ap.click('button:has-text("Sign in")');
    await ap.waitForURL("**/dashboard**");
  });
  await ap.goto(`${BASE}/admin`);
  ok(await ap.getByText("Admin console").isVisible(), "admin can open the admin console");
  await ap.goto(`${BASE}/admin/content/lesson/l1-what-is-hvac`);
  const json = await ap.locator("textarea").inputValue();
  await ap.locator("textarea").fill(json.replace('"title": "What HVAC Really Does"', '"title": "What HVAC Really Does (edited)"'));
  await ap.click('button:has-text("Validate & save")');
  await ap.waitForSelector("text=Published lesson");
  ok(true, "admin can edit and publish a lesson");
  await ap.locator("textarea").fill('{"id": "broken"}');
  await ap.click('button:has-text("Validate & save")');
  await ap.waitForSelector("text=Validation failed");
  ok(true, "invalid content is rejected with validation errors");
  await p.goto(`${BASE}/learn/l1-what-is-hvac`);
  ok(await p.getByText("What HVAC Really Does (edited)").isVisible(), "published edits reach learners");
  ap.on("dialog", (d) => d.accept());
  await ap.goto(`${BASE}/admin/content/lesson/l1-what-is-hvac`);
  await ap.click('button:has-text("Revert to bundled version")');
  await ap.waitForTimeout(800);
  await ap.goto(`${BASE}/admin/users?q=e2e`);
  ok(await ap.getByText(email).isVisible(), "admin can search users");
  if (SHOTS) await ap.screenshot({ path: `${SHOTS}/admin-users.png` });

  ok(errors.length === 0, `no browser errors (${errors.slice(0, 3).join(" | ")})`);
  await browser.close();
  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\nAll e2e checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
