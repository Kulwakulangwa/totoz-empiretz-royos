import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");

const blockedPatterns = [
  /\bdrop\s+table\b/i,
  /\bdrop\s+schema\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+table\b[\s\S]*?\bdrop\s+column\b/i,
];

const reviewPatterns = [
  /\balter\s+table\b[\s\S]*?\bdrop\s+constraint\b/i,
  /\bdrop\s+policy\b/i,
  /\bdrop\s+trigger\b/i,
  /\bdrop\s+function\b/i,
];

const sqlFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const findings = [];

for (const file of sqlFiles) {
  const body = readFileSync(join(migrationsDir, file), "utf8");
  for (const pattern of blockedPatterns) {
    if (pattern.test(body)) {
      findings.push({ file, level: "blocked", pattern: pattern.source });
    }
  }
  for (const pattern of reviewPatterns) {
    if (pattern.test(body)) {
      findings.push({ file, level: "review", pattern: pattern.source });
    }
  }
}

const blocked = findings.filter((finding) => finding.level === "blocked");
const review = findings.filter((finding) => finding.level === "review");

if (findings.length) {
  console.log("Migration safety scan findings:");
  for (const finding of findings) {
    console.log(`- ${finding.level.toUpperCase()} ${finding.file}: ${finding.pattern}`);
  }
}

if (blocked.length) {
  console.error(
    "\nBlocked destructive migration pattern found. Review against a production backup before applying.",
  );
  process.exit(1);
}

if (review.length) {
  console.log("\nReview-only findings exist, but no blocked destructive data pattern was found.");
} else {
  console.log("No destructive migration patterns found.");
}
