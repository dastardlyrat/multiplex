"use strict";

function urlForensicsPipelineAssemblyCreateContext(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const urlResolver = optionBag.urlResolver || null;

  if (!pipelineBase || typeof pipelineBase.convertValueToString !== "function") {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  if (!urlResolver || typeof urlResolver.stripKnownTrackingParameters !== "function") {
    throw new Error("URL Forensics pipeline URL resolver helpers are unavailable.");
  }

  return Object.freeze({
    convertValueToString: pipelineBase.convertValueToString,
    normalizeTitle: pipelineBase.normalizeTitle,
    validateTitle: pipelineBase.validateTitle,
    extractHost: urlResolver.extractHost,
    extractBaseUrl: urlResolver.extractBaseUrl,
    buildFinalUrlEntry: urlResolver.buildFinalUrlEntry,
    classifyUrlValue: urlResolver.classifyUrlValue,
    stripKnownTrackingParameters: urlResolver.stripKnownTrackingParameters,
    isValidURL: urlResolver.isValidURL,
    normalizeLinkValue:
      typeof urlResolver.normalizeLinkValue === "function"
        ? urlResolver.normalizeLinkValue
        : function passthroughNormalizeLinkValue(urlValue) {
          return pipelineBase.convertValueToString(urlValue).trim();
        }
  });
}

function urlForensicsPipelineAssemblyLocateLineForOriginal(assemblyContext, rawText, originalUrl, fallbackStartIndex) {
  const safeRawText = assemblyContext.convertValueToString(rawText);
  const safeFallbackIndex = Math.max(0, fallbackStartIndex || 0);
  const locatedOffset = safeRawText.indexOf(originalUrl, safeFallbackIndex);

  if (locatedOffset < 0) {
    return {
      lineIndex: -1,
      nextStart: safeFallbackIndex
    };
  }

  const textBeforeMatch = safeRawText.slice(0, locatedOffset);

  return {
    lineIndex: textBeforeMatch.split("\n").length - 1,
    nextStart: locatedOffset + originalUrl.length
  };
}

function urlForensicsPipelineAssemblyFindNearbyTitle(assemblyContext, lines, lineIndex) {
  for (let nearbyLineIndex = lineIndex - 1; nearbyLineIndex >= 0 && nearbyLineIndex > lineIndex - 10; nearbyLineIndex -= 1) {
    const validatedTitle = assemblyContext.validateTitle(lines[nearbyLineIndex]);
    if (validatedTitle) {
      return validatedTitle;
    }
  }

  return null;
}

function urlForensicsPipelineAssemblyGetItemFinalUrls(assemblyContext, item) {
  const finalUrls = item && item.validResolved && item.validResolved.length ? item.validResolved : (item && item.resolved ? item.resolved : []);
  const seenFinalUrls = new Set();

  return finalUrls.filter(function keepUniqueFinalUrl(urlValue) {
    const trimmedUrlValue = assemblyContext.convertValueToString(urlValue).trim();

    if (!trimmedUrlValue || seenFinalUrls.has(trimmedUrlValue)) {
      return false;
    }

    seenFinalUrls.add(trimmedUrlValue);
    return true;
  });
}

function urlForensicsPipelineAssemblyBuildStandaloneFinalUrls(assemblyContext, items) {
  return (items || []).flatMap(function flattenResolvedUrls(item) {
    return urlForensicsPipelineAssemblyGetItemFinalUrls(assemblyContext, item);
  });
}

function urlForensicsPipelineAssemblyAppendUniqueItemNote(item, noteText) {
  if (!item || !Array.isArray(item.notes) || !noteText || item.notes.indexOf(noteText) !== -1) {
    return;
  }

  item.notes.push(noteText);
}

function urlForensicsPipelineAssemblyGetItemTrackerCleanupEntries(item) {
  return item && Array.isArray(item.trackerCleanupEntries) ? item.trackerCleanupEntries : [];
}

function urlForensicsPipelineAssemblyDidItemStripTrackingParameters(item) {
  return urlForensicsPipelineAssemblyGetItemTrackerCleanupEntries(item).some(function hasTrackerCleanupEntry(cleanupEntry) {
    return cleanupEntry && Array.isArray(cleanupEntry.removedParameterNames) && cleanupEntry.removedParameterNames.length > 0;
  });
}

function urlForensicsPipelineAssemblyStripTrackingParametersFromResolvedUrls(assemblyContext, item, pipelineSettings) {
  const strippedResolvedUrls = [];
  const seenResolvedUrls = new Set();
  const removedParameterNames = new Set();
  const trackerCleanupEntries = [];

  if (item) {
    item.trackerCleanupEntries = trackerCleanupEntries;
  }

  (item && Array.isArray(item.resolved) ? item.resolved : []).forEach(function stripResolvedUrl(resolvedUrl) {
    const strippedUrlResult = assemblyContext.stripKnownTrackingParameters(resolvedUrl, pipelineSettings);
    const strippedUrlValue = assemblyContext.convertValueToString(
      strippedUrlResult && strippedUrlResult.value ? strippedUrlResult.value : resolvedUrl
    ).trim();

    (strippedUrlResult && Array.isArray(strippedUrlResult.removedParameterNames)
      ? strippedUrlResult.removedParameterNames
      : []
    ).forEach(function rememberRemovedParameterName(parameterName) {
      removedParameterNames.add(parameterName);
    });

    if (strippedUrlResult && Array.isArray(strippedUrlResult.removedParameterNames) && strippedUrlResult.removedParameterNames.length) {
      trackerCleanupEntries.push({
        originalUrl: assemblyContext.convertValueToString(resolvedUrl).trim(),
        cleanedUrl: strippedUrlValue,
        removedParameterNames: strippedUrlResult.removedParameterNames.slice()
      });
    }

    if (!strippedUrlValue || seenResolvedUrls.has(strippedUrlValue)) {
      return;
    }

    seenResolvedUrls.add(strippedUrlValue);
    strippedResolvedUrls.push(strippedUrlValue);
  });

  if (!pipelineSettings.stripKnownTrackingParameters) {
    urlForensicsPipelineAssemblyAppendUniqueItemNote(item, "TRACKING_PARAMETER_STRIP_BYPASSED");
  } else if (removedParameterNames.size) {
    urlForensicsPipelineAssemblyAppendUniqueItemNote(item, "TRACKING_PARAMS_STRIPPED: " + Array.from(removedParameterNames).join(", "));
  }

  return strippedResolvedUrls;
}

function urlForensicsPipelineAssemblyGetPreferredReplacementUrl(assemblyContext, item) {
  const preferredUrl = urlForensicsPipelineAssemblyGetItemFinalUrls(assemblyContext, item)[0] || "";
  return assemblyContext.convertValueToString(preferredUrl || item.normalized || item.original).trim();
}

function urlForensicsPipelineAssemblyGetItemDisplayType(assemblyContext, item) {
  const originalUrl = assemblyContext.convertValueToString(item && item.original).trim();
  const normalizedUrl = assemblyContext.convertValueToString(item && item.normalized).trim();
  const preferredUrl = urlForensicsPipelineAssemblyGetPreferredReplacementUrl(assemblyContext, item);

  if (urlForensicsPipelineAssemblyDidItemStripTrackingParameters(item)) {
    return "tracker cleaned";
  }

  return assemblyContext.classifyUrlValue(preferredUrl || normalizedUrl || originalUrl);
}

function urlForensicsPipelineAssemblyBuildDigestEntries(assemblyContext, rawText, items, options) {
  const optionBag = options || {};
  const useReplacementUrlOnly = !!optionBag.useReplacementUrlOnly;
  const inputLines = assemblyContext.convertValueToString(rawText).split("\n");
  const digestEntries = [];
  const seenDigestKeys = new Set();
  let nextSearchStartIndex = 0;

  (items || []).forEach(function inspectDetectedItem(item) {
    const locatedOriginalLine = urlForensicsPipelineAssemblyLocateLineForOriginal(
      assemblyContext,
      rawText,
      item.original,
      nextSearchStartIndex
    );
    nextSearchStartIndex = locatedOriginalLine.nextStart;

    const digestUrls = useReplacementUrlOnly
      ? (item.replacementUrl ? [item.replacementUrl] : [])
      : urlForensicsPipelineAssemblyGetItemFinalUrls(assemblyContext, item);

    digestUrls.forEach(function addDigestEntry(resolvedUrl) {
      const resolvedHost = assemblyContext.extractHost(resolvedUrl);
      const nearbyTitle = locatedOriginalLine.lineIndex >= 0
        ? urlForensicsPipelineAssemblyFindNearbyTitle(assemblyContext, inputLines, locatedOriginalLine.lineIndex)
        : null;
      const displayTitle = assemblyContext.normalizeTitle(nearbyTitle, resolvedHost || "unknown-host");
      const digestKey = displayTitle + "|" + resolvedHost;

      if (!displayTitle || seenDigestKeys.has(digestKey)) {
        return;
      }

      seenDigestKeys.add(digestKey);
      digestEntries.push({
        title: displayTitle,
        url: resolvedUrl,
        host: resolvedHost,
        type: urlForensicsPipelineAssemblyGetItemDisplayType(assemblyContext, item)
      });
    });
  });

  return digestEntries;
}

function urlForensicsPipelineAssemblyBuildChangedUrls(assemblyContext, items) {
  const changedUrlEntries = [];
  const seenChangedUrlKeys = new Set();

  (items || []).forEach(function inspectItem(item) {
    const originalUrl = assemblyContext.convertValueToString(item.original).trim();
    const replacementUrl = assemblyContext.convertValueToString(item.replacementUrl).trim();

    if (!originalUrl || !replacementUrl || replacementUrl === originalUrl) {
      return;
    }

    const changedUrlKey = originalUrl + "=>" + replacementUrl;
    if (seenChangedUrlKeys.has(changedUrlKey)) {
      return;
    }

    seenChangedUrlKeys.add(changedUrlKey);
    changedUrlEntries.push({
      original: originalUrl,
      finalUrl: replacementUrl,
      finalBaseUrl: assemblyContext.extractBaseUrl(replacementUrl),
      type: urlForensicsPipelineAssemblyGetItemDisplayType(assemblyContext, item)
    });
  });

  return changedUrlEntries;
}

function urlForensicsPipelineAssemblyBuildFinalUrlEntries(assemblyContext, items) {
  return (items || []).flatMap(function buildEntriesForItem(item) {
    const detectedType = urlForensicsPipelineAssemblyGetItemDisplayType(assemblyContext, item);

    return urlForensicsPipelineAssemblyGetItemFinalUrls(assemblyContext, item).map(function createTypedFinalUrlEntry(finalUrl) {
      return assemblyContext.buildFinalUrlEntry(finalUrl, { detectedType: detectedType });
    });
  });
}

function urlForensicsPipelineAssemblyCreate(options) {
  const assemblyContext = urlForensicsPipelineAssemblyCreateContext(options);

  return Object.freeze({
    appendUniqueItemNote: urlForensicsPipelineAssemblyAppendUniqueItemNote,
    buildChangedUrls: function buildChangedUrls(items) {
      return urlForensicsPipelineAssemblyBuildChangedUrls(assemblyContext, items);
    },
    buildDigestEntries: function buildDigestEntries(rawText, items, optionBag) {
      return urlForensicsPipelineAssemblyBuildDigestEntries(assemblyContext, rawText, items, optionBag);
    },
    buildFinalUrlEntries: function buildFinalUrlEntries(items) {
      return urlForensicsPipelineAssemblyBuildFinalUrlEntries(assemblyContext, items);
    },
    buildStandaloneFinalUrls: function buildStandaloneFinalUrls(items) {
      return urlForensicsPipelineAssemblyBuildStandaloneFinalUrls(assemblyContext, items);
    },
    didItemStripTrackingParameters: urlForensicsPipelineAssemblyDidItemStripTrackingParameters,
    findNearbyTitle: function findNearbyTitle(lines, lineIndex) {
      return urlForensicsPipelineAssemblyFindNearbyTitle(assemblyContext, lines, lineIndex);
    },
    getItemDisplayType: function getItemDisplayType(item) {
      return urlForensicsPipelineAssemblyGetItemDisplayType(assemblyContext, item);
    },
    getItemFinalUrls: function getItemFinalUrls(item) {
      return urlForensicsPipelineAssemblyGetItemFinalUrls(assemblyContext, item);
    },
    getItemTrackerCleanupEntries: urlForensicsPipelineAssemblyGetItemTrackerCleanupEntries,
    getPreferredReplacementUrl: function getPreferredReplacementUrl(item) {
      return urlForensicsPipelineAssemblyGetPreferredReplacementUrl(assemblyContext, item);
    },
    locateLineForOriginal: function locateLineForOriginal(rawText, originalUrl, fallbackStartIndex) {
      return urlForensicsPipelineAssemblyLocateLineForOriginal(assemblyContext, rawText, originalUrl, fallbackStartIndex);
    },
    stripTrackingParametersFromResolvedUrls: function stripTrackingParametersFromResolvedUrls(item, pipelineSettings) {
      return urlForensicsPipelineAssemblyStripTrackingParametersFromResolvedUrls(assemblyContext, item, pipelineSettings);
    }
  });
}

(function attachUrlForensicsPipelineAssembly(globalScope) {
  const pipelineAssembly = Object.freeze({
    create: urlForensicsPipelineAssemblyCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineAssembly;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineAssembly = pipelineAssembly;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
