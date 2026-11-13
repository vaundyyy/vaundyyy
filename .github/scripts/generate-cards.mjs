import { pathToFileURL } from "node:url";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.env.GRS_DIR);
const username = process.env.GH_USERNAME;

if (!process.env.PAT_1) {
  console.error("Token ausente. Crie o secret GH_STATS_TOKEN no repositório.");
  process.exit(1);
}

async function loadFirst(label, candidates) {
  for (const p of candidates) {
    const full = path.join(dir, p);
    if (existsSync(full)) {
      return import(pathToFileURL(full).href);
    }
  }
  console.error(`[${label}] nenhum arquivo encontrado entre:`, candidates);
  console.error(readdirSync(path.join(dir, "src"), { recursive: true }).join("\n"));
  process.exit(1);
}

function pick(mod, name, label) {
  const fn = mod[name];
  if (typeof fn !== "function") {
    console.error(`[${label}] export "${name}" não encontrado. Disponíveis:`, Object.keys(mod));
    process.exit(1);
  }
  return fn;
}

const statsFetcher = await loadFirst("stats-fetcher", [
  "src/fetchers/stats-fetcher.js",
  "src/fetchers/stats.js",
]);
const statsCard = await loadFirst("stats-card", [
  "src/cards/stats-card.js",
  "src/cards/stats.js",
]);
const langsFetcher = await loadFirst("langs-fetcher", [
  "src/fetchers/top-languages-fetcher.js",
  "src/fetchers/top-languages.js",
]);
const langsCard = await loadFirst("langs-card", [
  "src/cards/top-languages-card.js",
  "src/cards/top-languages.js",
]);

const fetchStats = pick(statsFetcher, "fetchStats", "stats-fetcher");
const renderStatsCard = pick(statsCard,
