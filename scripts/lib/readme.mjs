import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const ACTIVITY_START = "<!-- AUTO:ACTIVITY:START -->";
export const ACTIVITY_END = "<!-- AUTO:ACTIVITY:END -->";

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function badgeSegment(value) {
  return encodeURIComponent(String(value).replaceAll("-", "--").replaceAll("_", "__").replaceAll(" ", "_"));
}

// Bespoke social badges, drawn from the profile palette instead of shields.io so
// the header reads as one piece. Widths are pinned by scripts/build-badges.mjs in
// the profile repo; anything not listed here falls back to shields.io.
const socialBadges = {
  GitHub: { id: "github", width: 180 },
  Instagram: { id: "instagram", width: 210 },
  Email: { id: "email", width: 264 }
};

function renderLinks(links) {
  return links.map((link) => {
    const badge = socialBadges[link.label];
    if (!badge) {
      const logo = link.logo ? `&logo=${encodeURIComponent(link.logo)}&logoColor=white` : "";
      const image = `https://img.shields.io/badge/${badgeSegment(link.label)}-${badgeSegment(link.value)}-${link.color}?style=for-the-badge${logo}`;
      return `  <a href="${link.url}"><img alt="${link.label}" src="${image}"></a>`;
    }
    const dark = `./assets/ambient/badge-${badge.id}-dark.svg`;
    const light = `./assets/ambient/badge-${badge.id}-light.svg`;
    return [
      `  <a href="${link.url}">`,
      "    <picture>",
      `      <source media="(prefers-color-scheme: dark)" srcset="${dark}">`,
      `      <source media="(prefers-color-scheme: light)" srcset="${light}">`,
      `      <img alt="${link.label} ${link.value}" src="${dark}" width="${badge.width}" height="40">`,
      "    </picture>",
      "  </a>"
    ].join("\n");
  }).join("\n");
}

function renderFocus(focus) {
  return [
    "| Area | What I am exploring |",
    "| --- | --- |",
    ...focus.map((item) => `| **${escapeCell(item.name)}** | ${escapeCell(item.description)} |`)
  ].join("\n");
}

function renderProjects(projects) {
  return [
    "| Project | Focus | Why it matters |",
    "| --- | --- | --- |",
    ...projects.map((project) => {
      const homepage = project.homepage ? ` [Live](${project.homepage})` : "";
      return `| [**${escapeCell(project.name)}**](${project.url}) | ${escapeCell(project.focus)} | ${escapeCell(project.summary)}${homepage} |`;
    })
  ].join("\n");
}

function renderGallery(gallery) {
  const cells = gallery.map((item) => {
    const image = `<img src="${item.image}" alt="${escapeCell(item.name)}" width="100%">`;
    const linked = item.url
      ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${image}</a>`
      : image;
    const label = item.url
      ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer"><b>${escapeCell(item.name)}</b></a>`
      : `<b>${escapeCell(item.name)}</b>`;

    return [
      '<td width="50%" valign="top">',
      `  ${linked}`,
      "  <br>",
      `  <sub>${label} &mdash; ${escapeCell(item.focus)}</sub>`,
      "</td>"
    ].join("\n");
  });

  const rows = [];
  for (let index = 0; index < cells.length; index += 2) {
    const pair = cells.slice(index, index + 2);
    if (pair.length === 1) pair.push('<td width="50%"></td>');
    rows.push(`<tr>\n${pair.join("\n")}\n</tr>`);
  }

  return ["<table>", ...rows, "</table>"].join("\n");
}

function renderCapabilities(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

// The infrastructure list gets a network-topology banner plus a boxed panel with
// a gradient rail. GitHub's markdown sanitiser keeps <table>, <ul> and the
// presentational width/valign attributes, but drops the CSS that would be needed
// to put real text over a real background, so the banner sits above the panel.
function renderInfrastructurePanel(items) {
  const list = items.map((item) => `<li>${item}</li>`).join("\n");
  return [
    '<img alt="Network topology: server rack, switch, router, firewall, and upstream link" src="./assets/ambient/infra-band.svg" width="100%">',
    "",
    "<table>",
    "<tr>",
    '<td width="6" valign="top"><img alt="" src="./assets/ambient/infra-rail.svg" width="6" height="200"></td>',
    "<td valign=\"top\">",
    "<ul>",
    list,
    "</ul>",
    "</td>",
    "</tr>",
    "</table>"
  ].join("\n");
}

const skillIconGroups = {
  "Languages": "cpp,java,js,ts,php,html,css",
  "Frontend": "react,tailwind,vite,html,css",
  "Backend": "nodejs,express,laravel,php",
  "Database": "mysql,mongodb,postgresql",
  "Infrastructure": "linux,docker,nginx,git,github"
};

function renderTechStack() {
  return Object.entries(skillIconGroups).map(([label, icons]) => [
    `### ${label}`,
    "",
    `<img src="https://skillicons.dev/icons?i=${icons}" alt="${label}">`,
    ""
  ].join("\n")).join("\n");
}

function renderStats(username) {
  return [
    '<p align="center">',
    `  <img height="165" src="https://github-stats-extended.vercel.app/api?username=${username}&show_icons=true&hide_border=true&theme=transparent" alt="GitHub stats">`,
    `  <img height="165" src="https://github-stats-extended.vercel.app/api/top-langs/?username=${username}&layout=compact&hide_border=true&theme=transparent" alt="Top languages">`,
    "</p>"
  ].join("\n");
}

function renderSnake() {
  return [
    renderDivider(),
    "",
    "## Contribution Snake",
    "",
    '<p align="center">',
    "  <picture>",
    '    <source media="(prefers-color-scheme: dark)" srcset="./assets/snake/snake-dark.svg">',
    '    <source media="(prefers-color-scheme: light)" srcset="./assets/snake/snake-light.svg">',
    '    <img alt="Snake game eating my GitHub contribution graph" src="./assets/snake/snake-light.svg" width="100%">',
    "  </picture>",
    "</p>"
  ].join("\n");
}

function renderTyping() {
  return [
    '<p align="center">',
    '  <img alt="Full Stack Web Developer - React, Tailwind, Node.js, Laravel - based in Medan, Indonesia" src="./assets/ambient/typing.svg" width="560">',
    "</p>",
    "",
    '<p align="center">',
    '  <img alt="Open to collaboration" src="./assets/ambient/status-pill.svg" width="212">',
    "</p>"
  ].join("\n");
}

function renderDivider() {
  return [
    '<p align="center">',
    '  <img alt="" src="./assets/ambient/divider.svg" width="100%">',
    "</p>"
  ].join("\n");
}

function extractActivity(readme) {
  const startIndex = readme.indexOf(ACTIVITY_START);
  const endIndex = readme.indexOf(ACTIVITY_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null;
  return readme.slice(startIndex + ACTIVITY_START.length, endIndex).trim();
}

async function readExistingActivity(readmePath) {
  try {
    const existing = await readFile(readmePath, "utf8");
    return extractActivity(existing);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function generateProfileReadme({ config, manifest, readmePath }) {
  const existingActivity = await readExistingActivity(readmePath);
  const activity = existingActivity || "_Recent public activity will appear here after the workflow runs._";
  const activitySection = config.activity.enabled
    ? `\n## Recent Activity\n\n${ACTIVITY_START}\n${activity}\n${ACTIVITY_END}\n`
    : "";
  const techStack = config.techStack.map((item) => `\`${item}\``).join(" · ");
  const about = config.profile.about.join("\n\n");

  const readme = `<!-- Generated by GitHub Profile Agent Console. Edit profile.config.json, then run npm run generate. -->
<p align="center">
  <picture>
    <source media="(max-width: 760px) and (prefers-color-scheme: dark)" srcset="./assets/hero/${manifest.assets.mobileDark}">
    <source media="(max-width: 760px)" srcset="./assets/hero/${manifest.assets.mobileLight}">
    <source media="(prefers-color-scheme: dark)" srcset="./assets/hero/${manifest.assets.desktopDark}">
    <source media="(prefers-color-scheme: light)" srcset="./assets/hero/${manifest.assets.desktopLight}">
    <img src="./assets/hero/${manifest.assets.desktopDark}" alt="${config.profile.name} - ${config.profile.headline}" width="100%">
  </picture>
</p>

<p align="center">
${renderLinks(config.links)}
</p>

${renderTyping()}

## About Me

${about}

${renderDivider()}

## Current Focus

${renderFocus(config.focus)}

${renderDivider()}

## Featured Work

${renderProjects(config.projects)}

${renderDivider()}

## Project Gallery

${renderGallery(config.gallery)}

${renderDivider()}

## How I Build

${config.research.narrative}

### What I Work With

${renderCapabilities(config.capabilities)}

### Infrastructure and Network

Supporting skills for the servers and networks these applications run on:

${renderInfrastructurePanel(config.infrastructure)}

${renderDivider()}

## Tech Stack

${techStack}

${renderTechStack()}
${activitySection}
---

${renderStats(config.profile.username)}

---

${renderSnake()}

---

<p align="center">
  ${config.footer}
</p>
`;

  await writeFile(resolve(readmePath), readme);
  return readme;
}
