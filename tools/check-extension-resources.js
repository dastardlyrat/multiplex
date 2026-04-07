"use strict";

const fs = require("node:fs");
const path = require("node:path");

const extensionRoot = path.resolve(__dirname, "..", "lab", "firefox-extension");
const manifestPath = path.join(extensionRoot, "manifest.json");

// Function: add missing path.
function addMissingPath(missingPaths, label, resourcePath) {
  missingPaths.push(label + " -> " + resourcePath);
}

// Function: check manifest script and resource lists.
function checkManifestResources(manifest, missingPaths) {
  (manifest.background && manifest.background.scripts ? manifest.background.scripts : []).forEach(function checkBackgroundScript(scriptName) {
    if (!fs.existsSync(path.join(extensionRoot, scriptName))) {
      addMissingPath(missingPaths, "background script", scriptName);
    }
  });

  (manifest.content_scripts || []).forEach(function checkContentScriptGroup(scriptGroup) {
    (scriptGroup.js || []).forEach(function checkContentScript(scriptName) {
      if (!fs.existsSync(path.join(extensionRoot, scriptName))) {
        addMissingPath(missingPaths, "content script", scriptName);
      }
    });
  });

  (manifest.web_accessible_resources || []).forEach(function checkResourceGroup(resourceGroup) {
    (resourceGroup.resources || []).forEach(function checkWebResource(resourceName) {
      if (!fs.existsSync(path.join(extensionRoot, resourceName))) {
        addMissingPath(missingPaths, "web resource", resourceName);
      }
    });
  });
}

// Function: collect HTML files.
function collectHtmlFiles(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  entries.forEach(function inspectDirectoryEntry(entry) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(entryPath));
      return;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  });

  return files;
}

// Function: check HTML local references.
function checkHtmlLocalReferences(missingPaths) {
  collectHtmlFiles(extensionRoot).forEach(function checkHtmlFile(htmlFilePath) {
    const htmlText = fs.readFileSync(htmlFilePath, "utf8");
    const relativeHtmlPath = path.relative(extensionRoot, htmlFilePath);
    const referencePattern = /<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/g;
    let match = referencePattern.exec(htmlText);

    while (match) {
      const resourcePath = match[1];

      if (!/^(?:https?:|data:|#)/i.test(resourcePath)) {
        const resolvedPath = path.resolve(path.dirname(htmlFilePath), resourcePath);

        if (!resolvedPath.startsWith(extensionRoot) || !fs.existsSync(resolvedPath)) {
          addMissingPath(missingPaths, relativeHtmlPath, resourcePath);
        }
      }

      match = referencePattern.exec(htmlText);
    }
  });
}

if (!fs.existsSync(manifestPath)) {
  console.error("Manifest is missing: " + manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const missingPaths = [];

checkManifestResources(manifest, missingPaths);
checkHtmlLocalReferences(missingPaths);

if (missingPaths.length) {
  console.error(missingPaths.join("\n"));
  process.exit(1);
}

console.log("Manifest resources and HTML local references are present.");
