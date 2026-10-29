// Function: initialize URL Forensics Workbench instrumentation page.
(function initializeUrlForensicsInstrumentationPage() {
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
    required: ["detectorCatalog", "diagnosticsCatalogRows", "diagnosticsHealthData"]
  });
  const extensionApi = pageRuntime.extensionApi;
  const pageUi = pageRuntime.pageUi;
  const detectorCatalog = pageDependencies.detectorCatalog;
  const diagnosticsHealthData = pageDependencies.diagnosticsHealthData;
  const diagnosticsCatalogRows = pageDependencies.diagnosticsCatalogRows.create({
    formatInlineList: formatInlineList,
    formatKeyValueSummary: formatKeyValueSummary
  });
  const debugApi = pageRuntime.debugApi;
  const instrumentationState = {
    manifest: null,
    detectorCatalog: null,
    detectorCatalogError: "",
    diagnosticsHealthSnapshot: null,
    diagnosticsHealthError: ""
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    refreshInstrumentationButton: document.getElementById("refreshInstrumentationButton"),
    detectorParityBadge: document.getElementById("detectorParityBadge"),
    detectorParityList: document.getElementById("detectorParityList"),
    selectorHealthBadge: document.getElementById("selectorHealthBadge"),
    selectorHealthList: document.getElementById("selectorHealthList"),
    urlDetectorCatalogBadge: document.getElementById("urlDetectorCatalogBadge"),
    urlDetectorCatalogList: document.getElementById("urlDetectorCatalogList"),
    inboxDetectorCatalogBadge: document.getElementById("inboxDetectorCatalogBadge"),
    inboxDetectorCatalogList: document.getElementById("inboxDetectorCatalogList"),
    pipelineRuleCatalogBadge: document.getElementById("pipelineRuleCatalogBadge"),
    pipelineRuleCatalogList: document.getElementById("pipelineRuleCatalogList"),
    statusMessage: document.getElementById("statusMessage")
  };

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "instrumentation-page", module: "instrumentation" });
    debugApi.runtime("instrumentation page initialization started");
  }

  function resolveManifest() {
    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getManifest !== "function") {
      return null;
    }

    try {
      return extensionApi.runtime.getManifest();
    } catch {
      return null;
    }
  }

  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  function setBadgeText(element, text) {
    pageUi.setBadgeText(element, text, "Unavailable");
  }

  function renderDiagnosticList(listElement, rows) {
    pageUi.renderDefinitionRows(listElement, rows, "diagnostic-row");
  }

  function formatTimestamp(timestampValue) {
    return pageUi.formatTimestamp(timestampValue);
  }

  function arrayEquals(leftValue, rightValue) {
    return JSON.stringify(leftValue) === JSON.stringify(rightValue);
  }

  function formatInlineList(values, options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const separator = typeof optionBag.separator === "string" ? optionBag.separator : ", ";
    const emptyValue = typeof optionBag.emptyValue === "string" ? optionBag.emptyValue : "None";
    const maxVisibleItems = Number.isFinite(optionBag.maxVisibleItems) && optionBag.maxVisibleItems > 0
      ? Math.floor(optionBag.maxVisibleItems)
      : 6;
    const safeValues = (Array.isArray(values) ? values : []).map(function normalizeListValue(value) {
      return String(value || "").trim();
    }).filter(Boolean);

    if (!safeValues.length) {
      return emptyValue;
    }

    if (safeValues.length <= maxVisibleItems) {
      return safeValues.join(separator);
    }

    return safeValues.slice(0, maxVisibleItems).join(separator) + separator + "+" + String(safeValues.length - maxVisibleItems) + " more";
  }

  function formatKeyValueSummary(items, formatter) {
    const safeItems = Array.isArray(items) ? items : [];

    if (!safeItems.length) {
      return "None";
    }

    return safeItems.map(function mapSummaryItem(item) {
      return formatter(item && typeof item === "object" ? item : {});
    }).filter(Boolean).join("; ");
  }

  function setDetectorCatalogState(catalog, errorMessage) {
    instrumentationState.detectorCatalog = catalog || null;
    instrumentationState.detectorCatalogError = String(errorMessage || "").trim();
  }

  function setDiagnosticsHealthState(snapshot, errorMessage) {
    instrumentationState.diagnosticsHealthSnapshot = snapshot || null;
    instrumentationState.diagnosticsHealthError = String(errorMessage || "").trim();
  }

  function getDetectorParitySnapshot() {
    const snapshot = instrumentationState.diagnosticsHealthSnapshot;
    return snapshot && typeof snapshot === "object" && snapshot.detectorParity && typeof snapshot.detectorParity === "object"
      ? snapshot.detectorParity
      : null;
  }

  function getSelectorHealthSnapshot() {
    const snapshot = instrumentationState.diagnosticsHealthSnapshot;
    return snapshot && typeof snapshot === "object" && snapshot.selectorHealth && typeof snapshot.selectorHealth === "object"
      ? snapshot.selectorHealth
      : null;
  }

  function getSnapshotStaleReasons(snapshotType) {
    const snapshot = instrumentationState.diagnosticsHealthSnapshot;
    const liveCatalog = instrumentationState.detectorCatalog;
    const reasons = [];

    if (!snapshot || !liveCatalog) {
      return reasons;
    }

    if (
      snapshot.extensionVersion &&
      instrumentationState.manifest &&
      instrumentationState.manifest.version &&
      snapshot.extensionVersion !== instrumentationState.manifest.version
    ) {
      reasons.push(
        "Snapshot extension version " +
        String(snapshot.extensionVersion) +
        " does not match current version " +
        String(instrumentationState.manifest.version) +
        "."
      );
    }

    if (snapshotType === "detector-parity") {
      const liveDetectorIds = (liveCatalog.urlDetectors || []).map(function mapDetector(detectorDefinition) {
        return detectorDefinition.id;
      });

      if (!arrayEquals((snapshot.liveCatalog || {}).urlDetectorIds || [], liveDetectorIds)) {
        reasons.push("Snapshot detector ids do not match the live detector registry.");
      }
    }

    if (snapshotType === "selector-health") {
      const liveProviderIds = (liveCatalog.inboxProviders || []).map(function mapProvider(providerDefinition) {
        return providerDefinition.id;
      });

      if (!arrayEquals((snapshot.liveCatalog || {}).inboxProviderIds || [], liveProviderIds)) {
        reasons.push("Snapshot inbox provider ids do not match the live inbox detector registry.");
      }
    }

    return reasons;
  }

  function buildHealthBadgeLabel(reportStatus, staleReasons, loadingLabel, healthyLabel, failingLabel) {
    if (!instrumentationState.diagnosticsHealthSnapshot) {
      return instrumentationState.diagnosticsHealthError ? "Health error" : loadingLabel;
    }

    if (reportStatus !== "passed") {
      return failingLabel;
    }

    if (staleReasons.length) {
      return "Stale snapshot";
    }

    return healthyLabel;
  }

  function buildDetectorParityRows() {
    const paritySnapshot = getDetectorParitySnapshot();
    const staleReasons = getSnapshotStaleReasons("detector-parity");
    const snapshot = instrumentationState.diagnosticsHealthSnapshot;

    if (!paritySnapshot) {
      return [
        { label: "Status", value: instrumentationState.diagnosticsHealthError || "Loading committed detector parity snapshot..." }
      ];
    }

    return [
      { label: "Snapshot Status", value: String(paritySnapshot.status || "Unavailable") },
      { label: "Snapshot Generated", value: formatTimestamp(snapshot.generatedAt) },
      { label: "Snapshot Version", value: String(snapshot.extensionVersion || "Unavailable") },
      { label: "Detector IDs", value: formatInlineList(paritySnapshot.detectorIds, { maxVisibleItems: 8 }) },
      { label: "Detector Titles", value: formatInlineList(paritySnapshot.detectorTitles, { maxVisibleItems: 8 }) },
      { label: "Pipeline Suite Cases", value: String(paritySnapshot.suiteCaseCount || 0) },
      { label: "Curated Samples", value: String(paritySnapshot.paritySampleCount || 0) },
      { label: "Suite Mismatches", value: String(paritySnapshot.suiteParityMismatchCount || 0) },
      { label: "Sample Mismatches", value: String(paritySnapshot.sampleParityMismatchCount || 0) },
      { label: "Failure Count", value: String(paritySnapshot.failureCount || 0) },
      { label: "Stale Reasons", value: staleReasons.length ? staleReasons.join(" ") : "None" },
      {
        label: "Mismatch Preview",
        value: formatKeyValueSummary(
          (paritySnapshot.suiteParityMismatchPreview || []).concat(paritySnapshot.sampleParityMismatchPreview || []).slice(0, 4),
          function formatParityMismatchPreview(mismatchRecord) {
            return String(mismatchRecord.id || "unknown") + " -> " + formatInlineList(mismatchRecord.detectorIds, { maxVisibleItems: 4 });
          }
        )
      }
    ];
  }

  function buildSelectorHealthRows() {
    const selectorHealthSnapshot = getSelectorHealthSnapshot();
    const staleReasons = getSnapshotStaleReasons("selector-health");
    const snapshot = instrumentationState.diagnosticsHealthSnapshot;

    if (!selectorHealthSnapshot) {
      return [
        { label: "Status", value: instrumentationState.diagnosticsHealthError || "Loading committed selector-health snapshot..." }
      ];
    }

    return [
      { label: "Snapshot Status", value: String(selectorHealthSnapshot.status || "Unavailable") },
      { label: "Snapshot Generated", value: formatTimestamp(snapshot.generatedAt) },
      { label: "Snapshot Version", value: String(snapshot.extensionVersion || "Unavailable") },
      { label: "Fixture Count", value: String(selectorHealthSnapshot.fixtureCount || 0) },
      { label: "Provider IDs", value: formatInlineList(selectorHealthSnapshot.providerIds, { maxVisibleItems: 8 }) },
      { label: "Failing Providers", value: formatInlineList(selectorHealthSnapshot.failingProviderIds, { emptyValue: "None", maxVisibleItems: 8 }) },
      { label: "Missing Expected Selectors", value: String(selectorHealthSnapshot.missingExpectedSelectorCount || 0) },
      { label: "Failure Count", value: String(selectorHealthSnapshot.failureCount || 0) },
      { label: "Stale Reasons", value: staleReasons.length ? staleReasons.join(" ") : "None" },
      {
        label: "Provider Summary",
        value: formatKeyValueSummary(selectorHealthSnapshot.providerStatuses, function formatProviderStatus(providerStatus) {
          const issueSummary = [];

          if (!providerStatus.hostMatches) {
            issueSummary.push("host mismatch");
          }

          if (!providerStatus.pathMatches) {
            issueSummary.push("path mismatch");
          }

          if ((providerStatus.missingExpectedSelectors || []).length) {
            issueSummary.push("missing " + formatInlineList(providerStatus.missingExpectedSelectors, { separator: " | ", maxVisibleItems: 4 }));
          }

          return (
            String(providerStatus.providerId || "unknown") +
            " [" +
            (issueSummary.length ? issueSummary.join(", ") : "ok") +
            "] " +
            String(providerStatus.matchedSelectorCount || 0) +
            "/" +
            String(providerStatus.expectedSelectorCount || 0)
          );
        })
      }
    ];
  }

  function renderDetectorCatalog() {
    const catalog = instrumentationState.detectorCatalog;

    setBadgeText(
      DOM.urlDetectorCatalogBadge,
      catalog
        ? String((catalog.summary || {}).urlDetectorCount || 0) + " URL matchers"
        : (instrumentationState.detectorCatalogError ? "Detector error" : "Loading detectors")
    );
    setBadgeText(
      DOM.inboxDetectorCatalogBadge,
      catalog
        ? String((catalog.summary || {}).inboxProviderCount || 0) + " site matchers"
        : (instrumentationState.detectorCatalogError ? "Provider error" : "Loading providers")
    );
    setBadgeText(
      DOM.pipelineRuleCatalogBadge,
      catalog
        ? String((catalog.summary || {}).pluginPackCount || 0) + " rule pack(s)"
        : (instrumentationState.detectorCatalogError ? "Rule error" : "Loading rules")
    );

    renderDiagnosticList(
      DOM.urlDetectorCatalogList,
      diagnosticsCatalogRows.buildUrlDetectorCatalogRows(catalog, instrumentationState.detectorCatalogError)
    );
    renderDiagnosticList(
      DOM.inboxDetectorCatalogList,
      diagnosticsCatalogRows.buildInboxDetectorCatalogRows(catalog, instrumentationState.detectorCatalogError)
    );
    renderDiagnosticList(
      DOM.pipelineRuleCatalogList,
      diagnosticsCatalogRows.buildPipelineRuleCatalogRows(catalog, instrumentationState.detectorCatalogError)
    );
  }

  function renderDiagnosticsHealth() {
    const paritySnapshot = getDetectorParitySnapshot();
    const selectorHealthSnapshot = getSelectorHealthSnapshot();
    const parityStaleReasons = getSnapshotStaleReasons("detector-parity");
    const selectorHealthStaleReasons = getSnapshotStaleReasons("selector-health");

    setBadgeText(
      DOM.detectorParityBadge,
      buildHealthBadgeLabel(
        paritySnapshot ? paritySnapshot.status : "",
        parityStaleReasons,
        "Loading parity",
        "Parity healthy",
        "Parity failing"
      )
    );
    setBadgeText(
      DOM.selectorHealthBadge,
      buildHealthBadgeLabel(
        selectorHealthSnapshot ? selectorHealthSnapshot.status : "",
        selectorHealthStaleReasons,
        "Loading selector health",
        "Selectors healthy",
        "Selectors failing"
      )
    );

    renderDiagnosticList(DOM.detectorParityList, buildDetectorParityRows());
    renderDiagnosticList(DOM.selectorHealthList, buildSelectorHealthRows());
  }

  function loadDetectorCatalog() {
    try {
      setDetectorCatalogState(detectorCatalog && typeof detectorCatalog.buildCatalog === "function" ? detectorCatalog.buildCatalog() : null, "");
    } catch (error) {
      setDetectorCatalogState(null, error && error.message ? error.message : "unknown detector catalog error");
    }

    renderDetectorCatalog();
    renderDiagnosticsHealth();
  }

  function loadDiagnosticsHealth() {
    try {
      setDiagnosticsHealthState(diagnosticsHealthData || null, "");
    } catch (error) {
      setDiagnosticsHealthState(null, error && error.message ? error.message : "unknown diagnostics health error");
    }

    renderDiagnosticsHealth();
  }

  function refreshInstrumentation() {
    loadDiagnosticsHealth();
    loadDetectorCatalog();
    setStatus("Instrumentation refreshed.", "saved");
  }

  function bindUi() {
    if (DOM.refreshInstrumentationButton) {
      DOM.refreshInstrumentationButton.addEventListener("click", refreshInstrumentation);
    }
  }

  function initializeInstrumentation() {
    instrumentationState.manifest = resolveManifest();

    if (DOM.extensionVersion) {
      DOM.extensionVersion.textContent =
        "v" + String(instrumentationState.manifest && instrumentationState.manifest.version ? instrumentationState.manifest.version : "0.0.0");
    }

    bindUi();
    renderDiagnosticsHealth();
    renderDetectorCatalog();
    refreshInstrumentation();
  }

  initializeInstrumentation();
}());
