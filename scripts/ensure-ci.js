import { execSync } from "child_process";

try {
  // 获取当前分支
  const branch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();

  if (!branch.startsWith("feature")) {
    console.error(`❌ 当前分支 "${branch}" 不允许执行此操作，只允许 feature`);
    process.exit(1); // 非零退出码表示失败
  }

  console.log(`✅ 当前分支 "${branch}" 可以执行操作`);

  // 这里可以放你后续需要执行的逻辑
  // ...
} catch (err) {
  console.error("❌ 获取当前分支失败:", err.message);
  process.exit(1);
}
