// Shared URL resolution and classification helpers for the URL Forensics pipeline.
"use strict";

// Function: create URL resolver context.
function urlForensicsPipelineUrlCreateResolverContext(pipelineBase) {
  if (!pipelineBase || !pipelineBase.regularExpressions) {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  return Object.freeze({
    regularExpressions: pipelineBase.regularExpressions,
    preferredTrackingParameterNames: pipelineBase.preferredTrackingParameterNames,
    trackingHostKeywords: pipelineBase.trackingHostKeywords,
    convertValueToString: pipelineBase.convertValueToString,
    resolvePipelineSettings: pipelineBase.resolvePipelineSettings
  });
}

// Function: peel URL token.
function urlForensicsPipelineUrlPeel(resolverContext, urlValue, options) {
  const pipelineSettings = resolverContext.resolvePipelineSettings(options);
  let peeledUrl = resolverContext.convertValueToString(urlValue).trim();
  const cleanupNotes = [];

  if (!pipelineSettings.enableUrlNormalizationRepair) {
    return {
      value: peeledUrl,
      notes: cleanupNotes
    };
  }

  if (resolverContext.regularExpressions.trailingUrlPunctuation.test(peeledUrl)) {
    peeledUrl = peeledUrl.replace(resolverContext.regularExpressions.trailingUrlPunctuation, "");
    cleanupNotes.push("TRAILING_PUNCT_REMOVED");
  }

  if (/^https?:\/([^/])/.test(peeledUrl)) {
    peeledUrl = peeledUrl.replace(/^https?:\/([^/])/, "https://$1");
    cleanupNotes.push("PROTOCOL_REPAIRED");
  }

  return {
    value: peeledUrl,
    notes: cleanupNotes
  };
}

// Function: decode URL component value.
function urlForensicsPipelineUrlDecodeValue(valueToDecode) {
  try {
    return decodeURIComponent(valueToDecode);
  } catch {
    return valueToDecode;
  }
}

// Function: decode URL component repeatedly.
function urlForensicsPipelineUrlDecodeRepeated(valueToDecode, maximumRounds) {
  let decodedValue = valueToDecode;
  const totalDecodePasses = maximumRounds || 3;

  for (let decodeRoundIndex = 0; decodeRoundIndex < totalDecodePasses; decodeRoundIndex += 1) {
    const nextDecodedValue = urlForensicsPipelineUrlDecodeValue(decodedValue);
    if (nextDecodedValue === decodedValue) break;
    decodedValue = nextDecodedValue;
  }

  return decodedValue;
}

// Function: extract first absolute URL.
function urlForensicsPipelineUrlExtractFirstAbsoluteUrl(resolverContext, valueToInspect) {
  const candidateText = resolverContext.convertValueToString(valueToInspect).trim();

  if (!candidateText) {
    return null;
  }

  const directLeadingMatch = candidateText.match(/^https?:\/\/[^\s<>"']+/i);
  if (directLeadingMatch) {
    return directLeadingMatch[0];
  }

  const embeddedUrlMatch = candidateText.match(/https?:\/\/[^\s<>"']+/i);
  return embeddedUrlMatch ? embeddedUrlMatch[0] : null;
}

// Function: find first URL candidate.
function urlForensicsPipelineUrlFirstCandidate(resolverContext, candidateValues) {
  for (let valueIndex = 0; valueIndex < candidateValues.length; valueIndex += 1) {
    const rawCandidateValue = resolverContext.convertValueToString(candidateValues[valueIndex]).trim();

    if (!rawCandidateValue) {
      continue;
    }

    const decodedCandidateValue = urlForensicsPipelineUrlDecodeRepeated(rawCandidateValue, 4);
    const extractedAbsoluteUrl = urlForensicsPipelineUrlExtractFirstAbsoluteUrl(resolverContext, decodedCandidateValue);

    if (extractedAbsoluteUrl) {
      return extractedAbsoluteUrl;
    }
  }

  return null;
}

// Function: check likely tracker host.
function urlForensicsPipelineUrlIsLikelyTrackerHost(resolverContext, hostName) {
  const normalizedHostName = resolverContext.convertValueToString(hostName).toLowerCase();

  if (!normalizedHostName) {
    return false;
  }

  return resolverContext.trackingHostKeywords.some(function hasTrackingKeyword(keyword) {
    return normalizedHostName.includes(keyword);
  });
}

// Function: extract tracking destination candidates.
function urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, urlValue) {
  const foundDestinationUrls = [];
  const seenDestinationUrls = new Set();
  const trimmedUrlValue = resolverContext.convertValueToString(urlValue).trim();

  // Function: remember destination candidate.
  function rememberDestinationCandidate(candidateValue) {
    const extractedAbsoluteUrl = urlForensicsPipelineUrlExtractFirstAbsoluteUrl(resolverContext, candidateValue);

    if (!extractedAbsoluteUrl || extractedAbsoluteUrl === trimmedUrlValue || seenDestinationUrls.has(extractedAbsoluteUrl)) {
      return;
    }

    seenDestinationUrls.add(extractedAbsoluteUrl);
    foundDestinationUrls.push(extractedAbsoluteUrl);
  }

  let parsedUrl = null;

  try {
    parsedUrl = new URL(trimmedUrlValue);
  } catch {
    parsedUrl = null;
  }

  if (parsedUrl) {
    resolverContext.preferredTrackingParameterNames.forEach(function inspectTrackingParameter(parameterName) {
      parsedUrl.searchParams.getAll(parameterName).forEach(function addTrackingParameterValue(parameterValue) {
        rememberDestinationCandidate(urlForensicsPipelineUrlDecodeRepeated(parameterValue, 4));
      });
    });

    parsedUrl.searchParams.forEach(function inspectAllSearchParameterValues(parameterValue) {
      rememberDestinationCandidate(urlForensicsPipelineUrlDecodeRepeated(parameterValue, 4));
    });

    if (urlForensicsPipelineUrlIsLikelyTrackerHost(resolverContext, parsedUrl.hostname)) {
      rememberDestinationCandidate(urlForensicsPipelineUrlDecodeRepeated(trimmedUrlValue, 4));
    }
  }

  const embeddedTrackingMatches = [...trimmedUrlValue.matchAll(resolverContext.regularExpressions.embeddedTrackingParameter)];
  embeddedTrackingMatches.forEach(function inspectEmbeddedTrackingMatch(embeddedMatch) {
    rememberDestinationCandidate(urlForensicsPipelineUrlDecodeRepeated(embeddedMatch[1], 4));
  });

  return foundDestinationUrls;
}

// Function: extract primary tracking destination.
function urlForensicsPipelineUrlExtractTracking(resolverContext, urlValue) {
  const detectedTrackingCandidates = urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, urlValue);
  return detectedTrackingCandidates.length ? detectedTrackingCandidates[0] : null;
}

// Function: split merged URL string.
function urlForensicsPipelineUrlSplitMerged(resolverContext, urlValue) {
  const mergedUrlSegments = resolverContext.convertValueToString(urlValue).match(/https?:\/\/.*?(?=https?:\/\/|$)/g);
  return mergedUrlSegments && mergedUrlSegments.length ? mergedUrlSegments : [resolverContext.convertValueToString(urlValue)];
}

// Function: queue resolved destination candidates.
function urlForensicsPipelineUrlQueueDestinationCandidates(queueState, destinationCandidates, currentQueueEntry) {
  destinationCandidates.forEach(function queueDestinationCandidate(candidateUrl) {
    if (queueState.seenQueuedUrls.has(candidateUrl)) {
      return;
    }

    queueState.seenQueuedUrls.add(candidateUrl);
    queueState.pendingUrlQueue.push({
      value: candidateUrl,
      depth: currentQueueEntry.depth + 1
    });
  });
}

// Function: resolve URL.
function urlForensicsPipelineUrlResolveURL(resolverContext, urlValue) {
  const queueState = {
    pendingUrlQueue: [{ value: urlValue, depth: 0 }],
    seenQueuedUrls: new Set([urlValue])
  };
  const resolvedLeafUrls = [];
  const seenLeafUrls = new Set();
  const maximumResolutionDepth = 6;

  while (queueState.pendingUrlQueue.length) {
    const currentQueueEntry = queueState.pendingUrlQueue.shift();
    const mergedUrlParts = urlForensicsPipelineUrlSplitMerged(resolverContext, currentQueueEntry.value);

    mergedUrlParts.forEach(function inspectMergedUrlPart(mergedUrlPart) {
      const destinationCandidates = urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, mergedUrlPart);

      if (destinationCandidates.length && currentQueueEntry.depth < maximumResolutionDepth) {
        urlForensicsPipelineUrlQueueDestinationCandidates(queueState, destinationCandidates, currentQueueEntry);
        return;
      }

      if (!seenLeafUrls.has(mergedUrlPart)) {
        seenLeafUrls.add(mergedUrlPart);
        resolvedLeafUrls.push(mergedUrlPart);
      }
    });
  }

  return resolvedLeafUrls.length ? resolvedLeafUrls : [urlValue];
}

// Function: resolve URL with minimal recursive normalization.
function urlForensicsPipelineUrlResolveMinimalRecursive(resolverContext, urlValue, options) {
  const seenIntermediateUrls = new Set();
  const pipelineSettings = resolverContext.resolvePipelineSettings(options);
  let currentUrlValue = resolverContext.convertValueToString(urlValue).trim();
  let safetyGuardCount = 0;

  if (!pipelineSettings.enableUrlNormalizationRepair) {
    return currentUrlValue;
  }

  while (currentUrlValue && !seenIntermediateUrls.has(currentUrlValue) && safetyGuardCount < 24) {
    safetyGuardCount += 1;
    seenIntermediateUrls.add(currentUrlValue);

    const peeledUrl = urlForensicsPipelineUrlPeel(resolverContext, currentUrlValue, pipelineSettings).value;
    const decodedUrl = urlForensicsPipelineUrlDecodeRepeated(peeledUrl, 4);
    const resolvedCandidates = urlForensicsPipelineUrlResolveURL(resolverContext, decodedUrl);
    const validResolvedCandidates = resolvedCandidates.filter(urlForensicsPipelineUrlIsValidURL);
    const preferredNextUrl = resolverContext.convertValueToString(validResolvedCandidates[0] || resolvedCandidates[0] || decodedUrl || currentUrlValue).trim();

    if (!preferredNextUrl || preferredNextUrl === currentUrlValue) {
      break;
    }

    currentUrlValue = preferredNextUrl;
  }

  return currentUrlValue || resolverContext.convertValueToString(urlValue).trim();
}

// Function: check valid URL.
function urlForensicsPipelineUrlIsValidURL(urlValue) {
  try {
    new URL(urlValue);
    return true;
  } catch {
    return false;
  }
}

// Function: extract host.
function urlForensicsPipelineUrlExtractHost(urlValue) {
  try {
    return new URL(urlValue).hostname;
  } catch {
    return "";
  }
}

// Function: extract base URL.
function urlForensicsPipelineUrlExtractBaseUrl(urlValue) {
  try {
    const parsedUrl = new URL(urlValue);
    return parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");
  } catch {
    return urlValue;
  }
}

// Function: extract origin URL.
function urlForensicsPipelineUrlExtractOriginUrl(urlValue) {
  try {
    const parsedUrl = new URL(urlValue);
    return parsedUrl.protocol + "//" + parsedUrl.host;
  } catch {
    return urlValue;
  }
}

// Function: build final URL display name.
function urlForensicsPipelineUrlBuildFinalUrlDisplayName(resolverContext, urlValue) {
  const trimmedUrlValue = resolverContext.convertValueToString(urlValue).trim();
  return urlForensicsPipelineUrlExtractOriginUrl(trimmedUrlValue) || trimmedUrlValue;
}

// Function: build final URL link text.
function urlForensicsPipelineUrlBuildFinalUrlLinkText(resolverContext, finalUrlEntry) {
  const finalUrlLabel = resolverContext.convertValueToString(finalUrlEntry && finalUrlEntry.label).trim();
  const finalUrlType = resolverContext.convertValueToString(finalUrlEntry && finalUrlEntry.type).trim();

  if (!finalUrlLabel) {
    return finalUrlType;
  }

  return finalUrlType ? finalUrlLabel + " (" + finalUrlType + ")" : finalUrlLabel;
}

// Function: build final URL entry.
function urlForensicsPipelineUrlBuildFinalUrlEntry(resolverContext, urlValue, options) {
  const optionBag = options || {};
  const trimmedUrlValue = resolverContext.convertValueToString(urlValue).trim();
  const hostName = urlForensicsPipelineUrlExtractHost(trimmedUrlValue);
  const detectedType = resolverContext.convertValueToString(optionBag.detectedType || optionBag.type).trim();

  return {
    url: trimmedUrlValue,
    host: hostName,
    type: detectedType || urlForensicsPipelineUrlClassify(resolverContext, hostName),
    label: urlForensicsPipelineUrlBuildFinalUrlDisplayName(resolverContext, trimmedUrlValue)
  };
}

// Function: classify host.
function urlForensicsPipelineUrlClassify(resolverContext, hostName) {
  const normalizedHostName = resolverContext.convertValueToString(hostName).toLowerCase();

  if (!normalizedHostName) return "unknown";
  if (normalizedHostName.includes("list-manage")) return "publisher";
  if (
    normalizedHostName.includes("rs6.net") ||
    normalizedHostName.includes("kajabimail") ||
    normalizedHostName.includes("ymlpmail") ||
    normalizedHostName.includes("ccsend.com") ||
    normalizedHostName.includes("mailchi.mp")
  ) return "newsletter";
  if (/track|trk|click|redirect/i.test(normalizedHostName)) return "tracker";
  return "destination";
}

// Function: classify URL value.
function urlForensicsPipelineUrlClassifyUrlValue(resolverContext, urlValue) {
  const trimmedUrlValue = resolverContext.convertValueToString(urlValue).trim();
  const hostName = urlForensicsPipelineUrlExtractHost(trimmedUrlValue);
  const classifiedHostType = urlForensicsPipelineUrlClassify(resolverContext, hostName);

  if (classifiedHostType !== "destination") {
    return classifiedHostType;
  }

  if (
    urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, trimmedUrlValue).length ||
    urlForensicsPipelineUrlIsLikelyTrackerHost(resolverContext, hostName)
  ) {
    return "tracker";
  }

  return classifiedHostType;
}

// Function: create pipeline URL resolver helpers.
function urlForensicsPipelineUrlResolverCreate(pipelineBase) {
  const resolverContext = urlForensicsPipelineUrlCreateResolverContext(pipelineBase);

  return Object.freeze({
    buildFinalUrlDisplayName: function buildFinalUrlDisplayName(urlValue) {
      return urlForensicsPipelineUrlBuildFinalUrlDisplayName(resolverContext, urlValue);
    },
    buildFinalUrlEntry: function buildFinalUrlEntry(urlValue, options) {
      return urlForensicsPipelineUrlBuildFinalUrlEntry(resolverContext, urlValue, options);
    },
    buildFinalUrlLinkText: function buildFinalUrlLinkText(finalUrlEntry) {
      return urlForensicsPipelineUrlBuildFinalUrlLinkText(resolverContext, finalUrlEntry);
    },
    classify: function classify(hostName) {
      return urlForensicsPipelineUrlClassify(resolverContext, hostName);
    },
    classifyUrlValue: function classifyUrlValue(urlValue) {
      return urlForensicsPipelineUrlClassifyUrlValue(resolverContext, urlValue);
    },
    decodeRepeated: urlForensicsPipelineUrlDecodeRepeated,
    decodeValue: urlForensicsPipelineUrlDecodeValue,
    extractBaseUrl: urlForensicsPipelineUrlExtractBaseUrl,
    extractFirstAbsoluteUrl: function extractFirstAbsoluteUrl(valueToInspect) {
      return urlForensicsPipelineUrlExtractFirstAbsoluteUrl(resolverContext, valueToInspect);
    },
    extractHost: urlForensicsPipelineUrlExtractHost,
    extractOriginUrl: urlForensicsPipelineUrlExtractOriginUrl,
    extractTracking: function extractTracking(urlValue) {
      return urlForensicsPipelineUrlExtractTracking(resolverContext, urlValue);
    },
    extractTrackingCandidates: function extractTrackingCandidates(urlValue) {
      return urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, urlValue);
    },
    firstUrlCandidate: function firstUrlCandidate(candidateValues) {
      return urlForensicsPipelineUrlFirstCandidate(resolverContext, candidateValues);
    },
    isLikelyTrackerHost: function isLikelyTrackerHost(hostName) {
      return urlForensicsPipelineUrlIsLikelyTrackerHost(resolverContext, hostName);
    },
    isValidURL: urlForensicsPipelineUrlIsValidURL,
    peel: function peel(urlValue, options) {
      return urlForensicsPipelineUrlPeel(resolverContext, urlValue, options);
    },
    resolveURL: function resolveURL(urlValue) {
      return urlForensicsPipelineUrlResolveURL(resolverContext, urlValue);
    },
    resolveURLMinimalRecursive: function resolveURLMinimalRecursive(urlValue, options) {
      return urlForensicsPipelineUrlResolveMinimalRecursive(resolverContext, urlValue, options);
    },
    splitMerged: function splitMerged(urlValue) {
      return urlForensicsPipelineUrlSplitMerged(resolverContext, urlValue);
    }
  });
}

// Function: attach pipeline URL resolver factory.
(function attachUrlForensicsPipelineUrlResolver(globalScope) {
  const pipelineUrlResolver = Object.freeze({
    create: urlForensicsPipelineUrlResolverCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineUrlResolver;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineUrlResolver = pipelineUrlResolver;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
