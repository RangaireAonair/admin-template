import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import core from "@actions/core";
import githubPkg from "@actions/github";
import { fileURLToPath } from "url";

const { GitHub, context } = githubPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const releaseType = process.env.RELEASE_TYPE;
const token = process.env.GITHUB_TOKEN;

if (!token) {
  core.setFailed("Missing GITHUB_TOKEN");
  process.exit(1);
}

const pkgPath = path.resolve(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const currentVersion = pkg.version;

function parseVersion(version) {
  const [main, pre] = version.split("-");
  const [major, minor, patch] = main.split(".").map(Number);
  return { major, minor, patch, pre };
}

function bumpVersion(version, type) {
  const v = parseVersion(version);

  if (["major", "minor", "patch"].includes(type)) {
    if (type === "major") return `${v.major + 1}.0.0`;
    if (type === "minor") return `${v.major}.${v.minor + 1}.0`;
    return `${v.major}.${v.minor}.${v.patch + 1}`;
  }

  // pre-release
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

const nextVersion = bumpVersion(currentVersion, releaseType);
const tag = `v${nextVersion}`;

async function run() {
  try {
    console.log(`Current version: ${currentVersion}`);
    console.log(`Next version: ${nextVersion}`);

    // 更新 package.json
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    execSync("git add package.json");
    execSync(`git commit -m "chore(release): ${tag}"`);

    // 创建 tag
    execSync(`git tag ${tag}`);

    // 创建 GitHub Release
    const github = new GitHub(token);
    const { owner, repo } = context.repo;

    await github.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: tag,
      prerelease: ["alpha", "beta", "rc"].includes(releaseType),
      generate_release_notes: true,
    });

    // 最后 push
    execSync("git push origin HEAD");
    execSync("git push origin --tags");

    console.log("Release completed successfully");
  } catch (err) {
    console.error(err);

    // 回滚
    try {
      execSync("git reset --hard HEAD~1");
      execSync(`git tag -d ${tag}`);
    } catch {}

    core.setFailed("Release failed, rollback completed");
    process.exit(1);
  }
}

run();
