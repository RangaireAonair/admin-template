import fs from "fs";
import path from "path";
import core from "@actions/core";

function bumpVersion(current, type) {
  const semver = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/;

  const match = current.match(semver);
  if (!match) throw new Error(`❌ Invalid version format: ${current}`);

  let [, major, minor, patch, preTag, preNum] = match;
  major = Number(major);
  minor = Number(minor);
  patch = Number(patch);
  preNum = Number(preNum || 0);

  const isPre = ["alpha", "beta", "rc"].includes(type);

  // ---------------- 正式版本升级 ----------------
  if (type === "major") {
    return `${major + 1}.0.0`;
  }

  if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  if (type === "patch") {
    // 如果当前是预发布 → 发布正式版
    if (preTag) {
      return `${major}.${minor}.${patch}`;
    }
    return `${major}.${minor}.${patch + 1}`;
  }

  // ---------------- 预发布版本 ----------------
  if (isPre) {
    // case1: 当前已经是同类型预发布 → 递增
    if (preTag === type) {
      return `${major}.${minor}.${patch}-${type}.${preNum + 1}`;
    }

    // case2: 是其他预发布 → 切换类型并重置
    if (preTag && preTag !== type) {
      return `${major}.${minor}.${patch}-${type}.1`;
    }

    // case3: 当前是正式版 → patch+1，然后预发布
    return `${major}.${minor}.${patch + 1}-${type}.1`;
  }

  throw new Error(`❌ Unknown release type: ${type}`);
}

/**
 * 自动读取 package.json → 更新 → 保存
 */
function bumpPackageJson(releaseType) {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  const oldV = pkg.version;
  const newV = bumpVersion(oldV, releaseType);

  pkg.version = newV;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  return {
    currentVersion: oldV,
    nextVersion: newV,
    tag: `v${newV}`,
    isPrerelease: ["alpha", "beta", "rc"].includes(releaseType),
  };
}

async function run() {
  const token = process.env.GITHUB_TOKEN;
  const type = process.env.RELEASE_TYPE;

  if (!token) {
    core.setFailed("Missing GITHUB_TOKEN");
    process.exit(1);
  }

  if (!type) {
    core.setFailed("Missing RELEASE_TYPE");
    process.exit(1);
  }

  try {
    const { currentVersion, nextVersion, isPrerelease, tag } =
      bumpPackageJson(type);

    console.log(`Current version: ${currentVersion}`);
    console.log(`Next version: ${nextVersion}`);
    console.log(`Tag: ${tag}`);
    console.log(`Prerelease: ${isPrerelease}`);

    core.setOutput("version", nextVersion);
    core.setOutput("is_prerelease", isPrerelease);
  } catch (err) {
    console.error(err);
  }
}

run();
