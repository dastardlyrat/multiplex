// Function: initialize shared inbox provider detectors.
(function initializeUrlForensicsInboxDetectors(globalScope, inboxDetectorRegistry) {
  "use strict";

  if (!inboxDetectorRegistry || typeof inboxDetectorRegistry.listProviderDefinitions !== "function") {
    throw new Error("URL Forensics inbox detector registry is unavailable.");
  }

  const readViewHintPattern =
    /\b(message body|message|conversation|thread|mail view|reading pane|preview|viewer|article|body)\b/i;
  const composeContextHintPattern = /\b(compose|composer|reply|forward|draft|editable|editor)\b/i;
  const nativeExpansionControlHintPattern =
    /\b(show\s+(?:trimmed\s+content|quoted\s+text|entire\s+message|all|more)|view\s+(?:entire|full)\s+message|expand|see\s+more|load\s+more)\b/i;
  const standaloneEmailHintPattern =
    /\b(email|e-mail|message|mail|subject|forwarded|reply|print|eml|rfc822|sender|recipient)\b/i;
  const topicDigestLabelPattern = /\btopic digest\b/i;
  const topicDigestActionPattern = /\bview all topics\b/i;
  const providerDefinitions = inboxDetectorRegistry.listProviderDefinitions();
  const providerDefinitionsById = new Map(providerDefinitions.map(function mapProviderDefinition(providerDefinition) {
    return [providerDefinition.id, providerDefinition];
  }));
  const genericInboxContainerSelectors = Object.freeze([
    "[data-view='message']",
    ".mail-view",
    ".conversation-view",
    "main",
    "[role='main']",
    "[role='article']",
    "article"
  ]);

  function buildUniqueSelectorList(items) {
    const seenSelectors = new Set();

    return Object.freeze((Array.isArray(items) ? items : []).filter(function keepUniqueSelector(selector) {
      const normalizedSelector = String(selector || "").trim();

      if (!normalizedSelector || seenSelectors.has(normalizedSelector)) {
        return false;
      }

      seenSelectors.add(normalizedSelector);
      return true;
    }));
  }

  function getProviderPrimaryInboxBodySelectors(providerId) {
    const providerDefinition = providerDefinitionsById.get(String(providerId || "").trim());

    return providerDefinition && Array.isArray(providerDefinition.primaryInboxBodySelectors)
      ? providerDefinition.primaryInboxBodySelectors.slice()
      : [];
  }

  const primaryInboxBodySelectorsByProvider = Object.freeze(providerDefinitions.reduce(function mapSelectorsByProvider(result, providerDefinition) {
    result[providerDefinition.id] = Object.freeze(providerDefinition.primaryInboxBodySelectors.slice());
    return result;
  }, {}));
  const providerInboxBodySelectors = buildUniqueSelectorList(providerDefinitions.flatMap(function flattenProviderPrimarySelectors(providerDefinition) {
    return providerDefinition.primaryInboxBodySelectors || [];
  }));
  const inboxBodySelectors = buildUniqueSelectorList(providerInboxBodySelectors.concat([
    "[data-testid='message-view-body']",
    "[data-testid='message-body']",
    "[data-test-id='message-view-body']",
    "[data-test-id='message-body']",
    "[data-testid*='message'][data-testid*='body']",
    "[data-testid*='message-content']",
    "[data-test-id*='message'][data-test-id*='body']",
    "[data-test-id*='message-content']",
    ".thread-message__body",
    ".message-body",
    ".message-content",
    ".msg-body"
  ]).concat(genericInboxContainerSelectors));
  const standaloneEmailBodySelectors = buildUniqueSelectorList([
    "[data-email-body]",
    "[data-message-body]"
  ].concat(providerInboxBodySelectors).concat([
    ".email-body",
    ".email-content",
    ".email-message",
    ".email-view",
    ".mail-body",
    ".mail-message",
    ".mail-view",
    ".message-view",
    ".message-body",
    ".message-content",
    ".msg-body",
    ".thread-message__body",
    ".mimepart",
    ".rfc822-message",
    "body > main",
    "body > article",
    "body > section",
    "body > div",
    "body > table",
    "[role='article']",
    "article",
    "main",
    "[role='main']"
  ]));
  const explicitInboxBodySelectors = Object.freeze(inboxBodySelectors.filter(function filterExplicitInboxBodySelector(selector) {
    return genericInboxContainerSelectors.indexOf(selector) === -1;
  }));
  const outlookMailBodySelector = getProviderPrimaryInboxBodySelectors("outlook")[0] || 'div[data-test-id="mailMessageBodyContainer"]';
  const inboxHostPattern = Object.freeze({
    test: function testSupportedInboxHost(hostnameValue) {
      return isSupportedInboxHost({ hostname: hostnameValue });
    }
  });

  // Function: get location hostname.
  function getLocationHostname(locationLike) {
    const safeLocation = locationLike || window.location || {};
    return String(safeLocation.hostname || "");
  }

  // Function: get location pathname.
  function getLocationPathname(locationLike) {
    const safeLocation = locationLike || window.location || {};
    return String(safeLocation.pathname || "");
  }

  // Function: get location search.
  function getLocationSearch(locationLike) {
    const safeLocation = locationLike || window.location || {};
    return String(safeLocation.search || "");
  }

  // Function: get location hash.
  function getLocationHash(locationLike) {
    const safeLocation = locationLike || window.location || {};
    return String(safeLocation.hash || "");
  }

  // Function: check Gmail read-view location.
  function isGmailReadViewLocation(locationLike) {
    const searchValue = getLocationSearch(locationLike).toLowerCase();
    const normalizedHash = getLocationHash(locationLike).replace(/^#/, "");
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

  // Function: check provider host match.
  function matchesProviderHost(providerId, locationLike) {
    const providerDefinition = providerDefinitionsById.get(String(providerId || "").trim());
    const hostname = getLocationHostname(locationLike);

    return !!(
      providerDefinition &&
      providerDefinition.hostPattern &&
      providerDefinition.hostPattern.test(hostname)
    );
  }

  // Function: check provider key match.
  function matchesProviderKey(providerId, locationLike) {
    const providerDefinition = providerDefinitionsById.get(String(providerId || "").trim());
    const pathname = getLocationPathname(locationLike);

    return !!(
      matchesProviderHost(providerId, locationLike) &&
      (
        providerId !== "gmail" ||
        isGmailReadViewLocation(locationLike)
      ) &&
      (
        !providerDefinition ||
        !providerDefinition.pathPattern ||
        providerDefinition.pathPattern.test(pathname)
      )
    );
  }

  // Function: check supported inbox host.
  function isSupportedInboxHost(locationLike) {
    return providerDefinitions.some(function hasMatchingProviderHost(providerDefinition) {
      return matchesProviderHost(providerDefinition.id, locationLike);
    });
  }

  // Function: check Outlook host.
  function isOutlookHost(locationLike) {
    return matchesProviderHost("outlook", locationLike);
  }

  // Function: check Gmail host.
  function isGmailHost(locationLike) {
    return matchesProviderHost("gmail", locationLike);
  }

  // Function: check Yahoo host.
  function isYahooHost(locationLike) {
    return matchesProviderHost("yahoo", locationLike);
  }

  // Function: check Proton host.
  function isProtonHost(locationLike) {
    return matchesProviderHost("proton", locationLike);
  }

  // Function: check Hey host.
  function isHeyHost(locationLike) {
    return matchesProviderHost("hey", locationLike);
  }

  // Function: check Hey topic path.
  function isHeyTopicPath(locationLike) {
    const heyProviderDefinition = providerDefinitionsById.get("hey");
    return !!(
      heyProviderDefinition &&
      heyProviderDefinition.pathPattern &&
      heyProviderDefinition.pathPattern.test(getLocationPathname(locationLike))
    );
  }

  // Function: check Fastmail host.
  function isFastmailHost(locationLike) {
    return matchesProviderHost("fastmail", locationLike);
  }

  // Function: get inbox provider key.
  function getInboxProviderKey(locationLike) {
    const matchedProviderDefinition = providerDefinitions.find(function findMatchedProviderDefinition(providerDefinition) {
      return matchesProviderKey(providerDefinition.id, locationLike);
    });

    return matchedProviderDefinition ? matchedProviderDefinition.id : "";
  }

  // Function: get primary inbox body selectors.
  function getPrimaryInboxBodySelectors(locationLike) {
    const providerKey = getInboxProviderKey(locationLike);

    if (providerKey && primaryInboxBodySelectorsByProvider[providerKey]) {
      return primaryInboxBodySelectorsByProvider[providerKey].slice();
    }

    if (isGmailHost(locationLike) && primaryInboxBodySelectorsByProvider.gmail) {
      return primaryInboxBodySelectorsByProvider.gmail.slice();
    }

    return [];
  }

  // Function: get detection search roots, including open shadow roots.
  function getDetectionSearchRoots(root) {
    const initialRoot = root || document;
    const discoveredRoots = [];
    const visitedRoots = new Set();
    const pendingRoots = [initialRoot];

    while (pendingRoots.length) {
      const currentRoot = pendingRoots.shift();

      if (!currentRoot || visitedRoots.has(currentRoot)) {
        continue;
      }

      visitedRoots.add(currentRoot);
      discoveredRoots.push(currentRoot);

      if (typeof currentRoot.querySelectorAll !== "function") {
        continue;
      }

      currentRoot.querySelectorAll("*").forEach(function inspectPotentialShadowHost(element) {
        if (element && element.shadowRoot && !visitedRoots.has(element.shadowRoot)) {
          pendingRoots.push(element.shadowRoot);
        }
      });
    }

    return discoveredRoots;
  }

  globalThis.urlForensicsInboxDetectors = Object.freeze({
    patterns: Object.freeze({
      inboxHost: inboxHostPattern,
      readViewHint: readViewHintPattern,
      composeContextHint: composeContextHintPattern,
      nativeExpansionControlHint: nativeExpansionControlHintPattern,
      standaloneEmailHint: standaloneEmailHintPattern,
      topicDigestLabel: topicDigestLabelPattern,
      topicDigestAction: topicDigestActionPattern
    }),
    selectors: Object.freeze({
      outlookMailBody: outlookMailBodySelector,
      primaryInboxBodyByProvider: primaryInboxBodySelectorsByProvider,
      inboxBody: inboxBodySelectors,
      standaloneEmailBody: standaloneEmailBodySelectors,
      genericInboxContainer: genericInboxContainerSelectors,
      explicitInboxBody: explicitInboxBodySelectors
    }),
    registry: inboxDetectorRegistry,
    listProviderDefinitions: inboxDetectorRegistry.listProviderDefinitions,
    getProviderDefinition: inboxDetectorRegistry.getProviderDefinition,
    isSupportedInboxHost: isSupportedInboxHost,
    isOutlookHost: isOutlookHost,
    isGmailHost: isGmailHost,
    isYahooHost: isYahooHost,
    isProtonHost: isProtonHost,
    isHeyHost: isHeyHost,
    isHeyTopicPath: isHeyTopicPath,
    isFastmailHost: isFastmailHost,
    isGmailReadViewLocation: isGmailReadViewLocation,
    getInboxProviderKey: getInboxProviderKey,
    getPrimaryInboxBodySelectors: getPrimaryInboxBodySelectors,
    getDetectionSearchRoots: getDetectionSearchRoots
  });
}(
  typeof globalThis !== "undefined" ? globalThis : this,
  (function resolveUrlForensicsInboxDetectorRegistry(globalScope) {
    if (globalScope && globalScope.urlForensicsInboxDetectorRegistry) {
      return globalScope.urlForensicsInboxDetectorRegistry;
    }

    if (typeof require === "function") {
      try {
        return require("./inbox-detector-registry.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this))
));
