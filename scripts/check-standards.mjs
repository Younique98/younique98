#!/usr/bin/env node
/**
 * Engineering standards check. No dependencies, no test runner, runs in
 * milliseconds, works in every Node repository regardless of what else it uses.
 *
 * It exists because a stated standard tends to get applied to one repository
 * and remembered as applied everywhere. Prose cannot enforce an
 * organization-wide rule. This can.
 *
 * Organization details (contact email, GitHub owner, public repositories)
 * come from standards.config.json, so the same script works for any team.
 *
 * Run: node scripts/check-standards.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const CONFIG_FILE = join(ROOT, "standards.config.json");
const config = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, "utf8")) : {};
const PLACEHOLDER_EMAIL = /@example\.(com|org)$/i;
const PLACEHOLDER_OWNER = "your-github-org";
const BUSINESS_EMAIL = config.contactEmail ?? "the contact address in standards.config.json";
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Personal inboxes that must never reach a visitor. A personal address on a
// product site is a weaker trust signal to a buyer, and on the privacy and
// terms pages it is the address people are told to use for legal requests.
const PERSONAL_EMAIL =
  /[A-Za-z0-9._%+-]+@(gmail|yahoo|hotmail|outlook|icloud|aol|protonmail|proton)\.[A-Za-z.]+/i;

// A link to the organization's GitHub *profile* is fine. A link to one of its
// *repositories* is not, unless the repository is listed as public: a private
// repository is a dead end at the exact moment someone is evaluating the work.
const OWNER = config.githubOwner && config.githubOwner !== PLACEHOLDER_OWNER ? config.githubOwner : null;
const PRIVATE_REPO_LINK = OWNER
  // Matches web links (github.com/owner/repo) and SSH clone URLs
  // (git@github.com:owner/repo); the repository name is captured.
  ? new RegExp(`github\\.com[/:]${escapeRegExp(OWNER)}\\/([A-Za-z0-9._-]+)`, "i")
  : null;

// Repositories that are deliberately public. Links to these are allowed.
const PUBLIC_REPOS = new Set((config.publicRepos ?? []).map((name) => name.toLowerCase()));

const SEARCHED = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".md", ".mdx", ".html", ".css", ".yml", ".yaml", ".txt",
]);
const SKIPPED = new Set([
  ".git", "node_modules", ".next", "dist", "build", "out", "coverage",
  ".turbo", ".vercel", "test-results", "playwright-output", "playwright-report",
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIPPED.has(entry)) continue;
    const full = join(dir, entry);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) yield* walk(full);
    else if (SEARCHED.has(extname(entry))) yield full;
  }
}

const failures = [];
const rel = (p) => p.slice(ROOT.length + 1);

// 0. Organization details are filled in.
//
// The template ships with placeholders. A project made from it must replace
// them, or security reports go to an address nobody reads.
if (!existsSync(CONFIG_FILE)) {
  failures.push("standards.config.json is missing. Copy it from the engineering standards template.");
} else if (config.template !== true) {
  if (!config.contactEmail || PLACEHOLDER_EMAIL.test(config.contactEmail)) {
    failures.push("standards.config.json: set contactEmail to the organization's real security contact.");
  }
  if (!OWNER) {
    failures.push("standards.config.json: set githubOwner to the organization's GitHub account.");
  }
  // Security reports must reach the configured contact: every address in
  // the reporting files has to be it.
  for (const file of ["SECURITY.md", join(".github", "ISSUE_TEMPLATE", "config.yml")]) {
    const full = join(ROOT, file);
    if (!existsSync(full)) continue;
    const addresses = readFileSync(full, "utf8").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
    if (!addresses.length) {
      failures.push(`${file}: name the security contact ${BUSINESS_EMAIL}.`);
    }
    for (const address of new Set(addresses)) {
      if (address.toLowerCase() !== String(config.contactEmail).toLowerCase()) {
        failures.push(`${file}: "${address}" is not the configured security contact ${BUSINESS_EMAIL}.`);
      }
    }
  }
} else {
  // Only the template repository itself may keep the placeholders. In CI,
  // GitHub names the repository, so a project created from the template
  // fails until it sets template to false, whatever language it uses.
  const repository = (process.env.GITHUB_REPOSITORY ?? "").split("/")[1];
  const templateName = config.templateRepositoryName;
  if (repository && templateName && repository !== templateName) {
    failures.push(
      `standards.config.json says this is the template (${templateName}), but this repository is ${repository}. ` +
        "Set template to false and fill in contactEmail and githubOwner."
    );
  } else if (!repository && existsSync(join(ROOT, "package.json"))) {
    failures.push(
      "standards.config.json says this is the template, but the repository has a package.json. " +
        "Set template to false and fill in contactEmail and githubOwner."
    );
  }
}

// 1 + 2. Contact details.
for (const file of walk(ROOT)) {
  // The checker itself names the patterns it looks for.
  if (rel(file) === join("scripts", "check-standards.mjs")) continue;
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  const personal = text.match(PERSONAL_EMAIL);
  if (personal) {
    failures.push(
      `${rel(file)}: personal email "${personal[0]}". Use ${BUSINESS_EMAIL}.`
    );
  }
  if (!PRIVATE_REPO_LINK) continue;
  const repoLink = [...text.matchAll(new RegExp(PRIVATE_REPO_LINK, "gi"))]
    .find((m) => !PUBLIC_REPOS.has(m[1].replace(/\.git$/i, "").toLowerCase()))?.[0];
  if (repoLink) {
    failures.push(
      `${rel(file)}: links to a private repository "${repoLink}". ` +
        `A bare profile link (github.com/${OWNER}) is fine.`
    );
  }
}

// 3. Duplicate route trees.
//
// Next.js uses `app/` and IGNORES `src/app/` when both exist (same for pages).
// A repo with both will happily serve one copy while every search, and every
// well-meaning edit, lands on the other, so a fix can sit for weeks in a file
// that is never served.
for (const [a, b] of [["app", join("src", "app")], ["pages", join("src", "pages")]]) {
  if (existsSync(join(ROOT, a)) && existsSync(join(ROOT, b))) {
    failures.push(
      `Duplicate route trees: "${a}/" and "${b}/" both exist. Next.js serves ` +
        `"${a}/" and ignores "${b}/". Delete the ignored one.`
    );
  }
}

// 4. Error tracking in every Next.js product.
//
// "Error tracking from the first deploy" (STANDARDS.md, section 13) was a
// sentence for a long time, and no product had it. A Next.js project must
// carry the monitoring template: instrumentation.ts that starts Sentry with
// personal data off and every event scrubbed, and @sentry/nextjs installed.
const PACKAGE_FILE = join(ROOT, "package.json");
const pkg = existsSync(PACKAGE_FILE) ? JSON.parse(readFileSync(PACKAGE_FILE, "utf8")) : null;
if (pkg?.dependencies?.next) {
  const instrumentation = ["instrumentation.ts", join("src", "instrumentation.ts")]
    .map((file) => join(ROOT, file))
    .find((file) => existsSync(file));
  const template = "engineering-standards, templates/monitoring/";
  if (!pkg.dependencies["@sentry/nextjs"]) {
    failures.push(`package.json: add @sentry/nextjs to dependencies for error tracking (${template}).`);
  }
  if (!instrumentation) {
    failures.push(`No instrumentation.ts: copy it and sentry-scrub.ts from ${template}.`);
  } else {
    const text = readFileSync(instrumentation, "utf8");
    for (const [needle, why] of [
      ["@sentry/nextjs", "start Sentry"],
      ["sendDefaultPii: false", "keep personal data out of error reports"],
      ["beforeSend", "scrub every event with sentry-scrub.ts"],
      ["onRequestError", "report errors from pages, routes and server actions"],
    ]) {
      if (!text.includes(needle)) {
        failures.push(`${rel(instrumentation)}: missing "${needle}" (needed to ${why}). Copy it from ${template}.`);
      }
    }
  }
}

// 5. Applied migrations stay frozen.
//
// A migration file is frozen once any database has applied it (STANDARDS.md,
// section 11). An edited migration once reached only a fresh preview branch
// while every other database silently skipped it. A repository with a
// migrations directory must carry the freeze check and run it in CI. The
// directories match DEFAULT_DIRS in templates/ci/check-migrations-frozen.mjs.
const MIGRATION_DIRS = ["migrations", "supabase/migrations", "db/migrations", "prisma/migrations", "drizzle"];
const migrationDir = MIGRATION_DIRS.find((dir) => {
  const path = join(ROOT, dir);
  return existsSync(path) && statSync(path).isDirectory();
});
if (migrationDir) {
  const template = "engineering-standards, templates/ci/check-migrations-frozen.mjs";
  const FREEZE_CHECK = "check-migrations-frozen.mjs";
  if (!existsSync(join(ROOT, "scripts", FREEZE_CHECK))) {
    failures.push(`${migrationDir}/ exists but scripts/${FREEZE_CHECK} does not. Copy it from ${template}.`);
  }
  const WORKFLOWS = join(ROOT, ".github", "workflows");
  const runsCheck =
    existsSync(WORKFLOWS) &&
    readdirSync(WORKFLOWS)
      .filter((file) => /\.ya?ml$/.test(file))
      .some((file) => readFileSync(join(WORKFLOWS, file), "utf8").includes(`node scripts/${FREEZE_CHECK}`));
  if (!runsCheck) {
    failures.push(
      `${migrationDir}/ exists but no workflow in .github/workflows runs "node scripts/${FREEZE_CHECK}" on pull requests (${template}).`
    );
  }
}

// 6. Links resolve on a fresh database and in production (warning for now).
//
// A home page button linked to a demo page that existed only when a seeded
// demo account was in the database. The end-to-end tests used a seeded
// database, so they passed, and nothing checked the live site, where it
// answered 404 (STANDARDS.md, section 8). A Next.js product carries the link
// check from templates/testing/ (tests/links/links.spec.ts) and the workflow
// from templates/workflows/link-check.yml, which runs it on a fresh database
// and against production. This warns until LINK_CHECK_REQUIRED_FROM, then
// fails, so products that met the standards before it are not failed today.
const LINK_CHECK_REQUIRED_FROM = "2027-01-04";
const warnings = [];
if (pkg?.dependencies?.next && config.template !== true) {
  const linkProblems = [];
  const spec = ["tests", "e2e", join("e2e", "tests")]
    .map((dir) => join(ROOT, dir, "links", "links.spec.ts"))
    .find((file) => existsSync(file));
  if (!spec) {
    linkProblems.push("no tests/links/links.spec.ts: copy tests/links/ and tests/support/links.ts from engineering-standards, templates/testing/");
  }
  const WORKFLOWS = join(ROOT, ".github", "workflows");
  const workflows = existsSync(WORKFLOWS)
    ? readdirSync(WORKFLOWS)
        .filter((file) => /\.ya?ml$/.test(file))
        .map((file) => readFileSync(join(WORKFLOWS, file), "utf8"))
    : [];
  for (const [marker, what] of [
    ["LINK_CHECK_TARGET: fresh", "on a fresh database"],
    ["LINK_CHECK_TARGET: production", "against production on a schedule and after each deployment"],
  ]) {
    if (!workflows.some((text) => text.includes(marker))) {
      linkProblems.push(`no workflow runs the link check ${what} (${marker}): copy engineering-standards, templates/workflows/link-check.yml`);
    }
  }
  const required = new Date() >= new Date(`${LINK_CHECK_REQUIRED_FROM}T00:00:00Z`);
  for (const problem of linkProblems) {
    (required ? failures : warnings).push(`Link check: ${problem}.${required ? "" : ` Required from ${LINK_CHECK_REQUIRED_FROM}.`}`);
  }
}

// 7. Playwright never retries a failing test.
//
// A test that passes only on a second try is flaky, and a flaky test is a bug
// to fix, not to retry past (STANDARDS.md, section 8). The template config
// sets `retries: 0`, yet five products still had `retries: process.env.CI ?
// 1 : 0`, which turns every flaky failure in CI into a green run nobody looks
// at. This fails any Playwright config (a file that imports @playwright/test
// and calls defineConfig) whose `retries` is anything but the literal 0, a
// `.configure({ retries })` call in a spec, and `playwright test --retries`
// in package.json or a workflow. A resilience helper's own `retries` option
// in a spec is not a test retry and is left alone.
const PLAYWRIGHT_IMPORT = /^\s*import\b[^;]*?\bfrom\s*["'](?:@playwright\/test|playwright\/test)["']/m;
// Comments are dropped first, so a comment that mentions retries is not read
// as a setting. A `//` after a colon (a URL such as http://localhost) stays.
// Block comments keep their line breaks, so reported line numbers are right.
const stripComments = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1");
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
const NO_RETRIES = "Set retries: 0. A test that passes only on a second try is flaky, and a flaky test is a bug to fix, not to retry past (STANDARDS.md, section 8)";
for (const file of walk(ROOT)) {
  if (rel(file) === join("scripts", "check-standards.mjs")) continue;
  const ext = extname(file);
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    if (!PLAYWRIGHT_IMPORT.test(text)) continue;
    const code = stripComments(text);
    const settings = [];
    if (/\bdefineConfig\s*\(/.test(code)) {
      for (const m of code.matchAll(/\bretries\s*:\s*([^,}\n]+)/g)) settings.push(m);
    }
    for (const m of code.matchAll(/\.configure\s*\(\s*\{[^}]*?\bretries\s*:\s*([^,}\n]+)/g)) {
      if (!settings.some((s) => s.index <= m.index + m[0].length && s.index >= m.index)) settings.push(m);
    }
    for (const m of settings) {
      const value = m[1].trim();
      if (value !== "0") {
        failures.push(`${rel(file)}:${lineOf(code, m.index)}: Playwright retries is "${value}". ${NO_RETRIES}.`);
      }
    }
  } else if (ext === ".json" || ext === ".yml" || ext === ".yaml") {
    for (const m of text.matchAll(/playwright test\b[^\n"']*?--retries(?:=|\s+)(\S+?)(?=["'\s]|$)/gm)) {
      if (m[1] !== "0") {
        failures.push(`${rel(file)}:${lineOf(text, m.index)}: "playwright test --retries=${m[1]}". ${NO_RETRIES}.`);
      }
    }
  }
}

for (const w of warnings) {
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${w}` : `Warning: ${w}`);
}

if (failures.length) {
  console.error(`\nProject standards check failed (${failures.length}):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log("Project standards check passed.");
