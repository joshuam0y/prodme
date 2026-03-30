#!/usr/bin/env node
/**
 * Pushes NEXT_PUBLIC_SUPABASE_* from .env.local to Vercel (production + preview).
 * Prereqs: `npx vercel login` and `npx vercel link --project <name> --yes` in this repo.
 */
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

let raw;
try {
  raw = readFileSync(join(root, ".env.local"), "utf8");
} catch {
  console.error("Missing .env.local — copy from .env.example and fill values.");
  process.exit(1);
}

function get(key) {
  const line = raw.split("\n").find((l) => l.startsWith(`${key}=`) && !l.startsWith("#"));
  if (!line) throw new Error(`Missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim();
}

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const targets = ["production", "preview"];

function vercelEnvAdd(name, value, environment) {
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", name, environment, "--yes", "--force", "--value", value],
    { stdio: "inherit", cwd: root, shell: false },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const env of targets) {
  console.log(`\n→ ${env}`);
  vercelEnvAdd("NEXT_PUBLIC_SUPABASE_URL", url, env);
  vercelEnvAdd("NEXT_PUBLIC_SUPABASE_ANON_KEY", anon, env);
}

console.log("\nDone. Redeploy on Vercel (or push a commit) so the new env applies.");
