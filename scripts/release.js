import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import { fileURLToPath } from "url";

/* -------------------------------------------------- */
/* env & guard                                        */
/* -------------------------------------------------- */

const releaseType = process.env.RELEASE_TYPE;
const token = process.env.GITHUB_TOKEN;

if (!token) {
  core.setFailed("Missing GITHUB_TOKEN");
  process.exit(1);
}

const branch = context.ref.replace("refs/heads/", "");
if (!["main", "master"].includes(branch)) {
  core.setFailed(`Release is only allowed on main/master, current: ${branch}`);
  process.exit(1);
}

/* -------------------------------------------------- */
/* paths                                              */
/* -------------------------------------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgPath = path.resolve(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

/* -------------------------------------------------- */
/* version logic                                      */
/* -------------------------------------------------- */

function parseVersion(version) {
  const [main, pre] = version.split("-");
  const [major, minor, patch] = main.split(".").map(Number);
  return { major, minor, patch, pre };
}

function bumpVersion(version, type) {
  const v = parseVersion(version);

  if (type === "major") return `${v.major + 1}.0.0`;
  if (type === "minor") return `${v.major}.${v.minor + 1}.0`;
  if (type === "patch") return `${v.major}.${v.minor}.${v.patch + 1}`;

  // alpha / beta / rc
  const basePatch = v.pre ? v.patch : v.patch + 1;
  const base = `${v.major}.${v.minor}.${basePatch}`;

  if (!v.pre) {
    return `${base}-${type}.1`;
  }

  const [preType, preNum] = v.pre.split(".");

  if (preType !== type) {
    return `${base}-${type}.1`;
  }

  return `${base}-${type}.${Number(preNum) + 1}`;
}

/* -------------------------------------------------- */
/* main                                               */
/* -------------------------------------------------- */

const currentVersion = pkg.version;
const nextVersion = bumpVersion(currentVersion, releaseType);
const tag = `v${nextVersion}`;
const isPrerelease = ["alpha", "beta", "rc"].includes(releaseType);

async function run() {
  const octokit = getOctokit(token);
  const { owner, repo } = context.repo;

  try {
    console.log(`Current version: ${currentVersion}`);
    console.log(`Next version: ${nextVersion}`);
    console.log(`Tag: ${tag}`);
    console.log(`Prerelease: ${isPrerelease}`);

    /* ---------- version bump ---------- */
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    execSync("git add package.json");
    execSync(`git commit -m "chore(release): ${tag}"`);

    /* ---------- tags ---------- */
    execSync(`git tag ${tag}`);
    execSync(`git tag -f latest`);

    /* ---------- github release ---------- */
    await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: tag,
      prerelease: isPrerelease,
      generate_release_notes: true,
    });

    /* ---------- push (LAST STEP) ---------- */
    execSync("git push origin HEAD");
    execSync("git push origin --tags --force");

    console.log("✅ Release completed successfully");
  } catch (err) {
    console.error(err);

    /* ---------- rollback ---------- */
    try {
      console.log("↩ Rolling back...");
      execSync("git reset --hard HEAD~1");
      execSync(`git tag -d ${tag}`);
      execSync("git tag -d latest");
    } catch {}

    core.setFailed("❌ Release failed, rollback completed");
    process.exit(1);
  }
}

run();
