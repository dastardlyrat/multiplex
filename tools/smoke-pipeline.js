"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pipelineBase = require("../lab/firefox-extension/pipeline-base.js");
const pipeline = require("../lab/firefox-extension/pipeline.js");
const pipelineUrlResolver = require("../lab/firefox-extension/pipeline-url-resolver.js");
const pipelineDetectorRegistry = require("../lab/firefox-extension/pipeline-detector-registry.js");
const pipelineDetection = require("../lab/firefox-extension/pipeline-detection.js");
const pipelineResolution = require("../lab/firefox-extension/pipeline-resolution.js");
const pipelinePluginRegistry = require("../lab/firefox-extension/pipeline-plugin-registry.js");
const pipelineHtmlRewriterFactory = require("../lab/firefox-extension/pipeline-html-rewriter.js");
const pipelineStageRunner = require("../lab/firefox-extension/pipeline-stage-runner.js");
const pipelineAssembly = require("../lab/firefox-extension/pipeline-assembly.js");
const pipelineDiagnostics = require("../lab/firefox-extension/pipeline-diagnostics.js");
const pageRuntime = require("../lab/firefox-extension/page-runtime.js");
const pageDependencies = require("../lab/firefox-extension/page-dependencies.js");
const diagnosticsCatalogRows = require("../lab/firefox-extension/diagnostics-catalog-rows.js");
const catalogDrift = require("../lab/firefox-extension/catalog-drift.js");
const contentUiHelpers = require("../lab/firefox-extension/content-ui-helpers.js");
const contentPageContext = require("../lab/firefox-extension/content-page-context.js");
const contentInboxWorkflows = require("../lab/firefox-extension/content-inbox-workflows.js");
const contentPaneWorkflows = require("../lab/firefox-extension/content-pane-workflows.js");
const contentWorkflowAccessors = require("../lab/firefox-extension/content-workflow-accessors.js");
const contentScript = require("../lab/firefox-extension/content-script.js");
const contentScriptRuntime = require("../lab/firefox-extension/content-script-runtime.js");
const pagePaneDiagnostics = require("../lab/firefox-extension/page-pane-diagnostics.js");
const pagePaneShell = require("../lab/firefox-extension/page-pane-shell.js");
const pagePaneBootstrap = require("../lab/firefox-extension/page-pane-bootstrap.js");
const pagePaneAssembly = require("../lab/firefox-extension/page-pane-assembly.js");
const pagePaneLayout = require("../lab/firefox-extension/page-pane-layout.js");
const pagePaneMirror = require("../lab/firefox-extension/page-pane-mirror.js");
const pagePaneSnapshot = require("../lab/firefox-extension/page-pane-snapshot.js");
const emailSnapshotSync = require("../lab/firefox-extension/email-snapshot-sync.js");
const emailRootSummary = require("../lab/firefox-extension/email-root-summary.js");
const emailRootRuntime = require("../lab/firefox-extension/email-root-runtime.js");
const emailAutoReplaceState = require("../lab/firefox-extension/email-auto-replace-state.js");
const emailAutoReplace = require("../lab/firefox-extension/email-auto-replace.js");
const contentSettingsStorage = require("../lab/firefox-extension/content-settings-storage.js");
const contentRuntimeLifecycle = require("../lab/firefox-extension/content-runtime-lifecycle.js");
const emailCandidateDiscovery = require("../lab/firefox-extension/email-candidate-discovery.js");
const detectorCatalog = require("../lab/firefox-extension/detector-catalog.js");
const trackingParameterModel = require("../lab/firefox-extension/tracking-parameter-model.js");
const redaction = require("../lab/firefox-extension/debug-redaction.js");
const inboxDetectorRegistry = require("../lab/firefox-extension/inbox-detector-registry.js");
require("../lab/firefox-extension/inbox-detectors.js");
const settingsOpener = require("../lab/firefox-extension/settings-opener.js");
const detectorParity = require("./pipeline-detector-parity.js");
const diagnosticsHealthSnapshot = require("./diagnostics-health-snapshot.js");
const inboxSelectorHealth = require("./inbox-selector-health.js");
const sampleReviewData = require("./sample-review-data.js");
const catalogGoldenFixtures = require("./catalog-golden-fixtures.js");
const testCases = require("./pipeline-test-cases.js");

const reportDirectoryPath = path.resolve(__dirname, "..", "test-results");
const jsonReportPath = path.join(reportDirectoryPath, "pipeline-test-report.json");
const markdownReportPath = path.join(reportDirectoryPath, "pipeline-test-report.md");
const generatedTestSuiteHtmlPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "test-suite.html");
const generatedInboxFixtureDataPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "inbox-browser-fixture-data.js");
const generatedDiagnosticsHealthDataPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "diagnostics-health-data.js");
const diagnosticsPageHtmlPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "diagnostics.html");
const generatedSampleReviewDataPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "sample-review-data.js");
const sampleReviewPageHtmlPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "sample-review.html");
const appScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "app.js");
const componentKitScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "core-components", "components.js");
const debugConfigScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "debug-config.js");
const debugScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "debug.js");
const mobileDeviceScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "mobile-device.js");
const pageNavigationScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "page-navigation.js");
const backgroundScriptPath = path.resolve(__dirname, "..", "lab", "firefox-extension", "background.js");
const shouldSaveReports = process.argv.includes("--save");

function arrayEquals(leftValue, rightValue) {
  return JSON.stringify(leftValue) === JSON.stringify(rightValue);
}

function normalizeExpectedStatus(resultLike) {
  const resultRecord = resultLike && typeof resultLike === "object" ? resultLike : {};

  if (resultRecord.mode === "rebuild-target") {
    return resultRecord.expectedStatus === "pending" ? "pending" : "ready";
  }

  return resultRecord.expectedStatus === "failed" ? "failed" : "passed";
}

function finalizeResultStatus(resultLike) {
  const resultRecord = resultLike && typeof resultLike === "object" ? resultLike : {};
  const failures = Array.isArray(resultRecord.failures) ? resultRecord.failures : [];
  const expectedStatus = normalizeExpectedStatus(resultRecord);
  let status = String(resultRecord.status || "");

  if (resultRecord.mode === "rebuild-target") {
    status = failures.length ? "pending" : "ready";
  } else if (expectedStatus === "failed") {
    status = failures.length ? "expected-failed" : "unexpected-pass";
  } else {
    status = failures.length ? "failed" : "passed";
  }

  return Object.assign({}, resultRecord, {
    expectedStatus: expectedStatus,
    status: status
  });
}

function collectPipelineActual(caseDefinition, analysisResult) {
  const firstItem = analysisResult.items[0] || null;
  const finalEntries = pipeline.buildFinalUrlEntries(analysisResult.items);
  const firstFinalEntry = finalEntries[0] || null;

  return {
    itemCount: analysisResult.items.length,
    finalUrls: analysisResult.finalUrls.slice(),
    displayType: firstItem ? pipeline.getItemDisplayType(firstItem) : "",
    finalEntryType: firstFinalEntry ? firstFinalEntry.type : "",
    finalLinkText: firstFinalEntry ? pipeline.buildFinalUrlLinkText(firstFinalEntry) : "",
    removedParameterNames: Array.from(new Set(analysisResult.items.flatMap(function flattenCleanupEntries(item) {
      return (item && Array.isArray(item.trackerCleanupEntries) ? item.trackerCleanupEntries : []).flatMap(function flattenRemovedNames(cleanupEntry) {
        return Array.isArray(cleanupEntry.removedParameterNames) ? cleanupEntry.removedParameterNames : [];
      });
    }))).sort(),
    notes: Array.from(new Set(analysisResult.items.flatMap(function flattenItemNotes(item) {
      return item && Array.isArray(item.notes) ? item.notes : [];
    }))).sort(),
    cleanupEntries: analysisResult.items.flatMap(function flattenTrackerCleanup(item) {
      return item && Array.isArray(item.trackerCleanupEntries) ? item.trackerCleanupEntries : [];
    }),
    diagnostics: analysisResult.diagnostics && Array.isArray(analysisResult.diagnostics.lines)
      ? analysisResult.diagnostics.lines.slice()
      : [],
    errors: Array.isArray(analysisResult.errors) ? analysisResult.errors.slice() : [],
    options: analysisResult.options || {},
    input: caseDefinition.input
  };
}

function compareExpected(expected, actual) {
  const failures = [];
  const diagnosticsText = actual.diagnostics.join("\n");
  const notesText = actual.notes.join("\n");

  if (typeof expected.itemCount === "number" && actual.itemCount !== expected.itemCount) {
    failures.push("Expected itemCount " + String(expected.itemCount) + " but received " + String(actual.itemCount) + ".");
  }

  if (Array.isArray(expected.finalUrls) && !arrayEquals(actual.finalUrls, expected.finalUrls)) {
    failures.push("Expected finalUrls " + JSON.stringify(expected.finalUrls) + " but received " + JSON.stringify(actual.finalUrls) + ".");
  }

  if (typeof expected.displayType === "string" && actual.displayType !== expected.displayType) {
    failures.push("Expected displayType " + JSON.stringify(expected.displayType) + " but received " + JSON.stringify(actual.displayType) + ".");
  }

  if (typeof expected.finalEntryType === "string" && actual.finalEntryType !== expected.finalEntryType) {
    failures.push("Expected finalEntryType " + JSON.stringify(expected.finalEntryType) + " but received " + JSON.stringify(actual.finalEntryType) + ".");
  }

  if (Array.isArray(expected.finalLinkTextIncludes)) {
    expected.finalLinkTextIncludes.forEach(function ensureFinalLinkTextContains(expectedFragment) {
      if (actual.finalLinkText.indexOf(expectedFragment) === -1) {
        failures.push("Expected finalLinkText to include " + JSON.stringify(expectedFragment) + " but received " + JSON.stringify(actual.finalLinkText) + ".");
      }
    });
  }

  if (Array.isArray(expected.removedParameterNames)) {
    const expectedRemovedNames = expected.removedParameterNames.slice().sort();
    if (!arrayEquals(actual.removedParameterNames, expectedRemovedNames)) {
      failures.push(
        "Expected removedParameterNames " +
        JSON.stringify(expectedRemovedNames) +
        " but received " +
        JSON.stringify(actual.removedParameterNames) +
        "."
      );
    }
  }

  if (Array.isArray(expected.notesIncludes)) {
    expected.notesIncludes.forEach(function ensureNoteIsPresent(expectedNoteFragment) {
      if (notesText.indexOf(expectedNoteFragment) === -1) {
        failures.push("Expected notes to include " + JSON.stringify(expectedNoteFragment) + " but received " + JSON.stringify(actual.notes) + ".");
      }
    });
  }

  if (Array.isArray(expected.diagnosticsIncludes)) {
    expected.diagnosticsIncludes.forEach(function ensureDiagnosticIsPresent(expectedDiagnosticFragment) {
      if (diagnosticsText.indexOf(expectedDiagnosticFragment) === -1) {
        failures.push(
          "Expected diagnostics to include " +
          JSON.stringify(expectedDiagnosticFragment) +
          " but received " +
          JSON.stringify(actual.diagnostics) +
          "."
        );
      }
    });
  }

  if (typeof expected.errorsCount === "number" && actual.errors.length !== expected.errorsCount) {
    failures.push("Expected errorsCount " + String(expected.errorsCount) + " but received " + String(actual.errors.length) + ".");
  }

  return failures;
}

function buildDebugDiff(expected, actual, failures) {
  return {
    failures: failures.slice(),
    expected: {
      itemCount: typeof expected.itemCount === "number" ? expected.itemCount : null,
      finalUrls: Array.isArray(expected.finalUrls) ? expected.finalUrls.slice() : [],
      displayType: typeof expected.displayType === "string" ? expected.displayType : "",
      removedParameterNames: Array.isArray(expected.removedParameterNames) ? expected.removedParameterNames.slice() : [],
      notesIncludes: Array.isArray(expected.notesIncludes) ? expected.notesIncludes.slice() : []
    },
    actual: {
      itemCount: actual.itemCount,
      finalUrls: actual.finalUrls.slice(),
      displayType: actual.displayType,
      removedParameterNames: actual.removedParameterNames.slice(),
      notes: actual.notes.slice()
    }
  };
}

function runPipelineCase(caseDefinition) {
  const analysisResult = pipeline.analyzeInput({
    rawText: caseDefinition.input,
    sourceHtml: caseDefinition.sourceHtml || "",
    options: caseDefinition.options || {}
  });
  const actual = collectPipelineActual(caseDefinition, analysisResult);
  const expectation = caseDefinition.mode === "rebuild-target" ? caseDefinition.targetExpected : caseDefinition.expected;
  const failures = compareExpected(expectation, actual);
  const debugDiff = failures.length
    ? buildDebugDiff(expectation, actual, failures)
    : null;

  return finalizeResultStatus({
    id: caseDefinition.id,
    title: caseDefinition.title,
    mode: caseDefinition.mode,
    expectedStatus: caseDefinition.expectedStatus,
    sectionId: caseDefinition.sectionId,
    sectionTitle: caseDefinition.sectionTitle,
    expected: caseDefinition.expected || null,
    targetExpected: caseDefinition.targetExpected || null,
    actual: actual,
    failures: failures,
    debugDiff: debugDiff
  });
}

function runDebugRedactionRegression() {
  const sanitized = redaction.sanitizeDetails({
    sourceHtml: "<p>secret</p>",
    safe: "ok",
    nested: {
      rawText: "secret",
      keep: "value"
    }
  }, 0);

  const actual = {
    sourceHtml: sanitized.sourceHtml,
    nestedRawText: sanitized && sanitized.nested ? sanitized.nested.rawText : "",
    safe: sanitized.safe
  };
  const failures = [];

  if (actual.sourceHtml !== "[redacted]") {
    failures.push("Expected sourceHtml to be redacted but received " + JSON.stringify(actual.sourceHtml) + ".");
  }

  if (actual.nestedRawText !== "[redacted]") {
    failures.push("Expected nested.rawText to be redacted but received " + JSON.stringify(actual.nestedRawText) + ".");
  }

  if (actual.safe !== "ok") {
    failures.push("Expected safe field to remain visible but received " + JSON.stringify(actual.safe) + ".");
  }

  return {
    id: "module-debug-redaction",
    title: "Debug redaction sanitizes raw fields",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      sourceHtml: "[redacted]",
      nestedRawText: "[redacted]",
      safe: "ok"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runDebugHelperGatingRegression() {
  const debugConfigSource = fs.readFileSync(debugConfigScriptPath, "utf8");
  const debugSource = fs.readFileSync(debugScriptPath, "utf8");
  const sentMessages = [];
  let storageListener = null;
  const sandbox = {
    urlForensicsDebugRedaction: redaction,
    browser: {
      runtime: {
        sendMessage: function sendMessage(message) {
          sentMessages.push(message);
          return Promise.resolve({ ok: true });
        }
      },
      storage: {
        local: {
          get: function getStoredDebugConfig() {
            return Promise.resolve({
              programDebugConfig: {
                level: "off",
                categories: {}
              }
            });
          }
        },
        onChanged: {
          addListener: function addDebugStorageListener(listener) {
            storageListener = listener;
          }
        }
      }
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;

  vm.runInNewContext(debugConfigSource, sandbox, { filename: debugConfigScriptPath });
  vm.runInNewContext(debugSource, sandbox, { filename: debugScriptPath });

  const debugApi = sandbox.mergedLinkLabDebug;
  const offResult = debugApi.runtime("debug off runtime event");
  debugApi.applyConfig({
    level: "trace",
    categories: {
      runtime: true,
      variable: false
    }
  });
  const runtimeResult = debugApi.runtime("debug enabled runtime event");
  debugApi.variable("debug disabled variable event");

  if (typeof storageListener === "function") {
    storageListener({
      programDebugConfig: {
        newValue: {
          level: "trace",
          categories: {
            variable: true
          }
        }
      }
    }, "local");
  }

  const variableResult = debugApi.variable("debug enabled variable event");
  const actual = {
    offResultIsNull: offResult === null,
    runtimeResultSent: !!runtimeResult,
    variableResultSent: !!variableResult,
    sentMessageCount: sentMessages.length,
    sentMessages: sentMessages.map(function mapSentDebugMessage(message) {
      return message && message.event ? message.event.message : "";
    })
  };
  const failures = [];

  if (
    actual.offResultIsNull !== true ||
    actual.runtimeResultSent !== true ||
    actual.variableResultSent !== true ||
    !arrayEquals(actual.sentMessages, ["debug enabled runtime event", "debug enabled variable event"])
  ) {
    failures.push("Expected debug helper to avoid runtime.sendMessage while debugging is off or while a category is disabled.");
  }

  return {
    id: "module-debug-helper-gating",
    title: "Debug helper gates content-script debug sends by saved debug config",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      offResultIsNull: true,
      sentMessages: ["debug enabled runtime event", "debug enabled variable event"]
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runExtensionPageDomContractRegression() {
  const extensionDirectoryPath = path.resolve(__dirname, "..", "lab", "firefox-extension");
  const pageNames = ["diagnostics", "storage", "tracking-parameters", "settings", "debugging", "test-suite", "sample-review", "popup"];
  const actual = pageNames.map(function inspectExtensionPage(pageName) {
    const htmlPath = path.join(extensionDirectoryPath, pageName + ".html");
    const scriptPath = path.join(extensionDirectoryPath, pageName + ".js");
    const htmlSource = fs.readFileSync(htmlPath, "utf8");
    const scriptSource = fs.readFileSync(scriptPath, "utf8");
    const htmlIds = new Set(Array.from(htmlSource.matchAll(/id="([^"]+)"/g), function mapHtmlId(matchRecord) {
      return matchRecord[1];
    }));
    const scriptIds = Array.from(scriptSource.matchAll(/getElementById\("([^"]+)"\)/g), function mapScriptId(matchRecord) {
      return matchRecord[1];
    });
    const missingIds = Array.from(new Set(scriptIds.filter(function keepMissingId(idValue) {
      return !htmlIds.has(idValue);
    })));

    return {
      page: pageName,
      missingIds: missingIds
    };
  });
  const failures = actual
    .filter(function keepPageWithMissingIds(pageResult) {
      return pageResult.missingIds.length > 0;
    })
    .map(function formatMissingIdsFailure(pageResult) {
      return (
        "Expected extension page script " +
        JSON.stringify(pageResult.page + ".js") +
        " to reference only live DOM ids, but it still references " +
        JSON.stringify(pageResult.missingIds) +
        "."
      );
    });

  return {
    id: "module-extension-page-dom-contract",
    title: "Extension page scripts reference only live page DOM ids",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      pages: pageNames.slice(),
      missingIds: []
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPageFactoryRegression() {
  const pageUi = {
    setStatusText: function setStatusText() {},
    setBadgeText: function setBadgeText() {}
  };
  const debugApi = {
    marker: "debug"
  };
  const runtime = pageRuntime.create({
    extensionApi: {
      runtime: {
        getURL: function getURL() {
          return "settings.html";
        }
      }
    },
    pageUi: pageUi,
    debugApi: debugApi,
    requirePageUi: true
  });
  const dependencies = pageDependencies.create({
    storageModel: {
      storageKeys: {
        enableUrlNormalizationRepair: "enableUrlNormalizationRepair"
      }
    },
    detectorCatalog: {
      buildCatalog: function buildCatalog() {
        return {};
      }
    },
    diagnosticsCatalogRows: {
      create: function create() {
        return {};
      }
    },
    diagnosticsHealthData: {
      generatedAt: "2026-04-09T00:00:00.000Z"
    },
    settingsOpener: {
      openSettingsPage: async function openSettingsPage() {}
    },
    debugRedaction: {
      sanitizeDetails: function sanitizeDetails(details) {
        return details;
      }
    },
    testSuiteData: {
      sections: []
    },
    inboxFixtureData: [{
      providerId: "gmail"
    }],
    sampleReviewData: {
      textSamples: []
    },
    required: ["storageModel", "detectorCatalog", "diagnosticsCatalogRows", "diagnosticsHealthData", "settingsOpener", "debugRedaction", "testSuiteData", "inboxFixtureData", "sampleReviewData"]
  });
  let missingDependencyError = "";

  try {
    pageDependencies.create({
      globalScope: {},
      required: ["storageModel"]
    });
  } catch (error) {
    missingDependencyError = error && error.message ? error.message : "";
  }

  const actual = {
    hasExtensionApi: !!runtime.extensionApi,
    pageUiIsPreserved: runtime.pageUi === pageUi,
    debugApiMarker: runtime.debugApi ? runtime.debugApi.marker : "",
    hasStorageModel: !!dependencies.storageModel,
    hasDetectorCatalog: !!dependencies.detectorCatalog,
    hasDiagnosticsCatalogRows: !!dependencies.diagnosticsCatalogRows,
    hasDiagnosticsHealthData: !!dependencies.diagnosticsHealthData,
    hasSettingsOpener: !!dependencies.settingsOpener,
    hasDebugRedaction: !!dependencies.debugRedaction,
    hasTestSuiteData: !!dependencies.testSuiteData,
    hasInboxFixtureData: !!dependencies.inboxFixtureData,
    hasSampleReviewData: !!dependencies.sampleReviewData,
    missingDependencyError: missingDependencyError
  };
  const failures = [];

  if (!actual.hasExtensionApi || !actual.pageUiIsPreserved || actual.debugApiMarker !== "debug") {
    failures.push("Expected page runtime factory to preserve injected extension, UI, and debug dependencies.");
  }

  if (
    !actual.hasStorageModel ||
    !actual.hasDetectorCatalog ||
    !actual.hasDiagnosticsCatalogRows ||
    !actual.hasDiagnosticsHealthData ||
    !actual.hasSettingsOpener ||
    !actual.hasDebugRedaction ||
    !actual.hasTestSuiteData ||
    !actual.hasInboxFixtureData ||
    !actual.hasSampleReviewData
  ) {
    failures.push("Expected page dependency factory to preserve injected page dependencies.");
  }

  if (actual.missingDependencyError !== "URL Forensics storage model is unavailable.") {
    failures.push(
      "Expected page dependency factory to throw a readable missing dependency error, but received " +
      JSON.stringify(actual.missingDependencyError) +
      "."
    );
  }

  return {
    id: "module-page-factories",
    title: "Page runtime and dependency factories centralize extension-page helper resolution",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      hasExtensionApi: true,
      pageUiIsPreserved: true,
      debugApiMarker: "debug",
      missingDependencyError: "URL Forensics storage model is unavailable."
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runExtensionPageHelperCouplingRegression() {
  const extensionDirectoryPath = path.resolve(__dirname, "..", "lab", "firefox-extension");
  const pageScriptNames = ["app", "diagnostics", "storage", "settings", "tracking-parameters", "debugging", "popup", "test-suite", "sample-review"];
  const forbiddenHelperGlobals = [
    "globalThis.urlForensicsPageUi",
    "globalThis.urlForensicsStorageModel",
    "globalThis.urlForensicsDetectorCatalog",
    "globalThis.urlForensicsDiagnosticsCatalogRows",
    "globalThis.urlForensicsDiagnosticsHealthData",
    "globalThis.urlForensicsSettingsOpener",
    "globalThis.urlForensicsDebugRedaction",
    "globalThis.urlForensicsTestSuiteData",
    "globalThis.urlForensicsInboxFixtureData",
    "globalThis.urlForensicsSampleReviewData",
    "globalThis.mergedLinkLabDebug"
  ];
  const actual = pageScriptNames.map(function inspectPageScript(pageScriptName) {
    const scriptPath = path.join(extensionDirectoryPath, pageScriptName + ".js");
    const scriptSource = fs.readFileSync(scriptPath, "utf8");
    const forbiddenMatches = forbiddenHelperGlobals.filter(function keepForbiddenHelperGlobal(helperGlobalName) {
      return scriptSource.indexOf(helperGlobalName) !== -1;
    });

    return {
      script: pageScriptName + ".js",
      forbiddenMatches: forbiddenMatches
    };
  });
  const failures = actual
    .filter(function keepScriptWithForbiddenMatches(scriptResult) {
      return scriptResult.forbiddenMatches.length > 0;
    })
    .map(function formatForbiddenMatchFailure(scriptResult) {
      return (
        "Expected extension page script " +
        JSON.stringify(scriptResult.script) +
        " to use page runtime/dependency factories instead of direct helper globals, but it still references " +
        JSON.stringify(scriptResult.forbiddenMatches) +
        "."
      );
    });

  return {
    id: "module-extension-page-helper-coupling",
    title: "Extension page scripts avoid direct helper-global coupling",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      scripts: pageScriptNames.map(function mapPageScriptName(pageScriptName) {
        return pageScriptName + ".js";
      }),
      forbiddenMatches: []
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runWorkbenchAppSanitizerRegression() {
  const appSource = fs.readFileSync(appScriptPath, "utf8");
  const actual = {
    removesInlineStyleAttributes: appSource.includes('attributeName === "style"'),
    removesSrcsetAttributes: appSource.includes('attributeName === "srcset"'),
    removesRemoteMediaNodes: appSource.includes("img, picture, source, video, audio, track, canvas, svg, math"),
    stripsUnsafeUrlSchemes:
      appSource.includes("/^javascript:/i.test(normalizedLowerValue)") &&
      appSource.includes("/^data:/i.test(normalizedLowerValue)") &&
      appSource.includes("/^blob:/i.test(normalizedLowerValue)") &&
      appSource.includes("/^file:/i.test(normalizedLowerValue)"),
    preservesAnchorHrefOnly: appSource.includes('attributeName === "href"') && appSource.includes('elementTagName === "a"'),
    copyButtonsResolveConcreteTargets:
      appSource.includes('const targetElement = document.getElementById(targetId);') &&
      appSource.includes("if (!targetId)") &&
      appSource.includes("if (!targetElement)") &&
      appSource.includes("copyElementRichThenPlain(targetElement);"),
    debugsOriginalBackupSourceSelection:
      appSource.includes("workbench editor source selected from snapshot") &&
      appSource.includes('source: originalBackup ? "originalEmailBackup" : "snapshot"')
  };
  const failures = [];

  if (!actual.removesInlineStyleAttributes) {
    failures.push("Expected workbench app sanitizer to remove inline style attributes so pasted email HTML cannot trigger extension-page style-src-attr CSP errors.");
  }

  if (!actual.removesSrcsetAttributes) {
    failures.push("Expected workbench app sanitizer to remove srcset-style resource attributes so pasted email HTML cannot trigger remote asset fetches.");
  }

  if (!actual.removesRemoteMediaNodes) {
    failures.push("Expected workbench app sanitizer to remove remote media nodes from pasted HTML before rendering inside the extension page.");
  }

  if (!actual.stripsUnsafeUrlSchemes) {
    failures.push("Expected workbench app sanitizer to strip unsafe URL schemes from pasted HTML attributes.");
  }

  if (!actual.preservesAnchorHrefOnly) {
    failures.push("Expected workbench app sanitizer to preserve navigational href values only for anchor tags.");
  }

  if (!actual.copyButtonsResolveConcreteTargets) {
    failures.push("Expected workbench app copy-button binding to resolve concrete target elements and skip empty or missing ids before invoking ComponentKit copy helpers.");
  }

  if (!actual.debugsOriginalBackupSourceSelection) {
    failures.push("Expected workbench app snapshot application to debug whether the editor source came from the original backup.");
  }

  return {
    id: "module-workbench-app-sanitizer",
    title: "Workbench app sanitizer strips inline styles and remote-loading HTML from pasted email content",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      removesInlineStyleAttributes: true,
      removesSrcsetAttributes: true,
      removesRemoteMediaNodes: true,
      stripsUnsafeUrlSchemes: true,
      preservesAnchorHrefOnly: true,
      copyButtonsResolveConcreteTargets: true,
      debugsOriginalBackupSourceSelection: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runComponentKitEmptyIdGuardRegression() {
  const componentKitSource = fs.readFileSync(componentKitScriptPath, "utf8");
  const actual = {
    resolveElementTargetGuardsEmptyString:
      componentKitSource.includes('const normalizedTarget = String(target || "").trim();') &&
      componentKitSource.includes("if (!normalizedTarget)") &&
      componentKitSource.includes("return null;"),
    byIdGuardsEmptyString:
      componentKitSource.includes('const normalizedId = String(id || "").trim();') &&
      componentKitSource.includes("return normalizedId ? document.getElementById(normalizedId) : null;")
  };
  const failures = [];

  if (!actual.resolveElementTargetGuardsEmptyString) {
    failures.push("Expected ComponentKit resolveElementTarget to guard empty string ids before calling document.getElementById.");
  }

  if (!actual.byIdGuardsEmptyString) {
    failures.push("Expected ComponentKit.byId to guard empty string ids before calling document.getElementById.");
  }

  return {
    id: "module-component-kit-empty-id-guard",
    title: "ComponentKit guards empty element ids before calling getElementById",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      resolveElementTargetGuardsEmptyString: true,
      byIdGuardsEmptyString: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPageNavigationMobileVisibilityRegression() {
  function createNavigationButton(pageHref) {
    const attributes = {
      "data-page-href": pageHref
    };

    return {
      disabled: false,
      hidden: false,
      getAttribute: function getAttribute(attributeName) {
        return Object.prototype.hasOwnProperty.call(attributes, attributeName) ? attributes[attributeName] : "";
      },
      setAttribute: function setAttribute(attributeName, value) {
        attributes[attributeName] = String(value);
      }
    };
  }

  const navigationButtons = [
    createNavigationButton("./settings.html"),
    createNavigationButton("./tracking-parameters.html"),
    createNavigationButton("./test-suite.html"),
    createNavigationButton("./sample-review.html"),
    createNavigationButton("./diagnostics.html"),
    createNavigationButton("./debugging.html"),
    createNavigationButton("./storage.html"),
    createNavigationButton("./help.html"),
    createNavigationButton("./about.html")
  ];
  const mobileDeviceSource = fs.readFileSync(mobileDeviceScriptPath, "utf8");
  const pageNavigationSource = fs.readFileSync(pageNavigationScriptPath, "utf8");
  const sandbox = {
    document: {
      addEventListener: function addEventListener() {},
      querySelectorAll: function querySelectorAll(selector) {
        return selector === "button[data-page-href]" ? navigationButtons.slice() : [];
      }
    },
    window: {
      location: {
        href: "settings.html"
      },
      matchMedia: function matchMedia(mediaQuery) {
        return {
          matches: /\bpointer:\s*coarse\b/.test(mediaQuery) || /\bhover:\s*none\b/.test(mediaQuery)
        };
      },
      innerWidth: 390,
      innerHeight: 844,
      screen: {
        width: 390,
        height: 844,
        availWidth: 390,
        availHeight: 844
      }
    },
    navigator: {
      maxTouchPoints: 5,
      userAgent: "Mozilla/5.0 Mobile",
      platform: "Android"
    }
  };
  sandbox.globalThis = sandbox;

  vm.runInNewContext(mobileDeviceSource, sandbox, { filename: mobileDeviceScriptPath });
  vm.runInNewContext(pageNavigationSource, sandbox, { filename: pageNavigationScriptPath });

  const hiddenHrefs = navigationButtons.filter(function keepHiddenButton(button) {
    return button.hidden === true;
  }).map(function mapHiddenButton(button) {
    return button.getAttribute("data-page-href");
  });
  const visibleHrefs = navigationButtons.filter(function keepVisibleButton(button) {
    return button.hidden !== true;
  }).map(function mapVisibleButton(button) {
    return button.getAttribute("data-page-href");
  });
  const actual = {
    mobileDetected: sandbox.urlForensicsPageNavigation.isMobileDeviceDetected(),
    hiddenHrefs: hiddenHrefs,
    visibleHrefs: visibleHrefs,
    hiddenButtonDisabled: navigationButtons
      .filter(function keepMobileHiddenTarget(button) {
        return hiddenHrefs.indexOf(button.getAttribute("data-page-href")) !== -1;
      })
      .every(function everyHiddenButtonDisabled(button) {
        return button.disabled === true && button.getAttribute("aria-hidden") === "true";
      }),
    settingsVisible: navigationButtons[0].hidden === false
  };
  const failures = [];

  if (actual.mobileDetected !== true) {
    failures.push("Expected page navigation mobile detector to identify the mobile test viewport.");
  }

  if (!arrayEquals(actual.hiddenHrefs, ["./test-suite.html", "./sample-review.html", "./debugging.html", "./help.html"])) {
    failures.push("Expected mobile page navigation to hide only Test Suite, Samples, Debugging, and Help links.");
  }

  if (!actual.hiddenButtonDisabled || !actual.settingsVisible) {
    failures.push("Expected mobile-hidden page navigation buttons to be disabled and ordinary page links to remain visible.");
  }

  return {
    id: "module-page-navigation-mobile-visibility",
    title: "Page navigation hides support/developer links on mobile devices",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      mobileDetected: true,
      hiddenHrefs: ["./test-suite.html", "./sample-review.html", "./debugging.html", "./help.html"],
      settingsVisible: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runBackgroundMobileToolbarActionRegression() {
  const setPopupCalls = [];
  const setTitleCalls = [];
  const createdWindows = [];
  const createdTabs = [];
  let toolbarActionClickListener = null;
  const debugConfigSource = fs.readFileSync(debugConfigScriptPath, "utf8");
  const backgroundSource = fs.readFileSync(backgroundScriptPath, "utf8");
  const sandbox = {
    browser: {
      action: {
        onClicked: {
          addListener: function addListener(listener) {
            toolbarActionClickListener = listener;
          }
        },
        setPopup: async function setPopup(options) {
          setPopupCalls.push(options || {});
        },
        setTitle: function setTitle(options) {
          setTitleCalls.push(options || {});
        }
      },
      runtime: {
        getPlatformInfo: async function getPlatformInfo() {
          return { os: "android" };
        },
        getURL: function getURL(pagePath) {
          return "moz-extension://url-forensics/" + pagePath;
        },
        onMessage: {
          addListener: function addListener() {}
        }
      },
      storage: {
        local: {
          get: async function get() {
            return {};
          }
        }
      },
      tabs: {
        create: async function create(options) {
          createdTabs.push(options || {});
        },
        onActivated: {
          addListener: function addListener() {}
        },
        onUpdated: {
          addListener: function addListener() {}
        },
        onRemoved: {
          addListener: function addListener() {}
        }
      },
      windows: {
        create: async function create(options) {
          createdWindows.push(options || {});
        },
        getAll: async function getAll() {
          return [];
        },
        onFocusChanged: {
          addListener: function addListener() {}
        }
      }
    },
    console: {
      error: function error() {}
    },
    urlForensicsDebugRedaction: {
      sanitizeDetails: function sanitizeDetails(details) {
        return details;
      }
    }
  };
  sandbox.globalThis = sandbox;

  vm.runInNewContext(debugConfigSource, sandbox, { filename: debugConfigScriptPath });
  vm.runInNewContext(backgroundSource, sandbox, { filename: backgroundScriptPath });
  await new Promise(function waitForBootstrap(resolve) {
    setImmediate(resolve);
  });
  await new Promise(function waitForPopupSync(resolve) {
    setImmediate(resolve);
  });

  if (typeof toolbarActionClickListener === "function") {
    toolbarActionClickListener();
    await new Promise(function waitForToolbarClick(resolve) {
      setImmediate(resolve);
    });
  }

  const actual = {
    hasToolbarActionClickListener: typeof toolbarActionClickListener === "function",
    setPopupCalls: setPopupCalls,
    popupClearedOnMobile: setPopupCalls.some(function hasClearedPopup(call) {
      return call && call.popup === "";
    }),
    createdWindows: createdWindows,
    createdTabs: createdTabs,
    latestToolbarTitle: setTitleCalls.length ? setTitleCalls[setTitleCalls.length - 1].title : ""
  };
  const failures = [];

  if (!actual.hasToolbarActionClickListener) {
    failures.push("Expected background script to register a toolbar action click listener.");
  }

  if (!actual.popupClearedOnMobile) {
    failures.push("Expected background script to clear the action popup on Android so action clicks are delivered.");
  }

  if (createdWindows.length !== 1 || createdWindows[0].url !== "moz-extension://url-forensics/popup.html" || createdWindows[0].type !== "normal") {
    failures.push("Expected mobile toolbar action click to open popup.html as a normal standalone extension window.");
  }

  if (createdTabs.length !== 0) {
    failures.push("Expected the window opener to be preferred over the tab fallback when windows.create is available.");
  }

  if (!/full page/.test(actual.latestToolbarTitle)) {
    failures.push("Expected mobile toolbar title to describe the full-page control surface instead of a browser popup.");
  }

  return {
    id: "module-background-mobile-toolbar-action",
    title: "Background opens popup content as a standalone page on mobile toolbar clicks",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      popupClearedOnMobile: true,
      popupPageUrl: "moz-extension://url-forensics/popup.html",
      popupPageType: "normal"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runSettingsOpenerRegression() {
  const recordedCalls = [];
  const response = await settingsOpener.openSettingsPage({
    runtime: {
      sendMessage: async function sendMessage(message) {
        recordedCalls.push(message.type);
        return { ok: true };
      },
      openOptionsPage: async function openOptionsPage() {
        recordedCalls.push("openOptionsPage");
      },
      getURL: function getURL() {
        return "settings.html";
      }
    }
  });

  const actual = {
    ok: !!(response && response.ok),
    calls: recordedCalls.slice()
  };
  const failures = [];

  if (!actual.ok) {
    failures.push("Expected openSettingsPage to return ok=true.");
  }

  if (!arrayEquals(actual.calls, ["merged-link-lab:open-settings-page"])) {
    failures.push(
      "Expected runtime calls " +
      JSON.stringify(["merged-link-lab:open-settings-page"]) +
      " but received " +
      JSON.stringify(actual.calls) +
      "."
    );
  }

  return {
    id: "module-settings-opener",
    title: "Settings opener prefers runtime messaging path",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      ok: true,
      calls: ["merged-link-lab:open-settings-page"]
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPluginRegistryRegression() {
  const pluginPacks = pipelinePluginRegistry.listPluginPacks();
  const resolvedConfig = pipelinePluginRegistry.getResolvedConfig();
  const actual = {
    pluginPackIds: pluginPacks.map(function mapPluginPackId(pluginPack) {
      return pluginPack.id;
    }),
    tracksUtmSource: trackingParameterModel.matchesTrackingParameterName(
      trackingParameterModel.defaultTrackingParameterFilters,
      "utm_source"
    ),
    keepsEmailParameter: trackingParameterModel.matchesTrackingParameterName(
      trackingParameterModel.defaultTrackingParameterFilters,
      "email"
    ),
    classificationTypes: ((resolvedConfig.classification && resolvedConfig.classification.hostRules) || []).map(function mapHostRule(rule) {
      return rule.type;
    }),
    repairTransformIds: ((resolvedConfig.repair && resolvedConfig.repair.peelTransforms) || []).map(function mapRepairTransform(transform) {
      return transform.id;
    })
  };
  const failures = [];

  if (actual.pluginPackIds.indexOf("builtin-default") === -1) {
    failures.push("Expected builtin-default plugin pack to be registered.");
  }

  if (actual.tracksUtmSource !== true) {
    failures.push("Expected declarative tracking model to match utm_source.");
  }

  if (actual.keepsEmailParameter !== false) {
    failures.push("Expected declarative tracking model to leave email untracked.");
  }

  ["publisher", "newsletter", "tracker"].forEach(function ensureClassificationTypePresent(expectedType) {
    if (actual.classificationTypes.indexOf(expectedType) === -1) {
      failures.push("Expected classification rules to include " + JSON.stringify(expectedType) + ".");
    }
  });

  if (actual.repairTransformIds.indexOf("repair-single-protocol-slash") === -1) {
    failures.push("Expected repair transforms to include single-slash protocol recovery.");
  }

  return {
    id: "module-plugin-registry",
    title: "Declarative plugin registry exposes default rule pack",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      pluginPackIdsIncludes: ["builtin-default"],
      tracksUtmSource: true,
      keepsEmailParameter: false
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runDetectorRegistryRegression() {
  const parityReport = detectorParity.buildDetectorParityReport();

  return {
    id: "module-detector-registry",
    title: "Detector registry keeps regex and tokenizer detectors in parity",
    mode: "active",
    status: parityReport.failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: parityReport.expected,
    targetExpected: null,
    actual: parityReport.actual,
    failures: parityReport.failures
  };
}

function runPipelineDetectionRegression() {
  const detectorRegistry = pipelineDetectorRegistry.create({
    pipelineBase: pipelineBase
  });
  const fallbackDetection = pipelineDetection.create({
    globalScope: null,
    pipelineBase: pipelineBase,
    detectorRegistry: detectorRegistry,
    debugApi: null
  });
  const domAnchorNode = {
    nodeType: 1,
    tagName: "A",
    getAttribute: function getAttribute(attributeName) {
      return attributeName === "href" ? "https://example.com/from-anchor?utm_source=anchor" : "";
    }
  };
  const domTextNode = {
    nodeType: 3,
    nodeValue: "Visit https://example.com/from-text?utm_source=text",
    parentElement: {
      tagName: "DIV"
    }
  };
  const domProtectedTextNode = {
    nodeType: 3,
    nodeValue: "https://example.com/ignored",
    parentElement: {
      tagName: "SCRIPT"
    }
  };
  const domNodes = [domAnchorNode, domTextNode, domProtectedTextNode];
  let domNodeIndex = 0;
  const domRoot = {
    nodeType: 1,
    tagName: "DIV",
    ownerDocument: {
      createTreeWalker: function createTreeWalker() {
        domNodeIndex = 0;
        return {
          nextNode: function nextNode() {
            const nextNodeValue = domNodes[domNodeIndex] || null;
            domNodeIndex += 1;
            return nextNodeValue;
          }
        };
      }
    }
  };
  const domDetection = pipelineDetection.create({
    globalScope: {
      NodeFilter: {
        SHOW_ELEMENT: 1,
        SHOW_TEXT: 4
      },
      Node: {
        ELEMENT_NODE: 1,
        TEXT_NODE: 3
      },
      DOMParser: function DOMParser() {
        this.parseFromString = function parseFromString() {
          return {
            body: domRoot,
            documentElement: domRoot
          };
        };
      }
    },
    pipelineBase: pipelineBase,
    detectorRegistry: detectorRegistry,
    debugApi: null
  });

  const textDetectedItems = fallbackDetection.detectURLs(
    "Primary https://example.com/plain and mailto:debugger@example.com",
    { startId: 5 }
  );
  const fallbackHtmlDetectedItems = fallbackDetection.detectUrlsFromHtml(
    "<div><a href=\"https://example.com/anchor?utm_source=fallback\">Anchor</a> https://example.com/text?utm_source=fallback</div>",
    {}
  );
  const domHtmlDetectedItems = domDetection.detectUrlsFromHtml("<div>dom</div>", {});
  const actual = {
    textDetectedIds: textDetectedItems.map(function mapDetectedId(item) {
      return item.id;
    }),
    textDetectorIds: textDetectedItems.map(function mapDetectorIds(item) {
      return item.detectorIds.join(",");
    }),
    fallbackHtmlOriginals: fallbackHtmlDetectedItems.map(function mapOriginal(item) {
      return item.original;
    }),
    domHtmlOriginals: domHtmlDetectedItems.map(function mapOriginal(item) {
      return item.original;
    }),
    domHtmlCount: domHtmlDetectedItems.length
  };
  const failures = [];

  if (!arrayEquals(actual.textDetectedIds, [5, 6])) {
    failures.push("Expected pipeline detection to preserve startId sequencing for plain-text detection.");
  }

  if (!arrayEquals(actual.textDetectorIds, ["regex,tokenizer", "regex,tokenizer"])) {
    failures.push("Expected pipeline detection to preserve detector provenance on detected items.");
  }

  if (
    !arrayEquals(actual.fallbackHtmlOriginals, [
      "https://example.com/anchor?utm_source=fallback",
      "https://example.com/text?utm_source=fallback"
    ])
  ) {
    failures.push("Expected pipeline detection fallback HTML mode to collect anchor hrefs and plain-text URLs.");
  }

  if (
    !arrayEquals(actual.domHtmlOriginals, [
      "https://example.com/from-anchor?utm_source=anchor",
      "https://example.com/from-text?utm_source=text"
    ]) ||
    actual.domHtmlCount !== 2
  ) {
    failures.push("Expected pipeline detection DOM mode to walk anchor and text nodes while skipping protected-tag text.");
  }

  return {
    id: "module-pipeline-detection",
    title: "Pipeline detection module preserves text, fallback HTML, and DOM HTML detection behavior",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      textDetectedIds: [5, 6],
      textDetectorIds: ["regex,tokenizer", "regex,tokenizer"],
      fallbackHtmlOriginals: [
        "https://example.com/anchor?utm_source=fallback",
        "https://example.com/text?utm_source=fallback"
      ],
      domHtmlOriginals: [
        "https://example.com/from-anchor?utm_source=anchor",
        "https://example.com/from-text?utm_source=text"
      ]
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPipelineResolutionRegression() {
  const urlResolver = pipelineUrlResolver.create(pipelineBase);
  const assembly = pipelineAssembly.create({
    pipelineBase: pipelineBase,
    urlResolver: urlResolver
  });
  const resolution = pipelineResolution.create({
    debugApi: null,
    pipelineBase: pipelineBase,
    urlResolver: urlResolver,
    pipelineAssembly: assembly
  });
  const bypassedItems = resolution.populateBypassedDataForItems([
    {
      id: 1,
      original: "debugger@example.com",
      notes: []
    }
  ]);
  const resolvedItems = resolution.populateResolvedDataForItems([
    {
      id: 2,
      original: "https://tracker.example.com/click?url=https%3A%2F%2Fexample.com%2Flanding%3Futm_source%3Dnews%26keep%3Dyes",
      notes: []
    }
  ], pipelineBase.defaultPipelineSettings);
  const repairBypassedItems = resolution.populateResolvedDataForItems([
    {
      id: 3,
      original: "https://example.com/offer?utm_campaign=spring&keep=yes",
      notes: []
    }
  ], {
    enableUrlNormalizationRepair: false,
    stripKnownTrackingParameters: true
  });
  const actual = {
    bypassedReplacementUrl: bypassedItems[0].replacementUrl,
    bypassedValidResolved: bypassedItems[0].validResolved.slice(),
    bypassedNotes: bypassedItems[0].notes.slice(),
    resolvedReplacementUrl: resolvedItems[0].replacementUrl,
    resolvedValidResolved: resolvedItems[0].validResolved.slice(),
    resolvedCleanupEntries: resolvedItems[0].trackerCleanupEntries.slice(),
    resolvedNotes: resolvedItems[0].notes.slice(),
    repairBypassedReplacementUrl: repairBypassedItems[0].replacementUrl,
    repairBypassedValidResolved: repairBypassedItems[0].validResolved.slice(),
    repairBypassedNotes: repairBypassedItems[0].notes.slice()
  };
  const failures = [];

  if (
    actual.bypassedReplacementUrl !== "mailto:debugger@example.com" ||
    !arrayEquals(actual.bypassedValidResolved, ["mailto:debugger@example.com"]) ||
    actual.bypassedNotes.indexOf("NORMALIZATION_REPAIR_BYPASSED") === -1
  ) {
    failures.push("Expected bypass resolution to normalize bare email addresses and annotate the bypass note.");
  }

  if (
    actual.resolvedReplacementUrl !== "https://example.com/landing?keep=yes" ||
    !arrayEquals(actual.resolvedValidResolved, ["https://example.com/landing?keep=yes"])
  ) {
    failures.push("Expected resolution to peel tracker wrappers and preserve the cleaned destination URL.");
  }

  if (
    actual.resolvedCleanupEntries.length !== 1 ||
    !arrayEquals(actual.resolvedCleanupEntries[0].removedParameterNames, ["utm_source"])
  ) {
    failures.push("Expected resolution to record tracking-parameter cleanup entries for cleaned destinations.");
  }

  if (actual.repairBypassedNotes.indexOf("NORMALIZATION_REPAIR_BYPASSED") === -1) {
    failures.push("Expected resolution to annotate disabled normalization repair during populated resolution.");
  }

  if (
    actual.repairBypassedReplacementUrl !== "https://example.com/offer?keep=yes" ||
    !arrayEquals(actual.repairBypassedValidResolved, ["https://example.com/offer?keep=yes"])
  ) {
    failures.push("Expected resolution to continue destination extraction and tracker stripping when repair is disabled.");
  }

  return {
    id: "module-pipeline-resolution",
    title: "Pipeline resolution module preserves bypass, cleanup, and disabled-repair behavior",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      bypassedReplacementUrl: "mailto:debugger@example.com",
      resolvedReplacementUrl: "https://example.com/landing?keep=yes",
      repairBypassedReplacementUrl: "https://example.com/offer?keep=yes"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runDetectorCatalogRegression() {
  const catalog = detectorCatalog && typeof detectorCatalog.buildCatalog === "function"
    ? detectorCatalog.buildCatalog()
    : null;
  const actual = {
    hasCatalog: !!catalog,
    urlDetectorIds: catalog && Array.isArray(catalog.urlDetectors)
      ? catalog.urlDetectors.map(function mapUrlDetectorId(detector) {
        return detector.id;
      })
      : [],
    inboxProviderIds: catalog && Array.isArray(catalog.inboxProviders)
      ? catalog.inboxProviders.map(function mapInboxProviderId(providerDefinition) {
        return providerDefinition.id;
      })
      : [],
    pluginPackIds: catalog && Array.isArray(catalog.pluginPacks)
      ? catalog.pluginPacks.map(function mapPluginPackId(pluginPack) {
        return pluginPack.id;
      })
      : [],
    urlTokenPattern: catalog && catalog.detectionRules ? catalog.detectionRules.urlTokenPattern : "",
    classificationRuleCount: catalog && Array.isArray(catalog.classificationRules) ? catalog.classificationRules.length : 0,
    repairTransformCount: catalog && Array.isArray(catalog.repairTransforms) ? catalog.repairTransforms.length : 0
  };
  const failures = [];

  if (!actual.hasCatalog) {
    failures.push("Expected detector catalog helper to initialize.");
  }

  if (!arrayEquals(actual.urlDetectorIds, ["regex", "tokenizer"])) {
    failures.push("Expected detector catalog URL detector ids to expose regex and tokenizer.");
  }

  if (!arrayEquals(actual.inboxProviderIds, ["gmail", "outlook", "yahoo", "proton", "hey", "fastmail"])) {
    failures.push("Expected detector catalog inbox provider ids to remain ordered and complete.");
  }

  if (!actual.pluginPackIds.length || actual.pluginPackIds.indexOf("builtin-default") === -1) {
    failures.push("Expected detector catalog to expose the built-in pipeline rule pack.");
  }

  if (actual.urlTokenPattern !== "/https?:\\/\\/[^\\s<>\"']+/gi") {
    failures.push("Expected detector catalog to expose the resolved URL token pattern.");
  }

  if (actual.classificationRuleCount < 3) {
    failures.push("Expected detector catalog to expose classification rules.");
  }

  if (actual.repairTransformCount < 7) {
    failures.push("Expected detector catalog to expose repair transforms.");
  }

  return {
    id: "module-detector-catalog",
    title: "Detector catalog exposes URL, inbox, and pipeline rule definitions",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      hasCatalog: true,
      urlDetectorIds: ["regex", "tokenizer"],
      inboxProviderIds: ["gmail", "outlook", "yahoo", "proton", "hey", "fastmail"],
      pluginPackIdsIncludes: ["builtin-default"],
      urlTokenPattern: "/https?:\\/\\/[^\\s<>\"']+/gi",
      classificationRuleCountAtLeast: 3,
      repairTransformCountAtLeast: 7
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runCatalogDriftRegression() {
  const driftReport = catalogDrift.create({
    pipelineBase: pipelineBase,
    pipelineDetectorRegistry: pipelineDetectorRegistry,
    pipelinePluginRegistry: pipelinePluginRegistry,
    inboxDetectorRegistry: inboxDetectorRegistry,
    detectorCatalog: detectorCatalog,
    diagnosticsCatalogRows: diagnosticsCatalogRows
  }).buildReport();

  return {
    id: "module-catalog-drift",
    title: "Detector, plugin-pack, and diagnostics catalogs stay aligned",
    mode: "active",
    status: driftReport.failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: driftReport.expected,
    targetExpected: null,
    actual: driftReport.actual,
    failures: driftReport.failures
  };
}

function runCatalogGoldenRegression() {
  let expectedDetectorCatalog = null;
  let expectedPipelineRulePack = null;
  let detectorCatalogReadError = "";
  let pipelineRulePackReadError = "";

  try {
    expectedDetectorCatalog = catalogGoldenFixtures.readGoldenFixture(catalogGoldenFixtures.detectorCatalogGoldenPath);
  } catch (error) {
    detectorCatalogReadError = error && error.message ? error.message : "unknown error";
  }

  try {
    expectedPipelineRulePack = catalogGoldenFixtures.readGoldenFixture(catalogGoldenFixtures.pipelineRulePackGoldenPath);
  } catch (error) {
    pipelineRulePackReadError = error && error.message ? error.message : "unknown error";
  }

  const actualDetectorCatalog = catalogGoldenFixtures.buildDetectorCatalogGoldenSnapshot();
  const actualPipelineRulePack = catalogGoldenFixtures.buildPipelineRulePackGoldenSnapshot();
  const detectorCatalogComparison = expectedDetectorCatalog
    ? catalogGoldenFixtures.compareGoldenFixture(expectedDetectorCatalog, actualDetectorCatalog)
    : { matches: false, firstDifferencePath: "" };
  const pipelineRulePackComparison = expectedPipelineRulePack
    ? catalogGoldenFixtures.compareGoldenFixture(expectedPipelineRulePack, actualPipelineRulePack)
    : { matches: false, firstDifferencePath: "" };
  const actual = {
    detectorCatalogGoldenPath: catalogGoldenFixtures.detectorCatalogGoldenPath,
    pipelineRulePackGoldenPath: catalogGoldenFixtures.pipelineRulePackGoldenPath,
    detectorCatalogReadError: detectorCatalogReadError,
    pipelineRulePackReadError: pipelineRulePackReadError,
    detectorCatalogMatches: detectorCatalogComparison.matches === true,
    detectorCatalogFirstDifferencePath: detectorCatalogComparison.firstDifferencePath || "",
    pipelineRulePackMatches: pipelineRulePackComparison.matches === true,
    pipelineRulePackFirstDifferencePath: pipelineRulePackComparison.firstDifferencePath || ""
  };
  const failures = [];

  if (detectorCatalogReadError) {
    failures.push(
      "Expected detector catalog golden fixture to be readable at " +
      JSON.stringify(catalogGoldenFixtures.detectorCatalogGoldenPath) +
      " but received " +
      JSON.stringify(detectorCatalogReadError) +
      "."
    );
  } else if (!actual.detectorCatalogMatches) {
    failures.push(
      "Expected detector catalog output to match the committed golden fixture. First difference: " +
      JSON.stringify(actual.detectorCatalogFirstDifferencePath) +
      ". Rebuild with `npm run rebuild:catalog-goldens` if the drift is intentional."
    );
  }

  if (pipelineRulePackReadError) {
    failures.push(
      "Expected pipeline rule-pack golden fixture to be readable at " +
      JSON.stringify(catalogGoldenFixtures.pipelineRulePackGoldenPath) +
      " but received " +
      JSON.stringify(pipelineRulePackReadError) +
      "."
    );
  } else if (!actual.pipelineRulePackMatches) {
    failures.push(
      "Expected resolved pipeline rule-pack output to match the committed golden fixture. First difference: " +
      JSON.stringify(actual.pipelineRulePackFirstDifferencePath) +
      ". Rebuild with `npm run rebuild:catalog-goldens` if the drift is intentional."
    );
  }

  return {
    id: "module-catalog-goldens",
    title: "Detector catalog and resolved pipeline rule packs match committed golden outputs",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      detectorCatalogMatches: true,
      pipelineRulePackMatches: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPipelineAssemblyRegression() {
  const assembly = pipelineAssembly.create({
    pipelineBase: pipelineBase,
    urlResolver: pipelineUrlResolver.create(pipelineBase)
  });
  const detectedItem = {
    id: 1,
    original: "https://tracker.example.com/click?url=https%3A%2F%2Fexample.com%2Flanding%3Futm_source%3Dnews%26keep%3Dyes",
    normalized: "https://tracker.example.com/click?url=https%3A%2F%2Fexample.com%2Flanding%3Futm_source%3Dnews%26keep%3Dyes",
    resolved: ["https://example.com/landing?utm_source=news&keep=yes"],
    validResolved: ["https://example.com/landing?keep=yes"],
    replacementUrl: "https://example.com/landing?keep=yes",
    notes: ["TRACKING_PARAMS_STRIPPED: utm_source"],
    trackerCleanupEntries: [
      {
        originalUrl: "https://example.com/landing?utm_source=news&keep=yes",
        cleanedUrl: "https://example.com/landing?keep=yes",
        removedParameterNames: ["utm_source"]
      }
    ]
  };
  const rawText = [
    "Daily Digest",
    detectedItem.original
  ].join("\n");
  const actual = {
    locatedLine: assembly.locateLineForOriginal(rawText, detectedItem.original, 0),
    nearbyTitle: assembly.findNearbyTitle(rawText.split("\n"), 1),
    finalUrls: assembly.getItemFinalUrls(detectedItem),
    displayType: assembly.getItemDisplayType(detectedItem),
    preferredReplacementUrl: assembly.getPreferredReplacementUrl(detectedItem),
    digestEntries: assembly.buildDigestEntries(rawText, [detectedItem], { useReplacementUrlOnly: true }),
    changedUrls: assembly.buildChangedUrls([detectedItem]),
    finalUrlEntries: assembly.buildFinalUrlEntries([detectedItem]),
    standaloneFinalUrls: assembly.buildStandaloneFinalUrls([detectedItem]),
    strippedTrackingResult: assembly.stripTrackingParametersFromResolvedUrls({
      id: 2,
      original: "https://example.com/offer?utm_campaign=spring&keep=yes",
      normalized: "https://example.com/offer?utm_campaign=spring&keep=yes",
      resolved: ["https://example.com/offer?utm_campaign=spring&keep=yes"],
      validResolved: [],
      replacementUrl: "",
      notes: [],
      trackerCleanupEntries: []
    }, pipelineBase.defaultPipelineSettings)
  };
  const failures = [];

  if (actual.locatedLine.lineIndex !== 1 || actual.locatedLine.nextStart <= 0) {
    failures.push("Expected pipeline assembly to locate original URLs within the source text.");
  }

  if (actual.nearbyTitle !== "Daily Digest") {
    failures.push("Expected pipeline assembly to recover the nearby digest title.");
  }

  if (
    !arrayEquals(actual.finalUrls, ["https://example.com/landing?keep=yes"]) ||
    actual.displayType !== "tracker cleaned" ||
    actual.preferredReplacementUrl !== "https://example.com/landing?keep=yes"
  ) {
    failures.push("Expected pipeline assembly to preserve final URL selection and tracker-cleaned display typing.");
  }

  if (
    actual.digestEntries.length !== 1 ||
    actual.digestEntries[0].title !== "Daily Digest" ||
    actual.digestEntries[0].host !== "example.com" ||
    actual.digestEntries[0].type !== "tracker cleaned"
  ) {
    failures.push("Expected pipeline assembly to build digest entries from nearby titles and replacement URLs.");
  }

  if (
    actual.changedUrls.length !== 1 ||
    actual.changedUrls[0].finalBaseUrl !== "https://example.com/landing" ||
    actual.finalUrlEntries.length !== 1 ||
    actual.finalUrlEntries[0].type !== "tracker cleaned" ||
    !arrayEquals(actual.standaloneFinalUrls, ["https://example.com/landing?keep=yes"])
  ) {
    failures.push("Expected pipeline assembly to build changed URLs, final URL entries, and standalone final URLs consistently.");
  }

  if (!arrayEquals(actual.strippedTrackingResult, ["https://example.com/offer?keep=yes"])) {
    failures.push("Expected pipeline assembly to strip known tracking parameters from resolved URLs.");
  }

  return {
    id: "module-pipeline-assembly",
    title: "Pipeline assembly module builds digest, changed, final, and tracker-cleaned outputs",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      nearbyTitle: "Daily Digest",
      finalUrls: ["https://example.com/landing?keep=yes"],
      displayType: "tracker cleaned",
      strippedTrackingResult: ["https://example.com/offer?keep=yes"]
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPipelineHtmlRewriterAnchorLookupRegression() {
  const anchorAttributes = {
    href: "https://example.com/landing?utm_source=news&keep=yes"
  };
  const anchorElement = {
    nodeType: 1,
    tagName: "A",
    textContent: "https://example.com/landing?utm_source=news&keep=yes",
    getAttribute: function getAttribute(attributeName) {
      return Object.prototype.hasOwnProperty.call(anchorAttributes, attributeName)
        ? anchorAttributes[attributeName]
        : "";
    },
    setAttribute: function setAttribute(attributeName, value) {
      anchorAttributes[attributeName] = String(value);
    }
  };
  const fakeDocument = {
    createTreeWalker: function createTreeWalker() {
      return {
        nextNode: function nextNode() {
          return null;
        }
      };
    }
  };
  const rootNode = {
    ownerDocument: fakeDocument,
    querySelectorAll: function querySelectorAll(selector) {
      return selector === "a[href]" ? [anchorElement] : [];
    }
  };
  Object.defineProperty(rootNode, "innerHTML", {
    get: function getInnerHTML() {
      const dataAttribute = anchorAttributes["data-merged-link-lab"]
        ? ' data-merged-link-lab="' + anchorAttributes["data-merged-link-lab"] + '"'
        : "";
      return '<a href="' + anchorAttributes.href + '"' + dataAttribute + ">" + anchorElement.textContent + "</a>";
    }
  });
  fakeDocument.body = rootNode;
  fakeDocument.documentElement = rootNode;

  const urlResolver = pipelineUrlResolver.create(pipelineBase);
  const htmlRewriter = pipelineHtmlRewriterFactory.create({
    pipelineBase: Object.assign({}, pipelineBase, {
      createHtmlParserDocument: function createHtmlParserDocument() {
        return fakeDocument;
      }
    }),
    urlResolver: urlResolver,
    detectTokenMatches: function detectTokenMatches() {
      return [];
    },
    getPreferredReplacementUrl: function getPreferredReplacementUrl(item) {
      return item && item.replacementUrl ? item.replacementUrl : "";
    },
    getItemDisplayType: function getItemDisplayType() {
      return "tracker cleaned";
    }
  });
  const rewriteResult = htmlRewriter.rewriteHtml("", [{
    original: "https://example.com/landing?utm_source=news&keep=yes",
    normalized: "https://example.com/landing?utm_source=news&keep=yes",
    replacementUrl: "https://example.com/landing?keep=yes"
  }], {
    enableUrlNormalizationRepair: true,
    stripKnownTrackingParameters: true,
    trackingParameterFilters: ["utm_source"]
  });
  const actual = {
    rewrittenHtml: rewriteResult.html,
    rewrittenCount: rewriteResult.count,
    href: anchorAttributes.href,
    linkText: anchorElement.textContent,
    linkType: anchorAttributes["data-merged-link-lab"] || "",
    tokenDetectorWasBypassed: true
  };
  const failures = [];

  if (
    actual.rewrittenCount !== 1 ||
    actual.href !== "https://example.com/landing?keep=yes" ||
    actual.linkText !== "https://example.com (tracker cleaned)" ||
    actual.linkType !== "tracker cleaned"
  ) {
    failures.push("Expected HTML anchor rewriting to use the pipeline item replacement lookup without requiring a second token-detector match.");
  }

  return {
    id: "module-pipeline-html-rewriter-anchor-lookup",
    title: "Pipeline HTML rewriter rewrites anchors from detected item replacements",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      rewrittenCount: 1,
      href: "https://example.com/landing?keep=yes",
      linkText: "https://example.com (tracker cleaned)",
      linkType: "tracker cleaned"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPipelineRewriteFallbackWiringRegression() {
  const pipelineSource = fs.readFileSync(path.resolve(__dirname, "..", "lab", "firefox-extension", "pipeline.js"), "utf8");
  const actual = {
    hasFallbackChooser: pipelineSource.includes("function chooseRewrittenMarkupResult("),
    normalRewriteRunsFirst: pipelineSource.includes("const rewrittenMarkupResult = rewriteHtml(sourceMarkup, detectedItems, pipelineSettings);"),
    fallbackRequiresChangedUrls: pipelineSource.includes("if (rewrittenMarkupResult.count || !changedUrls.length)"),
    fallbackUsesStandalonePreview:
      pipelineSource.includes("const standalonePreviewResult = rewriteHtmlForStandalonePreview(sourceMarkup, detectedItems, pipelineSettings);") &&
      pipelineSource.includes("return standalonePreviewResult.count ? standalonePreviewResult : rewrittenMarkupResult;"),
    assemblePassesChangedUrls:
      pipelineSource.includes("stageState.rewrittenMarkupResult = chooseRewrittenMarkupResult(") &&
      pipelineSource.includes("stageState.changedUrls,")
  };
  const failures = [];

  if (
    !actual.hasFallbackChooser ||
    !actual.normalRewriteRunsFirst ||
    !actual.fallbackRequiresChangedUrls ||
    !actual.fallbackUsesStandalonePreview ||
    !actual.assemblePassesChangedUrls
  ) {
    failures.push("Expected pipeline analyzeInput to fall back to standalone preview markup when changed URLs exist but normal HTML rewriting applies none.");
  }

  return {
    id: "module-pipeline-rewrite-fallback-wiring",
    title: "Pipeline routes unchanged normal rewrites through standalone preview fallback",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      hasFallbackChooser: true,
      fallbackUsesStandalonePreview: true,
      assemblePassesChangedUrls: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPipelineDiagnosticsRegression() {
  const detectorRegistry = pipelineDetectorRegistry.create({
    pipelineBase: pipelineBase
  });
  const diagnostics = pipelineDiagnostics.create({
    pipelineBase: pipelineBase,
    detectorRegistry: detectorRegistry,
    trackingParameterModel: trackingParameterModel
  });
  const result = diagnostics.buildDiagnostics(
    [
      {
        resolved: ["https://example.com/page?utm_source=news&keep=yes"],
        validResolved: ["https://example.com/page?keep=yes"],
        notes: ["TRACKING_PARAMS_STRIPPED: utm_source"]
      }
    ],
    ["https://example.com/page?keep=yes"],
    [{ title: "Daily Digest", url: "https://example.com/page?keep=yes", host: "example.com", type: "tracker cleaned" }],
    ["stageAssemble: boom"],
    "https://example.com/page?utm_source=news&keep=yes",
    pipelineBase.defaultPipelineSettings
  );
  const actual = {
    invalidCount: result.invalidCount,
    detectorLine: result.lines[4],
    trackingStripCountLine: result.lines[10],
    hasPipelineErrorsHeader: result.lines.indexOf("PIPELINE ERRORS:") !== -1,
    hasStageErrorLine: result.lines.indexOf("- stageAssemble: boom") !== -1
  };
  const failures = [];

  if (actual.invalidCount !== 0) {
    failures.push("Expected pipeline diagnostics to compute invalid URL counts from resolved and validResolved collections.");
  }

  if (actual.detectorLine !== "DETECTOR REGISTRY: regex=Regex, tokenizer=Tokenizer") {
    failures.push("Expected pipeline diagnostics to expose the live detector registry summary.");
  }

  if (actual.trackingStripCountLine !== "TRACKING STRIP COUNT: 1") {
    failures.push("Expected pipeline diagnostics to count tracker-cleaned items from note annotations.");
  }

  if (!actual.hasPipelineErrorsHeader || !actual.hasStageErrorLine) {
    failures.push("Expected pipeline diagnostics to append the pipeline error block when stage errors are present.");
  }

  return {
    id: "module-pipeline-diagnostics",
    title: "Pipeline diagnostics module summarizes detector, cleanup, and error state",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      invalidCount: 0,
      detectorLine: "DETECTOR REGISTRY: regex=Regex, tokenizer=Tokenizer",
      trackingStripCountLine: "TRACKING STRIP COUNT: 1",
      hasPipelineErrorsHeader: true,
      hasStageErrorLine: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runContentUiHelpersRegression() {
  const readyClasses = [];
  const appendedStyles = [];
  const addedFonts = [];
  const clipboardWriteTextCalls = [];
  const clipboardWriteCalls = [];
  const storedElementsById = {};
  const documentObject = {
    head: {
      appendChild: function appendChild(node) {
        appendedStyles.push(node);
        storedElementsById[node.id] = node;
      }
    },
    documentElement: {
      classList: {
        add: function add(className) {
          readyClasses.push(className);
        }
      }
    },
    fonts: {
      add: function add(fontFace) {
        addedFonts.push(fontFace);
      }
    },
    getElementById: function getElementById(elementId) {
      return storedElementsById[elementId] || null;
    },
    createElement: function createElement(tagName) {
      return {
        tagName: String(tagName || "").toUpperCase(),
        id: "",
        textContent: ""
      };
    },
    createDocumentFragment: function createDocumentFragment() {
      return {
        childNodes: [],
        appendChild: function appendChild(node) {
          this.childNodes.push(node);
        }
      };
    },
    createTextNode: function createTextNode(textValue) {
      return {
        nodeType: 3,
        textContent: String(textValue || "")
      };
    }
  };

  class FakeFontFace {
    constructor(family, source, descriptors) {
      this.family = family;
      this.source = source;
      this.descriptors = descriptors;
    }

    load() {
      return Promise.resolve(this);
    }
  }

  class FakeClipboardItem {
    constructor(items) {
      this.items = items;
    }
  }

  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options && options.type ? options.type : "";
    }
  }

  const helpers = contentUiHelpers.create({
    documentObject: documentObject,
    navigatorObject: {
      clipboard: {
        writeText: async function writeText(value) {
          clipboardWriteTextCalls.push(String(value || ""));
        },
        write: async function write(items) {
          clipboardWriteCalls.push(items);
        }
      }
    },
    performanceObject: {
      getEntriesByType: function getEntriesByType(entryType) {
        return entryType === "navigation"
          ? [{ type: "navigate", domInteractive: 12.3, loadEventEnd: 48.1 }]
          : [];
      }
    },
    extensionApi: {
      runtime: {
        getURL: function getURL(resourcePath) {
          return "moz-extension://unit/" + String(resourcePath || "");
        }
      }
    },
    domParserClass: null,
    clipboardItemClass: FakeClipboardItem,
    blobClass: FakeBlob,
    fontFaceClass: FakeFontFace
  });
  const iconElement = {
    attributes: { "data-icon": "settings" },
    getAttribute: function getAttribute(attributeName) {
      return this.attributes[attributeName] || "";
    },
    setAttribute: function setAttribute(attributeName, attributeValue) {
      this.attributes[attributeName] = attributeValue;
    }
  };
  const targetElement = {
    ownerDocument: documentObject,
    replacedChildren: null,
    querySelectorAll: function querySelectorAll(selectorText) {
      return selectorText === ".merged-link-lab-page-pane__icon[data-icon]" ? [iconElement] : [];
    },
    replaceChildren: function replaceChildren(fragment) {
      this.replacedChildren = fragment;
    }
  };
  const plainCopyResult = await helpers.copyPlainText("alpha");
  const richCopyResult = await helpers.copyPaneRichOrPlain({
    innerHTML: "<p>Hello</p>",
    innerText: "Hello",
    textContent: "Hello"
  });
  const firstInstallResult = helpers.installSidePanelIconFontFace();
  const secondInstallResult = helpers.installSidePanelIconFontFace();

  await Promise.resolve();
  await Promise.resolve();

  helpers.replaceElementMarkup(targetElement, "<b>unsafe</b>");

  const actual = {
    formatMetricCount: helpers.formatMetricCount(2, "URL", "URLs"),
    formatRailBadgeCount: helpers.formatRailBadgeCount(120),
    formatTimingValue: helpers.formatTimingValue(12.34),
    formatByteSize: helpers.formatByteSize(1536),
    formatTimestampMissing: helpers.formatTimestamp(0),
    formatDetectionTimeMissing: helpers.formatDetectionTime(0),
    countSectionLines: helpers.countSectionLines([{ lines: ["one", "two"] }, { lines: ["three"] }]),
    escapeHtmlAttribute: helpers.escapeHtmlAttribute('a"b<c>&'),
    navigationEntryType: helpers.getNavigationPerformanceEntry().type,
    renderEmptyState: helpers.renderEmptyState("<unsafe>"),
    plainCopyResult: plainCopyResult,
    richCopyResult: richCopyResult,
    clipboardWriteTextCalls: clipboardWriteTextCalls.slice(),
    richClipboardWriteCount: clipboardWriteCalls.length,
    richClipboardTextType:
      clipboardWriteCalls[0] && clipboardWriteCalls[0][0] && clipboardWriteCalls[0][0].items["text/plain"]
        ? clipboardWriteCalls[0][0].items["text/plain"].type
        : "",
    firstInstallResult: firstInstallResult,
    secondInstallResult: secondInstallResult,
    appendedStyleCount: appendedStyles.length,
    appendedStyleId: appendedStyles[0] ? appendedStyles[0].id : "",
    readyClassCount: readyClasses.length,
    addedFontCount: addedFonts.length,
    replacedText:
      targetElement.replacedChildren &&
      Array.isArray(targetElement.replacedChildren.childNodes) &&
      targetElement.replacedChildren.childNodes[0]
        ? targetElement.replacedChildren.childNodes[0].textContent
        : "",
    iconFallback: iconElement.attributes["data-fallback-icon"] || ""
  };
  const failures = [];

  if (actual.formatMetricCount !== "2 URLs" || actual.formatRailBadgeCount !== "99+") {
    failures.push("Expected content UI helpers to format rail metrics consistently.");
  }

  if (actual.formatTimingValue !== "12.3 ms" || actual.formatByteSize !== "1.5 KB") {
    failures.push("Expected content UI helpers to format timing and byte-size values consistently.");
  }

  if (actual.formatTimestampMissing !== "Not detected" || actual.formatDetectionTimeMissing !== "Not detected") {
    failures.push("Expected content UI helpers to preserve the standard missing timestamp labels.");
  }

  if (actual.countSectionLines !== 3 || actual.navigationEntryType !== "navigate") {
    failures.push("Expected content UI helpers to expose section-line counts and the first navigation performance entry.");
  }

  if (actual.escapeHtmlAttribute !== "a&quot;b&lt;c&gt;&amp;" || actual.renderEmptyState.indexOf("merged-link-lab-page-pane__empty") === -1) {
    failures.push("Expected content UI helpers to escape attributes and build the empty-state wrapper markup.");
  }

  if (
    actual.plainCopyResult !== true ||
    actual.richCopyResult !== true ||
    !arrayEquals(actual.clipboardWriteTextCalls, ["alpha"]) ||
    actual.richClipboardWriteCount !== 1 ||
    actual.richClipboardTextType !== "text/plain"
  ) {
    failures.push("Expected content UI helpers to support both plain-text and rich clipboard copy paths.");
  }

  if (
    actual.firstInstallResult !== true ||
    actual.secondInstallResult !== false ||
    actual.appendedStyleCount !== 1 ||
    actual.appendedStyleId !== "merged-link-lab-page-pane-icon-font" ||
    actual.readyClassCount <= 0 ||
    actual.addedFontCount !== 1
  ) {
    failures.push("Expected content UI helpers to install the side-panel icon font once and mark the icon font ready.");
  }

  if (actual.replacedText !== "<b>unsafe</b>" || actual.iconFallback !== "\u2699") {
    failures.push("Expected content UI helpers to replace markup content and stamp fallback icons on side-panel icon elements.");
  }

  return {
    id: "module-content-ui-helpers",
    title: "Content UI helpers module formats values, installs icon fonts, replaces markup, and supports clipboard paths",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      formatMetricCount: "2 URLs",
      formatRailBadgeCount: "99+",
      formatTimingValue: "12.3 ms",
      formatByteSize: "1.5 KB",
      navigationEntryType: "navigate",
      appendedStyleCount: 1,
      iconFallback: "\u2699"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runContentPageContextRegression() {
  const state = {
    latestDetectedEmailRoot: { id: "root-1" },
    latestDetectedEmailMode: "inbox",
    latestInboxCandidateSeenAt: 321,
    inboxCandidateMissingSince: 654,
    bodyTestPageValue: "true",
    visibilityState: "visible",
    locationHref: "https://mail.example.com/message/123",
    setCalls: []
  };
  const context = contentPageContext.create({
    documentObject: {
      body: {
        getAttribute: function getAttribute(attributeName) {
          return attributeName === "data-url-forensics-test-page" ? state.bodyTestPageValue : null;
        }
      },
      get visibilityState() {
        return state.visibilityState;
      }
    },
    windowObject: {
      location: {
        href: state.locationHref
      }
    },
    setLatestDetectedEmailRoot: function setLatestDetectedEmailRoot(nextValue) {
      state.latestDetectedEmailRoot = nextValue;
      state.setCalls.push(["root", nextValue]);
    },
    setLatestDetectedEmailMode: function setLatestDetectedEmailMode(nextValue) {
      state.latestDetectedEmailMode = nextValue;
      state.setCalls.push(["mode", nextValue]);
    },
    setLatestInboxCandidateSeenAt: function setLatestInboxCandidateSeenAt(nextValue) {
      state.latestInboxCandidateSeenAt = nextValue;
      state.setCalls.push(["seenAt", nextValue]);
    },
    setInboxCandidateMissingSince: function setInboxCandidateMissingSince(nextValue) {
      state.inboxCandidateMissingSince = nextValue;
      state.setCalls.push(["missingSince", nextValue]);
    }
  });
  const longRawText = new Array(300).fill("x").join("");
  const signature = context.createSnapshotSignature({
    detectionMode: "gmail-inbox",
    sectionLabel: "Primary",
    sourceHtml: "<div>hello</div>",
    isTopicDigest: true
  });
  const paneKey = context.createSnapshotPaneKey({
    detectionMode: "gmail-inbox",
    sectionLabel: "Primary",
    rawText: longRawText
  });
  const builtInTestPageResult = context.isBuiltInTestSuitePage();
  const visibleResult = context.isPageCurrentlyVisible();
  const locationHrefResult = context.getCurrentLocationHref();

  state.bodyTestPageValue = "false";
  state.visibilityState = "hidden";
  context.resetLatestEmailDetectionState();

  const actual = {
    builtInTestPageResult: builtInTestPageResult,
    visibleResult: visibleResult,
    locationHrefResult: locationHrefResult,
    hiddenVisibilityResult: context.isPageCurrentlyVisible(),
    nonTestPageResult: context.isBuiltInTestSuitePage(),
    signature: signature,
    paneKeyPrefix: paneKey.slice(0, 24),
    paneKeyLength: paneKey.length,
    resetState: {
      latestDetectedEmailRoot: state.latestDetectedEmailRoot,
      latestDetectedEmailMode: state.latestDetectedEmailMode,
      latestInboxCandidateSeenAt: state.latestInboxCandidateSeenAt,
      inboxCandidateMissingSince: state.inboxCandidateMissingSince
    },
    setCalls: state.setCalls.slice()
  };
  const failures = [];

  if (actual.builtInTestPageResult !== true || actual.nonTestPageResult !== false) {
    failures.push("Expected content page context to detect only the built-in test page marker value.");
  }

  if (actual.visibleResult !== true || actual.hiddenVisibilityResult !== false) {
    failures.push("Expected content page context to reflect document visibility state.");
  }

  if (actual.locationHrefResult !== "https://mail.example.com/message/123") {
    failures.push("Expected content page context to expose the current location href.");
  }

  if (actual.signature !== "gmail-inbox::Primary::<div>hello</div>::topic-digest") {
    failures.push("Expected content page context to build stable snapshot signatures.");
  }

  if (actual.paneKeyPrefix !== "gmail-inbox::Primary::xx" || actual.paneKeyLength !== ("gmail-inbox::Primary::".length + 240)) {
    failures.push("Expected content page context to build pane keys from the first 240 characters of snapshot raw text.");
  }

  if (
    actual.resetState.latestDetectedEmailRoot !== null ||
    actual.resetState.latestDetectedEmailMode !== "" ||
    actual.resetState.latestInboxCandidateSeenAt !== 0 ||
    actual.resetState.inboxCandidateMissingSince !== 0
  ) {
    failures.push("Expected content page context to reset latest email detection state through the injected setters.");
  }

  if (!arrayEquals(actual.setCalls, [["root", null], ["mode", ""], ["seenAt", 0], ["missingSince", 0]])) {
    failures.push("Expected content page context reset to invoke each state setter with the normalized reset values.");
  }

  return {
    id: "module-content-page-context",
    title: "Content page context module exposes page visibility, test-page state, snapshot identity, and reset helpers",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      builtInTestPageResult: true,
      visibleResult: true,
      hiddenVisibilityResult: false,
      locationHrefResult: "https://mail.example.com/message/123",
      signature: "gmail-inbox::Primary::<div>hello</div>::topic-digest"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runContentInboxWorkflowsRegression() {
  const extensionSettings = {
    replaceEmailBodyWithMirrorContent: false,
    autoApplyMirrorOnMobileDevice: false,
    autoApplyMirrorForConfiguredSenders: false,
    autoApplyMirrorSenderEmailList: ["default@example.com"]
  };
  const captured = {
    candidate: null,
    rootSummary: null,
    settingsStorage: null
  };
  const fakeInboxDetectors = {
    patterns: {
      inboxHost: Object.freeze({
        test: function testInboxHostPattern(hostnameValue) {
          return String(hostnameValue || "").toLowerCase() === "mail.example.com";
        }
      }),
      readViewHint: /read/i,
      composeContextHint: /compose/i,
      standaloneEmailHint: /message/i
    },
    selectors: {
      outlookMailBody: ".outlook-body",
      inboxBody: [".inbox-body"],
      standaloneEmailBody: [".message-body"],
      genericInboxContainer: [".generic-inbox"],
      explicitInboxBody: [".explicit-body"]
    },
    getDetectionSearchRoots: function getDetectionSearchRoots(root) {
      return root ? [root, { id: "secondary-root" }] : [];
    },
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".primary-body"];
    },
    isOutlookHost: function isOutlookHost(hostname) {
      return hostname === "outlook.office.com";
    },
    isProtonHost: function isProtonHost(hostname) {
      return hostname === "mail.proton.me";
    }
  };
  const candidateWorkflow = contentInboxWorkflows.createWorkflowEmailCandidateDiscovery(
    {
      create: function create(options) {
        captured.candidate = options;
        return {
          getCandidateMissingGraceWindow: function getCandidateMissingGraceWindow() {
            return options.outlookCandidateMissingGraceMs;
          },
          getInboxRootCandidates: function getInboxRootCandidates() {
            return options.getDetectionSearchRoots({ id: "primary-root" });
          },
          choosePrimaryEmailCandidate: function choosePrimaryEmailCandidate(candidates) {
            return Array.isArray(candidates) && candidates.length ? candidates[candidates.length - 1] : null;
          },
          choosePrimaryInboxRoot: function choosePrimaryInboxRoot(candidates) {
            return Array.isArray(candidates) && candidates.length && candidates[0] ? candidates[0].root : null;
          }
        };
      }
    },
    {
      cleanInputText: function cleanInputText(value) {
        return String(value || "").trim();
      }
    },
    fakeInboxDetectors,
    null,
    function getEmailRootContentElement(element) {
      return element || null;
    },
    function measureElementText() {
      return { text: "hello", lines: 1, words: 1 };
    },
    4000,
    12000,
    13000
  );
  const emailRootSummaryWorkflow = contentInboxWorkflows.createWorkflowEmailRootSummary(
    {
      create: function create(options) {
        captured.rootSummary = options;
        return {
          summarizeEmailRoot: function summarizeEmailRoot() {
            return {
              detectedAt: 1,
              detectionMode: "summary",
              sectionLabel: "primary",
              sourceHtml: "<p>summary</p>",
              rawText: "summary",
              pipelineSettings: options.getPipelineSettings(),
              pipeline: { finalUrls: [], digestEntries: [], errors: [] },
              isTopicDigest: false
            };
          }
        };
      }
    },
    {
      cleanInputText: function cleanInputText(value) {
        return String(value || "").trim();
      },
      analyzeInput: function analyzeInput() {
        return { finalUrls: ["https://example.com"], digestEntries: [], errors: [] };
      }
    },
    fakeInboxDetectors,
    { enabled: true },
    function getPipelineSettings() {
      return { enableUrlNormalizationRepair: true };
    }
  );
  const autoReplaceStateFallback = contentInboxWorkflows.createWorkflowEmailAutoReplaceState(
    null,
    extensionSettings,
    ["default@example.com"],
    function sanitizeSenderEmailList(listValue) {
      return Array.isArray(listValue) ? listValue.filter(Boolean).map(String) : [];
    },
    false
  );
  autoReplaceStateFallback.applyStoredAutoApplyMirrorForConfiguredSendersSetting(true);
  autoReplaceStateFallback.applyStoredAutoApplyMirrorSenderEmailList(["alerts@example.com"], { useDefaultList: false });
  autoReplaceStateFallback.applyStoredAutoApplyMirrorSenderEmailList(null, { useDefaultList: true });
  const settingsStorageFallback = contentInboxWorkflows.createWorkflowContentSettingsStorage(
    null,
    null,
    null,
    extensionSettings,
    {},
    null,
    function getPipelineSettings() {
      return { enableUrlNormalizationRepair: true, stripKnownTrackingParameters: false };
    },
    function syncEmailSnapshot() {
      return true;
    },
    autoReplaceStateFallback,
    "repair",
    "strip",
    "filters",
    "replaceEmailBody",
    "allowHelperOpenWithoutDetectedEmailBody",
    "autoApplyMobile",
    "autoApplySenders",
    "senderList",
    "legacyAutoApply",
    function buildStorageBooleanSnapshotEntry() {},
    function buildTrackingParameterFilterSnapshotEntry() {},
    function buildStorageEmailListSnapshotEntry() {},
    function resolveStoredAutoApplyConfiguredSendersValue() {
      return false;
    }
  );
  const runtimeLifecycleFallback = contentInboxWorkflows.createWorkflowContentRuntimeLifecycle(
    null,
    null,
    null,
    async function loadPipelineSettings() {
      return {};
    },
    function handlePipelineStorageChange() {
      return false;
    },
    function scheduleSnapshotSync() {
      return 0;
    },
    function syncEmailSnapshot() {
      return false;
    },
    function openPaneVisibility() {},
    function togglePaneVisibility() {},
    function shouldAllowOpenWithoutSnapshot() {
      return false;
    },
    async function applyRewriteToEmailBody() {
      return { ok: false, applied: false };
    },
    function getLatestSnapshot() {
      return null;
    },
    null
  );
  const snapshotSyncFallback = contentInboxWorkflows.createWorkflowEmailSnapshotSync(
    null,
    null,
    null,
    null,
    null,
    function getLatestSnapshot() {
      return null;
    },
    function getLastPublishedSnapshotSignature() {
      return "";
    },
    function getLatestDetectedEmailRoot() {
      return null;
    },
    function setLatestDetectedEmailRoot() {},
    function getLatestDetectedEmailMode() {
      return "";
    },
    function setLatestDetectedEmailMode() {},
    function getLatestInboxCandidateSeenAt() {
      return 0;
    },
    function setLatestInboxCandidateSeenAt() {},
    function getInboxCandidateMissingSince() {
      return 0;
    },
    function setInboxCandidateMissingSince() {},
    function getLastObservedLocationHref() {
      return "";
    },
    function setLastObservedLocationHref() {},
    function resetLatestEmailDetectionState() {},
    function isPageCurrentlyVisible() {
      return true;
    },
    function getCurrentLocationHref() {
      return "";
    },
    function getInboxRootCandidates() {
      return [];
    },
    function observeEmailRoot() {},
    function choosePrimaryEmailCandidate() {
      return null;
    },
    function getCandidateMissingGraceWindow() {
      return 0;
    },
    function summarizeEmailRoot() {
      return {};
    },
    function createSnapshotSignature() {
      return "";
    }
  );
  const actual = {
    candidateWindowObject: captured.candidate ? captured.candidate.windowObject : undefined,
    candidateDocumentObject: captured.candidate ? captured.candidate.documentObject : undefined,
    candidateGraceWindow: candidateWorkflow.getCandidateMissingGraceWindow(),
    candidateSearchRootCount: captured.candidate ? captured.candidate.getDetectionSearchRoots({ id: "x" }).length : 0,
    candidateInboxSelector: captured.candidate ? captured.candidate.outlookMailBodySelector : "",
    candidatePrimarySelectorCount: captured.candidate ? captured.candidate.getPrimaryInboxBodySelectors().length : 0,
    candidateInboxPatternMatches: captured.candidate ? captured.candidate.inboxHostPattern.test("mail.example.com") : false,
    candidateIsOutlookHost: captured.candidate ? captured.candidate.isOutlookHost("outlook.office.com") : false,
    candidateIsProtonHost: captured.candidate ? captured.candidate.isProtonHost("mail.proton.me") : false,
    candidateRootIds: candidateWorkflow.getInboxRootCandidates().map(function mapCandidateRoot(candidate) {
      return candidate.id;
    }),
    summaryWindowObject: captured.rootSummary ? captured.rootSummary.windowObject : undefined,
    summaryDocumentObject: captured.rootSummary ? captured.rootSummary.documentObject : undefined,
    summaryInboxPatternMatches: captured.rootSummary ? captured.rootSummary.inboxHostPattern.test("mail.example.com") : false,
    summaryTopicLabelMatches: captured.rootSummary ? captured.rootSummary.topicDigestLabelPattern.test("Daily read") : false,
    summaryPipelineSetting: emailRootSummaryWorkflow.summarizeEmailRoot().pipelineSettings.enableUrlNormalizationRepair,
    autoReplaceEnabledAfterApply: extensionSettings.autoApplyMirrorForConfiguredSenders,
    autoReplaceFallbackList: extensionSettings.autoApplyMirrorSenderEmailList.slice(),
    settingsFallbackLoaded: await settingsStorageFallback.loadPipelineSettings(),
    runtimeFallbackInit: await runtimeLifecycleFallback.initialize(),
    snapshotSyncFallbackResult: snapshotSyncFallback.syncEmailSnapshot(),
    snapshotScheduleFallbackResult: snapshotSyncFallback.scheduleSnapshotSync()
  };
  const failures = [];

  if (actual.candidateWindowObject !== null || actual.candidateDocumentObject !== null) {
    failures.push("Expected content inbox workflows to stay Node-safe by providing null window/document defaults outside the browser.");
  }

  if (
    actual.candidateGraceWindow !== 12000 ||
    actual.candidateSearchRootCount !== 2 ||
    actual.candidateInboxSelector !== ".outlook-body" ||
    actual.candidatePrimarySelectorCount !== 1 ||
    actual.candidateInboxPatternMatches !== true ||
    actual.candidateIsOutlookHost !== true ||
    actual.candidateIsProtonHost !== true ||
    !arrayEquals(actual.candidateRootIds, ["primary-root", "secondary-root"])
  ) {
    failures.push("Expected content inbox workflows to wire inbox candidate discovery options and delegated controller methods correctly.");
  }

  if (
    actual.summaryWindowObject !== null ||
    actual.summaryDocumentObject !== null ||
    actual.summaryInboxPatternMatches !== true ||
    actual.summaryTopicLabelMatches !== false ||
    actual.summaryPipelineSetting !== true
  ) {
    failures.push("Expected content inbox workflows to wire email-root summary options and pipeline settings correctly.");
  }

  if (
    actual.autoReplaceEnabledAfterApply !== true ||
    !arrayEquals(actual.autoReplaceFallbackList, ["default@example.com"])
  ) {
    failures.push("Expected content inbox workflows to preserve email auto-replace state fallback behavior.");
  }

  if (
    actual.settingsFallbackLoaded.enableUrlNormalizationRepair !== true ||
    actual.runtimeFallbackInit.initialized !== false ||
    actual.snapshotSyncFallbackResult !== false ||
    actual.snapshotScheduleFallbackResult !== 0
  ) {
    failures.push("Expected content inbox workflows to preserve storage, lifecycle, and snapshot-sync fallbacks.");
  }

  return {
    id: "module-content-inbox-workflows",
    title: "Content inbox workflows module wires inbox workflow factories and preserves safe fallbacks",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      candidateGraceWindow: 12000,
      candidateInboxPatternMatches: true,
      candidateRootIds: ["primary-root", "secondary-root"],
      summaryInboxPatternMatches: true,
      summaryPipelineSetting: true,
      autoReplaceFallbackList: ["default@example.com"],
      snapshotScheduleFallbackResult: 0
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runContentPaneWorkflowsRegression() {
  const captured = {
    assembly: null,
    mirror: null,
    snapshot: null,
    sentMessage: null
  };
  const workflowRailElements = {
    root: { id: "pane-root", isConnected: true },
    activeTabKey: "converted"
  };
  const extensionApi = {
    runtime: {
      getURL: function getURL(resourcePath) {
        return "moz-extension://test/" + String(resourcePath || "");
      },
      sendMessage: async function sendMessage(message) {
        captured.sentMessage = message;
        return { ok: true, echoed: message && message.type ? message.type : "" };
      }
    }
  };
  const debugApi = {
    ui: function ui() {}
  };
  const workflowPaneBootstrap = contentPaneWorkflows.createWorkflowPaneBootstrap(null);
  const workflowPaneLayoutFallback = contentPaneWorkflows.createWorkflowPaneLayout(
    null,
    workflowRailElements,
    function ensurePane() {
      return workflowRailElements.root;
    },
    function getLatestSnapshot() {
      return { id: "snapshot-1" };
    },
    function getActiveEmailRoot() {
      return { id: "email-root-1" };
    }
  );
  const workflowPaneMirror = contentPaneWorkflows.createWorkflowPaneMirror(
    {
      create: function create(options) {
        captured.mirror = options;
        return {
          bindHoverInspector: function bindHoverInspector() {},
          clearRenderedPane: function clearRenderedPane() {},
          renderSnapshot: function renderSnapshot() {},
          setHoverInfoText: function setHoverInfoText() {},
          setHoverLinkPanelExpanded: function setHoverLinkPanelExpanded() {}
        };
      }
    },
    workflowRailElements,
    {
      escapeHtml: function escapeHtml(value) {
        return "escaped:" + String(value || "");
      },
      classifyUrlValue: function classifyUrlValue() {
        return "email";
      },
      extractKnownTrackingParameterNames: function extractKnownTrackingParameterNames() {
        return ["utm_source"];
      }
    },
    function replaceElementMarkup() {},
    "hover-default",
    "hover-unavailable"
  );
  const workflowPaneSnapshot = contentPaneWorkflows.createWorkflowPaneSnapshot(
    {
      create: function create(options) {
        captured.snapshot = options;
        return {
          clearPane: function clearPane() {},
          forceRefreshCurrentSnapshot: function forceRefreshCurrentSnapshot() {},
          publishClear: async function publishClear() {},
          publishSnapshot: async function publishSnapshot() {},
          renderSnapshotPane: function renderSnapshotPane() {},
          syncLabFrameWithSnapshot: function syncLabFrameWithSnapshot() {
            return true;
          }
        };
      }
    },
    workflowRailElements,
    function ensurePane() {
      return workflowRailElements.root;
    },
    workflowPaneMirror,
    {},
    workflowPaneLayoutFallback,
    extensionApi,
    debugApi,
    function getLatestSnapshot() {
      return { id: "snapshot-1" };
    },
    function setLatestSnapshot() {},
    function setLastPublishedSnapshotSignature() {},
    function getDidAutoExpandBuiltInTestPagePane() {
      return false;
    },
    function setDidAutoExpandBuiltInTestPagePane() {},
    function formatMetricCount(value) {
      return String(value || 0);
    },
    function formatRailBadgeCount(value) {
      return String(value || 0);
    },
    function syncEmailSnapshot() {
      return true;
    },
    async function maybeReplaceEmailBodyWithMirrorContent() {
      return { applied: false };
    },
    function isBuiltInTestSuitePage() {
      return false;
    },
    function createSnapshotSignature() {
      return "signature";
    },
    function createSnapshotPaneKey() {
      return "pane-key";
    },
    function resetLatestEmailDetectionState() {}
  );
  const workflowPaneAssembly = contentPaneWorkflows.createWorkflowPaneAssembly(
    {
      create: function create(options) {
        captured.assembly = options;
        return {
          ensurePane: function ensurePane() {
            return workflowRailElements.root;
          },
          setActiveTab: function setActiveTab(tabKey) {
            workflowRailElements.activeTabKey = tabKey;
            return tabKey;
          }
        };
      }
    },
    workflowRailElements,
    {
      buildPaneMarkup: function buildPaneMarkup() {
        return "<section>pane</section>";
      },
      collectElements: function collectElements() {
        return { root: workflowRailElements.root };
      }
    },
    workflowPaneBootstrap,
    extensionApi,
    workflowPaneLayoutFallback,
    workflowPaneMirror,
    workflowPaneSnapshot,
    function replaceElementMarkup() {},
    function openSettingsPage() {},
    function getLatestSnapshot() {
      return { id: "snapshot-1" };
    }
  );
  const assemblyFallback = contentPaneWorkflows.createWorkflowPaneAssembly(
    null,
    workflowRailElements,
    null,
    workflowPaneBootstrap,
    extensionApi,
    workflowPaneLayoutFallback,
    workflowPaneMirror,
    workflowPaneSnapshot,
    function replaceElementMarkup() {},
    function openSettingsPage() {},
    function getLatestSnapshot() {
      return null;
    }
  );
  const snapshotFallback = contentPaneWorkflows.createWorkflowPaneSnapshot(
    null,
    workflowRailElements,
    function ensurePane() {
      return workflowRailElements.root;
    },
    workflowPaneMirror,
    {},
    workflowPaneLayoutFallback,
    null,
    debugApi,
    function getLatestSnapshot() {
      return null;
    },
    function setLatestSnapshot() {},
    function setLastPublishedSnapshotSignature() {},
    function getDidAutoExpandBuiltInTestPagePane() {
      return false;
    },
    function setDidAutoExpandBuiltInTestPagePane() {},
    function formatMetricCount() {
      return "0";
    },
    function formatRailBadgeCount() {
      return "0";
    },
    function syncEmailSnapshot() {
      return false;
    },
    async function maybeReplaceEmailBodyWithMirrorContent() {
      return { applied: false };
    },
    function isBuiltInTestSuitePage() {
      return false;
    },
    function createSnapshotSignature() {
      return "";
    },
    function createSnapshotPaneKey() {
      return "";
    },
    function resetLatestEmailDetectionState() {}
  );
  const actual = {
    bootstrapHasInitialize: typeof workflowPaneBootstrap.initialize === "function",
    layoutFallbackToggleResult: workflowPaneLayoutFallback.togglePaneVisibility(),
    mirrorDefaultHoverMessage: captured.mirror ? captured.mirror.defaultHoverMessage : "",
    mirrorEscapeResult: captured.mirror ? captured.mirror.escapeHtml("<a>") : "",
    mirrorClassifyResult: captured.mirror ? captured.mirror.classifyUrlValue("mailto:test@example.com") : "",
    mirrorTrackingParameters: captured.mirror ? captured.mirror.extractKnownTrackingParameterNames() : [],
    snapshotBaseUrl: captured.snapshot ? captured.snapshot.getBaseUrl() : undefined,
    snapshotDebugApiWired: captured.snapshot ? captured.snapshot.debugApi === debugApi : false,
    snapshotMessageResult: captured.snapshot ? await captured.snapshot.sendRuntimeMessage({ type: "snapshot-sync" }) : null,
    sentMessageType: captured.sentMessage ? captured.sentMessage.type : "",
    assemblyDocumentObject: captured.assembly ? captured.assembly.documentObject : undefined,
    assemblyLabFrameUrl: captured.assembly ? captured.assembly.labFrameUrl : "",
    assemblyBuildMarkupResult: captured.assembly ? captured.assembly.buildPaneMarkup() : "",
    assemblyFallbackEnsurePaneId: assemblyFallback.ensurePane() ? assemblyFallback.ensurePane().id : "",
    assemblyFallbackTabResult: assemblyFallback.setActiveTab("bogus"),
    assemblyFallbackActiveTabKey: workflowRailElements.activeTabKey,
    snapshotFallbackSyncResult: snapshotFallback.syncLabFrameWithSnapshot(),
    createdPaneId: workflowPaneAssembly.ensurePane() ? workflowPaneAssembly.ensurePane().id : ""
  };
  const failures = [];

  if (actual.bootstrapHasInitialize !== true) {
    failures.push("Expected content pane workflows to preserve the bootstrap initialize fallback.");
  }

  if (
    actual.layoutFallbackToggleResult.ok !== false ||
    actual.layoutFallbackToggleResult.hasSnapshot !== false ||
    actual.layoutFallbackToggleResult.visible !== false ||
    actual.layoutFallbackToggleResult.expanded !== false
  ) {
    failures.push("Expected content pane workflows to preserve the layout fallback toggle shape.");
  }

  if (
    actual.mirrorDefaultHoverMessage !== "hover-default" ||
    actual.mirrorEscapeResult !== "escaped:<a>" ||
    actual.mirrorClassifyResult !== "email" ||
    !arrayEquals(actual.mirrorTrackingParameters, ["utm_source"])
  ) {
    failures.push("Expected content pane workflows to wire mirror options through to the pane mirror controller.");
  }

  if (
    actual.snapshotBaseUrl !== "" ||
    actual.snapshotDebugApiWired !== true ||
    !actual.snapshotMessageResult ||
    actual.snapshotMessageResult.ok !== true ||
    actual.sentMessageType !== "snapshot-sync"
  ) {
    failures.push("Expected content pane workflows to wire pane snapshot runtime messaging and safe base-url access.");
  }

  if (
    actual.assemblyDocumentObject !== null ||
    actual.assemblyLabFrameUrl !== "moz-extension://test/core-components/extension-workbench.html" ||
    actual.assemblyBuildMarkupResult !== "<section>pane</section>" ||
    actual.assemblyFallbackEnsurePaneId !== "pane-root" ||
    actual.assemblyFallbackTabResult !== "lab" ||
    actual.assemblyFallbackActiveTabKey !== "lab" ||
    actual.snapshotFallbackSyncResult !== false ||
    actual.createdPaneId !== "pane-root"
  ) {
    failures.push("Expected content pane workflows to wire pane assembly dependencies and preserve assembly/snapshot fallbacks.");
  }

  return {
    id: "module-content-pane-workflows",
    title: "Content pane workflows module wires pane workflow factories and preserves safe fallbacks",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      assemblyLabFrameUrl: "moz-extension://test/core-components/extension-workbench.html",
      mirrorDefaultHoverMessage: "hover-default",
      snapshotBaseUrl: "",
      snapshotDebugApiWired: true,
      assemblyFallbackActiveTabKey: "lab"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runContentScriptShimRegression() {
  const captured = {
    initializedOptions: null,
    uiOptions: null,
    pageContextOptions: null
  };
  const fakeDocument = { id: "document" };
  const fakeWindow = { id: "window" };
  const fakeGlobalScope = { id: "global-scope" };
  const fakeExtensionApi = { runtime: { id: "runtime" } };
  const fakePipeline = {
    escapeHtml: function escapeHtml(value) {
      return String(value || "").replace(/</g, "&lt;");
    }
  };
  const targetElement = { innerHTML: "" };
  const fallbackResetCalls = [];
  const globalAssignments = [
    { name: "document", value: fakeDocument },
    { name: "window", value: fakeWindow },
    {
      name: "urlForensicsContentScriptRuntime",
      value: {
        initialize: function initialize(options) {
          captured.initializedOptions = options;
        }
      }
    },
    {
      name: "urlForensicsSmokeMarker",
      value: { ok: true }
    }
  ];
  const originalDescriptors = globalAssignments.map(function captureGlobalDescriptor(entry) {
    return {
      name: entry.name,
      hadOwnProperty: Object.prototype.hasOwnProperty.call(globalThis, entry.name),
      descriptor: Object.getOwnPropertyDescriptor(globalThis, entry.name)
    };
  });

  globalAssignments.forEach(function assignTemporaryGlobal(entry) {
    Object.defineProperty(globalThis, entry.name, {
      configurable: true,
      writable: true,
      value: entry.value
    });
  });

  try {
    const createdUiHelpers = contentScript.createWorkflowContentUiHelpers(
      {
        create: function create(options) {
          captured.uiOptions = options;
          return { created: "ui-helpers" };
        }
      },
      fakeExtensionApi,
      fakePipeline
    );
    const fallbackUiHelpers = contentScript.createWorkflowContentUiHelpers(null, null, null);
    fallbackUiHelpers.replaceElementMarkup(targetElement, "<div>shim</div>");

    const createdPageContext = contentScript.createWorkflowContentPageContext(
      {
        create: function create(options) {
          captured.pageContextOptions = options;
          return { created: "page-context" };
        }
      },
      function setLatestDetectedEmailRoot() {},
      function setLatestDetectedEmailMode() {},
      function setLatestInboxCandidateSeenAt() {},
      function setInboxCandidateMissingSince() {},
      function getFallbackWindowLocationHref() {
        return "https://mail.google.com/";
      },
      function isFallbackBuiltInTestSuitePage() {
        return false;
      },
      function isFallbackPageCurrentlyVisible() {
        return true;
      },
      function resetFallbackLatestEmailDetectionState() {
        fallbackResetCalls.push("reset");
      }
    );
    const fallbackPageContext = contentScript.createWorkflowContentPageContext(
      null,
      function setLatestDetectedEmailRoot() {},
      function setLatestDetectedEmailMode() {},
      function setLatestInboxCandidateSeenAt() {},
      function setInboxCandidateMissingSince() {},
      function getFallbackWindowLocationHref() {
        return "https://mail.google.com/mail/u/0/#inbox";
      },
      function isFallbackBuiltInTestSuitePage() {
        return true;
      },
      function isFallbackPageCurrentlyVisible() {
        return false;
      },
      function resetFallbackLatestEmailDetectionState() {
        fallbackResetCalls.push("fallback-reset");
      }
    );

    const initializeResult = contentScript.initialize(fakeGlobalScope);
    delete globalThis.urlForensicsContentScriptRuntime;
    const missingInitializeResult = contentScript.initialize(fakeGlobalScope);
    fallbackPageContext.resetLatestEmailDetectionState();

    const actual = {
      resolvedMarker: contentScript.resolveGlobalValue("urlForensicsSmokeMarker"),
      createdUiHelpers: createdUiHelpers,
      uiDocumentMatches: captured.uiOptions ? captured.uiOptions.documentObject === fakeDocument : false,
      uiExtensionApiMatches: captured.uiOptions ? captured.uiOptions.extensionApi === fakeExtensionApi : false,
      uiEscapeHtmlResult: captured.uiOptions ? captured.uiOptions.escapeHtml("<tag>") : "",
      fallbackRailBadge: fallbackUiHelpers.formatRailBadgeCount(140),
      fallbackMetricCount: fallbackUiHelpers.formatMetricCount(1, "URL", "URLs"),
      fallbackTimingValue: fallbackUiHelpers.formatTimingValue(12.34),
      fallbackTimestampEmpty: fallbackUiHelpers.formatTimestamp(0),
      fallbackMarkup: targetElement.innerHTML,
      createdPageContext: createdPageContext,
      pageContextDocumentMatches: captured.pageContextOptions ? captured.pageContextOptions.documentObject === fakeDocument : false,
      pageContextWindowMatches: captured.pageContextOptions ? captured.pageContextOptions.windowObject === fakeWindow : false,
      fallbackPaneKey: fallbackPageContext.createSnapshotPaneKey({
        detectionMode: "inbox-read",
        sectionLabel: "Opened email body",
        rawText: "alpha beta"
      }),
      fallbackSignature: fallbackPageContext.createSnapshotSignature({
        detectionMode: "inbox-read",
        sectionLabel: "Opened email body",
        sourceHtml: "<p>mail</p>",
        isTopicDigest: true
      }),
      fallbackLocationHref: fallbackPageContext.getCurrentLocationHref(),
      fallbackBuiltInPage: fallbackPageContext.isBuiltInTestSuitePage(),
      fallbackPageVisible: fallbackPageContext.isPageCurrentlyVisible(),
      fallbackResetCalls: fallbackResetCalls.slice(),
      initializeResult: initializeResult,
      missingInitializeResult: missingInitializeResult,
      initializedGlobalScopeMatches:
        !!(captured.initializedOptions && captured.initializedOptions.globalScope === fakeGlobalScope),
      initializedWindowMatches:
        !!(captured.initializedOptions && captured.initializedOptions.windowObject === fakeWindow),
      initializedDocumentMatches:
        !!(captured.initializedOptions && captured.initializedOptions.documentObject === fakeDocument),
      initializedResolveGlobalValueMatches:
        !!(captured.initializedOptions && captured.initializedOptions.resolveGlobalValue === contentScript.resolveGlobalValue),
      initializedCreateUiHelpersMatches:
        !!(captured.initializedOptions && captured.initializedOptions.createWorkflowContentUiHelpers === contentScript.createWorkflowContentUiHelpers),
      initializedCreatePageContextMatches:
        !!(captured.initializedOptions && captured.initializedOptions.createWorkflowContentPageContext === contentScript.createWorkflowContentPageContext)
    };
    const failures = [];

    if (!actual.resolvedMarker || actual.resolvedMarker.ok !== true) {
      failures.push("Expected content-script shim resolveGlobalValue to read properties from globalThis.");
    }

    if (
      !actual.createdUiHelpers ||
      actual.createdUiHelpers.created !== "ui-helpers" ||
      actual.uiDocumentMatches !== true ||
      actual.uiExtensionApiMatches !== true ||
      actual.uiEscapeHtmlResult !== "&lt;tag>"
    ) {
      failures.push("Expected content-script shim to pass document, extension API, and pipeline escapeHtml into content UI helper creation.");
    }

    if (
      actual.fallbackRailBadge !== "99+" ||
      actual.fallbackMetricCount !== "1 URL" ||
      actual.fallbackTimingValue !== "12.3 ms" ||
      actual.fallbackTimestampEmpty !== "Not detected" ||
      actual.fallbackMarkup !== "<div>shim</div>"
    ) {
      failures.push("Expected content-script shim UI-helper fallback to preserve formatting and markup replacement behavior.");
    }

    if (
      !actual.createdPageContext ||
      actual.createdPageContext.created !== "page-context" ||
      actual.pageContextDocumentMatches !== true ||
      actual.pageContextWindowMatches !== true
    ) {
      failures.push("Expected content-script shim to pass window and document into content page-context creation.");
    }

    if (
      actual.fallbackPaneKey !== "inbox-read::Opened email body::alpha beta" ||
      actual.fallbackSignature !== "inbox-read::Opened email body::<p>mail</p>::topic-digest" ||
      actual.fallbackLocationHref !== "https://mail.google.com/mail/u/0/#inbox" ||
      actual.fallbackBuiltInPage !== true ||
      actual.fallbackPageVisible !== false ||
      !arrayEquals(actual.fallbackResetCalls, ["fallback-reset"])
    ) {
      failures.push("Expected content-script shim page-context fallback to preserve snapshot identity and page-state helpers.");
    }

    if (
      actual.initializeResult !== true ||
      actual.missingInitializeResult !== false ||
      actual.initializedGlobalScopeMatches !== true ||
      actual.initializedWindowMatches !== true ||
      actual.initializedDocumentMatches !== true ||
      actual.initializedResolveGlobalValueMatches !== true ||
      actual.initializedCreateUiHelpersMatches !== true ||
      actual.initializedCreatePageContextMatches !== true
    ) {
      failures.push("Expected content-script shim to hand off runtime initialization with the local helper factories and to no-op when runtime is unavailable.");
    }

    return {
      id: "module-content-script-shim",
      title: "Content-script shim preserves helper factory wiring, fallbacks, and runtime initialization handoff",
      mode: "active",
      status: failures.length ? "failed" : "passed",
      sectionId: "module-regressions",
      sectionTitle: "Module Regressions",
      expected: {
        resolvedMarkerOk: true,
        fallbackRailBadge: "99+",
        fallbackMetricCount: "1 URL",
        fallbackTimingValue: "12.3 ms",
        fallbackTimestampEmpty: "Not detected",
        fallbackPaneKey: "inbox-read::Opened email body::alpha beta",
        fallbackSignature: "inbox-read::Opened email body::<p>mail</p>::topic-digest",
        initializeResult: true,
        missingInitializeResult: false
      },
      targetExpected: null,
      actual: actual,
      failures: failures
    };
  } finally {
    originalDescriptors.forEach(function restoreGlobalDescriptor(entry) {
      if (entry.hadOwnProperty) {
        Object.defineProperty(globalThis, entry.name, entry.descriptor);
      } else {
        delete globalThis[entry.name];
      }
    });
  }
}

function runContentScriptRuntimeRegression() {
  const debugEvents = [];
  let contentUiHelperFactoryCalls = 0;
  let contentPageContextFactoryCalls = 0;
  const debugApi = {
    configure: function configure(details) {
      debugEvents.push(["configure", details && details.module ? details.module : ""]);
    },
    runtime: function runtime(message, details) {
      debugEvents.push([
        "runtime",
        message,
        details && details.host ? details.host : "",
        details && details.readyState ? details.readyState : ""
      ]);
    },
    error: function error(message, details) {
      debugEvents.push(["error", message, details || {}]);
    }
  };
  const initializeResult = contentScriptRuntime.initialize({
    globalScope: {
      window: {
        location: {
          hostname: "mail.example.com",
          href: "https://mail.example.com/message/1"
        }
      },
      document: {
        readyState: "interactive"
      }
    },
    resolveGlobalValue: function resolveGlobalValue(propertyName) {
      return propertyName === "mergedLinkLabDebug" ? debugApi : null;
    },
    createWorkflowContentUiHelpers: function createWorkflowContentUiHelpers() {
      contentUiHelperFactoryCalls += 1;
      return Object.freeze({});
    },
    createWorkflowContentPageContext: function createWorkflowContentPageContext() {
      contentPageContextFactoryCalls += 1;
      return Object.freeze({});
    }
  });
  const errorEvent = debugEvents.find(function findErrorEvent(entry) {
    return Array.isArray(entry) && entry[0] === "error";
  });
  const errorDetails = errorEvent && errorEvent[2] ? errorEvent[2] : {};
  const actual = {
    initializeResult: initializeResult,
    debugEventKinds: debugEvents.map(function mapDebugEvent(entry) {
      return entry[0];
    }),
    debugRuntimeHost: debugEvents[1] ? debugEvents[1][2] : "",
    debugRuntimeReadyState: debugEvents[1] ? debugEvents[1][3] : "",
    contentUiHelperFactoryCalls: contentUiHelperFactoryCalls,
    contentPageContextFactoryCalls: contentPageContextFactoryCalls,
    errorFlags: {
      hasExtensionApi: !!errorDetails.hasExtensionApi,
      hasRuntime: !!errorDetails.hasRuntime,
      hasPipeline: !!errorDetails.hasPipeline,
      hasContentInboxWorkflows: !!errorDetails.hasContentInboxWorkflows,
      hasContentPaneWorkflows: !!errorDetails.hasContentPaneWorkflows,
      hasContentWorkflowAccessors: !!errorDetails.hasContentWorkflowAccessors,
      hasCreateWorkflowContentUiHelpers: !!errorDetails.hasCreateWorkflowContentUiHelpers,
      hasCreateWorkflowContentPageContext: !!errorDetails.hasCreateWorkflowContentPageContext
    }
  };
  const failures = [];

  if (actual.initializeResult !== false) {
    failures.push("Expected content script runtime initialization to abort when required browser modules are missing.");
  }

  if (
    !arrayEquals(actual.debugEventKinds, ["configure", "runtime", "error"]) ||
    actual.debugRuntimeHost !== "mail.example.com" ||
    actual.debugRuntimeReadyState !== "interactive"
  ) {
    failures.push("Expected content script runtime to emit configure/runtime/error debug events with safe host and ready-state details.");
  }

  if (
    actual.contentUiHelperFactoryCalls !== 0 ||
    actual.contentPageContextFactoryCalls !== 0
  ) {
    failures.push("Expected content script runtime to abort before invoking helper factories when required modules are unavailable.");
  }

  if (
    actual.errorFlags.hasExtensionApi !== false ||
    actual.errorFlags.hasRuntime !== false ||
    actual.errorFlags.hasPipeline !== false ||
    actual.errorFlags.hasContentInboxWorkflows !== false ||
    actual.errorFlags.hasContentPaneWorkflows !== false ||
    actual.errorFlags.hasContentWorkflowAccessors !== false ||
    actual.errorFlags.hasCreateWorkflowContentUiHelpers !== true ||
    actual.errorFlags.hasCreateWorkflowContentPageContext !== true
  ) {
    failures.push("Expected content script runtime to report missing dependency flags accurately on abort.");
  }

  return {
    id: "module-content-script-runtime",
    title: "Content script runtime module aborts safely when required dependencies are unavailable",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      initializeResult: false,
      debugEventKinds: ["configure", "runtime", "error"],
      debugRuntimeHost: "mail.example.com",
      debugRuntimeReadyState: "interactive"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runContentWorkflowAccessorsRegression() {
  const storageEvents = [];
  const autoReplaceStateEvents = [];
  const observeCalls = [];
  const activeEmailRoot = { id: "active-root" };
  const candidateList = [
    { id: "candidate-1", root: { id: "root-1" } },
    { id: "candidate-2", root: { id: "root-2" } }
  ];
  const controller = contentWorkflowAccessors.create({
    storageModel: {
      normalizeTrackingParameterFilters: function normalizeTrackingParameterFilters(value) {
        return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
      }
    },
    extensionSettings: {
      enableUrlNormalizationRepair: true,
      stripKnownTrackingParameters: false,
      trackingParameterFilters: ["utm_source", "", "gclid"]
    },
    getNow: function getNow() {
      return 4242;
    },
    getWorkflowEmailCandidateDiscovery: function getWorkflowEmailCandidateDiscovery() {
      return {
        getCandidateMissingGraceWindow: function getCandidateMissingGraceWindow() {
          return 7000;
        },
        getInboxRootCandidates: function getInboxRootCandidates() {
          return candidateList.slice();
        },
        getInboxDetectionFailure: function getInboxDetectionFailure() {
          return {
            kind: "selector-empty-match",
            providerId: "gmail"
          };
        },
        choosePrimaryEmailCandidate: function choosePrimaryEmailCandidate(candidates) {
          return Array.isArray(candidates) && candidates.length > 1 ? candidates[1] : null;
        },
        choosePrimaryInboxRoot: function choosePrimaryInboxRoot(candidates) {
          return Array.isArray(candidates) && candidates.length && candidates[0] ? candidates[0].root : null;
        }
      };
    },
    getWorkflowContentSettingsStorage: function getWorkflowContentSettingsStorage() {
      return {
        setExtensionStorageSnapshot: function setExtensionStorageSnapshot(source, storedSettings, errorMessage) {
          storageEvents.push(["snapshot", source, storedSettings && storedSettings.enableRepair === true, errorMessage]);
        },
        applyStoredPipelineSetting: function applyStoredPipelineSetting(nextValue) {
          storageEvents.push(["pipeline", nextValue]);
        },
        applyStoredTrackingParameterStripSetting: function applyStoredTrackingParameterStripSetting(nextValue) {
          storageEvents.push(["strip", nextValue]);
        },
        applyStoredTrackingParameterFiltersSetting: function applyStoredTrackingParameterFiltersSetting(nextValue) {
          storageEvents.push(["filters", Array.isArray(nextValue) ? nextValue.slice() : []]);
        },
        applyStoredReplaceEmailBodySetting: function applyStoredReplaceEmailBodySetting(nextValue) {
          storageEvents.push(["replace", nextValue]);
        },
        loadPipelineSettings: async function loadPipelineSettings() {
          return {
            enableUrlNormalizationRepair: false,
            stripKnownTrackingParameters: true,
            trackingParameterFilters: ["loaded-filter"]
          };
        },
        handlePipelineStorageChange: function handlePipelineStorageChange(changes, areaName) {
          return areaName === "local" && !!changes;
        }
      };
    },
    getWorkflowEmailAutoReplaceState: function getWorkflowEmailAutoReplaceState() {
      return {
        refreshConfiguredSenderDetectionState: function refreshConfiguredSenderDetectionState() {
          autoReplaceStateEvents.push(["refresh"]);
        },
        applyStoredAutoApplyMirrorForConfiguredSendersSetting: function applyStoredAutoApplyMirrorForConfiguredSendersSetting(
          nextValue
        ) {
          autoReplaceStateEvents.push(["autoApply", nextValue]);
        },
        applyStoredAutoApplyMirrorSenderEmailList: function applyStoredAutoApplyMirrorSenderEmailList(nextValue, options) {
          autoReplaceStateEvents.push([
            "senderList",
            Array.isArray(nextValue) ? nextValue.slice() : [],
            !!(options && options.useDefaultList)
          ]);
        }
      };
    },
    getWorkflowEmailAutoReplace: function getWorkflowEmailAutoReplace() {
      return {
        hasConfiguredSenderText: function hasConfiguredSenderText(value) {
          return String(value || "").indexOf("alerts@example.com") !== -1;
        },
        hasConfiguredSenderElement: function hasConfiguredSenderElement() {
          return true;
        },
        isConfiguredSenderDetected: function isConfiguredSenderDetected(snapshot) {
          return !!(snapshot && snapshot.id === "snapshot-1");
        },
        hasNativeEmailExpansionControl: function hasNativeEmailExpansionControl(root) {
          return !!(root && root.id === "expandable-root");
        },
        shouldAutoReplaceEmailBodyWithMirrorContent: function shouldAutoReplaceEmailBodyWithMirrorContent(snapshot) {
          return !!(snapshot && snapshot.id === "snapshot-1");
        },
        shouldReplaceEmailBodyWithMirrorContent: function shouldReplaceEmailBodyWithMirrorContent(snapshot) {
          return !!(snapshot && snapshot.id === "snapshot-1");
        }
      };
    },
    getWorkflowEmailRootSummary: function getWorkflowEmailRootSummary() {
      return {
        getIframeEmailRootContentElement: function getIframeEmailRootContentElement(iframeElement) {
          return iframeElement && iframeElement.contentRoot ? iframeElement.contentRoot : null;
        },
        getEmailRootContentElement: function getEmailRootContentElement(element) {
          return element && element.contentRoot ? element.contentRoot : element;
        },
        getEmailRootHtmlMarkup: function getEmailRootHtmlMarkup(element) {
          return element && element.htmlMarkup ? element.htmlMarkup : "";
        },
        measureElementText: function measureElementText() {
          return {
            text: "hello world",
            lines: 2,
            words: 2
          };
        },
        summarizeEmailRoot: function summarizeEmailRoot(root, detectionMode) {
          return {
            detectedAt: 1111,
            detectionMode: detectionMode || "",
            sectionLabel: root && root.id ? root.id : "",
            sourceHtml: "<p>summary</p>",
            rawText: "hello world",
            pipelineSettings: { enabled: true },
            pipeline: {
              finalUrls: ["https://example.com"],
              digestEntries: [],
              errors: []
            },
            isTopicDigest: false
          };
        }
      };
    },
    getWorkflowEmailRootRuntime: function getWorkflowEmailRootRuntime() {
      return {
        applyRewriteToEmailBody: async function applyRewriteToEmailBody() {
          return { ok: true, applied: true };
        },
        getActiveEmailRoot: function getActiveEmailRoot() {
          return activeEmailRoot;
        },
        maybeReplaceEmailBodyWithMirrorContent: async function maybeReplaceEmailBodyWithMirrorContent(snapshot) {
          return { ok: true, applied: true, snapshot: snapshot || null };
        },
        observeEmailRoot: function observeEmailRoot(root) {
          observeCalls.push(root && root.id ? root.id : "");
        }
      };
    }
  });
  const fallbackController = contentWorkflowAccessors.create({
    storageModel: {
      normalizeTrackingParameterFilters: function normalizeTrackingParameterFilters(value) {
        return Array.isArray(value) ? value.slice() : [];
      }
    },
    extensionSettings: {
      enableUrlNormalizationRepair: false,
      stripKnownTrackingParameters: true,
      trackingParameterFilters: ["utm_source"]
    },
    getNow: function getNow() {
      return 4242;
    }
  });

  controller.refreshAutoApplyConfiguredSenderDetectionState();
  controller.setExtensionStorageSnapshot("storage.local", { enableRepair: true }, "");
  controller.applyStoredPipelineSetting(true);
  controller.applyStoredTrackingParameterStripSetting(false);
  controller.applyStoredTrackingParameterFiltersSetting(["utm_campaign"]);
  controller.applyStoredReplaceEmailBodySetting(true);
  controller.applyStoredAutoApplyMirrorForConfiguredSendersSetting(true);
  controller.applyStoredAutoApplyMirrorSenderEmailList(["alerts@example.com"], { useDefaultList: true });
  controller.observeEmailRoot({ id: "observed-root" });

  const delegatedLoadedSettings = await controller.loadPipelineSettings();
  const delegatedRewriteResult = await controller.applyRewriteToEmailBody();
  const delegatedMaybeReplaceResult = await controller.maybeReplaceEmailBodyWithMirrorContent({ id: "snapshot-1" });
  const fallbackLoadedSettings = await fallbackController.loadPipelineSettings();
  const fallbackRewriteResult = await fallbackController.applyRewriteToEmailBody();
  const fallbackMaybeReplaceResult = await fallbackController.maybeReplaceEmailBodyWithMirrorContent({
    id: "fallback-snapshot"
  });
  const fallbackSummary = fallbackController.summarizeEmailRoot(null, "fallback-mode");

  const actual = {
    delegatedGraceWindow: controller.getCandidateMissingGraceWindow(),
    delegatedCandidateIds: controller.getInboxRootCandidates().map(function mapCandidate(candidate) {
      return candidate.id;
    }),
    delegatedInboxDetectionFailureKind: controller.getInboxDetectionFailure([]).kind,
    delegatedPrimaryCandidateId: controller.choosePrimaryEmailCandidate(candidateList).id,
    delegatedPrimaryInboxRootId: controller.choosePrimaryInboxRoot(candidateList).id,
    delegatedPipelineSettings: controller.getPipelineSettings(),
    delegatedHasConfiguredSenderText: controller.hasConfiguredSenderText("Alerts <alerts@example.com>"),
    delegatedHasConfiguredSenderElement: controller.hasConfiguredSenderElement(),
    delegatedIsConfiguredSenderDetected: controller.isConfiguredSenderDetected({ id: "snapshot-1" }),
    delegatedHasNativeExpansionControl: controller.hasNativeEmailExpansionControl({ id: "expandable-root" }),
    delegatedShouldAutoReplace: controller.shouldAutoReplaceEmailBodyWithMirrorContent({ id: "snapshot-1" }),
    delegatedShouldReplace: controller.shouldReplaceEmailBodyWithMirrorContent({ id: "snapshot-1" }),
    delegatedLoadedSettings: delegatedLoadedSettings,
    delegatedIframeContentId: controller.getIframeEmailRootContentElement({ contentRoot: { id: "iframe-root" } }).id,
    delegatedEmailRootContentId: controller.getEmailRootContentElement({ contentRoot: { id: "content-root" } }).id,
    delegatedEmailRootHtmlMarkup: controller.getEmailRootHtmlMarkup({ htmlMarkup: "<p>summary</p>" }),
    delegatedMeasuredWords: controller.measureElementText({ id: "body-root" }).words,
    delegatedSummarySectionLabel: controller.summarizeEmailRoot({ id: "body-root" }, "gmail-inbox").sectionLabel,
    delegatedRewriteResult: delegatedRewriteResult,
    delegatedActiveEmailRootId: controller.getActiveEmailRoot().id,
    delegatedMaybeReplaceResult: delegatedMaybeReplaceResult,
    delegatedHandleStorageChange: controller.handlePipelineStorageChange({ enableRepair: { newValue: true } }, "local"),
    storageEvents: storageEvents.slice(),
    autoReplaceStateEvents: autoReplaceStateEvents.slice(),
    observeCalls: observeCalls.slice(),
    fallbackPrimaryCandidateId: fallbackController.choosePrimaryEmailCandidate([{ id: "fallback-first" }]).id,
    fallbackPrimaryInboxRootId: fallbackController.choosePrimaryInboxRoot([{ root: { id: "fallback-root" } }]).id,
    fallbackInboxDetectionFailure: fallbackController.getInboxDetectionFailure([]),
    fallbackLoadedSettings: fallbackLoadedSettings,
    fallbackMeasureText: fallbackController.measureElementText(null),
    fallbackSummary: fallbackSummary,
    fallbackRewriteResult: fallbackRewriteResult,
    fallbackActiveEmailRoot: fallbackController.getActiveEmailRoot(),
    fallbackMaybeReplaceResult: fallbackMaybeReplaceResult,
    fallbackHandleStorageChange: fallbackController.handlePipelineStorageChange(null, "local")
  };
  const failures = [];

  if (
    actual.delegatedGraceWindow !== 7000 ||
    actual.delegatedInboxDetectionFailureKind !== "selector-empty-match" ||
    !arrayEquals(actual.delegatedCandidateIds, ["candidate-1", "candidate-2"])
  ) {
    failures.push("Expected content workflow accessors to delegate inbox candidate discovery accessors.");
  }

  if (actual.delegatedPrimaryCandidateId !== "candidate-2" || actual.delegatedPrimaryInboxRootId !== "root-1") {
    failures.push("Expected content workflow accessors to delegate both primary-candidate access paths.");
  }

  if (
    actual.delegatedPipelineSettings.enableUrlNormalizationRepair !== true ||
    actual.delegatedPipelineSettings.stripKnownTrackingParameters !== false ||
    !arrayEquals(actual.delegatedPipelineSettings.trackingParameterFilters, ["utm_source", "gclid"])
  ) {
    failures.push("Expected content workflow accessors to normalize pipeline settings from extension state.");
  }

  if (
    actual.delegatedHasConfiguredSenderText !== true ||
    actual.delegatedHasConfiguredSenderElement !== true ||
    actual.delegatedIsConfiguredSenderDetected !== true ||
    actual.delegatedHasNativeExpansionControl !== true ||
    actual.delegatedShouldAutoReplace !== true ||
    actual.delegatedShouldReplace !== true
  ) {
    failures.push("Expected content workflow accessors to delegate configured-sender and replace-eligibility checks.");
  }

  if (
    actual.delegatedLoadedSettings.enableUrlNormalizationRepair !== false ||
    actual.delegatedLoadedSettings.stripKnownTrackingParameters !== true ||
    !arrayEquals(actual.delegatedLoadedSettings.trackingParameterFilters, ["loaded-filter"])
  ) {
    failures.push("Expected content workflow accessors to delegate pipeline settings loading.");
  }

  if (
    actual.delegatedIframeContentId !== "iframe-root" ||
    actual.delegatedEmailRootContentId !== "content-root" ||
    actual.delegatedEmailRootHtmlMarkup !== "<p>summary</p>" ||
    actual.delegatedMeasuredWords !== 2 ||
    actual.delegatedSummarySectionLabel !== "body-root"
  ) {
    failures.push("Expected content workflow accessors to delegate email-root summary helpers.");
  }

  if (
    actual.delegatedRewriteResult.applied !== true ||
    actual.delegatedActiveEmailRootId !== "active-root" ||
    actual.delegatedMaybeReplaceResult.applied !== true ||
    actual.delegatedMaybeReplaceResult.snapshot.id !== "snapshot-1" ||
    actual.delegatedHandleStorageChange !== true
  ) {
    failures.push("Expected content workflow accessors to delegate email-root runtime and storage-change helpers.");
  }

  if (
    !arrayEquals(actual.storageEvents, [
      ["snapshot", "storage.local", true, ""],
      ["pipeline", true],
      ["strip", false],
      ["filters", ["utm_campaign"]],
      ["replace", true]
    ]) ||
    !arrayEquals(actual.autoReplaceStateEvents, [
      ["refresh"],
      ["autoApply", true],
      ["senderList", ["alerts@example.com"], true]
    ]) ||
    !arrayEquals(actual.observeCalls, ["observed-root"])
  ) {
    failures.push("Expected content workflow accessors to forward state-changing calls to the current workflow controllers.");
  }

  if (
    actual.fallbackPrimaryCandidateId !== "fallback-first" ||
    actual.fallbackPrimaryInboxRootId !== "fallback-root" ||
    actual.fallbackInboxDetectionFailure !== null ||
    actual.fallbackLoadedSettings.enableUrlNormalizationRepair !== false ||
    actual.fallbackLoadedSettings.stripKnownTrackingParameters !== true ||
    !arrayEquals(actual.fallbackLoadedSettings.trackingParameterFilters, ["utm_source"])
  ) {
    failures.push("Expected content workflow accessors fallbacks to preserve deterministic pipeline defaults.");
  }

  if (
    actual.fallbackMeasureText.lines !== 0 ||
    actual.fallbackMeasureText.words !== 0 ||
    actual.fallbackSummary.detectedAt !== 4242 ||
    actual.fallbackSummary.detectionMode !== "fallback-mode" ||
    actual.fallbackSummary.pipeline.finalUrls.length !== 0 ||
    actual.fallbackRewriteResult.applied !== false ||
    actual.fallbackActiveEmailRoot !== null ||
    actual.fallbackMaybeReplaceResult.snapshot.id !== "fallback-snapshot" ||
    actual.fallbackHandleStorageChange !== false
  ) {
    failures.push("Expected content workflow accessors to expose stable fallback behavior when workflow modules are unavailable.");
  }

  return {
    id: "module-content-workflow-accessors",
    title: "Content workflow accessors module delegates live workflow helpers and preserves stable fallbacks",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      delegatedGraceWindow: 7000,
      delegatedPrimaryCandidateId: "candidate-2",
      delegatedPipelineFilters: ["utm_source", "gclid"],
      delegatedSummarySectionLabel: "body-root",
      fallbackSummaryDetectionMode: "fallback-mode",
      fallbackRewriteApplied: false
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPagePaneDiagnosticsRegression() {
  const renderCalls = [];
  const diagnostics = pagePaneDiagnostics.create({
    extensionManifest: {
      name: "URL Forensics Workbench",
      version: "0.3.0"
    },
    extensionSettings: {
      replaceEmailBodyWithMirrorContent: false,
      autoApplyMirrorForConfiguredSenders: true,
      autoApplyMirrorSenderEmailList: ["sender@example.com"]
    },
    extensionStorageSnapshot: {
      values: {
        trackingParameterFilters: {
          effectiveValue: {
            utmPrefix: true,
            gclid: true
          }
        }
      }
    },
    getPipelineSettings: function getPipelineSettings() {
      return {
        enableUrlNormalizationRepair: true,
        stripKnownTrackingParameters: true
      };
    },
    formatTrackingParameterFilterSnapshotEntry: function formatTrackingParameterFilters() {
      return "safe: utm_*, gclid";
    },
    formatTimingValue: function formatTimingValue(value) {
      return Number.isFinite(Number(value)) ? String(Number(value)) + " ms" : "Unavailable";
    },
    formatTimestamp: function formatTimestamp() {
      return "2026-04-08 12:00:00";
    },
    getNavigationPerformanceEntry: function getNavigationPerformanceEntry() {
      return {
        type: "navigate",
        domInteractive: 100,
        domContentLoadedEventEnd: 200,
        loadEventEnd: 300
      };
    },
    getInboxDetectionFailure: function getInboxDetectionFailure() {
      return {
        kind: "selector-empty-match",
        providerId: "gmail",
        providerTitle: "Gmail",
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        matchedProviderTitles: ["Gmail"],
        checkedSelectors: ["div.maincontent", ".a3s.aiL"],
        matchedSelectors: [],
        selectorHitCount: 0,
        candidateCount: 0,
        message: "Matched the inbox provider, but no configured provider body selector found an email body element."
      };
    },
    escapeHtml: function escapeHtml(textValue) {
      return String(textValue || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
    replaceElementMarkup: function replaceElementMarkup(targetElement, htmlMarkup) {
      targetElement.html = htmlMarkup;
      renderCalls.push(htmlMarkup);
    }
  });
  const activeSections = diagnostics.buildDiagnosticsSections({
    detectedAt: 1712592000000,
    detectionMode: "inbox",
    sectionLabel: "Opened email body",
    sourceHtml: "<p>email</p>",
    pipelineSettings: {
      enableUrlNormalizationRepair: true,
      stripKnownTrackingParameters: true
    },
    pipeline: {
      items: [{}],
      finalUrls: ["https://example.com"],
      changedUrls: [],
      rewrittenCount: 1,
      digestEntries: [{}],
      diagnostics: {
        lines: ["INPUT CHARS: 42"]
      },
      errors: []
    }
  });
  const waitingSections = diagnostics.buildDiagnosticsSections(null);
  const renderTarget = {};

  diagnostics.renderDiagnosticsSections(renderTarget, activeSections);

  const actual = {
    activeSectionTitles: activeSections.map(function mapSectionTitle(section) {
      return section.title;
    }),
    waitingPipelineLine: waitingSections[2] && waitingSections[2].lines ? waitingSections[2].lines[0] : "",
    waitingFailureKindLine: waitingSections[2] && waitingSections[2].lines ? waitingSections[2].lines[1] : "",
    renderedHtmlIncludesUrlDetection: renderCalls[0] ? renderCalls[0].indexOf("URL Detection") !== -1 : false,
    renderedHtmlIncludesInputChars: renderCalls[0] ? renderCalls[0].indexOf("INPUT CHARS: 42") !== -1 : false
  };
  const failures = [];

  if (!arrayEquals(actual.activeSectionTitles, ["Extension Details", "Runtime Status", "URL Detection"])) {
    failures.push("Expected page-pane diagnostics sections to expose extension, runtime, and URL detection sections.");
  }

  if (actual.waitingPipelineLine.indexOf("Inbox Detection Failure:") !== 0) {
    failures.push("Expected waiting diagnostics state to expose an explicit inbox detection failure when available.");
  }

  if (actual.waitingFailureKindLine !== "Failure Kind: selector-empty-match") {
    failures.push("Expected waiting diagnostics state to surface the inbox detection failure kind.");
  }

  if (!actual.renderedHtmlIncludesUrlDetection) {
    failures.push("Expected rendered diagnostics markup to include the URL Detection title.");
  }

  if (!actual.renderedHtmlIncludesInputChars) {
    failures.push("Expected rendered diagnostics markup to include pipeline diagnostic lines.");
  }

  return {
    id: "module-page-pane-diagnostics",
    title: "Page pane diagnostics module builds and renders the diagnostics tab",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      activeSectionTitles: ["Extension Details", "Runtime Status", "URL Detection"],
      waitingPipelineLineStartsWith: "Inbox Detection Failure:",
      waitingFailureKindLine: "Failure Kind: selector-empty-match",
      renderedHtmlIncludesUrlDetection: true,
      renderedHtmlIncludesInputChars: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPagePaneShellRegression() {
  const paneMarkup = pagePaneShell.buildPaneMarkup({
    hoverLinkPanelExpanded: true
  });
  const fakePaneRoot = {
    querySelector: function querySelector(selector) {
      return { selector: selector };
    },
    querySelectorAll: function querySelectorAll(selector) {
      if (selector === "[data-tab-button]") {
        return [{ role: "button-converted" }, { role: "button-backup" }, { role: "button-lab" }, { role: "button-diagnostics" }];
      }

      if (selector === "[data-tab-panel]") {
        return [{ role: "panel-converted" }, { role: "panel-backup" }, { role: "panel-lab" }, { role: "panel-diagnostics" }];
      }

      return [];
    }
  };
  const collectedElements = pagePaneShell.collectElements(fakePaneRoot);
  const actual = {
    markupIncludesHoverSummary: paneMarkup.indexOf("Hovered Link") !== -1,
    markupIncludesOpenHoverDetails: paneMarkup.indexOf("<details") !== -1 && paneMarkup.indexOf(" open") !== -1,
    markupIncludesDiagnosticsPane: paneMarkup.indexOf('data-role="diagnosticsPane"') !== -1,
    markupIncludesBackupPane: paneMarkup.indexOf('data-role="backupPane"') !== -1,
    markupIncludesBackupFrame: paneMarkup.indexOf('data-role="backupFrame"') !== -1,
    markupIncludesBackupPayload: paneMarkup.indexOf('data-role="backupPayload"') !== -1,
    tabButtonCount: Array.isArray(collectedElements.tabButtons) ? collectedElements.tabButtons.length : 0,
    tabPanelCount: Array.isArray(collectedElements.tabPanels) ? collectedElements.tabPanels.length : 0,
    hasConvertedPaneSelector: !!(collectedElements.convertedPane && collectedElements.convertedPane.selector === '[data-role="convertedPane"]'),
    hasBackupPaneSelector: !!(collectedElements.backupPane && collectedElements.backupPane.selector === '[data-role="backupPane"]'),
    hasBackupFrameSelector: !!(collectedElements.backupFrame && collectedElements.backupFrame.selector === '[data-role="backupFrame"]'),
    hasBackupPayloadSelector: !!(collectedElements.backupPayload && collectedElements.backupPayload.selector === '[data-role="backupPayload"]'),
    hasHoverLinkInfoSelector: !!(collectedElements.hoverLinkInfo && collectedElements.hoverLinkInfo.selector === '[data-role="hoverLinkInfo"]')
  };
  const failures = [];

  if (!actual.markupIncludesHoverSummary) {
    failures.push("Expected page pane shell markup to include the Hovered Link summary.");
  }

  if (!actual.markupIncludesOpenHoverDetails) {
    failures.push("Expected page pane shell markup to honor the expanded hover-link state.");
  }

  if (!actual.markupIncludesDiagnosticsPane) {
    failures.push("Expected page pane shell markup to include the diagnostics pane mount.");
  }

  if (!actual.markupIncludesBackupPane) {
    failures.push("Expected page pane shell markup to include the original email backup pane mount.");
  }

  if (!actual.markupIncludesBackupFrame || !actual.markupIncludesBackupPayload) {
    failures.push("Expected page pane shell markup to include both the rich backup frame and hidden authoritative backup payload.");
  }

  if (actual.tabButtonCount !== 4) {
    failures.push("Expected page pane shell element collection to return four tab buttons.");
  }

  if (actual.tabPanelCount !== 4) {
    failures.push("Expected page pane shell element collection to return four tab panels.");
  }

  if (!actual.hasConvertedPaneSelector) {
    failures.push("Expected page pane shell element collection to expose the converted pane selector.");
  }

  if (!actual.hasBackupPaneSelector) {
    failures.push("Expected page pane shell element collection to expose the backup pane selector.");
  }

  if (!actual.hasBackupFrameSelector || !actual.hasBackupPayloadSelector) {
    failures.push("Expected page pane shell element collection to expose the rich backup frame and hidden payload selectors.");
  }

  if (!actual.hasHoverLinkInfoSelector) {
    failures.push("Expected page pane shell element collection to expose the hover-link details selector.");
  }

  return {
    id: "module-page-pane-shell",
    title: "Page pane shell module builds shell markup and collects shell elements",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      markupIncludesHoverSummary: true,
      markupIncludesOpenHoverDetails: true,
      markupIncludesDiagnosticsPane: true,
      markupIncludesBackupPane: true,
      markupIncludesBackupFrame: true,
      markupIncludesBackupPayload: true,
      tabButtonCount: 4,
      tabPanelCount: 4,
      hasConvertedPaneSelector: true,
      hasBackupPaneSelector: true,
      hasBackupFrameSelector: true,
      hasBackupPayloadSelector: true,
      hasHoverLinkInfoSelector: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPagePaneBootstrapRegression() {
  const observedCalls = [];

  function createFakeEventTarget(tagName, attributeMap) {
    const listeners = {};
    return {
      tagName: tagName,
      src: "",
      open: false,
      addEventListener: function addEventListener(eventName, handler) {
        listeners[eventName] = handler;
      },
      emit: function emit(eventName) {
        if (listeners[eventName]) {
          listeners[eventName]();
        }
      },
      getAttribute: function getAttribute(name) {
        return attributeMap && Object.prototype.hasOwnProperty.call(attributeMap, name)
          ? attributeMap[name]
          : null;
      }
    };
  }

  const elements = {
    hoverLinkInfo: createFakeEventTarget("DETAILS"),
    convertedPane: createFakeEventTarget("IFRAME"),
    labFrame: createFakeEventTarget("IFRAME"),
    railToggleButton: createFakeEventTarget("BUTTON"),
    collapseButton: createFakeEventTarget("BUTTON"),
    settingsButton: createFakeEventTarget("BUTTON"),
    refreshButton: createFakeEventTarget("BUTTON"),
    tabButtons: [
      createFakeEventTarget("BUTTON", { "data-tab-button": "converted" }),
      createFakeEventTarget("BUTTON", { "data-tab-button": "backup" }),
      createFakeEventTarget("BUTTON", { "data-tab-button": "lab" }),
      createFakeEventTarget("BUTTON", { "data-tab-button": "diagnostics" })
    ]
  };

  pagePaneBootstrap.initialize(elements, {
    hoverLinkPanelExpanded: true,
    labFrameUrl: "moz-extension://test/core-components/extension-workbench.html",
    syncHoverLinkExpanded: function syncHoverLinkExpanded(isExpanded) {
      observedCalls.push("sync:" + String(isExpanded));
    },
    onHoverLinkToggle: function onHoverLinkToggle(isExpanded) {
      observedCalls.push("hover:" + String(isExpanded));
    },
    onMirrorFrameLoad: function onMirrorFrameLoad() {
      observedCalls.push("mirror-load");
    },
    onLabFrameLoad: function onLabFrameLoad() {
      observedCalls.push("lab-load");
    },
    onRailToggle: function onRailToggle() {
      observedCalls.push("rail-toggle");
    },
    onCollapse: function onCollapse() {
      observedCalls.push("collapse");
    },
    onOpenSettings: function onOpenSettings() {
      observedCalls.push("settings");
    },
    onRefresh: function onRefresh() {
      observedCalls.push("refresh");
    },
    onTabSelect: function onTabSelect(tabKey) {
      observedCalls.push("tab:" + tabKey);
    },
    initialActiveTabKey: "converted"
  });

  elements.hoverLinkInfo.open = false;
  elements.hoverLinkInfo.emit("toggle");
  elements.convertedPane.emit("load");
  elements.labFrame.emit("load");
  elements.railToggleButton.emit("click");
  elements.collapseButton.emit("click");
  elements.settingsButton.emit("click");
  elements.refreshButton.emit("click");
  elements.tabButtons[1].emit("click");
  elements.tabButtons[2].emit("click");

  const actual = {
    labFrameSrc: elements.labFrame.src,
    observedCalls: observedCalls.slice()
  };
  const failures = [];

  if (actual.labFrameSrc !== "moz-extension://test/core-components/extension-workbench.html") {
    failures.push("Expected page pane bootstrap to assign the lab frame src.");
  }

  [
    "sync:true",
    "tab:converted",
    "hover:false",
    "mirror-load",
    "lab-load",
    "rail-toggle",
    "collapse",
    "settings",
    "refresh",
    "tab:backup",
    "tab:lab"
  ].forEach(function requireObservedCall(callName) {
    if (actual.observedCalls.indexOf(callName) === -1) {
      failures.push("Expected page pane bootstrap to emit callback " + JSON.stringify(callName) + ".");
    }
  });

  return {
    id: "module-page-pane-bootstrap",
    title: "Page pane bootstrap module wires controls and frame bootstrapping callbacks",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      labFrameSrc: "moz-extension://test/core-components/extension-workbench.html",
      observedCallsIncludes: [
        "sync:true",
        "tab:converted",
        "hover:false",
        "mirror-load",
        "lab-load",
        "rail-toggle",
        "collapse",
        "settings",
        "refresh",
        "tab:backup",
        "tab:lab"
      ]
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPagePaneAssemblyRegression() {
  function createFakeClassList() {
    const activeClasses = new Set();

    return {
      toggle: function toggle(className, force) {
        if (force === true) {
          activeClasses.add(className);
          return true;
        }

        if (force === false) {
          activeClasses.delete(className);
          return false;
        }

        if (activeClasses.has(className)) {
          activeClasses.delete(className);
          return false;
        }

        activeClasses.add(className);
        return true;
      },
      contains: function contains(className) {
        return activeClasses.has(className);
      }
    };
  }

  function createFakeTabElement(attributeName, attributeValue) {
    const attributes = {};
    attributes[attributeName] = attributeValue;

    return {
      hidden: false,
      classList: createFakeClassList(),
      setAttribute: function setAttribute(name, value) {
        attributes[name] = value;
      },
      getAttribute: function getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
      },
      getAttributes: function getAttributes() {
        return Object.assign({}, attributes);
      }
    };
  }

  const replaceCalls = [];
  const bindHoverInspectorCalls = [];
  const labSyncCalls = [];
  const expansionCalls = [];
  const settingsCalls = [];
  const refreshCalls = [];
  const bootstrapCalls = [];
  const reservationCalls = [];
  const mountTarget = {
    appendedChildren: [],
    appendChild: function appendChild(node) {
      node.isConnected = true;
      this.appendedChildren.push(node);
    }
  };
  const documentObject = {
    body: mountTarget,
    documentElement: {},
    createElement: function createElement(tagName) {
      const attributes = {};
      return {
        tagName: String(tagName || "").toUpperCase(),
        id: "",
        isConnected: false,
        ownerDocument: documentObject,
        classList: createFakeClassList(),
        setAttribute: function setAttribute(name, value) {
          attributes[name] = value;
        },
        getAttribute: function getAttribute(name) {
          return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
        }
      };
    }
  };
  const tabButtons = [
    createFakeTabElement("data-tab-button", "converted"),
    createFakeTabElement("data-tab-button", "backup"),
    createFakeTabElement("data-tab-button", "lab"),
    createFakeTabElement("data-tab-button", "diagnostics")
  ];
  const tabPanels = [
    createFakeTabElement("data-tab-panel", "converted"),
    createFakeTabElement("data-tab-panel", "backup"),
    createFakeTabElement("data-tab-panel", "lab"),
    createFakeTabElement("data-tab-panel", "diagnostics")
  ];
  const hoverLinkInfo = createFakeTabElement("data-role", "hoverLinkInfo");
  const elements = {
    root: {
      id: "existing-root",
      isConnected: true
    },
    hoverLinkPanelExpanded: true,
    activeTabKey: "converted",
    isExpanded: false,
    labFrameLoaded: false
  };
  let latestSnapshot = null;
  let bootstrapOptions = null;
  const assembly = pagePaneAssembly.create({
    documentObject: documentObject,
    elements: elements,
    labFrameUrl: "moz-extension://test/core-components/extension-workbench.html",
    buildPaneMarkup: function buildPaneMarkup(options) {
      return "pane-markup:" + String(options.hoverLinkPanelExpanded === true);
    },
    collectPaneElements: function collectPaneElements() {
      return {
        tabButtons: tabButtons,
        tabPanels: tabPanels,
        hoverLinkInfo: hoverLinkInfo
      };
    },
    initializePaneBootstrap: function initializePaneBootstrap(targetElements, options) {
      bootstrapCalls.push(targetElements);
      bootstrapOptions = options;
    },
    replaceElementMarkup: function replaceElementMarkup(targetElement, htmlMarkup) {
      replaceCalls.push({
        targetElement: targetElement,
        htmlMarkup: htmlMarkup
      });
    },
    bindHoverInspector: function bindHoverInspector() {
      bindHoverInspectorCalls.push("bind");
    },
    syncLabFrameWithSnapshot: function syncLabFrameWithSnapshot(snapshot) {
      labSyncCalls.push(snapshot && snapshot.id ? snapshot.id : "");
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return latestSnapshot;
    },
    setPaneExpanded: function setPaneExpanded(nextExpanded) {
      expansionCalls.push(nextExpanded);
      elements.isExpanded = nextExpanded === true;
    },
    syncPageViewportReservation: function syncPageViewportReservation() {
      reservationCalls.push("sync");
    },
    openSettingsPage: function openSettingsPage() {
      settingsCalls.push("settings");
    },
    forceRefreshCurrentSnapshot: function forceRefreshCurrentSnapshot() {
      refreshCalls.push("refresh");
    },
    clearPane: function clearPane() {
      bootstrapCalls.push("clear");
    }
  });
  const existingPane = assembly.ensurePane();

  elements.root = null;
  const createdPane = assembly.ensurePane();
  const repeatedPane = assembly.ensurePane();

  bootstrapOptions.onHoverLinkToggle(false);
  bootstrapOptions.onMirrorFrameLoad();
  bootstrapOptions.onRailToggle();
  latestSnapshot = { id: "snapshot-1" };
  bootstrapOptions.onLabFrameLoad();
  bootstrapOptions.onRailToggle();
  bootstrapOptions.onCollapse();
  bootstrapOptions.onOpenSettings();
  bootstrapOptions.onRefresh();
  bootstrapOptions.onTabSelect("diagnostics");
  const diagnosticsButtonAttributes = tabButtons[3].getAttributes();
  const diagnosticsPanelAttributes = tabPanels[3].getAttributes();
  const hoverInfoHiddenOnDiagnostics = hoverLinkInfo.hidden === true;

  elements.isExpanded = true;
  assembly.setActiveTab("converted");
  const convertedPanelAttributes = tabPanels[0].getAttributes();
  const actual = {
    existingPaneId: existingPane ? existingPane.id : "",
    createdPaneId: createdPane ? createdPane.id : "",
    createdPaneHiddenState: createdPane ? createdPane.getAttribute("aria-hidden") : "",
    mountedPaneCount: mountTarget.appendedChildren.length,
    repeatedPaneIsSame: repeatedPane === createdPane,
    replaceMarkupValue: replaceCalls[0] ? replaceCalls[0].htmlMarkup : "",
    bootstrapInitialActiveTabKey: bootstrapOptions ? bootstrapOptions.initialActiveTabKey : "",
    hoverLinkPanelExpandedAfterToggle: elements.hoverLinkPanelExpanded,
    bindHoverInspectorCount: bindHoverInspectorCalls.length,
    labFrameLoaded: elements.labFrameLoaded,
    labSyncCalls: labSyncCalls.slice(),
    expansionCalls: expansionCalls.slice(),
    settingsCallCount: settingsCalls.length,
    refreshCallCount: refreshCalls.length,
    activeTabKey: elements.activeTabKey,
    diagnosticsButtonAriaSelected: diagnosticsButtonAttributes["aria-selected"],
    diagnosticsPanelAriaHidden: diagnosticsPanelAttributes["aria-hidden"],
    hoverInfoHiddenOnDiagnostics: hoverInfoHiddenOnDiagnostics,
    convertedPanelIsActive: tabPanels[0].classList.contains("is-active"),
    convertedPanelAriaHidden: convertedPanelAttributes["aria-hidden"],
    hoverInfoHiddenOnConverted: hoverLinkInfo.hidden === true,
    reservationCallCount: reservationCalls.length,
    clearPaneCallCount: bootstrapCalls.filter(function isClearCall(callValue) {
      return callValue === "clear";
    }).length,
    bootstrapCallCount: bootstrapCalls.filter(function isBootstrapCall(callValue) {
      return callValue !== "clear";
    }).length
  };
  const failures = [];

  if (actual.existingPaneId !== "existing-root" || actual.repeatedPaneIsSame !== true) {
    failures.push("Expected page pane assembly to reuse the existing connected pane root.");
  }

  if (
    actual.createdPaneId !== "merged-link-lab-page-pane" ||
    actual.createdPaneHiddenState !== "true" ||
    actual.mountedPaneCount !== 1
  ) {
    failures.push("Expected page pane assembly to create and mount the sidepanel root once.");
  }

  if (
    actual.replaceMarkupValue !== "pane-markup:true" ||
    actual.bootstrapInitialActiveTabKey !== "converted" ||
    actual.clearPaneCallCount !== 1 ||
    actual.bootstrapCallCount !== 1
  ) {
    failures.push("Expected page pane assembly to render shell markup, initialize bootstrap wiring, and clear the pane after mount.");
  }

  if (
    actual.hoverLinkPanelExpandedAfterToggle !== false ||
    actual.bindHoverInspectorCount !== 1 ||
    actual.labFrameLoaded !== true ||
    !arrayEquals(actual.labSyncCalls, ["snapshot-1"])
  ) {
    failures.push("Expected page pane assembly bootstrap callbacks to update hover state, bind the mirror inspector, and sync the lab frame.");
  }

  if (!arrayEquals(actual.expansionCalls, [true, false, false])) {
    failures.push("Expected page pane assembly rail callbacks to open the pane before a snapshot exists, then keep normal toggle and collapse behavior once a snapshot is available.");
  }

  if (actual.settingsCallCount !== 1 || actual.refreshCallCount !== 1) {
    failures.push("Expected page pane assembly controls to route settings and refresh actions through the provided callbacks.");
  }

  if (
    actual.activeTabKey !== "converted" ||
    actual.diagnosticsButtonAriaSelected !== "true" ||
    actual.diagnosticsPanelAriaHidden !== "false" ||
    actual.hoverInfoHiddenOnDiagnostics !== true
  ) {
    failures.push("Expected page pane assembly to activate diagnostics tab state and hide hover details outside the converted tab.");
  }

  if (
    actual.convertedPanelIsActive !== true ||
    actual.convertedPanelAriaHidden !== "false" ||
    actual.hoverInfoHiddenOnConverted !== false ||
    actual.reservationCallCount !== 1
  ) {
    failures.push("Expected page pane assembly to reactivate the converted tab and resync viewport reservation when the pane is expanded.");
  }

  return {
    id: "module-page-pane-assembly",
    title: "Page pane assembly module mounts the pane shell and applies active-tab state transitions",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      createdPaneId: "merged-link-lab-page-pane",
      mountedPaneCount: 1,
      replaceMarkupValue: "pane-markup:true",
      expansionCalls: [true, false, false],
      activeTabKey: "converted",
      reservationCallCount: 1
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPagePaneLayoutRegression() {
  function createFakeClassList() {
    const activeClasses = new Set();

    return {
      add: function add(className) {
        activeClasses.add(className);
      },
      remove: function remove() {
        Array.from(arguments).forEach(function removeClassName(className) {
          activeClasses.delete(className);
        });
      },
      toggle: function toggle(className, force) {
        if (force === true) {
          activeClasses.add(className);
          return true;
        }

        if (force === false) {
          activeClasses.delete(className);
          return false;
        }

        if (activeClasses.has(className)) {
          activeClasses.delete(className);
          return false;
        }

        activeClasses.add(className);
        return true;
      },
      contains: function contains(className) {
        return activeClasses.has(className);
      }
    };
  }

  function createFakeStyle() {
    const styleState = {
      boxSizing: "",
      paddingRight: "",
      maxWidth: "",
      width: "",
      marginRight: "",
      transform: "",
      transformOrigin: "",
      minWidth: "",
      transition: "",
      properties: {}
    };

    styleState.setProperty = function setProperty(propertyName, propertyValue) {
      styleState.properties[propertyName] = propertyValue;
    };

    return styleState;
  }

  function createFakeElement() {
    const attributes = {};
    return {
      classList: createFakeClassList(),
      style: createFakeStyle(),
      setAttribute: function setAttribute(name, value) {
        attributes[name] = value;
      },
      getAttribute: function getAttribute(name) {
        return attributes[name];
      }
    };
  }

  const fakeRoot = createFakeElement();
  const fakeRailToggleButton = createFakeElement();
  const fakeDocumentElement = createFakeElement();
  fakeDocumentElement.clientWidth = 1280;
  fakeDocumentElement.clientHeight = 900;
  const fakeBody = createFakeElement();
  const elements = {
    root: fakeRoot,
    railToggleButton: fakeRailToggleButton,
    activeTabKey: "converted",
    isExpanded: false
  };
  let latestSnapshot = {
    id: "snapshot"
  };
  let ensuredPaneCount = 0;
  const layout = pagePaneLayout.create({
    elements: elements,
    ensurePane: function ensurePane() {
      ensuredPaneCount += 1;
      return fakeRoot;
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return latestSnapshot;
    },
    getActiveEmailRoot: function getActiveEmailRoot() {
      return null;
    },
    shouldAllowOpenWithoutSnapshot: function shouldAllowOpenWithoutSnapshot() {
      return false;
    },
    getVisiblePaneReservedWidth: function getVisiblePaneReservedWidth() {
      return 0;
    },
    windowObject: {
      innerWidth: 1280,
      innerHeight: 900
    },
    documentObject: {
      documentElement: fakeDocumentElement,
      body: fakeBody
    }
  });

  layout.setPaneExpanded(true);
  const afterSetExpanded = {
    isExpanded: elements.isExpanded,
    rootHasSnapshotClass: fakeRoot.classList.contains("has-snapshot"),
    rootExpandedClass: fakeRoot.classList.contains("is-expanded"),
    rootHiddenState: fakeRoot.getAttribute("aria-hidden"),
    railExpanded: fakeRailToggleButton.getAttribute("aria-expanded"),
    rootExpandedWidth: fakeRoot.style.properties["--merged-link-lab-page-pane-expanded-width"] || ""
  };
  const visibleResult = layout.togglePaneVisibility();
  latestSnapshot = null;
  const blockedWithoutSnapshotResult = layout.togglePaneVisibility();
  const afterBlockedWithoutSnapshot = {
    rootHidden: fakeRoot.getAttribute("aria-hidden"),
    railExpanded: fakeRailToggleButton.getAttribute("aria-expanded"),
    rootExpandedClass: fakeRoot.classList.contains("is-expanded"),
    rootPreDetectionVisibleClass: fakeRoot.classList.contains("is-pre-detection-visible")
  };
  const blockedOpenPaneResult = layout.openPane();
  const permissiveLayout = pagePaneLayout.create({
    elements: elements,
    ensurePane: function ensurePermissivePane() {
      ensuredPaneCount += 1;
      return fakeRoot;
    },
    getLatestSnapshot: function getLatestSnapshotForPermissiveLayout() {
      return latestSnapshot;
    },
    getActiveEmailRoot: function getActiveEmailRootForPermissiveLayout() {
      return null;
    },
    shouldAllowOpenWithoutSnapshot: function shouldAllowOpenWithoutSnapshotForPermissiveLayout() {
      return true;
    },
    getVisiblePaneReservedWidth: function getVisiblePaneReservedWidthForPermissiveLayout() {
      return 0;
    },
    windowObject: {
      innerWidth: 1280,
      innerHeight: 900
    },
    documentObject: {
      documentElement: fakeDocumentElement,
      body: fakeBody
    }
  });
  permissiveLayout.hidePane();
  const afterPermissiveHideWithoutSnapshot = {
    rootHidden: fakeRoot.getAttribute("aria-hidden"),
    railExpanded: fakeRailToggleButton.getAttribute("aria-expanded"),
    rootExpandedClass: fakeRoot.classList.contains("is-expanded"),
    rootPreDetectionVisibleClass: fakeRoot.classList.contains("is-pre-detection-visible")
  };
  const permissiveOpenWithoutSnapshotResult = permissiveLayout.togglePaneVisibility();
  const afterPermissiveOpenWithoutSnapshot = {
    rootHidden: fakeRoot.getAttribute("aria-hidden"),
    railExpanded: fakeRailToggleButton.getAttribute("aria-expanded"),
    rootExpandedClass: fakeRoot.classList.contains("is-expanded"),
    rootPreDetectionVisibleClass: fakeRoot.classList.contains("is-pre-detection-visible")
  };
  const permissiveHiddenResult = permissiveLayout.togglePaneVisibility();
  const afterPermissiveCollapsedWithoutSnapshot = {
    rootHidden: fakeRoot.getAttribute("aria-hidden"),
    railExpanded: fakeRailToggleButton.getAttribute("aria-expanded"),
    rootExpandedClass: fakeRoot.classList.contains("is-expanded"),
    rootPreDetectionVisibleClass: fakeRoot.classList.contains("is-pre-detection-visible")
  };
  const suppressedLayout = pagePaneLayout.create({
    elements: elements,
    ensurePane: function ensureSuppressedPane() {
      ensuredPaneCount += 1;
      return fakeRoot;
    },
    getLatestSnapshot: function getLatestSnapshotForSuppressedLayout() {
      return latestSnapshot;
    },
    getActiveEmailRoot: function getActiveEmailRootForSuppressedLayout() {
      return null;
    },
    shouldAllowOpenWithoutSnapshot: function shouldAllowOpenWithoutSnapshotForSuppressedLayout() {
      return false;
    },
    shouldSuppressPaneVisibility: function shouldSuppressPaneVisibilityForSuppressedLayout() {
      return true;
    },
    getVisiblePaneReservedWidth: function getVisiblePaneReservedWidthForSuppressedLayout() {
      return 0;
    },
    windowObject: {
      innerWidth: 1280,
      innerHeight: 900
    },
    documentObject: {
      documentElement: fakeDocumentElement,
      body: fakeBody
    }
  });
  suppressedLayout.showPane();
  const suppressedOpenPaneResult = suppressedLayout.openPane();
  const suppressedToggleResult = suppressedLayout.togglePaneVisibility();
  const afterSuppressedVisibilityGuard = {
    rootHidden: fakeRoot.getAttribute("aria-hidden"),
    railExpanded: fakeRailToggleButton.getAttribute("aria-expanded"),
    rootExpandedClass: fakeRoot.classList.contains("is-expanded"),
    rootHasSnapshotClass: fakeRoot.classList.contains("has-snapshot"),
    rootPreDetectionVisibleClass: fakeRoot.classList.contains("is-pre-detection-visible")
  };
  latestSnapshot = {
    id: "snapshot"
  };
  layout.showPane();
  const openPaneResult = layout.openPane();

  const actual = {
    afterSetExpanded: afterSetExpanded,
    visibleResult: visibleResult,
    blockedWithoutSnapshotResult: blockedWithoutSnapshotResult,
    blockedOpenPaneResult: blockedOpenPaneResult,
    permissiveOpenWithoutSnapshotResult: permissiveOpenWithoutSnapshotResult,
    permissiveHiddenResult: permissiveHiddenResult,
    suppressedOpenPaneResult: suppressedOpenPaneResult,
    suppressedToggleResult: suppressedToggleResult,
    openPaneResult: openPaneResult,
    ensuredPaneCount: ensuredPaneCount,
    rootHiddenAfterBlockedWithoutSnapshot: afterBlockedWithoutSnapshot.rootHidden,
    railExpandedAfterBlockedWithoutSnapshot: afterBlockedWithoutSnapshot.railExpanded,
    rootExpandedAfterBlockedWithoutSnapshot: afterBlockedWithoutSnapshot.rootExpandedClass,
    rootPreDetectionVisibleAfterBlockedWithoutSnapshot: afterBlockedWithoutSnapshot.rootPreDetectionVisibleClass,
    rootHiddenAfterPermissiveHideWithoutSnapshot: afterPermissiveHideWithoutSnapshot.rootHidden,
    rootExpandedAfterPermissiveHideWithoutSnapshot: afterPermissiveHideWithoutSnapshot.rootExpandedClass,
    rootPreDetectionVisibleAfterPermissiveHideWithoutSnapshot: afterPermissiveHideWithoutSnapshot.rootPreDetectionVisibleClass,
    rootHiddenAfterPermissiveOpenWithoutSnapshot: afterPermissiveOpenWithoutSnapshot.rootHidden,
    railExpandedAfterPermissiveOpenWithoutSnapshot: afterPermissiveOpenWithoutSnapshot.railExpanded,
    rootExpandedAfterPermissiveOpenWithoutSnapshot: afterPermissiveOpenWithoutSnapshot.rootExpandedClass,
    rootPreDetectionVisibleAfterPermissiveOpenWithoutSnapshot: afterPermissiveOpenWithoutSnapshot.rootPreDetectionVisibleClass,
    rootHiddenAfterPermissiveCollapseWithoutSnapshot: afterPermissiveCollapsedWithoutSnapshot.rootHidden,
    railExpandedAfterPermissiveCollapseWithoutSnapshot: afterPermissiveCollapsedWithoutSnapshot.railExpanded,
    rootExpandedAfterPermissiveCollapseWithoutSnapshot: afterPermissiveCollapsedWithoutSnapshot.rootExpandedClass,
    rootPreDetectionVisibleAfterPermissiveCollapseWithoutSnapshot: afterPermissiveCollapsedWithoutSnapshot.rootPreDetectionVisibleClass,
    rootHiddenAfterSuppressedVisibilityGuard: afterSuppressedVisibilityGuard.rootHidden,
    railExpandedAfterSuppressedVisibilityGuard: afterSuppressedVisibilityGuard.railExpanded,
    rootExpandedAfterSuppressedVisibilityGuard: afterSuppressedVisibilityGuard.rootExpandedClass,
    rootHasSnapshotAfterSuppressedVisibilityGuard: afterSuppressedVisibilityGuard.rootHasSnapshotClass,
    rootPreDetectionVisibleAfterSuppressedVisibilityGuard: afterSuppressedVisibilityGuard.rootPreDetectionVisibleClass,
    bodyReservedSpace: fakeBody.style.properties["--merged-link-lab-page-pane-reserved-space"] || ""
  };
  const failures = [];

  if (!actual.afterSetExpanded.rootHasSnapshotClass) {
    failures.push("Expected page pane layout to mark the root as having a snapshot when expanded.");
  }

  if (actual.afterSetExpanded.rootExpandedClass !== true || actual.afterSetExpanded.rootHiddenState !== "false") {
    failures.push("Expected page pane layout to expose the root when expanded.");
  }

  if (actual.afterSetExpanded.railExpanded !== "true") {
    failures.push("Expected page pane layout to mark the rail toggle button as expanded.");
  }

  if (!/px$/.test(actual.afterSetExpanded.rootExpandedWidth)) {
    failures.push("Expected page pane layout to publish an expanded width CSS variable.");
  }

  if (actual.visibleResult.ok !== true || actual.visibleResult.hasSnapshot !== true) {
    failures.push("Expected page pane layout toggle to succeed while a snapshot exists.");
  }

  if (
    actual.blockedWithoutSnapshotResult.ok !== false ||
    actual.blockedWithoutSnapshotResult.hasSnapshot !== false ||
    actual.blockedWithoutSnapshotResult.visible !== false ||
    actual.rootHiddenAfterBlockedWithoutSnapshot !== "true" ||
    actual.railExpandedAfterBlockedWithoutSnapshot !== "false" ||
    actual.rootExpandedAfterBlockedWithoutSnapshot !== false ||
    actual.rootPreDetectionVisibleAfterBlockedWithoutSnapshot !== false
  ) {
    failures.push("Expected page pane layout to block the empty helper state when pre-detection helper access is disabled.");
  }

  if (
    !actual.blockedOpenPaneResult ||
    actual.blockedOpenPaneResult.ok !== false ||
    actual.blockedOpenPaneResult.visible !== false
  ) {
    failures.push("Expected page pane layout openPane to refuse opening without a snapshot when pre-detection helper access is disabled.");
  }

  if (
    actual.rootHiddenAfterPermissiveHideWithoutSnapshot !== "false" ||
    actual.rootExpandedAfterPermissiveHideWithoutSnapshot !== false ||
    actual.rootPreDetectionVisibleAfterPermissiveHideWithoutSnapshot !== true
  ) {
    failures.push("Expected permissive page pane layout to keep the collapsed bubble visible without a snapshot.");
  }

  if (
    actual.permissiveOpenWithoutSnapshotResult.ok !== true ||
    actual.permissiveOpenWithoutSnapshotResult.hasSnapshot !== false ||
    actual.permissiveOpenWithoutSnapshotResult.visible !== true ||
    actual.rootHiddenAfterPermissiveOpenWithoutSnapshot !== "false" ||
    actual.railExpandedAfterPermissiveOpenWithoutSnapshot !== "true" ||
    actual.rootExpandedAfterPermissiveOpenWithoutSnapshot !== true ||
    actual.rootPreDetectionVisibleAfterPermissiveOpenWithoutSnapshot !== true
  ) {
    failures.push("Expected permissive page pane layout to open an empty helper state when no snapshot exists.");
  }

  if (
    actual.permissiveHiddenResult.ok !== true ||
    actual.permissiveHiddenResult.hasSnapshot !== false ||
    actual.permissiveHiddenResult.visible !== true ||
    actual.rootHiddenAfterPermissiveCollapseWithoutSnapshot !== "false" ||
    actual.rootExpandedAfterPermissiveCollapseWithoutSnapshot !== false ||
    actual.rootPreDetectionVisibleAfterPermissiveCollapseWithoutSnapshot !== true
  ) {
    failures.push("Expected permissive page pane layout to collapse back to a visible bubble without a snapshot.");
  }

  if (
    !actual.suppressedOpenPaneResult ||
    actual.suppressedOpenPaneResult.ok !== false ||
    actual.suppressedOpenPaneResult.visible !== false ||
    !actual.suppressedToggleResult ||
    actual.suppressedToggleResult.ok !== false ||
    actual.suppressedToggleResult.visible !== false ||
    actual.rootHiddenAfterSuppressedVisibilityGuard !== "true" ||
    actual.railExpandedAfterSuppressedVisibilityGuard !== "false" ||
    actual.rootExpandedAfterSuppressedVisibilityGuard !== false ||
    actual.rootHasSnapshotAfterSuppressedVisibilityGuard !== false ||
    actual.rootPreDetectionVisibleAfterSuppressedVisibilityGuard !== false
  ) {
    failures.push("Expected page pane layout to suppress the helper bubble entirely when the current inbox location is not eligible for pane visibility.");
  }

  if (actual.ensuredPaneCount !== 10) {
    failures.push("Expected page pane layout visibility operations to ensure the helper pane on each open, toggle, and show path.");
  }

  if (
    !actual.openPaneResult ||
    actual.openPaneResult.ok !== true ||
    actual.openPaneResult.visible !== true ||
    actual.openPaneResult.expanded !== true
  ) {
    failures.push("Expected page pane layout openPane to force the helper visible regardless of prior state.");
  }

  if (actual.bodyReservedSpace !== "0px") {
    failures.push("Expected page pane layout to publish zero reserved space with the current reservation policy.");
  }

  return {
    id: "module-page-pane-layout",
    title: "Page pane layout module manages visibility and viewport reservation state",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      afterSetExpanded: {
        rootHasSnapshotClass: true,
        rootExpandedClass: true,
        rootHiddenState: "false",
        railExpanded: "true",
        rootExpandedWidthEndsWithPx: true
      },
      visibleResult: {
        ok: true,
        hasSnapshot: true
      },
      blockedWithoutSnapshotResult: {
        ok: false,
        hasSnapshot: false,
        visible: false
      },
      blockedOpenPaneResult: {
        ok: false,
        visible: false
      },
      permissiveOpenWithoutSnapshotResult: {
        ok: true,
        hasSnapshot: false,
        visible: true
      },
      permissiveHiddenResult: {
        ok: true,
        hasSnapshot: false,
        visible: true
      },
      openPaneResult: {
        ok: true,
        visible: true,
        expanded: true
      },
      ensuredPaneCount: 7,
      rootHiddenAfterBlockedWithoutSnapshot: "true",
      rootHiddenAfterPermissiveHideWithoutSnapshot: "false",
      rootHiddenAfterPermissiveOpenWithoutSnapshot: "false",
      rootHiddenAfterPermissiveCollapseWithoutSnapshot: "false",
      bodyReservedSpace: "0px"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runPagePaneMirrorRegression() {
  function createFakeAnchor(hrefValue, extraAttributes) {
    const attributes = Object.assign({}, extraAttributes || {});

    if (hrefValue) {
      attributes.href = hrefValue;
    }

    return {
      nodeType: 1,
      parentElement: null,
      href: String(hrefValue || ""),
      closest: function closest(selector) {
        return selector === "a[href]" && Object.prototype.hasOwnProperty.call(attributes, "href") ? this : null;
      },
      getAttribute: function getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
      },
      setAttribute: function setAttribute(name, value) {
        attributes[name] = String(value);
        if (name === "href") {
          this.href = String(value);
        }
      },
      removeAttribute: function removeAttribute(name) {
        delete attributes[name];
        if (name === "href") {
          this.href = "";
        }
      },
      getAttributes: function getAttributes() {
        return Object.assign({}, attributes);
      }
    };
  }

  function serializeAnchor(anchorElement, textValue) {
    const attributeEntries = Object.entries(anchorElement.getAttributes()).map(function mapAttributeEntry(entry) {
      return entry[0] + '="' + String(entry[1]).replace(/"/g, "&quot;") + '"';
    });

    return "<a" + (attributeEntries.length ? " " + attributeEntries.join(" ") : "") + ">" + textValue + "</a>";
  }

  function FakeDOMParser() {}

  FakeDOMParser.prototype.parseFromString = function parseFromString() {
    const sameDocumentAnchor = createFakeAnchor("#section");
    const externalAnchor = createFakeAnchor("https://example.com/next");
    const fakeBody = {
      querySelectorAll: function querySelectorAll(selector) {
        return selector === "a[href]" ? [sameDocumentAnchor, externalAnchor] : [];
      }
    };

    Object.defineProperty(fakeBody, "innerHTML", {
      get: function getInnerHtml() {
        return serializeAnchor(sameDocumentAnchor, "Jump") + serializeAnchor(externalAnchor, "Next");
      }
    });

    return {
      body: fakeBody,
      documentElement: fakeBody
    };
  };

  const hoverAnchor = createFakeAnchor(
    "https://example.com/path/article?utm_source=news&ref=abc#section",
    { title: "native hover title" }
  );
  const mirrorEventHandlers = {};
  const mirrorDocument = {
    baseURI: "https://example.com/base/page",
    querySelectorAll: function querySelectorAll(selector) {
      return selector === "a[title]" ? [hoverAnchor] : [];
    },
    addEventListener: function addEventListener(eventName, handler) {
      mirrorEventHandlers[eventName] = handler;
    },
    removeEventListener: function removeEventListener(eventName, handler) {
      if (mirrorEventHandlers[eventName] === handler) {
        delete mirrorEventHandlers[eventName];
      }
    }
  };
  const elements = {
    convertedPane: {
      tagName: "IFRAME",
      srcdoc: "",
      contentDocument: mirrorDocument
    },
    hoverLinkInfo: {
      tagName: "DETAILS",
      open: false
    },
    hoverLinkInfoSummary: {
      textContent: ""
    },
    hoverLinkInfoValue: {
      textContent: ""
    },
    hoverLinkPanelExpanded: false
  };
  const backupFrame = {
    tagName: "IFRAME",
    srcdoc: ""
  };
  const mirror = pagePaneMirror.create({
    elements: elements,
    DOMParserClass: FakeDOMParser,
    windowObject: {
      location: {
        href: "https://mail.google.com/mail/u/0/#inbox"
      }
    },
    escapeHtml: function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
    classifyUrlValue: function classifyUrlValue(urlValue) {
      return /^https:/i.test(String(urlValue || "")) ? "publisher" : "unknown";
    },
    extractKnownTrackingParameterNames: function extractKnownTrackingParameterNames(urlValue) {
      return String(urlValue || "").indexOf("utm_source=") !== -1 ? ["utm_source"] : [];
    }
  });

  mirror.setHoverLinkPanelExpanded(true);
  mirror.renderSnapshot(
    {
      rawText: "alpha <beta>"
    },
    {
      baseUrl: "https://example.com/base/page"
    }
  );
  const rawTextSrcdoc = elements.convertedPane.srcdoc;

  mirror.renderSnapshot(
    {
      pipeline: {
        rewrittenHtml: '<p><a href="#section">Jump</a><a href="https://example.com/next">Next</a></p>'
      }
    },
    {
      disableSameDocumentLinks: true,
      baseUrl: "https://example.com/base/page#hash"
    }
  );
  const disabledLinkSrcdoc = elements.convertedPane.srcdoc;

  mirror.renderMarkup("<p>Original backup HTML</p>", {
    targetElement: backupFrame,
    baseUrl: "https://example.com/backup"
  });
  const backupFrameSrcdoc = backupFrame.srcdoc;

  mirror.bindHoverInspector();
  const defaultHoverValue = elements.hoverLinkInfoValue.textContent;

  mirrorEventHandlers.mouseover({
    target: hoverAnchor
  });

  const hoverDetails = elements.hoverLinkInfoValue.textContent;
  const hoverSummary = elements.hoverLinkInfoSummary.textContent;

  mirror.clearRenderedPane();

  const actual = {
    hoverPanelExpanded: elements.hoverLinkPanelExpanded,
    hoverPanelOpen: elements.hoverLinkInfo.open,
    rawTextEscaped: rawTextSrcdoc.indexOf("<pre>alpha &lt;beta&gt;</pre>") !== -1,
    disabledSameDocumentLink: disabledLinkSrcdoc.indexOf('data-merged-link-lab-disabled-link="true"') !== -1,
    retainedExternalLink: disabledLinkSrcdoc.indexOf('href="https://example.com/next"') !== -1,
    baseHrefInjected: disabledLinkSrcdoc.indexOf('<base href="https://example.com/base/page#hash" target="_blank">') !== -1,
    targetFrameRendered: backupFrameSrcdoc.indexOf("<p>Original backup HTML</p>") !== -1 &&
      backupFrameSrcdoc.indexOf('<base href="https://example.com/backup" target="_blank">') !== -1,
    defaultHoverValue: defaultHoverValue,
    hoverSummary: hoverSummary,
    hoverTitleRemoved: hoverAnchor.getAttribute("title") === null,
    hoverDetailsIncludes: {
      detectionType: hoverDetails.indexOf("Detection Type: publisher") !== -1,
      protocol: hoverDetails.indexOf("Protocol: https") !== -1,
      domain: hoverDetails.indexOf("Domain: example.com") !== -1,
      subfolder: hoverDetails.indexOf("Subfolder: /path") !== -1,
      slug: hoverDetails.indexOf("Slug: article") !== -1,
      trackerParameters: hoverDetails.indexOf("Tracker Parameters: utm_source=news") !== -1,
      otherParameters: hoverDetails.indexOf("Other Parameters: ref=abc") !== -1,
      anchor: hoverDetails.indexOf("Anchor: section") !== -1
    },
    clearedHoverValue: elements.hoverLinkInfoValue.textContent,
    clearedShowsEmptyState: elements.convertedPane.srcdoc.indexOf("Open an inbox email to mirror its formatted body here.") !== -1
  };
  const failures = [];

  if (!actual.hoverPanelExpanded || !actual.hoverPanelOpen) {
    failures.push("Expected page pane mirror to synchronize the hover inspector expanded state.");
  }

  if (!actual.rawTextEscaped) {
    failures.push("Expected page pane mirror to escape raw-text snapshots before rendering them into the iframe.");
  }

  if (!actual.disabledSameDocumentLink) {
    failures.push("Expected page pane mirror to disable same-document links when requested.");
  }

  if (!actual.retainedExternalLink) {
    failures.push("Expected page pane mirror to retain non-matching external links.");
  }

  if (!actual.baseHrefInjected) {
    failures.push("Expected page pane mirror to inject the mirror base URL into the iframe document.");
  }

  if (!actual.targetFrameRendered) {
    failures.push("Expected page pane mirror to render markup into an explicit target iframe when requested.");
  }

  if (actual.defaultHoverValue !== "Hover over a link to reveal URL components") {
    failures.push("Expected page pane mirror to seed hover details with the default message after binding.");
  }

  if (actual.hoverSummary !== "Detection Type: publisher") {
    failures.push("Expected page pane mirror to summarize hover details from the first detail line.");
  }

  if (!actual.hoverTitleRemoved) {
    failures.push("Expected page pane mirror to remove native anchor titles inside the mirror document.");
  }

  Object.keys(actual.hoverDetailsIncludes).forEach(function ensureHoverDetail(detailKey) {
    if (!actual.hoverDetailsIncludes[detailKey]) {
      failures.push("Expected page pane mirror hover details to include the " + detailKey + " field.");
    }
  });

  if (actual.clearedHoverValue !== "Hover over a link to reveal URL components") {
    failures.push("Expected page pane mirror clearRenderedPane to restore the default hover message.");
  }

  if (!actual.clearedShowsEmptyState) {
    failures.push("Expected page pane mirror clearRenderedPane to restore the empty iframe placeholder.");
  }

  return {
    id: "module-page-pane-mirror",
    title: "Page pane mirror module manages rendered mirror content and hover inspection details",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      hoverPanelExpanded: true,
      hoverPanelOpen: true,
      rawTextEscaped: true,
      disabledSameDocumentLink: true,
      retainedExternalLink: true,
      baseHrefInjected: true,
      targetFrameRendered: true,
      defaultHoverValue: "Hover over a link to reveal URL components",
      hoverSummary: "Detection Type: publisher",
      hoverTitleRemoved: true,
      clearedHoverValue: "Hover over a link to reveal URL components",
      clearedShowsEmptyState: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runPagePaneSnapshotRegression() {
  function createDeferred() {
    let resolveDeferred = function resolveMissingDeferred() {};

    return {
      promise: new Promise(function createDeferredPromise(resolve) {
        resolveDeferred = resolve;
      }),
      resolve: resolveDeferred
    };
  }

  const runtimeMessages = [];
  const labFrameMessages = [];
  const diagnosticsSections = [];
  const mirrorRenderCalls = [];
  const hoverPanelStates = [];
  const syncEmailSnapshotCalls = [];
  const replacementSnapshots = [];
  const backupRenderMarkupCalls = [];
  const debugEvents = [];
  let latestSnapshot = null;
  let lastPublishedSnapshotSignature = "";
  let didAutoExpandBuiltInTestPagePane = false;
  let resetLatestEmailDetectionStateCallCount = 0;
  let clearRenderedPaneCallCount = 0;
  let showPaneCallCount = 0;
  let hidePaneCallCount = 0;
  let ensuredPaneCount = 0;
  const elements = {
    root: {
      isConnected: true
    },
    railStatus: {
      textContent: ""
    },
    railCount: {
      textContent: ""
    },
    railBadge: {
      textContent: ""
    },
    backupSummary: {
      textContent: ""
    },
    backupFrame: {
      srcdoc: ""
    },
    backupPayload: {
      value: ""
    },
    diagnosticsPane: {},
    labFrameLoaded: true,
    labFrame: {
      contentWindow: {
        postMessage: function postMessage(message, targetOrigin) {
          labFrameMessages.push({
            message: message,
            targetOrigin: targetOrigin
          });
        }
      }
    },
    currentPaneKey: "stale-pane",
    isExpanded: true
  };
  const snapshotController = pagePaneSnapshot.create({
    elements: elements,
    ensurePane: function ensurePane() {
      ensuredPaneCount += 1;
      return elements.root;
    },
    paneMirror: {
      clearRenderedPane: function clearRenderedPane() {
        clearRenderedPaneCallCount += 1;
      },
      renderSnapshot: function renderSnapshot(snapshot, options) {
        mirrorRenderCalls.push({
          snapshot: snapshot,
          options: options
        });
      },
      renderMarkup: function renderMarkup(htmlMarkup, options) {
        backupRenderMarkupCalls.push({
          htmlMarkup: htmlMarkup,
          options: options
        });

        if (options && options.targetElement) {
          options.targetElement.srcdoc = String(htmlMarkup || options.emptyMarkup || "");
        }
      },
      setHoverLinkPanelExpanded: function setHoverLinkPanelExpanded(isExpanded) {
        hoverPanelStates.push(!!isExpanded);
      }
    },
    diagnostics: {
      buildDiagnosticsSections: function buildDiagnosticsSections(snapshot) {
        return snapshot ? ["snapshot-present"] : ["snapshot-empty"];
      },
      renderDiagnosticsSections: function renderDiagnosticsSections(targetElement, sections) {
        diagnosticsSections.push({
          targetElement: targetElement,
          sections: sections.slice()
        });
      }
    },
    paneLayout: {
      hidePane: function hidePane() {
        hidePaneCallCount += 1;
      },
      showPane: function showPane() {
        showPaneCallCount += 1;
      }
    },
    debugApi: {
      ui: function ui(message) {
        debugEvents.push(message);
      }
    },
    formatMetricCount: function formatMetricCount(countValue) {
      return String(countValue) + " URLs";
    },
    formatRailBadgeCount: function formatRailBadgeCount(countValue) {
      return "[" + String(countValue) + "]";
    },
    getBaseUrl: function getBaseUrl() {
      return "https://mail.google.com/mail/u/0/#inbox";
    },
    syncEmailSnapshot: function syncEmailSnapshot(options) {
      syncEmailSnapshotCalls.push(options);
    },
    maybeReplaceEmailBodyWithMirrorContent: async function maybeReplaceEmailBodyWithMirrorContent(snapshot) {
      replacementSnapshots.push(snapshot);
    },
    isBuiltInTestSuitePage: function isBuiltInTestSuitePage() {
      return true;
    },
    createSnapshotSignature: function createSnapshotSignature(snapshot) {
      return "sig:" + String((snapshot && snapshot.id) || "");
    },
    createSnapshotPaneKey: function createSnapshotPaneKey(snapshot) {
      return "pane:" + String((snapshot && snapshot.id) || "");
    },
    resetLatestEmailDetectionState: function resetLatestEmailDetectionState() {
      resetLatestEmailDetectionStateCallCount += 1;
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return latestSnapshot;
    },
    setLatestSnapshot: function setLatestSnapshot(nextSnapshot) {
      latestSnapshot = nextSnapshot;
    },
    getLastPublishedSnapshotSignature: function getLastPublishedSnapshotSignature() {
      return lastPublishedSnapshotSignature;
    },
    setLastPublishedSnapshotSignature: function setLastPublishedSnapshotSignature(nextSignature) {
      lastPublishedSnapshotSignature = nextSignature;
    },
    getDidAutoExpandBuiltInTestPagePane: function getDidAutoExpandBuiltInTestPagePane() {
      return didAutoExpandBuiltInTestPagePane;
    },
    setDidAutoExpandBuiltInTestPagePane: function setDidAutoExpandBuiltInTestPagePane(nextDidAutoExpandBuiltInTestPagePane) {
      didAutoExpandBuiltInTestPagePane = !!nextDidAutoExpandBuiltInTestPagePane;
    },
    sendRuntimeMessage: async function sendRuntimeMessage(message) {
      runtimeMessages.push(message);
    }
  });
  const publishedSnapshot = {
    id: "snap-1",
    isTopicDigest: true,
    originalEmailBackup: {
      capturedAt: 111,
      rawText: "Original backup text",
      sourceHtml: "<p>Original backup HTML</p>"
    },
    pipeline: {
      finalUrls: ["https://one.example", "https://two.example"]
    }
  };

  await snapshotController.publishSnapshot(publishedSnapshot);
  const backupSummaryAfterPublish = elements.backupSummary.textContent;
  const backupFrameAfterPublish = elements.backupFrame.srcdoc;
  const backupPayloadAfterPublish = elements.backupPayload.value;
  const parsedBackupPayloadAfterPublish = JSON.parse(backupPayloadAfterPublish);
  snapshotController.forceRefreshCurrentSnapshot();
  await snapshotController.publishClear();

  let raceLatestSnapshot = null;
  let raceLastPublishedSnapshotSignature = "";
  const raceRuntimeMessages = [];
  const raceReplacementSnapshotIds = [];
  const racePublishRuntimeDeferred = createDeferred();
  const raceClearRuntimeDeferred = createDeferred();
  const raceSnapshotController = pagePaneSnapshot.create({
    elements: {
      root: {
        isConnected: true
      },
      railStatus: {
        textContent: ""
      },
      railCount: {
        textContent: ""
      },
      railBadge: {
        textContent: ""
      },
      diagnosticsPane: {},
      currentPaneKey: "",
      activeTabKey: "converted",
      isExpanded: false
    },
    ensurePane: function ensureRacePane() {
      return {
        isConnected: true
      };
    },
    paneMirror: {
      clearRenderedPane: function clearRaceRenderedPane() {},
      renderSnapshot: function renderRaceSnapshot() {},
      setHoverLinkPanelExpanded: function setRaceHoverLinkPanelExpanded() {}
    },
    diagnostics: {
      buildDiagnosticsSections: function buildRaceDiagnosticsSections(snapshot) {
        return snapshot ? ["snapshot-present"] : ["snapshot-empty"];
      },
      renderDiagnosticsSections: function renderRaceDiagnosticsSections() {}
    },
    paneLayout: {
      hidePane: function hideRacePane() {},
      showPane: function showRacePane() {}
    },
    formatMetricCount: function formatRaceMetricCount(countValue) {
      return String(countValue) + " URLs";
    },
    formatRailBadgeCount: function formatRaceRailBadgeCount(countValue) {
      return String(countValue);
    },
    getBaseUrl: function getRaceBaseUrl() {
      return "https://mail.google.com/mail/u/0/#inbox";
    },
    syncEmailSnapshot: function syncRaceEmailSnapshot() {},
    maybeReplaceEmailBodyWithMirrorContent: async function maybeReplaceRaceEmailBodyWithMirrorContent(snapshot) {
      raceReplacementSnapshotIds.push(snapshot && snapshot.id ? snapshot.id : "");
    },
    isBuiltInTestSuitePage: function isRaceBuiltInTestSuitePage() {
      return false;
    },
    createSnapshotSignature: function createRaceSnapshotSignature(snapshot) {
      return "sig:" + String((snapshot && snapshot.id) || "");
    },
    createSnapshotPaneKey: function createRaceSnapshotPaneKey(snapshot) {
      return "pane:" + String((snapshot && snapshot.id) || "");
    },
    resetLatestEmailDetectionState: function resetRaceLatestEmailDetectionState() {},
    getLatestSnapshot: function getRaceLatestSnapshot() {
      return raceLatestSnapshot;
    },
    setLatestSnapshot: function setRaceLatestSnapshot(nextSnapshot) {
      raceLatestSnapshot = nextSnapshot;
    },
    setLastPublishedSnapshotSignature: function setRaceLastPublishedSnapshotSignature(nextSignature) {
      raceLastPublishedSnapshotSignature = nextSignature;
    },
    getDidAutoExpandBuiltInTestPagePane: function getRaceDidAutoExpandBuiltInTestPagePane() {
      return false;
    },
    setDidAutoExpandBuiltInTestPagePane: function setRaceDidAutoExpandBuiltInTestPagePane() {},
    sendRuntimeMessage: async function sendRaceRuntimeMessage(message) {
      const messageType = message && message.type ? message.type : "";
      raceRuntimeMessages.push(messageType);

      if (messageType === "merged-link-lab:email-snapshot") {
        return racePublishRuntimeDeferred.promise;
      }

      if (messageType === "merged-link-lab:email-cleared") {
        return raceClearRuntimeDeferred.promise;
      }
    }
  });
  const stalePublishPromise = raceSnapshotController.publishSnapshot({
    id: "stale-snapshot",
    pipeline: {
      finalUrls: ["https://stale.example"]
    }
  });
  const clearDuringPublishPromise = raceSnapshotController.publishClear();
  racePublishRuntimeDeferred.resolve();
  await stalePublishPromise;
  raceClearRuntimeDeferred.resolve();
  await clearDuringPublishPromise;

  const actual = {
    latestSnapshotAfterClear: latestSnapshot,
    lastPublishedSnapshotSignatureAfterClear: lastPublishedSnapshotSignature,
    didAutoExpandBuiltInTestPagePane: didAutoExpandBuiltInTestPagePane,
    currentPaneKeyAfterClear: elements.currentPaneKey,
    isExpandedAfterClear: elements.isExpanded,
    railStatusAfterClear: elements.railStatus.textContent,
    railCountAfterClear: elements.railCount.textContent,
    railBadgeAfterClear: elements.railBadge.textContent,
    backupSummaryAfterPublish: backupSummaryAfterPublish,
    backupFrameAfterPublish: backupFrameAfterPublish,
    backupPayloadAfterPublish: backupPayloadAfterPublish,
    parsedBackupPayloadRawText: parsedBackupPayloadAfterPublish.rawText || "",
    parsedBackupPayloadSourceHtml: parsedBackupPayloadAfterPublish.sourceHtml || "",
    backupRenderMarkupCallCount: backupRenderMarkupCalls.length,
    backupRenderTargetIsFrame: !!(
      backupRenderMarkupCalls[0] &&
      backupRenderMarkupCalls[0].options &&
      backupRenderMarkupCalls[0].options.targetElement === elements.backupFrame
    ),
    backupRenderDisablesSameDocumentLinks: !!(
      backupRenderMarkupCalls[0] &&
      backupRenderMarkupCalls[0].options &&
      backupRenderMarkupCalls[0].options.disableSameDocumentLinks === true
    ),
    debugRenderedBackup: debugEvents.indexOf("content backup tab rendered from original backup") !== -1,
    debugClearedBackup: debugEvents.indexOf("content backup tab cleared") !== -1,
    backupSummaryAfterClear: elements.backupSummary.textContent,
    backupFrameAfterClear: elements.backupFrame.srcdoc,
    backupPayloadAfterClear: elements.backupPayload.value,
    ensuredPaneCount: ensuredPaneCount,
    clearRenderedPaneCallCount: clearRenderedPaneCallCount,
    showPaneCallCount: showPaneCallCount,
    hidePaneCallCount: hidePaneCallCount,
    resetLatestEmailDetectionStateCallCount: resetLatestEmailDetectionStateCallCount,
    mirrorRenderCallCount: mirrorRenderCalls.length,
    firstMirrorRenderOptions: mirrorRenderCalls[0] ? mirrorRenderCalls[0].options : null,
    hoverPanelStates: hoverPanelStates.slice(),
    diagnosticsSections: diagnosticsSections.map(function mapDiagnosticsSection(entry) {
      return entry.sections.join(",");
    }),
    labFrameMessageTypes: labFrameMessages.map(function mapLabFrameMessage(entry) {
      return entry.message.type;
    }),
    runtimeMessageTypes: runtimeMessages.map(function mapRuntimeMessage(entry) {
      return entry.type;
    }),
    replacementSnapshotIds: replacementSnapshots.map(function mapReplacementSnapshot(snapshot) {
      return snapshot && snapshot.id;
    }),
    syncEmailSnapshotCalls: syncEmailSnapshotCalls.slice(),
    stalePublishReplacementSnapshotIds: raceReplacementSnapshotIds.slice(),
    stalePublishRuntimeMessages: raceRuntimeMessages.slice(),
    stalePublishLatestSnapshotAfterClear: raceLatestSnapshot,
    stalePublishLastPublishedSignatureAfterClear: raceLastPublishedSnapshotSignature
  };
  const failures = [];

  if (actual.didAutoExpandBuiltInTestPagePane !== true) {
    failures.push("Expected page pane snapshot publish to auto-expand once on the built-in test page.");
  }

  if (actual.currentPaneKeyAfterClear !== "") {
    failures.push("Expected page pane snapshot clear to reset the current pane key.");
  }

  if (actual.isExpandedAfterClear !== false) {
    failures.push("Expected page pane snapshot clear to collapse the pane state.");
  }

  if (actual.railStatusAfterClear !== "No email") {
    failures.push("Expected page pane snapshot clear to restore the empty rail status.");
  }

  if (actual.railCountAfterClear !== "0 URLs") {
    failures.push("Expected page pane snapshot clear to restore the empty rail count.");
  }

  if (actual.railBadgeAfterClear !== "0") {
    failures.push("Expected page pane snapshot clear to restore the empty rail badge.");
  }

  if (
    actual.backupSummaryAfterPublish !== "Authoritative original email body backup captured with this snapshot." ||
    actual.backupFrameAfterPublish.indexOf("<p>Original backup HTML</p>") === -1 ||
    actual.parsedBackupPayloadRawText !== "Original backup text" ||
    actual.parsedBackupPayloadSourceHtml !== "<p>Original backup HTML</p>" ||
    actual.backupRenderMarkupCallCount < 2 ||
    !actual.backupRenderTargetIsFrame ||
    !actual.backupRenderDisablesSameDocumentLinks ||
    !actual.debugRenderedBackup
  ) {
    failures.push("Expected page pane snapshot publish to render a rich backup preview while keeping the authoritative original backup hidden.");
  }

  if (
    actual.backupSummaryAfterClear !== "No original email backup captured yet." ||
    actual.backupFrameAfterClear.indexOf("Open an inbox email to capture an original body backup.") === -1 ||
    actual.backupPayloadAfterClear !== "" ||
    !actual.debugClearedBackup
  ) {
    failures.push("Expected page pane snapshot clear to reset the original email backup tab.");
  }

  if (actual.ensuredPaneCount !== 1) {
    failures.push("Expected page pane snapshot render to call ensurePane exactly once.");
  }

  if (actual.clearRenderedPaneCallCount !== 1) {
    failures.push("Expected page pane snapshot clear to invoke the mirror clear path once.");
  }

  if (actual.showPaneCallCount !== 1) {
    failures.push("Expected page pane snapshot publish to show the pane once.");
  }

  if (actual.hidePaneCallCount !== 1) {
    failures.push("Expected page pane snapshot clear to hide the pane once.");
  }

  if (actual.resetLatestEmailDetectionStateCallCount !== 1) {
    failures.push("Expected page pane snapshot clear to reset email detection state once.");
  }

  if (actual.mirrorRenderCallCount !== 1) {
    failures.push("Expected page pane snapshot publish to render exactly one mirror snapshot.");
  }

  if (
    !actual.firstMirrorRenderOptions ||
    actual.firstMirrorRenderOptions.disableSameDocumentLinks !== true ||
    actual.firstMirrorRenderOptions.baseUrl !== "https://mail.google.com/mail/u/0/#inbox"
  ) {
    failures.push("Expected page pane snapshot publish to pass digest-link and base-url options into the mirror renderer.");
  }

  if (!arrayEquals(actual.hoverPanelStates, [false, false])) {
    failures.push("Expected page pane snapshot to collapse the hover panel on pane-key changes and clear.");
  }

  if (!arrayEquals(actual.diagnosticsSections, ["snapshot-present", "snapshot-empty"])) {
    failures.push("Expected page pane snapshot to render diagnostics for both publish and clear states.");
  }

  if (!arrayEquals(actual.labFrameMessageTypes, [
    "merged-link-lab:set-snapshot",
    "merged-link-lab:clear-snapshot",
    "merged-link-lab:clear-snapshot"
  ])) {
    failures.push("Expected page pane snapshot to sync the lab frame on publish, forced refresh, and clear.");
  }

  if (!arrayEquals(actual.runtimeMessageTypes, ["merged-link-lab:email-snapshot", "merged-link-lab:email-cleared"])) {
    failures.push("Expected page pane snapshot to send both publish and clear runtime messages.");
  }

  if (!arrayEquals(actual.replacementSnapshotIds, ["snap-1"])) {
    failures.push("Expected page pane snapshot publish to invoke mirror replacement with the published snapshot.");
  }

  if (!arrayEquals(actual.stalePublishReplacementSnapshotIds, [])) {
    failures.push("Expected stale page pane snapshot publishes to skip mirror replacement after a newer clear replaced the active operation.");
  }

  if (!arrayEquals(actual.stalePublishRuntimeMessages, ["merged-link-lab:email-snapshot", "merged-link-lab:email-cleared"])) {
    failures.push("Expected the page pane snapshot race regression to exercise both publish and clear runtime messages.");
  }

  if (actual.stalePublishLatestSnapshotAfterClear !== null || actual.stalePublishLastPublishedSignatureAfterClear !== "") {
    failures.push("Expected page pane snapshot race handling to preserve the cleared snapshot state after a stale publish resolves.");
  }

  if (
    actual.syncEmailSnapshotCalls.length !== 1 ||
    !actual.syncEmailSnapshotCalls[0] ||
    actual.syncEmailSnapshotCalls[0].forcePublish !== true
  ) {
    failures.push("Expected page pane snapshot force refresh to request a forced snapshot sync.");
  }

  if (actual.latestSnapshotAfterClear !== null) {
    failures.push("Expected page pane snapshot clear to clear the latest snapshot reference.");
  }

  if (actual.lastPublishedSnapshotSignatureAfterClear !== "") {
    failures.push("Expected page pane snapshot clear to reset the last published snapshot signature.");
  }

  return {
    id: "module-page-pane-snapshot",
    title: "Page pane snapshot module orchestrates publish, clear, refresh, and lab-frame sync state",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      didAutoExpandBuiltInTestPagePane: true,
      currentPaneKeyAfterClear: "",
      isExpandedAfterClear: false,
      railStatusAfterClear: "No email",
      railCountAfterClear: "0 URLs",
      railBadgeAfterClear: "0",
      backupSummaryAfterPublish: "Authoritative original email body backup captured with this snapshot.",
      parsedBackupPayloadRawText: "Original backup text",
      parsedBackupPayloadSourceHtml: "<p>Original backup HTML</p>",
      backupRenderMarkupCallCount: 2,
      backupRenderTargetIsFrame: true,
      backupSummaryAfterClear: "No original email backup captured yet.",
      backupPayloadAfterClear: "",
      ensuredPaneCount: 1,
      clearRenderedPaneCallCount: 1,
      showPaneCallCount: 1,
      hidePaneCallCount: 1,
      resetLatestEmailDetectionStateCallCount: 1,
      mirrorRenderCallCount: 1,
      hoverPanelStates: [false, false],
      diagnosticsSections: ["snapshot-present", "snapshot-empty"],
      runtimeMessageTypes: ["merged-link-lab:email-snapshot", "merged-link-lab:email-cleared"],
      replacementSnapshotIds: ["snap-1"],
      stalePublishReplacementSnapshotIds: [],
      stalePublishRuntimeMessages: ["merged-link-lab:email-snapshot", "merged-link-lab:email-cleared"],
      stalePublishLatestSnapshotAfterClear: null,
      stalePublishLastPublishedSignatureAfterClear: ""
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runEmailSnapshotSyncRegression() {
  function createFakeRoot(rootId, textValue, hasStructuredContent) {
    return {
      id: rootId,
      isConnected: true,
      innerText: textValue,
      textContent: textValue,
      closest: function closest() {
        return null;
      },
      querySelector: function querySelector() {
        return hasStructuredContent ? {} : null;
      }
    };
  }

  const publishedSnapshots = [];
  const clearEvents = [];
  const observedRootIds = [];
  const scheduledTimerIds = [];
  const clearedTimerIds = [];
  const debugEvents = [];
  const emptyPaneRenderEvents = [];
  let nextTimerId = 1;
  let visible = true;
  let currentGraceWindow = 0;
  let currentFailureKind = "selector-empty-match";
  let currentLocationHref = "https://mail.google.com/mail/u/0/#inbox";
  let inboxRootCandidates = [];
  let latestSnapshot = {
    id: "initial",
    detectedAt: Date.now() - 6000,
    pipeline: {
      finalUrls: []
    }
  };
  let lastPublishedSignature = "sig:initial";
  let latestDetectedEmailRoot = null;
  let latestDetectedEmailMode = "";
  let latestInboxCandidateSeenAt = 0;
  let inboxCandidateMissingSince = 0;
  let lastObservedLocationHref = currentLocationHref;
  let resetLatestEmailDetectionStateCallCount = 0;
  const syncController = emailSnapshotSync.create({
    windowObject: {
      clearTimeout: function clearTimeout(timerId) {
        clearedTimerIds.push(timerId);
      },
      setTimeout: function setTimeout(callback) {
        const nextTimerIdValue = nextTimerId;
        nextTimerId += 1;
        scheduledTimerIds.push(nextTimerIdValue);
        return nextTimerIdValue;
      }
    },
    debugApi: {
      conditional: function conditional(message) {
        debugEvents.push("conditional:" + message);
      },
      functionIn: function functionIn(message) {
        debugEvents.push("in:" + message);
      },
      functionOut: function functionOut(message, payload) {
        debugEvents.push("out:" + message + ":" + JSON.stringify(payload || {}));
      },
      loop: function loop(message) {
        debugEvents.push("loop:" + message);
      },
      runtime: function runtime(message) {
        debugEvents.push("runtime:" + message);
      },
      variable: function variable(message) {
        debugEvents.push("variable:" + message);
      }
    },
    isPageCurrentlyVisible: function isPageCurrentlyVisible() {
      return visible;
    },
    getCurrentLocationHref: function getCurrentLocationHref() {
      return currentLocationHref;
    },
    getInboxRootCandidates: function getInboxRootCandidates() {
      return inboxRootCandidates;
    },
    getInboxDetectionFailure: function getInboxDetectionFailure(candidates) {
      return Array.isArray(candidates) && candidates.length
        ? null
        : {
          kind: currentFailureKind,
          providerId: "gmail"
        };
    },
    observeEmailRoot: function observeEmailRoot(root) {
      observedRootIds.push(root && root.id ? root.id : "");
    },
    choosePrimaryEmailCandidate: function choosePrimaryEmailCandidate(candidates) {
      return Array.isArray(candidates) && candidates.length ? candidates[0] : null;
    },
    getCandidateMissingGraceWindow: function getCandidateMissingGraceWindow() {
      return currentGraceWindow;
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    summarizeEmailRoot: function summarizeEmailRoot(root, detectionMode) {
      return {
        id: "summary:" + String(root && root.id ? root.id : "missing"),
        detectedAt: Date.now(),
        detectionMode: detectionMode || "",
        pipeline: {
          finalUrls: root && Array.isArray(root.finalUrls) ? root.finalUrls.slice() : []
        }
      };
    },
    createSnapshotSignature: function createSnapshotSignature(snapshot) {
      return "sig:" + String((snapshot && snapshot.id) || "");
    },
    publishSnapshot: function publishSnapshot(snapshot) {
      publishedSnapshots.push(snapshot && snapshot.id ? snapshot.id : "");
      latestSnapshot = snapshot;
      lastPublishedSignature = "sig:" + String((snapshot && snapshot.id) || "");
    },
    publishClear: function publishClear() {
      clearEvents.push("clear");
      latestSnapshot = null;
      lastPublishedSignature = "";
    },
    renderEmptyPaneState: function renderEmptyPaneState() {
      emptyPaneRenderEvents.push("render-empty");
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return latestSnapshot;
    },
    getLastPublishedSnapshotSignature: function getLastPublishedSnapshotSignature() {
      return lastPublishedSignature;
    },
    getLatestDetectedEmailRoot: function getLatestDetectedEmailRoot() {
      return latestDetectedEmailRoot;
    },
    setLatestDetectedEmailRoot: function setLatestDetectedEmailRoot(nextLatestDetectedEmailRoot) {
      latestDetectedEmailRoot = nextLatestDetectedEmailRoot;
    },
    getLatestDetectedEmailMode: function getLatestDetectedEmailMode() {
      return latestDetectedEmailMode;
    },
    setLatestDetectedEmailMode: function setLatestDetectedEmailMode(nextLatestDetectedEmailMode) {
      latestDetectedEmailMode = String(nextLatestDetectedEmailMode || "");
    },
    getLatestInboxCandidateSeenAt: function getLatestInboxCandidateSeenAt() {
      return latestInboxCandidateSeenAt;
    },
    setLatestInboxCandidateSeenAt: function setLatestInboxCandidateSeenAt(nextLatestInboxCandidateSeenAt) {
      latestInboxCandidateSeenAt = Number(nextLatestInboxCandidateSeenAt) || 0;
    },
    getInboxCandidateMissingSince: function getInboxCandidateMissingSince() {
      return inboxCandidateMissingSince;
    },
    setInboxCandidateMissingSince: function setInboxCandidateMissingSince(nextInboxCandidateMissingSince) {
      inboxCandidateMissingSince = Number(nextInboxCandidateMissingSince) || 0;
    },
    getLastObservedLocationHref: function getLastObservedLocationHref() {
      return lastObservedLocationHref;
    },
    setLastObservedLocationHref: function setLastObservedLocationHref(nextLastObservedLocationHref) {
      lastObservedLocationHref = String(nextLastObservedLocationHref || "");
    },
    resetLatestEmailDetectionState: function resetLatestEmailDetectionState() {
      latestDetectedEmailRoot = null;
      latestDetectedEmailMode = "";
      latestInboxCandidateSeenAt = 0;
      inboxCandidateMissingSince = 0;
      resetLatestEmailDetectionStateCallCount += 1;
    }
  });

  const firstScheduledTimerId = syncController.scheduleSnapshotSync();
  const secondScheduledTimerId = syncController.scheduleSnapshotSync();

  visible = false;
  inboxRootCandidates = [{
    root: createFakeRoot("hidden-root", "Hidden"),
    detectionMode: "hidden",
    score: 1
  }];
  syncController.syncEmailSnapshot();

  visible = true;
  latestSnapshot = null;
  inboxRootCandidates = [];
  currentGraceWindow = 0;
  syncController.syncEmailSnapshot();

  currentLocationHref = "https://mail.google.com/mail/u/0/#label/new";
  inboxRootCandidates = [];
  currentGraceWindow = 0;
  latestSnapshot = {
    id: "before-clear",
    detectedAt: Date.now() - 6000,
    pipeline: {
      finalUrls: []
    }
  };
  syncController.syncEmailSnapshot();

  currentLocationHref = lastObservedLocationHref;
  latestSnapshot = {
    id: "recent",
    detectedAt: Date.now(),
    pipeline: {
      finalUrls: []
    }
  };
  currentGraceWindow = 5000;
  syncController.syncEmailSnapshot();

  latestSnapshot = {
    id: "fallback-base",
    detectedAt: Date.now() - 7000,
    pipeline: {
      finalUrls: []
    }
  };
  currentGraceWindow = 0;
  currentFailureKind = "selector-empty-match";
  latestDetectedEmailRoot = createFakeRoot("fallback-root", "Fallback body", true);
  latestDetectedEmailMode = "fallback";
  lastPublishedSignature = "sig:other";
  syncController.syncEmailSnapshot();

  latestSnapshot = {
    id: "mismatch-base",
    detectedAt: Date.now() - 7000,
    pipeline: {
      finalUrls: []
    }
  };
  currentGraceWindow = 5000;
  currentFailureKind = "provider-path-mismatch";
  latestDetectedEmailRoot = createFakeRoot("mismatch-root", "Mismatch body", true);
  latestDetectedEmailMode = "mismatch";
  lastPublishedSignature = "sig:mismatch";
  syncController.syncEmailSnapshot();

  inboxRootCandidates = [{
    root: createFakeRoot("primary-root", "Primary body", true),
    detectionMode: "primary",
    score: 9
  }];
  currentFailureKind = "selector-empty-match";
  lastPublishedSignature = "sig:summary:primary-root";
  syncController.syncEmailSnapshot();

  lastPublishedSignature = "sig:stale";
  syncController.syncEmailSnapshot();

  const actual = {
    firstScheduledTimerId: firstScheduledTimerId,
    secondScheduledTimerId: secondScheduledTimerId,
    clearedTimerIds: clearedTimerIds.slice(),
    publishedSnapshots: publishedSnapshots.slice(),
    clearEvents: clearEvents.slice(),
    observedRootIds: observedRootIds.slice(),
    latestDetectedEmailRootId: latestDetectedEmailRoot && latestDetectedEmailRoot.id ? latestDetectedEmailRoot.id : "",
    latestDetectedEmailMode: latestDetectedEmailMode,
    latestInboxCandidateSeenAt: latestInboxCandidateSeenAt,
    inboxCandidateMissingSince: inboxCandidateMissingSince,
    lastObservedLocationHref: lastObservedLocationHref,
    resetLatestEmailDetectionStateCallCount: resetLatestEmailDetectionStateCallCount,
    scheduledTimerCount: scheduledTimerIds.length,
    debugEventCount: debugEvents.length,
    emptyPaneRenderEvents: emptyPaneRenderEvents.slice()
  };
  const failures = [];

  if (actual.firstScheduledTimerId !== 1 || actual.secondScheduledTimerId !== 2) {
    failures.push("Expected email snapshot sync scheduleSnapshotSync to allocate sequential timer ids.");
  }

  if (actual.clearedTimerIds.indexOf(1) === -1) {
    failures.push("Expected email snapshot sync to clear the previous timer when re-scheduling.");
  }

  if (!arrayEquals(actual.clearEvents, ["clear", "clear"])) {
    failures.push("Expected email snapshot sync to clear once on location change and again immediately when a provider-path mismatch invalidates the current view.");
  }

  if (!arrayEquals(actual.emptyPaneRenderEvents, ["render-empty", "render-empty"])) {
    failures.push("Expected email snapshot sync to render the empty-pane diagnostics state both for the initial no-snapshot case and again when stale fallback reuse is blocked.");
  }

  if (!arrayEquals(actual.publishedSnapshots, ["summary:fallback-root", "summary:primary-root"])) {
    failures.push("Expected email snapshot sync to publish fallback then fresh primary snapshots.");
  }

  if (!arrayEquals(actual.observedRootIds, ["primary-root", "primary-root"])) {
    failures.push("Expected email snapshot sync to observe primary inbox candidates on each visible primary-candidate pass.");
  }

  if (actual.latestDetectedEmailRootId !== "primary-root") {
    failures.push("Expected email snapshot sync to retain the most recent primary email root.");
  }

  if (actual.latestDetectedEmailMode !== "primary") {
    failures.push("Expected email snapshot sync to retain the most recent primary detection mode.");
  }

  if (!Number.isFinite(actual.latestInboxCandidateSeenAt) || actual.latestInboxCandidateSeenAt <= 0) {
    failures.push("Expected email snapshot sync to record when the latest inbox candidate was seen.");
  }

  if (actual.inboxCandidateMissingSince !== 0) {
    failures.push("Expected email snapshot sync to reset the missing-candidate timer after a primary candidate is published.");
  }

  if (actual.lastObservedLocationHref !== "https://mail.google.com/mail/u/0/#label/new") {
    failures.push("Expected email snapshot sync to update the last observed location after a navigation change.");
  }

  if (actual.resetLatestEmailDetectionStateCallCount !== 1) {
    failures.push("Expected email snapshot sync to reset latest email detection state once for the location-change path.");
  }

  if (actual.scheduledTimerCount !== 4) {
    failures.push("Expected email snapshot sync to schedule four timer callbacks across direct, grace-window, and fallback paths.");
  }

  if (actual.debugEventCount <= 0) {
    failures.push("Expected email snapshot sync to emit debug events while processing sync paths.");
  }

  return {
    id: "module-email-snapshot-sync",
    title: "Email snapshot sync module manages candidate observation, fallback recovery, and primary publish decisions",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      clearEvents: ["clear", "clear"],
      emptyPaneRenderEvents: ["render-empty", "render-empty"],
      publishedSnapshots: ["summary:fallback-root", "summary:primary-root"],
      observedRootIds: ["primary-root", "primary-root"],
      latestDetectedEmailRootId: "primary-root",
      latestDetectedEmailMode: "primary",
      resetLatestEmailDetectionStateCallCount: 1,
      scheduledTimerCount: 4
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runEmailRootSummaryRegression() {
  const debugEvents = [];
  const analyzeCalls = [];
  const iframeBody = {
    innerHTML:
      "<article><h1>Daily Digest</h1><p>Read online at https://example.com/digest.</p><p>Unsubscribe any time.</p></article>",
    innerText:
      "Daily Digest\n" +
      "Read online at https://example.com/digest.\n" +
      "Unsubscribe any time.",
    textContent:
      "Daily Digest\n" +
      "Read online at https://example.com/digest.\n" +
      "Unsubscribe any time."
  };
  const iframeRoot = {
    tagName: "IFRAME",
    contentDocument: {
      body: iframeBody
    },
    getAttribute: function getAttribute(attributeName) {
      if (attributeName === "title") {
        return "Digest mail";
      }

      return "";
    }
  };
  const summaryController = emailRootSummary.create({
    windowObject: {
      location: {
        hostname: "mail.google.com"
      }
    },
    documentObject: {
      title: "Your Daily Digest"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").replace(/\r/g, "").trim();
    },
    analyzeInput: function analyzeInput(payload) {
      analyzeCalls.push({
        rawText: payload.rawText,
        sourceHtml: payload.sourceHtml,
        options: payload.options
      });

      return {
        finalUrls: ["https://example.com/digest"],
        digestEntries: [{ id: "digest-1" }, { id: "digest-2" }, { id: "digest-3" }],
        errors: []
      };
    },
    getPipelineSettings: function getPipelineSettings() {
      return {
        stripKnownTrackingParameters: true
      };
    },
    getNow: function getNow() {
      return 1234567890;
    },
    debugApi: {
      functionIn: function functionIn(message) {
        debugEvents.push("in:" + message);
      },
      functionOut: function functionOut(message) {
        debugEvents.push("out:" + message);
      },
      variable: function variable(message) {
        debugEvents.push("variable:" + message);
      }
    },
    inboxHostPattern: /mail\.google\.com$/i,
    topicDigestLabelPattern: /\bdigest\b/i,
    topicDigestActionPattern: /\bread online|unsubscribe\b/i
  });
  const iframeContentElement = summaryController.getIframeEmailRootContentElement(iframeRoot);
  const contentElement = summaryController.getEmailRootContentElement(iframeRoot);
  const htmlMarkup = summaryController.getEmailRootHtmlMarkup(iframeRoot);
  const textMetrics = summaryController.measureElementText(iframeRoot);
  const topicDigest = summaryController.isTopicDigestSnapshot(textMetrics.text, htmlMarkup, {
    digestEntries: [{}, {}, {}]
  });
  const summary = summaryController.summarizeEmailRoot(iframeRoot, "");
  iframeBody.innerHTML = "<p>Rewritten body</p>";
  iframeBody.innerText = "Rewritten body";
  iframeBody.textContent = "Rewritten body";
  const preservedSummary = summaryController.summarizeEmailRoot(iframeRoot, "");
  const actual = {
    iframeContentResolved: iframeContentElement === iframeBody,
    contentElementResolved: contentElement === iframeBody,
    htmlMarkup: htmlMarkup,
    textLines: textMetrics.lines,
    textWords: textMetrics.words,
    topicDigest: topicDigest,
    summaryDetectedAt: summary.detectedAt,
    summaryDetectionMode: summary.detectionMode,
    summarySectionLabel: summary.sectionLabel,
    summaryIsTopicDigest: summary.isTopicDigest,
    summaryHasOriginalBackup: !!(summary.originalEmailBackup && summary.originalEmailBackup.sourceHtml === htmlMarkup),
    preservedSummarySourceHtml: preservedSummary.sourceHtml,
    preservedSummaryRawText: preservedSummary.rawText,
    preservedSummaryBackupSourceHtml:
      preservedSummary.originalEmailBackup && preservedSummary.originalEmailBackup.sourceHtml
        ? preservedSummary.originalEmailBackup.sourceHtml
        : "",
    summaryFinalUrlCount:
      summary && summary.pipeline && Array.isArray(summary.pipeline.finalUrls)
        ? summary.pipeline.finalUrls.length
        : 0,
    analyzeCallCount: analyzeCalls.length,
    analyzeRawText: analyzeCalls.length ? analyzeCalls[0].rawText : "",
    analyzeSourceHtml: analyzeCalls.length ? analyzeCalls[0].sourceHtml : "",
    preservedAnalyzeRawText: analyzeCalls[1] ? analyzeCalls[1].rawText : "",
    preservedAnalyzeSourceHtml: analyzeCalls[1] ? analyzeCalls[1].sourceHtml : "",
    analyzeOptions: analyzeCalls.length ? analyzeCalls[0].options : null,
    debugCapturedBackup: debugEvents.indexOf("variable:content original email backup captured") !== -1,
    debugReusedBackup: debugEvents.indexOf("variable:content original email backup reused") !== -1,
    debugEventCount: debugEvents.length
  };
  const failures = [];

  if (!actual.iframeContentResolved) {
    failures.push("Expected email root summary to resolve iframe bodies as the content root.");
  }

  if (!actual.contentElementResolved) {
    failures.push("Expected email root summary to surface the iframe body through getEmailRootContentElement.");
  }

  if (actual.htmlMarkup !== htmlMarkup) {
    failures.push("Expected email root summary to return iframe innerHTML for the email root HTML markup.");
  }

  if (actual.textLines !== 3 || actual.textWords < 8) {
    failures.push("Expected email root summary to measure the iframe body text rather than the iframe element shell.");
  }

  if (!actual.topicDigest) {
    failures.push("Expected email root summary topic-digest classification to remain true for digest-style content.");
  }

  if (actual.summaryDetectedAt !== 1234567890) {
    failures.push("Expected email root summary to use the injected clock for detectedAt.");
  }

  if (actual.summaryDetectionMode !== "inbox-read") {
    failures.push("Expected email root summary to default to inbox-read on inbox hosts.");
  }

  if (actual.summarySectionLabel !== "Digest mail") {
    failures.push("Expected email root summary to preserve the root title as the section label.");
  }

  if (!actual.summaryIsTopicDigest) {
    failures.push("Expected email root summary to mark the summarized snapshot as a topic digest.");
  }

  if (actual.summaryFinalUrlCount !== 1) {
    failures.push("Expected email root summary to retain the pipeline final URL count from analyzeInput.");
  }

  if (actual.analyzeCallCount !== 2) {
    failures.push("Expected email root summary to call analyzeInput once per summarization.");
  }

  if (actual.analyzeRawText !== textMetrics.text) {
    failures.push("Expected email root summary to pass the measured text into analyzeInput.");
  }

  if (actual.analyzeSourceHtml !== htmlMarkup) {
    failures.push("Expected email root summary to pass the original resolved HTML markup into analyzeInput.");
  }

  if (
    !actual.summaryHasOriginalBackup ||
    actual.preservedSummarySourceHtml !== htmlMarkup ||
    actual.preservedSummaryRawText !== textMetrics.text ||
    actual.preservedSummaryBackupSourceHtml !== htmlMarkup ||
    actual.preservedAnalyzeRawText !== textMetrics.text ||
    actual.preservedAnalyzeSourceHtml !== htmlMarkup
  ) {
    failures.push("Expected email root summary to keep using the original backup after the visible email body is rewritten.");
  }

  if (!actual.analyzeOptions || actual.analyzeOptions.stripKnownTrackingParameters !== true) {
    failures.push("Expected email root summary to pass pipeline settings into analyzeInput.");
  }

  if (actual.debugEventCount < 3) {
    failures.push("Expected email root summary to emit debug events during summarization.");
  }

  if (!actual.debugCapturedBackup || !actual.debugReusedBackup) {
    failures.push("Expected email root summary to emit debug events when capturing and reusing the original backup.");
  }

  return {
    id: "module-email-root-summary",
    title: "Email root summary module resolves iframe bodies and summarizes digest snapshots",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      iframeContentResolved: true,
      contentElementResolved: true,
      summaryDetectionMode: "inbox-read",
      summarySectionLabel: "Digest mail",
      summaryIsTopicDigest: true,
      summaryHasOriginalBackup: true,
      preservedSummarySourceHtml: htmlMarkup,
      summaryFinalUrlCount: 1,
      analyzeCallCount: 2
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runEmailRootRuntimeRegression() {
  const observedTargets = [];
  const replaceCalls = [];
  const publishedSnapshots = [];
  const scheduledSyncReasons = [];
  const debugEvents = [];
  const loadListeners = [];
  let syncEmailSnapshotCallCount = 0;
  let latestSnapshot = null;
  let latestDetectedEmailRoot = null;
  let latestDetectedEmailMode = "";
  const iframeBody = {
    innerHTML: "<p>Original body</p>",
    innerText: "Original body",
    textContent: "Original body"
  };
  const iframeRoot = {
    id: "iframe-root",
    tagName: "IFRAME",
    isConnected: true,
    contentDocument: {
      body: iframeBody
    },
    addEventListener: function addEventListener(eventName, callback) {
      loadListeners.push({
        eventName: eventName,
        callback: callback
      });
    }
  };
  const runtimeController = emailRootRuntime.create({
    mutationObserverClass: function FakeMutationObserver(callback) {
      this.observe = function observe(target) {
        observedTargets.push({
          target: target,
          callback: callback
        });
      };
    },
    replaceElementMarkup: function replaceElementMarkup(targetElement, htmlMarkup) {
      replaceCalls.push({
        targetElement: targetElement,
        htmlMarkup: htmlMarkup
      });
      targetElement.innerHTML = htmlMarkup;
      targetElement.innerText = "Rewritten body";
      targetElement.textContent = "Rewritten body";
    },
    debugApi: {
      variable: function variable(message) {
        debugEvents.push(message);
      }
    },
    syncEmailSnapshot: function syncEmailSnapshot() {
      syncEmailSnapshotCallCount += 1;
      latestSnapshot = {
        id: "snap-1",
        detectedAt: 42,
        sourceHtml: "<p>Original body</p>",
        rawText: "Original body",
        originalEmailBackup: {
          capturedAt: 42,
          sourceHtml: "<p>Original body</p>",
          rawText: "Original body"
        },
        pipeline: {
          rewrittenHtml: "<section>Rewritten body</section>"
        }
      };
      return true;
    },
    summarizeEmailRoot: function summarizeEmailRoot(root, detectionMode) {
      return {
        id: "summary:" + String(root && root.id ? root.id : "missing"),
        detectedAt: 42,
        detectionMode: detectionMode || "",
        sectionLabel: "Summary label",
        sourceHtml: iframeBody.innerHTML,
        rawText: iframeBody.innerText,
        pipelineSettings: {},
        pipeline: {
          finalUrls: ["https://example.com/rewrite"],
          rewrittenHtml: iframeBody.innerHTML
        },
        isTopicDigest: false
      };
    },
    publishSnapshot: async function publishSnapshot(snapshot) {
      publishedSnapshots.push(snapshot);
      latestSnapshot = snapshot;
    },
    scheduleSnapshotSync: function scheduleSnapshotSync() {
      scheduledSyncReasons.push("scheduled");
      return scheduledSyncReasons.length;
    },
    shouldReplaceEmailBodyWithMirrorContent: function shouldReplaceEmailBodyWithMirrorContent(snapshot) {
      return !!(snapshot && snapshot.pipeline && snapshot.pipeline.rewrittenHtml);
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return latestSnapshot;
    },
    getLatestDetectedEmailRoot: function getLatestDetectedEmailRoot() {
      return latestDetectedEmailRoot;
    },
    setLatestDetectedEmailRoot: function setLatestDetectedEmailRoot(nextLatestDetectedEmailRoot) {
      latestDetectedEmailRoot = nextLatestDetectedEmailRoot;
    },
    getLatestDetectedEmailMode: function getLatestDetectedEmailMode() {
      return latestDetectedEmailMode;
    },
    setLatestDetectedEmailMode: function setLatestDetectedEmailMode(nextLatestDetectedEmailMode) {
      latestDetectedEmailMode = String(nextLatestDetectedEmailMode || "");
    },
    choosePrimaryEmailCandidate: function choosePrimaryEmailCandidate(candidates) {
      return Array.isArray(candidates) && candidates.length ? candidates[0] : null;
    },
    getInboxRootCandidates: function getInboxRootCandidates() {
      return [{
        root: iframeRoot,
        detectionMode: "inbox-read"
      }];
    },
    getEmailRootHtmlMarkup: function getEmailRootHtmlMarkup(root) {
      return root === iframeRoot ? iframeBody.innerHTML : "";
    },
    getEmailRootContentElement: function getEmailRootContentElement(root) {
      return root === iframeRoot ? iframeBody : root;
    },
    getIframeEmailRootContentElement: function getIframeEmailRootContentElement(root) {
      return root === iframeRoot ? iframeBody : null;
    }
  });
  const initialActiveRoot = runtimeController.getActiveEmailRoot();

  runtimeController.observeEmailRoot(iframeRoot);
  runtimeController.observeEmailRoot(iframeRoot);

  const observerCountAfterDuplicateObserve = observedTargets.length;
  const iframeLoadListener = loadListeners.find(function findIframeLoadListener(listener) {
    return listener.eventName === "load";
  });
  if (iframeLoadListener) {
    iframeLoadListener.callback();
  }

  return runtimeController.applyRewriteToEmailBody().then(function handleAppliedRewrite(appliedRewriteResult) {
    return runtimeController.maybeReplaceEmailBodyWithMirrorContent(latestSnapshot).then(function handleIdempotentRewrite(idempotentRewriteResult) {
      const actual = {
        initialActiveRootId: initialActiveRoot && initialActiveRoot.id ? initialActiveRoot.id : "",
        observerCountAfterDuplicateObserve: observerCountAfterDuplicateObserve,
        observedTargetKinds: observedTargets.map(function mapObservedTargetKind(observedTarget) {
          return observedTarget.target === iframeRoot ? "iframe-root" : "iframe-body";
        }),
        hasIframeLoadListener: !!iframeLoadListener,
        syncEmailSnapshotCallCount: syncEmailSnapshotCallCount,
        replaceCallCount: replaceCalls.length,
        replacedHtml: replaceCalls.length ? replaceCalls[0].htmlMarkup : "",
        replacedTargetIsIframeBody: !!(replaceCalls.length && replaceCalls[0].targetElement === iframeBody),
        rootBackupRawText:
          iframeRoot.__urlForensicsOriginalEmailBackup && iframeRoot.__urlForensicsOriginalEmailBackup.rawText
            ? iframeRoot.__urlForensicsOriginalEmailBackup.rawText
            : "",
        contentBackupRawText:
          iframeBody.__urlForensicsOriginalEmailBackup && iframeBody.__urlForensicsOriginalEmailBackup.rawText
            ? iframeBody.__urlForensicsOriginalEmailBackup.rawText
            : "",
        contentBackupSourceHtml:
          iframeBody.__urlForensicsOriginalEmailBackup && iframeBody.__urlForensicsOriginalEmailBackup.sourceHtml
            ? iframeBody.__urlForensicsOriginalEmailBackup.sourceHtml
            : "",
        debugPreservedBackup: debugEvents.indexOf("content original email backup preserved before rewrite") !== -1,
        latestDetectedEmailRootId: latestDetectedEmailRoot && latestDetectedEmailRoot.id ? latestDetectedEmailRoot.id : "",
        latestDetectedEmailMode: latestDetectedEmailMode,
        publishedSnapshotIds: publishedSnapshots.map(function mapPublishedSnapshotId(snapshot) {
          return snapshot && snapshot.id ? snapshot.id : "";
        }),
        scheduledSyncCount: scheduledSyncReasons.length,
        appliedRewriteResult: appliedRewriteResult,
        idempotentRewriteResult: idempotentRewriteResult
      };
      const failures = [];

      if (actual.initialActiveRootId !== "iframe-root") {
        failures.push("Expected email root runtime to resolve the primary inbox candidate as the initial active email root.");
      }

      if (actual.observerCountAfterDuplicateObserve !== 2) {
        failures.push("Expected email root runtime to ignore duplicate observe requests for the same root while still observing the iframe body.");
      }

      if (!arrayEquals(actual.observedTargetKinds, ["iframe-root", "iframe-body", "iframe-body"])) {
        failures.push("Expected email root runtime to observe the iframe root once and the iframe body on initial attach plus iframe load.");
      }

      if (!actual.hasIframeLoadListener) {
        failures.push("Expected email root runtime to attach an iframe load listener for content re-observation.");
      }

      if (actual.syncEmailSnapshotCallCount !== 1) {
        failures.push("Expected email root runtime to request a snapshot sync when applying a rewrite without a current snapshot.");
      }

      if (actual.replaceCallCount !== 1) {
        failures.push("Expected email root runtime to apply rewritten HTML exactly once before the idempotent follow-up pass.");
      }

      if (actual.replacedHtml !== "<section>Rewritten body</section>") {
        failures.push("Expected email root runtime to apply the rewritten HTML from the active snapshot.");
      }

      if (!actual.replacedTargetIsIframeBody) {
        failures.push("Expected email root runtime to rewrite the iframe body content rather than the iframe element shell.");
      }

      if (
        actual.rootBackupRawText !== "Original body" ||
        actual.contentBackupRawText !== "Original body" ||
        actual.contentBackupSourceHtml !== "<p>Original body</p>" ||
        !actual.debugPreservedBackup
      ) {
        failures.push("Expected email root runtime to preserve the original email backup on the root and content element while rewriting.");
      }

      if (actual.latestDetectedEmailRootId !== "iframe-root") {
        failures.push("Expected email root runtime to retain the rewritten iframe root as the latest detected email root.");
      }

      if (actual.latestDetectedEmailMode !== "inbox-read") {
        failures.push("Expected email root runtime to preserve the detection mode from the fallback candidate.");
      }

      if (!arrayEquals(actual.publishedSnapshotIds, ["summary:iframe-root"])) {
        failures.push("Expected email root runtime to publish one refreshed snapshot after rewriting the email root.");
      }

      if (actual.scheduledSyncCount !== 2) {
        failures.push("Expected email root runtime to schedule one sync on iframe load and one after a successful rewrite.");
      }

      if (!actual.appliedRewriteResult || actual.appliedRewriteResult.ok !== true || actual.appliedRewriteResult.applied !== true) {
        failures.push("Expected email root runtime applyRewriteToEmailBody to report a successful applied rewrite.");
      }

      if (!actual.idempotentRewriteResult || actual.idempotentRewriteResult.ok !== true || actual.idempotentRewriteResult.applied !== false) {
        failures.push("Expected email root runtime maybeReplaceEmailBodyWithMirrorContent to become idempotent once the rewritten HTML is already present.");
      }

      return {
        id: "module-email-root-runtime",
        title: "Email root runtime module observes iframe roots and applies mirror rewrites idempotently",
        mode: "active",
        status: failures.length ? "failed" : "passed",
        sectionId: "module-regressions",
        sectionTitle: "Module Regressions",
        expected: {
          initialActiveRootId: "iframe-root",
          observerCountAfterDuplicateObserve: 2,
          observedTargetKinds: ["iframe-root", "iframe-body", "iframe-body"],
          syncEmailSnapshotCallCount: 1,
          replaceCallCount: 1,
          rootBackupRawText: "Original body",
          contentBackupRawText: "Original body",
          latestDetectedEmailRootId: "iframe-root",
          latestDetectedEmailMode: "inbox-read",
          publishedSnapshotIds: ["summary:iframe-root"],
          scheduledSyncCount: 2
        },
        targetExpected: null,
        actual: actual,
        failures: failures
      };
    });
  });
}

function runEmailAutoReplaceRegression() {
  function createFakeElement(options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const attributes = Object.assign({}, optionBag.attributes);
    const querySelectorAllResults = Object.assign({}, optionBag.querySelectorAllResults);

    return {
      innerText: String(optionBag.innerText || ""),
      textContent: String(optionBag.textContent || optionBag.innerText || ""),
      closest: function closest(selector) {
        if (selector === "#merged-link-lab-page-pane" && optionBag.isLabPaneDescendant) {
          return {};
        }

        if (
          selector === "[data-message-id], [role='listitem'], [role='article'], article, [data-test-id*='message'], [data-test-id*='conversation']"
        ) {
          return optionBag.messageScope || null;
        }

        return null;
      },
      getAttribute: function getAttribute(attributeName) {
        return Object.prototype.hasOwnProperty.call(attributes, attributeName) ? attributes[attributeName] : "";
      },
      querySelectorAll: function querySelectorAll(selector) {
        return Object.prototype.hasOwnProperty.call(querySelectorAllResults, selector)
          ? querySelectorAllResults[selector].slice()
          : [];
      }
    };
  }

  let directReplaceEnabled = false;
  let autoReplaceEnabled = true;
  let mobileAutoApplyEnabled = false;
  let mobileDeviceDetected = false;
  let senderElementPresent = false;
  let controlElements = [];
  const senderEmailList = ["alerts@example.com"];
  const messageScope = createFakeElement({
    innerText: "From: Alerts Team <alerts@example.com>\nSubject: Digest",
    querySelectorAllResults: {
      "button, [role='button'], a[href], a[role='button'], summary, [aria-expanded]": controlElements
    }
  });
  const activeEmailRoot = createFakeElement({
    innerText: "From: Alerts Team <alerts@example.com>\nRead online now.",
    messageScope: messageScope
  });
  const nativeExpansionControl = createFakeElement({
    innerText: "Show quoted text",
    attributes: {
      "aria-label": "Show quoted text"
    }
  });
  const autoReplaceController = emailAutoReplace.create({
    documentObject: {
      title: "Alerts Digest",
      querySelector: function querySelector() {
        return senderElementPresent ? {} : null;
      }
    },
    getActiveEmailRoot: function getActiveEmailRoot() {
      return activeEmailRoot;
    },
    getAutoApplyMirrorSenderSelector: function getAutoApplyMirrorSenderSelector() {
      return '[data-email="alerts@example.com"]';
    },
    getAutoApplyMirrorSenderEmailPattern: function getAutoApplyMirrorSenderEmailPattern() {
      return /alerts@example\.com/i;
    },
    getAutoApplyMirrorSenderHeaderPattern: function getAutoApplyMirrorSenderHeaderPattern() {
      return /(?:from|sender|reply-to).{0,260}alerts@example\.com/i;
    },
    nativeExpansionControlHintPattern: /\b(show quoted text|expand|show trimmed content)\b/i,
    getReplaceEmailBodyWithMirrorContentEnabled: function getReplaceEmailBodyWithMirrorContentEnabled() {
      return directReplaceEnabled;
    },
    getAutoApplyMirrorForConfiguredSendersEnabled: function getAutoApplyMirrorForConfiguredSendersEnabled() {
      return autoReplaceEnabled;
    },
    getAutoApplyMirrorOnMobileDeviceEnabled: function getAutoApplyMirrorOnMobileDeviceEnabled() {
      return mobileAutoApplyEnabled;
    },
    getAutoApplyMirrorSenderEmailList: function getAutoApplyMirrorSenderEmailList() {
      return senderEmailList.slice();
    },
    isMobileDevice: function isMobileDevice() {
      return mobileDeviceDetected;
    }
  });
  const snapshot = {
    rawText: "From: Alerts Team <alerts@example.com>\nReview the latest issue.",
    sourceHtml: '<div>From: Alerts Team &lt;alerts@example.com&gt;</div>'
  };
  const initialSenderTextMatch = autoReplaceController.hasConfiguredSenderText("From: Alerts <alerts@example.com>");
  const initialSenderDetection = autoReplaceController.isConfiguredSenderDetected(snapshot);
  const initialAutoReplace = autoReplaceController.shouldAutoReplaceEmailBodyWithMirrorContent(snapshot);
  const initialShouldReplace = autoReplaceController.shouldReplaceEmailBodyWithMirrorContent(snapshot);

  autoReplaceEnabled = false;
  mobileAutoApplyEnabled = true;
  mobileDeviceDetected = true;
  const mobileAutoReplace = autoReplaceController.shouldAutoReplaceEmailBodyWithMirrorContent(snapshot);
  const mobileShouldReplace = autoReplaceController.shouldReplaceEmailBodyWithMirrorContent(snapshot);
  mobileDeviceDetected = false;
  const nonMobileAutoReplace = autoReplaceController.shouldAutoReplaceEmailBodyWithMirrorContent(snapshot);
  mobileDeviceDetected = true;

  senderElementPresent = true;
  const senderElementDetection = autoReplaceController.hasConfiguredSenderElement();

  controlElements = [nativeExpansionControl];
  messageScope.querySelectorAll = function querySelectorAll(selector) {
    return selector === "button, [role='button'], a[href], a[role='button'], summary, [aria-expanded]"
      ? controlElements.slice()
      : [];
  };
  const blockedAutoReplace = autoReplaceController.shouldAutoReplaceEmailBodyWithMirrorContent(snapshot);
  const blockedMobileAutoReplace = autoReplaceController.shouldReplaceEmailBodyWithMirrorContent(snapshot);

  directReplaceEnabled = true;
  const forcedReplace = autoReplaceController.shouldReplaceEmailBodyWithMirrorContent(snapshot);
  const actual = {
    initialSenderTextMatch: initialSenderTextMatch,
    initialSenderDetection: initialSenderDetection,
    initialAutoReplace: initialAutoReplace,
    initialShouldReplace: initialShouldReplace,
    mobileAutoReplace: mobileAutoReplace,
    mobileShouldReplace: mobileShouldReplace,
    nonMobileAutoReplace: nonMobileAutoReplace,
    senderElementDetection: senderElementDetection,
    nativeExpansionControlDetected: autoReplaceController.hasNativeEmailExpansionControl(activeEmailRoot),
    blockedAutoReplace: blockedAutoReplace,
    blockedMobileAutoReplace: blockedMobileAutoReplace,
    forcedReplace: forcedReplace,
    unrelatedSenderTextMatch: autoReplaceController.hasConfiguredSenderText("newsletter@example.org")
  };
  const failures = [];

  if (!actual.initialSenderTextMatch) {
    failures.push("Expected email auto-replace to match configured sender text in header-style content.");
  }

  if (!actual.initialSenderDetection) {
    failures.push("Expected email auto-replace to detect the configured sender from snapshot and message-scope text.");
  }

  if (!actual.initialAutoReplace) {
    failures.push("Expected email auto-replace to allow automatic replacement when the sender matches and no native expansion control is present.");
  }

  if (!actual.initialShouldReplace) {
    failures.push("Expected email auto-replace shouldReplace to be true when auto-replace is permitted.");
  }

  if (!actual.mobileAutoReplace || !actual.mobileShouldReplace || actual.nonMobileAutoReplace) {
    failures.push("Expected email auto-replace to apply automatically only when the mobile-device setting and detection are both active.");
  }

  if (!actual.senderElementDetection) {
    failures.push("Expected email auto-replace to detect configured sender elements through the compiled selector.");
  }

  if (!actual.nativeExpansionControlDetected) {
    failures.push("Expected email auto-replace to detect native expansion controls in the active email root scope.");
  }

  if (actual.blockedAutoReplace) {
    failures.push("Expected email auto-replace to block automatic replacement when a native expansion control is present.");
  }

  if (actual.blockedMobileAutoReplace) {
    failures.push("Expected mobile-device auto-replace to respect the native expansion-control guard.");
  }

  if (!actual.forcedReplace) {
    failures.push("Expected email auto-replace direct replacement to override the blocked auto-replace path.");
  }

  if (actual.unrelatedSenderTextMatch) {
    failures.push("Expected email auto-replace to ignore unrelated sender text.");
  }

  return {
    id: "module-email-auto-replace",
    title: "Email auto-replace module matches configured senders and blocks auto-apply on native expansion controls",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      initialSenderTextMatch: true,
      initialSenderDetection: true,
      initialAutoReplace: true,
      mobileAutoReplace: true,
      nonMobileAutoReplace: false,
      senderElementDetection: true,
      nativeExpansionControlDetected: true,
      blockedAutoReplace: false,
      blockedMobileAutoReplace: false,
      forcedReplace: true,
      unrelatedSenderTextMatch: false
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runEmailAutoReplaceStateRegression() {
  const extensionSettings = {
    autoApplyMirrorForConfiguredSenders: false,
    autoApplyMirrorSenderEmailList: [" Alerts@Example.com ", "", "alerts@example.com"]
  };
  const stateController = emailAutoReplaceState.create({
    cssObject: {
      escape: function escape(value) {
        return String(value || "").replace(/"/g, '\\"');
      }
    },
    extensionSettings: extensionSettings,
    defaultAutoApplyMirrorForConfiguredSenders: false,
    defaultAutoApplyMirrorSenderEmails: ["default@example.com"],
    sanitizeSenderEmailList: function sanitizeSenderEmailList(value) {
      const values = Array.isArray(value) ? value : [];
      const normalizedValues = values.map(function normalizeSenderEmail(emailAddress) {
        return String(emailAddress || "").trim().toLowerCase();
      }).filter(Boolean);
      return Array.from(new Set(normalizedValues));
    }
  });
  const initialSelector = stateController.getAutoApplyMirrorSenderSelector();
  const initialEmailPattern = stateController.getAutoApplyMirrorSenderEmailPattern();
  const initialHeaderPattern = stateController.getAutoApplyMirrorSenderHeaderPattern();
  const initialSanitizedEmailList = extensionSettings.autoApplyMirrorSenderEmailList.slice();

  stateController.applyStoredAutoApplyMirrorForConfiguredSendersSetting(true);
  const enabledAutoApply = extensionSettings.autoApplyMirrorForConfiguredSenders;

  stateController.applyStoredAutoApplyMirrorForConfiguredSendersSetting("invalid");
  const fallbackAutoApply = extensionSettings.autoApplyMirrorForConfiguredSenders;

  stateController.applyStoredAutoApplyMirrorSenderEmailList(["News@Example.com", "news@example.com"], { useDefaultList: true });
  const updatedSelector = stateController.getAutoApplyMirrorSenderSelector();
  const updatedEmailPattern = stateController.getAutoApplyMirrorSenderEmailPattern();
  const updatedHeaderPattern = stateController.getAutoApplyMirrorSenderHeaderPattern();
  const updatedEmailList = extensionSettings.autoApplyMirrorSenderEmailList.slice();

  stateController.applyStoredAutoApplyMirrorSenderEmailList(undefined, { useDefaultList: true });
  const defaultedEmailList = extensionSettings.autoApplyMirrorSenderEmailList.slice();
  const defaultedSelector = stateController.getAutoApplyMirrorSenderSelector();
  const defaultedEmailPattern = stateController.getAutoApplyMirrorSenderEmailPattern();
  const actual = {
    initialSanitizedEmailList: initialSanitizedEmailList,
    initialSelectorIncludesDataEmail: initialSelector.indexOf('[data-email="alerts@example.com"]') !== -1,
    initialSelectorIncludesMailto: initialSelector.indexOf('a[href="mailto:alerts@example.com"]') !== -1,
    initialEmailPatternMatches: !!(initialEmailPattern && initialEmailPattern.test("Alerts <alerts@example.com>")),
    initialHeaderPatternMatches: !!(initialHeaderPattern && initialHeaderPattern.test("From: alerts@example.com")),
    enabledAutoApply: enabledAutoApply,
    fallbackAutoApply: fallbackAutoApply,
    updatedEmailList: updatedEmailList,
    updatedSelectorIncludesNewEmail: updatedSelector.indexOf('[data-email="news@example.com"]') !== -1,
    updatedEmailPatternMatches: !!(updatedEmailPattern && updatedEmailPattern.test("Contact news@example.com now")),
    updatedHeaderPatternMatches: !!(updatedHeaderPattern && updatedHeaderPattern.test("Reply-To: news@example.com")),
    defaultedEmailList: defaultedEmailList,
    defaultedSelectorIncludesDefaultEmail: defaultedSelector.indexOf('[data-email="default@example.com"]') !== -1,
    defaultedEmailPatternMatches: !!(defaultedEmailPattern && defaultedEmailPattern.test("default@example.com"))
  };
  const failures = [];

  if (!arrayEquals(actual.initialSanitizedEmailList, ["alerts@example.com"])) {
    failures.push("Expected email auto-replace state to sanitize the initial sender email list deterministically.");
  }

  if (!actual.initialSelectorIncludesDataEmail || !actual.initialSelectorIncludesMailto) {
    failures.push("Expected email auto-replace state to compile selector variants for data-email and mailto matches.");
  }

  if (!actual.initialEmailPatternMatches || !actual.initialHeaderPatternMatches) {
    failures.push("Expected email auto-replace state to compile both plain email and header email patterns.");
  }

  if (actual.enabledAutoApply !== true) {
    failures.push("Expected email auto-replace state to honor explicit stored boolean values.");
  }

  if (actual.fallbackAutoApply !== false) {
    failures.push("Expected email auto-replace state to fall back to the default auto-apply boolean on invalid stored input.");
  }

  if (!arrayEquals(actual.updatedEmailList, ["news@example.com"])) {
    failures.push("Expected email auto-replace state to sanitize and deduplicate updated sender email lists.");
  }

  if (!actual.updatedSelectorIncludesNewEmail || !actual.updatedEmailPatternMatches || !actual.updatedHeaderPatternMatches) {
    failures.push("Expected email auto-replace state to recompile selectors and patterns after updating the sender email list.");
  }

  if (!arrayEquals(actual.defaultedEmailList, ["default@example.com"])) {
    failures.push("Expected email auto-replace state to restore the default sender email list when requested.");
  }

  if (!actual.defaultedSelectorIncludesDefaultEmail || !actual.defaultedEmailPatternMatches) {
    failures.push("Expected email auto-replace state to recompile selectors and patterns after restoring the default sender email list.");
  }

  return {
    id: "module-email-auto-replace-state",
    title: "Email auto-replace state module compiles sender selectors and applies stored defaults",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      initialSelectorIncludesDataEmail: true,
      initialSelectorIncludesMailto: true,
      initialEmailPatternMatches: true,
      initialHeaderPatternMatches: true,
      enabledAutoApply: true,
      fallbackAutoApply: false,
      updatedEmailList: ["news@example.com"],
      updatedSelectorIncludesNewEmail: true,
      updatedEmailPatternMatches: true,
      updatedHeaderPatternMatches: true,
      defaultedEmailList: ["default@example.com"],
      defaultedSelectorIncludesDefaultEmail: true,
      defaultedEmailPatternMatches: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runContentSettingsStorageRegression() {
  function createStorageModel() {
    return {
      defaultSettings: {
        enableUrlNormalizationRepair: false,
        stripKnownTrackingParameters: true,
        trackingParameterFilters: ["utm_source"],
        allowHelperOpenWithoutDetectedEmailBody: false,
        autoApplyMirrorOnMobileDevice: false,
        autoApplyMirrorForConfiguredSenders: false
      },
      normalizeStoredSettings: function normalizeStoredSettings(storedSettings) {
        return storedSettings && typeof storedSettings === "object" ? storedSettings : {};
      },
      getStorageReadKeys: function getStorageReadKeys() {
        return [
          "enableRepair",
          "stripTracking",
          "trackingFilters",
          "replaceEmailBody",
          "allowHelperOpenWithoutDetectedEmailBody",
          "autoApplyMobile",
          "autoApplySenders",
          "senderList"
        ];
      },
      getEffectiveBooleanSettingValue: function getEffectiveBooleanSettingValue(storedSettings, storageKey, fallbackValue) {
        return typeof storedSettings[storageKey] === "boolean" ? storedSettings[storageKey] : fallbackValue;
      },
      getEffectiveTrackingParameterFilters: function getEffectiveTrackingParameterFilters(storedSettings, storageKey, fallbackValue) {
        return Array.isArray(storedSettings[storageKey]) ? storedSettings[storageKey].slice() : fallbackValue.slice();
      },
      normalizeTrackingParameterFilters: function normalizeTrackingParameterFilters(value) {
        return Array.isArray(value) ? value.slice() : [];
      }
    };
  }

  function createExtensionSettings() {
    return {
      enableUrlNormalizationRepair: false,
      stripKnownTrackingParameters: true,
      trackingParameterFilters: ["utm_source"],
      replaceEmailBodyWithMirrorContent: false,
      allowHelperOpenWithoutDetectedEmailBody: false,
      autoApplyMirrorOnMobileDevice: false,
      autoApplyMirrorForConfiguredSenders: false,
      autoApplyMirrorSenderEmailList: ["default@example.com"]
    };
  }

  function createExtensionStorageSnapshot() {
    return {
      source: "defaults",
      loadedAt: 0,
      loadError: "",
      values: {}
    };
  }

  function createSnapshotEntry(storedSettings, storageKey, effectiveValue) {
    return {
      hasStoredValue: !!(storedSettings && Object.prototype.hasOwnProperty.call(storedSettings, storageKey)),
      rawValue: storedSettings ? storedSettings[storageKey] : undefined,
      effectiveValue: effectiveValue
    };
  }

  const syncCalls = [];
  const debugEvents = [];
  const autoReplaceStateCalls = [];
  const extensionSettings = createExtensionSettings();
  const extensionStorageSnapshot = createExtensionStorageSnapshot();
  const successController = contentSettingsStorage.create({
    extensionApi: {
      storage: {
        local: {
          get: async function get() {
            return {
              enableRepair: true,
              stripTracking: false,
              trackingFilters: ["utm_medium", "utm_campaign"],
              replaceEmailBody: true,
              allowHelperOpenWithoutDetectedEmailBody: true,
              autoApplyMobile: true,
              autoApplySenders: true,
              senderList: ["alerts@example.com"]
            };
          }
        }
      }
    },
    storageModel: createStorageModel(),
    extensionSettings: extensionSettings,
    extensionStorageSnapshot: extensionStorageSnapshot,
    debugApi: {
      conditional: function conditional(message) {
        debugEvents.push("conditional:" + message);
      },
      error: function error(message) {
        debugEvents.push("error:" + message);
      },
      functionIn: function functionIn(message) {
        debugEvents.push("in:" + message);
      },
      functionOut: function functionOut(message) {
        debugEvents.push("out:" + message);
      },
      storage: function storage(message) {
        debugEvents.push("storage:" + message);
      }
    },
    getNow: function getNow() {
      return 1234;
    },
    getPipelineSettings: function getPipelineSettings() {
      return {
        enableUrlNormalizationRepair: extensionSettings.enableUrlNormalizationRepair,
        stripKnownTrackingParameters: extensionSettings.stripKnownTrackingParameters,
        trackingParameterFilters: extensionSettings.trackingParameterFilters.slice()
      };
    },
    syncEmailSnapshot: function syncEmailSnapshot(options) {
      syncCalls.push(options || null);
      return true;
    },
    urlNormalizationRepairStorageKey: "enableRepair",
    trackingParameterStripStorageKey: "stripTracking",
    trackingParameterFiltersStorageKey: "trackingFilters",
    replaceEmailBodyWithMirrorContentStorageKey: "replaceEmailBody",
    allowHelperOpenWithoutDetectedEmailBodyStorageKey: "allowHelperOpenWithoutDetectedEmailBody",
    autoApplyMirrorOnMobileDeviceStorageKey: "autoApplyMobile",
    autoApplyMirrorForConfiguredSendersStorageKey: "autoApplySenders",
    autoApplyMirrorSenderEmailListStorageKey: "senderList",
    legacyAutoApplyMirrorForNamedSenderStorageKey: "legacyAutoApply",
    buildStorageBooleanSnapshotEntry: createSnapshotEntry,
    buildTrackingParameterFilterSnapshotEntry: createSnapshotEntry,
    buildStorageEmailListSnapshotEntry: createSnapshotEntry,
    resolveStoredAutoApplyConfiguredSendersValue: function resolveStoredAutoApplyConfiguredSendersValue(storedSettings) {
      return storedSettings.autoApplySenders;
    },
    applyStoredAutoApplyMirrorForConfiguredSendersSetting: function applyStoredAutoApplyMirrorForConfiguredSendersSetting(nextValue) {
      autoReplaceStateCalls.push("bool:" + String(nextValue));
      extensionSettings.autoApplyMirrorForConfiguredSenders = nextValue === true;
    },
    applyStoredAutoApplyMirrorSenderEmailList: function applyStoredAutoApplyMirrorSenderEmailList(nextValue) {
      autoReplaceStateCalls.push("list:" + JSON.stringify(nextValue || []));
      extensionSettings.autoApplyMirrorSenderEmailList = Array.isArray(nextValue) ? nextValue.slice() : ["default@example.com"];
    }
  });
  const successLoadResult = await successController.loadPipelineSettings();
  const successSettingsAfterLoad = {
    enableUrlNormalizationRepair: extensionSettings.enableUrlNormalizationRepair,
    stripKnownTrackingParameters: extensionSettings.stripKnownTrackingParameters,
    trackingParameterFilters: extensionSettings.trackingParameterFilters.slice(),
    replaceEmailBodyWithMirrorContent: extensionSettings.replaceEmailBodyWithMirrorContent,
    allowHelperOpenWithoutDetectedEmailBody: extensionSettings.allowHelperOpenWithoutDetectedEmailBody,
    autoApplyMirrorOnMobileDevice: extensionSettings.autoApplyMirrorOnMobileDevice,
    autoApplyMirrorForConfiguredSenders: extensionSettings.autoApplyMirrorForConfiguredSenders,
    autoApplyMirrorSenderEmailList: extensionSettings.autoApplyMirrorSenderEmailList.slice()
  };
  const successSnapshotSourceAfterLoad = extensionStorageSnapshot.source;
  const successSnapshotLoadedAtAfterLoad = extensionStorageSnapshot.loadedAt;
  const successSnapshotHasSenderList = !!(
    extensionStorageSnapshot.values &&
    extensionStorageSnapshot.values.autoApplyMirrorSenderEmailList &&
    extensionStorageSnapshot.values.autoApplyMirrorSenderEmailList.effectiveValue
  );
  const updateResult = successController.handlePipelineStorageChange({
    stripTracking: { newValue: true },
    replaceEmailBody: { newValue: false },
    allowHelperOpenWithoutDetectedEmailBody: { newValue: false },
    autoApplyMobile: { newValue: false },
    senderList: { newValue: ["news@example.com"] }
  }, "local");
  const ignoredUpdateResult = successController.handlePipelineStorageChange({}, "sync");

  const unavailableExtensionSettings = createExtensionSettings();
  const unavailableExtensionStorageSnapshot = createExtensionStorageSnapshot();
  const unavailableController = contentSettingsStorage.create({
    extensionApi: {},
    storageModel: createStorageModel(),
    extensionSettings: unavailableExtensionSettings,
    extensionStorageSnapshot: unavailableExtensionStorageSnapshot,
    getNow: function getNow() {
      return 4321;
    },
    getPipelineSettings: function getPipelineSettings() {
      return {
        enableUrlNormalizationRepair: unavailableExtensionSettings.enableUrlNormalizationRepair
      };
    },
    urlNormalizationRepairStorageKey: "enableRepair",
    trackingParameterStripStorageKey: "stripTracking",
    trackingParameterFiltersStorageKey: "trackingFilters",
    replaceEmailBodyWithMirrorContentStorageKey: "replaceEmailBody",
    allowHelperOpenWithoutDetectedEmailBodyStorageKey: "allowHelperOpenWithoutDetectedEmailBody",
    autoApplyMirrorOnMobileDeviceStorageKey: "autoApplyMobile",
    autoApplyMirrorForConfiguredSendersStorageKey: "autoApplySenders",
    autoApplyMirrorSenderEmailListStorageKey: "senderList",
    legacyAutoApplyMirrorForNamedSenderStorageKey: "legacyAutoApply",
    buildStorageBooleanSnapshotEntry: createSnapshotEntry,
    buildTrackingParameterFilterSnapshotEntry: createSnapshotEntry,
    buildStorageEmailListSnapshotEntry: createSnapshotEntry
  });
  const unavailableLoadResult = await unavailableController.loadPipelineSettings();

  const errorExtensionSettings = createExtensionSettings();
  const errorExtensionStorageSnapshot = createExtensionStorageSnapshot();
  const errorController = contentSettingsStorage.create({
    extensionApi: {
      storage: {
        local: {
          get: async function get() {
            throw new Error("boom");
          }
        }
      }
    },
    storageModel: createStorageModel(),
    extensionSettings: errorExtensionSettings,
    extensionStorageSnapshot: errorExtensionStorageSnapshot,
    getNow: function getNow() {
      return 5678;
    },
    getPipelineSettings: function getPipelineSettings() {
      return {
        enableUrlNormalizationRepair: errorExtensionSettings.enableUrlNormalizationRepair
      };
    },
    urlNormalizationRepairStorageKey: "enableRepair",
    trackingParameterStripStorageKey: "stripTracking",
    trackingParameterFiltersStorageKey: "trackingFilters",
    replaceEmailBodyWithMirrorContentStorageKey: "replaceEmailBody",
    allowHelperOpenWithoutDetectedEmailBodyStorageKey: "allowHelperOpenWithoutDetectedEmailBody",
    autoApplyMirrorOnMobileDeviceStorageKey: "autoApplyMobile",
    autoApplyMirrorForConfiguredSendersStorageKey: "autoApplySenders",
    autoApplyMirrorSenderEmailListStorageKey: "senderList",
    legacyAutoApplyMirrorForNamedSenderStorageKey: "legacyAutoApply",
    buildStorageBooleanSnapshotEntry: createSnapshotEntry,
    buildTrackingParameterFilterSnapshotEntry: createSnapshotEntry,
    buildStorageEmailListSnapshotEntry: createSnapshotEntry
  });
  const errorLoadResult = await errorController.loadPipelineSettings();
  const actual = {
    successLoadResult: successLoadResult,
    successSettingsAfterLoad: successSettingsAfterLoad,
    successSnapshotSourceAfterLoad: successSnapshotSourceAfterLoad,
    successSnapshotLoadedAtAfterLoad: successSnapshotLoadedAtAfterLoad,
    successSnapshotHasSenderList: successSnapshotHasSenderList,
    updateResult: updateResult,
    ignoredUpdateResult: ignoredUpdateResult,
    successSettingsAfterChange: {
      stripKnownTrackingParameters: extensionSettings.stripKnownTrackingParameters,
      replaceEmailBodyWithMirrorContent: extensionSettings.replaceEmailBodyWithMirrorContent,
      allowHelperOpenWithoutDetectedEmailBody: extensionSettings.allowHelperOpenWithoutDetectedEmailBody,
      autoApplyMirrorOnMobileDevice: extensionSettings.autoApplyMirrorOnMobileDevice,
      autoApplyMirrorSenderEmailList: extensionSettings.autoApplyMirrorSenderEmailList.slice()
    },
    successSnapshotSourceAfterChange: extensionStorageSnapshot.source,
    syncCalls: syncCalls.slice(),
    autoReplaceStateCalls: autoReplaceStateCalls.slice(),
    unavailableSnapshotSource: unavailableExtensionStorageSnapshot.source,
    unavailableSnapshotLoadedAt: unavailableExtensionStorageSnapshot.loadedAt,
    unavailableLoadResult: unavailableLoadResult,
    errorSnapshotSource: errorExtensionStorageSnapshot.source,
    errorSnapshotLoadedAt: errorExtensionStorageSnapshot.loadedAt,
    errorSnapshotMessage: errorExtensionStorageSnapshot.loadError,
    errorLoadResult: errorLoadResult,
    debugEventCount: debugEvents.length
  };
  const failures = [];

  if (
    !actual.successLoadResult ||
    actual.successLoadResult.enableUrlNormalizationRepair !== true ||
    actual.successLoadResult.stripKnownTrackingParameters !== false
  ) {
    failures.push("Expected content settings storage load to return the effective pipeline settings after applying stored values.");
  }

  if (
    actual.successSettingsAfterLoad.enableUrlNormalizationRepair !== true ||
    actual.successSettingsAfterLoad.stripKnownTrackingParameters !== false ||
    !arrayEquals(actual.successSettingsAfterLoad.trackingParameterFilters, ["utm_medium", "utm_campaign"]) ||
    actual.successSettingsAfterLoad.replaceEmailBodyWithMirrorContent !== true ||
    actual.successSettingsAfterLoad.allowHelperOpenWithoutDetectedEmailBody !== true ||
    actual.successSettingsAfterLoad.autoApplyMirrorOnMobileDevice !== true ||
    actual.successSettingsAfterLoad.autoApplyMirrorForConfiguredSenders !== true ||
    !arrayEquals(actual.successSettingsAfterLoad.autoApplyMirrorSenderEmailList, ["alerts@example.com"])
  ) {
    failures.push("Expected content settings storage load to apply all stored pipeline and sender settings.");
  }

  if (actual.successSnapshotSourceAfterLoad !== "storage.local" || actual.successSnapshotLoadedAtAfterLoad !== 1234) {
    failures.push("Expected content settings storage load to stamp the storage snapshot source and timestamp.");
  }

  if (!actual.successSnapshotHasSenderList) {
    failures.push("Expected content settings storage load to populate sender-list snapshot metadata.");
  }

  if (actual.updateResult !== true || actual.ignoredUpdateResult !== false) {
    failures.push("Expected content settings storage handlePipelineStorageChange to report whether it applied local changes.");
  }

  if (
    actual.successSettingsAfterChange.stripKnownTrackingParameters !== true ||
    actual.successSettingsAfterChange.replaceEmailBodyWithMirrorContent !== false ||
    actual.successSettingsAfterChange.allowHelperOpenWithoutDetectedEmailBody !== false ||
    actual.successSettingsAfterChange.autoApplyMirrorOnMobileDevice !== false ||
    !arrayEquals(actual.successSettingsAfterChange.autoApplyMirrorSenderEmailList, ["news@example.com"])
  ) {
    failures.push("Expected content settings storage handlePipelineStorageChange to apply incoming local changes.");
  }

  if (actual.successSnapshotSourceAfterChange !== "storage.onChanged") {
    failures.push("Expected content settings storage to mark the snapshot source as storage.onChanged after local updates.");
  }

  if (!arrayEquals(actual.syncCalls, [{ forcePublish: true }])) {
    failures.push("Expected content settings storage to force a snapshot publish after applicable local storage changes.");
  }

  if (!arrayEquals(actual.autoReplaceStateCalls, ["bool:true", "list:[\"alerts@example.com\"]", "list:[\"news@example.com\"]"])) {
    failures.push("Expected content settings storage to route sender-related settings through the auto-replace state compiler.");
  }

  if (actual.unavailableSnapshotSource !== "storage-unavailable" || actual.unavailableSnapshotLoadedAt !== 4321) {
    failures.push("Expected content settings storage to mark storage-unavailable when storage.local.get is missing.");
  }

  if (!actual.unavailableLoadResult || actual.unavailableLoadResult.enableUrlNormalizationRepair !== false) {
    failures.push("Expected content settings storage to return current pipeline settings on the storage-unavailable path.");
  }

  if (actual.errorSnapshotSource !== "storage-error" || actual.errorSnapshotLoadedAt !== 5678 || actual.errorSnapshotMessage !== "boom") {
    failures.push("Expected content settings storage to record storage-error metadata when the async read throws.");
  }

  if (!actual.errorLoadResult || actual.errorLoadResult.enableUrlNormalizationRepair !== false) {
    failures.push("Expected content settings storage to return current pipeline settings on the storage-error path.");
  }

  if (actual.debugEventCount <= 0) {
    failures.push("Expected content settings storage to emit debug events on load and storage-change paths.");
  }

  return {
    id: "module-content-settings-storage",
    title: "Content settings storage module applies stored settings, snapshots sources, and forces republish on updates",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      successSnapshotSourceAfterLoad: "storage.local",
      successSnapshotLoadedAtAfterLoad: 1234,
      successSettingsAfterLoad: {
        enableUrlNormalizationRepair: true,
        stripKnownTrackingParameters: false,
        trackingParameterFilters: ["utm_medium", "utm_campaign"],
        replaceEmailBodyWithMirrorContent: true,
        allowHelperOpenWithoutDetectedEmailBody: true,
        autoApplyMirrorOnMobileDevice: true,
        autoApplyMirrorForConfiguredSenders: true,
        autoApplyMirrorSenderEmailList: ["alerts@example.com"]
      },
      successSnapshotSourceAfterChange: "storage.onChanged",
      syncCalls: [{ forcePublish: true }],
      unavailableSnapshotSource: "storage-unavailable",
      errorSnapshotSource: "storage-error"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

async function runContentRuntimeLifecycleRegression() {
  const documentListeners = [];
  const windowListeners = [];
  const runtimeListeners = [];
  const storageListeners = [];
  const debugMessages = [];
  const scheduleCalls = [];
  const syncCalls = [];
  const openCalls = [];
  const toggleCalls = [];
  const rewriteCalls = [];
  const loadCalls = [];
  const storageChangeCalls = [];
  const resizeCalls = [];
  const historyCalls = [];
  const observerInstances = [];
  const intervalCalls = [];
  let latestSnapshot = null;

  function createListenerRecorder(targetCollection) {
    return function addEventListener(eventName, listener, useCapture) {
      targetCollection.push({
        eventName: eventName,
        listener: listener,
        useCapture: useCapture === true
      });
    };
  }

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observedTarget = null;
      this.observedOptions = null;
      observerInstances.push(this);
    }

    observe(target, options) {
      this.observedTarget = target;
      this.observedOptions = options;
    }
  }

  const documentObject = {
    documentElement: { nodeName: "HTML" },
    addEventListener: createListenerRecorder(documentListeners)
  };
  const windowObject = {
    addEventListener: createListenerRecorder(windowListeners),
    setInterval: function setInterval(callback, delayMs) {
      intervalCalls.push({
        callback: callback,
        delayMs: delayMs
      });
      return intervalCalls.length;
    },
    history: {
      pushState: function pushState() {
        historyCalls.push("pushState");
        return "pushState-result";
      },
      replaceState: function replaceState() {
        historyCalls.push("replaceState");
        return "replaceState-result";
      }
    }
  };
  const controller = contentRuntimeLifecycle.create({
    windowObject: windowObject,
    documentObject: documentObject,
    extensionApi: {
      runtime: {
        onMessage: {
          addListener: function addRuntimeListener(listener) {
            runtimeListeners.push(listener);
          }
        }
      },
      storage: {
        onChanged: {
          addListener: function addStorageListener(listener) {
            storageListeners.push(listener);
          }
        }
      }
    },
    debugApi: {
      messaging: function messaging(message, payload) {
        debugMessages.push("messaging:" + message + ":" + JSON.stringify(payload || {}));
      }
    },
    mutationObserverClass: FakeMutationObserver,
    scheduleSnapshotSync: function scheduleSnapshotSync() {
      scheduleCalls.push("schedule");
      return scheduleCalls.length;
    },
    syncEmailSnapshot: function syncEmailSnapshot() {
      syncCalls.push("sync");
      latestSnapshot = { id: "synced" };
      return true;
    },
    togglePaneVisibility: function togglePaneVisibility() {
      toggleCalls.push("toggle");
      return {
        ok: true,
        visible: true
      };
    },
    openPaneVisibility: function openPaneVisibility() {
      openCalls.push("open");
      return {
        ok: true,
        hasSnapshot: !!latestSnapshot,
        visible: true,
        expanded: true
      };
    },
    shouldAllowOpenWithoutSnapshot: function shouldAllowOpenWithoutSnapshot() {
      return true;
    },
    applyRewriteToEmailBody: async function applyRewriteToEmailBody() {
      rewriteCalls.push("rewrite");
      return {
        ok: true,
        applied: true
      };
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return latestSnapshot;
    },
    loadPipelineSettings: async function loadPipelineSettings() {
      loadCalls.push("load");
      return {
        loaded: true
      };
    },
    handlePipelineStorageChange: function handlePipelineStorageChange(changes, areaName) {
      storageChangeCalls.push({
        areaName: areaName,
        keyCount: changes ? Object.keys(changes).length : 0
      });
      return true;
    },
    syncPageViewportReservation: function syncPageViewportReservation() {
      resizeCalls.push("resize");
    }
  });
  const getSnapshotResponse = await controller.handleRuntimeMessage({
    type: "merged-link-lab:get-email-snapshot"
  });

  latestSnapshot = { id: "existing" };
  const toggleResponse = await controller.handleRuntimeMessage({
    type: "merged-link-lab:toggle-page-pane"
  });
  latestSnapshot = null;
  const openResponse = await controller.handleRuntimeMessage({
    type: "merged-link-lab:open-page-pane"
  });
  const rewriteResponse = await controller.handleRuntimeMessage({
    type: "merged-link-lab:apply-rewritten-email"
  });
  const unknownResponse = controller.handleRuntimeMessage({
    type: "merged-link-lab:unknown"
  });
  const initializeResult = await controller.initialize();
  const secondInitializeResult = await controller.initialize();
  const registeredWindowEvents = windowListeners.map(function mapWindowEvent(listenerDefinition) {
    return listenerDefinition.eventName;
  }).sort();
  const registeredDocumentEvents = documentListeners.map(function mapDocumentEvent(listenerDefinition) {
    return listenerDefinition.eventName;
  }).sort();
  const snapshotAfterInitialize = latestSnapshot;
  latestSnapshot = null;
  const scheduleCountBeforePolling = scheduleCalls.length;

  if (intervalCalls[0]) {
    intervalCalls[0].callback();
  }

  const scheduleCountAfterPollingWithoutSnapshot = scheduleCalls.length;
  latestSnapshot = snapshotAfterInitialize;

  if (intervalCalls[0]) {
    intervalCalls[0].callback();
  }

  const scheduleCountAfterPollingWithSnapshot = scheduleCalls.length;

  if (runtimeListeners[0]) {
    await runtimeListeners[0]({ type: "merged-link-lab:get-email-snapshot" });
  }

  if (storageListeners[0]) {
    storageListeners[0]({ sample: { newValue: true } }, "local");
  }

  windowObject.history.pushState();
  windowObject.history.replaceState();

  windowListeners.forEach(function invokeWindowListener(listenerDefinition) {
    if (listenerDefinition.eventName === "focus" || listenerDefinition.eventName === "load") {
      listenerDefinition.listener();
    }

    if (listenerDefinition.eventName === "resize") {
      listenerDefinition.listener();
    }
  });

  documentListeners.forEach(function invokeDocumentListener(listenerDefinition) {
    if (listenerDefinition.eventName === "visibilitychange") {
      listenerDefinition.listener();
    }
  });

  if (observerInstances[0]) {
    observerInstances[0].callback();
  }

  const actual = {
    getSnapshotResponse: getSnapshotResponse,
    toggleResponse: toggleResponse,
    openResponse: openResponse,
    rewriteResponse: rewriteResponse,
    unknownResponse: unknownResponse,
    initializeResult: initializeResult,
    secondInitializeResult: secondInitializeResult,
    runtimeListenerCount: runtimeListeners.length,
    storageListenerCount: storageListeners.length,
    registeredWindowEvents: registeredWindowEvents,
    registeredDocumentEvents: registeredDocumentEvents,
    historyCalls: historyCalls.slice(),
    observerCount: observerInstances.length,
    observerObservedTarget: observerInstances[0] ? observerInstances[0].observedTarget : null,
    observerObservedOptions: observerInstances[0] ? observerInstances[0].observedOptions : null,
    intervalCalls: intervalCalls.map(function mapIntervalCall(intervalCall) {
      return intervalCall.delayMs;
    }),
    snapshotRetryPollingInstalled: initializeResult && initializeResult.snapshotRetryPollingInstalled === true,
    scheduleCountBeforePolling: scheduleCountBeforePolling,
    scheduleCountAfterPollingWithoutSnapshot: scheduleCountAfterPollingWithoutSnapshot,
    scheduleCountAfterPollingWithSnapshot: scheduleCountAfterPollingWithSnapshot,
    loadCallCount: loadCalls.length,
    storageChangeCalls: storageChangeCalls.slice(),
    resizeCallCount: resizeCalls.length,
    scheduleCallCount: scheduleCalls.length,
    syncCallCount: syncCalls.length,
    openCallCount: openCalls.length,
    toggleCallCount: toggleCalls.length,
    rewriteCallCount: rewriteCalls.length,
    debugMessageCount: debugMessages.length
  };
  const failures = [];

  if (!actual.getSnapshotResponse || !actual.getSnapshotResponse.snapshot || actual.getSnapshotResponse.snapshot.id !== "synced") {
    failures.push("Expected content runtime lifecycle to request a sync before serving the first email snapshot.");
  }

  if (!actual.toggleResponse || actual.toggleResponse.ok !== true || actual.toggleCallCount !== 1) {
    failures.push("Expected content runtime lifecycle to route toggle-page-pane messages through the pane visibility controller.");
  }

  if (
    !actual.openResponse ||
    actual.openResponse.ok !== true ||
    actual.openResponse.visible !== true ||
    actual.openResponse.expanded !== true ||
    actual.openResponse.hasSnapshot !== true ||
    actual.openCallCount !== 1
  ) {
    failures.push("Expected content runtime lifecycle to route open-page-pane messages through the explicit pane open controller.");
  }

  if (!actual.rewriteResponse || actual.rewriteResponse.applied !== true || actual.rewriteCallCount !== 1) {
    failures.push("Expected content runtime lifecycle to route apply-rewritten-email messages through the email rewrite controller.");
  }

  if (actual.unknownResponse !== undefined) {
    failures.push("Expected content runtime lifecycle to ignore unknown runtime message types.");
  }

  if (
    !actual.initializeResult ||
    actual.initializeResult.initialized !== true ||
    actual.initializeResult.alreadyInitialized !== false ||
    actual.initializeResult.historyWrapped !== true ||
    actual.initializeResult.hasObserver !== true ||
    actual.initializeResult.snapshotRetryPollingInstalled !== true
  ) {
    failures.push("Expected content runtime lifecycle initialize to wire observers, history wrapping, snapshot retry polling, and first-load setup.");
  }

  if (
    !actual.secondInitializeResult ||
    actual.secondInitializeResult.alreadyInitialized !== true ||
    actual.runtimeListenerCount !== 1 ||
    actual.storageListenerCount !== 1
  ) {
    failures.push("Expected content runtime lifecycle initialize to be idempotent and avoid duplicate listener registration.");
  }

  if (!arrayEquals(actual.registeredDocumentEvents, ["click", "visibilitychange"])) {
    failures.push("Expected content runtime lifecycle to register the document visibilitychange and click listeners.");
  }

  if (!arrayEquals(actual.registeredWindowEvents, ["focus", "hashchange", "load", "pageshow", "popstate", "resize"])) {
    failures.push("Expected content runtime lifecycle to register the full set of window lifecycle and layout listeners.");
  }

  if (!arrayEquals(actual.historyCalls, ["pushState", "replaceState"])) {
    failures.push("Expected content runtime lifecycle to wrap pushState and replaceState for snapshot resync.");
  }

  if (
    actual.observerCount !== 1 ||
    actual.observerObservedTarget !== documentObject.documentElement ||
    !actual.observerObservedOptions ||
    actual.observerObservedOptions.childList !== true ||
    actual.observerObservedOptions.subtree !== true ||
    actual.observerObservedOptions.attributes !== true ||
    !arrayEquals(actual.observerObservedOptions.attributeFilter, ["class", "style", "hidden", "aria-hidden", "role", "data-message-id"])
  ) {
    failures.push("Expected content runtime lifecycle to observe document mutations and relevant visibility attributes through a MutationObserver.");
  }

  if (!arrayEquals(actual.intervalCalls, [2000]) || !actual.snapshotRetryPollingInstalled) {
    failures.push("Expected content runtime lifecycle to install snapshot retry polling for Gmail-style delayed body detection.");
  }

  if (
    actual.scheduleCountAfterPollingWithoutSnapshot !== actual.scheduleCountBeforePolling + 1 ||
    actual.scheduleCountAfterPollingWithSnapshot !== actual.scheduleCountAfterPollingWithoutSnapshot
  ) {
    failures.push("Expected snapshot retry polling to schedule a sync only while no snapshot is available.");
  }

  if (actual.loadCallCount !== 1 || actual.storageChangeCalls.length !== 1) {
    failures.push("Expected content runtime lifecycle to load settings once and register the storage change bridge.");
  }

  if (actual.resizeCallCount !== 1) {
    failures.push("Expected content runtime lifecycle to route resize events through the pane layout reservation sync.");
  }

  if (actual.scheduleCallCount < 6) {
    failures.push("Expected content runtime lifecycle to schedule snapshot resyncs from initialization, events, history, and mutation callbacks.");
  }

  if (actual.syncCallCount !== 2) {
    failures.push("Expected content runtime lifecycle to sync once for the first snapshot request and once for an explicit open request without a snapshot.");
  }

  if (actual.debugMessageCount <= 0) {
    failures.push("Expected content runtime lifecycle to emit runtime-message debug events.");
  }

  return {
    id: "module-content-runtime-lifecycle",
    title: "Content runtime lifecycle module wires runtime messages, lifecycle listeners, history wrapping, and initial settings load",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      runtimeListenerCount: 1,
      storageListenerCount: 1,
      registeredDocumentEvents: ["click", "visibilitychange"],
      registeredWindowEvents: ["focus", "hashchange", "load", "pageshow", "popstate", "resize"],
      historyCalls: ["pushState", "replaceState"],
      intervalCalls: [2000],
      loadCallCount: 1,
      resizeCallCount: 1,
      syncCallCount: 2,
      openCallCount: 1
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runEmailCandidateDiscoveryRegression() {
  function createFakeElement(options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const attributes = Object.assign({}, optionBag.attributes);
    const matchedSelectors = new Set(Array.isArray(optionBag.matchedSelectors) ? optionBag.matchedSelectors : []);
    const querySelectorResults = Object.assign({}, optionBag.querySelectorResults);
    const querySelectorAllResults = Object.assign({}, optionBag.querySelectorAllResults);
    const containedElements = new Set(Array.isArray(optionBag.containedElements) ? optionBag.containedElements : []);

    return {
      id: String(optionBag.id || ""),
      isConnected: optionBag.isConnected !== false,
      hidden: optionBag.hidden === true,
      isContentEditable: optionBag.isContentEditable === true,
      parentElement: optionBag.parentElement || null,
      innerText: String(optionBag.text || ""),
      textContent: String(optionBag.text || ""),
      getAttribute: function getAttribute(attributeName) {
        return Object.prototype.hasOwnProperty.call(attributes, attributeName) ? attributes[attributeName] : "";
      },
      matches: function matches(selector) {
        return matchedSelectors.has(selector);
      },
      querySelector: function querySelector(selector) {
        if (Object.prototype.hasOwnProperty.call(querySelectorResults, selector)) {
          return querySelectorResults[selector];
        }

        const matchedElements = Object.prototype.hasOwnProperty.call(querySelectorAllResults, selector)
          ? querySelectorAllResults[selector]
          : [];
        return matchedElements.length ? matchedElements[0] : null;
      },
      querySelectorAll: function querySelectorAll(selector) {
        return Object.prototype.hasOwnProperty.call(querySelectorAllResults, selector)
          ? querySelectorAllResults[selector].slice()
          : [];
      },
      getBoundingClientRect: function getBoundingClientRect() {
        return {
          width: Number(optionBag.width || 0),
          height: Number(optionBag.height || 0),
          top: Number(optionBag.top || 0)
        };
      },
      closest: function closest(selector) {
        if (selector === "#merged-link-lab-page-pane" && optionBag.isLabPaneDescendant) {
          return {};
        }

        return null;
      },
      contains: function contains(element) {
        return containedElements.has(element);
      }
    };
  }

  const explicitSelector = "[data-message-body='true']";
  const primarySelector = ".gmail-primary-body";
  const secondarySelector = ".gmail-secondary-body";
  const fakeDocumentBodyChildren = [];
  const gmailReadContainer = createFakeElement({
    id: "gmail-read-container",
    attributes: {
      class: "adn ads",
      "data-message-id": "msg-f:primary"
    }
  });
  const primaryCandidate = createFakeElement({
    id: "primary-root",
    parentElement: gmailReadContainer,
    text:
      "From: Alerts Team\n" +
      "Subject: Action requested for your account review\n" +
      "Please review https://example.com/report immediately and confirm the updated status before tomorrow morning.",
    width: 640,
    height: 320,
    top: 260,
    matchedSelectors: [explicitSelector],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const secondaryCandidate = createFakeElement({
    id: "secondary-root",
    parentElement: gmailReadContainer,
    text:
      "From: Newsletters Team\n" +
      "Subject: Secondary summary for this inbox item\n" +
      "Visit https://example.com/secondary for more details about the campaign summary and subscriber results.",
    width: 440,
    height: 180,
    top: 540,
    matchedSelectors: [explicitSelector],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const searchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      if (selector === primarySelector) {
        return [primaryCandidate];
      }

      if (selector === secondarySelector) {
        return [secondaryCandidate];
      }

      return [];
    }
  };
  const candidateDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox/FMfcgzQZXexample"
      }
    },
    documentObject: {
      title: "Inbox",
      contentType: "text/html",
      body: {
        children: fakeDocumentBodyChildren
      }
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [searchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [secondarySelector],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [explicitSelector],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [primarySelector];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    },
    inboxCandidateMissingGraceMs: 4000,
    outlookCandidateMissingGraceMs: 12000,
    protonCandidateMissingGraceMs: 12000
  });
  const candidates = candidateDiscovery.getInboxRootCandidates();
  const primaryCandidateSelection = candidateDiscovery.choosePrimaryEmailCandidate(candidates);
  const primaryInboxRoot = candidateDiscovery.choosePrimaryInboxRoot(candidates);
  const healthyInboxDetectionFailure = candidateDiscovery.getInboxDetectionFailure(candidates);
  const providerMismatchDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      location: {
        hostname: "app.hey.com",
        pathname: "/inbox",
        search: ""
      }
    },
    documentObject: {
      title: "HEY inbox"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [searchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText() {
      return {
        text: "",
        lines: 0,
        words: 0
      };
    },
    inboxHostPattern: /app\.hey\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "hey",
        title: "HEY",
        hostPattern: /app\.hey\.com$/i,
        pathPattern: /^\/topics(?:\/|$)/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const selectorEmptySearchRoot = {
    querySelectorAll: function querySelectorAll() {
      return [];
    }
  };
  const selectorEmptyDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox/FMfcgzQZXselector"
      }
    },
    documentObject: {
      title: "Gmail"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [selectorEmptySearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText() {
      return {
        text: "",
        lines: 0,
        words: 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [secondarySelector],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [explicitSelector],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [primarySelector];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const selectorHitElement = {
    matches: function matches(selector) {
      return selector === primarySelector;
    }
  };
  const selectorHitSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === primarySelector ? [selectorHitElement] : [];
    }
  };
  const candidateEmptyDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox/FMfcgzQZXcandidate"
      }
    },
    documentObject: {
      title: "Gmail"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [selectorHitSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText() {
      return {
        text: "",
        lines: 0,
        words: 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [secondarySelector],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [explicitSelector],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [primarySelector];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const providerMismatchFailure = providerMismatchDiscovery.getInboxDetectionFailure([]);
  const selectorEmptyFailure = selectorEmptyDiscovery.getInboxDetectionFailure([]);
  const candidateEmptyFailure = candidateEmptyDiscovery.getInboxDetectionFailure([]);
  const shortExplicitCandidate = createFakeElement({
    id: "short-gmail-root",
    attributes: {
      class: "maincontent"
    },
    text: "Short Gmail note\nOpen https://example.com/quick-review today.",
    width: 360,
    height: 70,
    top: 180,
    matchedSelectors: [".gmail-short-body"],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const shortExplicitSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === ".gmail-short-body" ? [shortExplicitCandidate] : [];
    }
  };
  const shortExplicitDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/1/",
        search: "?view=lg"
      }
    },
    documentObject: {
      title: "Gmail full message"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [shortExplicitSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".gmail-short-body"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".gmail-short-body"];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const shortExplicitCandidates = shortExplicitDiscovery.getInboxRootCandidates();
  const gmailFalsePositiveCandidate = createFakeElement({
    id: "gmail-false-positive-root",
    text:
      "From: Alerts Team\n" +
      "Subject: Inbox list preview that should not open the helper bubble\n" +
      "Review https://example.com/list-preview for more details in the message list.",
    width: 640,
    height: 220,
    top: 180,
    matchedSelectors: [".a3s.aiL"],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const gmailMarkedContainer = createFakeElement({
    id: "gmail-marked-container",
    parentElement: createFakeElement({
      id: "gmail-tabpanel-container",
      attributes: {
        role: "tabpanel"
      }
    }),
    attributes: {
      class: "adn ads",
      "data-message-id": "msg-f:123"
    }
  });
  const gmailRowContainer = createFakeElement({
    id: "gmail-row-container",
    attributes: {
      class: "zA",
      role: "row"
    }
  });
  const gmailMarkedRowContainer = createFakeElement({
    id: "gmail-marked-row-container",
    parentElement: gmailRowContainer,
    attributes: {
      class: "adn ads",
      "data-message-id": "msg-f:row"
    }
  });
  const gmailLegitimateCandidate = createFakeElement({
    id: "gmail-legitimate-root",
    parentElement: gmailMarkedContainer,
    text:
      "From: Alerts Team\n" +
      "Subject: Opened message that should be detected\n" +
      "Review https://example.com/opened-message and confirm the updated account state today.",
    width: 640,
    height: 220,
    top: 180,
    matchedSelectors: [".a3s.aiL"],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const gmailEmbeddedReplyTextbox = createFakeElement({
    id: "gmail-embedded-reply-textbox",
    attributes: {
      role: "textbox"
    }
  });
  const gmailEmbeddedReplyCandidate = createFakeElement({
    id: "gmail-embedded-reply-root",
    parentElement: gmailMarkedContainer,
    text:
      "From: Alerts Team\n" +
      "Subject: Opened message with embedded reply editor\n" +
      "Review https://example.com/opened-message and confirm the updated account state today.",
    width: 640,
    height: 220,
    top: 180,
    matchedSelectors: [".a3s.aiL"],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {},
      "[contenteditable='true'], textarea, [role='textbox']": gmailEmbeddedReplyTextbox
    }
  });
  const gmailRowFalsePositiveCandidate = createFakeElement({
    id: "gmail-row-false-positive-root",
    parentElement: gmailMarkedRowContainer,
    text:
      "From: Alerts Team\n" +
      "Subject: Row content should not be treated as an opened Gmail body\n" +
      "Review https://example.com/row-preview before expanding the thread.",
    width: 640,
    height: 220,
    top: 180,
    matchedSelectors: [".a3s.aiL"],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const gmailFalsePositiveSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === ".a3s.aiL" ? [gmailFalsePositiveCandidate] : [];
    }
  };
  const gmailLegitimateSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === ".a3s.aiL" ? [gmailLegitimateCandidate] : [];
    }
  };
  const gmailEmbeddedReplySearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === ".a3s.aiL" ? [gmailEmbeddedReplyCandidate] : [];
    }
  };
  const gmailRowFalsePositiveSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === ".a3s.aiL" ? [gmailRowFalsePositiveCandidate] : [];
    }
  };
  const gmailFalsePositiveDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox"
      }
    },
    documentObject: {
      title: "Gmail inbox"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailFalsePositiveSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".a3s.aiL"];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailLegitimateDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox/FMfcgzQZXopened"
      }
    },
    documentObject: {
      title: "Gmail opened message"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailLegitimateSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".a3s.aiL"];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailPreviewPaneDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox"
      }
    },
    documentObject: {
      title: "Gmail preview pane"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailLegitimateSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [".a3s.aiL"],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailEmbeddedReplyDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox/FMfcgzQZXreply"
      }
    },
    documentObject: {
      title: "Gmail opened message with reply box"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailEmbeddedReplySearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".a3s.aiL"];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailHiddenLegitimateCandidate = createFakeElement({
    id: "gmail-hidden-legitimate-root",
    parentElement: gmailMarkedContainer,
    hidden: true,
    text:
      "From: Hidden Alerts Team\n" +
      "Subject: Hidden message body\n" +
      "Visit https://example.com/hidden immediately for the body content.",
    width: 640,
    height: 320,
    top: 220,
    matchedSelectors: [".a3s.aiL"],
    querySelectorResults: {
      "a, p, br, blockquote, table, li, img": {}
    }
  });
  const gmailHiddenLegitimateSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === ".a3s.aiL" ? [gmailHiddenLegitimateCandidate] : [];
    }
  };
  const gmailHiddenClientDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox"
      }
    },
    documentObject: {
      title: "Gmail inbox"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailHiddenLegitimateSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [".a3s.aiL"],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailGenericClientContainer = createFakeElement({
    id: "gmail-generic-client-container",
    attributes: {
      role: "main",
      class: "gmail-shell"
    },
    text:
      "Primary\n" +
      "GitHub Sudo email verification code Apr 8 Please verify your identity.\n" +
      "Security alert Apr 7 A new sign-in on Android.",
    width: 1280,
    height: 760,
    top: 40,
    querySelectorResults: {
      ".a3s.aiL": { id: "hidden-descendant-marker" }
    }
  });
  const gmailGenericClientSearchRoot = {
    querySelectorAll: function querySelectorAll(selector) {
      return selector === "[role='main']" ? [gmailGenericClientContainer] : [];
    }
  };
  const gmailGenericClientDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox"
      }
    },
    documentObject: {
      title: "Gmail inbox"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailGenericClientSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [".a3s.aiL", "[role='main']"],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: ["[role='main']"],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i,
        primaryInboxBodySelectors: [
          "div.maincontent",
          "div.AO div.adn.ads[data-message-id] .a3s.aiL",
          "div.AO div[data-message-id].adn.ads .a3s.aiL",
          "[data-message-id] .a3s.aiL",
          ".a3s.aiL"
        ]
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailMarkedClientDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox"
      }
    },
    documentObject: {
      title: "Gmail inbox"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailLegitimateSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".a3s.aiL"];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailRowFalsePositiveDiscovery = emailCandidateDiscovery.create({
    windowObject: {
      innerHeight: 1000,
      location: {
        hostname: "mail.google.com",
        pathname: "/mail/u/0/",
        search: "",
        hash: "#inbox/FMfcgzQZXopened"
      }
    },
    documentObject: {
      title: "Gmail inbox"
    },
    cleanInputText: function cleanInputText(value) {
      return String(value || "").trim();
    },
    getDetectionSearchRoots: function getDetectionSearchRoots() {
      return [gmailRowFalsePositiveSearchRoot];
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return element || null;
    },
    measureElementText: function measureElementText(element) {
      const textValue = String(element && (element.innerText || element.textContent) || "").trim();
      return {
        text: textValue,
        lines: textValue ? textValue.split("\n").filter(Boolean).length : 0,
        words: textValue ? textValue.split(/\s+/).filter(Boolean).length : 0
      };
    },
    inboxHostPattern: /mail\.google\.com$/i,
    readViewHintPattern: /message body|email body/i,
    composeContextHintPattern: /compose/i,
    standaloneEmailHintPattern: /eml|message\/rfc822/i,
    outlookMailBodySelector: ".outlook-message-body",
    inboxBodySelectors: [],
    standaloneEmailBodySelectors: [],
    genericInboxContainerSelectors: [],
    explicitInboxBodySelectors: [".a3s.aiL"],
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return [".a3s.aiL"];
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return "gmail";
    },
    listProviderDefinitions: function listProviderDefinitions() {
      return [{
        id: "gmail",
        title: "Gmail",
        hostPattern: /mail\.google\.com$/i
      }];
    },
    isOutlookHost: function isOutlookHost() {
      return false;
    },
    isProtonHost: function isProtonHost() {
      return false;
    }
  });
  const gmailFalsePositiveCandidates = gmailFalsePositiveDiscovery.getInboxRootCandidates();
  const gmailLegitimateCandidates = gmailLegitimateDiscovery.getInboxRootCandidates();
  const gmailPreviewPaneCandidates = gmailPreviewPaneDiscovery.getInboxRootCandidates();
  const gmailEmbeddedReplyCandidates = gmailEmbeddedReplyDiscovery.getInboxRootCandidates();
  const gmailHiddenClientCandidates = gmailHiddenClientDiscovery.getInboxRootCandidates();
  const gmailGenericClientCandidates = gmailGenericClientDiscovery.getInboxRootCandidates();
  const gmailMarkedClientCandidates = gmailMarkedClientDiscovery.getInboxRootCandidates();
  const gmailRowFalsePositiveCandidates = gmailRowFalsePositiveDiscovery.getInboxRootCandidates();
  const gmailMarkedClientFailure = gmailMarkedClientDiscovery.getInboxDetectionFailure(gmailMarkedClientCandidates);
  const actual = {
    graceWindow: candidateDiscovery.getCandidateMissingGraceWindow(),
    candidateCount: candidates.length,
    candidateRootIds: candidates.map(function mapCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    candidateModes: candidates.map(function mapCandidateMode(candidate) {
      return candidate && candidate.detectionMode ? candidate.detectionMode : "";
    }),
    primaryCandidateRootId:
      primaryCandidateSelection && primaryCandidateSelection.root && primaryCandidateSelection.root.id
        ? primaryCandidateSelection.root.id
        : "",
    primaryInboxRootId: primaryInboxRoot && primaryInboxRoot.id ? primaryInboxRoot.id : "",
    healthyInboxDetectionFailure: healthyInboxDetectionFailure,
    providerMismatchKind: providerMismatchFailure && providerMismatchFailure.kind ? providerMismatchFailure.kind : "",
    selectorEmptyKind: selectorEmptyFailure && selectorEmptyFailure.kind ? selectorEmptyFailure.kind : "",
    selectorEmptyProviderId: selectorEmptyFailure && selectorEmptyFailure.providerId ? selectorEmptyFailure.providerId : "",
    candidateEmptyKind: candidateEmptyFailure && candidateEmptyFailure.kind ? candidateEmptyFailure.kind : "",
    candidateEmptyMatchedSelectors: candidateEmptyFailure && Array.isArray(candidateEmptyFailure.matchedSelectors)
      ? candidateEmptyFailure.matchedSelectors.slice()
      : [],
    shortExplicitCandidateRootIds: shortExplicitCandidates.map(function mapShortExplicitCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailFalsePositiveCandidateRootIds: gmailFalsePositiveCandidates.map(function mapGmailFalsePositiveCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailLegitimateCandidateRootIds: gmailLegitimateCandidates.map(function mapGmailLegitimateCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailPreviewPaneCandidateRootIds: gmailPreviewPaneCandidates.map(function mapGmailPreviewPaneCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailEmbeddedReplyCandidateRootIds: gmailEmbeddedReplyCandidates.map(function mapGmailEmbeddedReplyCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailHiddenClientCandidateRootIds: gmailHiddenClientCandidates.map(function mapGmailHiddenClientCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailGenericClientCandidateRootIds: gmailGenericClientCandidates.map(function mapGmailGenericClientCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailMarkedClientCandidateRootIds: gmailMarkedClientCandidates.map(function mapGmailMarkedClientCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    gmailMarkedClientFailureKind: gmailMarkedClientFailure && gmailMarkedClientFailure.kind ? gmailMarkedClientFailure.kind : "",
    gmailRowFalsePositiveCandidateRootIds: gmailRowFalsePositiveCandidates.map(function mapGmailRowFalsePositiveCandidateRootId(candidate) {
      return candidate && candidate.root && candidate.root.id ? candidate.root.id : "";
    }),
    shortExplicitFailure: shortExplicitDiscovery.getInboxDetectionFailure(shortExplicitCandidates),
    emptyPrimaryCandidate: candidateDiscovery.choosePrimaryEmailCandidate([]),
    emptyPrimaryInboxRoot: candidateDiscovery.choosePrimaryInboxRoot([])
  };
  const failures = [];

  if (actual.graceWindow !== 4000) {
    failures.push("Expected email candidate discovery to use the inbox grace window on Gmail hosts.");
  }

  if (actual.candidateCount !== 2) {
    failures.push("Expected email candidate discovery to return two inbox root candidates from the fake Gmail DOM.");
  }

  if (!arrayEquals(actual.candidateRootIds, ["primary-root", "secondary-root"])) {
    failures.push("Expected email candidate discovery to score the primary selector candidate ahead of the secondary selector candidate.");
  }

  if (!arrayEquals(actual.candidateModes, ["inbox-read", "inbox-read"])) {
    failures.push("Expected email candidate discovery to tag both fake Gmail candidates as inbox-read.");
  }

  if (actual.primaryCandidateRootId !== "primary-root") {
    failures.push("Expected email candidate discovery to choose the highest-scoring candidate as the primary candidate.");
  }

  if (actual.primaryInboxRootId !== "primary-root") {
    failures.push("Expected email candidate discovery to surface the highest-scoring candidate root as the primary inbox root.");
  }

  if (actual.healthyInboxDetectionFailure !== null) {
    failures.push("Expected email candidate discovery to report no inbox detection failure when candidates are available.");
  }

  if (actual.providerMismatchKind !== "provider-path-mismatch") {
    failures.push("Expected email candidate discovery to report provider path mismatches explicitly.");
  }

  if (actual.selectorEmptyKind !== "selector-empty-match" || actual.selectorEmptyProviderId !== "gmail") {
    failures.push("Expected email candidate discovery to report selector empty-match failures for provider inbox views.");
  }

  if (actual.candidateEmptyKind !== "candidate-empty-match" || !arrayEquals(actual.candidateEmptyMatchedSelectors, [primarySelector])) {
    failures.push("Expected email candidate discovery to report candidate-empty failures when provider selectors hit but no candidate survives scoring.");
  }

  if (!arrayEquals(actual.shortExplicitCandidateRootIds, ["short-gmail-root"]) || actual.shortExplicitFailure !== null) {
    failures.push("Expected email candidate discovery to retain a short Gmail full-message body when it already matches an explicit provider body selector.");
  }

  if (!arrayEquals(actual.gmailFalsePositiveCandidateRootIds, [])) {
    failures.push("Expected email candidate discovery to reject Gmail inbox false positives that lack read-view markers.");
  }

  if (!arrayEquals(actual.gmailLegitimateCandidateRootIds, ["gmail-legitimate-root"])) {
    failures.push("Expected email candidate discovery to keep Gmail message bodies that include read-view markers.");
  }

  if (!arrayEquals(actual.gmailPreviewPaneCandidateRootIds, ["gmail-legitimate-root"])) {
    failures.push("Expected email candidate discovery to keep a visible Gmail preview-pane message body even when Gmail keeps the hash at #inbox.");
  }

  if (!arrayEquals(actual.gmailEmbeddedReplyCandidateRootIds, ["gmail-embedded-reply-root"])) {
    failures.push("Expected email candidate discovery to keep a Gmail message body when the same body container also includes an embedded reply textbox.");
  }

  if (!arrayEquals(actual.gmailHiddenClientCandidateRootIds, [])) {
    failures.push("Expected email candidate discovery to ignore hidden Gmail message roots so stale client-view DOM cannot keep the helper bubble visible.");
  }

  if (!arrayEquals(actual.gmailGenericClientCandidateRootIds, [])) {
    failures.push("Expected email candidate discovery to ignore generic Gmail inbox containers on #inbox and only trust explicit Gmail body selectors.");
  }

  if (!arrayEquals(actual.gmailMarkedClientCandidateRootIds, ["gmail-legitimate-root"]) || actual.gmailMarkedClientFailureKind !== "") {
    failures.push("Expected email candidate discovery to keep a visible Gmail preview-pane message body even when Gmail keeps the hash at #inbox.");
  }

  if (!arrayEquals(actual.gmailRowFalsePositiveCandidateRootIds, [])) {
    failures.push("Expected email candidate discovery to reject Gmail row-context false positives even inside opened-message hash states.");
  }

  if (actual.emptyPrimaryCandidate !== null) {
    failures.push("Expected email candidate discovery to return null for an empty candidate list.");
  }

  if (actual.emptyPrimaryInboxRoot !== null) {
    failures.push("Expected email candidate discovery to return null for an empty primary inbox root request.");
  }

  return {
    id: "module-email-candidate-discovery",
    title: "Email candidate discovery module scores inbox candidates and chooses a primary root",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      graceWindow: 4000,
      candidateRootIds: ["primary-root", "secondary-root"],
      candidateModes: ["inbox-read", "inbox-read"],
      primaryCandidateRootId: "primary-root",
      primaryInboxRootId: "primary-root",
      providerMismatchKind: "provider-path-mismatch",
      selectorEmptyKind: "selector-empty-match",
      candidateEmptyKind: "candidate-empty-match",
      shortExplicitCandidateRootIds: ["short-gmail-root"],
      gmailFalsePositiveCandidateRootIds: [],
      gmailLegitimateCandidateRootIds: ["gmail-legitimate-root"],
      gmailPreviewPaneCandidateRootIds: ["gmail-legitimate-root"],
      gmailEmbeddedReplyCandidateRootIds: ["gmail-embedded-reply-root"],
      gmailHiddenClientCandidateRootIds: [],
      gmailGenericClientCandidateRootIds: [],
      gmailMarkedClientCandidateRootIds: ["gmail-legitimate-root"],
      gmailMarkedClientFailureKind: "",
      gmailRowFalsePositiveCandidateRootIds: []
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runInboxDetectorRegression() {
  const inboxDetectors = globalThis.urlForensicsInboxDetectors || null;
  const providerDefinitions = inboxDetectorRegistry && typeof inboxDetectorRegistry.listProviderDefinitions === "function"
    ? inboxDetectorRegistry.listProviderDefinitions()
    : [];
  const gmailProviderDefinition = providerDefinitions.find(function findGmailProviderDefinition(providerDefinition) {
    return providerDefinition.id === "gmail";
  }) || null;
  const gmailPrimarySelectors =
    inboxDetectors &&
    inboxDetectors.selectors &&
    inboxDetectors.selectors.primaryInboxBodyByProvider &&
    Array.isArray(inboxDetectors.selectors.primaryInboxBodyByProvider.gmail)
      ? inboxDetectors.selectors.primaryInboxBodyByProvider.gmail.slice()
      : [];
  const inboxBodySelectors =
    inboxDetectors && inboxDetectors.selectors && Array.isArray(inboxDetectors.selectors.inboxBody)
      ? inboxDetectors.selectors.inboxBody.slice()
      : [];
  const standaloneEmailBodySelectors =
    inboxDetectors && inboxDetectors.selectors && Array.isArray(inboxDetectors.selectors.standaloneEmailBody)
      ? inboxDetectors.selectors.standaloneEmailBody.slice()
      : [];
  const gmailInboxLocation = {
    hostname: "mail.google.com",
    pathname: "/mail/u/0/",
    search: "",
    hash: "#inbox"
  };
  const gmailMessageLocation = {
    hostname: "mail.google.com",
    pathname: "/mail/u/0/",
    search: "",
    hash: "#inbox/FMfcgzQbdrVWhsPjvcjBMQhCpcVJgpnB"
  };
  const actual = {
    hasInboxDetectorRegistry: !!inboxDetectorRegistry,
    hasInboxDetectors: !!inboxDetectors,
    providerIds: providerDefinitions.map(function mapProviderId(providerDefinition) {
      return providerDefinition.id;
    }),
    gmailRegistryHasMainContentSelector: !!(
      gmailProviderDefinition &&
      Array.isArray(gmailProviderDefinition.primaryInboxBodySelectors) &&
      gmailProviderDefinition.primaryInboxBodySelectors.indexOf("div.maincontent") !== -1
    ),
    gmailHasMainContentSelector: gmailPrimarySelectors.indexOf("div.maincontent") !== -1,
    inboxHasMainContentSelector: inboxBodySelectors.indexOf("div.maincontent") !== -1,
    standaloneHasMainContentSelector: standaloneEmailBodySelectors.indexOf("div.maincontent") !== -1,
    gmailInboxProviderKey: inboxDetectors && typeof inboxDetectors.getInboxProviderKey === "function"
      ? inboxDetectors.getInboxProviderKey(gmailInboxLocation)
      : "",
    gmailMessageProviderKey: inboxDetectors && typeof inboxDetectors.getInboxProviderKey === "function"
      ? inboxDetectors.getInboxProviderKey(gmailMessageLocation)
      : "",
    gmailInboxPrimarySelectorCount: inboxDetectors && typeof inboxDetectors.getPrimaryInboxBodySelectors === "function"
      ? inboxDetectors.getPrimaryInboxBodySelectors(gmailInboxLocation).length
      : -1,
    gmailMessagePrimarySelectorCount: inboxDetectors && typeof inboxDetectors.getPrimaryInboxBodySelectors === "function"
      ? inboxDetectors.getPrimaryInboxBodySelectors(gmailMessageLocation).length
      : -1
  };
  const failures = [];

  if (!actual.hasInboxDetectorRegistry) {
    failures.push("Expected inbox detector registry to initialize in the smoke runner.");
  }

  if (!actual.hasInboxDetectors) {
    failures.push("Expected inbox detectors to initialize in the smoke runner.");
  }

  if (!arrayEquals(actual.providerIds, ["gmail", "outlook", "yahoo", "proton", "hey", "fastmail"])) {
    failures.push("Expected inbox detector registry provider ids to remain ordered and complete.");
  }

  if (!actual.gmailRegistryHasMainContentSelector) {
    failures.push("Expected Gmail registry selectors to include \"div.maincontent\" for full-message view.");
  }

  if (!actual.gmailHasMainContentSelector) {
    failures.push("Expected Gmail primary inbox selectors to include \"div.maincontent\" for full-message view.");
  }

  if (!actual.inboxHasMainContentSelector) {
    failures.push("Expected shared inbox selectors to include \"div.maincontent\".");
  }

  if (!actual.standaloneHasMainContentSelector) {
    failures.push("Expected standalone email selectors to include \"div.maincontent\".");
  }

  if (actual.gmailInboxProviderKey !== "" || actual.gmailInboxPrimarySelectorCount <= 0) {
    failures.push("Expected Gmail inbox list locations to remain non-read-view routes while still exposing Gmail body selectors for DOM-first preview-pane detection.");
  }

  if (actual.gmailMessageProviderKey !== "gmail" || actual.gmailMessagePrimarySelectorCount <= 0) {
    failures.push("Expected Gmail opened-message locations to resolve as the Gmail provider and expose primary inbox-body selectors.");
  }

  return {
    id: "module-inbox-detectors",
    title: "Inbox detectors include Gmail full-message maincontent selector",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      hasInboxDetectorRegistry: true,
      hasInboxDetectors: true,
      providerIds: ["gmail", "outlook", "yahoo", "proton", "hey", "fastmail"],
      gmailRegistryHasMainContentSelector: true,
      gmailHasMainContentSelector: true,
      inboxHasMainContentSelector: true,
      standaloneHasMainContentSelector: true,
      gmailInboxProviderKey: "",
      gmailMessageProviderKey: "gmail",
      gmailInboxPrimarySelectorCount: gmailPrimarySelectors.length
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runInboxSelectorHealthRegression() {
  const selectorHealthReport = inboxSelectorHealth.buildSelectorHealthReport();

  return {
    id: "module-inbox-selector-health",
    title: "Inbox provider selectors stay healthy against saved HTML fixtures",
    mode: "active",
    status: selectorHealthReport.failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: selectorHealthReport.expected,
    targetExpected: null,
    actual: selectorHealthReport.actual,
    failures: selectorHealthReport.failures
  };
}

function loadGeneratedDiagnosticsHealthData(scriptSource) {
  const sandbox = Object.create(null);

  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;

  vm.runInNewContext(scriptSource, sandbox, {
    filename: generatedDiagnosticsHealthDataPath
  });

  return sandbox.urlForensicsDiagnosticsHealthData || null;
}

function runDiagnosticsHealthDataRegression() {
  const diagnosticsHtml = fs.readFileSync(diagnosticsPageHtmlPath, "utf8");
  const scriptSource = fs.readFileSync(generatedDiagnosticsHealthDataPath, "utf8");
  let generatedSnapshot = null;
  let snapshotReadError = "";

  try {
    generatedSnapshot = loadGeneratedDiagnosticsHealthData(scriptSource);
  } catch (error) {
    snapshotReadError = error && error.message ? error.message : "unknown error";
  }

  const expectedSnapshot = generatedSnapshot
    ? diagnosticsHealthSnapshot.buildDiagnosticsHealthSnapshot({
      generatedAt: generatedSnapshot.generatedAt
    })
    : null;
  const actual = {
    diagnosticsPageLoadsDataScript: diagnosticsHtml.includes('<script src="./diagnostics-health-data.js"></script>'),
    exposesGlobal: !!generatedSnapshot,
    snapshotReadError: snapshotReadError,
    generatedBy: generatedSnapshot ? generatedSnapshot.generatedBy : "",
    detectorParityStatus: generatedSnapshot && generatedSnapshot.detectorParity ? generatedSnapshot.detectorParity.status : "",
    selectorHealthStatus: generatedSnapshot && generatedSnapshot.selectorHealth ? generatedSnapshot.selectorHealth.status : "",
    matchesLiveSnapshot: !!(generatedSnapshot && expectedSnapshot && arrayEquals(generatedSnapshot, expectedSnapshot))
  };
  const failures = [];

  if (!actual.diagnosticsPageLoadsDataScript) {
    failures.push("Expected diagnostics page to load diagnostics-health-data.js.");
  }

  if (actual.snapshotReadError) {
    failures.push(
      "Expected generated diagnostics health data to load without errors, but received " +
      JSON.stringify(actual.snapshotReadError) +
      "."
    );
  } else if (!actual.exposesGlobal) {
    failures.push("Expected generated diagnostics health data to expose urlForensicsDiagnosticsHealthData.");
  } else {
    if (actual.generatedBy !== diagnosticsHealthSnapshot.generatedBy) {
      failures.push(
        "Expected diagnostics health snapshot generatedBy " +
        JSON.stringify(diagnosticsHealthSnapshot.generatedBy) +
        " but received " +
        JSON.stringify(actual.generatedBy) +
        "."
      );
    }

    if (actual.detectorParityStatus !== "passed") {
      failures.push(
        "Expected diagnostics health detector parity status \"passed\" but received " +
        JSON.stringify(actual.detectorParityStatus) +
        "."
      );
    }

    if (actual.selectorHealthStatus !== "passed") {
      failures.push(
        "Expected diagnostics health selector health status \"passed\" but received " +
        JSON.stringify(actual.selectorHealthStatus) +
        "."
      );
    }

    if (!actual.matchesLiveSnapshot) {
      failures.push("Expected generated diagnostics health snapshot to match the live detector parity and selector-health reports.");
    }
  }

  return {
    id: "module-diagnostics-health-data",
    title: "Generated diagnostics health snapshot matches live parity and selector-health reports",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      diagnosticsPageLoadsDataScript: true,
      exposesGlobal: true,
      detectorParityStatus: "passed",
      selectorHealthStatus: "passed",
      matchesLiveSnapshot: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function loadGeneratedSampleReviewData(scriptSource) {
  const sandbox = Object.create(null);

  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;

  vm.runInNewContext(scriptSource, sandbox, {
    filename: generatedSampleReviewDataPath
  });

  return sandbox.urlForensicsSampleReviewData || null;
}

function runSampleReviewDataRegression() {
  const scriptSource = fs.readFileSync(generatedSampleReviewDataPath, "utf8");
  let generatedData = null;
  let readError = "";

  try {
    generatedData = loadGeneratedSampleReviewData(scriptSource);
  } catch (error) {
    readError = error && error.message ? error.message : "unknown error";
  }

  const expectedData = generatedData
    ? sampleReviewData.buildSampleReviewData({
      generatedAt: generatedData.generatedAt
    })
    : null;
  const actual = {
    exposesGlobal: !!generatedData,
    readError: readError,
    generatedBy: generatedData ? generatedData.generatedBy : "",
    sampleCount: generatedData && Array.isArray(generatedData.textSamples) ? generatedData.textSamples.length : 0,
    matchesLiveData: !!(generatedData && expectedData && arrayEquals(generatedData, expectedData))
  };
  const failures = [];

  if (actual.readError) {
    failures.push(
      "Expected generated sample review data to load without errors, but received " +
      JSON.stringify(actual.readError) +
      "."
    );
  } else if (!actual.exposesGlobal) {
    failures.push("Expected generated sample review data to expose urlForensicsSampleReviewData.");
  } else {
    if (actual.generatedBy !== sampleReviewData.generatedBy) {
      failures.push(
        "Expected sample review data generatedBy " +
        JSON.stringify(sampleReviewData.generatedBy) +
        " but received " +
        JSON.stringify(actual.generatedBy) +
        "."
      );
    }

    if (actual.sampleCount !== sampleReviewData.buildSampleReviewData({ generatedAt: generatedData.generatedAt }).textSamples.length) {
      failures.push(
        "Expected generated sample review data to include the committed curated sample count, but received " +
        JSON.stringify(actual.sampleCount) +
        "."
      );
    }

    if (!actual.matchesLiveData) {
      failures.push("Expected generated sample review data to match the live curated detector parity sample set.");
    }
  }

  return {
    id: "module-sample-review-data",
    title: "Generated sample review data matches the curated detector sample set",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      exposesGlobal: true,
      generatedBy: sampleReviewData.generatedBy,
      matchesLiveData: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runEmailLinkRegression() {
  const mailtoAnalysis = pipeline.analyzeInput({
    rawText: "Contact mailbox: mailto:debugger@example.com"
  });
  const bareEmailAnalysis = pipeline.analyzeInput({
    rawText: "Reply mailbox: debugger@example.com"
  });
  const mailtoHtmlAnalysis = pipeline.analyzeInput({
    rawText: "Contact mailbox: mailto:debugger@example.com",
    sourceHtml: '<p>Contact <a href="mailto:debugger@example.com">debugger@example.com</a></p>'
  });
  const bareEmailHtmlAnalysis = pipeline.analyzeInput({
    rawText: "Reply mailbox: debugger@example.com",
    sourceHtml: "<p>Reply mailbox debugger@example.com</p>"
  });
  const firstMailtoItem = mailtoAnalysis.items[0] || null;
  const firstBareEmailItem = bareEmailAnalysis.items[0] || null;
  const firstMailtoHtmlItem = mailtoHtmlAnalysis.items[0] || null;
  const firstBareEmailHtmlItem = bareEmailHtmlAnalysis.items[0] || null;
  const actual = {
    mailtoItemCount: mailtoAnalysis.items.length,
    mailtoFinalUrl: mailtoAnalysis.finalUrls[0] || "",
    mailtoDisplayType: firstMailtoItem ? pipeline.getItemDisplayType(firstMailtoItem) : "",
    bareEmailItemCount: bareEmailAnalysis.items.length,
    bareEmailFinalUrl: bareEmailAnalysis.finalUrls[0] || "",
    bareEmailDisplayType: firstBareEmailItem ? pipeline.getItemDisplayType(firstBareEmailItem) : "",
    mailtoHtmlItemCount: mailtoHtmlAnalysis.items.length,
    mailtoHtmlFinalUrl: mailtoHtmlAnalysis.finalUrls[0] || "",
    mailtoHtmlDisplayType: firstMailtoHtmlItem ? pipeline.getItemDisplayType(firstMailtoHtmlItem) : "",
    bareEmailHtmlItemCount: bareEmailHtmlAnalysis.items.length,
    bareEmailHtmlFinalUrl: bareEmailHtmlAnalysis.finalUrls[0] || "",
    bareEmailHtmlDisplayType: firstBareEmailHtmlItem ? pipeline.getItemDisplayType(firstBareEmailHtmlItem) : ""
  };
  const failures = [];

  if (actual.mailtoItemCount !== 1) {
    failures.push("Expected one detected mailto item but received " + JSON.stringify(actual.mailtoItemCount) + ".");
  }

  if (actual.mailtoFinalUrl !== "mailto:debugger@example.com") {
    failures.push("Expected mailto final URL to remain mailto:debugger@example.com but received " + JSON.stringify(actual.mailtoFinalUrl) + ".");
  }

  if (actual.mailtoDisplayType !== "email") {
    failures.push("Expected mailto display type \"email\" but received " + JSON.stringify(actual.mailtoDisplayType) + ".");
  }

  if (actual.bareEmailItemCount !== 1) {
    failures.push("Expected one detected bare email item but received " + JSON.stringify(actual.bareEmailItemCount) + ".");
  }

  if (actual.bareEmailFinalUrl !== "mailto:debugger@example.com") {
    failures.push("Expected bare email final URL to normalize to mailto:debugger@example.com but received " + JSON.stringify(actual.bareEmailFinalUrl) + ".");
  }

  if (actual.bareEmailDisplayType !== "email") {
    failures.push("Expected bare email display type \"email\" but received " + JSON.stringify(actual.bareEmailDisplayType) + ".");
  }

  if (actual.mailtoHtmlItemCount !== 1) {
    failures.push("Expected one detected HTML mailto item but received " + JSON.stringify(actual.mailtoHtmlItemCount) + ".");
  }

  if (actual.mailtoHtmlFinalUrl !== "mailto:debugger@example.com") {
    failures.push("Expected HTML mailto final URL to remain mailto:debugger@example.com but received " + JSON.stringify(actual.mailtoHtmlFinalUrl) + ".");
  }

  if (actual.mailtoHtmlDisplayType !== "email") {
    failures.push("Expected HTML mailto display type \"email\" but received " + JSON.stringify(actual.mailtoHtmlDisplayType) + ".");
  }

  if (actual.bareEmailHtmlItemCount !== 1) {
    failures.push("Expected one detected HTML bare email item but received " + JSON.stringify(actual.bareEmailHtmlItemCount) + ".");
  }

  if (actual.bareEmailHtmlFinalUrl !== "mailto:debugger@example.com") {
    failures.push("Expected HTML bare email final URL to normalize to mailto:debugger@example.com but received " + JSON.stringify(actual.bareEmailHtmlFinalUrl) + ".");
  }

  if (actual.bareEmailHtmlDisplayType !== "email") {
    failures.push("Expected HTML bare email display type \"email\" but received " + JSON.stringify(actual.bareEmailHtmlDisplayType) + ".");
  }

  return {
    id: "module-email-links",
    title: "Email links classify mailto and bare addresses consistently",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      mailtoItemCount: 1,
      mailtoFinalUrl: "mailto:debugger@example.com",
      mailtoDisplayType: "email",
      bareEmailItemCount: 1,
      bareEmailFinalUrl: "mailto:debugger@example.com",
      bareEmailDisplayType: "email",
      mailtoHtmlItemCount: 1,
      mailtoHtmlFinalUrl: "mailto:debugger@example.com",
      mailtoHtmlDisplayType: "email",
      bareEmailHtmlItemCount: 1,
      bareEmailHtmlFinalUrl: "mailto:debugger@example.com",
      bareEmailHtmlDisplayType: "email"
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runStageRunnerRegression() {
  const observedHookCalls = [];
  const runner = pipelineStageRunner.create({
    beforeStageHooks: [
      function onBeforeStage(details) {
        observedHookCalls.push("before:" + details.stageId);
      }
    ],
    afterStageHooks: [
      function onAfterStage(details) {
        observedHookCalls.push("after:" + details.stageId);
      }
    ],
    errorStageHooks: [
      function onErrorStage(details) {
        observedHookCalls.push("error:" + details.stageId);
      }
    ]
  });
  const execution = runner.runStages({
    pipelineErrors: [],
    value: 1
  }, [
    {
      id: "alpha",
      errorLabel: "stageAlpha",
      run: function runAlphaStage(stageState) {
        stageState.value += 1;
        return stageState;
      }
    },
    {
      id: "beta",
      errorLabel: "stageBeta",
      run: function runBetaStage() {
        throw new Error("boom");
      }
    },
    {
      id: "gamma",
      errorLabel: "stageGamma",
      run: function runGammaStage(stageState) {
        return {
          value: stageState.value + 2
        };
      }
    }
  ]);
  const actual = {
    value: execution.state.value,
    errors: execution.errors.slice(),
    hookCalls: observedHookCalls.slice()
  };
  const failures = [];

  if (actual.value !== 4) {
    failures.push("Expected stage runner final value 4 but received " + JSON.stringify(actual.value) + ".");
  }

  if (!arrayEquals(actual.errors, ["stageBeta: boom"])) {
    failures.push("Expected stage runner errors [\"stageBeta: boom\"] but received " + JSON.stringify(actual.errors) + ".");
  }

  if (!arrayEquals(actual.hookCalls, [
    "before:alpha",
    "after:alpha",
    "before:beta",
    "error:beta",
    "before:gamma",
    "after:gamma"
  ])) {
    failures.push("Unexpected stage runner hook order: " + JSON.stringify(actual.hookCalls) + ".");
  }

  return {
    id: "module-stage-runner",
    title: "Stage runner preserves hook order and stage errors",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      value: 4,
      errors: ["stageBeta: boom"]
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runGeneratedTestSuitePageRegression() {
  const html = fs.readFileSync(generatedTestSuiteHtmlPath, "utf8");
  const inboxFixtureDataScript = fs.readFileSync(generatedInboxFixtureDataPath, "utf8");
  const actual = {
    loadsContentScript: html.includes('<script src="./content-script.js"></script>'),
    loadsPagePaneShell: html.includes('<script src="./page-pane-shell.js"></script>'),
    loadsPagePaneBootstrap: html.includes('<script src="./page-pane-bootstrap.js"></script>'),
    loadsPagePaneAssembly: html.includes('<script src="./page-pane-assembly.js"></script>'),
    loadsPagePaneLayout: html.includes('<script src="./page-pane-layout.js"></script>'),
    loadsPagePaneMirror: html.includes('<script src="./page-pane-mirror.js"></script>'),
    loadsPagePaneDiagnostics: html.includes('<script src="./page-pane-diagnostics.js"></script>'),
    loadsPagePaneSnapshot: html.includes('<script src="./page-pane-snapshot.js"></script>'),
    loadsInboxDetectors: html.includes('<script src="./inbox-detectors.js"></script>'),
    loadsInboxFixtureData: html.includes('<script src="./inbox-browser-fixture-data.js"></script>'),
    loadsInboxBrowserFixtureValidation: html.includes('<script src="./inbox-browser-fixture-validation.js"></script>'),
    loadsPipelineBrowserValidation: html.includes('<script src="./pipeline-browser-validation.js"></script>'),
    loadsSidepanelBrowserValidation: html.includes('<script src="./sidepanel-browser-validation.js"></script>'),
    hasBuiltInTestPageMarker: html.includes('data-url-forensics-test-page="true"'),
    hasSyntheticEmailBodyMarkers: html.includes("data-email-body") || html.includes("data-message-body"),
    hasInMemoryAssertionNotice:
      html.includes("Assertions run in memory.") &&
      html.includes("this page does not visually rewrite the listed URLs; results are computed in memory"),
    hasBrowserDomValidationNotice: html.includes("real browser DOM HTML-detection path"),
    hasSidepanelValidationNotice: html.includes("mount the real sidepanel shell in a hidden browser sandbox"),
    hasInboxFixtureNotice: html.includes("saved Gmail, Outlook, Yahoo, Proton, HEY, and Fastmail inbox fixtures"),
    hasInboxFixtureDataGlobal:
      inboxFixtureDataScript.includes("urlForensicsInboxFixtureData") &&
      inboxFixtureDataScript.includes("\"providerId\": \"gmail\"") &&
      inboxFixtureDataScript.includes("\"providerId\": \"outlook\"") &&
      inboxFixtureDataScript.includes("\"providerId\": \"yahoo\"") &&
      inboxFixtureDataScript.includes("\"providerId\": \"proton\"") &&
      inboxFixtureDataScript.includes("\"providerId\": \"hey\"") &&
      inboxFixtureDataScript.includes("\"providerId\": \"fastmail\"")
  };
  const failures = [];

  if (actual.loadsContentScript) {
    failures.push("Expected generated test suite page to avoid content-script.js.");
  }

  if (!actual.loadsInboxDetectors) {
    failures.push("Expected generated test suite page to load inbox-detectors.js for browser inbox fixture validation.");
  }

  if (
    !actual.loadsPagePaneShell ||
    !actual.loadsPagePaneBootstrap ||
    !actual.loadsPagePaneAssembly ||
    !actual.loadsPagePaneLayout ||
    !actual.loadsPagePaneMirror ||
    !actual.loadsPagePaneDiagnostics ||
    !actual.loadsPagePaneSnapshot
  ) {
    failures.push("Expected generated test suite page to load the page-pane modules required by the sidepanel browser harness.");
  }

  if (!actual.loadsInboxFixtureData) {
    failures.push("Expected generated test suite page to load inbox-browser-fixture-data.js.");
  }

  if (!actual.loadsInboxBrowserFixtureValidation) {
    failures.push("Expected generated test suite page to load inbox-browser-fixture-validation.js.");
  }

  if (!actual.loadsPipelineBrowserValidation) {
    failures.push("Expected generated test suite page to load pipeline-browser-validation.js.");
  }

  if (!actual.loadsSidepanelBrowserValidation) {
    failures.push("Expected generated test suite page to load sidepanel-browser-validation.js.");
  }

  if (actual.hasBuiltInTestPageMarker) {
    failures.push("Expected generated test suite page to avoid the built-in test page marker.");
  }

  if (actual.hasSyntheticEmailBodyMarkers) {
    failures.push("Expected generated test suite page to avoid synthetic email-body markers.");
  }

  if (!actual.hasInMemoryAssertionNotice) {
    failures.push("Expected generated test suite page to explain that assertions run in memory and listed URLs stay static.");
  }

  if (!actual.hasBrowserDomValidationNotice) {
    failures.push("Expected generated test suite page to explain that browser DOM HTML detection is validated separately from the Node fallback parser.");
  }

  if (!actual.hasSidepanelValidationNotice) {
    failures.push("Expected generated test suite page to explain that the sidepanel shell is exercised end to end in the browser harness.");
  }

  if (!actual.hasInboxFixtureNotice) {
    failures.push("Expected generated test suite page to explain that saved inbox fixtures are exercised in the browser harness.");
  }

  if (!actual.hasInboxFixtureDataGlobal) {
    failures.push("Expected generated inbox browser fixture data to include all supported provider fixture definitions.");
  }

  return {
    id: "module-generated-test-suite-page",
    title: "Generated test suite page loads browser fixture harness without content-script runtime",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      loadsContentScript: false,
      loadsPagePaneShell: true,
      loadsPagePaneBootstrap: true,
      loadsPagePaneAssembly: true,
      loadsPagePaneLayout: true,
      loadsPagePaneMirror: true,
      loadsPagePaneDiagnostics: true,
      loadsPagePaneSnapshot: true,
      loadsInboxDetectors: true,
      loadsInboxFixtureData: true,
      loadsInboxBrowserFixtureValidation: true,
      loadsPipelineBrowserValidation: true,
      loadsSidepanelBrowserValidation: true,
      hasBuiltInTestPageMarker: false,
      hasSyntheticEmailBodyMarkers: false,
      hasInMemoryAssertionNotice: true,
      hasBrowserDomValidationNotice: true,
      hasSidepanelValidationNotice: true,
      hasInboxFixtureNotice: true,
      hasInboxFixtureDataGlobal: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function runSampleReviewPageRegression() {
  const html = fs.readFileSync(sampleReviewPageHtmlPath, "utf8");
  const actual = {
    loadsSampleReviewScript: html.includes('<script src="./sample-review.js"></script>'),
    loadsSampleReviewData: html.includes('<script src="./sample-review-data.js"></script>'),
    loadsInboxFixtureData: html.includes('<script src="./inbox-browser-fixture-data.js"></script>'),
    loadsInboxFixtureValidation: html.includes('<script src="./inbox-browser-fixture-validation.js"></script>'),
    loadsPipeline: html.includes('<script src="./pipeline.js"></script>'),
    loadsDetectorRegistry: html.includes('<script src="./pipeline-detector-registry.js"></script>'),
    loadsInboxDetectors: html.includes('<script src="./inbox-detectors.js"></script>'),
    hasTextSamplesHeading: html.includes("Curated Text Samples"),
    hasInboxFixturesHeading: html.includes("Saved Inbox Fixtures")
  };
  const failures = [];

  if (!actual.loadsSampleReviewScript) {
    failures.push("Expected sample review page to load sample-review.js.");
  }

  if (!actual.loadsSampleReviewData) {
    failures.push("Expected sample review page to load sample-review-data.js.");
  }

  if (!actual.loadsInboxFixtureData) {
    failures.push("Expected sample review page to load inbox-browser-fixture-data.js.");
  }

  if (!actual.loadsInboxFixtureValidation) {
    failures.push("Expected sample review page to load inbox-browser-fixture-validation.js.");
  }

  if (!actual.loadsPipeline || !actual.loadsDetectorRegistry || !actual.loadsInboxDetectors) {
    failures.push("Expected sample review page to load the pipeline and inbox detector helpers required for live sample analysis.");
  }

  if (!actual.hasTextSamplesHeading || !actual.hasInboxFixturesHeading) {
    failures.push("Expected sample review page to expose both curated text samples and saved inbox fixture sections.");
  }

  return {
    id: "module-sample-review-page",
    title: "Sample review page loads saved sample data and live analysis helpers",
    mode: "active",
    status: failures.length ? "failed" : "passed",
    sectionId: "module-regressions",
    sectionTitle: "Module Regressions",
    expected: {
      loadsSampleReviewScript: true,
      loadsSampleReviewData: true,
      loadsInboxFixtureData: true,
      loadsInboxFixtureValidation: true,
      loadsPipeline: true,
      loadsDetectorRegistry: true,
      loadsInboxDetectors: true,
      hasTextSamplesHeading: true,
      hasInboxFixturesHeading: true
    },
    targetExpected: null,
    actual: actual,
    failures: failures
  };
}

function buildSectionSummaries(results) {
  const summaryMap = new Map();

  results.forEach(function accumulateResult(result) {
    const existingSummary = summaryMap.get(result.sectionId) || {
      sectionId: result.sectionId,
      sectionTitle: result.sectionTitle,
      passedCount: 0,
      failedCount: 0,
      expectedFailedCount: 0,
      unexpectedPassCount: 0,
      readyCount: 0,
      pendingCount: 0
    };

    if (result.status === "passed") {
      existingSummary.passedCount += 1;
    } else if (result.status === "failed") {
      existingSummary.failedCount += 1;
    } else if (result.status === "expected-failed") {
      existingSummary.expectedFailedCount += 1;
    } else if (result.status === "unexpected-pass") {
      existingSummary.unexpectedPassCount += 1;
    } else if (result.status === "ready") {
      existingSummary.readyCount += 1;
    } else if (result.status === "pending") {
      existingSummary.pendingCount += 1;
    }

    summaryMap.set(result.sectionId, existingSummary);
  });

  return Array.from(summaryMap.values());
}

function buildReportSummary(results) {
  return results.reduce(function accumulateSummary(summary, result) {
    if (result.status === "passed") {
      summary.passedCount += 1;
    } else if (result.status === "failed") {
      summary.failedCount += 1;
    } else if (result.status === "expected-failed") {
      summary.expectedFailedCount += 1;
    } else if (result.status === "unexpected-pass") {
      summary.unexpectedPassCount += 1;
    } else if (result.status === "ready") {
      summary.rebuildReadyCount += 1;
    } else if (result.status === "pending") {
      summary.rebuildPendingCount += 1;
    }

    return summary;
  }, {
    passedCount: 0,
    failedCount: 0,
    expectedFailedCount: 0,
    unexpectedPassCount: 0,
    rebuildReadyCount: 0,
    rebuildPendingCount: 0
  });
}

function formatMarkdownReport(report) {
  const actionableResults = report.results.filter(function keepActionableResult(result) {
    return result.status === "failed" || result.status === "pending" || result.status === "unexpected-pass";
  });
  const lines = [
    "# URL Forensics Pipeline Test Report",
    "",
    "Generated: " + report.generatedAt,
    "",
    "Summary: " +
      String(report.summary.passedCount) +
      " passed, " +
      String(report.summary.failedCount) +
      " failed, " +
      String(report.summary.expectedFailedCount) +
      " expected fail, " +
      String(report.summary.unexpectedPassCount) +
      " unexpected pass, " +
      String(report.summary.rebuildReadyCount) +
      " rebuild targets ready, " +
      String(report.summary.rebuildPendingCount) +
      " rebuild targets pending.",
    "",
    "JSON report: `" + jsonReportPath + "`",
    ""
  ];

  report.results.forEach(function appendResult(result) {
    const statusLabel = result.status.toUpperCase();
    const failureSuffix = result.failures.length ? " :: " + result.failures.join(" | ") : "";
    lines.push("- [" + statusLabel + "] " + result.sectionTitle + " :: " + result.title + failureSuffix);
  });

  if (actionableResults.length) {
    lines.push("");
    lines.push("## Pending And Failed Debug Blocks");
    lines.push("");

    actionableResults.forEach(function appendDebugBlock(result) {
      lines.push("### [" + result.status.toUpperCase() + "] " + result.sectionTitle + " :: " + result.title);
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify({
        id: result.id,
        input: result.actual && typeof result.actual.input === "string" ? result.actual.input : "",
        debugDiff: result.debugDiff
      }, null, 2));
      lines.push("```");
      lines.push("");
    });
  }

  return lines.join("\n") + "\n";
}

function writeReports(report) {
  fs.mkdirSync(reportDirectoryPath, { recursive: true });
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  fs.writeFileSync(markdownReportPath, formatMarkdownReport(report), "utf8");
}

async function runSmokeSuite() {
  const suiteDefinition = testCases.buildPipelineTestSuite();
  const pipelineResults = testCases.flattenCases(suiteDefinition).map(runPipelineCase);
  const moduleResults = [
    runDebugRedactionRegression(),
    runDebugHelperGatingRegression(),
    runExtensionPageDomContractRegression(),
    runPageFactoryRegression(),
    runExtensionPageHelperCouplingRegression(),
    runWorkbenchAppSanitizerRegression(),
    runComponentKitEmptyIdGuardRegression(),
    runPageNavigationMobileVisibilityRegression(),
    await runBackgroundMobileToolbarActionRegression(),
    runDetectorCatalogRegression(),
    runCatalogDriftRegression(),
    runCatalogGoldenRegression(),
    runDetectorRegistryRegression(),
    runPipelineDetectionRegression(),
    runPipelineResolutionRegression(),
    runPipelineAssemblyRegression(),
    runPipelineHtmlRewriterAnchorLookupRegression(),
    runPipelineRewriteFallbackWiringRegression(),
    runPipelineDiagnosticsRegression(),
    runEmailLinkRegression(),
    runInboxDetectorRegression(),
    runInboxSelectorHealthRegression(),
    runDiagnosticsHealthDataRegression(),
    runSampleReviewDataRegression(),
    await runContentUiHelpersRegression(),
    runContentPageContextRegression(),
    await runContentInboxWorkflowsRegression(),
    await runContentPaneWorkflowsRegression(),
    runContentScriptShimRegression(),
    runContentScriptRuntimeRegression(),
    await runContentWorkflowAccessorsRegression(),
    runPagePaneDiagnosticsRegression(),
    runPagePaneBootstrapRegression(),
    runPagePaneAssemblyRegression(),
    runPagePaneLayoutRegression(),
    runPagePaneMirrorRegression(),
    await runPagePaneSnapshotRegression(),
    runEmailSnapshotSyncRegression(),
    runEmailRootSummaryRegression(),
    await runEmailRootRuntimeRegression(),
    runEmailAutoReplaceStateRegression(),
    runEmailAutoReplaceRegression(),
    await runContentSettingsStorageRegression(),
    await runContentRuntimeLifecycleRegression(),
    runEmailCandidateDiscoveryRegression(),
    runPagePaneShellRegression(),
    runGeneratedTestSuitePageRegression(),
    runSampleReviewPageRegression(),
    runPluginRegistryRegression(),
    runStageRunnerRegression(),
    await runSettingsOpenerRegression()
  ];
  const allResults = pipelineResults.concat(moduleResults).map(finalizeResultStatus);
  const report = {
    generatedAt: new Date().toISOString(),
    suite: {
      title: suiteDefinition.title,
      counts: testCases.summarizeSuite(suiteDefinition)
    },
    summary: buildReportSummary(allResults),
    sectionSummaries: buildSectionSummaries(allResults),
    reportPaths: {
      json: jsonReportPath,
      markdown: markdownReportPath
    },
    results: allResults
  };

  console.log(
    "Pipeline test suite complete. " +
    String(report.summary.passedCount) +
    " passed, " +
    String(report.summary.failedCount) +
    " failed, " +
    String(report.summary.expectedFailedCount) +
    " expected fail, " +
    String(report.summary.unexpectedPassCount) +
    " unexpected pass, " +
    String(report.summary.rebuildReadyCount) +
    " rebuild targets ready, " +
    String(report.summary.rebuildPendingCount) +
    " rebuild targets pending."
  );

  if (shouldSaveReports) {
    writeReports(report);
    console.log("JSON report: " + jsonReportPath);
    console.log("Markdown report: " + markdownReportPath);
  } else {
    console.log("Reports were not written. Re-run with --save to persist JSON and Markdown artifacts.");
  }

  if (report.summary.failedCount > 0 || report.summary.unexpectedPassCount > 0) {
    process.exit(1);
  }
}

runSmokeSuite().catch(function handleSmokeSuiteFailure(error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
