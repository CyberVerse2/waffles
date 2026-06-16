// Validator for the Waffles v2 trivia question bank.
//
// Run with:  node scripts/validate-questions.ts
// (Node >= 23.6 strips TypeScript types natively; on older 22.x use
//  `node --experimental-strip-types scripts/validate-questions.ts`.)
//
// Exits non-zero if any hard error is found. Warnings (e.g. difficulty mix
// drift) are reported but do not fail the run.

import {
  QUESTION_BANK,
  CATEGORIES,
  type BankQuestion,
  type Difficulty,
} from "../src/app/data/questions.ts";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const errors: string[] = [];
const warnings: string[] = [];

const seenIds = new Set<string>();
const seenQuestions = new Map<string, string>(); // normalized -> first id

/** Normalize question text for duplicate detection. */
function normalize(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

for (const [i, q] of (QUESTION_BANK as BankQuestion[]).entries()) {
  const where = `#${i} (${q?.id ?? "no-id"})`;

  // id
  if (typeof q.id !== "string" || q.id.trim() === "") {
    errors.push(`${where}: missing/empty id`);
  } else if (seenIds.has(q.id)) {
    errors.push(`${where}: duplicate id "${q.id}"`);
  } else {
    seenIds.add(q.id);
  }

  // category
  if (!CATEGORIES.includes(q.category)) {
    errors.push(`${where}: invalid category "${q.category}"`);
  }

  // difficulty
  if (!DIFFICULTIES.includes(q.difficulty)) {
    errors.push(`${where}: invalid difficulty "${q.difficulty}"`);
  }

  // question text
  if (typeof q.question !== "string" || q.question.trim().length < 8) {
    errors.push(`${where}: question text missing or too short`);
  } else {
    const norm = normalize(q.question);
    const prev = seenQuestions.get(norm);
    if (prev) {
      errors.push(`${where}: duplicate question text (matches ${prev})`);
    } else {
      seenQuestions.set(norm, q.id);
    }
  }

  // answers
  if (!Array.isArray(q.answers) || q.answers.length !== 4) {
    errors.push(`${where}: must have exactly 4 answers (has ${q.answers?.length ?? 0})`);
  } else {
    if (q.answers.some((a) => typeof a !== "string" || a.trim() === "")) {
      errors.push(`${where}: contains empty answer`);
    }
    const lower = q.answers.map((a) => a.toLowerCase().trim());
    if (new Set(lower).size !== lower.length) {
      errors.push(`${where}: duplicate answer choices`);
    }
  }

  // correctIndex
  if (typeof q.correctIndex !== "number" || ![0, 1, 2, 3].includes(q.correctIndex)) {
    errors.push(`${where}: correctIndex must be 0..3 (got ${q.correctIndex})`);
  }

  // sourceUrl
  if (typeof q.sourceUrl !== "string" || !/^https?:\/\/.+/.test(q.sourceUrl)) {
    errors.push(`${where}: sourceUrl must be an http(s) URL`);
  }
}

// ── Distribution report ──────────────────────────────────────────
type Counts = Record<Difficulty, number>;
const byCategory = new Map<string, Counts>();
for (const cat of CATEGORIES) byCategory.set(cat, { easy: 0, medium: 0, hard: 0 });
for (const q of QUESTION_BANK) {
  const c = byCategory.get(q.category);
  if (c && DIFFICULTIES.includes(q.difficulty)) c[q.difficulty]++;
}

console.log(`\nWaffles v2 — question bank validation`);
console.log(`Total questions: ${QUESTION_BANK.length}`);
console.log(`Categories: ${CATEGORIES.length}\n`);

console.log(
  `${"Category".padEnd(14)} ${"easy".padStart(5)} ${"med".padStart(5)} ${"hard".padStart(5)} ${"total".padStart(6)}  mix(e/m/h)`,
);
let totEasy = 0,
  totMed = 0,
  totHard = 0;
for (const cat of CATEGORIES) {
  const c = byCategory.get(cat)!;
  const total = c.easy + c.medium + c.hard;
  totEasy += c.easy;
  totMed += c.medium;
  totHard += c.hard;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const mix = `${pct(c.easy)}/${pct(c.medium)}/${pct(c.hard)}`;
  console.log(
    `${cat.padEnd(14)} ${String(c.easy).padStart(5)} ${String(c.medium).padStart(5)} ${String(c.hard).padStart(5)} ${String(total).padStart(6)}  ${mix}`,
  );
  // Difficulty mix target: 40/40/20. Warn if a populated category drifts hard.
  if (total >= 10) {
    if (Math.abs(pct(c.easy) - 40) > 15) warnings.push(`${cat}: easy mix ${pct(c.easy)}% (target ~40%)`);
    if (Math.abs(pct(c.hard) - 20) > 12) warnings.push(`${cat}: hard mix ${pct(c.hard)}% (target ~20%)`);
  }
}
const grand = totEasy + totMed + totHard;
const gp = (n: number) => (grand ? Math.round((n / grand) * 100) : 0);
console.log(
  `${"TOTAL".padEnd(14)} ${String(totEasy).padStart(5)} ${String(totMed).padStart(5)} ${String(totHard).padStart(5)} ${String(grand).padStart(6)}  ${gp(totEasy)}/${gp(totMed)}/${gp(totHard)}`,
);

// ── Result ───────────────────────────────────────────────────────
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`\n✓ All ${QUESTION_BANK.length} questions valid. No duplicates. No schema errors.`);
