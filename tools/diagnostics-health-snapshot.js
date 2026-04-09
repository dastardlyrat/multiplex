"use strict";

const fs = require("node:fs");
const path = require("node:path");

const detectorCatalog = require("../lab/firefox-extension/detector-catalog.js");
const detectorParity = require("./pipeline-detector-parity.js");
const inboxSelectorHealth = require("./inbox-selector-health.js");

const extensionDirectoryPath = path.resolve(__dirname, "..", "lab", "firefox-extension");
const manifestPath = path.join(extensionDirectoryPath, "manifest.json");
const diagnosticsHealthDataOutputPath = path.join(extensionDirectoryPath, "diagnostics-health-data.js");
const generatedBy = "tools/rebuild-diagnostics-health.js";

function readExtensionVersion() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return String(manifest && manifest.version ? manifest.version : "0.0.0");
}

function buildDiagnosticsHealthSnapshot(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const generatedAt = typeof optionBag.generatedAt === "string" && optionBag.generatedAt.trim()
    ? optionBag.generatedAt.trim()
    : new Date().toISOString();
  const catalog = detectorCatalog.buildCatalog();
  const parityReport = detectorParity.buildDetectorParityReport();
  const selectorHealthReport = inboxSelectorHealth.buildSelectorHealthReport();
  const parityActual = parityReport && parityReport.actual && typeof parityReport.actual === "object"
    ? parityReport.actual
    : {};
  const selectorActual = Array.isArray(selectorHealthReport && selectorHealthReport.actual)
    ? selectorHealthReport.actual
    : [];
  const parityFailures = Array.isArray(parityReport && parityReport.failures)
    ? parityReport.failures.slice()
    : [];
  const selectorFailures = Array.isArray(selectorHealthReport && selectorHealthReport.failures)
    ? selectorHealthReport.failures.slice()
    : [];

  return {
    schemaVersion: 1,
    generatedAt: generatedAt,
    generatedBy: generatedBy,
    extensionVersion: readExtensionVersion(),
    liveCatalog: {
      summary: Object.assign({}, catalog.summary || {}),
      urlDetectorIds: (catalog.urlDetectors || []).map(function mapUrlDetector(detectorDefinition) {
        return detectorDefinition.id;
      }),
      inboxProviderIds: (catalog.inboxProviders || []).map(function mapInboxProvider(providerDefinition) {
        return providerDefinition.id;
      }),
      pluginPackIds: (catalog.pluginPacks || []).map(function mapPluginPack(pluginPack) {
        return pluginPack.id;
      })
    },
    detectorParity: {
      status: parityFailures.length ? "failed" : "passed",
      failureCount: parityFailures.length,
      detectorIds: Array.isArray(parityActual.detectorIds) ? parityActual.detectorIds.slice() : [],
      detectorTitles: Array.isArray(parityActual.detectorTitles) ? parityActual.detectorTitles.slice() : [],
      suiteCaseCount: Number(parityActual.suiteCaseCount) || 0,
      paritySampleCount: Number(parityActual.paritySampleCount) || 0,
      suiteParityMismatchCount: Number(parityActual.suiteParityMismatchCount) || 0,
      sampleParityMismatchCount: Number(parityActual.sampleParityMismatchCount) || 0,
      suiteParityMismatchPreview: Array.isArray(parityActual.suiteParityMismatchPreview)
        ? parityActual.suiteParityMismatchPreview.slice()
        : [],
      sampleParityMismatchPreview: Array.isArray(parityActual.sampleParityMismatchPreview)
        ? parityActual.sampleParityMismatchPreview.slice()
        : [],
      failures: parityFailures
    },
    selectorHealth: {
      status: selectorFailures.length ? "failed" : "passed",
      failureCount: selectorFailures.length,
      fixtureCount: selectorActual.length,
      providerIds: selectorActual.map(function mapProviderHealth(providerHealth) {
        return providerHealth.providerId;
      }),
      failingProviderIds: selectorActual.filter(function keepFailingProvider(providerHealth) {
        return !providerHealth.hostMatches || !providerHealth.pathMatches || (providerHealth.missingExpectedSelectors || []).length > 0;
      }).map(function mapFailingProvider(providerHealth) {
        return providerHealth.providerId;
      }),
      missingExpectedSelectorCount: selectorActual.reduce(function countMissingSelectors(totalCount, providerHealth) {
        return totalCount + ((providerHealth.missingExpectedSelectors || []).length);
      }, 0),
      providerStatuses: selectorActual.map(function mapProviderStatus(providerHealth) {
        return {
          providerId: providerHealth.providerId,
          title: providerHealth.title,
          fixtureUrl: providerHealth.fixtureUrl,
          hostMatches: !!providerHealth.hostMatches,
          pathMatches: !!providerHealth.pathMatches,
          matchedSelectorCount: (providerHealth.selectorMatchCounts || []).filter(function keepMatchingSelector(matchRecord) {
            return Number(matchRecord.count) > 0;
          }).length,
          expectedSelectorCount: (providerHealth.expectedSelectors || []).length,
          matchedSelectors: (providerHealth.selectorMatchCounts || []).filter(function keepMatchingSelector(matchRecord) {
            return Number(matchRecord.count) > 0;
          }).map(function mapMatchingSelector(matchRecord) {
            return matchRecord.selector;
          }),
          missingExpectedSelectors: Array.isArray(providerHealth.missingExpectedSelectors)
            ? providerHealth.missingExpectedSelectors.slice()
            : []
        };
      }),
      failures: selectorFailures
    }
  };
}

function buildDiagnosticsHealthDataScript(snapshot) {
  return [
    "// Generated by " + generatedBy,
    "(function attachUrlForensicsDiagnosticsHealthData(globalScope) {",
    "  \"use strict\";",
    "",
    "  var diagnosticsHealthData = " + JSON.stringify(snapshot, null, 2) + ";",
    "",
    "  if (globalScope) {",
    "    globalScope.urlForensicsDiagnosticsHealthData = diagnosticsHealthData;",
    "  }",
    "}(typeof globalThis !== \"undefined\" ? globalThis : window));",
    ""
  ].join("\n");
}

module.exports = Object.freeze({
  buildDiagnosticsHealthSnapshot: buildDiagnosticsHealthSnapshot,
  buildDiagnosticsHealthDataScript: buildDiagnosticsHealthDataScript,
  diagnosticsHealthDataOutputPath: diagnosticsHealthDataOutputPath,
  generatedBy: generatedBy
});
