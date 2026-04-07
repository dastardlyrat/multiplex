// Function: initialize shared inbox provider detectors.
(function initializeUrlForensicsInboxDetectors() {
  "use strict";

  const inboxHostPattern =
    /^(?:(?:[^.]+\.)*mail\.google\.com|(?:[^.]+\.)*outlook\.office\.com|(?:[^.]+\.)*outlook\.live\.com|(?:[^.]+\.)*outlook\.office365\.com|(?:[^.]+\.)*mail\.yahoo\.com|(?:[^.]+\.)*mail\.proton\.me|(?:[^.]+\.)*app\.hey\.com|(?:[^.]+\.)*app\.fastmail\.com)$/i;
  const gmailHostPattern = /(^|\.)mail\.google\.com$/i;
  const outlookHostPattern = /(^|\.)outlook\.(office|live|office365)\.com$/i;
  const yahooHostPattern = /(^|\.)mail\.yahoo\.com$/i;
  const protonHostPattern = /(^|\.)mail\.proton\.me$/i;
  const heyHostPattern = /(^|\.)app\.hey\.com$/i;
  const heyTopicPathPattern = /^\/topics(?:\/|$)/i;
  const fastmailHostPattern = /(^|\.)app\.fastmail\.com$/i;
  const outlookMailBodySelector = 'div[data-test-id="mailMessageBodyContainer"]';
  const readViewHintPattern =
    /\b(message body|message|conversation|thread|mail view|reading pane|preview|viewer|article|body)\b/i;
  const composeContextHintPattern = /\b(compose|composer|reply|forward|draft|editable|editor)\b/i;
  const nativeExpansionControlHintPattern =
    /\b(show\s+(?:trimmed\s+content|quoted\s+text|entire\s+message|all|more)|view\s+(?:entire|full)\s+message|expand|see\s+more|load\s+more)\b/i;
  const standaloneEmailHintPattern =
    /\b(email|e-mail|message|mail|subject|forwarded|reply|print|eml|rfc822|sender|recipient)\b/i;
  const topicDigestLabelPattern = /\btopic digest\b/i;
  const topicDigestActionPattern = /\bview all topics\b/i;
  const primaryInboxBodySelectorsByProvider = Object.freeze({
    gmail: Object.freeze([
      "div.AO div.adn.ads[data-message-id] .a3s.aiL",
      "div.AO div[data-message-id].adn.ads .a3s.aiL",
      "[data-message-id] .a3s.aiL",
      ".a3s.aiL"
    ]),
    outlook: Object.freeze([
      "div[data-test-id='mailMessageBodyContainer']",
      "[data-app-section='MailReadCompose'] div[role='document']",
      "div[role='document'][aria-label*='Message']",
      "div[aria-label='Message body']",
      "div[aria-label*='Message body']"
    ]),
    yahoo: Object.freeze([
      "div.msg-body[data-test-id='message-view-body-content']"
    ]),
    proton: Object.freeze([
      "iframe.w-full[title='Email content']"
    ]),
    hey: Object.freeze([
      "div[id^='entry_expander_entry_'].entry__body.entry-expander",
      "#entries .entry__body.entry-expander",
      "div.entry__body.entry-expander",
      "article.entry .entry__body.entry-expander",
      "div.entry__wrapper .entry__body.entry-expander",
      ".thread-message__body",
      ".message-body",
      ".message-content"
    ]),
    fastmail: Object.freeze([
      "div.u-containSelection.v-Message-body"
    ])
  });
  const inboxBodySelectors = Object.freeze([
    "div.AO div.adn.ads[data-message-id] .a3s.aiL",
    "div.AO div[data-message-id].adn.ads .a3s.aiL",
    "div[data-test-id='mailMessageBodyContainer']",
    "[data-message-id] .a3s.aiL",
    ".a3s.aiL",
    "iframe.w-full[title='Email content']",
    "div.msg-body[data-test-id='message-view-body-content']",
    "div[id^='entry_expander_entry_'].entry__body.entry-expander",
    "#entries .entry__body.entry-expander",
    "div.entry__body.entry-expander",
    "article.entry .entry__body.entry-expander",
    "div.entry__wrapper .entry__body.entry-expander",
    "div.u-containSelection.v-Message-body",
    "[data-app-section='MailReadCompose'] div[role='document']",
    "div[role='document'][aria-label*='Message']",
    "div[aria-label='Message body']",
    "div[aria-label*='Message body']",
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
    ".msg-body",
    "[data-view='message']",
    ".mail-view",
    ".conversation-view",
    "main",
    "[role='main']",
    "[role='article']",
    "article"
  ]);
  const standaloneEmailBodySelectors = Object.freeze([
    "[data-email-body]",
    "[data-message-body]",
    "div.AO div.adn.ads[data-message-id] .a3s.aiL",
    "div.AO div[data-message-id].adn.ads .a3s.aiL",
    "[data-message-id] .a3s.aiL",
    ".a3s.aiL",
    "iframe.w-full[title='Email content']",
    "div.msg-body[data-test-id='message-view-body-content']",
    "div[id^='entry_expander_entry_'].entry__body.entry-expander",
    "#entries .entry__body.entry-expander",
    "div.entry__body.entry-expander",
    "article.entry .entry__body.entry-expander",
    "div.entry__wrapper .entry__body.entry-expander",
    "div.u-containSelection.v-Message-body",
    "[data-testid='message-view-body']",
    "[data-testid='message-body']",
    "[data-testid*='message'][data-testid*='body']",
    "[data-testid*='message-content']",
    "[data-test-id*='message'][data-test-id*='body']",
    "[data-test-id*='message-content']",
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
  ]);
  const genericInboxContainerSelectors = Object.freeze([
    "[data-view='message']",
    ".mail-view",
    ".conversation-view",
    "main",
    "[role='main']",
    "[role='article']",
    "article"
  ]);
  const explicitInboxBodySelectors = Object.freeze(inboxBodySelectors.filter(function filterExplicitInboxBodySelector(selector) {
    return genericInboxContainerSelectors.indexOf(selector) === -1;
  }));

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

  // Function: check supported inbox host.
  function isSupportedInboxHost(locationLike) {
    return inboxHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: check Outlook host.
  function isOutlookHost(locationLike) {
    return outlookHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: check Gmail host.
  function isGmailHost(locationLike) {
    return gmailHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: check Yahoo host.
  function isYahooHost(locationLike) {
    return yahooHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: check Proton host.
  function isProtonHost(locationLike) {
    return protonHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: check Hey host.
  function isHeyHost(locationLike) {
    return heyHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: check Hey topic path.
  function isHeyTopicPath(locationLike) {
    return heyTopicPathPattern.test(getLocationPathname(locationLike));
  }

  // Function: check Fastmail host.
  function isFastmailHost(locationLike) {
    return fastmailHostPattern.test(getLocationHostname(locationLike));
  }

  // Function: get inbox provider key.
  function getInboxProviderKey(locationLike) {
    if (isGmailHost(locationLike)) {
      return "gmail";
    }

    if (isOutlookHost(locationLike)) {
      return "outlook";
    }

    if (isYahooHost(locationLike)) {
      return "yahoo";
    }

    if (isProtonHost(locationLike)) {
      return "proton";
    }

    if (isHeyHost(locationLike) && isHeyTopicPath(locationLike)) {
      return "hey";
    }

    if (isFastmailHost(locationLike)) {
      return "fastmail";
    }

    return "";
  }

  // Function: get primary inbox body selectors.
  function getPrimaryInboxBodySelectors(locationLike) {
    const providerKey = getInboxProviderKey(locationLike);

    if (!providerKey || !primaryInboxBodySelectorsByProvider[providerKey]) {
      return [];
    }

    return primaryInboxBodySelectorsByProvider[providerKey].slice();
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
    isSupportedInboxHost: isSupportedInboxHost,
    isOutlookHost: isOutlookHost,
    isGmailHost: isGmailHost,
    isYahooHost: isYahooHost,
    isProtonHost: isProtonHost,
    isHeyHost: isHeyHost,
    isHeyTopicPath: isHeyTopicPath,
    isFastmailHost: isFastmailHost,
    getInboxProviderKey: getInboxProviderKey,
    getPrimaryInboxBodySelectors: getPrimaryInboxBodySelectors,
    getDetectionSearchRoots: getDetectionSearchRoots
  });
}());
