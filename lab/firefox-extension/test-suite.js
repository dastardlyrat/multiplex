// Function: initialize URL Forensics test suite page.
(function initializeUrlForensicsTestSuitePage() {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : null;
  const pageRuntimeFactory = globalScope ? globalScope.urlForensicsPageRuntime : null;
  const pageDependenciesFactory = globalScope ? globalScope.urlForensicsPageDependencies : null;

  if (!pageRuntimeFactory || typeof pageRuntimeFactory.create !== "function") {
    throw new Error("URL Forensics page runtime helpers are unavailable.");
  }

  if (!pageDependenciesFactory || typeof pageDependenciesFactory.create !== "function") {
    throw new Error("URL Forensics page dependency helpers are unavailable.");
  }

  const pageRuntime = pageRuntimeFactory.create({
    globalScope: globalScope,
    requirePageUi: true
  });
  const pageDependencies = pageDependenciesFactory.create({
    globalScope: globalScope,
    required: ["debugRedaction", "settingsOpener", "testSuiteData", "inboxFixtureData"]
  });
  const pageUi = pageRuntime.pageUi;
  const pipeline = globalScope ? globalScope.MergedLinkLabPipeline : null;
  const pipelineBase = globalScope ? globalScope.urlForensicsPipelineBase : null;
  const pipelineDetection = globalScope ? globalScope.urlForensicsPipelineDetection : null;
  const pipelineDetectorRegistry = globalScope ? globalScope.urlForensicsPipelineDetectorRegistry : null;
  const pipelineBrowserValidation = globalScope ? globalScope.urlForensicsPipelineBrowserValidation : null;
  const sidepanelBrowserValidation = globalScope ? globalScope.urlForensicsSidepanelBrowserValidation : null;
  const inboxDetectors = globalScope ? globalScope.urlForensicsInboxDetectors : null;
  const emailCandidateDiscovery = globalScope ? globalScope.urlForensicsEmailCandidateDiscovery : null;
  const emailRootSummary = globalScope ? globalScope.urlForensicsEmailRootSummary : null;
  const inboxBrowserFixtureValidation = globalScope ? globalScope.urlForensicsInboxBrowserFixtureValidation : null;
  const redaction = pageDependencies.debugRedaction;
  const settingsOpener = pageDependencies.settingsOpener;
  const suiteDefinition = pageDependencies.testSuiteData;
  const inboxFixtureData = pageDependencies.inboxFixtureData;
  const testState = {
    latestReport: null,
    isRunning: false
  };
  const DOM = {
    saveTestResultsButton: document.getElementById("saveTestResultsButton"),
    testRunBadge: document.getElementById("testRunBadge"),
    statusMessage: document.getElementById("statusMessage")
  };

  // Function: set status.
  function setStatus(message, tone) {
    if (pageUi && typeof pageUi.setStatusText === "function") {
      pageUi.setStatusText(DOM.statusMessage, message, tone);
      return;
    }

    if (DOM.statusMessage) {
      DOM.statusMessage.textContent = String(message || "");
    }
  }

  // Function: set badge text.
  function setBadgeText(text) {
    if (pageUi && typeof pageUi.setBadgeText === "function") {
      pageUi.setBadgeText(DOM.testRunBadge, text, "Unavailable");
      return;
    }

    if (DOM.testRunBadge) {
      DOM.testRunBadge.textContent = String(text || "Unavailable");
    }
  }

  // Function: compare arrays.
  function arrayEquals(leftValue, rightValue) {
    return JSON.stringify(leftValue) === JSON.stringify(rightValue);
  }

  // Function: normalize expected status.
  function normalizeExpectedStatus(resultLike) {
    const resultRecord = resultLike && typeof resultLike === "object" ? resultLike : {};

    if (resultRecord.mode === "rebuild-target") {
      return resultRecord.expectedStatus === "pending" ? "pending" : "ready";
    }

    return resultRecord.expectedStatus === "failed" ? "failed" : "passed";
  }

  // Function: finalize result status.
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

  // Function: collect pipeline actual values.
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
      diagnostics: analysisResult.diagnostics && Array.isArray(analysisResult.diagnostics.lines)
        ? analysisResult.diagnostics.lines.slice()
        : [],
      errors: Array.isArray(analysisResult.errors) ? analysisResult.errors.slice() : [],
      input: caseDefinition.input
    };
  }

  // Function: compare expected result.
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
        failures.push("Expected removedParameterNames " + JSON.stringify(expectedRemovedNames) + " but received " + JSON.stringify(actual.removedParameterNames) + ".");
      }
    }

    if (Array.isArray(expected.notesIncludes)) {
      expected.notesIncludes.forEach(function ensureNotesContain(expectedFragment) {
        if (notesText.indexOf(expectedFragment) === -1) {
          failures.push("Expected notes to include " + JSON.stringify(expectedFragment) + " but received " + JSON.stringify(actual.notes) + ".");
        }
      });
    }

    if (Array.isArray(expected.diagnosticsIncludes)) {
      expected.diagnosticsIncludes.forEach(function ensureDiagnosticsContain(expectedFragment) {
        if (diagnosticsText.indexOf(expectedFragment) === -1) {
          failures.push("Expected diagnostics to include " + JSON.stringify(expectedFragment) + " but received " + JSON.stringify(actual.diagnostics) + ".");
        }
      });
    }

    if (typeof expected.errorsCount === "number" && actual.errors.length !== expected.errorsCount) {
      failures.push("Expected errorsCount " + String(expected.errorsCount) + " but received " + String(actual.errors.length) + ".");
    }

    return failures;
  }

  // Function: build debug diff.
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

  // Function: run pipeline case.
  function runPipelineCase(caseDefinition) {
    const analysisResult = pipeline.analyzeInput({
      rawText: caseDefinition.input,
      options: caseDefinition.options || {}
    });
    const actual = collectPipelineActual(caseDefinition, analysisResult);
    const expectation = caseDefinition.mode === "rebuild-target" ? caseDefinition.targetExpected : caseDefinition.expected;
    const failures = compareExpected(expectation, actual);
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
      debugDiff: failures.length ? buildDebugDiff(expectation, actual, failures) : null
    });
  }

  // Function: run debug redaction regression.
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
      failures: failures,
      debugDiff: null
    };
  }

  // Function: run settings opener regression.
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
      failures.push("Expected runtime calls " + JSON.stringify(["merged-link-lab:open-settings-page"]) + " but received " + JSON.stringify(actual.calls) + ".");
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
      failures: failures,
      debugDiff: null
    };
  }

  // Function: run browser-path validation regression.
  function runPipelineBrowserValidationRegression() {
    if (
      !pipelineBrowserValidation ||
      typeof pipelineBrowserValidation.create !== "function" ||
      !pipelineBase ||
      !pipelineDetection ||
      !pipelineDetectorRegistry
    ) {
      return {
        id: "module-pipeline-browser-path",
        title: "Browser DOM path stays distinct from Node fallback HTML parsing",
        mode: "active",
        status: "failed",
        sectionId: "module-regressions",
        sectionTitle: "Module Regressions",
        expected: {
          hasDomParser: true,
          failedScenarioIds: []
        },
        targetExpected: null,
        actual: {
          hasBrowserValidation: !!pipelineBrowserValidation,
          hasPipelineBase: !!pipelineBase,
          hasPipelineDetection: !!pipelineDetection,
          hasPipelineDetectorRegistry: !!pipelineDetectorRegistry,
          hasDomParser: !!(globalScope && typeof globalScope.DOMParser === "function")
        },
        failures: ["Expected browser-path validation helpers to load on the in-page suite."],
        debugDiff: null
      };
    }

    const browserValidationReport = pipelineBrowserValidation.create({
      globalScope: globalScope,
      pipelineBase: pipelineBase,
      pipelineDetection: pipelineDetection,
      pipelineDetectorRegistry: pipelineDetectorRegistry
    }).buildReport();

    return {
      id: "module-pipeline-browser-path",
      title: "Browser DOM path stays distinct from Node fallback HTML parsing",
      mode: "active",
      status: browserValidationReport.failures.length ? "failed" : "passed",
      sectionId: "module-regressions",
      sectionTitle: "Module Regressions",
      expected: browserValidationReport.expected,
      targetExpected: null,
      actual: browserValidationReport.actual,
      failures: browserValidationReport.failures,
      debugDiff: null
    };
  }

  // Function: run inbox browser fixture validation regression.
  async function runInboxBrowserFixtureValidationRegression() {
    if (
      !inboxBrowserFixtureValidation ||
      typeof inboxBrowserFixtureValidation.create !== "function" ||
      !inboxDetectors ||
      !emailCandidateDiscovery ||
      !emailRootSummary ||
      !Array.isArray(inboxFixtureData)
    ) {
      return {
        id: "module-inbox-browser-fixtures",
        title: "Saved inbox fixtures produce browser-side snapshots across supported providers",
        mode: "active",
        status: "failed",
        sectionId: "module-regressions",
        sectionTitle: "Module Regressions",
        expected: {
          fixtureCount: 6,
          failedProviderIds: []
        },
        targetExpected: null,
        actual: {
          hasValidationModule: !!inboxBrowserFixtureValidation,
          hasInboxDetectors: !!inboxDetectors,
          hasEmailCandidateDiscovery: !!emailCandidateDiscovery,
          hasEmailRootSummary: !!emailRootSummary,
          fixtureCount: Array.isArray(inboxFixtureData) ? inboxFixtureData.length : 0
        },
        failures: ["Expected inbox browser fixture validation helpers to load on the in-page suite."],
        debugDiff: null
      };
    }

    const browserFixtureReport = await inboxBrowserFixtureValidation.create({
      globalScope: globalScope,
      documentObject: document,
      mergedLinkLabPipeline: pipeline,
      inboxDetectors: inboxDetectors,
      emailCandidateDiscovery: emailCandidateDiscovery,
      emailRootSummary: emailRootSummary,
      fixtureData: inboxFixtureData
    }).buildReport();

    return {
      id: "module-inbox-browser-fixtures",
      title: "Saved inbox fixtures produce browser-side snapshots across supported providers",
      mode: "active",
      status: browserFixtureReport.failures.length ? "failed" : "passed",
      sectionId: "module-regressions",
      sectionTitle: "Module Regressions",
      expected: browserFixtureReport.expected,
      targetExpected: null,
      actual: browserFixtureReport.actual,
      failures: browserFixtureReport.failures,
      debugDiff: null
    };
  }

  // Function: run sidepanel browser validation regression.
  async function runSidepanelBrowserValidationRegression() {
    if (
      !sidepanelBrowserValidation ||
      typeof sidepanelBrowserValidation.create !== "function"
    ) {
      return {
        id: "module-sidepanel-browser-e2e",
        title: "Browser test page validates sidepanel mirror, hover inspection, and diagnostics end to end",
        mode: "active",
        status: "failed",
        sectionId: "module-regressions",
        sectionTitle: "Module Regressions",
        expected: {
          paneMounted: true,
          failedAssertions: []
        },
        targetExpected: null,
        actual: {
          hasSidepanelBrowserValidation: !!sidepanelBrowserValidation
        },
        failures: ["Expected sidepanel browser validation helpers to load on the in-page suite."],
        debugDiff: null
      };
    }

    const sidepanelReport = await sidepanelBrowserValidation.create({
      globalScope: globalScope,
      documentObject: document,
      pageUi: pageUi,
      mergedLinkLabPipeline: pipeline
    }).buildReport();

    return {
      id: "module-sidepanel-browser-e2e",
      title: "Browser test page validates sidepanel mirror, hover inspection, and diagnostics end to end",
      mode: "active",
      status: sidepanelReport.failures.length ? "failed" : "passed",
      sectionId: "module-regressions",
      sectionTitle: "Module Regressions",
      expected: sidepanelReport.expected,
      targetExpected: null,
      actual: sidepanelReport.actual,
      failures: sidepanelReport.failures,
      debugDiff: null
    };
  }

  // Function: build section summaries.
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

  // Function: build report summary.
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

  // Function: update button state.
  function updateButtonState() {
    if (DOM.saveTestResultsButton) {
      DOM.saveTestResultsButton.disabled = testState.isRunning || !suiteDefinition || !pipeline || !redaction || !settingsOpener;
    }
  }

  // Function: update badge from report.
  function updateBadgeFromReport(report) {
    if (!report || !report.summary) {
      setBadgeText("Unavailable");
      return;
    }

    const parts = [
      String(report.summary.passedCount) + " passed"
    ];

    if (report.summary.failedCount > 0) {
      parts.push(String(report.summary.failedCount) + " failed");
    }

    if (report.summary.expectedFailedCount > 0) {
      parts.push(String(report.summary.expectedFailedCount) + " expected fail");
    }

    if (report.summary.unexpectedPassCount > 0) {
      parts.push(String(report.summary.unexpectedPassCount) + " unexpected pass");
    }

    if (report.summary.rebuildPendingCount > 0) {
      parts.push(String(report.summary.rebuildPendingCount) + " pending");
    }

    if (report.summary.rebuildReadyCount > 0) {
      parts.push(String(report.summary.rebuildReadyCount) + " ready");
    }

    setBadgeText(parts.join(" | "));
  }

  // Function: run all tests.
  async function runAllTests() {
    const suiteSections = suiteDefinition && Array.isArray(suiteDefinition.sections) ? suiteDefinition.sections : [];
    const pipelineResults = suiteSections.flatMap(function flattenSection(sectionDefinition) {
      return (sectionDefinition.cases || []).map(function attachSectionMetadata(caseDefinition) {
        return runPipelineCase(Object.assign({
          sectionId: sectionDefinition.id,
          sectionTitle: sectionDefinition.title
        }, caseDefinition));
      });
    });
    const moduleResults = [
      runDebugRedactionRegression(),
      runPipelineBrowserValidationRegression(),
      await runSidepanelBrowserValidationRegression(),
      await runInboxBrowserFixtureValidationRegression(),
      await runSettingsOpenerRegression()
    ];
    const results = pipelineResults.concat(moduleResults);

    return {
      generatedAt: new Date().toISOString(),
      source: "extension-test-page",
      suite: {
        title: suiteDefinition.title || "URL Forensics Workbench Test Suite"
      },
      summary: buildReportSummary(results),
      sectionSummaries: buildSectionSummaries(results),
      results: results
    };
  }

  // Function: refresh in-page results.
  async function refreshInPageResults(statusMessage) {
    if (testState.isRunning) {
      return testState.latestReport;
    }

    testState.isRunning = true;
    updateButtonState();

    try {
      const report = await runAllTests();
      testState.latestReport = report;
      updateBadgeFromReport(report);
      const hasUnexpectedFailures = report.summary.failedCount > 0 || report.summary.unexpectedPassCount > 0;

      if (statusMessage) {
        setStatus(
          statusMessage + ": " +
          String(report.summary.passedCount) +
          " passed, " +
          String(report.summary.failedCount) +
          " failed, " +
          String(report.summary.expectedFailedCount) +
          " expected fail, " +
          String(report.summary.unexpectedPassCount) +
          " unexpected pass, " +
          String(report.summary.rebuildPendingCount) +
          " rebuild targets pending.",
          hasUnexpectedFailures ? "error" : ""
        );
      }

      return report;
    } catch (error) {
      setBadgeText("Run failed");
      setStatus("Could not run in-page tests: " + (error && error.message ? error.message : "unknown error"), "error");
      return null;
    } finally {
      testState.isRunning = false;
      updateButtonState();
    }
  }

  // Function: save report download.
  function saveReportDownload(report) {
    const exportText = JSON.stringify(report, null, 2);
    const blob = new Blob([exportText], { type: "application/json" });
    const exportUrl = URL.createObjectURL(blob);
    const exportLink = document.createElement("a");

    exportLink.href = exportUrl;
    exportLink.download = "url-forensics-workbench-test-report-" + String(Date.now()) + ".json";
    exportLink.style.display = "none";
    document.body.appendChild(exportLink);
    exportLink.click();
    exportLink.remove();
    URL.revokeObjectURL(exportUrl);
  }

  // Function: save test results.
  async function saveTestResults() {
    const report = await refreshInPageResults("In-page checks refreshed before save");

    if (!report) {
      return;
    }

    saveReportDownload(report);
    setStatus(
      "Test results saved manually. " +
      String(report.summary.passedCount) +
      " passed, " +
      String(report.summary.failedCount) +
      " failed, " +
      String(report.summary.expectedFailedCount) +
      " expected fail, " +
      String(report.summary.unexpectedPassCount) +
      " unexpected pass, " +
      String(report.summary.rebuildPendingCount) +
      " rebuild targets pending.",
      report.summary.failedCount > 0 || report.summary.unexpectedPassCount > 0 ? "error" : "saved"
    );
  }

  // Function: bind UI.
  function bindUi() {
    if (DOM.saveTestResultsButton) {
      DOM.saveTestResultsButton.addEventListener("click", saveTestResults);
    }
  }

  // Function: initialize page.
  async function initializeTestSuitePage() {
    if (!suiteDefinition || !pipeline || !redaction || !settingsOpener) {
      setBadgeText("Unavailable");
      setStatus("Test suite helpers are unavailable on this page.", "error");
      updateButtonState();
      return;
    }

    bindUi();
    updateButtonState();
    const report = await refreshInPageResults();
    if (report) {
      setStatus(
        "In-page checks complete: " +
        String(report.summary.passedCount) +
        " passed, " +
        String(report.summary.failedCount) +
        " failed, " +
        String(report.summary.expectedFailedCount) +
        " expected fail, " +
        String(report.summary.unexpectedPassCount) +
        " unexpected pass, " +
        String(report.summary.rebuildPendingCount) +
        " rebuild targets pending. Results are not saved automatically.",
        report.summary.failedCount > 0 || report.summary.unexpectedPassCount > 0 ? "error" : ""
      );
    }
  }

  initializeTestSuitePage();
}());
