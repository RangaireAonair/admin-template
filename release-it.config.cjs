// release-it.config.cjs
module.exports = {
  git: {
    requireCleanWorkingDir: true,
    requireUpstream: true,
    requireBranch: "main",
    commitMessage: "chore(release): v${version}",
    tagName: "v${version}",
    tag: true,
    commit: true,
    push: false,
  },
  npm: {
    publish: false, // 前端项目一般 false
  },
  github: {
    release: false, // 可按需开启
  },
  hooks: {
    "before:init": [    'node ./scripts/ensure-ci.js',"npm run test", "npm run build"],
    "after:release": ['echo "🎉 Release ${version} completed"'],
  },
  plugins: {
    "@release-it/conventional-changelog": {
      preset: "angular",
      infile: "CHANGELOG.md",
    },
  },
};
