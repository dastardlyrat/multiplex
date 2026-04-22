// Function: initialize URL Forensics sample review page.
(function initializeUrlForensicsSampleReviewPage() {
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
    required: ["sampleReviewData", "inboxFixtureData"]
  });
  const extensionApi = pageRuntime.extensionApi;
  const pageUi = pageRuntime.pageUi;
  const pipeline = globalScope ? globalScope.MergedLinkLabPipeline : null;
  const pipelineBase = globalScope ? globalScope.urlForensicsPipelineBase : null;
  const pipelineDetectorRegistry = globalScope ? globalScope.urlForensicsPipelineDetectorRegistry : null;
  const inboxDetectors = globalScope ? globalScope.urlForensicsInboxDetectors : null;
  const emailCandidateDiscovery = globalScope ? globalScope.urlForensicsEmailCandidateDiscovery : null;
  const emailRootSummary = globalScope ? globalScope.urlForensicsEmailRootSummary : null;
  const inboxBrowserFixtureValidation = globalScope ? globalScope.urlForensicsInboxBrowserFixtureValidation : null;
  const sampleReviewData = pageDependencies.sampleReviewData;
  const inboxFixtureData = pageDependencies.inboxFixtureData;
  const pageState = {
    isRefreshing: false,
    latestReport: null
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    sampleReviewBadge: document.getElementById("sampleReviewBadge"),
    textSampleBadge: document.getElementById("textSampleBadge"),
    fixtureSampleBadge: document.getElementById("fixtureSampleBadge"),
    refreshSampleReviewButton: document.getElementById("refreshSampleReviewButton"),
    sampleReviewSummaryGrid: document.getElementById("sampleReviewSummaryGrid"),
    textSampleTableBody: document.getElementById("textSampleTableBody"),
    fixtureSampleTableBody: document.getElementById("fixtureSampleTableBody"),
    statusMessage: document.getElementById("statusMessage")
  };

  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  function setBadgeText(element, text) {
    pageUi.setBadgeText(element, text, "Unavailable");
  }

  function arrayEquals(leftValue, rightValue) {
    return JSON.stringify(leftValue) === JSON.stringify(rightValue);
  }

  function formatInlineList(values, emptyValue) {
    const safeValues = (Array.isArray(values) ? values : []).map(function normalizeValue(value) {
      return String(value || "").trim();
    }).filter(Boolean);

    return safeValues.length ? safeValues.join(", ") : String(emptyValue || "None");
  }

  function formatJson(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "{}";
    }
  }

  function appendDetailLine(container, className, text) {
    const line = document.createElement("div");

    line.className = className;
    line.textContent = String(text || "");
    container.appendChild(line);
  }

  function createCell() {
    return document.createElement("td");
  }

  function createCodeBlock(text) {
    const codeBlock = document.createElement("div");

    codeBlock.className = "sample-table-code";
    codeBlock.textContent = String(text || "");
    return codeBlock;
  }

  function createSummaryItem(label, value) {
    const item = document.createElement("div");
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("span");

    item.className = "summary-item";
    labelElement.className = "summary-label";
    valueElement.className = "summary-value";
    labelElement.textContent = label;
    valueElement.textContent = value;
    item.appendChild(labelElement);
    item.appendChild(valueElement);
    return item;
  }

  function buildTextSampleResults() {
    if (!pipeline || !pipelineBase || !pipelineDetectorRegistry || typeof pipelineDetectorRegistry.create !== "function") {
      throw new Error("Pipeline detector helpers are unavailable for sample review.");
    }

    const detectorRegistry = pipelineDetectorRegistry.create({
      pipelineBase: pipelineBase
    });
    const expectedDetectorIds = Array.isArray(sampleReviewData.expectedDetectorIds)
      ? sampleReviewData.expectedDetectorIds.slice()
      : [];

    return (Array.isArray(sampleReviewData.textSamples) ? sampleReviewData.textSamples : []).map(function mapTextSample(sampleDefinition) {
      const options = sampleDefinition && typeof sampleDefinition.options === "object" ? sampleDefinition.options : {};
      const matches = detectorRegistry.detectText(String(sampleDefinition.input || ""), options);
      const analysisResult = pipeline.analyzeInput({
        rawText: String(sampleDefinition.input || ""),
        options: options
      });
      const firstItem = analysisResult.items[0] || null;
      const mismatchCount = matches.filter(function keepMismatch(matchRecord) {
        return !arrayEquals(matchRecord.detectorIds, expectedDetectorIds);
      }).length;

      return {
        id: sampleDefinition.id,
        title: sampleDefinition.title,
        input: sampleDefinition.input,
        options: options,
        matchCount: matches.length,
        mismatchCount: mismatchCount,
        detectorSummaries: matches.map(function mapMatch(matchRecord) {
          return (
            "\"" +
            String(matchRecord.value || "") +
            "\" [" +
            formatInlineList(matchRecord.detectorIds, "none") +
            "] @" +
            String(matchRecord.index)
          );
        }),
        finalUrls: analysisResult.finalUrls.slice(),
        displayType: firstItem ? pipeline.getItemDisplayType(firstItem) : "",
        errorCount: Array.isArray(analysisResult.errors) ? analysisResult.errors.length : 0
      };
    });
  }

  function collectFixtureSelectorCounts(fixtureDefinition) {
    if (typeof DOMParser !== "function") {
      return {
        matchedSelectors: [],
        missingSelectors: (fixtureDefinition.expectedSelectors || []).slice()
      };
    }

    const parsedDocument = new DOMParser().parseFromString(String(fixtureDefinition.sourceHtml || ""), "text/html");
    const selectorCounts = (fixtureDefinition.expectedSelectors || []).map(function mapExpectedSelector(selectorText) {
      return {
        selector: selectorText,
        count: parsedDocument.querySelectorAll(selectorText).length
      };
    });

    return {
      matchedSelectors: selectorCounts.filter(function keepMatchedSelector(matchRecord) {
        return matchRecord.count > 0;
      }).map(function mapMatchedSelector(matchRecord) {
        return matchRecord.selector;
      }),
      missingSelectors: selectorCounts.filter(function keepMissingSelector(matchRecord) {
        return matchRecord.count < 1;
      }).map(function mapMissingSelector(matchRecord) {
        return matchRecord.selector;
      })
    };
  }

  async function buildFixtureResults() {
    if (
      !pipeline ||
      !inboxDetectors ||
      !emailCandidateDiscovery ||
      !emailRootSummary ||
      !inboxBrowserFixtureValidation ||
      typeof inboxBrowserFixtureValidation.create !== "function"
    ) {
      throw new Error("Inbox fixture review helpers are unavailable.");
    }

    const validationReport = await inboxBrowserFixtureValidation.create({
      globalScope: globalScope,
      documentObject: document,
      mergedLinkLabPipeline: pipeline,
      inboxDetectors: inboxDetectors,
      emailCandidateDiscovery: emailCandidateDiscovery,
      emailRootSummary: emailRootSummary,
      fixtureData: inboxFixtureData
    }).buildReport();
    const providerReportsById = new Map(
      ((validationReport.actual || {}).providers || []).map(function mapProviderReport(providerReport) {
        return [providerReport.id, providerReport];
      })
    );

    return (Array.isArray(inboxFixtureData) ? inboxFixtureData : []).map(function mapFixtureDefinition(fixtureDefinition) {
      const selectorCounts = collectFixtureSelectorCounts(fixtureDefinition);
      const providerReport = providerReportsById.get(fixtureDefinition.providerId) || null;
      const providerActual = providerReport && providerReport.actual && typeof providerReport.actual === "object"
        ? providerReport.actual
        : {};
      const providerFailures = providerReport && Array.isArray(providerReport.failures)
        ? providerReport.failures
        : [];

      return {
        providerId: fixtureDefinition.providerId,
        title: fixtureDefinition.title,
        fixtureUrl: fixtureDefinition.fixtureUrl,
        expectedSelectors: (fixtureDefinition.expectedSelectors || []).slice(),
        matchedSelectors: selectorCounts.matchedSelectors,
        missingSelectors: selectorCounts.missingSelectors,
        status: providerReport ? providerReport.status : "failed",
        candidateCount: Number(providerActual.candidateCount) || 0,
        failureKind: String(providerActual.failureKind || ""),
        primaryTagName: String(providerActual.primaryTagName || ""),
        detectionMode: String(providerActual.detectionMode || ""),
        finalUrls: Array.isArray(providerActual.finalUrls) ? providerActual.finalUrls.slice() : [],
        matchedRawTextFragments: Array.isArray(providerActual.matchedRawTextFragments)
          ? providerActual.matchedRawTextFragments.slice()
          : [],
        failures: providerFailures.slice()
      };
    });
  }

  function renderSummary(report) {
    const summaryGrid = DOM.sampleReviewSummaryGrid;

    if (!summaryGrid) {
      return;
    }

    summaryGrid.replaceChildren(
      createSummaryItem("Curated Text Samples", String(report.textSamples.length)),
      createSummaryItem("Saved Inbox Fixtures", String(report.fixtures.length)),
      createSummaryItem("Text Parity Mismatches", String(report.textMismatchCount)),
      createSummaryItem("Fixture Failures", String(report.fixtureFailureCount))
    );
  }

  function renderTextSamples(textSamples) {
    const tableBody = DOM.textSampleTableBody;

    if (!tableBody) {
      return;
    }

    if (!textSamples.length) {
      tableBody.innerHTML = "<tr><td colspan=\"4\">No curated text samples are available.</td></tr>";
      setBadgeText(DOM.textSampleBadge, "No text samples");
      return;
    }

    const fragment = document.createDocumentFragment();
    const mismatchCount = textSamples.filter(function keepMismatch(sampleResult) {
      return sampleResult.mismatchCount > 0;
    }).length;

    textSamples.forEach(function appendTextSample(sampleResult) {
      const row = document.createElement("tr");
      const sampleCell = createCell();
      const inputCell = createCell();
      const detectorCell = createCell();
      const outputCell = createCell();

      appendDetailLine(sampleCell, "sample-label", sampleResult.title || sampleResult.id);
      appendDetailLine(sampleCell, "sample-table-inline sample-muted", sampleResult.id);
      appendDetailLine(sampleCell, sampleResult.mismatchCount ? "sample-error" : "sample-success", sampleResult.mismatchCount ? "Detector mismatch present" : "Detector parity holds");
      appendDetailLine(sampleCell, "sample-table-inline sample-muted", "Options: " + formatJson(sampleResult.options));

      inputCell.appendChild(createCodeBlock(sampleResult.input));

      appendDetailLine(detectorCell, "sample-table-inline", "Match count: " + String(sampleResult.matchCount));
      appendDetailLine(detectorCell, "sample-table-inline", "Mismatch count: " + String(sampleResult.mismatchCount));
      if (sampleResult.detectorSummaries.length) {
        sampleResult.detectorSummaries.forEach(function appendDetectorSummary(detectorSummary) {
          appendDetailLine(detectorCell, "sample-table-inline", detectorSummary);
        });
      } else {
        appendDetailLine(detectorCell, "sample-muted", "No detector matches.");
      }

      appendDetailLine(outputCell, "sample-table-inline", "Display type: " + String(sampleResult.displayType || "Unavailable"));
      appendDetailLine(outputCell, "sample-table-inline", "Final URLs: " + formatInlineList(sampleResult.finalUrls, "None"));
      appendDetailLine(outputCell, sampleResult.errorCount ? "sample-error" : "sample-muted", "Errors: " + String(sampleResult.errorCount));

      row.appendChild(sampleCell);
      row.appendChild(inputCell);
      row.appendChild(detectorCell);
      row.appendChild(outputCell);
      fragment.appendChild(row);
    });

    tableBody.replaceChildren(fragment);
    setBadgeText(DOM.textSampleBadge, mismatchCount ? String(mismatchCount) + " mismatch(es)" : "Text samples healthy");
  }

  function renderFixtures(fixtures) {
    const tableBody = DOM.fixtureSampleTableBody;

    if (!tableBody) {
      return;
    }

    if (!fixtures.length) {
      tableBody.innerHTML = "<tr><td colspan=\"4\">No saved inbox fixtures are available.</td></tr>";
      setBadgeText(DOM.fixtureSampleBadge, "No fixtures");
      return;
    }

    const fragment = document.createDocumentFragment();
    const failureCount = fixtures.filter(function keepFailedFixture(fixtureResult) {
      return fixtureResult.status !== "passed";
    }).length;

    fixtures.forEach(function appendFixtureResult(fixtureResult) {
      const row = document.createElement("tr");
      const fixtureCell = createCell();
      const selectorCell = createCell();
      const detectionCell = createCell();
      const outputCell = createCell();

      appendDetailLine(fixtureCell, "sample-label", fixtureResult.title || fixtureResult.providerId);
      appendDetailLine(fixtureCell, "sample-table-inline sample-muted", fixtureResult.providerId);
      appendDetailLine(fixtureCell, "sample-table-code", fixtureResult.fixtureUrl);
      appendDetailLine(fixtureCell, fixtureResult.status === "passed" ? "sample-success" : "sample-error", fixtureResult.status === "passed" ? "Fixture healthy" : "Fixture failure");

      appendDetailLine(selectorCell, "sample-table-inline", "Expected: " + formatInlineList(fixtureResult.expectedSelectors, "None"));
      appendDetailLine(selectorCell, "sample-table-inline", "Matched: " + formatInlineList(fixtureResult.matchedSelectors, "None"));
      appendDetailLine(selectorCell, fixtureResult.missingSelectors.length ? "sample-error" : "sample-muted", "Missing: " + formatInlineList(fixtureResult.missingSelectors, "None"));

      appendDetailLine(detectionCell, "sample-table-inline", "Candidates: " + String(fixtureResult.candidateCount));
      appendDetailLine(detectionCell, "sample-table-inline", "Primary tag: " + String(fixtureResult.primaryTagName || "Unavailable"));
      appendDetailLine(detectionCell, "sample-table-inline", "Detection mode: " + String(fixtureResult.detectionMode || "Unavailable"));
      appendDetailLine(detectionCell, fixtureResult.failureKind ? "sample-error" : "sample-muted", "Failure kind: " + String(fixtureResult.failureKind || "None"));

      appendDetailLine(outputCell, "sample-table-inline", "Final URLs: " + formatInlineList(fixtureResult.finalUrls, "None"));
      appendDetailLine(outputCell, "sample-table-inline", "Matched text fragments: " + formatInlineList(fixtureResult.matchedRawTextFragments, "None"));
      if (fixtureResult.failures.length) {
        fixtureResult.failures.forEach(function appendFixtureFailure(failureMessage) {
          appendDetailLine(outputCell, "sample-error", failureMessage);
        });
      } else {
        appendDetailLine(outputCell, "sample-success", "All saved expectations matched.");
      }

      row.appendChild(fixtureCell);
      row.appendChild(selectorCell);
      row.appendChild(detectionCell);
      row.appendChild(outputCell);
      fragment.appendChild(row);
    });

    tableBody.replaceChildren(fragment);
    setBadgeText(DOM.fixtureSampleBadge, failureCount ? String(failureCount) + " fixture failure(s)" : "Fixtures healthy");
  }

  async function refreshSampleReview() {
    if (pageState.isRefreshing) {
      return pageState.latestReport;
    }

    pageState.isRefreshing = true;
    setStatus("Refreshing saved sample review...", "");

    try {
      const textSamples = buildTextSampleResults();
      const fixtures = await buildFixtureResults();
      const report = {
        textSamples: textSamples,
        fixtures: fixtures,
        textMismatchCount: textSamples.filter(function keepMismatch(sampleResult) {
          return sampleResult.mismatchCount > 0;
        }).length,
        fixtureFailureCount: fixtures.filter(function keepFailedFixture(fixtureResult) {
          return fixtureResult.status !== "passed";
        }).length
      };

      pageState.latestReport = report;
      renderSummary(report);
      renderTextSamples(textSamples);
      renderFixtures(fixtures);

      const hasFailures = report.textMismatchCount > 0 || report.fixtureFailureCount > 0;

      setBadgeText(
        DOM.sampleReviewBadge,
        hasFailures
          ? String(report.textMismatchCount + report.fixtureFailureCount) + " issue(s)"
          : "Samples healthy"
      );
      setStatus(
        "Sample review refreshed. " +
        String(textSamples.length) +
        " text sample(s), " +
        String(fixtures.length) +
        " fixture sample(s), " +
        String(report.textMismatchCount) +
        " text mismatch(es), " +
        String(report.fixtureFailureCount) +
        " fixture failure(s).",
        hasFailures ? "error" : "saved"
      );

      return report;
    } catch (error) {
      setBadgeText(DOM.sampleReviewBadge, "Refresh failed");
      setStatus("Could not refresh sample review: " + (error && error.message ? error.message : "unknown error"), "error");
      return null;
    } finally {
      pageState.isRefreshing = false;
    }
  }

  function bindUi() {
    if (DOM.refreshSampleReviewButton) {
      DOM.refreshSampleReviewButton.addEventListener("click", refreshSampleReview);
    }
  }

  async function initializeSampleReviewPage() {
    if (
      !sampleReviewData ||
      !Array.isArray(sampleReviewData.textSamples) ||
      !Array.isArray(inboxFixtureData)
    ) {
      setBadgeText(DOM.sampleReviewBadge, "Unavailable");
      setStatus("Saved sample data is unavailable on this page.", "error");
      return;
    }

    if (DOM.extensionVersion && extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getManifest === "function") {
      const manifest = extensionApi.runtime.getManifest();
      DOM.extensionVersion.textContent = "v" + String(manifest && manifest.version ? manifest.version : "0.0.0");
    }

    bindUi();
    await refreshSampleReview();
  }

  initializeSampleReviewPage();
}());
