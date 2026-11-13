import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.env.GRS_DIR);
const username = process.env.GH_USERNAME;
const load = (p) => import(pathToFileURL(path.join(dir, p)).href);

const { fetchStats } = await load("src/fetchers/stats-fetcher.js");
const { renderStatsCard } = await load("src/cards/stats-card.js");
const { fetchTopLanguages } = await load("src/fetchers/top-languages-fetcher.js");
const { renderTopLanguages } = await load("src/cards/top-languages-card.js");

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
