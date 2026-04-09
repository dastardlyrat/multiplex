"use strict";

function urlForensicsPagePaneDiagnosticsCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    extensionManifest: optionBag.extensionManifest && typeof optionBag.extensionManifest === "object"
      ? optionBag.extensionManifest
      : { name: "URL Forensics Workbench", version: "0.0.0" },
    extensionSettings: optionBag.extensionSettings && typeof optionBag.extensionSettings === "object"
      ? optionBag.extensionSettings
      : {},
    extensionStorageSnapshot: optionBag.extensionStorageSnapshot && typeof optionBag.extensionStorageSnapshot === "object"
      ? optionBag.extensionStorageSnapshot
      : { values: {} },
    getPipelineSettings: typeof optionBag.getPipelineSettings === "function"
      ? optionBag.getPipelineSettings
      : function getDefaultPipelineSettings() {
        return {};
      },
    formatTrackingParameterFilterSnapshotEntry: typeof optionBag.formatTrackingParameterFilterSnapshotEntry === "function"
      ? optionBag.formatTrackingParameterFilterSnapshotEntry
      : function formatUnknownTrackingParameterFilters() {
        return "Unavailable";
      },
    formatTimingValue: typeof optionBag.formatTimingValue === "function"
      ? optionBag.formatTimingValue
      : function formatUnknownTimingValue() {
        return "Unavailable";
      },
    formatTimestamp: typeof optionBag.formatTimestamp === "function"
      ? optionBag.formatTimestamp
      : function formatUnknownTimestamp() {
        return "Unavailable";
      },
    getNavigationPerformanceEntry: typeof optionBag.getNavigationPerformanceEntry === "function"
      ? optionBag.getNavigationPerformanceEntry
      : function getUnavailableNavigationEntry() {
        return null;
      },
    getInboxDetectionFailure: typeof optionBag.getInboxDetectionFailure === "function"
      ? optionBag.getInboxDetectionFailure
      : function getMissingInboxDetectionFailure() {
        return null;
      },
    escapeHtml: typeof optionBag.escapeHtml === "function"
      ? optionBag.escapeHtml
      : function escapeDiagnosticsHtml(textValue) {
        return String(textValue || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      },
    replaceElementMarkup: typeof optionBag.replaceElementMarkup === "function"
      ? optionBag.replaceElementMarkup
      : function ignoreDiagnosticsMarkupReplacement() {}
  });
}

function urlForensicsPagePaneDiagnosticsGetSnapshotPipelineResult(snapshot) {
  return snapshot && snapshot.pipeline ? snapshot.pipeline : null;
}

function urlForensicsPagePaneDiagnosticsGetSnapshotPipelineSettings(snapshot, pipelineResult, options) {
  if (snapshot && snapshot.pipelineSettings) {
    return snapshot.pipelineSettings;
  }

  return pipelineResult && pipelineResult.options ? pipelineResult.options : options.getPipelineSettings();
}

function urlForensicsPagePaneDiagnosticsBuildExtensionSection(snapshot, pipelineSettings, options) {
  const trackingFiltersEntry = options.extensionStorageSnapshot.values && options.extensionStorageSnapshot.values.trackingParameterFilters
    ? options.extensionStorageSnapshot.values.trackingParameterFilters
    : null;

  return {
    title: "Extension Details",
    lines: [
      "Name: " + (options.extensionManifest.name || "URL Forensics Workbench"),
      "Version: " + (options.extensionManifest.version || "0.0.0"),
      "URL Normalization + Repair: " + (pipelineSettings.enableUrlNormalizationRepair ? "enabled" : "disabled"),
      "Tracking Parameter Stripping: " + (pipelineSettings.stripKnownTrackingParameters ? "enabled" : "disabled"),
      "Tracker Filters: " + options.formatTrackingParameterFilterSnapshotEntry(trackingFiltersEntry),
      "Replace Email Body With Mirror: " + (options.extensionSettings.replaceEmailBodyWithMirrorContent ? "enabled" : "disabled"),
      "Auto-Apply Mirror For Configured Senders: " + (options.extensionSettings.autoApplyMirrorForConfiguredSenders ? "enabled" : "disabled"),
      "Configured Auto-Apply Sender Count: " + String(
        Array.isArray(options.extensionSettings.autoApplyMirrorSenderEmailList)
          ? options.extensionSettings.autoApplyMirrorSenderEmailList.length
          : 0
      ),
      "Inbox Snapshot Ready: " + (snapshot ? "yes" : "no")
    ]
  };
}

function urlForensicsPagePaneDiagnosticsBuildRuntimeSection(navigationEntry, options) {
  const readyState = typeof document !== "undefined" && document && document.readyState
    ? document.readyState
    : "unknown";
  const timeSinceNavigationStart = typeof performance !== "undefined" && performance && typeof performance.now === "function"
    ? performance.now()
    : NaN;

  return {
    title: "Runtime Status",
    lines: [
      "Ready State: " + readyState,
      "Navigation Type: " + (navigationEntry && navigationEntry.type ? navigationEntry.type : "unavailable"),
      "DOM Interactive: " + options.formatTimingValue(navigationEntry ? navigationEntry.domInteractive : NaN),
      "DOMContentLoaded End: " + options.formatTimingValue(navigationEntry ? navigationEntry.domContentLoadedEventEnd : NaN),
      "Load Event End: " + options.formatTimingValue(navigationEntry ? navigationEntry.loadEventEnd : NaN),
      "Time Since Navigation Start: " + options.formatTimingValue(timeSinceNavigationStart)
    ]
  };
}

function urlForensicsPagePaneDiagnosticsBuildWaitingLines(options) {
  const inboxDetectionFailure = options.getInboxDetectionFailure();

  if (inboxDetectionFailure && inboxDetectionFailure.kind) {
    return [
      "Inbox Detection Failure: " + (inboxDetectionFailure.message || inboxDetectionFailure.kind),
      "Failure Kind: " + inboxDetectionFailure.kind,
      "Provider: " + (inboxDetectionFailure.providerTitle || inboxDetectionFailure.providerId || "Unknown"),
      "Host: " + (inboxDetectionFailure.hostname || "Unavailable"),
      "Path: " + (inboxDetectionFailure.pathname || "Unavailable"),
      "Matched Providers: " + (
        Array.isArray(inboxDetectionFailure.matchedProviderTitles) && inboxDetectionFailure.matchedProviderTitles.length
          ? inboxDetectionFailure.matchedProviderTitles.join(", ")
          : "None"
      ),
      "Checked Selectors: " + (
        Array.isArray(inboxDetectionFailure.checkedSelectors) && inboxDetectionFailure.checkedSelectors.length
          ? inboxDetectionFailure.checkedSelectors.join(" | ")
          : "None"
      ),
      "Matched Selectors: " + (
        Array.isArray(inboxDetectionFailure.matchedSelectors) && inboxDetectionFailure.matchedSelectors.length
          ? inboxDetectionFailure.matchedSelectors.join(" | ")
          : "None"
      ),
      "Selector Hit Count: " + String(inboxDetectionFailure.selectorHitCount || 0),
      "Candidate Count: " + String(inboxDetectionFailure.candidateCount || 0)
    ];
  }

  return [
    "Waiting for a detected email body.",
    "Open an inbox message so the panel can populate the converted output and Link Lab tabs."
  ];
}

function urlForensicsPagePaneDiagnosticsBuildActivePipelineLines(snapshot, pipelineResult, options) {
  const pipelineDiagnostics = pipelineResult && pipelineResult.diagnostics && pipelineResult.diagnostics.lines
    ? pipelineResult.diagnostics.lines
    : [];
  const pipelineErrors = pipelineResult && pipelineResult.errors ? pipelineResult.errors : [];
  const summaryLines = [
    "Detected At: " + options.formatTimestamp(snapshot.detectedAt),
    "Detection Mode: " + (snapshot.detectionMode || "unknown"),
    "Section Label: " + (snapshot.sectionLabel || "Opened email body"),
    "Source Type: " + (snapshot.sourceHtml ? "HTML email body snapshot" : "Plain text email snapshot"),
    "Raw URL Tokens: " + String(pipelineResult && pipelineResult.items ? pipelineResult.items.length : 0),
    "Final URL Count: " + String(pipelineResult && pipelineResult.finalUrls ? pipelineResult.finalUrls.length : 0),
    "Changed URL Count: " + String(pipelineResult && pipelineResult.changedUrls ? pipelineResult.changedUrls.length : 0),
    "Rewritten Count: " + String(pipelineResult && pipelineResult.rewrittenCount ? pipelineResult.rewrittenCount : 0),
    "Digest Entry Count: " + String(pipelineResult && pipelineResult.digestEntries ? pipelineResult.digestEntries.length : 0),
    "Pipeline Errors: " + (pipelineErrors.length ? pipelineErrors.join(" | ") : "none"),
    ""
  ];

  return summaryLines.concat(
    pipelineDiagnostics.length
      ? pipelineDiagnostics
      : ["No pipeline diagnostics are available for the current snapshot."]
  );
}

function urlForensicsPagePaneDiagnosticsBuildPipelineSection(snapshot, pipelineResult, options) {
  return {
    title: "URL Detection",
    lines: snapshot
      ? urlForensicsPagePaneDiagnosticsBuildActivePipelineLines(snapshot, pipelineResult, options)
      : urlForensicsPagePaneDiagnosticsBuildWaitingLines(options)
  };
}

function urlForensicsPagePaneDiagnosticsBuildSections(snapshot, options) {
  const pipelineResult = urlForensicsPagePaneDiagnosticsGetSnapshotPipelineResult(snapshot);
  const pipelineSettings = urlForensicsPagePaneDiagnosticsGetSnapshotPipelineSettings(snapshot, pipelineResult, options);
  const navigationEntry = options.getNavigationPerformanceEntry();

  return [
    urlForensicsPagePaneDiagnosticsBuildExtensionSection(snapshot, pipelineSettings, options),
    urlForensicsPagePaneDiagnosticsBuildRuntimeSection(navigationEntry, options),
    urlForensicsPagePaneDiagnosticsBuildPipelineSection(snapshot, pipelineResult, options)
  ];
}

function urlForensicsPagePaneDiagnosticsRenderSections(targetElement, sections, options) {
  if (!targetElement) {
    return;
  }

  options.replaceElementMarkup(targetElement, (sections || [])
    .map(function createDiagnosticsSectionMarkup(section) {
      return [
        '<section class="merged-link-lab-page-pane__diagnostic-card">',
        '  <div class="merged-link-lab-page-pane__diagnostic-title">' + options.escapeHtml(section.title || "Diagnostics") + "</div>",
        '  <pre class="merged-link-lab-page-pane__diagnostic-block">' + options.escapeHtml((section.lines || []).join("\n")) + "</pre>",
        "</section>"
      ].join("");
    })
    .join(""));
}

function urlForensicsPagePaneDiagnosticsCreate(options) {
  const resolvedOptions = urlForensicsPagePaneDiagnosticsCreateDefaultOptions(options);

  return Object.freeze({
    buildDiagnosticsSections: function buildDiagnosticsSections(snapshot) {
      return urlForensicsPagePaneDiagnosticsBuildSections(snapshot, resolvedOptions);
    },
    renderDiagnosticsSections: function renderDiagnosticsSections(targetElement, sections) {
      return urlForensicsPagePaneDiagnosticsRenderSections(targetElement, sections, resolvedOptions);
    }
  });
}

(function attachUrlForensicsPagePaneDiagnostics(globalScope) {
  const pagePaneDiagnostics = Object.freeze({
    create: urlForensicsPagePaneDiagnosticsCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneDiagnostics;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneDiagnostics = pagePaneDiagnostics;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
