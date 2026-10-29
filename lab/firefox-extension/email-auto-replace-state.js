"use strict";

function urlForensicsEmailAutoReplaceStateResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsEmailAutoReplaceStateBuildEnvironmentOptions(optionBag) {
  return {
    cssObject: optionBag.cssObject || (typeof CSS !== "undefined" ? CSS : null),
    sanitizeSenderEmailList: urlForensicsEmailAutoReplaceStateResolveFunction(
      optionBag.sanitizeSenderEmailList,
      function sanitizeMissingSenderEmailList(value) {
        return Array.isArray(value) ? value.slice() : [];
      }
    ),
    extensionSettings: optionBag.extensionSettings && typeof optionBag.extensionSettings === "object"
      ? optionBag.extensionSettings
      : {
        autoApplyMirrorForConfiguredSenders: false,
        autoApplyMirrorSenderEmailList: []
      }
  };
}

function urlForensicsEmailAutoReplaceStateBuildDefaultOptions(optionBag) {
  return {
    defaultAutoApplyMirrorForConfiguredSenders: optionBag.defaultAutoApplyMirrorForConfiguredSenders === true,
    defaultAutoApplyMirrorSenderEmails: Array.isArray(optionBag.defaultAutoApplyMirrorSenderEmails)
      ? optionBag.defaultAutoApplyMirrorSenderEmails.slice()
      : []
  };
}

function urlForensicsEmailAutoReplaceStateCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsEmailAutoReplaceStateBuildEnvironmentOptions(optionBag),
    urlForensicsEmailAutoReplaceStateBuildDefaultOptions(optionBag)
  ));
}

function urlForensicsEmailAutoReplaceStateEscapeTextForPattern(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function urlForensicsEmailAutoReplaceStateEscapeSelectorAttributeValue(value, options) {
  if (options.cssObject && typeof options.cssObject.escape === "function") {
    return options.cssObject.escape(String(value || ""));
  }

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function urlForensicsEmailAutoReplaceStateCreate(options) {
  const resolvedOptions = urlForensicsEmailAutoReplaceStateCreateDefaultOptions(options);
  let autoApplyMirrorSenderSelector = "";
  let autoApplyMirrorSenderEmailPattern = null;
  let autoApplyMirrorSenderHeaderPattern = null;

  function refreshConfiguredSenderDetectionState() {
    const senderEmailList = resolvedOptions.sanitizeSenderEmailList(
      resolvedOptions.extensionSettings.autoApplyMirrorSenderEmailList
    );

    resolvedOptions.extensionSettings.autoApplyMirrorSenderEmailList = senderEmailList;

    if (!senderEmailList.length) {
      autoApplyMirrorSenderSelector = "";
      autoApplyMirrorSenderEmailPattern = null;
      autoApplyMirrorSenderHeaderPattern = null;
      return;
    }

    autoApplyMirrorSenderSelector = senderEmailList
      .map(function createSenderSelectors(emailAddress) {
        const escapedEmailAddress = urlForensicsEmailAutoReplaceStateEscapeSelectorAttributeValue(
          emailAddress,
          resolvedOptions
        );

        return [
          '[email="' + escapedEmailAddress + '"]',
          '[data-hovercard-id="' + escapedEmailAddress + '"]',
          '[data-email="' + escapedEmailAddress + '"]',
          '[data-from="' + escapedEmailAddress + '"]',
          '[data-sender-email="' + escapedEmailAddress + '"]',
          'a[href="mailto:' + escapedEmailAddress + '"]',
          'a[href^="mailto:' + escapedEmailAddress + '?"]'
        ];
      })
      .reduce(function flattenSelectors(flattenedSelectors, selectorGroup) {
        return flattenedSelectors.concat(selectorGroup);
      }, [])
      .join(", ");

    const senderEmailAlternation = senderEmailList
      .map(function escapeSenderEmail(emailAddress) {
        return urlForensicsEmailAutoReplaceStateEscapeTextForPattern(emailAddress);
      })
      .join("|");

    autoApplyMirrorSenderEmailPattern = new RegExp(
      "(^|[^a-z0-9._%+-])(?:" + senderEmailAlternation + ")(?=$|[^a-z0-9._%+-])",
      "i"
    );
    autoApplyMirrorSenderHeaderPattern = new RegExp(
      "(?:^|\\n|\\r)\\s*(from|sender|reply-to)\\s*[:\\-].{0,260}(?:" + senderEmailAlternation + ")",
      "i"
    );
  }

  function applyStoredAutoApplyMirrorForConfiguredSendersSetting(nextValue) {
    if (nextValue === true || nextValue === false) {
      resolvedOptions.extensionSettings.autoApplyMirrorForConfiguredSenders = nextValue === true;
      return;
    }

    resolvedOptions.extensionSettings.autoApplyMirrorForConfiguredSenders =
      resolvedOptions.defaultAutoApplyMirrorForConfiguredSenders === true;
  }

  function applyStoredAutoApplyMirrorSenderEmailList(nextValue, options) {
    const optionBag = options || {};
    const sanitizedEmailList = resolvedOptions.sanitizeSenderEmailList(nextValue);

    if (Array.isArray(nextValue) || sanitizedEmailList.length) {
      resolvedOptions.extensionSettings.autoApplyMirrorSenderEmailList = sanitizedEmailList;
    } else if (optionBag.useDefaultList === true) {
      resolvedOptions.extensionSettings.autoApplyMirrorSenderEmailList =
        resolvedOptions.defaultAutoApplyMirrorSenderEmails.slice();
    }

    refreshConfiguredSenderDetectionState();
  }

  refreshConfiguredSenderDetectionState();

  return Object.freeze({
    applyStoredAutoApplyMirrorForConfiguredSendersSetting: applyStoredAutoApplyMirrorForConfiguredSendersSetting,
    applyStoredAutoApplyMirrorSenderEmailList: applyStoredAutoApplyMirrorSenderEmailList,
    getAutoApplyMirrorSenderEmailPattern: function getAutoApplyMirrorSenderEmailPattern() {
      return autoApplyMirrorSenderEmailPattern;
    },
    getAutoApplyMirrorSenderHeaderPattern: function getAutoApplyMirrorSenderHeaderPattern() {
      return autoApplyMirrorSenderHeaderPattern;
    },
    getAutoApplyMirrorSenderSelector: function getAutoApplyMirrorSenderSelector() {
      return autoApplyMirrorSenderSelector;
    },
    refreshConfiguredSenderDetectionState: refreshConfiguredSenderDetectionState
  });
}

(function attachUrlForensicsEmailAutoReplaceState(globalScope) {
  const emailAutoReplaceState = Object.freeze({
    create: urlForensicsEmailAutoReplaceStateCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailAutoReplaceState;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailAutoReplaceState = emailAutoReplaceState;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
