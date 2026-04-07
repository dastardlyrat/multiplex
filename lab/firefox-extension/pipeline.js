// Function: attach merged link lab pipeline.
(function attachMergedLinkLabPipeline(globalScope, pipelineBase, createPipelineApi) {
  "use strict";

  const pipelineApi = createPipelineApi(globalScope, pipelineBase);

  // Branch: follow this path only when the current condition passes.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineApi;
  }

  // Branch: follow this path only when the current condition passes.
  if (globalScope) {
    globalScope.MergedLinkLabPipeline = pipelineApi;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  // Function: resolve shared pipeline base helpers.
  (function resolveMergedLinkLabPipelineBase(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineBase) {
      return globalScope.urlForensicsPipelineBase;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-base.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: create merged link lab pipeline api.
  // eslint-disable-next-line max-lines-per-function -- Compatibility wrapper while pipeline helper groups move into focused modules.
  function createMergedLinkLabPipelineApi(globalScope, pipelineBase) {
    "use strict";

    const debugApi = globalScope && globalScope.mergedLinkLabDebug ? globalScope.mergedLinkLabDebug : null;
    if (debugApi && typeof debugApi.configure === "function") {
      debugApi.configure({ context: "pipeline", module: "pipeline" });
    }

    if (!pipelineBase || !pipelineBase.regularExpressions) {
      throw new Error("URL Forensics pipeline base helpers are unavailable.");
    }

    const regularExpressions = pipelineBase.regularExpressions;
    const preferredTrackingParameterNames = pipelineBase.preferredTrackingParameterNames;
    const trackingHostKeywords = pipelineBase.trackingHostKeywords;
    const defaultPipelineSettings = pipelineBase.defaultPipelineSettings;
    const convertValueToString = pipelineBase.convertValueToString;
    const resolvePipelineSettings = pipelineBase.resolvePipelineSettings;
    const escapeHtml = pipelineBase.escapeHtml;
    const cleanInputText = pipelineBase.cleanInputText;
    const normalizeLine = pipelineBase.normalizeLine;
    const validateTitle = pipelineBase.validateTitle;
    const normalizeTitle = pipelineBase.normalizeTitle;
    const createDetectedUrlRecord = pipelineBase.createDetectedUrlRecord;

    // Function: get node filter flag.
    function getNodeFilterFlag(flagName, fallbackValue) {
      return pipelineBase.getNodeFilterFlag(globalScope, flagName, fallbackValue);
    }

    // Function: get node type value.
    function getNodeTypeValue(typeName, fallbackValue) {
      return pipelineBase.getNodeTypeValue(globalScope, typeName, fallbackValue);
    }

    // Function: create html parser document.
    function createHtmlParserDocument(sourceMarkup) {
      return pipelineBase.createHtmlParserDocument(globalScope, sourceMarkup);
    }

    // Function: detect urls.
    function detectURLs(textToScan, options) {
      if (debugApi) {
        debugApi.functionIn("pipeline.detectURLs", {
          textLength: convertValueToString(textToScan).length,
          startId: options && options.startId ? options.startId : 1
        });
      }

      const optionBag = options || {};
      const startingRecordId = optionBag.startId || 1;
      const detectedUrlTokens = convertValueToString(textToScan).match(regularExpressions.urlToken) || [];

      if (debugApi) {
        debugApi.variable("pipeline detected url token count assigned", {
          detectedUrlTokenCount: detectedUrlTokens.length
        });
        debugApi.functionOut("pipeline.detectURLs", {
          detectedUrlTokenCount: detectedUrlTokens.length
        });
      }

      // Loop: transform each item in the current collection.
      return detectedUrlTokens.map(function mapDetectedUrlToken(originalUrl, index) {
        if (debugApi && index < 3) {
          debugApi.loop("pipeline detectURLs mapping token", {
            index: index,
            recordId: startingRecordId + index
          });
        }

        return createDetectedUrlRecord(originalUrl, startingRecordId + index);
      });
    }

    // Function: detect urls from html.
    function detectUrlsFromHtml(sourceMarkup) {
      if (debugApi) {
        debugApi.functionIn("pipeline.detectUrlsFromHtml", {
          sourceMarkupLength: convertValueToString(sourceMarkup).length
        });
      }

      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      // Branch: follow this path only when the current condition passes.
      if (!parsedDocument) {
        if (debugApi) {
          debugApi.conditional("pipeline html parser unavailable; falling back to text detection");
        }

        return detectURLs(sourceMarkup);
      }

      const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      const showElementNodes = getNodeFilterFlag("SHOW_ELEMENT", 1);
      const showTextNodes = getNodeFilterFlag("SHOW_TEXT", 4);
      const htmlWalker = rootNode.ownerDocument.createTreeWalker(rootNode, showElementNodes | showTextNodes);
      const detectedItems = [];
      let nextRecordId = 1;
      let currentNode = rootNode;

      // Loop: repeat while the guard condition stays true.
      while (currentNode) {
        const tagName = convertValueToString(currentNode.tagName).toUpperCase();

        // Branch: follow this path only when the current condition passes.
        if (currentNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && tagName === "A") {
          const hrefValue = convertValueToString(currentNode.getAttribute("href")).trim();

          // Branch: follow this path only when the current condition passes.
          if (/^https?:\/\//i.test(hrefValue)) {
            detectedItems.push(createDetectedUrlRecord(hrefValue, nextRecordId));
            nextRecordId += 1;
          }
        }

        // Branch: follow this path only when the current condition passes.
        if (currentNode.nodeType === getNodeTypeValue("TEXT_NODE", 3)) {
          const parentTagName = currentNode.parentElement ? currentNode.parentElement.tagName : "";

          // Branch: follow this path only when the current condition passes.
          if (!regularExpressions.protectedMarkupTag.test(parentTagName)) {
            const matchedTextUrls = detectURLs(currentNode.nodeValue || "", { startId: nextRecordId });
            // Branch: follow this path only when the current condition passes.
            if (matchedTextUrls.length) {
              detectedItems.push.apply(detectedItems, matchedTextUrls);
              nextRecordId += matchedTextUrls.length;
            }
          }
        }

        currentNode = htmlWalker.nextNode();
      }

      if (debugApi) {
        debugApi.functionOut("pipeline.detectUrlsFromHtml", {
          detectedItemCount: detectedItems.length
        });
      }

      return detectedItems;
    }

    // Function: peel.
    function peel(urlValue, options) {
      const pipelineSettings = resolvePipelineSettings(options);
      let peeledUrl = convertValueToString(urlValue).trim();
      const cleanupNotes = [];

      // Branch: follow this path only when the current condition passes.
      if (!pipelineSettings.enableUrlNormalizationRepair) {
        return {
          value: peeledUrl,
          notes: cleanupNotes
        };
      }

      // Branch: follow this path only when the current condition passes.
      if (regularExpressions.trailingUrlPunctuation.test(peeledUrl)) {
        peeledUrl = peeledUrl.replace(regularExpressions.trailingUrlPunctuation, "");
        cleanupNotes.push("TRAILING_PUNCT_REMOVED");
      }

      // Branch: follow this path only when the current condition passes.
      if (/^https?:\/([^/])/.test(peeledUrl)) {
        peeledUrl = peeledUrl.replace(/^https?:\/([^/])/, "https://$1");
        cleanupNotes.push("PROTOCOL_REPAIRED");
      }

      return {
        value: peeledUrl,
        notes: cleanupNotes
      };
    }

    // Function: decode value.
    function decodeValue(valueToDecode) {
      // Branch: try the primary operation before handling failures.
      try {
        return decodeURIComponent(valueToDecode);
      // Branch: handle errors from the guarded operation.
      } catch {
        return valueToDecode;
      }
    }

    // Function: decode repeated.
    function decodeRepeated(valueToDecode, maximumRounds) {
      let decodedValue = valueToDecode;
      const totalDecodePasses = maximumRounds || 3;

      // Loop: step through the current range or collection.
      for (let decodeRoundIndex = 0; decodeRoundIndex < totalDecodePasses; decodeRoundIndex += 1) {
        const nextDecodedValue = decodeValue(decodedValue);
        // Branch: follow this path only when the current condition passes.
        if (nextDecodedValue === decodedValue) break;
        decodedValue = nextDecodedValue;
      }

      return decodedValue;
    }

    // Function: extract first absolute url.
    function extractFirstAbsoluteUrl(valueToInspect) {
      const candidateText = convertValueToString(valueToInspect).trim();

      // Branch: follow this path only when the current condition passes.
      if (!candidateText) {
        return null;
      }

      const directLeadingMatch = candidateText.match(/^https?:\/\/[^\s<>"']+/i);
      // Branch: follow this path only when the current condition passes.
      if (directLeadingMatch) {
        return directLeadingMatch[0];
      }

      const embeddedUrlMatch = candidateText.match(/https?:\/\/[^\s<>"']+/i);
      return embeddedUrlMatch ? embeddedUrlMatch[0] : null;
    }

    // Function: first url candidate.
    function firstUrlCandidate(candidateValues) {
      // Loop: step through the current range or collection.
      for (let valueIndex = 0; valueIndex < candidateValues.length; valueIndex += 1) {
        const rawCandidateValue = convertValueToString(candidateValues[valueIndex]).trim();

        // Branch: follow this path only when the current condition passes.
        if (!rawCandidateValue) {
          continue;
        }

        const decodedCandidateValue = decodeRepeated(rawCandidateValue, 4);
        const extractedAbsoluteUrl = extractFirstAbsoluteUrl(decodedCandidateValue);

        // Branch: follow this path only when the current condition passes.
        if (extractedAbsoluteUrl) {
          return extractedAbsoluteUrl;
        }
      }

      return null;
    }

    // Function: is likely tracker host.
    function isLikelyTrackerHost(hostName) {
      const normalizedHostName = convertValueToString(hostName).toLowerCase();

      // Branch: follow this path only when the current condition passes.
      if (!normalizedHostName) {
        return false;
      }

      // Loop: stop once any item matches the current check.
      return trackingHostKeywords.some(function hasTrackingKeyword(keyword) {
        return normalizedHostName.includes(keyword);
      });
    }

    // Function: extract tracking candidates.
    function extractTrackingCandidates(urlValue) {
      const foundDestinationUrls = [];
      const seenDestinationUrls = new Set();
      const trimmedUrlValue = convertValueToString(urlValue).trim();

      // Function: remember destination candidate.
      function rememberDestinationCandidate(candidateValue) {
        const extractedAbsoluteUrl = extractFirstAbsoluteUrl(candidateValue);

        // Branch: follow this path only when the current condition passes.
        if (!extractedAbsoluteUrl || extractedAbsoluteUrl === trimmedUrlValue || seenDestinationUrls.has(extractedAbsoluteUrl)) {
          return;
        }

        seenDestinationUrls.add(extractedAbsoluteUrl);
        foundDestinationUrls.push(extractedAbsoluteUrl);
      }

      let parsedUrl = null;

      // Branch: try the primary operation before handling failures.
      try {
        parsedUrl = new URL(trimmedUrlValue);
      // Branch: handle errors from the guarded operation.
      } catch {
        parsedUrl = null;
      }

      // Branch: follow this path only when the current condition passes.
      if (parsedUrl) {
        // Loop: iterate through each item in the current collection.
        preferredTrackingParameterNames.forEach(function inspectTrackingParameter(parameterName) {
          // Loop: iterate through each item in the current collection.
          parsedUrl.searchParams.getAll(parameterName).forEach(function addTrackingParameterValue(parameterValue) {
            rememberDestinationCandidate(decodeRepeated(parameterValue, 4));
          });
        });

        // Loop: iterate through each item in the current collection.
        parsedUrl.searchParams.forEach(function inspectAllSearchParameterValues(parameterValue) {
          rememberDestinationCandidate(decodeRepeated(parameterValue, 4));
        });

        // Branch: follow this path only when the current condition passes.
        if (isLikelyTrackerHost(parsedUrl.hostname)) {
          rememberDestinationCandidate(decodeRepeated(trimmedUrlValue, 4));
        }
      }

      const embeddedTrackingMatches = [...trimmedUrlValue.matchAll(regularExpressions.embeddedTrackingParameter)];
      // Loop: iterate through each item in the current collection.
      embeddedTrackingMatches.forEach(function inspectEmbeddedTrackingMatch(embeddedMatch) {
        rememberDestinationCandidate(decodeRepeated(embeddedMatch[1], 4));
      });

      return foundDestinationUrls;
    }

    // Function: extract tracking.
    function extractTracking(urlValue) {
      const detectedTrackingCandidates = extractTrackingCandidates(urlValue);
      return detectedTrackingCandidates.length ? detectedTrackingCandidates[0] : null;
    }

    // Function: split merged.
    function splitMerged(urlValue) {
      const mergedUrlSegments = convertValueToString(urlValue).match(/https?:\/\/.*?(?=https?:\/\/|$)/g);
      return mergedUrlSegments && mergedUrlSegments.length ? mergedUrlSegments : [convertValueToString(urlValue)];
    }

    // Function: resolve url.
    function resolveURL(urlValue) {
      const pendingUrlQueue = [{ value: urlValue, depth: 0 }];
      const seenQueuedUrls = new Set([urlValue]);
      const resolvedLeafUrls = [];
      const seenLeafUrls = new Set();
      const maximumResolutionDepth = 6;

      // Loop: repeat while the guard condition stays true.
      while (pendingUrlQueue.length) {
        const currentQueueEntry = pendingUrlQueue.shift();
        const mergedUrlParts = splitMerged(currentQueueEntry.value);

        // Loop: iterate through each item in the current collection.
        mergedUrlParts.forEach(function inspectMergedUrlPart(mergedUrlPart) {
          const destinationCandidates = extractTrackingCandidates(mergedUrlPart);

          // Branch: follow this path only when the current condition passes.
          if (destinationCandidates.length && currentQueueEntry.depth < maximumResolutionDepth) {
            // Loop: iterate through each item in the current collection.
            destinationCandidates.forEach(function queueDestinationCandidate(candidateUrl) {
              // Branch: follow this path only when the current condition passes.
              if (seenQueuedUrls.has(candidateUrl)) {
                return;
              }

              seenQueuedUrls.add(candidateUrl);
              pendingUrlQueue.push({
                value: candidateUrl,
                depth: currentQueueEntry.depth + 1
              });
            });

            return;
          }

          // Branch: follow this path only when the current condition passes.
          if (!seenLeafUrls.has(mergedUrlPart)) {
            seenLeafUrls.add(mergedUrlPart);
            resolvedLeafUrls.push(mergedUrlPart);
          }
        });
      }

      return resolvedLeafUrls.length ? resolvedLeafUrls : [urlValue];
    }

    // Function: resolve urlminimal recursive.
    function resolveURLMinimalRecursive(urlValue, options) {
      const seenIntermediateUrls = new Set();
      const pipelineSettings = resolvePipelineSettings(options);
      let currentUrlValue = convertValueToString(urlValue).trim();
      let safetyGuardCount = 0;

      // Branch: follow this path only when the current condition passes.
      if (!pipelineSettings.enableUrlNormalizationRepair) {
        return currentUrlValue;
      }

      // Loop: repeat while the guard condition stays true.
      while (currentUrlValue && !seenIntermediateUrls.has(currentUrlValue) && safetyGuardCount < 24) {
        safetyGuardCount += 1;
        seenIntermediateUrls.add(currentUrlValue);

        const peeledUrl = peel(currentUrlValue, pipelineSettings).value;
        const decodedUrl = decodeRepeated(peeledUrl, 4);
        const resolvedCandidates = resolveURL(decodedUrl);
        const validResolvedCandidates = resolvedCandidates.filter(isValidURL);
        const preferredNextUrl = convertValueToString(validResolvedCandidates[0] || resolvedCandidates[0] || decodedUrl || currentUrlValue).trim();

        // Branch: follow this path only when the current condition passes.
        if (!preferredNextUrl || preferredNextUrl === currentUrlValue) {
          break;
        }

        currentUrlValue = preferredNextUrl;
      }

      return currentUrlValue || convertValueToString(urlValue).trim();
    }

    // Function: is valid url.
    function isValidURL(urlValue) {
      // Branch: try the primary operation before handling failures.
      try {
        new URL(urlValue);
        return true;
      // Branch: handle errors from the guarded operation.
      } catch {
        return false;
      }
    }

    // Function: extract host.
    function extractHost(urlValue) {
      // Branch: try the primary operation before handling failures.
      try {
        return new URL(urlValue).hostname;
      // Branch: handle errors from the guarded operation.
      } catch {
        return "";
      }
    }

    // Function: extract base url.
    function extractBaseUrl(urlValue) {
      // Branch: try the primary operation before handling failures.
      try {
        const parsedUrl = new URL(urlValue);
        return parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");
      // Branch: handle errors from the guarded operation.
      } catch {
        return urlValue;
      }
    }

    // Function: extract origin url.
    function extractOriginUrl(urlValue) {
      // Branch: try the primary operation before handling failures.
      try {
        const parsedUrl = new URL(urlValue);
        return parsedUrl.protocol + "//" + parsedUrl.host;
      // Branch: handle errors from the guarded operation.
      } catch {
        return urlValue;
      }
    }

    // Function: build final url display name.
    function buildFinalUrlDisplayName(urlValue) {
      const trimmedUrlValue = convertValueToString(urlValue).trim();
      return extractOriginUrl(trimmedUrlValue) || trimmedUrlValue;
    }

    // Function: build final url link text.
    function buildFinalUrlLinkText(finalUrlEntry) {
      const finalUrlLabel = convertValueToString(finalUrlEntry && finalUrlEntry.label).trim();
      const finalUrlType = convertValueToString(finalUrlEntry && finalUrlEntry.type).trim();

      if (!finalUrlLabel) {
        return finalUrlType;
      }

      return finalUrlType ? finalUrlLabel + " (" + finalUrlType + ")" : finalUrlLabel;
    }

    // Function: build final url entry.
    function buildFinalUrlEntry(urlValue, options) {
      const optionBag = options || {};
      const trimmedUrlValue = convertValueToString(urlValue).trim();
      const hostName = extractHost(trimmedUrlValue);
      const detectedType = convertValueToString(optionBag.detectedType || optionBag.type).trim();

      return {
        url: trimmedUrlValue,
        host: hostName,
        type: detectedType || classify(hostName),
        label: buildFinalUrlDisplayName(trimmedUrlValue)
      };
    }

    // Function: classify.
    function classify(hostName) {
      const normalizedHostName = convertValueToString(hostName).toLowerCase();

      // Branch: follow this path only when the current condition passes.
      if (!normalizedHostName) return "unknown";
      // Branch: follow this path only when the current condition passes.
      if (normalizedHostName.includes("list-manage")) return "publisher";
      // Branch: follow this path only when the current condition passes.
      if (
        normalizedHostName.includes("rs6.net") ||
        normalizedHostName.includes("kajabimail") ||
        normalizedHostName.includes("ymlpmail") ||
        normalizedHostName.includes("ccsend.com") ||
        normalizedHostName.includes("mailchi.mp")
      ) return "newsletter";
      // Branch: follow this path only when the current condition passes.
      if (/track|trk|click|redirect/i.test(normalizedHostName)) return "tracker";
      return "destination";
    }

    // Function: classify url value.
    function classifyUrlValue(urlValue) {
      const trimmedUrlValue = convertValueToString(urlValue).trim();
      const hostName = extractHost(trimmedUrlValue);
      const classifiedHostType = classify(hostName);

      if (classifiedHostType !== "destination") {
        return classifiedHostType;
      }

      if (extractTrackingCandidates(trimmedUrlValue).length || isLikelyTrackerHost(hostName)) {
        return "tracker";
      }

      return classifiedHostType;
    }

    // Function: normalize anchor text.
    function normalizeAnchorText(textValue) {
      return convertValueToString(textValue)
        .replace(/\u00A0/g, " ")
        .replace(/[ \t\f\v]+/g, " ")
        .trim();
    }

    // Function: normalize text value.
    function normalizeTextValue(textValue) {
      return convertValueToString(textValue)
        .replace(regularExpressions.heavyWhitespaceNoise, "")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t\f\v]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n");
    }

    // Function: locate line for original.
    function locateLineForOriginal(rawText, originalUrl, fallbackStartIndex) {
      const safeRawText = convertValueToString(rawText);
      const safeFallbackIndex = Math.max(0, fallbackStartIndex || 0);
      const locatedOffset = safeRawText.indexOf(originalUrl, safeFallbackIndex);

      // Branch: follow this path only when the current condition passes.
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

    // Function: find nearby title.
    function findNearbyTitle(lines, lineIndex) {
      // Loop: step through the current range or collection.
      for (let nearbyLineIndex = lineIndex - 1; nearbyLineIndex >= 0 && nearbyLineIndex > lineIndex - 10; nearbyLineIndex -= 1) {
        const validatedTitle = validateTitle(lines[nearbyLineIndex]);
        // Branch: follow this path only when the current condition passes.
        if (validatedTitle) {
          return validatedTitle;
        }
      }

      return null;
    }

    // Function: get item final urls.
    function getItemFinalUrls(item) {
      const finalUrls = item && item.validResolved && item.validResolved.length ? item.validResolved : (item && item.resolved ? item.resolved : []);
      const seenFinalUrls = new Set();

      // Loop: keep only items that match the current check.
      return finalUrls.filter(function keepUniqueFinalUrl(urlValue) {
        const trimmedUrlValue = convertValueToString(urlValue).trim();

        // Branch: follow this path only when the current condition passes.
        if (!trimmedUrlValue || seenFinalUrls.has(trimmedUrlValue)) {
          return false;
        }

        seenFinalUrls.add(trimmedUrlValue);
        return true;
      });
    }

    // Function: build standalone final urls.
    function buildStandaloneFinalUrls(items) {
      // Loop: expand and flatten each item in the current collection.
      return (items || []).flatMap(function flattenResolvedUrls(item) {
        return getItemFinalUrls(item);
      });
    }

    // Function: build digest entries.
    function buildDigestEntries(rawText, items, options) {
      const optionBag = options || {};
      const useReplacementUrlOnly = !!optionBag.useReplacementUrlOnly;
      const inputLines = convertValueToString(rawText).split("\n");
      const digestEntries = [];
      const seenDigestKeys = new Set();
      let nextSearchStartIndex = 0;

      // Loop: iterate through each item in the current collection.
      (items || []).forEach(function inspectDetectedItem(item) {
        const locatedOriginalLine = locateLineForOriginal(rawText, item.original, nextSearchStartIndex);
        nextSearchStartIndex = locatedOriginalLine.nextStart;

        const digestUrls = useReplacementUrlOnly
          ? (item.replacementUrl ? [item.replacementUrl] : [])
          : getItemFinalUrls(item);

        // Loop: iterate through each item in the current collection.
        digestUrls.forEach(function addDigestEntry(resolvedUrl) {
          const resolvedHost = extractHost(resolvedUrl);
          const nearbyTitle = locatedOriginalLine.lineIndex >= 0 ? findNearbyTitle(inputLines, locatedOriginalLine.lineIndex) : null;
          const displayTitle = normalizeTitle(nearbyTitle, resolvedHost || "unknown-host");
          const digestKey = displayTitle + "|" + resolvedHost;

          // Branch: follow this path only when the current condition passes.
          if (!displayTitle || seenDigestKeys.has(digestKey)) {
            return;
          }

          seenDigestKeys.add(digestKey);
          digestEntries.push({
            title: displayTitle,
            url: resolvedUrl,
            host: resolvedHost,
            type: getItemDisplayType(item)
          });
        });
      });

      return digestEntries;
    }

    // Function: build changed urls.
    function buildChangedUrls(items) {
      const changedUrlEntries = [];
      const seenChangedUrlKeys = new Set();

      // Loop: iterate through each item in the current collection.
      (items || []).forEach(function inspectItem(item) {
        const originalUrl = convertValueToString(item.original).trim();
        const replacementUrl = convertValueToString(item.replacementUrl).trim();

        // Branch: follow this path only when the current condition passes.
        if (!originalUrl || !replacementUrl || replacementUrl === originalUrl) {
          return;
        }

        const changedUrlKey = originalUrl + "=>" + replacementUrl;
        // Branch: follow this path only when the current condition passes.
        if (seenChangedUrlKeys.has(changedUrlKey)) {
          return;
        }

        seenChangedUrlKeys.add(changedUrlKey);
        changedUrlEntries.push({
          original: originalUrl,
          finalUrl: replacementUrl,
          finalBaseUrl: extractBaseUrl(replacementUrl),
          type: getItemDisplayType(item)
        });
      });

      return changedUrlEntries;
    }

    // Function: get preferred replacement url.
    function getPreferredReplacementUrl(item) {
      const preferredUrl = getItemFinalUrls(item)[0] || "";

      return convertValueToString(preferredUrl || item.normalized || item.original).trim();
    }

    // Function: get item display type.
    function getItemDisplayType(item) {
      const originalUrl = convertValueToString(item && item.original).trim();
      const normalizedUrl = convertValueToString(item && item.normalized).trim();
      const preferredUrl = getPreferredReplacementUrl(item);

      return classifyUrlValue(originalUrl || normalizedUrl || preferredUrl);
    }

    // Function: build final url entries.
    function buildFinalUrlEntries(items) {
      return (items || []).flatMap(function buildEntriesForItem(item) {
        const detectedType = getItemDisplayType(item);

        return getItemFinalUrls(item).map(function createTypedFinalUrlEntry(finalUrl) {
          return buildFinalUrlEntry(finalUrl, { detectedType: detectedType });
        });
      });
    }

    // Function: build type lookup.
    function buildTypeLookup(items) {
      const typeByOriginalUrl = new Map();
      const typeByNormalizedUrl = new Map();

      (items || []).forEach(function inspectTypedItem(item) {
        const detectedType = getItemDisplayType(item);
        const originalUrl = convertValueToString(item.original).trim();
        const normalizedUrl = convertValueToString(item.normalized).trim();

        if (originalUrl && !typeByOriginalUrl.has(originalUrl)) {
          typeByOriginalUrl.set(originalUrl, detectedType);
        }

        if (normalizedUrl && !typeByNormalizedUrl.has(normalizedUrl)) {
          typeByNormalizedUrl.set(normalizedUrl, detectedType);
        }
      });

      return {
        byOriginal: typeByOriginalUrl,
        byNormalized: typeByNormalizedUrl
      };
    }

    // Function: build replacement lookup.
    function buildReplacementLookup(items) {
      const replacementByOriginalUrl = new Map();
      const replacementByNormalizedUrl = new Map();

      // Loop: iterate through each item in the current collection.
      (items || []).forEach(function inspectReplacementItem(item) {
        const replacementUrl = getPreferredReplacementUrl(item);
        const originalUrl = convertValueToString(item.original).trim();
        const normalizedUrl = convertValueToString(item.normalized).trim();

        // Branch: follow this path only when the current condition passes.
        if (!replacementUrl) {
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (originalUrl && !replacementByOriginalUrl.has(originalUrl)) {
          replacementByOriginalUrl.set(originalUrl, replacementUrl);
        }

        // Branch: follow this path only when the current condition passes.
        if (normalizedUrl && !replacementByNormalizedUrl.has(normalizedUrl)) {
          replacementByNormalizedUrl.set(normalizedUrl, replacementUrl);
        }
      });

      return {
        byOriginal: replacementByOriginalUrl,
        byNormalized: replacementByNormalizedUrl
      };
    }

    // Function: lookup detected type.
    function lookupDetectedType(typeLookup, urlValue, options) {
      const trimmedUrlValue = convertValueToString(urlValue).trim();

      if (!trimmedUrlValue) {
        return "";
      }

      if (typeLookup.byOriginal.has(trimmedUrlValue)) {
        return typeLookup.byOriginal.get(trimmedUrlValue);
      }

      const normalizedUrlValue = peel(trimmedUrlValue, options).value;

      if (typeLookup.byNormalized.has(normalizedUrlValue)) {
        return typeLookup.byNormalized.get(normalizedUrlValue);
      }

      return classifyUrlValue(trimmedUrlValue);
    }

    // Function: lookup replacement url.
    function lookupReplacementUrl(replacementLookup, urlValue, options) {
      const trimmedUrlValue = convertValueToString(urlValue).trim();

      // Branch: follow this path only when the current condition passes.
      if (!trimmedUrlValue) {
        return "";
      }

      // Branch: follow this path only when the current condition passes.
      if (replacementLookup.byOriginal.has(trimmedUrlValue)) {
        return replacementLookup.byOriginal.get(trimmedUrlValue);
      }

      const normalizedUrlValue = peel(trimmedUrlValue, options).value;

      // Branch: follow this path only when the current condition passes.
      if (replacementLookup.byNormalized.has(normalizedUrlValue)) {
        return replacementLookup.byNormalized.get(normalizedUrlValue);
      }

      return "";
    }

    // Function: looks like url text.
    function looksLikeUrlText(textValue) {
      const normalizedAnchorText = normalizeAnchorText(textValue);
      return !normalizedAnchorText || /^https?:\/\//i.test(normalizedAnchorText) || normalizedAnchorText === normalizedAnchorText.toLowerCase();
    }

    // Function: cleanup markup.
    function cleanupMarkup(rootNode) {
      // Branch: follow this path only when the current condition passes.
      if (!rootNode || !rootNode.ownerDocument) {
        return;
      }

      const textWalker = rootNode.ownerDocument.createTreeWalker(rootNode, getNodeFilterFlag("SHOW_TEXT", 4));
      const textNodes = [];
      let currentTextNode = textWalker.nextNode();

      // Loop: repeat while the guard condition stays true.
      while (currentTextNode) {
        textNodes.push(currentTextNode);
        currentTextNode = textWalker.nextNode();
      }

      // Loop: iterate through each item in the current collection.
      textNodes.forEach(function normalizeTextNode(textNode) {
        const parentTagName = textNode.parentElement ? textNode.parentElement.tagName : "";

        // Branch: follow this path only when the current condition passes.
        if (regularExpressions.protectedMarkupTag.test(parentTagName)) {
          return;
        }

        const normalizedNodeValue = normalizeTextValue(textNode.nodeValue || "");

        // Branch: follow this path only when the current condition passes.
        if (!normalizedNodeValue.trim()) {
          textNode.remove();
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (normalizedNodeValue !== (textNode.nodeValue || "")) {
          textNode.nodeValue = normalizedNodeValue;
        }
      });

      // Loop: iterate through each item in the current collection.
      Array.from(rootNode.querySelectorAll("a[href]")).forEach(function normalizeAnchor(anchorElement) {
        const trimmedHref = convertValueToString(anchorElement.getAttribute("href")).trim();
        anchorElement.setAttribute("href", trimmedHref);

        const normalizedAnchorLabel = normalizeAnchorText(anchorElement.textContent || "");
        // Branch: follow this path only when the current condition passes.
        if (normalizedAnchorLabel) {
          anchorElement.textContent = normalizedAnchorLabel;
        }
      });

      // Loop: iterate through each item in the current collection.
      Array.from(rootNode.querySelectorAll("*")).forEach(function trimExcessLineBreaks(elementNode) {
        let consecutiveBreakCount = 0;

        // Loop: iterate through each item in the current collection.
        Array.from(elementNode.childNodes).forEach(function inspectChildNode(childNode) {
          // Branch: follow this path only when the current condition passes.
          if (childNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && childNode.tagName === "BR") {
            consecutiveBreakCount += 1;
            // Branch: follow this path only when the current condition passes.
            if (consecutiveBreakCount > 2) {
              childNode.remove();
            }
            return;
          }

          // Branch: follow this path only when the current condition passes.
          if (childNode.nodeType === getNodeTypeValue("TEXT_NODE", 3) && !normalizeTextValue(childNode.nodeValue || "").trim()) {
            return;
          }

          consecutiveBreakCount = 0;
        });
      });
    }

    // Function: rewrite anchors.
    function rewriteAnchors(rootNode, replacementLookup, typeLookup, options) {
      let rewrittenAnchorCount = 0;

      // Loop: iterate through each item in the current collection.
      Array.from(rootNode.querySelectorAll("a[href]")).forEach(function rewriteAnchor(anchorElement) {
        const originalHref = convertValueToString(anchorElement.getAttribute("href")).trim();

        // Branch: follow this path only when the current condition passes.
        if (!/^https?:\/\//i.test(originalHref)) {
          return;
        }

        const replacementUrl = lookupReplacementUrl(replacementLookup, originalHref, options);
        // Branch: follow this path only when the current condition passes.
        if (!replacementUrl) {
          return;
        }

        const detectedType = lookupDetectedType(typeLookup, originalHref, options);
        const finalUrlEntry = buildFinalUrlEntry(replacementUrl, { detectedType: detectedType });

        anchorElement.setAttribute("href", replacementUrl);
        anchorElement.setAttribute("data-merged-link-lab", finalUrlEntry.type);

        // Branch: follow this path only when the current condition passes.
        if (looksLikeUrlText(anchorElement.textContent || "")) {
          anchorElement.textContent = buildFinalUrlLinkText(finalUrlEntry);
        }

        rewrittenAnchorCount += 1;
      });

      return rewrittenAnchorCount;
    }

    // Function: replace text urls.
    function replaceTextUrls(rootNode, replacementLookup, typeLookup, options) {
      const textWalker = rootNode.ownerDocument.createTreeWalker(rootNode, getNodeFilterFlag("SHOW_TEXT", 4));
      const pipelineSettings = resolvePipelineSettings(options);
      const candidateTextNodes = [];
      let currentTextNode = textWalker.nextNode();
      let rewrittenTextNodeCount = 0;

      // Loop: repeat while the guard condition stays true.
      while (currentTextNode) {
        // Branch: follow this path only when the current condition passes.
        if (
          currentTextNode.parentElement &&
          !regularExpressions.protectedMarkupTag.test(currentTextNode.parentElement.tagName) &&
          /https?:\/\/[^\s<>"']+/i.test(currentTextNode.nodeValue || "")
        ) {
          candidateTextNodes.push(currentTextNode);
        }

        currentTextNode = textWalker.nextNode();
      }

      // Loop: iterate through each item in the current collection.
      candidateTextNodes.forEach(function rewriteTextNode(textNode) {
        const rawTextValue = textNode.nodeValue || "";
        const replacementFragment = rootNode.ownerDocument.createDocumentFragment();
        const matchingExpression = new RegExp(regularExpressions.urlToken.source, "gi");
        let nextSearchIndex = 0;
        let nodeWasChanged = false;
        let currentMatch = null;

        // Loop: repeat while the guard condition stays true.
        while ((currentMatch = matchingExpression.exec(rawTextValue)) !== null) {
          const originalUrlToken = currentMatch[0];
          const matchStartIndex = currentMatch.index;
          const matchEndIndex = matchStartIndex + originalUrlToken.length;
          const peeledUrlToken = peel(originalUrlToken, pipelineSettings);
          const trailingPunctuationMatch = convertValueToString(originalUrlToken).match(regularExpressions.trailingUrlPunctuation);
          const trailingPunctuation = trailingPunctuationMatch ? trailingPunctuationMatch[0] : "";
          const replacementUrl =
            lookupReplacementUrl(replacementLookup, originalUrlToken, pipelineSettings) ||
            lookupReplacementUrl(replacementLookup, peeledUrlToken.value, pipelineSettings);

          // Branch: follow this path only when the current condition passes.
          if (!replacementUrl) {
            continue;
          }

          const replacementText =
            trailingPunctuation && replacementUrl !== originalUrlToken && !replacementUrl.endsWith(trailingPunctuation)
              ? replacementUrl + trailingPunctuation
              : replacementUrl;
          const detectedType =
            lookupDetectedType(typeLookup, originalUrlToken, pipelineSettings) ||
            lookupDetectedType(typeLookup, peeledUrlToken.value, pipelineSettings);
          const finalUrlEntry = buildFinalUrlEntry(replacementUrl, { detectedType: detectedType });

          // Branch: follow this path only when the current condition passes.
          if (matchStartIndex > nextSearchIndex) {
            replacementFragment.appendChild(rootNode.ownerDocument.createTextNode(rawTextValue.slice(nextSearchIndex, matchStartIndex)));
          }

          replacementFragment.appendChild(rootNode.ownerDocument.createTextNode(buildFinalUrlLinkText(finalUrlEntry)));
          nextSearchIndex = matchEndIndex;
          nodeWasChanged = nodeWasChanged || replacementText !== originalUrlToken;
        }

        // Branch: follow this path only when the current condition passes.
        if (!nodeWasChanged) {
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (nextSearchIndex < rawTextValue.length) {
          replacementFragment.appendChild(rootNode.ownerDocument.createTextNode(rawTextValue.slice(nextSearchIndex)));
        }

        // Branch: follow this path only when the current condition passes.
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(replacementFragment, textNode);
        }

        rewrittenTextNodeCount += 1;
      });

      return rewrittenTextNodeCount;
    }

    // Function: rewrite html.
    function rewriteHtml(sourceMarkup, items, options) {
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      // Branch: follow this path only when the current condition passes.
      if (!parsedDocument) {
        return {
          html: convertValueToString(sourceMarkup),
          count: 0
        };
      }

      const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      const replacementLookup = buildReplacementLookup(items || []);
      const typeLookup = buildTypeLookup(items || []);
      const rewrittenAnchorCount = rewriteAnchors(rootNode, replacementLookup, typeLookup, options);
      const rewrittenTextNodeCount = replaceTextUrls(rootNode, replacementLookup, typeLookup, options);

      cleanupMarkup(rootNode);

      return {
        html: parsedDocument.body && parsedDocument.body.innerHTML ? parsedDocument.body.innerHTML : convertValueToString(sourceMarkup),
        count: rewrittenAnchorCount + rewrittenTextNodeCount
      };
    }

    // Function: is human readable anchor.
    function isHumanReadableAnchor(anchorElement) {
      const anchorText = normalizeAnchorText(anchorElement && anchorElement.textContent);

      // Branch: follow this path only when the current condition passes.
      if (!anchorText) return false;
      // Branch: follow this path only when the current condition passes.
      if (/^https?:\/\//i.test(anchorText)) return false;
      // Branch: follow this path only when the current condition passes.
      if (anchorText.length > 140) return false;
      // Branch: follow this path only when the current condition passes.
      if (/^\[image/i.test(anchorText)) return true;
      // Branch: follow this path only when the current condition passes.
      if (/facebook|instagram|youtube|linkedin|tiktok/i.test(anchorText)) return true;
      return anchorText.split(/\s+/).length <= 10;
    }

    // Function: collect standalone preview text nodes.
    function collectStandalonePreviewTextNodes(documentRoot, parsedDocument) {
      const textWalker = parsedDocument.createTreeWalker(documentRoot, getNodeFilterFlag("SHOW_TEXT", 4));
      const textNodes = [];
      let currentTextNode = textWalker.nextNode();

      // Loop: repeat while the guard condition stays true.
      while (currentTextNode) {
        textNodes.push(currentTextNode);
        currentTextNode = textWalker.nextNode();
      }

      return textNodes;
    }

    // Function: normalize standalone preview text nodes.
    function normalizeStandalonePreviewTextNodes(textNodes) {
      textNodes.forEach(function normalizePreviewTextNode(textNode) {
        const parentTagName = textNode.parentElement ? textNode.parentElement.tagName : "";
        const shouldPreserveWhitespace = /^(PRE|TEXTAREA)$/i.test(parentTagName);
        const normalizedValue = shouldPreserveWhitespace
          ? convertValueToString(textNode.nodeValue)
          : normalizeTextValue(textNode.nodeValue || "");

        // Branch: follow this path only when the current condition passes.
        if (!shouldPreserveWhitespace && !normalizedValue.trim()) {
          textNode.remove();
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (normalizedValue !== (textNode.nodeValue || "")) {
          textNode.nodeValue = normalizedValue;
        }
      });
    }

    // Function: normalize standalone preview anchors.
    function normalizeStandalonePreviewAnchors(parsedDocument) {
      Array.from(parsedDocument.querySelectorAll("a[href]")).forEach(function normalizePreviewAnchor(anchorElement) {
        const trimmedHref = convertValueToString(anchorElement.getAttribute("href")).trim();
        anchorElement.setAttribute("href", trimmedHref);

        const normalizedAnchorLabel = normalizeTextValue(anchorElement.textContent || "").trim();
        // Branch: follow this path only when the current condition passes.
        if (normalizedAnchorLabel) {
          anchorElement.textContent = normalizedAnchorLabel;
        }
      });
    }

    // Function: build standalone preview anchor signature.
    function buildStandalonePreviewAnchorSignature(anchorElement) {
      if (!anchorElement || anchorElement.tagName !== "A" || !anchorElement.hasAttribute("href")) {
        return "";
      }

      const hrefValue = convertValueToString(anchorElement.getAttribute("href")).trim();
      const textValue = normalizeTextValue(anchorElement.textContent || "").trim();
      return hrefValue + "||" + textValue;
    }

    // Function: check whether a node can sit between duplicate preview links.
    function isIgnorableStandalonePreviewLinkSeparator(node) {
      if (!node) {
        return true;
      }

      if (node.nodeType === getNodeTypeValue("TEXT_NODE", 3)) {
        return !normalizeTextValue(node.nodeValue || "").trim();
      }

      return node.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && node.tagName === "BR";
    }

    // Function: remove immediate duplicate standalone preview anchors.
    function removeImmediateDuplicateStandalonePreviewAnchors(documentRoot) {
      Array.from(documentRoot.querySelectorAll("*")).forEach(function removeImmediateDuplicateAnchors(parentElement) {
        let previousAnchorSignature = "";

        // Loop: iterate through each item in the current collection.
        Array.from(parentElement.childNodes).forEach(function inspectChildNode(childNode) {
          if (isIgnorableStandalonePreviewLinkSeparator(childNode)) {
            return;
          }

          // Branch: follow this path only when the current condition passes.
          if (
            childNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) &&
            childNode.tagName === "A" &&
            childNode.hasAttribute("href")
          ) {
            const currentAnchorSignature = buildStandalonePreviewAnchorSignature(childNode);

            // Branch: follow this path only when the current condition passes.
            if (currentAnchorSignature && currentAnchorSignature === previousAnchorSignature) {
              childNode.remove();
              return;
            }

            previousAnchorSignature = currentAnchorSignature;
            return;
          }

          previousAnchorSignature = "";
        });
      });
    }

    // Function: build simple standalone preview link block signature.
    function buildSimpleStandalonePreviewLinkBlockSignature(blockElement) {
      if (!blockElement || blockElement.nodeType !== getNodeTypeValue("ELEMENT_NODE", 1)) {
        return "";
      }

      const directElementChildren = Array.from(blockElement.children);
      const directAnchorChildren = directElementChildren.filter(function keepAnchorChildren(childElement) {
        return childElement.tagName === "A" && childElement.hasAttribute("href");
      });
      const otherNonBreakChildren = directElementChildren.filter(function keepOtherChildren(childElement) {
        return childElement.tagName !== "A" && childElement.tagName !== "BR";
      });

      if (directAnchorChildren.length !== 1 || otherNonBreakChildren.length > 0) {
        return "";
      }

      const clonedBlockElement = blockElement.cloneNode(true);
      Array.from(clonedBlockElement.querySelectorAll("a,br")).forEach(function removeLinkArtifacts(node) {
        node.remove();
      });

      const remainingText = normalizeTextValue(clonedBlockElement.textContent || "").replace(/\s+/g, "").trim();

      if (remainingText) {
        return "";
      }

      return buildStandalonePreviewAnchorSignature(directAnchorChildren[0]);
    }

    // Function: remove duplicate single-link standalone preview blocks.
    function removeDuplicateSingleLinkStandalonePreviewBlocks(documentRoot) {
      const blockCandidates = Array.from(documentRoot.querySelectorAll("p,div,li,td,th,span"));
      let previousBlockSignature = "";

      // Loop: iterate through each item in the current collection.
      blockCandidates.forEach(function removeDuplicateSingleLinkBlocks(blockElement) {
        const currentBlockSignature = buildSimpleStandalonePreviewLinkBlockSignature(blockElement);

        // Branch: follow this path only when the current condition passes.
        if (!currentBlockSignature) {
          previousBlockSignature = "";
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (currentBlockSignature === previousBlockSignature) {
          blockElement.remove();
          return;
        }

        previousBlockSignature = currentBlockSignature;
      });
    }

    // Function: trim standalone preview line break runs.
    function trimStandalonePreviewLineBreakRuns(documentRoot) {
      Array.from(documentRoot.querySelectorAll("*")).forEach(function trimPreviewLineBreakRuns(elementNode) {
        let consecutiveBreakCount = 0;

        // Loop: iterate through each item in the current collection.
        Array.from(elementNode.childNodes).forEach(function inspectChildNode(childNode) {
          // Branch: follow this path only when the current condition passes.
          if (childNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && childNode.tagName === "BR") {
            consecutiveBreakCount += 1;
            // Branch: follow this path only when the current condition passes.
            if (consecutiveBreakCount > 2) {
              childNode.remove();
            }
            return;
          }

          // Branch: follow this path only when the current condition passes.
          if (childNode.nodeType === getNodeTypeValue("TEXT_NODE", 3) && !(childNode.nodeValue || "").trim()) {
            return;
          }

          consecutiveBreakCount = 0;
        });
      });
    }

    // Function: remove empty standalone preview structural nodes.
    function removeEmptyStandalonePreviewStructuralNodes(documentRoot) {
      const reverseCleanupCandidates = Array.from(documentRoot.querySelectorAll("p,div,span,td,th,li")).reverse();

      // Loop: iterate through each item in the current collection.
      reverseCleanupCandidates.forEach(function removeEmptyStructuralNodes(elementNode) {
        // Branch: follow this path only when the current condition passes.
        if (elementNode.querySelector("img,svg,table,ul,ol,a,button,input,textarea,select,iframe")) {
          return;
        }

        const meaningfulText = normalizeTextValue(elementNode.textContent || "").replace(/\s+/g, "");
        // Loop: stop once any item matches the current check.
        const hasNonBreakChildElement = Array.from(elementNode.children).some(function findNonBreakChild(childElement) {
          return childElement.tagName !== "BR";
        });

        // Branch: follow this path only when the current condition passes.
        if (!meaningfulText && !hasNonBreakChildElement) {
          elementNode.remove();
        }
      });
    }

    // Function: cleanup standalone preview markup.
    function cleanupStandalonePreviewMarkup(documentRoot, parsedDocument) {
      normalizeStandalonePreviewTextNodes(collectStandalonePreviewTextNodes(documentRoot, parsedDocument));
      normalizeStandalonePreviewAnchors(parsedDocument);
      removeImmediateDuplicateStandalonePreviewAnchors(documentRoot);
      removeDuplicateSingleLinkStandalonePreviewBlocks(documentRoot);
      trimStandalonePreviewLineBreakRuns(documentRoot);
      removeEmptyStandalonePreviewStructuralNodes(documentRoot);
    }

    // Function: rewrite html for standalone preview.
    function rewriteHtmlForStandalonePreview(sourceMarkup, itemsOrOptions, maybeOptions) {
      const providedItems = Array.isArray(itemsOrOptions) ? itemsOrOptions : null;
      const pipelineSettings = resolvePipelineSettings(providedItems ? maybeOptions : itemsOrOptions);
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      // Branch: follow this path only when the current condition passes.
      if (!parsedDocument) {
        return {
          html: convertValueToString(sourceMarkup),
          count: 0
        };
      }

      const previewItems = providedItems || analyzeInput({
        rawText: htmlToText(sourceMarkup),
        sourceHtml: sourceMarkup,
        options: pipelineSettings
      }).items;
      const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      const replacementLookup = buildReplacementLookup(previewItems || []);
      const typeLookup = buildTypeLookup(previewItems || []);
      let rewrittenNodeCount = 0;

      // Loop: iterate through each item in the current collection.
      Array.from(parsedDocument.querySelectorAll("a[href]")).forEach(function rewritePreviewAnchor(anchorElement) {
        const originalHref = convertValueToString(anchorElement.getAttribute("href")).trim();

        // Branch: follow this path only when the current condition passes.
        if (!/^https?:\/\//i.test(originalHref)) {
          return;
        }

        const resolvedHref = lookupReplacementUrl(replacementLookup, originalHref, pipelineSettings) || originalHref;
        const detectedType = lookupDetectedType(typeLookup, originalHref, pipelineSettings);
        const finalUrlEntry = buildFinalUrlEntry(resolvedHref, { detectedType: detectedType });

        anchorElement.setAttribute("href", resolvedHref);
        anchorElement.setAttribute("data-link-type", finalUrlEntry.type);
        anchorElement.setAttribute("data-base-url", finalUrlEntry.label);

        // Branch: follow this path only when the current condition passes.
        if (pipelineSettings.enableUrlNormalizationRepair && !isHumanReadableAnchor(anchorElement)) {
          anchorElement.textContent = buildFinalUrlLinkText(finalUrlEntry);
        }

        rewrittenNodeCount += 1;
      });

      const textWalker = parsedDocument.createTreeWalker(rootNode, getNodeFilterFlag("SHOW_TEXT", 4));
      const textNodesToRewrite = [];
      let currentTextNode = textWalker.nextNode();

      // Loop: repeat while the guard condition stays true.
      while (currentTextNode) {
        const parentTagName = currentTextNode.parentElement ? currentTextNode.parentElement.tagName : "";

        // Branch: follow this path only when the current condition passes.
        if (currentTextNode.parentElement && !/^(A|SCRIPT|STYLE)$/i.test(parentTagName)) {
          textNodesToRewrite.push(currentTextNode);
        }

        currentTextNode = textWalker.nextNode();
      }

      // Loop: iterate through each item in the current collection.
      textNodesToRewrite.forEach(function rewritePreviewTextNode(textNode) {
        const rawTextValue = textNode.nodeValue || "";

        // Branch: follow this path only when the current condition passes.
        if (!rawTextValue || !/https?:\/\//i.test(rawTextValue)) {
          return;
        }

        const replacementFragment = parsedDocument.createDocumentFragment();
        const matchingExpression = new RegExp(regularExpressions.urlToken.source, "gi");
        let nextSearchIndex = 0;
        let nodeWasChanged = false;
        let currentMatch = null;

        // Loop: repeat while the guard condition stays true.
        while ((currentMatch = matchingExpression.exec(rawTextValue)) !== null) {
          const originalUrlToken = currentMatch[0];
          const matchStartIndex = currentMatch.index;
          const matchEndIndex = matchStartIndex + originalUrlToken.length;

          // Branch: follow this path only when the current condition passes.
          if (matchStartIndex > nextSearchIndex) {
            replacementFragment.appendChild(parsedDocument.createTextNode(rawTextValue.slice(nextSearchIndex, matchStartIndex)));
          }

          const peeledUrlToken = peel(originalUrlToken, pipelineSettings);
          const resolvedUrl =
            lookupReplacementUrl(replacementLookup, originalUrlToken, pipelineSettings) ||
            lookupReplacementUrl(replacementLookup, peeledUrlToken.value, pipelineSettings) ||
            originalUrlToken;
          const detectedType =
            lookupDetectedType(typeLookup, originalUrlToken, pipelineSettings) ||
            lookupDetectedType(typeLookup, peeledUrlToken.value, pipelineSettings);
          const finalUrlEntry = buildFinalUrlEntry(resolvedUrl, { detectedType: detectedType });
          const anchorElement = parsedDocument.createElement("a");

          anchorElement.setAttribute("href", resolvedUrl);
          anchorElement.setAttribute("target", "_blank");
          anchorElement.setAttribute("rel", "noopener noreferrer");
          anchorElement.setAttribute("data-link-type", finalUrlEntry.type);
          anchorElement.setAttribute("data-base-url", finalUrlEntry.label);
          anchorElement.textContent = pipelineSettings.enableUrlNormalizationRepair
            ? buildFinalUrlLinkText(finalUrlEntry)
            : originalUrlToken;

          replacementFragment.appendChild(anchorElement);
          rewrittenNodeCount += 1;
          nodeWasChanged = true;
          nextSearchIndex = matchEndIndex;
        }

        // Branch: follow this path only when the current condition passes.
        if (!nodeWasChanged) {
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (nextSearchIndex < rawTextValue.length) {
          replacementFragment.appendChild(parsedDocument.createTextNode(rawTextValue.slice(nextSearchIndex)));
        }

        // Branch: follow this path only when the current condition passes.
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(replacementFragment, textNode);
        }
      });

      cleanupStandalonePreviewMarkup(rootNode, parsedDocument);

      return {
        html: parsedDocument.body && parsedDocument.body.innerHTML ? parsedDocument.body.innerHTML : convertValueToString(sourceMarkup),
        count: rewrittenNodeCount
      };
    }

    // Function: html to text.
    function htmlToText(sourceMarkup) {
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      // Branch: follow this path only when the current condition passes.
      if (!parsedDocument) {
        return cleanInputText(convertValueToString(sourceMarkup).replace(/<[^>]+>/g, "\n"));
      }

      const bodyNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      return cleanInputText(bodyNode.innerText || bodyNode.textContent || "");
    }

    // Function: build diagnostics.
    function buildDiagnostics(items, finalUrls, digestEntries, errors, rawText, options) {
      const pipelineSettings = resolvePipelineSettings(options);
      // Loop: accumulate the current collection into one result.
      const invalidResolvedUrlCount = (items || []).reduce(function addInvalidResolvedUrls(totalInvalidCount, item) {
        return totalInvalidCount + ((item.resolved || []).length - (item.validResolved || []).length);
      }, 0);

      const diagnosticLines = [
        "INPUT CHARS: " + convertValueToString(rawText).length,
        "RAW URL TOKENS: " + (items || []).length,
        "FINAL URL COUNT: " + (finalUrls || []).length,
        "DIGEST ENTRY COUNT: " + (digestEntries || []).length,
        "URL NORMALIZATION + REPAIR: " + (pipelineSettings.enableUrlNormalizationRepair ? "ON" : "OFF"),
        "NORMALIZATION STAGE: " + (pipelineSettings.enableUrlNormalizationRepair ? "EXECUTED" : "BYPASSED"),
        "INVALID RESOLVED URLS: " + invalidResolvedUrlCount
      ];

      // Branch: follow this path only when the current condition passes.
      if (errors && errors.length) {
        diagnosticLines.push("", "PIPELINE ERRORS:");
        // Loop: iterate through each item in the current collection.
        errors.forEach(function appendPipelineError(errorMessage) {
          diagnosticLines.push("- " + errorMessage);
        });
      }

      return {
        invalidCount: invalidResolvedUrlCount,
        lines: diagnosticLines
      };
    }

    // Function: populate bypassed data for items.
    function populateBypassedDataForItems(items) {
      // Loop: iterate through each item in the current collection.
      (items || []).forEach(function inspectDetectedItem(item) {
        const originalUrl = convertValueToString(item.original).trim();

        item.normalized = originalUrl;
        item.resolved = originalUrl ? [originalUrl] : [];
        item.validResolved = item.resolved.filter(isValidURL);
        item.replacementUrl = originalUrl;

        // Branch: follow this path only when the current condition passes.
        if (!item.notes.includes("NORMALIZATION_REPAIR_BYPASSED")) {
          item.notes.push("NORMALIZATION_REPAIR_BYPASSED");
        }

        // Branch: follow this path only when the current condition passes.
        if (!item.validResolved.length && !item.notes.includes("NO_VALID_RESOLVED_URL")) {
          item.notes.push("NO_VALID_RESOLVED_URL");
        }
      });

      return items;
    }

    // Function: populate resolved data for items.
    function populateResolvedDataForItems(items, options) {
      if (debugApi) {
        debugApi.functionIn("pipeline.populateResolvedDataForItems", {
          itemCount: Array.isArray(items) ? items.length : 0,
          enableUrlNormalizationRepair: !!(options && options.enableUrlNormalizationRepair)
        });
      }

      const pipelineSettings = resolvePipelineSettings(options);
      // Branch: follow this path only when the current condition passes.
      if (!pipelineSettings.enableUrlNormalizationRepair) {
        if (debugApi) {
          debugApi.conditional("pipeline normalization repair disabled; bypassing resolution", {
            itemCount: Array.isArray(items) ? items.length : 0
          });
          debugApi.functionOut("pipeline.populateResolvedDataForItems", { mode: "bypass" });
        }

        return populateBypassedDataForItems(items);
      }

      // Loop: iterate through each item in the current collection.
      (items || []).forEach(function inspectDetectedItem(item) {
        if (debugApi && item && item.id <= 3) {
          debugApi.loop("pipeline resolving item", { itemId: item.id });
        }

        const peeledUrlToken = peel(item.original, pipelineSettings);
        item.normalized = peeledUrlToken.value;
        item.notes.push.apply(item.notes, peeledUrlToken.notes);

        item.resolved = resolveURL(item.normalized);
        item.validResolved = item.resolved.filter(isValidURL);

        // Branch: follow this path only when the current condition passes.
        if (!item.validResolved.length) {
          item.notes.push("NO_VALID_RESOLVED_URL");
          if (debugApi) {
            debugApi.conditional("pipeline item has no valid resolved url", { itemId: item.id });
          }
        }

        item.replacementUrl = getPreferredReplacementUrl(item);
      });

      if (debugApi) {
        debugApi.functionOut("pipeline.populateResolvedDataForItems", {
          mode: "resolve",
          itemCount: Array.isArray(items) ? items.length : 0
        });
      }

      return items;
    }

    // Function: analyze input.
    function analyzeInput(input) {
      if (debugApi) {
        debugApi.functionIn("pipeline.analyzeInput");
      }

      const payload = input || {};
      const normalizedRawText = cleanInputText(payload.rawText || payload.text || "");
      const sourceMarkup = convertValueToString(payload.sourceHtml || payload.html || "");
      const pipelineSettings = resolvePipelineSettings(payload.options || payload.settings);
      const pipelineErrors = [];
      let detectedItems = [];

      if (debugApi) {
        debugApi.variable("pipeline analyze input summary assigned", {
          rawTextLength: normalizedRawText.length,
          sourceMarkupLength: sourceMarkup.length,
          hasSourceMarkup: !!sourceMarkup,
          enableUrlNormalizationRepair: pipelineSettings.enableUrlNormalizationRepair
        });
      }

      // Branch: try the primary operation before handling failures.
      try {
        detectedItems = sourceMarkup ? detectUrlsFromHtml(sourceMarkup) : detectURLs(normalizedRawText);
      // Branch: handle errors from the guarded operation.
      } catch (detectionError) {
        pipelineErrors.push("stageDetect: " + detectionError.message);
        if (debugApi) {
          debugApi.error("pipeline detection failed", { message: detectionError.message });
        }
      }

      // Branch: try the primary operation before handling failures.
      try {
        populateResolvedDataForItems(detectedItems, pipelineSettings);
      // Branch: handle errors from the guarded operation.
      } catch (resolutionError) {
        pipelineErrors.push("stageResolve: " + resolutionError.message);
        if (debugApi) {
          debugApi.error("pipeline resolution failed", { message: resolutionError.message });
        }
      }

      const finalUrls = detectedItems
        // Loop: transform each item in the current collection.
        .map(function mapItemToReplacementUrl(item) {
          return convertValueToString(item.replacementUrl).trim();
        })
        .filter(Boolean);
      const changedUrls = buildChangedUrls(detectedItems);
      const digestEntries = buildDigestEntries(normalizedRawText, detectedItems, { useReplacementUrlOnly: true });
      const rewrittenMarkupResult = rewriteHtml(sourceMarkup || normalizedRawText, detectedItems, pipelineSettings);
      const rewrittenText = htmlToText(rewrittenMarkupResult.html);
      const diagnostics = buildDiagnostics(detectedItems, finalUrls, digestEntries, pipelineErrors, normalizedRawText, pipelineSettings);

      if (debugApi) {
        debugApi.pipeline("pipeline analysis complete", {
          detectedItemCount: detectedItems.length,
          finalUrlCount: finalUrls.length,
          changedUrlCount: changedUrls.length,
          digestEntryCount: digestEntries.length,
          rewrittenCount: rewrittenMarkupResult.count,
          errorCount: pipelineErrors.length
        });
        debugApi.functionOut("pipeline.analyzeInput", {
          detectedItemCount: detectedItems.length,
          errorCount: pipelineErrors.length
        });
      }

      return {
        rawText: normalizedRawText,
        sourceHtml: sourceMarkup,
        options: pipelineSettings,
        items: detectedItems,
        finalUrls: finalUrls,
        changedUrls: changedUrls,
        digestEntries: digestEntries,
        rewrittenHtml: rewrittenMarkupResult.html,
        rewrittenText: rewrittenText,
        rewrittenCount: rewrittenMarkupResult.count,
        diagnostics: diagnostics,
        errors: pipelineErrors
      };
    }

    return {
      analyzeInput: analyzeInput,
      buildChangedUrls: buildChangedUrls,
      buildDiagnostics: buildDiagnostics,
      buildDigestEntries: buildDigestEntries,
      buildFinalUrlEntries: buildFinalUrlEntries,
      buildFinalUrlLinkText: buildFinalUrlLinkText,
      buildStandaloneFinalUrls: buildStandaloneFinalUrls,
      cleanInputText: cleanInputText,
      classify: classify,
      classifyUrlValue: classifyUrlValue,
      defaultPipelineSettings: defaultPipelineSettings,
      decodeRepeated: decodeRepeated,
      decodeValue: decodeValue,
      detectURLs: detectURLs,
      detectUrlsFromHtml: detectUrlsFromHtml,
      escapeHtml: escapeHtml,
      extractBaseUrl: extractBaseUrl,
      extractFirstAbsoluteUrl: extractFirstAbsoluteUrl,
      extractHost: extractHost,
      extractOriginUrl: extractOriginUrl,
      buildFinalUrlDisplayName: buildFinalUrlDisplayName,
      buildFinalUrlEntry: buildFinalUrlEntry,
      extractTracking: extractTracking,
      extractTrackingCandidates: extractTrackingCandidates,
      findNearbyTitle: findNearbyTitle,
      firstUrlCandidate: firstUrlCandidate,
      getItemFinalUrls: getItemFinalUrls,
      getItemDisplayType: getItemDisplayType,
      getPreferredReplacementUrl: getPreferredReplacementUrl,
      htmlToText: htmlToText,
      isLikelyTrackerHost: isLikelyTrackerHost,
      isValidURL: isValidURL,
      locateLineForOriginal: locateLineForOriginal,
      normalizeLine: normalizeLine,
      normalizeTextValue: normalizeTextValue,
      normalizeTitle: normalizeTitle,
      peel: peel,
      populateBypassedDataForItems: populateBypassedDataForItems,
      populateResolvedDataForItems: populateResolvedDataForItems,
      resolvePipelineSettings: resolvePipelineSettings,
      resolveURL: resolveURL,
      resolveURLMinimalRecursive: resolveURLMinimalRecursive,
      rewriteHtml: rewriteHtml,
      rewriteHtmlForStandalonePreview: rewriteHtmlForStandalonePreview,
      splitMerged: splitMerged,
      validateTitle: validateTitle
    };
  }
);
