"use strict";

const childProcess = require("node:child_process");
const path = require("node:path");

const webExtBinaryPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "web-ext.cmd" : "web-ext"
);

const runResult = childProcess.spawnSync(webExtBinaryPath, process.argv.slice(2), {
  stdio: "inherit",
  env: Object.assign({}, process.env, {
    NO_UPDATE_NOTIFIER: "1"
  }),
  shell: process.platform === "win32"
});

if (runResult.error) {
  throw runResult.error;
}

process.exit(typeof runResult.status === "number" ? runResult.status : 1);
