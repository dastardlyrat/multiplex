(function attachMergedLinkLabPipeline(globalScope, createPipelineApi) {
  "use strict";

  const pipelineApi = createPipelineApi(globalScope);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineApi;
  }

  if (globalScope) {
    globalScope.MergedLinkLabPipeline = pipelineApi;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createMergedLinkLabPipelineApi(globalScope) {
    "use strict";

    const debugApi = globalScope && globalScope.mergedLinkLabDebug ? globalScope.mergedLinkLabDebug : null;
    if (debugApi && typeof debugApi.configure === "function") {
      debugApi.configure({ context: "standalone-lab-pipeline", module: "pipeline" });
    }

    const regularExpressions = {
      urlToken: /https?:\/\/[^\s<>"']+/gi,
      trailingUrlPunctuation: /[)\]\.,>]+$/,
      wrappedNoise: /[<>]/g,
      lightweightWhitespaceNoise: /[\u2000-\u200F\u2028-\u202F]/g,
      heavyWhitespaceNoise: /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u2000-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g,
      protectedMarkupTag: /^(A|SCRIPT|STYLE|NOSCRIPT|TEXTAREA|PRE|CODE)$/i,
      embeddedTrackingParameter:
        /[?&](?:url|u|target|redirect|redirect_url|dest|destination|next|forward|goto|continue|to|href|link|data)=([^&]+)/gi
    };

    const preferredTrackingParameterNames = [
      "url",
      "u",
      "target",
      "redirect",
      "redirect_url",
      "dest",
      "destination",
      "next",
      "forward",
      "goto",
      "continue",
      "to",
      "href",
      "link",
      "data"
    ];

    const trackingHostKeywords = [
      "list-manage",
      "rs6.net",
      "ccsend.com",
      "kajabimail",
      "mail",
      "tracking",
      "redirect",
      "click"
    ];

    function convertValueToString(value) {
      return String(value || "");
    }

    function getNodeFilterFlag(flagName, fallbackValue) {
      return globalScope && globalScope.NodeFilter && typeof globalScope.NodeFilter[flagName] === "number"
        ? globalScope.NodeFilter[flagName]
        : fallbackValue;
    }

    function getNodeTypeValue(typeName, fallbackValue) {
      return globalScope && globalScope.Node && typeof globalScope.Node[typeName] === "number"
        ? globalScope.Node[typeName]
        : fallbackValue;
    }

    function createHtmlParserDocument(sourceMarkup) {
      if (!globalScope || typeof globalScope.DOMParser !== "function") {
        return null;
      }

      const htmlParser = new globalScope.DOMParser();
      return htmlParser.parseFromString(convertValueToString(sourceMarkup), "text/html");
    }

    function escapeHtml(text) {
      return convertValueToString(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function cleanInputText(rawInput) {
      const normalizedText = convertValueToString(rawInput)
        .replace(/\r\n?/g, "\n")
        .replace(/\u00A0/g, " ")
        .replace(regularExpressions.lightweightWhitespaceNoise, "");

      const normalizedLines = normalizedText
        .split("\n")
        .map(function collapseLineWhitespace(lineText) {
          return lineText.replace(/[ \t]+/g, " ").replace(/[ \t]+$/g, "");
        });

      return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    function normalizeLine(lineText) {
      return convertValueToString(lineText)
        .replace(regularExpressions.wrappedNoise, "")
        .replace(regularExpressions.lightweightWhitespaceNoise, "")
        .trim();
    }

    function validateTitle(rawTitleText) {
      const normalizedTitle = normalizeLine(rawTitleText)
        .replace(/[*_`]/g, "")
        .replace(/^\|\s*/, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!normalizedTitle) return null;
      if (normalizedTitle.startsWith("[image")) return null;
      if (normalizedTitle.split(" ").length > 15) return null;
      if (/^[a-z].*\.$/.test(normalizedTitle)) return null;
      if (!/[A-Z0-9:!?]/.test(normalizedTitle)) return null;

      return normalizedTitle;
    }

    function normalizeTitle(titleText, fallbackHost) {
      if (!titleText) return fallbackHost;
      if (titleText.includes("http://") || titleText.includes("https://")) return fallbackHost;
      if (titleText.length > 120) return fallbackHost;
      return titleText;
    }

    function createDetectedUrlRecord(originalUrl, recordId) {
      return {
        id: recordId,
        original: originalUrl,
        normalized: null,
        resolved: [],
        validResolved: [],
        replacementUrl: "",
        notes: []
      };
    }

    function detectURLs(textToScan, options) {
      if (debugApi) {
        debugApi.functionIn("standalone-lab-pipeline.detectURLs", {
          textLength: convertValueToString(textToScan).length,
          startId: options && options.startId ? options.startId : 1
        });
      }

      const optionBag = options || {};
      const startingRecordId = optionBag.startId || 1;
      const detectedUrlTokens = convertValueToString(textToScan).match(regularExpressions.urlToken) || [];

      if (debugApi) {
        debugApi.variable("standalone lab detected url token count assigned", {
          detectedUrlTokenCount: detectedUrlTokens.length
        });
        debugApi.functionOut("standalone-lab-pipeline.detectURLs", {
          detectedUrlTokenCount: detectedUrlTokens.length
        });
      }

      return detectedUrlTokens.map(function mapDetectedUrlToken(originalUrl, index) {
        if (debugApi && index < 3) {
          debugApi.loop("standalone lab detectURLs mapping token", {
            index: index,
            recordId: startingRecordId + index
          });
        }
        return createDetectedUrlRecord(originalUrl, startingRecordId + index);
      });
    }

    function detectUrlsFromHtml(sourceMarkup) {
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      if (!parsedDocument) {
        return detectURLs(sourceMarkup);
      }

      const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      const showElementNodes = getNodeFilterFlag("SHOW_ELEMENT", 1);
      const showTextNodes = getNodeFilterFlag("SHOW_TEXT", 4);
      const htmlWalker = rootNode.ownerDocument.createTreeWalker(rootNode, showElementNodes | showTextNodes);
      const detectedItems = [];
      let nextRecordId = 1;
      let currentNode = rootNode;

      while (currentNode) {
        const tagName = convertValueToString(currentNode.tagName).toUpperCase();

        if (currentNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && tagName === "A") {
          const hrefValue = convertValueToString(currentNode.getAttribute("href")).trim();

          if (/^https?:\/\//i.test(hrefValue)) {
            detectedItems.push(createDetectedUrlRecord(hrefValue, nextRecordId));
            nextRecordId += 1;
          }
        }

        if (currentNode.nodeType === getNodeTypeValue("TEXT_NODE", 3)) {
          const parentTagName = currentNode.parentElement ? currentNode.parentElement.tagName : "";

          if (!regularExpressions.protectedMarkupTag.test(parentTagName)) {
            const matchedTextUrls = detectURLs(currentNode.nodeValue || "", { startId: nextRecordId });
            if (matchedTextUrls.length) {
              detectedItems.push.apply(detectedItems, matchedTextUrls);
              nextRecordId += matchedTextUrls.length;
            }
          }
        }

        currentNode = htmlWalker.nextNode();
      }

      return detectedItems;
    }

    function peel(urlValue) {
      let peeledUrl = convertValueToString(urlValue).trim();
      const cleanupNotes = [];

      if (regularExpressions.trailingUrlPunctuation.test(peeledUrl)) {
        peeledUrl = peeledUrl.replace(regularExpressions.trailingUrlPunctuation, "");
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

    function decodeValue(valueToDecode) {
      try {
        return decodeURIComponent(valueToDecode);
      } catch {
        return valueToDecode;
      }
    }

    function decodeRepeated(valueToDecode, maximumRounds) {
      let decodedValue = valueToDecode;
      const totalDecodePasses = maximumRounds || 3;

      for (let decodeRoundIndex = 0; decodeRoundIndex < totalDecodePasses; decodeRoundIndex += 1) {
        const nextDecodedValue = decodeValue(decodedValue);
        if (nextDecodedValue === decodedValue) break;
        decodedValue = nextDecodedValue;
      }

      return decodedValue;
    }

    function extractFirstAbsoluteUrl(valueToInspect) {
      const candidateText = convertValueToString(valueToInspect).trim();

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

    function firstUrlCandidate(candidateValues) {
      for (let valueIndex = 0; valueIndex < candidateValues.length; valueIndex += 1) {
        const rawCandidateValue = convertValueToString(candidateValues[valueIndex]).trim();

        if (!rawCandidateValue) {
          continue;
        }

        const decodedCandidateValue = decodeRepeated(rawCandidateValue, 4);
        const extractedAbsoluteUrl = extractFirstAbsoluteUrl(decodedCandidateValue);

        if (extractedAbsoluteUrl) {
          return extractedAbsoluteUrl;
        }
      }

      return null;
    }

    function isLikelyTrackerHost(hostName) {
      const normalizedHostName = convertValueToString(hostName).toLowerCase();

      if (!normalizedHostName) {
        return false;
      }

      return trackingHostKeywords.some(function hasTrackingKeyword(keyword) {
        return normalizedHostName.includes(keyword);
      });
    }

    function extractTrackingCandidates(urlValue) {
      const foundDestinationUrls = [];
      const seenDestinationUrls = new Set();
      const trimmedUrlValue = convertValueToString(urlValue).trim();

      function rememberDestinationCandidate(candidateValue) {
        const extractedAbsoluteUrl = extractFirstAbsoluteUrl(candidateValue);

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
        preferredTrackingParameterNames.forEach(function inspectTrackingParameter(parameterName) {
          parsedUrl.searchParams.getAll(parameterName).forEach(function addTrackingParameterValue(parameterValue) {
            rememberDestinationCandidate(decodeRepeated(parameterValue, 4));
          });
        });

        parsedUrl.searchParams.forEach(function inspectAllSearchParameterValues(parameterValue) {
          rememberDestinationCandidate(decodeRepeated(parameterValue, 4));
        });

        if (isLikelyTrackerHost(parsedUrl.hostname)) {
          rememberDestinationCandidate(decodeRepeated(trimmedUrlValue, 4));
        }
      }

      const embeddedTrackingMatches = [...trimmedUrlValue.matchAll(regularExpressions.embeddedTrackingParameter)];
      embeddedTrackingMatches.forEach(function inspectEmbeddedTrackingMatch(embeddedMatch) {
        rememberDestinationCandidate(decodeRepeated(embeddedMatch[1], 4));
      });

      return foundDestinationUrls;
    }

    function extractTracking(urlValue) {
      const detectedTrackingCandidates = extractTrackingCandidates(urlValue);
      return detectedTrackingCandidates.length ? detectedTrackingCandidates[0] : null;
    }

    function splitMerged(urlValue) {
      const mergedUrlSegments = convertValueToString(urlValue).match(/https?:\/\/.*?(?=https?:\/\/|$)/g);
      return mergedUrlSegments && mergedUrlSegments.length ? mergedUrlSegments : [convertValueToString(urlValue)];
    }

    function resolveURL(urlValue) {
      const pendingUrlQueue = [{ value: urlValue, depth: 0 }];
      const seenQueuedUrls = new Set([urlValue]);
      const resolvedLeafUrls = [];
      const seenLeafUrls = new Set();
      const maximumResolutionDepth = 6;

      while (pendingUrlQueue.length) {
        const currentQueueEntry = pendingUrlQueue.shift();
        const mergedUrlParts = splitMerged(currentQueueEntry.value);

        mergedUrlParts.forEach(function inspectMergedUrlPart(mergedUrlPart) {
          const destinationCandidates = extractTrackingCandidates(mergedUrlPart);

          if (destinationCandidates.length && currentQueueEntry.depth < maximumResolutionDepth) {
            destinationCandidates.forEach(function queueDestinationCandidate(candidateUrl) {
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

          if (!seenLeafUrls.has(mergedUrlPart)) {
            seenLeafUrls.add(mergedUrlPart);
            resolvedLeafUrls.push(mergedUrlPart);
          }
        });
      }

      return resolvedLeafUrls.length ? resolvedLeafUrls : [urlValue];
    }

    function resolveURLMinimalRecursive(urlValue) {
      const seenIntermediateUrls = new Set();
      let currentUrlValue = convertValueToString(urlValue).trim();
      let safetyGuardCount = 0;

      while (currentUrlValue && !seenIntermediateUrls.has(currentUrlValue) && safetyGuardCount < 24) {
        safetyGuardCount += 1;
        seenIntermediateUrls.add(currentUrlValue);

        const peeledUrl = peel(currentUrlValue).value;
        const decodedUrl = decodeRepeated(peeledUrl, 4);
        const resolvedCandidates = resolveURL(decodedUrl);
        const validResolvedCandidates = resolvedCandidates.filter(isValidURL);
        const preferredNextUrl = convertValueToString(validResolvedCandidates[0] || resolvedCandidates[0] || decodedUrl || currentUrlValue).trim();

        if (!preferredNextUrl || preferredNextUrl === currentUrlValue) {
          break;
        }

        currentUrlValue = preferredNextUrl;
      }

      return currentUrlValue || convertValueToString(urlValue).trim();
    }

    function isValidURL(urlValue) {
      try {
        new URL(urlValue);
        return true;
      } catch {
        return false;
      }
    }

    function extractHost(urlValue) {
      try {
        return new URL(urlValue).hostname;
      } catch {
        return "";
      }
    }

    function extractBaseUrl(urlValue) {
      try {
        const parsedUrl = new URL(urlValue);
        return parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, "");
      } catch {
        return urlValue;
      }
    }

    function extractOriginUrl(urlValue) {
      try {
        const parsedUrl = new URL(urlValue);
        return parsedUrl.protocol + "//" + parsedUrl.host;
      } catch {
        return urlValue;
      }
    }

    function classify(hostName) {
      if (!hostName) return "unknown";
      if (hostName.includes("list-manage")) return "publisher";
      if (hostName.includes("rs6.net") || hostName.includes("kajabimail") || hostName.includes("ymlpmail")) return "newsletter";
      if (/track|trk|click|redirect/i.test(hostName)) return "tracker";
      return "destination";
    }

    function normalizeAnchorText(textValue) {
      return convertValueToString(textValue)
        .replace(/\u00A0/g, " ")
        .replace(/[ \t\f\v]+/g, " ")
        .trim();
    }

    function normalizeTextValue(textValue) {
      return convertValueToString(textValue)
        .replace(regularExpressions.heavyWhitespaceNoise, "")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t\f\v]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n");
    }

    function locateLineForOriginal(rawText, originalUrl, fallbackStartIndex) {
      const safeRawText = convertValueToString(rawText);
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

    function findNearbyTitle(lines, lineIndex) {
      for (let nearbyLineIndex = lineIndex - 1; nearbyLineIndex >= 0 && nearbyLineIndex > lineIndex - 10; nearbyLineIndex -= 1) {
        const validatedTitle = validateTitle(lines[nearbyLineIndex]);
        if (validatedTitle) {
          return validatedTitle;
        }
      }

      return null;
    }

    function buildStandaloneFinalUrls(items) {
      return (items || []).flatMap(function flattenResolvedUrls(item) {
        return item.validResolved && item.validResolved.length ? item.validResolved : item.resolved;
      });
    }

    function buildDigestEntries(rawText, items, options) {
      const optionBag = options || {};
      const useReplacementUrlOnly = !!optionBag.useReplacementUrlOnly;
      const inputLines = convertValueToString(rawText).split("\n");
      const digestEntries = [];
      const seenDigestKeys = new Set();
      let nextSearchStartIndex = 0;

      (items || []).forEach(function inspectDetectedItem(item) {
        const locatedOriginalLine = locateLineForOriginal(rawText, item.original, nextSearchStartIndex);
        nextSearchStartIndex = locatedOriginalLine.nextStart;

        const digestUrls = useReplacementUrlOnly
          ? (item.replacementUrl ? [item.replacementUrl] : [])
          : (item.validResolved && item.validResolved.length ? item.validResolved : item.resolved);

        digestUrls.forEach(function addDigestEntry(resolvedUrl) {
          const resolvedHost = extractHost(resolvedUrl);
          const nearbyTitle = locatedOriginalLine.lineIndex >= 0 ? findNearbyTitle(inputLines, locatedOriginalLine.lineIndex) : null;
          const displayTitle = normalizeTitle(nearbyTitle, resolvedHost || "unknown-host");
          const digestKey = displayTitle + "|" + resolvedHost;

          if (!displayTitle || seenDigestKeys.has(digestKey)) {
            return;
          }

          seenDigestKeys.add(digestKey);
          digestEntries.push({
            title: displayTitle,
            url: resolvedUrl,
            host: resolvedHost,
            type: classify(resolvedHost)
          });
        });
      });

      return digestEntries;
    }

    function buildChangedUrls(items) {
      const changedUrlEntries = [];
      const seenChangedUrlKeys = new Set();

      (items || []).forEach(function inspectItem(item) {
        const originalUrl = convertValueToString(item.original).trim();
        const replacementUrl = convertValueToString(item.replacementUrl).trim();

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
          finalBaseUrl: extractBaseUrl(replacementUrl),
          type: classify(extractHost(replacementUrl))
        });
      });

      return changedUrlEntries;
    }

    function getPreferredReplacementUrl(item) {
      const preferredUrl = item && item.validResolved && item.validResolved.length
        ? item.validResolved[0]
        : (item && item.resolved && item.resolved.length ? item.resolved[0] : "");

      return convertValueToString(preferredUrl || item.normalized || item.original).trim();
    }

    function buildReplacementLookup(items) {
      const replacementByOriginalUrl = new Map();
      const replacementByNormalizedUrl = new Map();

      (items || []).forEach(function inspectReplacementItem(item) {
        const replacementUrl = convertValueToString(item.replacementUrl).trim();
        const originalUrl = convertValueToString(item.original).trim();
        const normalizedUrl = convertValueToString(item.normalized).trim();

        if (!replacementUrl) {
          return;
        }

        if (originalUrl && !replacementByOriginalUrl.has(originalUrl)) {
          replacementByOriginalUrl.set(originalUrl, replacementUrl);
        }

        if (normalizedUrl && !replacementByNormalizedUrl.has(normalizedUrl)) {
          replacementByNormalizedUrl.set(normalizedUrl, replacementUrl);
        }
      });

      return {
        byOriginal: replacementByOriginalUrl,
        byNormalized: replacementByNormalizedUrl
      };
    }

    function lookupReplacementUrl(replacementLookup, urlValue) {
      const trimmedUrlValue = convertValueToString(urlValue).trim();

      if (!trimmedUrlValue) {
        return "";
      }

      if (replacementLookup.byOriginal.has(trimmedUrlValue)) {
        return replacementLookup.byOriginal.get(trimmedUrlValue);
      }

      const normalizedUrlValue = peel(trimmedUrlValue).value;

      if (replacementLookup.byNormalized.has(normalizedUrlValue)) {
        return replacementLookup.byNormalized.get(normalizedUrlValue);
      }

      return "";
    }

    function looksLikeUrlText(textValue) {
      const normalizedAnchorText = normalizeAnchorText(textValue);
      return !normalizedAnchorText || /^https?:\/\//i.test(normalizedAnchorText) || normalizedAnchorText === normalizedAnchorText.toLowerCase();
    }

    function cleanupMarkup(rootNode) {
      if (!rootNode || !rootNode.ownerDocument) {
        return;
      }

      const textWalker = rootNode.ownerDocument.createTreeWalker(rootNode, getNodeFilterFlag("SHOW_TEXT", 4));
      const textNodes = [];
      let currentTextNode = textWalker.nextNode();

      while (currentTextNode) {
        textNodes.push(currentTextNode);
        currentTextNode = textWalker.nextNode();
      }

      textNodes.forEach(function normalizeTextNode(textNode) {
        const parentTagName = textNode.parentElement ? textNode.parentElement.tagName : "";

        if (regularExpressions.protectedMarkupTag.test(parentTagName)) {
          return;
        }

        const normalizedNodeValue = normalizeTextValue(textNode.nodeValue || "");

        if (!normalizedNodeValue.trim()) {
          textNode.remove();
          return;
        }

        if (normalizedNodeValue !== (textNode.nodeValue || "")) {
          textNode.nodeValue = normalizedNodeValue;
        }
      });

      Array.from(rootNode.querySelectorAll("a[href]")).forEach(function normalizeAnchor(anchorElement) {
        const trimmedHref = convertValueToString(anchorElement.getAttribute("href")).trim();
        anchorElement.setAttribute("href", trimmedHref);

        const normalizedAnchorLabel = normalizeAnchorText(anchorElement.textContent || "");
        if (normalizedAnchorLabel) {
          anchorElement.textContent = normalizedAnchorLabel;
        }
      });

      Array.from(rootNode.querySelectorAll("*")).forEach(function trimExcessLineBreaks(elementNode) {
        let consecutiveBreakCount = 0;

        Array.from(elementNode.childNodes).forEach(function inspectChildNode(childNode) {
          if (childNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && childNode.tagName === "BR") {
            consecutiveBreakCount += 1;
            if (consecutiveBreakCount > 2) {
              childNode.remove();
            }
            return;
          }

          if (childNode.nodeType === getNodeTypeValue("TEXT_NODE", 3) && !normalizeTextValue(childNode.nodeValue || "").trim()) {
            return;
          }

          consecutiveBreakCount = 0;
        });
      });
    }

    function rewriteAnchors(rootNode, replacementLookup) {
      let rewrittenAnchorCount = 0;

      Array.from(rootNode.querySelectorAll("a[href]")).forEach(function rewriteAnchor(anchorElement) {
        const originalHref = convertValueToString(anchorElement.getAttribute("href")).trim();

        if (!/^https?:\/\//i.test(originalHref)) {
          return;
        }

        const replacementUrl = lookupReplacementUrl(replacementLookup, originalHref);
        if (!replacementUrl) {
          return;
        }

        anchorElement.setAttribute("href", replacementUrl);
        anchorElement.setAttribute("data-merged-link-lab", classify(extractHost(replacementUrl)));

        if (looksLikeUrlText(anchorElement.textContent || "")) {
          anchorElement.textContent = extractBaseUrl(replacementUrl) || replacementUrl;
        }

        rewrittenAnchorCount += 1;
      });

      return rewrittenAnchorCount;
    }

    function replaceTextUrls(rootNode, replacementLookup) {
      const textWalker = rootNode.ownerDocument.createTreeWalker(rootNode, getNodeFilterFlag("SHOW_TEXT", 4));
      const candidateTextNodes = [];
      let currentTextNode = textWalker.nextNode();
      let rewrittenTextNodeCount = 0;

      while (currentTextNode) {
        if (
          currentTextNode.parentElement &&
          !regularExpressions.protectedMarkupTag.test(currentTextNode.parentElement.tagName) &&
          /https?:\/\/[^\s<>"']+/i.test(currentTextNode.nodeValue || "")
        ) {
          candidateTextNodes.push(currentTextNode);
        }

        currentTextNode = textWalker.nextNode();
      }

      candidateTextNodes.forEach(function rewriteTextNode(textNode) {
        const rawTextValue = textNode.nodeValue || "";
        const replacementFragment = rootNode.ownerDocument.createDocumentFragment();
        const matchingExpression = new RegExp(regularExpressions.urlToken.source, "gi");
        let nextSearchIndex = 0;
        let nodeWasChanged = false;
        let currentMatch = null;

        while ((currentMatch = matchingExpression.exec(rawTextValue)) !== null) {
          const originalUrlToken = currentMatch[0];
          const matchStartIndex = currentMatch.index;
          const matchEndIndex = matchStartIndex + originalUrlToken.length;
          const peeledUrlToken = peel(originalUrlToken);
          const trailingPunctuationMatch = convertValueToString(originalUrlToken).match(regularExpressions.trailingUrlPunctuation);
          const trailingPunctuation = trailingPunctuationMatch ? trailingPunctuationMatch[0] : "";
          const replacementUrl =
            lookupReplacementUrl(replacementLookup, originalUrlToken) ||
            lookupReplacementUrl(replacementLookup, peeledUrlToken.value);

          if (!replacementUrl) {
            continue;
          }

          const replacementText = replacementUrl + trailingPunctuation;

          if (matchStartIndex > nextSearchIndex) {
            replacementFragment.appendChild(rootNode.ownerDocument.createTextNode(rawTextValue.slice(nextSearchIndex, matchStartIndex)));
          }

          replacementFragment.appendChild(rootNode.ownerDocument.createTextNode(replacementText));
          nextSearchIndex = matchEndIndex;
          nodeWasChanged = nodeWasChanged || replacementText !== originalUrlToken;
        }

        if (!nodeWasChanged) {
          return;
        }

        if (nextSearchIndex < rawTextValue.length) {
          replacementFragment.appendChild(rootNode.ownerDocument.createTextNode(rawTextValue.slice(nextSearchIndex)));
        }

        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(replacementFragment, textNode);
        }

        rewrittenTextNodeCount += 1;
      });

      return rewrittenTextNodeCount;
    }

    function rewriteHtml(sourceMarkup, items) {
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      if (!parsedDocument) {
        return {
          html: convertValueToString(sourceMarkup),
          count: 0
        };
      }

      const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      const replacementLookup = buildReplacementLookup(items || []);
      const rewrittenAnchorCount = rewriteAnchors(rootNode, replacementLookup);
      const rewrittenTextNodeCount = replaceTextUrls(rootNode, replacementLookup);

      cleanupMarkup(rootNode);

      return {
        html: parsedDocument.body && parsedDocument.body.innerHTML ? parsedDocument.body.innerHTML : convertValueToString(sourceMarkup),
        count: rewrittenAnchorCount + rewrittenTextNodeCount
      };
    }

    function isHumanReadableAnchor(anchorElement) {
      const anchorText = normalizeAnchorText(anchorElement && anchorElement.textContent);

      if (!anchorText) return false;
      if (/^https?:\/\//i.test(anchorText)) return false;
      if (anchorText.length > 140) return false;
      if (/^\[image/i.test(anchorText)) return true;
      if (/facebook|instagram|youtube|linkedin|tiktok/i.test(anchorText)) return true;
      return anchorText.split(/\s+/).length <= 10;
    }

    function cleanupStandalonePreviewMarkup(documentRoot, parsedDocument) {
      const textWalker = parsedDocument.createTreeWalker(documentRoot, getNodeFilterFlag("SHOW_TEXT", 4));
      const textNodes = [];
      let currentTextNode = textWalker.nextNode();

      while (currentTextNode) {
        textNodes.push(currentTextNode);
        currentTextNode = textWalker.nextNode();
      }

      textNodes.forEach(function normalizePreviewTextNode(textNode) {
        const parentTagName = textNode.parentElement ? textNode.parentElement.tagName : "";
        const shouldPreserveWhitespace = /^(PRE|TEXTAREA)$/i.test(parentTagName);
        const normalizedValue = shouldPreserveWhitespace
          ? convertValueToString(textNode.nodeValue)
          : normalizeTextValue(textNode.nodeValue || "");

        if (!shouldPreserveWhitespace && !normalizedValue.trim()) {
          textNode.remove();
          return;
        }

        if (normalizedValue !== (textNode.nodeValue || "")) {
          textNode.nodeValue = normalizedValue;
        }
      });

      Array.from(parsedDocument.querySelectorAll("a[href]")).forEach(function normalizePreviewAnchor(anchorElement) {
        const trimmedHref = convertValueToString(anchorElement.getAttribute("href")).trim();
        anchorElement.setAttribute("href", trimmedHref);

        const normalizedAnchorLabel = normalizeTextValue(anchorElement.textContent || "").trim();
        if (normalizedAnchorLabel) {
          anchorElement.textContent = normalizedAnchorLabel;
        }
      });

      function buildAnchorSignature(anchorElement) {
        if (!anchorElement || anchorElement.tagName !== "A" || !anchorElement.hasAttribute("href")) {
          return "";
        }

        const hrefValue = convertValueToString(anchorElement.getAttribute("href")).trim();
        const textValue = normalizeTextValue(anchorElement.textContent || "").trim();
        return hrefValue + "||" + textValue;
      }

      function isIgnorableNodeBetweenLinks(node) {
        if (!node) return true;
        if (node.nodeType === getNodeTypeValue("TEXT_NODE", 3)) return !normalizeTextValue(node.nodeValue || "").trim();
        return node.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && node.tagName === "BR";
      }

      Array.from(documentRoot.querySelectorAll("*")).forEach(function removeImmediateDuplicateAnchors(parentElement) {
        let previousAnchorSignature = "";

        Array.from(parentElement.childNodes).forEach(function inspectChildNode(childNode) {
          if (isIgnorableNodeBetweenLinks(childNode)) {
            return;
          }

          if (
            childNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) &&
            childNode.tagName === "A" &&
            childNode.hasAttribute("href")
          ) {
            const currentAnchorSignature = buildAnchorSignature(childNode);

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

      function buildSimpleBlockSignature(blockElement) {
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

        return buildAnchorSignature(directAnchorChildren[0]);
      }

      const blockCandidates = Array.from(documentRoot.querySelectorAll("p,div,li,td,th,span"));
      let previousBlockSignature = "";

      blockCandidates.forEach(function removeDuplicateSingleLinkBlocks(blockElement) {
        const currentBlockSignature = buildSimpleBlockSignature(blockElement);

        if (!currentBlockSignature) {
          previousBlockSignature = "";
          return;
        }

        if (currentBlockSignature === previousBlockSignature) {
          blockElement.remove();
          return;
        }

        previousBlockSignature = currentBlockSignature;
      });

      Array.from(documentRoot.querySelectorAll("*")).forEach(function trimPreviewLineBreakRuns(elementNode) {
        let consecutiveBreakCount = 0;

        Array.from(elementNode.childNodes).forEach(function inspectChildNode(childNode) {
          if (childNode.nodeType === getNodeTypeValue("ELEMENT_NODE", 1) && childNode.tagName === "BR") {
            consecutiveBreakCount += 1;
            if (consecutiveBreakCount > 2) {
              childNode.remove();
            }
            return;
          }

          if (childNode.nodeType === getNodeTypeValue("TEXT_NODE", 3) && !(childNode.nodeValue || "").trim()) {
            return;
          }

          consecutiveBreakCount = 0;
        });
      });

      const reverseCleanupCandidates = Array.from(documentRoot.querySelectorAll("p,div,span,td,th,li")).reverse();

      reverseCleanupCandidates.forEach(function removeEmptyStructuralNodes(elementNode) {
        if (elementNode.querySelector("img,svg,table,ul,ol,a,button,input,textarea,select,iframe")) {
          return;
        }

        const meaningfulText = normalizeTextValue(elementNode.textContent || "").replace(/\s+/g, "");
        const hasNonBreakChildElement = Array.from(elementNode.children).some(function findNonBreakChild(childElement) {
          return childElement.tagName !== "BR";
        });

        if (!meaningfulText && !hasNonBreakChildElement) {
          elementNode.remove();
        }
      });
    }

    function rewriteHtmlForStandalonePreview(sourceMarkup) {
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      if (!parsedDocument) {
        return {
          html: convertValueToString(sourceMarkup),
          count: 0
        };
      }

      const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      let rewrittenNodeCount = 0;

      Array.from(parsedDocument.querySelectorAll("a[href]")).forEach(function rewritePreviewAnchor(anchorElement) {
        const originalHref = convertValueToString(anchorElement.getAttribute("href")).trim();

        if (!/^https?:\/\//i.test(originalHref)) {
          return;
        }

        const resolvedHref = resolveURLMinimalRecursive(originalHref);
        const resolvedHost = extractHost(resolvedHref);
        const resolvedType = classify(resolvedHost);
        const resolvedOriginUrl = extractOriginUrl(resolvedHref);

        anchorElement.setAttribute("href", resolvedHref);
        anchorElement.setAttribute("data-link-type", resolvedType);
        anchorElement.setAttribute("data-base-url", resolvedOriginUrl);

        if (!isHumanReadableAnchor(anchorElement)) {
          anchorElement.textContent = resolvedOriginUrl + " (" + resolvedType + ")";
        }

        rewrittenNodeCount += 1;
      });

      const textWalker = parsedDocument.createTreeWalker(rootNode, getNodeFilterFlag("SHOW_TEXT", 4));
      const textNodesToRewrite = [];
      let currentTextNode = textWalker.nextNode();

      while (currentTextNode) {
        const parentTagName = currentTextNode.parentElement ? currentTextNode.parentElement.tagName : "";

        if (currentTextNode.parentElement && !/^(A|SCRIPT|STYLE)$/i.test(parentTagName)) {
          textNodesToRewrite.push(currentTextNode);
        }

        currentTextNode = textWalker.nextNode();
      }

      textNodesToRewrite.forEach(function rewritePreviewTextNode(textNode) {
        const rawTextValue = textNode.nodeValue || "";

        if (!rawTextValue || !/https?:\/\//i.test(rawTextValue)) {
          return;
        }

        const replacementFragment = parsedDocument.createDocumentFragment();
        const matchingExpression = new RegExp(regularExpressions.urlToken.source, "gi");
        let nextSearchIndex = 0;
        let nodeWasChanged = false;
        let currentMatch = null;

        while ((currentMatch = matchingExpression.exec(rawTextValue)) !== null) {
          const originalUrlToken = currentMatch[0];
          const matchStartIndex = currentMatch.index;
          const matchEndIndex = matchStartIndex + originalUrlToken.length;

          if (matchStartIndex > nextSearchIndex) {
            replacementFragment.appendChild(parsedDocument.createTextNode(rawTextValue.slice(nextSearchIndex, matchStartIndex)));
          }

          const resolvedUrl = resolveURLMinimalRecursive(originalUrlToken);
          const resolvedHost = extractHost(resolvedUrl);
          const resolvedType = classify(resolvedHost);
          const resolvedOriginUrl = extractOriginUrl(resolvedUrl);
          const anchorElement = parsedDocument.createElement("a");

          anchorElement.setAttribute("href", resolvedUrl);
          anchorElement.setAttribute("target", "_blank");
          anchorElement.setAttribute("rel", "noopener noreferrer");
          anchorElement.setAttribute("data-link-type", resolvedType);
          anchorElement.setAttribute("data-base-url", resolvedOriginUrl);
          anchorElement.textContent = resolvedOriginUrl + " (" + resolvedType + ")";

          replacementFragment.appendChild(anchorElement);
          rewrittenNodeCount += 1;
          nodeWasChanged = true;
          nextSearchIndex = matchEndIndex;
        }

        if (!nodeWasChanged) {
          return;
        }

        if (nextSearchIndex < rawTextValue.length) {
          replacementFragment.appendChild(parsedDocument.createTextNode(rawTextValue.slice(nextSearchIndex)));
        }

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

    function htmlToText(sourceMarkup) {
      const parsedDocument = createHtmlParserDocument(sourceMarkup);

      if (!parsedDocument) {
        return cleanInputText(convertValueToString(sourceMarkup).replace(/<[^>]+>/g, "\n"));
      }

      const bodyNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
      return cleanInputText(bodyNode.innerText || bodyNode.textContent || "");
    }

    function buildDiagnostics(items, finalUrls, digestEntries, errors, rawText) {
      const invalidResolvedUrlCount = (items || []).reduce(function addInvalidResolvedUrls(totalInvalidCount, item) {
        return totalInvalidCount + ((item.resolved || []).length - (item.validResolved || []).length);
      }, 0);

      const diagnosticLines = [
        "INPUT CHARS: " + convertValueToString(rawText).length,
        "RAW URL TOKENS: " + (items || []).length,
        "FINAL URL COUNT: " + (finalUrls || []).length,
        "DIGEST ENTRY COUNT: " + (digestEntries || []).length,
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

    function populateResolvedDataForItems(items) {
      (items || []).forEach(function inspectDetectedItem(item) {
        const peeledUrlToken = peel(item.original);
        item.normalized = peeledUrlToken.value;
        item.notes.push.apply(item.notes, peeledUrlToken.notes);

        item.resolved = resolveURL(item.normalized);
        item.validResolved = item.resolved.filter(isValidURL);

        if (!item.validResolved.length) {
          item.notes.push("NO_VALID_RESOLVED_URL");
        }

        item.replacementUrl = getPreferredReplacementUrl(item);
      });

      return items;
    }

    function analyzeInput(input) {
      if (debugApi) {
        debugApi.functionIn("standalone-lab-pipeline.analyzeInput");
      }

      const payload = input || {};
      const normalizedRawText = cleanInputText(payload.rawText || payload.text || "");
      const sourceMarkup = convertValueToString(payload.sourceHtml || payload.html || "");
      const pipelineErrors = [];
      let detectedItems = [];

      if (debugApi) {
        debugApi.variable("standalone lab analyze input summary assigned", {
          rawTextLength: normalizedRawText.length,
          sourceMarkupLength: sourceMarkup.length,
          hasSourceMarkup: !!sourceMarkup
        });
      }

      try {
        detectedItems = sourceMarkup ? detectUrlsFromHtml(sourceMarkup) : detectURLs(normalizedRawText);
      } catch (detectionError) {
        pipelineErrors.push("stageDetect: " + detectionError.message);
        if (debugApi) {
          debugApi.error("standalone lab pipeline detection failed", { message: detectionError.message });
        }
      }

      try {
        populateResolvedDataForItems(detectedItems);
      } catch (resolutionError) {
        pipelineErrors.push("stageResolve: " + resolutionError.message);
        if (debugApi) {
          debugApi.error("standalone lab pipeline resolution failed", { message: resolutionError.message });
        }
      }

      const finalUrls = detectedItems
        .map(function mapItemToReplacementUrl(item) {
          return convertValueToString(item.replacementUrl).trim();
        })
        .filter(Boolean);
      const changedUrls = buildChangedUrls(detectedItems);
      const digestEntries = buildDigestEntries(normalizedRawText, detectedItems, { useReplacementUrlOnly: true });
      const rewrittenMarkupResult = rewriteHtml(sourceMarkup || normalizedRawText, detectedItems);
      const rewrittenText = htmlToText(rewrittenMarkupResult.html);
      const diagnostics = buildDiagnostics(detectedItems, finalUrls, digestEntries, pipelineErrors, normalizedRawText);

      if (debugApi) {
        debugApi.pipeline("standalone lab pipeline analysis complete", {
          detectedItemCount: detectedItems.length,
          finalUrlCount: finalUrls.length,
          changedUrlCount: changedUrls.length,
          digestEntryCount: digestEntries.length,
          rewrittenCount: rewrittenMarkupResult.count,
          errorCount: pipelineErrors.length
        });
        debugApi.functionOut("standalone-lab-pipeline.analyzeInput", {
          detectedItemCount: detectedItems.length,
          errorCount: pipelineErrors.length
        });
      }

      return {
        rawText: normalizedRawText,
        sourceHtml: sourceMarkup,
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
      buildStandaloneFinalUrls: buildStandaloneFinalUrls,
      cleanInputText: cleanInputText,
      classify: classify,
      decodeRepeated: decodeRepeated,
      decodeValue: decodeValue,
      detectURLs: detectURLs,
      detectUrlsFromHtml: detectUrlsFromHtml,
      escapeHtml: escapeHtml,
      extractBaseUrl: extractBaseUrl,
      extractFirstAbsoluteUrl: extractFirstAbsoluteUrl,
      extractHost: extractHost,
      extractOriginUrl: extractOriginUrl,
      extractTracking: extractTracking,
      extractTrackingCandidates: extractTrackingCandidates,
      findNearbyTitle: findNearbyTitle,
      firstUrlCandidate: firstUrlCandidate,
      getPreferredReplacementUrl: getPreferredReplacementUrl,
      htmlToText: htmlToText,
      isLikelyTrackerHost: isLikelyTrackerHost,
      isValidURL: isValidURL,
      locateLineForOriginal: locateLineForOriginal,
      normalizeLine: normalizeLine,
      normalizeTextValue: normalizeTextValue,
      normalizeTitle: normalizeTitle,
      peel: peel,
      populateResolvedDataForItems: populateResolvedDataForItems,
      resolveURL: resolveURL,
      resolveURLMinimalRecursive: resolveURLMinimalRecursive,
      rewriteHtml: rewriteHtml,
      rewriteHtmlForStandalonePreview: rewriteHtmlForStandalonePreview,
      splitMerged: splitMerged,
      validateTitle: validateTitle
    };
  }
);
