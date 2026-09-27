import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const defaultConfigPath = resolve(repositoryRoot, "profile.config.json");

export function readFlag(name, args = process.argv.slice(2)) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function assert(condition, message) {
  if (!condition) throw new Error(`Invalid profile.config.json: ${message}`);
}

function assertText(value, label, maximum) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string.`);
  assert(value.length <= maximum, `${label} must be ${maximum} characters or fewer.`);
}

function assertUrl(value, label, { allowEmpty = false, protocols = ["http:", "https:"] } = {}) {
  if (allowEmpty && value === "") return;
  try {
    const url = new URL(value);
    assert(protocols.includes(url.protocol), `${label} must use ${protocols.join(" or ")}.`);
  } catch {
    throw new Error(`Invalid profile.config.json: ${label} must be a valid URL.`);
  }
}

export function validateConfig(config) {
  assert(config && typeof config === "object" && !Array.isArray(config), "the root must be an object.");
  assert(config.profile && typeof config.profile === "object", "profile is required.");
  assertText(config.profile.name, "profile.name", 40);
  assertText(config.profile.username, "profile.username", 39);
  assert(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(config.profile.username), "profile.username is not a valid GitHub username.");
  assertText(config.profile.headline, "profile.headline", 46);
  assertText(config.profile.affiliation, "profile.affiliation", 40);
  assertText(config.profile.location, "profile.location", 32);
  assertText(config.profile.status, "profile.status", 42);
  assert(Array.isArray(config.profile.about) && config.profile.about.length >= 1 && config.profile.about.length <= 3, "profile.about must contain 1 to 3 paragraphs.");
  config.profile.about.forEach((paragraph, index) => assertText(paragraph, `profile.about[${index}]`, 320));

  assert(config.research && typeof config.research === "object", "research is required.");
  assertText(config.research.primary, "research.primary", 28);
  assertText(config.research.direction, "research.direction", 38);
  assertText(config.research.themes, "research.themes", 46);
  assertText(config.research.narrative, "research.narrative", 420);

  assert(Array.isArray(config.focus) && config.focus.length >= 1 && config.focus.length <= 6, "focus must contain 1 to 6 items.");
  config.focus.forEach((item, index) => {
    assertText(item?.name, `focus[${index}].name`, 28);
    assertText(item?.description, `focus[${index}].description`, 180);
  });

  assert(Array.isArray(config.projects) && config.projects.length >= 1 && config.projects.length <= 6, "projects must contain 1 to 6 items.");
  config.projects.forEach((project, index) => {
    assertText(project?.name, `projects[${index}].name`, 18);
    assertUrl(project?.url, `projects[${index}].url`);
    assertUrl(project?.homepage ?? "", `projects[${index}].homepage`, { allowEmpty: true });
    assertText(project?.focus, `projects[${index}].focus`, 44);
    assertText(project?.summary, `projects[${index}].summary`, 220);
    assertText(project?.heroLabel, `projects[${index}].heroLabel`, 30);
  });

  assert(Array.isArray(config.gallery) && config.gallery.length >= 1 && config.gallery.length <= 24, "gallery must contain 1 to 24 items.");
  config.gallery.forEach((item, index) => {
    assertText(item?.name, `gallery[${index}].name`, 40);
    assertText(item?.image, `gallery[${index}].image`, 200);
    assertUrl(item?.url ?? "", `gallery[${index}].url`, { allowEmpty: true });
    assertText(item?.focus, `gallery[${index}].focus`, 60);
  });

  assert(Array.isArray(config.capabilities) && config.capabilities.length >= 1 && config.capabilities.length <= 24, "capabilities must contain 1 to 24 items.");
  config.capabilities.forEach((item, index) => assertText(item, `capabilities[${index}]`, 80));
  assert(Array.isArray(config.infrastructure) && config.infrastructure.length >= 1 && config.infrastructure.length <= 24, "infrastructure must contain 1 to 24 items.");
  config.infrastructure.forEach((item, index) => assertText(item, `infrastructure[${index}]`, 80));

  assert(Array.isArray(config.techStack) && config.techStack.length >= 1 && config.techStack.length <= 18, "techStack must contain 1 to 18 items.");
  config.techStack.forEach((item, index) => assertText(item, `techStack[${index}]`, 30));

  assert(Array.isArray(config.links) && config.links.length >= 1 && config.links.length <= 4, "links must contain 1 to 4 items.");
  config.links.forEach((link, index) => {
    assertText(link?.label, `links[${index}].label`, 14);
    assertText(link?.value, `links[${index}].value`, 28);
    assertUrl(link?.url, `links[${index}].url`, { protocols: ["http:", "https:", "mailto:"] });
    assert(typeof link?.logo === "string" && link.logo.length <= 30, `links[${index}].logo must be 30 characters or fewer.`);
    assert(/^[A-Fa-f0-9]{6}$/.test(link?.color), `links[${index}].color must be a six-character hex value without #.`);
  });

  assert(config.activity && typeof config.activity.enabled === "boolean", "activity.enabled must be true or false.");
  assert(Number.isInteger(config.activity.limit) && config.activity.limit >= 1 && config.activity.limit <= 10, "activity.limit must be between 1 and 10.");
  assert(["signal", "ocean", "solar"].includes(config.appearance?.palette), "appearance.palette must be signal, ocean, or solar.");
  assertText(config.footer, "footer", 120);

  return config;
}

export async function loadConfig(configPath = defaultConfigPath) {
  const resolvedPath = resolve(configPath);
  let raw;

  try {
    raw = await readFile(resolvedPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`Configuration file not found: ${resolvedPath}`);
    throw error;
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse ${resolvedPath}: ${error.message}`);
  }

  return validateConfig(config);
}
