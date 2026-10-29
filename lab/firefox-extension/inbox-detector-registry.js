// Shared registry for inbox provider detector definitions.
"use strict";

function urlForensicsInboxDetectorRegistryFreezeArray(value) {
  return Object.freeze((Array.isArray(value) ? value : []).map(function normalizeArrayValue(item) {
    return String(item || "").trim();
  }).filter(Boolean));
}

function urlForensicsInboxDetectorRegistryClonePattern(patternLike) {
  if (patternLike instanceof RegExp) {
    return new RegExp(patternLike.source, patternLike.flags);
  }

  if (patternLike && typeof patternLike === "object" && patternLike.source) {
    return new RegExp(String(patternLike.source), String(patternLike.flags || ""));
  }

  return null;
}

function urlForensicsInboxDetectorRegistryCloneProviderDefinition(providerDefinition) {
  const safeProviderDefinition = providerDefinition && typeof providerDefinition === "object" ? providerDefinition : {};

  return Object.freeze({
    id: String(safeProviderDefinition.id || "").trim(),
    title: String(safeProviderDefinition.title || "").trim(),
    priority: Number.isFinite(safeProviderDefinition.priority) ? safeProviderDefinition.priority : 0,
    hostPattern: urlForensicsInboxDetectorRegistryClonePattern(safeProviderDefinition.hostPattern),
    pathPattern: urlForensicsInboxDetectorRegistryClonePattern(safeProviderDefinition.pathPattern),
    primaryInboxBodySelectors: urlForensicsInboxDetectorRegistryFreezeArray(safeProviderDefinition.primaryInboxBodySelectors)
  });
}

(function attachUrlForensicsInboxDetectorRegistry(globalScope) {
  const registeredProviderDefinitions = new Map();
  let providerSequence = 0;

  function rememberProviderDefinition(providerDefinition) {
    const normalizedProviderDefinition = urlForensicsInboxDetectorRegistryCloneProviderDefinition(providerDefinition);

    if (!normalizedProviderDefinition.id) {
      throw new Error("URL Forensics inbox provider id is required.");
    }

    if (!normalizedProviderDefinition.hostPattern) {
      throw new Error("URL Forensics inbox provider hostPattern is required for " + normalizedProviderDefinition.id + ".");
    }

    registeredProviderDefinitions.set(normalizedProviderDefinition.id, Object.freeze({
      providerDefinition: normalizedProviderDefinition,
      sequence: providerSequence
    }));
    providerSequence += 1;
    return normalizedProviderDefinition;
  }

  function listProviderDefinitions() {
    return Array.from(registeredProviderDefinitions.values())
      .sort(function compareProviderEntries(leftEntry, rightEntry) {
        const priorityDelta = (leftEntry.providerDefinition.priority || 0) - (rightEntry.providerDefinition.priority || 0);

        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return leftEntry.sequence - rightEntry.sequence;
      })
      .map(function mapEntryToProviderDefinition(entry) {
        return entry.providerDefinition;
      });
  }

  function getProviderDefinition(providerId) {
    const providerEntry = registeredProviderDefinitions.get(String(providerId || "").trim());
    return providerEntry ? providerEntry.providerDefinition : null;
  }

  function registerProviderDefinition(providerDefinition) {
    return rememberProviderDefinition(providerDefinition);
  }

  [
    Object.freeze({
      id: "gmail",
      title: "Gmail",
      hostPattern: Object.freeze({
        source: "(^|\\.)mail\\.google\\.com$",
        flags: "i"
      }),
      primaryInboxBodySelectors: Object.freeze([
        "div.maincontent",
        "div.AO div.adn.ads[data-message-id] .a3s.aiL",
        "div.AO div[data-message-id].adn.ads .a3s.aiL",
        "[data-message-id] .a3s.aiL",
        ".a3s.aiL"
      ])
    }),
    Object.freeze({
      id: "outlook",
      title: "Outlook",
      hostPattern: Object.freeze({
        source: "(^|\\.)outlook\\.(office|live|office365)\\.com$",
        flags: "i"
      }),
      primaryInboxBodySelectors: Object.freeze([
        "div[data-test-id='mailMessageBodyContainer']",
        "[data-app-section='MailReadCompose'] div[role='document']",
        "div[role='document'][aria-label*='Message']",
        "div[aria-label='Message body']",
        "div[aria-label*='Message body']"
      ])
    }),
    Object.freeze({
      id: "yahoo",
      title: "Yahoo Mail",
      hostPattern: Object.freeze({
        source: "(^|\\.)mail\\.yahoo\\.com$",
        flags: "i"
      }),
      primaryInboxBodySelectors: Object.freeze([
        "div.msg-body[data-test-id='message-view-body-content']"
      ])
    }),
    Object.freeze({
      id: "proton",
      title: "Proton Mail",
      hostPattern: Object.freeze({
        source: "(^|\\.)mail\\.proton\\.me$",
        flags: "i"
      }),
      primaryInboxBodySelectors: Object.freeze([
        "iframe.w-full[title='Email content']"
      ])
    }),
    Object.freeze({
      id: "hey",
      title: "HEY",
      hostPattern: Object.freeze({
        source: "(^|\\.)app\\.hey\\.com$",
        flags: "i"
      }),
      pathPattern: Object.freeze({
        source: "^\\/topics(?:\\/|$)",
        flags: "i"
      }),
      primaryInboxBodySelectors: Object.freeze([
        "div[id^='entry_expander_entry_'].entry__body.entry-expander",
        "#entries .entry__body.entry-expander",
        "div.entry__body.entry-expander",
        "article.entry .entry__body.entry-expander",
        "div.entry__wrapper .entry__body.entry-expander",
        ".thread-message__body",
        ".message-body",
        ".message-content"
      ])
    }),
    Object.freeze({
      id: "fastmail",
      title: "Fastmail",
      hostPattern: Object.freeze({
        source: "(^|\\.)app\\.fastmail\\.com$",
        flags: "i"
      }),
      primaryInboxBodySelectors: Object.freeze([
        "div.u-containSelection.v-Message-body"
      ])
    })
  ].forEach(function registerBuiltInProviderDefinition(providerDefinition) {
    rememberProviderDefinition(providerDefinition);
  });

  if (globalScope && Array.isArray(globalScope.urlForensicsInboxProviderDefinitions)) {
    globalScope.urlForensicsInboxProviderDefinitions.forEach(function registerPreloadedProviderDefinition(providerDefinition) {
      registerProviderDefinition(providerDefinition);
    });
  }

  const inboxDetectorRegistry = Object.freeze({
    getProviderDefinition: getProviderDefinition,
    listProviderDefinitions: listProviderDefinitions,
    registerProviderDefinition: registerProviderDefinition
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = inboxDetectorRegistry;
  }

  if (globalScope) {
    globalScope.urlForensicsInboxDetectorRegistry = inboxDetectorRegistry;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
