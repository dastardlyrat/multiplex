"use strict";

const fs = require("node:fs");
const path = require("node:path");

const detectorCatalog = require("../lab/firefox-extension/detector-catalog.js");
const pipelinePluginRegistry = require("../lab/firefox-extension/pipeline-plugin-registry.js");

const goldenFixturesDirectoryPath = path.resolve(__dirname, "golden-fixtures");
const detectorCatalogGoldenPath = path.join(goldenFixturesDirectoryPath, "detector-catalog.golden.json");
const pipelineRulePackGoldenPath = path.join(goldenFixturesDirectoryPath, "pipeline-rule-pack.golden.json");

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildDetectorCatalogGoldenSnapshot() {
  return cloneJsonValue(detectorCatalog.buildCatalog());
}

function buildPipelineRulePackGoldenSnapshot() {
  return cloneJsonValue({
    pluginPacks: pipelinePluginRegistry.listPluginPacks(),
    resolvedConfig: pipelinePluginRegistry.getResolvedConfig()
  });
}

function ensureGoldenFixturesDirectory() {
  fs.mkdirSync(goldenFixturesDirectoryPath, { recursive: true });
}

function writeGoldenFixture(filePath, snapshot) {
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
}

function readGoldenFixture(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findFirstDifferencePath(expectedValue, actualValue, currentPath) {
  const expectedIsArray = Array.isArray(expectedValue);
  const actualIsArray = Array.isArray(actualValue);

  if (expectedIsArray || actualIsArray) {
    if (!expectedIsArray || !actualIsArray) {
      return currentPath;
    }

    if (expectedValue.length !== actualValue.length) {
      return currentPath + ".length";
    }

    for (let index = 0; index < expectedValue.length; index += 1) {
      const differencePath = findFirstDifferencePath(
        expectedValue[index],
        actualValue[index],
        currentPath + "[" + String(index) + "]"
      );

      if (differencePath) {
        return differencePath;
      }
    }

    return "";
  }

  const expectedIsObject = !!(expectedValue && typeof expectedValue === "object");
  const actualIsObject = !!(actualValue && typeof actualValue === "object");

  if (expectedIsObject || actualIsObject) {
    if (!expectedIsObject || !actualIsObject) {
      return currentPath;
    }

    const expectedKeys = Object.keys(expectedValue).sort();
    const actualKeys = Object.keys(actualValue).sort();

    if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
      return currentPath + ".keys";
    }

    for (let index = 0; index < expectedKeys.length; index += 1) {
      const keyName = expectedKeys[index];
      const differencePath = findFirstDifferencePath(
        expectedValue[keyName],
        actualValue[keyName],
        currentPath + "." + keyName
      );

      if (differencePath) {
        return differencePath;
      }
    }

    return "";
  }

  return expectedValue === actualValue ? "" : currentPath;
}

function compareGoldenFixture(expectedSnapshot, actualSnapshot) {
  const firstDifferencePath = findFirstDifferencePath(expectedSnapshot, actualSnapshot, "$");

  return Object.freeze({
    matches: !firstDifferencePath,
    firstDifferencePath: firstDifferencePath
  });
}

module.exports = Object.freeze({
  detectorCatalogGoldenPath: detectorCatalogGoldenPath,
  pipelineRulePackGoldenPath: pipelineRulePackGoldenPath,
  ensureGoldenFixturesDirectory: ensureGoldenFixturesDirectory,
  buildDetectorCatalogGoldenSnapshot: buildDetectorCatalogGoldenSnapshot,
  buildPipelineRulePackGoldenSnapshot: buildPipelineRulePackGoldenSnapshot,
  writeGoldenFixture: writeGoldenFixture,
  readGoldenFixture: readGoldenFixture,
  compareGoldenFixture: compareGoldenFixture
});
