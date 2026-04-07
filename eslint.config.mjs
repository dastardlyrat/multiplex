export default [
  {
    files: ["lab/firefox-extension/**/*.js"],
    rules: {
      complexity: ["warn", 25],
      "max-lines-per-function": [
        "warn",
        {
          max: 120,
          skipBlankLines: true,
          skipComments: true
        }
      ],
      "no-redeclare": "error"
    }
  }
];
