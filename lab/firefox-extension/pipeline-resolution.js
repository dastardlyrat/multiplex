"use strict";

function urlForensicsPipelineResolutionCreateContext(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const urlResolver = optionBag.urlResolver || null;
  const pipelineAssembly = optionBag.pipelineAssembly || null;

  if (!pipelineBase || typeof pipelineBase.convertValueToString !== "function") {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  if (!urlResolver || typeof urlResolver.resolveURL !== "function") {
    throw new Error("URL Forensics pipeline URL resolver helpers are unavailable.");
  }

  if (!pipelineAssembly || typeof pipelineAssembly.stripTrackingParametersFromResolvedUrls !== "function") {
    throw new Error("URL Forensics pipeline assembly helpers are unavailable.");
  }

  return Object.freeze({
    debugApi: optionBag.debugApi || null,
    convertValueToString: pipelineBase.convertValueToString,
    resolvePipelineSettings: pipelineBase.resolvePipelineSettings,
    normalizeLinkValue:
      typeof urlResolver.normalizeLinkValue === "function"
        ? urlResolver.normalizeLinkValue
        : function passthroughNormalizeLinkValue(urlValue) {
          return pipelineBase.convertValueToString(urlValue).trim();
        },
    peel: urlResolver.peel,
    resolveURL: urlResolver.resolveURL,
    isValidURL: urlResolver.isValidURL,
    appendUniqueItemNote: pipelineAssembly.appendUniqueItemNote,
    stripTrackingParametersFromResolvedUrls: pipelineAssembly.stripTrackingParametersFromResolvedUrls,
    getPreferredReplacementUrl: pipelineAssembly.getPreferredReplacementUrl
  });
}

function urlForensicsPipelineResolutionEnsureMutableItemCollections(item) {
  if (!item || typeof item !== "object") {
    return;
  }

  if (!Array.isArray(item.notes)) {
    item.notes = [];
  }

  if (!Array.isArray(item.trackerCleanupEntries)) {
    item.trackerCleanupEntries = [];
  }
}

function urlForensicsPipelineResolutionPopulateBypassedDataForItems(resolutionContext, items) {
  (items || []).forEach(function inspectDetectedItem(item) {
    urlForensicsPipelineResolutionEnsureMutableItemCollections(item);

    const originalUrl = resolutionContext.convertValueToString(item && item.original).trim();
    const normalizedLink = resolutionContext.normalizeLinkValue(originalUrl);

    item.normalized = normalizedLink;
    item.resolved = normalizedLink ? [normalizedLink] : [];
    item.validResolved = item.resolved.filter(resolutionContext.isValidURL);
    item.replacementUrl = normalizedLink || originalUrl;
    item.trackerCleanupEntries = [];

    resolutionContext.appendUniqueItemNote(item, "NORMALIZATION_REPAIR_BYPASSED");

    if (!item.validResolved.length) {
      resolutionContext.appendUniqueItemNote(item, "NO_VALID_RESOLVED_URL");
    }
  });

  return items;
}

function urlForensicsPipelineResolutionPopulateResolvedDataForItems(resolutionContext, items, options) {
  if (resolutionContext.debugApi) {
    resolutionContext.debugApi.functionIn("pipeline.populateResolvedDataForItems", {
      itemCount: Array.isArray(items) ? items.length : 0,
      enableUrlNormalizationRepair: !!(options && options.enableUrlNormalizationRepair),
      stripKnownTrackingParameters: !options || options.stripKnownTrackingParameters !== false
    });
  }

  const pipelineSettings = resolutionContext.resolvePipelineSettings(options);
  const shouldBypassNormalizationRepair = !pipelineSettings.enableUrlNormalizationRepair;

  (items || []).forEach(function inspectDetectedItem(item) {
    urlForensicsPipelineResolutionEnsureMutableItemCollections(item);

    if (resolutionContext.debugApi && item && item.id <= 3) {
      resolutionContext.debugApi.loop("pipeline resolving item", { itemId: item.id });
    }

    const originalUrl = resolutionContext.convertValueToString(item && item.original).trim();
    item.trackerCleanupEntries = [];

    if (shouldBypassNormalizationRepair) {
      item.normalized = resolutionContext.normalizeLinkValue(originalUrl);
      item.resolved = originalUrl ? resolutionContext.resolveURL(item.normalized) : [];
      resolutionContext.appendUniqueItemNote(item, "NORMALIZATION_REPAIR_BYPASSED");
    } else {
      const peeledUrlToken = resolutionContext.peel(item.original, pipelineSettings);
      item.normalized = resolutionContext.normalizeLinkValue(peeledUrlToken.value);
      item.notes.push.apply(item.notes, Array.isArray(peeledUrlToken.notes) ? peeledUrlToken.notes : []);
      item.resolved = resolutionContext.resolveURL(item.normalized);
    }

    item.resolved = resolutionContext.stripTrackingParametersFromResolvedUrls(item, pipelineSettings);
    item.validResolved = item.resolved.filter(resolutionContext.isValidURL);

    if (!item.validResolved.length) {
      resolutionContext.appendUniqueItemNote(item, "NO_VALID_RESOLVED_URL");
      if (resolutionContext.debugApi) {
        resolutionContext.debugApi.conditional("pipeline item has no valid resolved url", { itemId: item.id });
      }
    }

    item.replacementUrl = resolutionContext.getPreferredReplacementUrl(item);
  });

  if (resolutionContext.debugApi) {
    resolutionContext.debugApi.functionOut("pipeline.populateResolvedDataForItems", {
      mode: "resolve",
      itemCount: Array.isArray(items) ? items.length : 0
    });
  }

  return items;
}

function urlForensicsPipelineResolutionCreate(options) {
  const resolutionContext = urlForensicsPipelineResolutionCreateContext(options);

  return Object.freeze({
    populateBypassedDataForItems: function populateBypassedDataForItems(items) {
      return urlForensicsPipelineResolutionPopulateBypassedDataForItems(resolutionContext, items);
    },
    populateResolvedDataForItems: function populateResolvedDataForItems(items, optionBag) {
      return urlForensicsPipelineResolutionPopulateResolvedDataForItems(resolutionContext, items, optionBag);
    }
  });
}

(function attachUrlForensicsPipelineResolution(globalScope) {
  const pipelineResolution = Object.freeze({
    create: urlForensicsPipelineResolutionCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineResolution;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineResolution = pipelineResolution;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
