import core from "@actions/core";
import * as github from "@actions/github";
/**
 * 根据 PR 的源分支和标签确定版本升级类型
 * @param {object} context - GitHub Actions 的 context 对象
 * @returns {object} 包含 source 和 type 的对象
 */
function determineBumpType(context) {
  const { pull_request } = context.payload;

  if (!pull_request) {
    throw new Error("This action should only be run on pull_request events");
  }

  const source = pull_request.head.ref;
  let type = "patch"; // 默认值

  // 根据源分支名称判断
  if (source.startsWith("hotfix")) {
    type = "patch";
  } else if (source.startsWith("release")) {
    // 通过标签控制版本升级类型
    const labels = pull_request.labels || [];
    const labelNames = labels.map((label) => label.name);

    if (labelNames.includes("major")) {
      type = "major";
    } else if (labelNames.includes("minor")) {
      type = "minor";
    } else if (labelNames.includes("alpha")) {
      type = "alpha"; // 注意：这里改为 alpha，与 bumpVersion 函数一致
    } else if (labelNames.includes("beta")) {
      type = "beta"; // 注意：这里改为 beta，与 bumpVersion 函数一致
    } else if (labelNames.includes("rc")) {
      type = "rc"; // 注意：这里改为 rc，与 bumpVersion 函数一致
    } else {
      type = "patch";
    }
  }

  console.log(`Source branch: ${source}`);
  console.log(`Bump type: ${type}`);

  return {
    source,
    type,
  };
}

/**
 * 作为 GitHub Action 的主要入口函数
 */
async function run() {
  try {
    const result = determineBumpType(github.context);

    // 设置 GitHub Actions 输出
    core.setOutput("source", result.source);
    core.setOutput("releaseType", result.type);

    console.log(
      `✅ Determined bump type: ${result.type} from source: ${result.source}`,
    );

    return result;
  } catch (error) {
    console.error("❌ Error determining bump type:", error.message);
    core.setFailed(error.message);
    process.exit(1);
  }
}

run();
