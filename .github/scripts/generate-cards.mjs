import { pathToFileURL } from "node:url";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.env.GRS_DIR);
const username = process.env.GH_USERNAME;

async function loadFirst(label, candidates) {
  for (const p of candidates) {
    const full = path.join(dir, p);
    if (existsSync(full)) {
      console.log(`[${label}] usando ${p}`);
      return import(pathToFileURL(full).href);
    }
  }
  console.error(`[${label}] nenhum arquivo encontrado entre:`, candidates);
  console.error("Conteúdo de src/:");
  console.error(readdirSync(path.join(dir, "src"), { recursive: true }).join("\n"));
  process.exit(1);
}

function pick(mod, name, label) {
  const fn = mod[name];
  if (typeof fn !== "function") {
    console.error(`[${label}] export "${name}" não encontrado. Exports disponíveis:`, Object.keys(mod));
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
  "src/fetchers/top-langs.js",
]);
const langsCard = await loadFirst("langs-card", [
  "src/cards/top-languages-card.js",
  "src/cards/top-languages.js",
  "src/cards/top-langs.js",
]);

const fetchStats = pick(statsFetcher, "fetchStats", "stats-fetcher");
const renderStatsCard = pick(statsCard, "renderStatsCard", "stats-card");
const fetchTopLanguages = pick(langsFetcher, "fetchTopLanguages", "langs-fetcher");
const renderTopLanguages = pick(langsCard, "renderTopLanguages", "langs-card");

const theme = {
  hide_border: true,
  title_color: "FFFFFF",
  icon_color: "FFFFFF",
  text_color: "76A6DD",
  bg_color: "0d1117",
};

mkdirSync("stats", { recursive: true });

const stats = await fetchStats(username, true, false, []);
writeFileSync(
  "stats/stats.svg",
  renderStatsCard(stats, { ...theme, show_icons: true }),
);

const langs = await fetchTopLanguages(username, []);
writeFileSync(
  "stats/top-langs.svg",
  renderTopLanguages(langs, { ...theme, layout: "compact" }),
);

console.log("Cards gerados em ./stats");
