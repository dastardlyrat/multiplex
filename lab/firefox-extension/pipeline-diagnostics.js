"use strict";

function urlForensicsPipelineDiagnosticsCreateContext(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const detectorRegistry = optionBag.detectorRegistry || null;
  const trackingParameterModel = optionBag.trackingParameterModel || (pipelineBase ? pipelineBase.trackingParameterModel : null);

  if (!pipelineBase || typeof pipelineBase.convertValueToString !== "function") {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  if (!detectorRegistry || typeof detectorRegistry.listDetectors !== "function") {
    throw new Error("URL Forensics pipeline detector registry is unavailable.");
  }

  return Object.freeze({
    convertValueToString: pipelineBase.convertValueToString,
    resolvePipelineSettings: pipelineBase.resolvePipelineSettings,
    detectorRegistry: detectorRegistry,
    trackingParameterModel: trackingParameterModel
  });
}

function urlForensicsPipelineDiagnosticsBuild(assemblyContext, items, finalUrls, digestEntries, errors, rawText, options) {
  const pipelineSettings = assemblyContext.resolvePipelineSettings(options);
  const invalidResolvedUrlCount = (items || []).reduce(function addInvalidResolvedUrls(totalInvalidCount, item) {
    return totalInvalidCount + ((item.resolved || []).length - (item.validResolved || []).length);
  }, 0);
  const strippedTrackingUrlCount = (items || []).reduce(function addStrippedTrackingUrlCount(totalStrippedCount, item) {
    return totalStrippedCount + (
      item &&
      Array.isArray(item.notes) &&
      item.notes.some(function hasTrackingStripNote(noteText) {
        return String(noteText || "").indexOf("TRACKING_PARAMS_STRIPPED:") === 0;
      })
        ? 1
        : 0
    );
  }, 0);
  const detectorSummary = assemblyContext.detectorRegistry.listDetectors().map(function formatDetector(detector) {
    return detector.id + "=" + detector.title;
  }).join(", ");
  const diagnosticLines = [
    "INPUT CHARS: " + assemblyContext.convertValueToString(rawText).length,
    "RAW URL TOKENS: " + (items || []).length,
    "FINAL URL COUNT: " + (finalUrls || []).length,
    "DIGEST ENTRY COUNT: " + (digestEntries || []).length,
    "DETECTOR REGISTRY: " + detectorSummary,
    "URL NORMALIZATION + REPAIR: " + (pipelineSettings.enableUrlNormalizationRepair ? "ON" : "OFF"),
    "NORMALIZATION STAGE: " + (pipelineSettings.enableUrlNormalizationRepair ? "EXECUTED" : "BYPASSED"),
    "KNOWN TRACKING PARAMETER STRIPPING: " + (pipelineSettings.stripKnownTrackingParameters ? "ON" : "OFF"),
    "TRACKING STRIP STAGE: " + (pipelineSettings.stripKnownTrackingParameters ? "EXECUTED" : "BYPASSED"),
    "TRACKING FILTERS: " + (
      assemblyContext.trackingParameterModel &&
      typeof assemblyContext.trackingParameterModel.formatTrackingParameterFilterSummary === "function"
        ? assemblyContext.trackingParameterModel.formatTrackingParameterFilterSummary(
          pipelineSettings.trackingParameterFilters,
          { maxVisibleLabels: 3 }
        )
        : "unavailable"
    ),
    "TRACKING STRIP COUNT: " + strippedTrackingUrlCount,
    "INVALID RESOLVED URLS: " + invalidResolvedUrlCount
  ];

  if (errors && errors.length) {
    diagnosticLines.push("", "PIPELINE ERRORS:");
    errors.forEach(function appendPipelineError(errorMessage) {
      diagnosticLines.push("- " + errorMessage);
    });
  }

  return {
    invalidCount: invalidResolvedUrlCount,
    lines: diagnosticLines
  };
}

function urlForensicsPipelineDiagnosticsCreate(options) {
  const diagnosticsContext = urlForensicsPipelineDiagnosticsCreateContext(options);

  return Object.freeze({
    buildDiagnostics: function buildDiagnostics(items, finalUrls, digestEntries, errors, rawText, optionBag) {
      return urlForensicsPipelineDiagnosticsBuild(diagnosticsContext, items, finalUrls, digestEntries, errors, rawText, optionBag);
    }
  });
}

(function attachUrlForensicsPipelineDiagnostics(globalScope) {
  const pipelineDiagnostics = Object.freeze({
    create: urlForensicsPipelineDiagnosticsCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineDiagnostics;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineDiagnostics = pipelineDiagnostics;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
