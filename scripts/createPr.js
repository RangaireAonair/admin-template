import core from "@actions/core";
import github from "@actions/github";

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const base = process.env.BASE_BRANCH;
    const head = process.env.HEAD_BRANCH;

    if (!token) throw new Error("Missing GITHUB_TOKEN");
    if (!base || !head) throw new Error("Missing BASE or HEAD branch");

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    core.info(`Create PR: ${head} -> ${base}`);

    const title = `Release: merge ${head} into ${base}`;
    const body = `
### 🚀 Deployment Successful
This PR was automatically generated.

- Source branch: \`${head}\`
- Target branch: \`${base}\`

Please review and merge to trigger version upgrade workflow.
`;

    // ---- 创建 PR ----
    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body,
      maintainers_can_modify: true,
    });

    core.info(`PR Created: ${pr.data.html_url}`);

    const prNumber = pr.data.number;

    // ---- 可选：自动打 Label ----
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: ["release"],
    });

    // ---- 可选：请求 CODEOWNER 审核（你可以替换成团队成员）----
    await octokit.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number: prNumber,
      reviewers: ["RangaireAonair"],
    });

    core.info("Reviewers requested & label added");
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
