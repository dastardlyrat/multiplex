"use strict";

function urlForensicsEmailAutoReplaceResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsEmailAutoReplaceBuildEnvironmentOptions(optionBag) {
  return {
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    getActiveEmailRoot: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getActiveEmailRoot,
      function getMissingActiveEmailRoot() {
        return null;
      }
    ),
    getAutoApplyMirrorSenderSelector: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getAutoApplyMirrorSenderSelector,
      function getMissingAutoApplyMirrorSenderSelector() {
        return "";
      }
    ),
    getAutoApplyMirrorSenderEmailPattern: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getAutoApplyMirrorSenderEmailPattern,
      function getMissingAutoApplyMirrorSenderEmailPattern() {
        return null;
      }
    ),
    getAutoApplyMirrorSenderHeaderPattern: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getAutoApplyMirrorSenderHeaderPattern,
      function getMissingAutoApplyMirrorSenderHeaderPattern() {
        return null;
      }
    )
  };
}

function urlForensicsEmailAutoReplaceBuildRuleOptions(optionBag) {
  return {
    nativeExpansionControlHintPattern:
      optionBag.nativeExpansionControlHintPattern instanceof RegExp
        ? optionBag.nativeExpansionControlHintPattern
        : /^$/
  };
}

function urlForensicsEmailAutoReplaceBuildStateOptions(optionBag) {
  return {
    getReplaceEmailBodyWithMirrorContentEnabled: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getReplaceEmailBodyWithMirrorContentEnabled,
      function getMissingReplaceEmailBodyWithMirrorContentEnabled() {
        return false;
      }
    ),
    getAutoApplyMirrorForConfiguredSendersEnabled: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getAutoApplyMirrorForConfiguredSendersEnabled,
      function getMissingAutoApplyMirrorForConfiguredSendersEnabled() {
        return false;
      }
    ),
    getAutoApplyMirrorSenderEmailList: urlForensicsEmailAutoReplaceResolveFunction(
      optionBag.getAutoApplyMirrorSenderEmailList,
      function getMissingAutoApplyMirrorSenderEmailList() {
        return [];
      }
    )
  };
}

function urlForensicsEmailAutoReplaceCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsEmailAutoReplaceBuildEnvironmentOptions(optionBag),
    urlForensicsEmailAutoReplaceBuildRuleOptions(optionBag),
    urlForensicsEmailAutoReplaceBuildStateOptions(optionBag)
  ));
}

function urlForensicsEmailAutoReplaceGetMessageScope(root) {
  if (!root || typeof root.closest !== "function") {
    return null;
  }

  return root.closest(
    "[data-message-id], [role='listitem'], [role='article'], article, [data-test-id*='message'], [data-test-id*='conversation']"
  );
}

function urlForensicsEmailAutoReplaceHasConfiguredSenderText(value, options) {
  const safeValue = String(value || "");
  const senderEmailPattern = options.getAutoApplyMirrorSenderEmailPattern();
  const senderHeaderPattern = options.getAutoApplyMirrorSenderHeaderPattern();

  if (!safeValue || !senderEmailPattern || !senderHeaderPattern) {
    return false;
  }

  if (senderHeaderPattern.test(safeValue)) {
    return true;
  }

  return senderEmailPattern.test(safeValue.slice(0, 2400));
}

function urlForensicsEmailAutoReplaceHasConfiguredSenderElement(options) {
  const senderSelector = options.getAutoApplyMirrorSenderSelector();

  if (!senderSelector || !options.documentObject || typeof options.documentObject.querySelector !== "function") {
    return false;
  }

  try {
    return !!options.documentObject.querySelector(senderSelector);
  } catch {
    return false;
  }
}

function urlForensicsEmailAutoReplaceHasNativeExpansionControl(root, options) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return false;
  }

  const messageScope = urlForensicsEmailAutoReplaceGetMessageScope(root) || root;
  const controlElements = Array.from(messageScope.querySelectorAll(
    "button, [role='button'], a[href], a[role='button'], summary, [aria-expanded]"
  ));

  return controlElements.some(function hasMatchingExpansionControl(controlElement) {
    if (!controlElement || (typeof controlElement.closest === "function" && controlElement.closest("#merged-link-lab-page-pane"))) {
      return false;
    }

    const controlText = String(controlElement.innerText || controlElement.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    const controlHints = [
      controlText,
      typeof controlElement.getAttribute === "function" ? (controlElement.getAttribute("aria-label") || "") : "",
      typeof controlElement.getAttribute === "function" ? (controlElement.getAttribute("title") || "") : "",
      typeof controlElement.getAttribute === "function" ? (controlElement.getAttribute("data-tooltip") || "") : "",
      typeof controlElement.getAttribute === "function" ? (controlElement.getAttribute("data-tooltip-text") || "") : "",
      typeof controlElement.getAttribute === "function" ? (controlElement.getAttribute("data-test-id") || "") : "",
      typeof controlElement.getAttribute === "function" ? (controlElement.getAttribute("data-testid") || "") : ""
    ]
      .join(" ")
      .toLowerCase();

    if (!controlHints) {
      return false;
    }

    return options.nativeExpansionControlHintPattern.test(controlHints);
  });
}

function urlForensicsEmailAutoReplaceIsConfiguredSenderDetected(snapshot, options) {
  if (!options.getAutoApplyMirrorSenderEmailList().length) {
    return false;
  }

  if (urlForensicsEmailAutoReplaceHasConfiguredSenderElement(options)) {
    return true;
  }

  const activeEmailRoot = options.getActiveEmailRoot();
  const messageScope = urlForensicsEmailAutoReplaceGetMessageScope(activeEmailRoot);
  const sourceSignals = [
    snapshot && snapshot.rawText ? String(snapshot.rawText).slice(0, 6000) : "",
    snapshot && snapshot.sourceHtml ? String(snapshot.sourceHtml).slice(0, 16000) : "",
    messageScope ? String(messageScope.innerText || messageScope.textContent || "").slice(0, 6000) : "",
    activeEmailRoot ? String(activeEmailRoot.innerText || activeEmailRoot.textContent || "").slice(0, 6000) : "",
    String(options.documentObject && options.documentObject.title || "")
  ];

  return sourceSignals.some(function hasSenderSignal(sourceSignal) {
    return urlForensicsEmailAutoReplaceHasConfiguredSenderText(sourceSignal, options);
  });
}

function urlForensicsEmailAutoReplaceShouldAutoReplace(snapshot, options) {
  if (
    options.getAutoApplyMirrorForConfiguredSendersEnabled() !== true ||
    !urlForensicsEmailAutoReplaceIsConfiguredSenderDetected(snapshot, options)
  ) {
    return false;
  }

  return !urlForensicsEmailAutoReplaceHasNativeExpansionControl(options.getActiveEmailRoot(), options);
}

function urlForensicsEmailAutoReplaceShouldReplace(snapshot, options) {
  return options.getReplaceEmailBodyWithMirrorContentEnabled() === true ||
    urlForensicsEmailAutoReplaceShouldAutoReplace(snapshot, options);
}

function urlForensicsEmailAutoReplaceCreate(options) {
  const resolvedOptions = urlForensicsEmailAutoReplaceCreateDefaultOptions(options);

  return Object.freeze({
    hasConfiguredSenderElement: function hasConfiguredSenderElement() {
      return urlForensicsEmailAutoReplaceHasConfiguredSenderElement(resolvedOptions);
    },
    hasConfiguredSenderText: function hasConfiguredSenderText(value) {
      return urlForensicsEmailAutoReplaceHasConfiguredSenderText(value, resolvedOptions);
    },
    hasNativeEmailExpansionControl: function hasNativeEmailExpansionControl(root) {
      return urlForensicsEmailAutoReplaceHasNativeExpansionControl(root, resolvedOptions);
    },
    isConfiguredSenderDetected: function isConfiguredSenderDetected(snapshot) {
      return urlForensicsEmailAutoReplaceIsConfiguredSenderDetected(snapshot, resolvedOptions);
    },
    shouldAutoReplaceEmailBodyWithMirrorContent: function shouldAutoReplaceEmailBodyWithMirrorContent(snapshot) {
      return urlForensicsEmailAutoReplaceShouldAutoReplace(snapshot, resolvedOptions);
    },
    shouldReplaceEmailBodyWithMirrorContent: function shouldReplaceEmailBodyWithMirrorContent(snapshot) {
      return urlForensicsEmailAutoReplaceShouldReplace(snapshot, resolvedOptions);
    }
  });
}

(function attachUrlForensicsEmailAutoReplace(globalScope) {
  const emailAutoReplace = Object.freeze({
    create: urlForensicsEmailAutoReplaceCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailAutoReplace;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailAutoReplace = emailAutoReplace;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
