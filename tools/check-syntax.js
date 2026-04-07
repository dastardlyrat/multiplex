"use strict";

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..", "lab", "firefox-extension");

// Function: collect JavaScript files.
function collectJavaScriptFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  entries.forEach(function inspectDirectoryEntry(entry) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(entryPath));
      return;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  });

  return files;
}

// Function: run syntax check.
function runSyntaxCheck(filePath) {
  try {
    // Wrap the script the same way CommonJS files are parsed before execution.
    new vm.Script(Module.wrap(fs.readFileSync(filePath, "utf8")), {
      displayErrors: true,
      filename: filePath
    });
    return true;
  } catch (error) {
    console.error(filePath);
    console.error(error && error.message ? error.message : String(error));
    return false;
  }
}

if (!fs.existsSync(extensionRoot)) {
  console.error("Extension root is missing: " + extensionRoot);
  process.exit(1);
}

const jsFiles = collectJavaScriptFiles(extensionRoot);
const failedFiles = jsFiles.filter(function keepFailedSyntaxCheck(filePath) {
  return !runSyntaxCheck(filePath);
});

if (failedFiles.length) {
  console.error("Syntax check failed for " + String(failedFiles.length) + " file(s).");
  process.exit(1);
}

console.log("Syntax check passed for " + String(jsFiles.length) + " JavaScript file(s).");
