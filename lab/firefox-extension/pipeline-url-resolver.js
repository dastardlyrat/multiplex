// Shared URL resolution and classification helpers for the URL Forensics pipeline.
"use strict";

// Function: create URL resolver context.
function urlForensicsPipelineUrlCreateResolverContext(pipelineBase) {
  if (!pipelineBase || !pipelineBase.regularExpressions) {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  return Object.freeze({
    regularExpressions: pipelineBase.regularExpressions,
    ruleConfiguration: pipelineBase.ruleConfiguration || Object.freeze({}),
    preferredTrackingParameterNames: pipelineBase.preferredTrackingParameterNames,
    trackingHostKeywords: pipelineBase.trackingHostKeywords,
    trackingParameterModel: pipelineBase.trackingParameterModel || null,
    convertValueToString: pipelineBase.convertValueToString,
    resolvePipelineSettings: pipelineBase.resolvePipelineSettings
  });
}

// Function: create regular expression from declarative pattern.
function urlForensicsPipelineUrlCreateRegularExpression(patternDefinition) {
  if (!patternDefinition || typeof patternDefinition !== "object" || !patternDefinition.source) {
    return null;
  }

  return new RegExp(String(patternDefinition.source), String(patternDefinition.flags || ""));
}

// Function: normalize email address value.
function urlForensicsPipelineUrlNormalizeEmailAddress(value) {
  const safeValue = String(value || "").trim().toLowerCase();
  const mailtoMatch = safeValue.match(/^mailto:\s*([^?]+)/i);
  const candidateValue = mailtoMatch ? mailtoMatch[1].trim() : safeValue;

  if (!candidateValue) {
    return "";
  }

  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(candidateValue)
    ? candidateValue
    : "";
}

// Function: check whether value is email-like.
function urlForensicsPipelineUrlIsEmailValue(resolverContext, value) {
  return !!urlForensicsPipelineUrlNormalizeEmailAddress(resolverContext.convertValueToString(value).trim());
}

// Function: normalize link-like value.
function urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, value) {
  const trimmedValue = resolverContext.convertValueToString(value).trim();
  const mailtoMatch = trimmedValue.match(/^mailto:\s*([^?]+)(.*)$/i);
  const normalizedEmailAddress = urlForensicsPipelineUrlNormalizeEmailAddress(trimmedValue);

  if (!normalizedEmailAddress) {
    return trimmedValue;
  }

  if (mailtoMatch) {
    return "mailto:" + normalizedEmailAddress + resolverContext.convertValueToString(mailtoMatch[2] || "");
  }

  return "mailto:" + normalizedEmailAddress;
}

// Function: extract normalized email host.
function urlForensicsPipelineUrlExtractEmailHost(value) {
  const normalizedEmailAddress = urlForensicsPipelineUrlNormalizeEmailAddress(value);

  if (!normalizedEmailAddress || normalizedEmailAddress.indexOf("@") === -1) {
    return "";
  }

  return normalizedEmailAddress.split("@")[1] || "";
}

// Function: append unique cleanup note.
function urlForensicsPipelineUrlAppendCleanupNote(cleanupNotes, noteText) {
  if (noteText && cleanupNotes.indexOf(noteText) === -1) {
    cleanupNotes.push(noteText);
  }
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

  ((resolverContext.ruleConfiguration.repair && resolverContext.ruleConfiguration.repair.peelTransforms) || []).forEach(function applyPeelTransform(transformDefinition) {
    const matchPattern = urlForensicsPipelineUrlCreateRegularExpression(transformDefinition && transformDefinition.match);
    const replaceWith = resolverContext.convertValueToString(transformDefinition && transformDefinition.replaceWith);
    const nextValue = matchPattern ? peeledUrl.replace(matchPattern, replaceWith) : peeledUrl;

    if (nextValue === peeledUrl) {
      return;
    }

    peeledUrl = nextValue;
    urlForensicsPipelineUrlAppendCleanupNote(cleanupNotes, transformDefinition && transformDefinition.note
      ? transformDefinition.note
      : "NORMALIZATION_REPAIRED");
  });

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

// Function: normalize destination candidate value.
function urlForensicsPipelineUrlNormalizeDestinationCandidateValue(resolverContext, candidateValue, maximumRounds) {
  let currentValue = resolverContext.convertValueToString(candidateValue).trim();
  const totalDecodePasses = maximumRounds || 4;

  if (!currentValue) {
    return null;
  }

  for (let decodeRoundIndex = 0; decodeRoundIndex <= totalDecodePasses; decodeRoundIndex += 1) {
    if (urlForensicsPipelineUrlIsValidURL(currentValue)) {
      return currentValue;
    }

    const extractedAbsoluteUrl = urlForensicsPipelineUrlExtractFirstAbsoluteUrl(resolverContext, currentValue);
    if (extractedAbsoluteUrl && urlForensicsPipelineUrlIsValidURL(extractedAbsoluteUrl)) {
      return extractedAbsoluteUrl;
    }

    const nextDecodedValue = urlForensicsPipelineUrlDecodeValue(currentValue);
    if (nextDecodedValue === currentValue) {
      break;
    }

    currentValue = resolverContext.convertValueToString(nextDecodedValue).trim();
  }

  return urlForensicsPipelineUrlExtractFirstAbsoluteUrl(resolverContext, currentValue);
}

// Function: find first URL candidate.
function urlForensicsPipelineUrlFirstCandidate(resolverContext, candidateValues) {
  for (let valueIndex = 0; valueIndex < candidateValues.length; valueIndex += 1) {
    const extractedAbsoluteUrl = urlForensicsPipelineUrlNormalizeDestinationCandidateValue(
      resolverContext,
      candidateValues[valueIndex],
      4
    );

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

  if (urlForensicsPipelineUrlIsEmailValue(resolverContext, trimmedUrlValue)) {
    return foundDestinationUrls;
  }

  // Function: remember destination candidate.
  function rememberDestinationCandidate(candidateValue) {
    const extractedAbsoluteUrl = urlForensicsPipelineUrlNormalizeDestinationCandidateValue(
      resolverContext,
      candidateValue,
      4
    );

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
        rememberDestinationCandidate(parameterValue);
      });
    });

    parsedUrl.searchParams.forEach(function inspectAllSearchParameterValues(parameterValue) {
      rememberDestinationCandidate(parameterValue);
    });
  }

  const embeddedTrackingMatches = [...trimmedUrlValue.matchAll(resolverContext.regularExpressions.embeddedTrackingParameter)];
  embeddedTrackingMatches.forEach(function inspectEmbeddedTrackingMatch(embeddedMatch) {
    rememberDestinationCandidate(embeddedMatch[1]);
  });

  return foundDestinationUrls;
}

// Function: extract primary tracking destination.
function urlForensicsPipelineUrlExtractTracking(resolverContext, urlValue) {
  const detectedTrackingCandidates = urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, urlValue);
  return detectedTrackingCandidates.length ? detectedTrackingCandidates[0] : null;
}

// Function: check whether a parameter name is a known tracking parameter.
function urlForensicsPipelineUrlIsKnownTrackingParameter(resolverContext, parameterName, trackingParameterFilters) {
  const normalizedParameterName = resolverContext.convertValueToString(parameterName).trim().toLowerCase();

  if (!normalizedParameterName || !resolverContext.trackingParameterModel) {
    return false;
  }

  return resolverContext.trackingParameterModel.matchesTrackingParameterName(
    trackingParameterFilters,
    normalizedParameterName
  );
}

// Function: extract known tracking parameter names from URL.
function urlForensicsPipelineUrlExtractKnownTrackingParameterNames(resolverContext, urlValue, trackingParameterFilters) {
  const trimmedUrlValue = resolverContext.convertValueToString(urlValue).trim();
  let parsedUrl = null;

  if (!trimmedUrlValue) {
    return [];
  }

  if (urlForensicsPipelineUrlIsEmailValue(resolverContext, trimmedUrlValue)) {
    return [];
  }

  try {
    parsedUrl = new URL(trimmedUrlValue);
  } catch {
    return [];
  }

  return Array.from(new Set(
    Array.from(parsedUrl.searchParams.keys())
      .map(function normalizeSearchParameterName(parameterName) {
        return resolverContext.convertValueToString(parameterName).trim().toLowerCase();
      })
      .filter(function keepKnownTrackingParameter(parameterName) {
        return urlForensicsPipelineUrlIsKnownTrackingParameter(resolverContext, parameterName, trackingParameterFilters);
      })
  ));
}

// Function: format parsed URL value.
function urlForensicsPipelineUrlFormatParsedValue(parsedUrl) {
  const pathnameValue = parsedUrl && parsedUrl.pathname && parsedUrl.pathname !== "/"
    ? parsedUrl.pathname
    : "";

  return String(parsedUrl.origin || "") + pathnameValue + String(parsedUrl.search || "") + String(parsedUrl.hash || "");
}

// Function: strip known tracking parameters.
function urlForensicsPipelineUrlStripKnownTrackingParameters(resolverContext, urlValue, options) {
  const pipelineSettings = resolverContext.resolvePipelineSettings(options);
  const trimmedUrlValue = urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, urlValue);
  const removedParameterNames = [];

  if (!pipelineSettings.stripKnownTrackingParameters || !trimmedUrlValue) {
    return {
      value: trimmedUrlValue,
      removedParameterNames: removedParameterNames
    };
  }

  if (urlForensicsPipelineUrlIsEmailValue(resolverContext, trimmedUrlValue)) {
    return {
      value: trimmedUrlValue,
      removedParameterNames: removedParameterNames
    };
  }

  let parsedUrl = null;

  try {
    parsedUrl = new URL(trimmedUrlValue);
  } catch {
    return {
      value: trimmedUrlValue,
      removedParameterNames: removedParameterNames
    };
  }

  const uniqueParameterNames = Array.from(new Set(Array.from(parsedUrl.searchParams.keys()).map(function normalizeParameterName(parameterName) {
    return resolverContext.convertValueToString(parameterName).trim();
  })));

  uniqueParameterNames.forEach(function removeTrackingParameter(parameterName) {
    if (!urlForensicsPipelineUrlIsKnownTrackingParameter(
      resolverContext,
      parameterName,
      pipelineSettings.trackingParameterFilters
    )) {
      return;
    }

    parsedUrl.searchParams.delete(parameterName);
    removedParameterNames.push(parameterName.toLowerCase());
  });

  if (!removedParameterNames.length) {
    return {
      value: trimmedUrlValue,
      removedParameterNames: removedParameterNames
    };
  }

  return {
    value: urlForensicsPipelineUrlFormatParsedValue(parsedUrl),
    removedParameterNames: removedParameterNames
  };
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
  const normalizedUrlValue = urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, urlValue);

  if (!normalizedUrlValue) {
    return [normalizedUrlValue];
  }

  if (urlForensicsPipelineUrlIsEmailValue(resolverContext, normalizedUrlValue)) {
    return [normalizedUrlValue];
  }

  const queueState = {
    pendingUrlQueue: [{ value: normalizedUrlValue, depth: 0 }],
    seenQueuedUrls: new Set([normalizedUrlValue])
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

  return resolvedLeafUrls.length ? resolvedLeafUrls : [normalizedUrlValue];
}

// Function: resolve URL with minimal recursive normalization.
function urlForensicsPipelineUrlResolveMinimalRecursive(resolverContext, urlValue, options) {
  const seenIntermediateUrls = new Set();
  const pipelineSettings = resolverContext.resolvePipelineSettings(options);
  let currentUrlValue = urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, urlValue);
  let safetyGuardCount = 0;

  if (!pipelineSettings.enableUrlNormalizationRepair) {
    return currentUrlValue;
  }

  if (urlForensicsPipelineUrlIsEmailValue(resolverContext, currentUrlValue)) {
    return currentUrlValue;
  }

  while (currentUrlValue && !seenIntermediateUrls.has(currentUrlValue) && safetyGuardCount < 24) {
    safetyGuardCount += 1;
    seenIntermediateUrls.add(currentUrlValue);

    const peeledUrl = urlForensicsPipelineUrlNormalizeLinkValue(
      resolverContext,
      urlForensicsPipelineUrlPeel(resolverContext, currentUrlValue, pipelineSettings).value
    );
    const decodedUrl = urlForensicsPipelineUrlDecodeRepeated(peeledUrl, 4);
    const resolvedCandidates = urlForensicsPipelineUrlResolveURL(resolverContext, decodedUrl);
    const validResolvedCandidates = resolvedCandidates.filter(urlForensicsPipelineUrlIsValidURL);
    const preferredNextUrl = resolverContext.convertValueToString(validResolvedCandidates[0] || resolvedCandidates[0] || decodedUrl || currentUrlValue).trim();

    if (!preferredNextUrl || preferredNextUrl === currentUrlValue) {
      break;
    }

    currentUrlValue = preferredNextUrl;
  }

  return currentUrlValue || urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, urlValue);
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
  const emailHost = urlForensicsPipelineUrlExtractEmailHost(urlValue);

  if (emailHost) {
    return emailHost;
  }

  try {
    return new URL(urlValue).hostname;
  } catch {
    return "";
  }
}

// Function: extract base URL.
function urlForensicsPipelineUrlExtractBaseUrl(urlValue) {
  const normalizedEmailAddress = urlForensicsPipelineUrlNormalizeEmailAddress(urlValue);

  if (normalizedEmailAddress) {
    return "mailto:" + normalizedEmailAddress;
  }

  try {
    const parsedUrl = new URL(urlValue);
    return parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");
  } catch {
    return urlValue;
  }
}

// Function: extract origin URL.
function urlForensicsPipelineUrlExtractOriginUrl(urlValue) {
  const normalizedEmailAddress = urlForensicsPipelineUrlNormalizeEmailAddress(urlValue);

  if (normalizedEmailAddress) {
    return "mailto:" + normalizedEmailAddress;
  }

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
  const normalizedEmailAddress = urlForensicsPipelineUrlNormalizeEmailAddress(trimmedUrlValue);

  if (normalizedEmailAddress) {
    return normalizedEmailAddress;
  }

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
  const trimmedUrlValue = urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, urlValue);
  const hostName = urlForensicsPipelineUrlExtractHost(trimmedUrlValue);
  const detectedType = resolverContext.convertValueToString(optionBag.detectedType || optionBag.type).trim();

  return {
    url: trimmedUrlValue,
    host: hostName,
    type: detectedType || (urlForensicsPipelineUrlIsEmailValue(resolverContext, trimmedUrlValue)
      ? "email"
      : urlForensicsPipelineUrlClassify(resolverContext, hostName)),
    label: urlForensicsPipelineUrlBuildFinalUrlDisplayName(resolverContext, trimmedUrlValue)
  };
}

// Function: check host classification rule.
function urlForensicsPipelineUrlHostMatchesClassificationRule(hostName, ruleDefinition) {
  const normalizedHostName = String(hostName || "").trim().toLowerCase();
  const safeRuleDefinition = ruleDefinition && typeof ruleDefinition === "object" ? ruleDefinition : {};
  const matchType = String(safeRuleDefinition.matchType || "").trim();

  if (!normalizedHostName || !matchType) {
    return false;
  }

  if (matchType === "hostContains") {
    return normalizedHostName.includes(String(safeRuleDefinition.value || "").trim().toLowerCase());
  }

  if (matchType === "hostContainsAny") {
    return (safeRuleDefinition.values || []).some(function matchAnyHostValue(value) {
      return normalizedHostName.includes(String(value || "").trim().toLowerCase());
    });
  }

  if (matchType === "hostPattern") {
    const pattern = urlForensicsPipelineUrlCreateRegularExpression(safeRuleDefinition.pattern);
    return pattern ? pattern.test(normalizedHostName) : false;
  }

  return false;
}

// Function: classify host.
function urlForensicsPipelineUrlClassify(resolverContext, hostName) {
  const normalizedHostName = resolverContext.convertValueToString(hostName).toLowerCase();
  const hostRules = (resolverContext.ruleConfiguration.classification && resolverContext.ruleConfiguration.classification.hostRules) || [];

  if (!normalizedHostName) return "unknown";

  for (let ruleIndex = 0; ruleIndex < hostRules.length; ruleIndex += 1) {
    if (urlForensicsPipelineUrlHostMatchesClassificationRule(normalizedHostName, hostRules[ruleIndex])) {
      return resolverContext.convertValueToString(hostRules[ruleIndex].type).trim() || "destination";
    }
  }

  return "destination";
}

// Function: classify URL value.
function urlForensicsPipelineUrlClassifyUrlValue(resolverContext, urlValue) {
  const trimmedUrlValue = resolverContext.convertValueToString(urlValue).trim();

  if (urlForensicsPipelineUrlIsEmailValue(resolverContext, trimmedUrlValue)) {
    return "email";
  }

  const hostName = urlForensicsPipelineUrlExtractHost(trimmedUrlValue);
  const classifiedHostType = urlForensicsPipelineUrlClassify(resolverContext, hostName);

  if (classifiedHostType !== "destination") {
    return classifiedHostType;
  }

  if (
    urlForensicsPipelineUrlExtractTrackingCandidates(resolverContext, trimmedUrlValue).length ||
    urlForensicsPipelineUrlIsLikelyTrackerHost(resolverContext, hostName) ||
    urlForensicsPipelineUrlExtractKnownTrackingParameterNames(resolverContext, trimmedUrlValue).length
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
    extractKnownTrackingParameterNames: function extractKnownTrackingParameterNames(urlValue, trackingParameterFilters) {
      return urlForensicsPipelineUrlExtractKnownTrackingParameterNames(resolverContext, urlValue, trackingParameterFilters);
    },
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
    isEmailValue: function isEmailValue(urlValue) {
      return urlForensicsPipelineUrlIsEmailValue(resolverContext, urlValue);
    },
    isKnownTrackingParameter: function isKnownTrackingParameter(parameterName) {
      return urlForensicsPipelineUrlIsKnownTrackingParameter(resolverContext, parameterName);
    },
    isValidURL: urlForensicsPipelineUrlIsValidURL,
    normalizeEmailAddress: urlForensicsPipelineUrlNormalizeEmailAddress,
    normalizeLinkValue: function normalizeLinkValue(urlValue) {
      return urlForensicsPipelineUrlNormalizeLinkValue(resolverContext, urlValue);
    },
    peel: function peel(urlValue, options) {
      return urlForensicsPipelineUrlPeel(resolverContext, urlValue, options);
    },
    stripKnownTrackingParameters: function stripKnownTrackingParameters(urlValue, options) {
      return urlForensicsPipelineUrlStripKnownTrackingParameters(resolverContext, urlValue, options);
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
