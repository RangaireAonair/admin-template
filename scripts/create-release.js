import fs from "fs";
import path from "path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { execSync } from "child_process";

/**
 * 判断版本字符串是否包含指定的标记
 * @param {string} version - 版本号字符串，例如 "1.0.0-alpha"
 * @param {string[]} tags - 需要检测的关键字数组，例如 ["alpha", "beta", "rc"]
 * @returns {boolean} 是否包含任意关键字
 */
function hasVersionTag(version, tags = ["alpha", "beta", "rc"]) {
  if (!version) return false;

  // 构造正则，例如 ["alpha","beta","rc"] => /alpha|beta|rc/i
  const pattern = new RegExp(tags.join("|"), "i");
  return pattern.test(version);
}

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const tagName = `v${pkg.version}`;

    const prerelease = hasVersionTag(pkg.version);

    if (!token) throw new Error("Missing GITHUB_TOKEN");
    if (!tagName) throw new Error("Get Version Error");

    execSync("git add package.json");
    execSync(`git commit -m "chore(release): ${tagName}"`);

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    core.info(`🔎 Checking tag ${tagName}`);

    // -------------------------------
    // 1️⃣ 检查 Tag 是否存在
    // -------------------------------
    let tagExists = true;
    try {
      await octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag: tagName,
      });
      core.info(`⚠️ Tag ${tagName} already exists. Skipping create.`);
    } catch {
      tagExists = false;
    }

    // -------------------------------
    // 2️⃣  创建 Release
    // -------------------------------
    core.info(`🚀 Creating release ${tagName}`);

    const release = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: tagName,
      prerelease,
      generate_release_notes: true,
    });
    execSync(`git tag -f latest`);
    execSync("git push origin HEAD");
    execSync("git push origin --tags --force");

    console.log("✅ Release completed successfully");
    core.info(`🎉 Release created: ${release.data.html_url}`);
  } catch (err) {
    core.setFailed(`❌ Release failed: ${err.message}`);
  }
}

run();
