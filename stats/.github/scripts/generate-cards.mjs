import { mkdirSync, writeFileSync } from "node:fs";

const user = process.env.GH_USERNAME;
const token = process.env.GITHUB_TOKEN;

if (!user) {
  console.error("GH_USERNAME não definido.");
  process.exit(1);
}

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "profile-stats-cards",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} em ${path}: ${await res.text()}`);
  }
  return res.json();
}

async function searchCount(path) {
  try {
    const data = await api(path);
    return data.total_count ?? 0;
  } catch (err) {
    console.warn("Aviso:", err.message);
    return 0;
  }
}

const LANG_COLORS = {
  Java: "#b07219",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Python: "#3572A5",
  "C#": "#178600",
  C: "#555555",
  "C++": "#f34b7d",
  PHP: "#4F5D95",
  Shell: "#89e051",
  Kotlin: "#A97BFF",
  Go: "#00ADD8",
  Rust: "#dea584",
  Dart: "#00B4AB",
  Vue: "#41b883",
  Dockerfile: "#384d54",
};

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ---------- Coleta de dados ----------
const profile = await api(`/users/${user}`);

const repos = [];
for (let page = 1; page <= 5; page++) {
  const batch = await api(
    `/users/${user}/repos?per_page=100&type=owner&page=${page}`,
  );
  repos.push(...batch);
  if (batch.length < 100) break;
}
const ownRepos = repos.filter((r) => !r.fork);

const stars = ownRepos.reduce((sum, r) => sum + r.stargazers_count, 0);

const langBytes = {};
for (const repo of ownRepos) {
  try {
    const langs = await api(`/repos/${user}/${repo.name}/languages`);
    for (const [lang, bytes] of Object.entries(langs)) {
      langBytes[lang] = (langBytes[lang] ?? 0) + bytes;
    }
  } catch (err) {
    console.warn(`Aviso: linguagens de ${repo.name} indisponíveis.`);
  }
}

const commits = await searchCount(`/search/commits?q=author:${user}&per_page=1`);
const prs = await searchCount(`/search/issues?q=author:${user}+type:pr&per_page=1`);
const issues = await searchCount(`/search/issues?q=author:${user}+type:issue&per_page=1`);

// ---------- Card: Stats ----------
function statsCard(name, rows) {
  const body = rows
    .map(
      ([label, value], i) => `
  <text x="25" y="${62 + i * 21}" class="label">${esc(label)}</text>
  <text x="200" y="${62 + i * 21}" class="value">${esc(value)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="170" viewBox="0 0 330 170" role="img" aria-label="GitHub Stats">
  <style>
    .title { font: 600 16px 'Segoe UI', Ubuntu, Arial, sans-serif; fill: #ffffff; }
    .label { font: 400 13px 'Segoe UI', Ubuntu, Arial, sans-serif; fill: #76a6dd; }
    .value { font: 600 13px 'Segoe UI', Ubuntu, Arial, sans-serif; fill: #ffffff; }
  </style>
  <rect width="330" height="170" rx="6" fill="#0d1117"/>
  <text x="25" y="32" class="title">${esc(name)}'s GitHub Stats</text>${body}
</svg>`;
}

// ---------- Card: Linguagens ----------
function langsCard(entries) {
  const barX = 25;
  const barW = 280;
  const total = entries.reduce((s, e) => s + e.bytes, 0);

  let segments = "";
  let legend = "";

  if (total === 0) {
    legend = `<text x="25" y="90" class="label">Sem dados de linguagens.</text>`;
  } else {
    let x = barX;
    entries.forEach((e, i) => {
      const pct = (e.bytes / total) * 100;
      const w = (pct / 100) * barW;
      const color = LANG_COLORS[e.name] ?? "#8b949e";
      segments += `<rect x="${x.toFixed(2)}" y="48" width="${w.toFixed(2)}" height="8" fill="${color}"/>`;
      x += w;

      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = 25 + col * 145;
      const ly = 88 + row * 24;
      legend += `
  <circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${color}"/>
  <text x="${lx + 16}" y="${ly}" class="label">${esc(e.name)} ${pct.toFixed(2)}%</text>`;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="170" viewBox="0 0 330 170" role="img" aria-label="Most Used Languages">
  <style>
    .title { font: 600 16px 'Segoe UI', Ubuntu, Arial, sans-serif; fill: #ffffff; }
    .label { font: 400 12px 'Segoe UI', Ubuntu, Arial, sans-serif; fill: #76a6dd; }
  </style>
  <defs>
    <clipPath id="bar"><rect x="${barX}" y="48" width="${barW}" height="8" rx="4"/></clipPath>
  </defs>
  <rect width="330" height="170" rx="6" fill="#0d1117"/>
  <text x="25" y="32" class="title">Most Used Languages</text>
  <g clip-path="url(#bar)">${segments}</g>${legend}
</svg>`;
}

// ---------- Geração ----------
const topLangs = Object.entries(langBytes)
  .map(([name, bytes]) => ({ name, bytes }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 6);

mkdirSync("stats", { recursive: true });

writeFileSync(
  "stats/stats.svg",
  statsCard(profile.name || user, [
    ["Total Stars:", stars],
    ["Total Commits:", commits],
    ["Total PRs:", prs],
    ["Total Issues:", issues],
    ["Public Repos:", profile.public_repos],
  ]),
);

writeFileSync("stats/top-langs.svg", langsCard(topLangs));

console.log("Cards gerados em ./stats");
console.log({ stars, commits, prs, issues, repos: profile.public_repos, langs: topLangs });
