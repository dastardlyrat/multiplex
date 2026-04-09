"use strict";

function urlForensicsEmailRootSummaryResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsEmailRootSummaryResolvePatternMatcher(patternLike) {
  if (patternLike instanceof RegExp) {
    return patternLike;
  }

  if (patternLike && typeof patternLike.test === "function") {
    return Object.freeze({
      test: function testPattern(value) {
        try {
          return !!patternLike.test(value);
        } catch {
          return false;
        }
      }
    });
  }

  return /^$/;
}

function urlForensicsEmailRootSummaryBuildEnvironmentOptions(optionBag) {
  return {
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    cleanInputText: urlForensicsEmailRootSummaryResolveFunction(
      optionBag.cleanInputText,
      function cleanMissingInputText(value) {
        return String(value || "").trim();
      }
    ),
    analyzeInput: urlForensicsEmailRootSummaryResolveFunction(
      optionBag.analyzeInput,
      function analyzeMissingInput() {
        return {
          finalUrls: [],
          digestEntries: [],
          errors: []
        };
      }
    ),
    getPipelineSettings: urlForensicsEmailRootSummaryResolveFunction(
      optionBag.getPipelineSettings,
      function getMissingPipelineSettings() {
        return {};
      }
    ),
    getNow: urlForensicsEmailRootSummaryResolveFunction(
      optionBag.getNow,
      function getDefaultNow() {
        return Date.now();
      }
    ),
    debugApi: optionBag.debugApi && typeof optionBag.debugApi === "object" ? optionBag.debugApi : null
  };
}

function urlForensicsEmailRootSummaryBuildRuleOptions(optionBag) {
  return {
    inboxHostPattern: urlForensicsEmailRootSummaryResolvePatternMatcher(optionBag.inboxHostPattern),
    topicDigestLabelPattern: urlForensicsEmailRootSummaryResolvePatternMatcher(optionBag.topicDigestLabelPattern),
    topicDigestActionPattern: urlForensicsEmailRootSummaryResolvePatternMatcher(optionBag.topicDigestActionPattern)
  };
}

function urlForensicsEmailRootSummaryCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsEmailRootSummaryBuildEnvironmentOptions(optionBag),
    urlForensicsEmailRootSummaryBuildRuleOptions(optionBag)
  ));
}

function urlForensicsEmailRootSummaryGetHostname(windowObject) {
  return String(windowObject && windowObject.location && windowObject.location.hostname || "");
}

function urlForensicsEmailRootSummaryGetIframeContentElement(iframeElement) {
  if (!iframeElement || String(iframeElement.tagName || "").toUpperCase() !== "IFRAME") {
    return null;
  }

  try {
    const iframeDocument = iframeElement.contentDocument ||
      (iframeElement.contentWindow ? iframeElement.contentWindow.document : null);

    if (!iframeDocument) {
      return null;
    }

    return iframeDocument.body || iframeDocument.documentElement || null;
  } catch {
    return null;
  }
}

function urlForensicsEmailRootSummaryGetContentElement(element) {
  if (!element) {
    return null;
  }

  return urlForensicsEmailRootSummaryGetIframeContentElement(element) || element;
}

function urlForensicsEmailRootSummaryGetHtmlMarkup(element) {
  const contentElement = urlForensicsEmailRootSummaryGetContentElement(element);
  return String(contentElement && contentElement.innerHTML ? contentElement.innerHTML : "");
}

function urlForensicsEmailRootSummaryMeasureText(element, options) {
  const contentElement = urlForensicsEmailRootSummaryGetContentElement(element);
  const normalizedText = options.cleanInputText(
    contentElement && (contentElement.innerText || contentElement.textContent)
      ? (contentElement.innerText || contentElement.textContent)
      : ""
  );
  const lineCount = normalizedText ? normalizedText.split("\n").filter(Boolean).length : 0;
  const wordCount = normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0;

  return {
    text: normalizedText,
    lines: lineCount,
    words: wordCount
  };
}

function urlForensicsEmailRootSummaryIsTopicDigest(rawText, sourceHtml, pipelineResult, options) {
  const headerSnippet = String(rawText || "").split("\n").slice(0, 18).join("\n");
  const sourceSummary = options.cleanInputText(String(sourceHtml || "").replace(/<[^>]+>/g, " "));
  const pageTitle = String(options.documentObject && options.documentObject.title || "");
  const digestEntryCount =
    pipelineResult && pipelineResult.digestEntries && pipelineResult.digestEntries.length
      ? pipelineResult.digestEntries.length
      : 0;

  if (options.topicDigestLabelPattern.test(pageTitle) || options.topicDigestLabelPattern.test(headerSnippet)) {
    return true;
  }

  return options.topicDigestLabelPattern.test(sourceSummary) &&
    (options.topicDigestActionPattern.test(sourceSummary) || digestEntryCount >= 3);
}

function urlForensicsEmailRootSummarySummarize(root, detectionMode, options) {
  const debugApi = options.debugApi;

  if (debugApi && typeof debugApi.functionIn === "function") {
    debugApi.functionIn("content.summarizeEmailRoot", {
      detectionMode: detectionMode || "",
      rootTagName: root && root.tagName ? root.tagName : ""
    });
  }

  const contentElement = urlForensicsEmailRootSummaryGetContentElement(root);
  const sourceHtml = urlForensicsEmailRootSummaryGetHtmlMarkup(root);
  const rawText = options.cleanInputText(
    contentElement && (contentElement.innerText || contentElement.textContent)
      ? (contentElement.innerText || contentElement.textContent)
      : ""
  );
  const pipelineSettings = options.getPipelineSettings();
  const resolvedDetectionMode = detectionMode ||
    (options.inboxHostPattern.test(urlForensicsEmailRootSummaryGetHostname(options.windowObject))
      ? "inbox-read"
      : "full-page-read");
  const defaultSectionLabel = resolvedDetectionMode === "full-page-read" ? "Opened full-page email" : "Opened email body";
  const pipelineResult = options.analyzeInput({
    rawText: rawText,
    sourceHtml: sourceHtml,
    options: pipelineSettings
  });
  const isTopicDigest = urlForensicsEmailRootSummaryIsTopicDigest(rawText, sourceHtml, pipelineResult, options);

  if (debugApi && typeof debugApi.variable === "function") {
    debugApi.variable("content email snapshot summary assigned", {
      rawTextLength: rawText.length,
      sourceHtmlLength: sourceHtml.length,
      finalUrlCount: pipelineResult && pipelineResult.finalUrls ? pipelineResult.finalUrls.length : 0,
      errorCount: pipelineResult && pipelineResult.errors ? pipelineResult.errors.length : 0
    });
  }

  if (debugApi && typeof debugApi.functionOut === "function") {
    debugApi.functionOut("content.summarizeEmailRoot", {
      detectionMode: resolvedDetectionMode,
      isTopicDigest: isTopicDigest
    });
  }

  return {
    detectedAt: options.getNow(),
    detectionMode: resolvedDetectionMode,
    sectionLabel:
      root && typeof root.getAttribute === "function"
        ? (root.getAttribute("aria-label") || root.getAttribute("title") || defaultSectionLabel)
        : defaultSectionLabel,
    sourceHtml: sourceHtml,
    rawText: rawText,
    pipelineSettings: pipelineSettings,
    pipeline: pipelineResult,
    isTopicDigest: isTopicDigest
  };
}

function urlForensicsEmailRootSummaryCreate(options) {
  const resolvedOptions = urlForensicsEmailRootSummaryCreateDefaultOptions(options);

  return Object.freeze({
    getIframeEmailRootContentElement: function getIframeEmailRootContentElement(iframeElement) {
      return urlForensicsEmailRootSummaryGetIframeContentElement(iframeElement);
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return urlForensicsEmailRootSummaryGetContentElement(element);
    },
    getEmailRootHtmlMarkup: function getEmailRootHtmlMarkup(element) {
      return urlForensicsEmailRootSummaryGetHtmlMarkup(element);
    },
    measureElementText: function measureElementText(element) {
      return urlForensicsEmailRootSummaryMeasureText(element, resolvedOptions);
    },
    isTopicDigestSnapshot: function isTopicDigestSnapshot(rawText, sourceHtml, pipelineResult) {
      return urlForensicsEmailRootSummaryIsTopicDigest(rawText, sourceHtml, pipelineResult, resolvedOptions);
    },
    summarizeEmailRoot: function summarizeEmailRoot(root, detectionMode) {
      return urlForensicsEmailRootSummarySummarize(root, detectionMode, resolvedOptions);
    }
  });
}

(function attachUrlForensicsEmailRootSummary(globalScope) {
  const emailRootSummary = Object.freeze({
    create: urlForensicsEmailRootSummaryCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailRootSummary;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailRootSummary = emailRootSummary;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
