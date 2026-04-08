// Function: attach merged link lab pipeline.
(function attachMergedLinkLabPipeline(globalScope, pipelineBase, pipelineUrlResolverFactory, pipelineHtmlRewriterFactory, createPipelineApi) {
  "use strict";

  const pipelineApi = createPipelineApi(globalScope, pipelineBase, pipelineUrlResolverFactory, pipelineHtmlRewriterFactory);

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
  // Function: resolve shared pipeline URL resolver helpers.
  (function resolveMergedLinkLabPipelineUrlResolver(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineUrlResolver) {
      return globalScope.urlForensicsPipelineUrlResolver;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-url-resolver.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline HTML rewriter helpers.
  (function resolveMergedLinkLabPipelineHtmlRewriter(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineHtmlRewriter) {
      return globalScope.urlForensicsPipelineHtmlRewriter;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-html-rewriter.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: create merged link lab pipeline api.
  // eslint-disable-next-line max-lines-per-function -- Compatibility wrapper while pipeline helper groups move into focused modules.
  function createMergedLinkLabPipelineApi(globalScope, pipelineBase, pipelineUrlResolverFactory, pipelineHtmlRewriterFactory) {
    "use strict";

    const debugApi = globalScope && globalScope.mergedLinkLabDebug ? globalScope.mergedLinkLabDebug : null;
    if (debugApi && typeof debugApi.configure === "function") {
      debugApi.configure({ context: "pipeline", module: "pipeline" });
    }

    if (!pipelineBase || !pipelineBase.regularExpressions) {
      throw new Error("URL Forensics pipeline base helpers are unavailable.");
    }

    if (!pipelineUrlResolverFactory || typeof pipelineUrlResolverFactory.create !== "function") {
      throw new Error("URL Forensics pipeline URL resolver helpers are unavailable.");
    }

    if (!pipelineHtmlRewriterFactory || typeof pipelineHtmlRewriterFactory.create !== "function") {
      throw new Error("URL Forensics pipeline HTML rewriter helpers are unavailable.");
    }

    const regularExpressions = pipelineBase.regularExpressions;
    const defaultPipelineSettings = pipelineBase.defaultPipelineSettings;
    const convertValueToString = pipelineBase.convertValueToString;
    const resolvePipelineSettings = pipelineBase.resolvePipelineSettings;
    const escapeHtml = pipelineBase.escapeHtml;
    const cleanInputText = pipelineBase.cleanInputText;
    const normalizeLine = pipelineBase.normalizeLine;
    const validateTitle = pipelineBase.validateTitle;
    const normalizeTitle = pipelineBase.normalizeTitle;
    const createDetectedUrlRecord = pipelineBase.createDetectedUrlRecord;
    const trackingParameterModel = pipelineBase.trackingParameterModel || null;
    const urlResolver = pipelineUrlResolverFactory.create(pipelineBase);
    const peel = urlResolver.peel;
    const decodeValue = urlResolver.decodeValue;
    const decodeRepeated = urlResolver.decodeRepeated;
    const extractFirstAbsoluteUrl = urlResolver.extractFirstAbsoluteUrl;
    const firstUrlCandidate = urlResolver.firstUrlCandidate;
    const isLikelyTrackerHost = urlResolver.isLikelyTrackerHost;
    const extractTrackingCandidates = urlResolver.extractTrackingCandidates;
    const extractTracking = urlResolver.extractTracking;
    const splitMerged = urlResolver.splitMerged;
    const stripKnownTrackingParameters = urlResolver.stripKnownTrackingParameters;
    const resolveURL = urlResolver.resolveURL;
    const resolveURLMinimalRecursive = urlResolver.resolveURLMinimalRecursive;
    const isValidURL = urlResolver.isValidURL;
    const extractHost = urlResolver.extractHost;
    const extractBaseUrl = urlResolver.extractBaseUrl;
    const extractOriginUrl = urlResolver.extractOriginUrl;
    const extractKnownTrackingParameterNames = urlResolver.extractKnownTrackingParameterNames;
    const buildFinalUrlDisplayName = urlResolver.buildFinalUrlDisplayName;
    const buildFinalUrlLinkText = urlResolver.buildFinalUrlLinkText;
    const buildFinalUrlEntry = urlResolver.buildFinalUrlEntry;
    const classify = urlResolver.classify;
    const classifyUrlValue = urlResolver.classifyUrlValue;
    const htmlRewriter = pipelineHtmlRewriterFactory.create({
      pipelineBase: pipelineBase,
      urlResolver: urlResolver,
      globalScope: globalScope,
      analyzeInput: analyzeInput,
      getPreferredReplacementUrl: getPreferredReplacementUrl,
      getItemDisplayType: getItemDisplayType
    });
    const normalizeTextValue = htmlRewriter.normalizeTextValue;
    const rewriteHtml = htmlRewriter.rewriteHtml;
    const rewriteHtmlForStandalonePreview = htmlRewriter.rewriteHtmlForStandalonePreview;
    const htmlToText = htmlRewriter.htmlToText;

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

    // Function: append unique item note.
    function appendUniqueItemNote(item, noteText) {
      if (!item || !Array.isArray(item.notes) || !noteText || item.notes.indexOf(noteText) !== -1) {
        return;
      }

      item.notes.push(noteText);
    }

    // Function: get item tracker cleanup entries.
    function getItemTrackerCleanupEntries(item) {
      return item && Array.isArray(item.trackerCleanupEntries) ? item.trackerCleanupEntries : [];
    }

    // Function: check whether item stripped tracker parameters.
    function didItemStripTrackingParameters(item) {
      return getItemTrackerCleanupEntries(item).some(function hasTrackerCleanupEntry(cleanupEntry) {
        return cleanupEntry && Array.isArray(cleanupEntry.removedParameterNames) && cleanupEntry.removedParameterNames.length > 0;
      });
    }

    // Function: strip tracking parameters from resolved URLs.
    function stripTrackingParametersFromResolvedUrls(item, pipelineSettings) {
      const strippedResolvedUrls = [];
      const seenResolvedUrls = new Set();
      const removedParameterNames = new Set();
      const trackerCleanupEntries = [];

      if (item) {
        item.trackerCleanupEntries = trackerCleanupEntries;
      }

      (item && Array.isArray(item.resolved) ? item.resolved : []).forEach(function stripResolvedUrl(resolvedUrl) {
        const strippedUrlResult = stripKnownTrackingParameters(resolvedUrl, pipelineSettings);
        const strippedUrlValue = convertValueToString(
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
            originalUrl: convertValueToString(resolvedUrl).trim(),
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
        appendUniqueItemNote(item, "TRACKING_PARAMETER_STRIP_BYPASSED");
      } else if (removedParameterNames.size) {
        appendUniqueItemNote(item, "TRACKING_PARAMS_STRIPPED: " + Array.from(removedParameterNames).join(", "));
      }

      return strippedResolvedUrls;
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

      if (didItemStripTrackingParameters(item)) {
        return "tracker cleaned";
      }

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

    // Function: build diagnostics.
    function buildDiagnostics(items, finalUrls, digestEntries, errors, rawText, options) {
      const pipelineSettings = resolvePipelineSettings(options);
      // Loop: accumulate the current collection into one result.
      const invalidResolvedUrlCount = (items || []).reduce(function addInvalidResolvedUrls(totalInvalidCount, item) {
        return totalInvalidCount + ((item.resolved || []).length - (item.validResolved || []).length);
      }, 0);
      // Loop: accumulate the current collection into one result.
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

      const diagnosticLines = [
        "INPUT CHARS: " + convertValueToString(rawText).length,
        "RAW URL TOKENS: " + (items || []).length,
        "FINAL URL COUNT: " + (finalUrls || []).length,
        "DIGEST ENTRY COUNT: " + (digestEntries || []).length,
        "URL NORMALIZATION + REPAIR: " + (pipelineSettings.enableUrlNormalizationRepair ? "ON" : "OFF"),
        "NORMALIZATION STAGE: " + (pipelineSettings.enableUrlNormalizationRepair ? "EXECUTED" : "BYPASSED"),
        "KNOWN TRACKING PARAMETER STRIPPING: " + (pipelineSettings.stripKnownTrackingParameters ? "ON" : "OFF"),
        "TRACKING STRIP STAGE: " + (pipelineSettings.stripKnownTrackingParameters ? "EXECUTED" : "BYPASSED"),
        "TRACKING FILTERS: " + (
          trackingParameterModel && typeof trackingParameterModel.formatTrackingParameterFilterSummary === "function"
            ? trackingParameterModel.formatTrackingParameterFilterSummary(pipelineSettings.trackingParameterFilters, { maxVisibleLabels: 3 })
            : "unavailable"
        ),
        "TRACKING STRIP COUNT: " + strippedTrackingUrlCount,
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
        item.trackerCleanupEntries = [];

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
          enableUrlNormalizationRepair: !!(options && options.enableUrlNormalizationRepair),
          stripKnownTrackingParameters: !options || options.stripKnownTrackingParameters !== false
        });
      }

      const pipelineSettings = resolvePipelineSettings(options);
      const shouldBypassNormalizationRepair = !pipelineSettings.enableUrlNormalizationRepair;
      const shouldBypassTrackingParameterStrip = !pipelineSettings.stripKnownTrackingParameters;
      // Branch: follow this path only when the current condition passes.
      if (shouldBypassNormalizationRepair && shouldBypassTrackingParameterStrip) {
        if (debugApi) {
          debugApi.conditional("pipeline cleanup disabled; bypassing resolution", {
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

        const originalUrl = convertValueToString(item && item.original).trim();
        item.trackerCleanupEntries = [];

        if (shouldBypassNormalizationRepair) {
          item.normalized = originalUrl;
          item.resolved = originalUrl ? [originalUrl] : [];
          appendUniqueItemNote(item, "NORMALIZATION_REPAIR_BYPASSED");
        } else {
          const peeledUrlToken = peel(item.original, pipelineSettings);
          item.normalized = peeledUrlToken.value;
          item.notes.push.apply(item.notes, peeledUrlToken.notes);
          item.resolved = resolveURL(item.normalized);
        }

        item.resolved = stripTrackingParametersFromResolvedUrls(item, pipelineSettings);
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
          enableUrlNormalizationRepair: pipelineSettings.enableUrlNormalizationRepair,
          stripKnownTrackingParameters: pipelineSettings.stripKnownTrackingParameters
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
      extractKnownTrackingParameterNames: extractKnownTrackingParameterNames,
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
      stripKnownTrackingParameters: stripKnownTrackingParameters,
      validateTitle: validateTitle
    };
  }
);
