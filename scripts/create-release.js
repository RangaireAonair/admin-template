import * as core from "@actions/core";
import * as github from "@actions/github";
import { execSync } from "child_process";

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const tagName = process.env.TAG_NAME;
    const prerelease = String(process.env.IS_PRERELEASE || "false") === "true";

    if (!token) throw new Error("Missing GITHUB_TOKEN");
    if (!tagName) throw new Error("Missing TAG_NAME");

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
    // 2️⃣ 不存在则创建 Tag ( lightweight )
    // -------------------------------
    if (!tagExists) {
      core.info(`🏷️ Creating tag ${tagName}`);

      // 获取当前 commit sha
      const sha = github.context.sha;

      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${tagName}`,
        sha,
      });

      core.info("✅ Tag created");
    }

    // -------------------------------
    // 3️⃣ 创建 Release
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
