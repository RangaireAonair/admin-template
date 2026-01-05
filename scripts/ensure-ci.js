const isCI =
  process.env.CI === "true" ||
  process.env.CI === "1" ||
  !!process.env.GITHUB_ACTIONS;

const isDryRun = process.argv.includes("--dry-run");

if (!isCI && !isDryRun) {
  console.error("");
  console.error("❌ Release aborted");
  console.error("----------------------------------------");
  console.error("release-it can only be executed in CI.");
  console.error("");
  console.error("To publish a release:");
  console.error("  → Run the Release workflow in GitHub Actions");
  console.error("");
  console.error("For local testing:");
  console.error("  → npx release-it --dry-run");
  console.error("----------------------------------------");
  console.error("");

  process.exit(1);
}
