// /commitlint.config.js
// Commitlint configuration for enforcing conventional commits
// See: https://commitlint.js.org

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation only changes
        "style", // Changes that don't affect code meaning (formatting, etc.)
        "refactor", // Code change that neither fixes a bug nor adds a feature
        "perf", // Performance improvement
        "test", // Adding or correcting tests
        "build", // Changes to build system or dependencies
        "ci", // CI configuration changes
        "chore", // Other changes that don't modify src or test files
        "revert", // Revert a previous commit
      ],
    ],
    "subject-case": [2, "always", "sentence-case"],
    "header-max-length": [2, "always", 100],
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },
};
