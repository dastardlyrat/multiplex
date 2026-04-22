"use strict";

function urlForensicsEmailCandidateDiscoveryResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

const urlForensicsEmailCandidateDiscoveryDebugThrottleState = new Map();

function urlForensicsEmailCandidateDiscoveryIsDebugMethodEnabled(options, methodName) {
  const debugApi = options && options.debugApi ? options.debugApi : null;

  if (!debugApi) {
    return false;
  }

  if (typeof debugApi.isMethodEnabled === "function") {
    return debugApi.isMethodEnabled(methodName) === true;
  }

  return typeof debugApi[methodName] === "function";
}

function urlForensicsEmailCandidateDiscoveryShouldSkipThrottledDebug(controlOptions) {
  const optionBag = controlOptions && typeof controlOptions === "object" ? controlOptions : {};
  const throttleKey = optionBag.throttleKey ? String(optionBag.throttleKey) : "";
  const throttleMs = Number.isFinite(optionBag.throttleMs) && optionBag.throttleMs > 0
    ? optionBag.throttleMs
    : 0;

  if (!throttleKey || !throttleMs) {
    return false;
  }

  const currentTime = Date.now();
  const lastEmittedAt = urlForensicsEmailCandidateDiscoveryDebugThrottleState.get(throttleKey) || 0;

  if (currentTime - lastEmittedAt < throttleMs) {
    return true;
  }

  if (urlForensicsEmailCandidateDiscoveryDebugThrottleState.size > 250) {
    urlForensicsEmailCandidateDiscoveryDebugThrottleState.clear();
  }

  urlForensicsEmailCandidateDiscoveryDebugThrottleState.set(throttleKey, currentTime);
  return false;
}

function urlForensicsEmailCandidateDiscoveryDebugCall(options, methodName, message, payload, controlOptions) {
  const debugApi = options && options.debugApi ? options.debugApi : null;

  if (!urlForensicsEmailCandidateDiscoveryIsDebugMethodEnabled(options, methodName)) {
    return;
  }

  if (urlForensicsEmailCandidateDiscoveryShouldSkipThrottledDebug(controlOptions)) {
    return;
  }

  if (debugApi && typeof debugApi[methodName] === "function") {
    debugApi[methodName](message, payload || {});
  }
}

function urlForensicsEmailCandidateDiscoveryResolvePatternMatcher(patternLike) {
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

function urlForensicsEmailCandidateDiscoveryBuildEnvironmentOptions(optionBag) {
  return {
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    debugApi: optionBag.debugApi && typeof optionBag.debugApi === "object" ? optionBag.debugApi : null,
    cleanInputText: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.cleanInputText,
      function cleanMissingInputText(value) {
        return String(value || "").trim();
      }
    ),
    getDetectionSearchRoots: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.getDetectionSearchRoots,
      function getMissingDetectionSearchRoots(root) {
        return root ? [root] : [];
      }
    ),
    getEmailRootContentElement: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.getEmailRootContentElement,
      function getMissingEmailRootContentElement(element) {
        return element || null;
      }
    ),
    measureElementText: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.measureElementText,
      function measureMissingElementText() {
        return {
          text: "",
          lines: 0,
          words: 0
        };
      }
    )
  };
}

function urlForensicsEmailCandidateDiscoveryBuildRuleOptions(optionBag) {
  return {
    inboxHostPattern: urlForensicsEmailCandidateDiscoveryResolvePatternMatcher(optionBag.inboxHostPattern),
    readViewHintPattern: urlForensicsEmailCandidateDiscoveryResolvePatternMatcher(optionBag.readViewHintPattern),
    composeContextHintPattern: urlForensicsEmailCandidateDiscoveryResolvePatternMatcher(optionBag.composeContextHintPattern),
    standaloneEmailHintPattern: urlForensicsEmailCandidateDiscoveryResolvePatternMatcher(optionBag.standaloneEmailHintPattern),
    outlookMailBodySelector: String(optionBag.outlookMailBodySelector || ""),
    inboxBodySelectors: Array.isArray(optionBag.inboxBodySelectors) ? optionBag.inboxBodySelectors.slice() : [],
    standaloneEmailBodySelectors: Array.isArray(optionBag.standaloneEmailBodySelectors)
      ? optionBag.standaloneEmailBodySelectors.slice()
      : [],
    genericInboxContainerSelectors: Array.isArray(optionBag.genericInboxContainerSelectors)
      ? optionBag.genericInboxContainerSelectors.slice()
      : [],
    explicitInboxBodySelectors: Array.isArray(optionBag.explicitInboxBodySelectors)
      ? optionBag.explicitInboxBodySelectors.slice()
      : [],
    getPrimaryInboxBodySelectors: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.getPrimaryInboxBodySelectors,
      function getMissingPrimaryInboxBodySelectors() {
        return [];
      }
    ),
    getInboxProviderKey: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.getInboxProviderKey,
      function getMissingInboxProviderKey() {
        return "";
      }
    ),
    listProviderDefinitions: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.listProviderDefinitions,
      function listMissingProviderDefinitions() {
        return [];
      }
    ),
    isOutlookHost: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.isOutlookHost,
      function isMissingOutlookHost() {
        return false;
      }
    ),
    isProtonHost: urlForensicsEmailCandidateDiscoveryResolveFunction(
      optionBag.isProtonHost,
      function isMissingProtonHost() {
        return false;
      }
    )
  };
}

function urlForensicsEmailCandidateDiscoveryBuildThresholdOptions(optionBag) {
  return {
    inboxCandidateMissingGraceMs: Number.isFinite(optionBag.inboxCandidateMissingGraceMs)
      ? optionBag.inboxCandidateMissingGraceMs
      : 0,
    outlookCandidateMissingGraceMs: Number.isFinite(optionBag.outlookCandidateMissingGraceMs)
      ? optionBag.outlookCandidateMissingGraceMs
      : 0,
    protonCandidateMissingGraceMs: Number.isFinite(optionBag.protonCandidateMissingGraceMs)
      ? optionBag.protonCandidateMissingGraceMs
      : 0
  };
}

function urlForensicsEmailCandidateDiscoveryCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsEmailCandidateDiscoveryBuildEnvironmentOptions(optionBag),
    urlForensicsEmailCandidateDiscoveryBuildRuleOptions(optionBag),
    urlForensicsEmailCandidateDiscoveryBuildThresholdOptions(optionBag)
  ));
}

function urlForensicsEmailCandidateDiscoveryGetHostname(windowObject) {
  return String(windowObject && windowObject.location && windowObject.location.hostname || "");
}

function urlForensicsEmailCandidateDiscoveryGetPathname(windowObject) {
  return String(windowObject && windowObject.location && windowObject.location.pathname || "");
}

function urlForensicsEmailCandidateDiscoveryGetSearch(windowObject) {
  return String(windowObject && windowObject.location && windowObject.location.search || "");
}

function urlForensicsEmailCandidateDiscoveryGetHash(windowObject) {
  return String(windowObject && windowObject.location && windowObject.location.hash || "");
}

function urlForensicsEmailCandidateDiscoveryIsGmailHostname(hostname) {
  return /(^|\.)mail\.google\.com$/i.test(String(hostname || ""));
}

function urlForensicsEmailCandidateDiscoveryQuerySelectorAll(selector, root, options) {
  const matchedElements = [];
  const seenElements = new Set();

  options.getDetectionSearchRoots(root).forEach(function inspectSearchRoot(searchRoot) {
    let rootMatches = [];

    try {
      rootMatches = Array.from(searchRoot.querySelectorAll(selector));
    } catch {
      rootMatches = [];
    }

    rootMatches.forEach(function registerMatchedElement(element) {
      if (!element || seenElements.has(element)) {
        return;
      }

      seenElements.add(element);
      matchedElements.push(element);
    });
  });

  return matchedElements;
}

function urlForensicsEmailCandidateDiscoveryGetMissingGraceWindow(options) {
  if (
    options.isOutlookHost() ||
    urlForensicsEmailCandidateDiscoveryQuerySelectorAll(options.outlookMailBodySelector, null, options).length > 0
  ) {
    return options.outlookCandidateMissingGraceMs;
  }

  if (options.isProtonHost()) {
    return options.protonCandidateMissingGraceMs;
  }

  if (options.inboxHostPattern.test(urlForensicsEmailCandidateDiscoveryGetHostname(options.windowObject))) {
    return options.inboxCandidateMissingGraceMs;
  }

  return 0;
}

function urlForensicsEmailCandidateDiscoveryBuildSelectorMatchCounts(selectors, options) {
  return (Array.isArray(selectors) ? selectors : []).map(function mapSelectorToMatchCount(selector) {
    return {
      selector: selector,
      count: urlForensicsEmailCandidateDiscoveryQuerySelectorAll(selector, null, options).length
    };
  });
}

function urlForensicsEmailCandidateDiscoveryBuildFailure(details) {
  const optionBag = details && typeof details === "object" ? details : {};

  return Object.freeze({
    kind: String(optionBag.kind || "").trim(),
    providerId: String(optionBag.providerId || "").trim(),
    providerTitle: String(optionBag.providerTitle || "").trim(),
    hostname: String(optionBag.hostname || "").trim(),
    pathname: String(optionBag.pathname || "").trim(),
    matchedProviderIds: Object.freeze((Array.isArray(optionBag.matchedProviderIds) ? optionBag.matchedProviderIds : []).slice()),
    matchedProviderTitles: Object.freeze((Array.isArray(optionBag.matchedProviderTitles) ? optionBag.matchedProviderTitles : []).slice()),
    checkedSelectors: Object.freeze((Array.isArray(optionBag.checkedSelectors) ? optionBag.checkedSelectors : []).slice()),
    matchedSelectors: Object.freeze((Array.isArray(optionBag.matchedSelectors) ? optionBag.matchedSelectors : []).slice()),
    selectorHitCount: Number(optionBag.selectorHitCount) || 0,
    candidateCount: Number(optionBag.candidateCount) || 0,
    message: String(optionBag.message || "").trim()
  });
}

function urlForensicsEmailCandidateDiscoveryGetProviderPrimarySelectors(providerId, options) {
  const normalizedProviderId = String(providerId || "").trim();
  const providerDefinitions = options.listProviderDefinitions();
  const matchedProviderDefinition = providerDefinitions.find(function findMatchedProviderDefinition(providerDefinition) {
    return !!(providerDefinition && providerDefinition.id === normalizedProviderId);
  });

  return matchedProviderDefinition && Array.isArray(matchedProviderDefinition.primaryInboxBodySelectors)
    ? matchedProviderDefinition.primaryInboxBodySelectors.slice()
    : [];
}

function urlForensicsEmailCandidateDiscoveryGetInboxDetectionFailure(candidates, options) {
  const hostname = urlForensicsEmailCandidateDiscoveryGetHostname(options.windowObject);
  const pathname = urlForensicsEmailCandidateDiscoveryGetPathname(options.windowObject);
  const isInboxHost = options.inboxHostPattern.test(hostname);
  const candidateCount = Array.isArray(candidates) ? candidates.length : 0;
  const providerDefinitions = options.listProviderDefinitions();
  const matchedProviders = providerDefinitions.filter(function keepMatchedProvider(providerDefinition) {
    return !!(providerDefinition && providerDefinition.hostPattern && providerDefinition.hostPattern.test(hostname));
  });

  if (!isInboxHost) {
    return null;
  }

  if (candidateCount > 0) {
    return null;
  }

  const providerKey = options.getInboxProviderKey(options.windowObject && options.windowObject.location);

  if (!providerKey) {
    return urlForensicsEmailCandidateDiscoveryBuildFailure({
      kind: "provider-path-mismatch",
      hostname: hostname,
      pathname: pathname,
      matchedProviderIds: matchedProviders.map(function mapProviderId(providerDefinition) {
        return providerDefinition.id;
      }),
      matchedProviderTitles: matchedProviders.map(function mapProviderTitle(providerDefinition) {
        return providerDefinition.title;
      }),
      message: "Matched a supported inbox host, but the current URL path does not map to a known provider read view."
    });
  }

  if (candidateCount > 0) {
    return null;
  }

  const providerDefinition = matchedProviders.find(function findMatchedProvider(providerCandidate) {
    return providerCandidate.id === providerKey;
  }) || null;

  if (
    urlForensicsEmailCandidateDiscoveryIsGmailHostname(hostname) &&
    !urlForensicsEmailCandidateDiscoveryIsGmailReadViewLocation(options.windowObject)
  ) {
    return urlForensicsEmailCandidateDiscoveryBuildFailure({
      kind: "provider-path-mismatch",
      providerId: providerKey || "gmail",
      providerTitle: providerDefinition && providerDefinition.title ? providerDefinition.title : "Gmail",
      hostname: hostname,
      pathname: pathname,
      matchedProviderIds: matchedProviders.map(function mapProviderId(providerCandidate) {
        return providerCandidate.id;
      }),
      matchedProviderTitles: matchedProviders.map(function mapProviderTitle(providerCandidate) {
        return providerCandidate.title;
      }),
      message: "Matched Gmail host, but the current location does not look like an opened message view."
    });
  }

  const primaryInboxBodySelectors = options.getPrimaryInboxBodySelectors(options.windowObject && options.windowObject.location);
  const selectorMatchCounts = urlForensicsEmailCandidateDiscoveryBuildSelectorMatchCounts(primaryInboxBodySelectors, options);
  const matchedSelectors = selectorMatchCounts
    .filter(function keepMatchedSelector(matchRecord) {
      return matchRecord.count > 0;
    })
    .map(function mapMatchedSelector(matchRecord) {
      return matchRecord.selector;
    });
  const selectorHitCount = selectorMatchCounts.reduce(function sumSelectorHits(totalCount, matchRecord) {
    return totalCount + matchRecord.count;
  }, 0);

  if (!matchedSelectors.length) {
    return urlForensicsEmailCandidateDiscoveryBuildFailure({
      kind: "selector-empty-match",
      providerId: providerKey,
      providerTitle: providerDefinition && providerDefinition.title ? providerDefinition.title : providerKey,
      hostname: hostname,
      pathname: pathname,
      checkedSelectors: primaryInboxBodySelectors,
      matchedSelectors: [],
      selectorHitCount: selectorHitCount,
      candidateCount: candidateCount,
      message: "Matched the inbox provider, but no configured provider body selector found an email body element."
    });
  }

  return urlForensicsEmailCandidateDiscoveryBuildFailure({
    kind: "candidate-empty-match",
    providerId: providerKey,
    providerTitle: providerDefinition && providerDefinition.title ? providerDefinition.title : providerKey,
    hostname: hostname,
    pathname: pathname,
    checkedSelectors: primaryInboxBodySelectors,
    matchedSelectors: matchedSelectors,
    selectorHitCount: selectorHitCount,
    candidateCount: candidateCount,
    message: "Provider selectors matched the DOM, but none of those elements passed inbox email-body scoring."
  });
}

function urlForensicsEmailCandidateDiscoveryGetOutlookMailBodyCandidates(options) {
  return urlForensicsEmailCandidateDiscoveryQuerySelectorAll(options.outlookMailBodySelector, null, options)
    .filter(function keepOutlookMailBodyCandidate(element) {
      return !!(element && element.isConnected && !element.closest("#merged-link-lab-page-pane"));
    });
}

function urlForensicsEmailCandidateDiscoveryGetElementHintText(element) {
  if (!element) {
    return "";
  }

  return [
    "aria-label",
    "aria-roledescription",
    "data-testid",
    "data-test-id",
    "name",
    "placeholder",
    "title",
    "role",
    "class",
    "id"
  ].map(function readHintAttribute(attributeName) {
    return element.getAttribute(attributeName) || "";
  }).join(" ").toLowerCase();
}

function urlForensicsEmailCandidateDiscoveryGetContextHintText(element, maximumDepth) {
  const collectedHintParts = [];
  let currentElement = element;
  let currentDepth = 0;

  while (currentElement && currentDepth < (maximumDepth || 5)) {
    collectedHintParts.push(urlForensicsEmailCandidateDiscoveryGetElementHintText(currentElement));
    currentElement = currentElement.parentElement;
    currentDepth += 1;
  }

  return collectedHintParts.join(" ");
}

function urlForensicsEmailCandidateDiscoveryIsElementVisibleAndLargeEnough(element) {
  if (!element || !element.isConnected) {
    return false;
  }

  const elementBounds = element.getBoundingClientRect();
  return elementBounds.width > 120 && elementBounds.height > 60;
}

function urlForensicsEmailCandidateDiscoveryHasComposeContext(element, options) {
  if (!element) {
    return false;
  }

  const contentElement = options.getEmailRootContentElement(element);
  const hasStrongInboxBodyMarker =
    urlForensicsEmailCandidateDiscoveryHasExplicitInboxBodyMarker(element, options, false) ||
    (
      urlForensicsEmailCandidateDiscoveryIsGmailHostname(
        urlForensicsEmailCandidateDiscoveryGetHostname(options.windowObject)
      ) &&
      urlForensicsEmailCandidateDiscoveryHasGmailReadViewMarker(element)
    );

  if (element.isContentEditable) {
    return true;
  }

  let currentElement = element;
  let currentDepth = 0;

  while (currentElement && currentDepth < 4) {
    if (currentElement.isContentEditable) {
      return true;
    }

    currentElement = currentElement.parentElement;
    currentDepth += 1;
  }

  const embeddedComposeElement =
    typeof element.querySelector === "function"
      ? element.querySelector("[contenteditable='true'], textarea, [role='textbox']")
      : null;
  const embeddedContentComposeElement =
    contentElement &&
    contentElement !== element &&
    typeof contentElement.querySelector === "function"
      ? contentElement.querySelector("[contenteditable='true'], textarea, [role='textbox']")
      : null;

  if (hasStrongInboxBodyMarker) {
    return false;
  }

  if (embeddedComposeElement || embeddedContentComposeElement) {
    return true;
  }

  return options.composeContextHintPattern.test(urlForensicsEmailCandidateDiscoveryGetContextHintText(element, 5));
}

function urlForensicsEmailCandidateDiscoveryHasMessageStructure(element, options) {
  const contentElement = options.getEmailRootContentElement(element);

  return !!(
    contentElement &&
    typeof contentElement.querySelector === "function" &&
    contentElement.querySelector("a, p, br, blockquote, table, li, img")
  );
}

function urlForensicsEmailCandidateDiscoveryElementMatchesAnySelector(element, selectors) {
  if (!element || !selectors || !selectors.length) {
    return false;
  }

  return selectors.some(function matchesSelector(selector) {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}

function urlForensicsEmailCandidateDiscoveryHasGmailReadViewMarker(element) {
  let currentElement = element;
  let currentDepth = 0;

  while (currentElement && currentDepth < 8) {
    const className = String(
      typeof currentElement.getAttribute === "function"
        ? (currentElement.getAttribute("class") || "")
        : ""
    ).toLowerCase();

    if (typeof currentElement.getAttribute === "function" && currentElement.getAttribute("data-message-id")) {
      return true;
    }

    if (/\bmaincontent\b/.test(className)) {
      return true;
    }

    if (/\badn\b/.test(className) && /\bads\b/.test(className)) {
      return true;
    }

    if (/\bii\b/.test(className) && /\bgt\b/.test(className)) {
      return true;
    }

    currentElement = currentElement.parentElement;
    currentDepth += 1;
  }

  return false;
}

function urlForensicsEmailCandidateDiscoveryHasBlockedAncestorRole(element) {
  let currentElement = element ? element.parentElement : null;
  let currentDepth = 0;

  while (currentElement && currentDepth < 8) {
    const roleValue = String(
      typeof currentElement.getAttribute === "function"
        ? (currentElement.getAttribute("role") || "")
        : ""
    ).toLowerCase();

    if (/\b(?:row|gridcell|option|menuitem|tab|listitem|treeitem)\b/.test(roleValue)) {
      return true;
    }

    currentElement = currentElement.parentElement;
    currentDepth += 1;
  }

  return false;
}

function urlForensicsEmailCandidateDiscoveryIsElementHiddenByAttributes(element) {
  let currentElement = element;
  let currentDepth = 0;

  while (currentElement && currentDepth < 8) {
    const ariaHiddenValue = String(
      typeof currentElement.getAttribute === "function"
        ? (currentElement.getAttribute("aria-hidden") || "")
        : ""
    ).toLowerCase();
    const inlineStyleValue = String(
      typeof currentElement.getAttribute === "function"
        ? (currentElement.getAttribute("style") || "")
        : ""
    ).toLowerCase();

    if (
      currentElement.hidden === true ||
      ariaHiddenValue === "true" ||
      /display\s*:\s*none/.test(inlineStyleValue) ||
      /visibility\s*:\s*hidden/.test(inlineStyleValue)
    ) {
      return true;
    }

    currentElement = currentElement.parentElement;
    currentDepth += 1;
  }

  return false;
}

function urlForensicsEmailCandidateDiscoveryHasGmailListViewMarker(element) {
  let currentElement = element;
  let currentDepth = 0;

  while (currentElement && currentDepth < 8) {
    const className = String(
      typeof currentElement.getAttribute === "function"
        ? (currentElement.getAttribute("class") || "")
        : ""
    );

    if (/\bzA\b/.test(className) || /\byO\b/.test(className) || /\bxY\b/.test(className) || /\bbog\b/.test(className)) {
      return true;
    }

    currentElement = currentElement.parentElement;
    currentDepth += 1;
  }

  return false;
}

function urlForensicsEmailCandidateDiscoveryIsGmailReadViewLocation(windowObject) {
  const searchValue = urlForensicsEmailCandidateDiscoveryGetSearch(windowObject).toLowerCase();
  const normalizedHash = urlForensicsEmailCandidateDiscoveryGetHash(windowObject).replace(/^#/, "");
  const hashSegments = normalizedHash.split("/").filter(Boolean);
  const firstHashSegment = hashSegments.length ? hashSegments[0].toLowerCase() : "";

  if (/[?&](?:view=(?:lg|pt)|permmsgid=|th=|msg=)/i.test(searchValue)) {
    return true;
  }

  if (!normalizedHash) {
    return false;
  }

  if (/(^|\/)(?:fmfcgz[^/?#]*|thread-[^/?#]+|msg-[^/?#]+)/i.test(normalizedHash)) {
    return true;
  }

  if (/^(label|category|search)$/.test(firstHashSegment)) {
    return hashSegments.length >= 3;
  }

  if (/^(inbox|all|sent|drafts|starred|snoozed|important|scheduled|spam|trash|chats)$/.test(firstHashSegment)) {
    return hashSegments.length >= 2;
  }

  return hashSegments.length >= 2;
}

function urlForensicsEmailCandidateDiscoveryPassesGmailReadViewChecks(element, options) {
  if (urlForensicsEmailCandidateDiscoveryHasGmailListViewMarker(element)) {
    return false;
  }

  if (urlForensicsEmailCandidateDiscoveryIsElementHiddenByAttributes(element)) {
    return false;
  }

  return urlForensicsEmailCandidateDiscoveryHasGmailReadViewMarker(element);
}

function urlForensicsEmailCandidateDiscoveryPassesInboxBodyThresholds(element, textMetrics, isGenericContainer, options) {
  const hasExplicitSelfMarker = urlForensicsEmailCandidateDiscoveryHasExplicitSelfInboxBodyMarker(element, options);
  const hasKnownBodyMarker = urlForensicsEmailCandidateDiscoveryHasExplicitInboxBodyMarker(
    element,
    options,
    isGenericContainer
  );
  const minimumTextLength = hasExplicitSelfMarker ? 24 : 80;
  const minimumWordCount = hasExplicitSelfMarker ? 4 : 15;
  const minimumLineCount = hasExplicitSelfMarker ? 1 : 2;
  const minimumWidth = hasExplicitSelfMarker ? 120 : 220;
  const minimumHeight = hasExplicitSelfMarker ? 60 : 80;
  const elementBounds = element.getBoundingClientRect();

  if (
    textMetrics.text.length < minimumTextLength ||
    textMetrics.words < minimumWordCount ||
    textMetrics.lines < minimumLineCount
  ) {
    return {
      ok: false,
      hasKnownBodyMarker: hasKnownBodyMarker
    };
  }

  if (elementBounds.width < minimumWidth || elementBounds.height < minimumHeight) {
    return {
      ok: false,
      hasKnownBodyMarker: hasKnownBodyMarker
    };
  }

  if (isGenericContainer && !hasKnownBodyMarker) {
    return {
      ok: false,
      hasKnownBodyMarker: hasKnownBodyMarker
    };
  }

  return {
    ok: true,
    hasKnownBodyMarker: hasKnownBodyMarker
  };
}

function urlForensicsEmailCandidateDiscoveryBuildCandidateDebugSummary(
  element,
  textMetrics,
  isGenericContainer,
  inboxBodyThresholdResult,
  options
) {
  const bounds = element && typeof element.getBoundingClientRect === "function"
    ? element.getBoundingClientRect()
    : { width: 0, height: 0, top: 0 };
  const safeTextMetrics = textMetrics || { text: "", lines: 0, words: 0 };
  const thresholdResult = inboxBodyThresholdResult || { ok: false, hasKnownBodyMarker: false };

  return {
    id: element && element.id ? String(element.id) : "",
    className:
      element && typeof element.getAttribute === "function"
        ? String(element.getAttribute("class") || "")
        : "",
    role:
      element && typeof element.getAttribute === "function"
        ? String(element.getAttribute("role") || "")
        : "",
    width: Number(bounds.width) || 0,
    height: Number(bounds.height) || 0,
    top: Number(bounds.top) || 0,
    textLength: String(safeTextMetrics.text || "").length,
    lines: Number(safeTextMetrics.lines) || 0,
    words: Number(safeTextMetrics.words) || 0,
    isGenericContainer: isGenericContainer === true,
    thresholdOk: thresholdResult.ok === true,
    hasKnownBodyMarker: thresholdResult.hasKnownBodyMarker === true,
    hasGmailReadViewMarker: urlForensicsEmailCandidateDiscoveryHasGmailReadViewMarker(element),
    hasGmailListViewMarker: urlForensicsEmailCandidateDiscoveryHasGmailListViewMarker(element),
    hiddenByAttributes: urlForensicsEmailCandidateDiscoveryIsElementHiddenByAttributes(element),
    blockedAncestorRole: urlForensicsEmailCandidateDiscoveryHasBlockedAncestorRole(element),
    locationHref:
      options.windowObject && options.windowObject.location && options.windowObject.location.href
        ? String(options.windowObject.location.href)
        : ""
  };
}

function urlForensicsEmailCandidateDiscoveryEvaluateInboxEmailBody(element, options) {
  const hostname = urlForensicsEmailCandidateDiscoveryGetHostname(options.windowObject);

  if (!element) {
    return { ok: false, reason: "missing-element" };
  }

  if (!options.inboxHostPattern.test(hostname)) {
    return { ok: false, reason: "not-inbox-host" };
  }

  if (!element.isConnected) {
    return { ok: false, reason: "disconnected" };
  }

  if (urlForensicsEmailCandidateDiscoveryIsElementHiddenByAttributes(element)) {
    return {
      ok: false,
      reason: "hidden-by-attributes",
      details: urlForensicsEmailCandidateDiscoveryBuildCandidateDebugSummary(element, null, false, null, options)
    };
  }

  if (urlForensicsEmailCandidateDiscoveryHasComposeContext(element, options)) {
    return {
      ok: false,
      reason: "compose-context",
      details: urlForensicsEmailCandidateDiscoveryBuildCandidateDebugSummary(element, null, false, null, options)
    };
  }

  const roleValue = String(element.getAttribute("role") || "").toLowerCase();
  if (/\b(?:row|gridcell|option|menuitem|tab)\b/.test(roleValue)) {
    return {
      ok: false,
      reason: "blocked-self-role",
      details: urlForensicsEmailCandidateDiscoveryBuildCandidateDebugSummary(element, null, false, null, options)
    };
  }

  if (urlForensicsEmailCandidateDiscoveryHasBlockedAncestorRole(element)) {
    return {
      ok: false,
      reason: "blocked-ancestor-role",
      details: urlForensicsEmailCandidateDiscoveryBuildCandidateDebugSummary(element, null, false, null, options)
    };
  }

  const contextHints = urlForensicsEmailCandidateDiscoveryGetContextHintText(element, 5);
  const textMetrics = options.measureElementText(element);
  const isGenericContainer = urlForensicsEmailCandidateDiscoveryIsGenericInboxContainer(element, options);
  const inboxBodyThresholdResult = urlForensicsEmailCandidateDiscoveryPassesInboxBodyThresholds(
    element,
    textMetrics,
    isGenericContainer,
    options
  );
  const details = urlForensicsEmailCandidateDiscoveryBuildCandidateDebugSummary(
    element,
    textMetrics,
    isGenericContainer,
    inboxBodyThresholdResult,
    options
  );

  if (!inboxBodyThresholdResult.ok) {
    return {
      ok: false,
      reason: "threshold-failed",
      details: details
    };
  }

  if (
    urlForensicsEmailCandidateDiscoveryIsGmailHostname(hostname) &&
    !urlForensicsEmailCandidateDiscoveryPassesGmailReadViewChecks(element, options)
  ) {
    return {
      ok: false,
      reason: "gmail-read-view-check-failed",
      details: details
    };
  }

  if (inboxBodyThresholdResult.hasKnownBodyMarker) {
    return {
      ok: true,
      reason: "known-body-marker",
      details: details
    };
  }

  if (
    options.readViewHintPattern.test(contextHints) &&
    (
      urlForensicsEmailCandidateDiscoveryHasMessageStructure(element, options) ||
      /https?:\/\//i.test(textMetrics.text)
    )
  ) {
    return {
      ok: true,
      reason: "read-view-hint",
      details: details
    };
  }

  return {
    ok: false,
    reason: "missing-marker-or-read-hint",
    details: details
  };
}

function urlForensicsEmailCandidateDiscoveryHasExplicitInboxBodyMarker(element, options, matchSelfOnly) {
  if (!element) {
    return false;
  }

  return options.explicitInboxBodySelectors.some(function hasMatchingMarker(selector) {
    try {
      if (element.matches(selector)) {
        return true;
      }

      return matchSelfOnly === true ? false : !!element.querySelector(selector);
    } catch {
      return false;
    }
  });
}

function urlForensicsEmailCandidateDiscoveryHasExplicitSelfInboxBodyMarker(element, options) {
  return urlForensicsEmailCandidateDiscoveryElementMatchesAnySelector(element, options.explicitInboxBodySelectors);
}

function urlForensicsEmailCandidateDiscoveryIsGenericInboxContainer(element, options) {
  return urlForensicsEmailCandidateDiscoveryElementMatchesAnySelector(element, options.genericInboxContainerSelectors);
}

function urlForensicsEmailCandidateDiscoveryCountEmailHeaderLines(textValue) {
  const headerScanText = String(textValue || "").split("\n").slice(0, 48).join("\n");
  const matches = headerScanText.match(/(?:^|\n)\s*(from|to|cc|bcc|subject|date|sent|received|reply-to|attachments?)\s*:/gim);
  return matches ? matches.length : 0;
}

function urlForensicsEmailCandidateDiscoveryMeasureStandaloneSignals(element, textMetrics, options) {
  const safeTextMetrics = textMetrics || options.measureElementText(element);
  const documentObject = options.documentObject || {};
  const windowObject = options.windowObject || {};
  const contextualHintText = [
    urlForensicsEmailCandidateDiscoveryGetContextHintText(element, 7),
    documentObject.title || "",
    windowObject.location && windowObject.location.pathname || "",
    windowObject.location && windowObject.location.search || "",
    documentObject.contentType || ""
  ].join(" ").toLowerCase();
  const headerLineCount = urlForensicsEmailCandidateDiscoveryCountEmailHeaderLines(safeTextMetrics.text);
  const hasStandaloneHint = options.standaloneEmailHintPattern.test(contextualHintText);
  const hasReplyMarker =
    /(?:^|\n)\s*(on .+ wrote:|-----original message-----|forwarded message|begin forwarded message)/im.test(safeTextMetrics.text);
  const hasMarketingFooter =
    /\b(unsubscribe|manage preferences|email preferences|view in browser)\b/i.test(safeTextMetrics.text);
  const hasMimeHint =
    /message\/rfc822/i.test(documentObject.contentType || "") ||
    /\.eml(?:$|[?#])/i.test(windowObject.location && windowObject.location.pathname || "");
  const structuredElementCount = element.querySelectorAll(
    "blockquote, table, img, a[href], time, address, [itemprop='sender'], [itemprop='recipient'], [class*='subject'], [class*='sender'], [class*='recipient'], [class*='message'], [id*='subject'], [id*='message']"
  ).length;
  const score =
    (headerLineCount * 3) +
    (hasStandaloneHint ? 2 : 0) +
    (hasReplyMarker ? 2 : 0) +
    (hasMarketingFooter ? 2 : 0) +
    (hasMimeHint ? 4 : 0) +
    Math.min(structuredElementCount, 4);

  return {
    headerLineCount: headerLineCount,
    hasStandaloneHint: hasStandaloneHint,
    hasReplyMarker: hasReplyMarker,
    hasMarketingFooter: hasMarketingFooter,
    hasMimeHint: hasMimeHint,
    structuredElementCount: structuredElementCount,
    score: score
  };
}

function urlForensicsEmailCandidateDiscoveryIsLikelyInboxEmailBody(element, options) {
  return urlForensicsEmailCandidateDiscoveryEvaluateInboxEmailBody(element, options).ok === true;
}

function urlForensicsEmailCandidateDiscoveryCanEvaluateStandaloneElement(element, options) {
  if (!element || !element.isConnected) {
    return false;
  }

  if (element.id === "merged-link-lab-page-pane" || element.closest("#merged-link-lab-page-pane")) {
    return false;
  }

  if (!urlForensicsEmailCandidateDiscoveryIsElementVisibleAndLargeEnough(element)) {
    return false;
  }

  return !urlForensicsEmailCandidateDiscoveryHasComposeContext(element, options);
}

function urlForensicsEmailCandidateDiscoveryHasBlockedStandaloneRole(element) {
  const roleValue = String(element.getAttribute("role") || "").toLowerCase();
  return /\b(?:row|gridcell|option|menuitem|tab|navigation|banner|complementary)\b/.test(roleValue);
}

function urlForensicsEmailCandidateDiscoveryCreateStandaloneContext(element, signalData, options) {
  const textMetrics = options.measureElementText(element);
  const elementBounds = element.getBoundingClientRect();
  const standaloneSignals =
    signalData || urlForensicsEmailCandidateDiscoveryMeasureStandaloneSignals(element, textMetrics, options);
  const isGenericContainer = urlForensicsEmailCandidateDiscoveryIsGenericInboxContainer(element, options);

  return {
    textMetrics: textMetrics,
    elementBounds: elementBounds,
    standaloneSignals: standaloneSignals,
    isInboxHost: options.inboxHostPattern.test(urlForensicsEmailCandidateDiscoveryGetHostname(options.windowObject)),
    isGenericContainer: isGenericContainer,
    hasKnownBodyMarker: urlForensicsEmailCandidateDiscoveryHasExplicitInboxBodyMarker(
      element,
      options,
      isGenericContainer
    )
  };
}

function urlForensicsEmailCandidateDiscoveryIsLikelyStandaloneEmailBody(element, signalData, options) {
  if (!urlForensicsEmailCandidateDiscoveryCanEvaluateStandaloneElement(element, options)) {
    return false;
  }

  if (urlForensicsEmailCandidateDiscoveryHasBlockedStandaloneRole(element)) {
    return false;
  }

  const detectionContext = urlForensicsEmailCandidateDiscoveryCreateStandaloneContext(element, signalData, options);

  if (detectionContext.textMetrics.text.length < 120 || detectionContext.textMetrics.words < 25 || detectionContext.textMetrics.lines < 3) {
    return false;
  }

  if (detectionContext.elementBounds.width < 240 || detectionContext.elementBounds.height < 100) {
    return false;
  }

  if (detectionContext.isInboxHost && detectionContext.isGenericContainer && !detectionContext.hasKnownBodyMarker) {
    return false;
  }

  if (
    !(
      detectionContext.standaloneSignals.headerLineCount >= 1 ||
      detectionContext.standaloneSignals.hasReplyMarker ||
      detectionContext.standaloneSignals.hasMimeHint ||
      (
        detectionContext.standaloneSignals.hasStandaloneHint &&
        detectionContext.standaloneSignals.hasMarketingFooter
      )
    )
  ) {
    return false;
  }

  return (
    detectionContext.standaloneSignals.score >= 6 &&
    (
      urlForensicsEmailCandidateDiscoveryHasMessageStructure(element, options) ||
      /https?:\/\//i.test(detectionContext.textMetrics.text) ||
      detectionContext.standaloneSignals.headerLineCount >= 2 ||
      detectionContext.standaloneSignals.hasReplyMarker
    )
  );
}

function urlForensicsEmailCandidateDiscoveryRegisterCandidate(candidateMap, element, bonus, detectionMode, signalScore) {
  if (!element || !element.isConnected) {
    return;
  }

  if (element.id === "merged-link-lab-page-pane" || element.closest("#merged-link-lab-page-pane")) {
    return;
  }

  const existingCandidate = candidateMap.get(element);
  if (existingCandidate) {
    existingCandidate.bonus = Math.max(existingCandidate.bonus, bonus || 0);
    existingCandidate.signalScore = Math.max(existingCandidate.signalScore, signalScore || 0);
    if (detectionMode === "inbox-read") {
      existingCandidate.detectionMode = detectionMode;
    }
    return;
  }

  candidateMap.set(element, {
    root: element,
    bonus: bonus || 0,
    order: candidateMap.size,
    detectionMode: detectionMode || "inbox-read",
    signalScore: signalScore || 0
  });
}

function urlForensicsEmailCandidateDiscoveryScoreCandidate(candidate, options) {
  const textMetrics = options.measureElementText(candidate.root);
  const elementBounds = candidate.root.getBoundingClientRect();
  const areaScore = Math.min((elementBounds.width * elementBounds.height) / 1500, 280);
  const lineScore = Math.min(textMetrics.lines * 4, 120);
  const textScore = Math.min(textMetrics.text.length / 12, 400);
  const viewportCenterY = ((options.windowObject && options.windowObject.innerHeight) || 0) * 0.42;
  const distanceScore = Math.max(0, 180 - Math.abs(elementBounds.top - viewportCenterY));
  const signalScore = Math.min((candidate.signalScore || 0) * 20, 180);
  const detectionModeScore = candidate.detectionMode === "full-page-read" ? 36 : 0;

  return (candidate.bonus * 80) + areaScore + lineScore + textScore + distanceScore + signalScore + detectionModeScore + candidate.order;
}

function urlForensicsEmailCandidateDiscoveryCollectProtonNestedCandidates(containerElement, selectorBonus, options) {
  if (!options.isProtonHost() || !containerElement || typeof containerElement.querySelectorAll !== "function") {
    return [];
  }

  const matchedCandidates = new Map();

  options.explicitInboxBodySelectors.forEach(function inspectExplicitSelector(selector, selectorIndex) {
    const nestedSelectorBonus = Math.max(
      1,
      (selectorBonus || 1) + (options.explicitInboxBodySelectors.length - selectorIndex)
    );

    containerElement.querySelectorAll(selector).forEach(function inspectNestedElement(element) {
      if (
        !element ||
        element === containerElement ||
        !containerElement.contains(element) ||
        element.closest("#merged-link-lab-page-pane")
      ) {
        return;
      }

      if (!urlForensicsEmailCandidateDiscoveryIsLikelyInboxEmailBody(element, options)) {
        return;
      }

      urlForensicsEmailCandidateDiscoveryRegisterCandidate(matchedCandidates, element, nestedSelectorBonus, "inbox-read", 2);
    });
  });

  return Array.from(matchedCandidates.values()).sort(function sortCandidates(leftCandidate, rightCandidate) {
    return urlForensicsEmailCandidateDiscoveryScoreCandidate(rightCandidate, options) -
      urlForensicsEmailCandidateDiscoveryScoreCandidate(leftCandidate, options);
  });
}

function urlForensicsEmailCandidateDiscoveryCollectGmailCandidates(matchedCandidates, options) {
  const seenSelectors = new Set();
  const gmailSelectors = []
    .concat(urlForensicsEmailCandidateDiscoveryGetProviderPrimarySelectors("gmail", options))
    .concat(options.getPrimaryInboxBodySelectors())
    .concat((Array.isArray(options.inboxBodySelectors) ? options.inboxBodySelectors : []).filter(function keepNonGenericSelector(selector) {
      return options.genericInboxContainerSelectors.indexOf(selector) === -1;
    }));
  const locationHref =
    options.windowObject && options.windowObject.location && options.windowObject.location.href
      ? String(options.windowObject.location.href)
      : "";

  if (urlForensicsEmailCandidateDiscoveryIsDebugMethodEnabled(options, "variable")) {
    const selectorMatchSummary = gmailSelectors.map(function mapGmailSelectorMatchSummary(selector) {
      return {
        selector: String(selector || ""),
        count: urlForensicsEmailCandidateDiscoveryQuerySelectorAll(selector, null, options).length
      };
    });

    urlForensicsEmailCandidateDiscoveryDebugCall(
      options,
      "variable",
      "content gmail candidate selectors evaluated",
      {
        href: locationHref,
        selectors: selectorMatchSummary
      },
      {
        throttleKey: "gmail-selectors:" + locationHref,
        throttleMs: 2500
      }
    );
  }

  gmailSelectors.forEach(function inspectSelector(selector, selectorIndex) {
    const normalizedSelector = String(selector || "").trim();

    if (!normalizedSelector || seenSelectors.has(normalizedSelector)) {
      return;
    }

    seenSelectors.add(normalizedSelector);
    const selectorBonus = options.inboxBodySelectors.length + gmailSelectors.length + 40 - selectorIndex;

    urlForensicsEmailCandidateDiscoveryQuerySelectorAll(normalizedSelector, null, options)
      .forEach(function inspectGmailCandidateElement(element) {
        const evaluation = urlForensicsEmailCandidateDiscoveryEvaluateInboxEmailBody(element, options);

        urlForensicsEmailCandidateDiscoveryDebugCall(
          options,
          evaluation.ok ? "loop" : "conditional",
          evaluation.ok ? "content gmail candidate accepted" : "content gmail candidate rejected",
          Object.assign({
            selector: normalizedSelector,
            reason: evaluation.reason || ""
          }, evaluation.details || {}),
          {
            throttleKey:
              "gmail-candidate:" +
              (evaluation.ok ? "accepted:" : "rejected:") +
              locationHref + ":" +
              normalizedSelector + ":" +
              String(evaluation.reason || ""),
            throttleMs: 2500
          }
        );

        if (!evaluation.ok) {
          return;
        }

        urlForensicsEmailCandidateDiscoveryRegisterCandidate(
          matchedCandidates,
          element,
          selectorBonus,
          "inbox-read",
          4
        );
      });
  });
}

function urlForensicsEmailCandidateDiscoveryGetInboxRootCandidates(options) {
  const matchedCandidates = new Map();
  const hostname = urlForensicsEmailCandidateDiscoveryGetHostname(options.windowObject);
  const isInboxHost = options.inboxHostPattern.test(hostname);
  const primaryInboxBodySelectors = options.getPrimaryInboxBodySelectors();
  const outlookMailBodyCandidates = urlForensicsEmailCandidateDiscoveryGetOutlookMailBodyCandidates(options);

  outlookMailBodyCandidates.forEach(function registerOutlookBodyCandidate(element, candidateIndex) {
    urlForensicsEmailCandidateDiscoveryRegisterCandidate(
      matchedCandidates,
      element,
      options.inboxBodySelectors.length + 80 - Math.min(candidateIndex, 50),
      "outlook-body-read",
      10
    );
  });

  if (urlForensicsEmailCandidateDiscoveryIsGmailHostname(hostname)) {
    urlForensicsEmailCandidateDiscoveryCollectGmailCandidates(matchedCandidates, options);
    return Array.from(matchedCandidates.values()).sort(function sortCandidates(leftCandidate, rightCandidate) {
      return urlForensicsEmailCandidateDiscoveryScoreCandidate(rightCandidate, options) -
        urlForensicsEmailCandidateDiscoveryScoreCandidate(leftCandidate, options);
    });
  }

  primaryInboxBodySelectors.forEach(function inspectPrimarySelector(selector, selectorIndex) {
    const selectorBonus = options.inboxBodySelectors.length + primaryInboxBodySelectors.length + 40 - selectorIndex;

    urlForensicsEmailCandidateDiscoveryQuerySelectorAll(selector, null, options).forEach(function inspectPrimaryElement(element) {
      if (!urlForensicsEmailCandidateDiscoveryIsLikelyInboxEmailBody(element, options)) {
        return;
      }

      urlForensicsEmailCandidateDiscoveryRegisterCandidate(matchedCandidates, element, selectorBonus, "inbox-read", 4);
    });
  });

  options.inboxBodySelectors.forEach(function inspectSelector(selector, selectorIndex) {
    const selectorBonus = options.inboxBodySelectors.length - selectorIndex;
    const isGenericSelector = options.genericInboxContainerSelectors.indexOf(selector) !== -1;

    urlForensicsEmailCandidateDiscoveryQuerySelectorAll(selector, null, options).forEach(function inspectCandidateElement(element) {
      if (options.isProtonHost() && isGenericSelector) {
        urlForensicsEmailCandidateDiscoveryCollectProtonNestedCandidates(element, selectorBonus, options)
          .forEach(function registerNestedCandidate(candidate) {
            urlForensicsEmailCandidateDiscoveryRegisterCandidate(
              matchedCandidates,
              candidate.root,
              candidate.bonus,
              candidate.detectionMode,
              candidate.signalScore
            );
          });
        return;
      }

      if (!urlForensicsEmailCandidateDiscoveryIsLikelyInboxEmailBody(element, options)) {
        return;
      }

      urlForensicsEmailCandidateDiscoveryRegisterCandidate(matchedCandidates, element, selectorBonus, "inbox-read", 0);
    });
  });

  if (!isInboxHost) {
    options.standaloneEmailBodySelectors.forEach(function inspectStandaloneSelector(selector, selectorIndex) {
      const selectorBonus = options.standaloneEmailBodySelectors.length + 16 - selectorIndex;

      urlForensicsEmailCandidateDiscoveryQuerySelectorAll(selector, null, options).forEach(function inspectStandaloneElement(element) {
        const standaloneSignals = urlForensicsEmailCandidateDiscoveryMeasureStandaloneSignals(element, null, options);

        if (!urlForensicsEmailCandidateDiscoveryIsLikelyStandaloneEmailBody(element, standaloneSignals, options)) {
          return;
        }

        urlForensicsEmailCandidateDiscoveryRegisterCandidate(
          matchedCandidates,
          element,
          selectorBonus,
          "full-page-read",
          standaloneSignals.score
        );
      });
    });

    if (options.documentObject && options.documentObject.body) {
      Array.from(options.documentObject.body.children || []).slice(0, 24).forEach(function inspectBodyChild(element, childIndex) {
        const standaloneSignals = urlForensicsEmailCandidateDiscoveryMeasureStandaloneSignals(element, null, options);

        if (!urlForensicsEmailCandidateDiscoveryIsLikelyStandaloneEmailBody(element, standaloneSignals, options)) {
          return;
        }

        urlForensicsEmailCandidateDiscoveryRegisterCandidate(
          matchedCandidates,
          element,
          Math.max(1, 8 - childIndex),
          "full-page-read",
          standaloneSignals.score
        );
      });
    }
  }

  return Array.from(matchedCandidates.values()).sort(function sortCandidates(leftCandidate, rightCandidate) {
    return urlForensicsEmailCandidateDiscoveryScoreCandidate(rightCandidate, options) -
      urlForensicsEmailCandidateDiscoveryScoreCandidate(leftCandidate, options);
  });
}

function urlForensicsEmailCandidateDiscoveryChoosePrimaryCandidate(candidates) {
  return candidates.length ? candidates[0] : null;
}

function urlForensicsEmailCandidateDiscoveryCreate(options) {
  const resolvedOptions = urlForensicsEmailCandidateDiscoveryCreateDefaultOptions(options);

  return Object.freeze({
    choosePrimaryEmailCandidate: function choosePrimaryEmailCandidate(candidates) {
      return urlForensicsEmailCandidateDiscoveryChoosePrimaryCandidate(candidates || []);
    },
    choosePrimaryInboxRoot: function choosePrimaryInboxRoot(candidates) {
      const primaryCandidate = urlForensicsEmailCandidateDiscoveryChoosePrimaryCandidate(candidates || []);
      return primaryCandidate ? primaryCandidate.root : null;
    },
    getCandidateMissingGraceWindow: function getCandidateMissingGraceWindow() {
      return urlForensicsEmailCandidateDiscoveryGetMissingGraceWindow(resolvedOptions);
    },
    getInboxDetectionFailure: function getInboxDetectionFailure(candidates) {
      return urlForensicsEmailCandidateDiscoveryGetInboxDetectionFailure(candidates || [], resolvedOptions);
    },
    getInboxRootCandidates: function getInboxRootCandidates() {
      return urlForensicsEmailCandidateDiscoveryGetInboxRootCandidates(resolvedOptions);
    }
  });
}

(function attachUrlForensicsEmailCandidateDiscovery(globalScope) {
  const emailCandidateDiscovery = Object.freeze({
    create: urlForensicsEmailCandidateDiscoveryCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailCandidateDiscovery;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailCandidateDiscovery = emailCandidateDiscovery;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
