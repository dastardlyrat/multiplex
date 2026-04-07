// Function: initialize merged link lab content script.
(function initializeMergedLinkLabContentScript() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : chrome;
  const mergedLinkLabPipeline = typeof MergedLinkLabPipeline !== "undefined" ? MergedLinkLabPipeline : null;
  const storageModel = typeof globalThis !== "undefined" ? globalThis.urlForensicsStorageModel : null;
  const inboxDetectors = typeof globalThis !== "undefined" ? globalThis.urlForensicsInboxDetectors : null;
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;
  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "content-script", module: "content-script" });
    debugApi.runtime("content script initialization started", {
      host: window.location.hostname || "",
      readyState: document.readyState || "unknown"
    });
  }

  // Branch: follow this path only when the current condition passes.
  if (!extensionApi || !extensionApi.runtime || !mergedLinkLabPipeline || !storageModel || !inboxDetectors) {
    if (debugApi) {
      debugApi.error("content script initialization aborted: required modules unavailable", {
        hasExtensionApi: !!extensionApi,
        hasRuntime: !!(extensionApi && extensionApi.runtime),
        hasPipeline: !!mergedLinkLabPipeline,
        hasStorageModel: !!storageModel,
        hasInboxDetectors: !!inboxDetectors
      });
    }
    return;
  }

  const sidePanelIconFallbacks = Object.freeze({
    account_tree: "\u251c",
    analytics: "\u25f7",
    close_fullscreen: "\u2199",
    content_copy: "\u25a3",
    find_replace: "\u21c4",
    link: "\u26d3",
    mail: "\u2709",
    refresh: "\u21bb",
    settings: "\u2699",
    travel_explore: "\u2316"
  });

  // Function: mark side panel icon font ready.
  function markSidePanelIconFontReady() {
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.add("merged-link-lab-page-pane-icon-font-ready");
    }
  }

  // Function: apply side panel fallback icons.
  function applySidePanelIconFallbacks(rootElement) {
    if (!rootElement || typeof rootElement.querySelectorAll !== "function") {
      return;
    }

    rootElement.querySelectorAll(".merged-link-lab-page-pane__icon[data-icon]").forEach(function applyIconFallback(iconElement) {
      const iconName = iconElement.getAttribute("data-icon") || "";
      const fallbackIcon = sidePanelIconFallbacks[iconName] || "\u25cf";
      iconElement.setAttribute("data-fallback-icon", fallbackIcon);
    });
  }

  // Function: install side panel icon font face.
  function installSidePanelIconFontFace() {
    if (!extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      return;
    }

    const styleElementId = "merged-link-lab-page-pane-icon-font";
    const existingStyleElement = document.getElementById(styleElementId);
    const styleMount = document.head || document.documentElement;

    if (existingStyleElement || !styleMount) {
      return;
    }

    const fontUrl = extensionApi.runtime.getURL("resources/fonts/material-symbols-outlined.woff2");
    const fontFaceSource = 'url("' + fontUrl.replace(/"/g, "%22") + '") format("woff2")';
    const styleElement = document.createElement("style");
    styleElement.id = styleElementId;
    styleElement.textContent =
      '@font-face{font-family:"Material Symbols Outlined";font-style:normal;font-weight:400;font-display:block;src:url("' +
      fontUrl.replace(/"/g, "%22") +
      '") format("woff2");}';
    styleMount.appendChild(styleElement);

    if (typeof FontFace === "function" && document.fonts && typeof document.fonts.add === "function") {
      try {
        const iconFontFace = new FontFace("Material Symbols Outlined", fontFaceSource, {
          style: "normal",
          weight: "400",
          display: "block"
        });
        document.fonts.add(iconFontFace);
        iconFontFace.load().then(markSidePanelIconFontReady).catch(function ignoreIconFontLoadError() {});
        return;
      } catch {
        // The @font-face rule above remains the primary path in older browsers.
      }
    }

    if (document.fonts && typeof document.fonts.load === "function") {
      document.fonts
        .load('16px "Material Symbols Outlined"', "settings")
        .then(function handleLoadedFontFaces(fontFaces) {
          if (fontFaces && fontFaces.length) {
            markSidePanelIconFontReady();
          }
        })
        .catch(function ignoreDocumentFontsLoadError() {});
    }
  }

  installSidePanelIconFontFace();

  const inboxHostPattern = inboxDetectors.patterns.inboxHost;
  const readViewHintPattern = inboxDetectors.patterns.readViewHint;
  const composeContextHintPattern = inboxDetectors.patterns.composeContextHint;
  const nativeExpansionControlHintPattern = inboxDetectors.patterns.nativeExpansionControlHint;
  const standaloneEmailHintPattern = inboxDetectors.patterns.standaloneEmailHint;
  const topicDigestLabelPattern = inboxDetectors.patterns.topicDigestLabel;
  const topicDigestActionPattern = inboxDetectors.patterns.topicDigestAction;
  const outlookMailBodySelector = inboxDetectors.selectors.outlookMailBody;
  const inboxBodySelectors = inboxDetectors.selectors.inboxBody;
  const standaloneEmailBodySelectors = inboxDetectors.selectors.standaloneEmailBody;
  const genericInboxContainerSelectors = inboxDetectors.selectors.genericInboxContainer;
  const explicitInboxBodySelectors = inboxDetectors.selectors.explicitInboxBody;
  const getPrimaryInboxBodySelectors = inboxDetectors.getPrimaryInboxBodySelectors;
  const getDetectionSearchRoots = inboxDetectors.getDetectionSearchRoots;
  const isOutlookHost = inboxDetectors.isOutlookHost;
  const isProtonHost = inboxDetectors.isProtonHost;
  const inboxCandidateMissingGraceMs = 4000;
  const outlookCandidateMissingGraceMs = 12000;
  const protonCandidateMissingGraceMs = 12000;
  const observedEmailRoots = new WeakSet();
  let scheduledSnapshotTimer = 0;
  let latestSnapshot = null;
  let latestDetectedEmailRoot = null;
  let latestDetectedEmailMode = "";
  let lastPublishedSnapshotSignature = "";
  let latestInboxCandidateSeenAt = 0;
  let inboxCandidateMissingSince = 0;
  let lastObservedLocationHref = String(window.location.href || "");
  const defaultMirrorLinkHoverMessage = "Hover over a link to reveal URL components";
  const unavailableMirrorLinkHoverMessage = "Mirror hover inspection is unavailable for this email body.";
  let mirrorHoverListenerCleanup = null;
  let latestDetectedMirrorHoverInfoText = "";
  const pipelineSettingStorageKey = storageModel.storageKeys.enableUrlNormalizationRepair;
  const replaceEmailBodyWithMirrorContentStorageKey = storageModel.storageKeys.replaceEmailBodyWithMirrorContent;
  const autoApplyMirrorForConfiguredSendersStorageKey = storageModel.storageKeys.autoApplyMirrorForConfiguredSenders;
  const autoApplyMirrorSenderEmailListStorageKey = storageModel.storageKeys.autoApplyMirrorSenderEmailList;
  const legacyAutoApplyMirrorForNamedSenderStorageKey = storageModel.legacyStorageKeys.autoApplyMirrorForNamedSender;
  const defaultAutoApplyMirrorSenderEmails = storageModel.defaultSettings.autoApplyMirrorSenderEmailList;
  const sanitizeSenderEmailList = storageModel.sanitizeSenderEmailList;
  const resolveStoredAutoApplyConfiguredSendersValue = storageModel.resolveStoredAutoApplyConfiguredSendersValue;
  const buildStorageBooleanSnapshotEntry = storageModel.buildStorageBooleanEntry;
  const buildStorageEmailListSnapshotEntry = storageModel.buildStorageEmailListEntry;
  const formatStorageSnapshotSourceLabel = storageModel.getStorageSourceLabel;
  const formatStorageSnapshotEntry = storageModel.formatStorageBooleanEntry;
  const formatStorageEmailListSnapshotEntry = storageModel.formatStorageEmailListEntry;
  let autoApplyMirrorSenderSelector = "";
  let autoApplyMirrorSenderEmailPattern = null;
  let autoApplyMirrorSenderHeaderPattern = null;
  const extensionManifest =
    extensionApi.runtime && typeof extensionApi.runtime.getManifest === "function"
      ? extensionApi.runtime.getManifest()
      : { name: "URL Forensics Workbench", version: "0.0.0" };
  const extensionSettings = {
    enableUrlNormalizationRepair: !!(
    mergedLinkLabPipeline.resolvePipelineSettings
        ? mergedLinkLabPipeline.resolvePipelineSettings(mergedLinkLabPipeline.defaultPipelineSettings).enableUrlNormalizationRepair
        : false
    ),
    replaceEmailBodyWithMirrorContent: false,
    autoApplyMirrorForConfiguredSenders: false,
    autoApplyMirrorSenderEmailList: defaultAutoApplyMirrorSenderEmails.slice()
  };
  const extensionStorageSnapshot = {
    source: "defaults",
    loadedAt: 0,
    loadError: "",
    values: {
      enableUrlNormalizationRepair: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.enableUrlNormalizationRepair
      },
      replaceEmailBodyWithMirrorContent: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.replaceEmailBodyWithMirrorContent
      },
      autoApplyMirrorForConfiguredSenders: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.autoApplyMirrorForConfiguredSenders
      },
      autoApplyMirrorSenderEmailList: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.autoApplyMirrorSenderEmailList.slice()
      }
    }
  };

  const workflowRailElements = {
    root: null,
    railToggleButton: null,
    railBadge: null,
    railStatus: null,
    railCount: null,
    statusText: null,
    pageLink: null,
    detectedAt: null,
    sectionLabel: null,
    sourceType: null,
    rawUrlCount: null,
    finalUrlCount: null,
    changedCount: null,
    rewrittenCount: null,
    digestCount: null,
    refreshButton: null,
    settingsButton: null,
    tabButtons: [],
    tabPanels: [],
    convertedPane: null,
    convertedSummary: null,
    labFrame: null,
    labFrameLoaded: false,
    diagnosticsPane: null,
    diagnosticsSummary: null,
    hoverLinkInfo: null,
    hoverLinkInfoValue: null,
    rewrittenPane: null,
    applyChangesButton: null,
    copyConvertedButton: null,
    copyDiagnosticsButton: null,
    collapseButton: null,
    currentPaneKey: "",
    activeTabKey: "converted",
    isExpanded: false
  };
  const reservedLayoutEntries = [];

  // Function: get pipeline settings.
  function getPipelineSettings() {
    return {
      enableUrlNormalizationRepair: !!extensionSettings.enableUrlNormalizationRepair
    };
  }

  // Function: escape regular expression text.
  function escapeTextForPattern(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Function: escape selector attribute value.
  function escapeSelectorAttributeValue(value) {
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") {
      return CSS.escape(String(value || ""));
    }

    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  // Function: refresh configured sender detection state.
  function refreshAutoApplyConfiguredSenderDetectionState() {
    const senderEmailList = sanitizeSenderEmailList(extensionSettings.autoApplyMirrorSenderEmailList);

    extensionSettings.autoApplyMirrorSenderEmailList = senderEmailList;

    if (!senderEmailList.length) {
      autoApplyMirrorSenderSelector = "";
      autoApplyMirrorSenderEmailPattern = null;
      autoApplyMirrorSenderHeaderPattern = null;
      return;
    }

    autoApplyMirrorSenderSelector = senderEmailList
      .map(function createSenderSelectors(emailAddress) {
        const escapedEmailAddress = escapeSelectorAttributeValue(emailAddress);

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
        return escapeTextForPattern(emailAddress);
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

  refreshAutoApplyConfiguredSenderDetectionState();

  // Function: set extension storage snapshot.
  function setExtensionStorageSnapshot(source, storedSettings, errorMessage) {
    const normalizedStoredSettings = storageModel.normalizeStoredSettings(storedSettings);

    extensionStorageSnapshot.source = String(source || "defaults");
    extensionStorageSnapshot.loadedAt = Date.now();
    extensionStorageSnapshot.loadError = errorMessage ? String(errorMessage) : "";
    extensionStorageSnapshot.values = {
      enableUrlNormalizationRepair: buildStorageBooleanSnapshotEntry(
        normalizedStoredSettings,
        pipelineSettingStorageKey,
        extensionSettings.enableUrlNormalizationRepair
      ),
      replaceEmailBodyWithMirrorContent: buildStorageBooleanSnapshotEntry(
        normalizedStoredSettings,
        replaceEmailBodyWithMirrorContentStorageKey,
        extensionSettings.replaceEmailBodyWithMirrorContent
      ),
      autoApplyMirrorForConfiguredSenders: buildStorageBooleanSnapshotEntry(
        normalizedStoredSettings,
        autoApplyMirrorForConfiguredSendersStorageKey,
        extensionSettings.autoApplyMirrorForConfiguredSenders
      ),
      autoApplyMirrorSenderEmailList: buildStorageEmailListSnapshotEntry(
        normalizedStoredSettings,
        autoApplyMirrorSenderEmailListStorageKey,
        extensionSettings.autoApplyMirrorSenderEmailList
      )
    };
  }

  // Function: does text mention a configured sender email address.
  function hasConfiguredSenderText(value) {
    const safeValue = String(value || "");

    if (!safeValue || !autoApplyMirrorSenderEmailPattern || !autoApplyMirrorSenderHeaderPattern) {
      return false;
    }

    if (autoApplyMirrorSenderHeaderPattern.test(safeValue)) {
      return true;
    }

    return autoApplyMirrorSenderEmailPattern.test(safeValue.slice(0, 2400));
  }

  // Function: does page expose configured sender attributes.
  function hasConfiguredSenderElement() {
    if (!autoApplyMirrorSenderSelector) {
      return false;
    }

    // Branch: try the primary operation before handling failures.
    try {
      return !!document.querySelector(autoApplyMirrorSenderSelector);
    // Branch: handle errors from the guarded operation.
    } catch {
      return false;
    }
  }

  // Function: is a configured sender detected for snapshot.
  function isConfiguredSenderDetected(snapshot) {
    if (!extensionSettings.autoApplyMirrorSenderEmailList.length) {
      return false;
    }

    // Branch: follow this path only when the current condition passes.
    if (hasConfiguredSenderElement()) {
      return true;
    }

    const activeEmailRoot = getActiveEmailRoot();
    const messageScope =
      activeEmailRoot && typeof activeEmailRoot.closest === "function"
        ? activeEmailRoot.closest(
            "[data-message-id], [role='listitem'], [role='article'], article, [data-test-id*='message'], [data-test-id*='conversation']"
          )
        : null;
    const sourceSignals = [
      snapshot && snapshot.rawText ? String(snapshot.rawText).slice(0, 6000) : "",
      snapshot && snapshot.sourceHtml ? String(snapshot.sourceHtml).slice(0, 16000) : "",
      messageScope ? String(messageScope.innerText || messageScope.textContent || "").slice(0, 6000) : "",
      activeEmailRoot ? String(activeEmailRoot.innerText || activeEmailRoot.textContent || "").slice(0, 6000) : "",
      String(document.title || "")
    ];

    return sourceSignals.some(function hasSenderSignal(sourceSignal) {
      return hasConfiguredSenderText(sourceSignal);
    });
  }

  // Function: does email expose native expansion controls.
  function hasNativeEmailExpansionControl(root) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return false;
    }

    const messageScope =
      typeof root.closest === "function"
        ? root.closest(
            "[data-message-id], [role='listitem'], [role='article'], article, [data-test-id*='message'], [data-test-id*='conversation']"
          ) || root
        : root;
    const controlElements = Array.from(messageScope.querySelectorAll(
      "button, [role='button'], a[href], a[role='button'], summary, [aria-expanded]"
    ));

    return controlElements.some(function hasMatchingExpansionControl(controlElement) {
      if (!controlElement || controlElement.closest("#merged-link-lab-page-pane")) {
        return false;
      }

      const controlText = String(controlElement.innerText || controlElement.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      const controlHints = [
        controlText,
        controlElement.getAttribute("aria-label") || "",
        controlElement.getAttribute("title") || "",
        controlElement.getAttribute("data-tooltip") || "",
        controlElement.getAttribute("data-tooltip-text") || "",
        controlElement.getAttribute("data-test-id") || "",
        controlElement.getAttribute("data-testid") || ""
      ]
        .join(" ")
        .toLowerCase();

      if (!controlHints) {
        return false;
      }

      return nativeExpansionControlHintPattern.test(controlHints);
    });
  }

  // Function: should auto-replace email body for detected sender.
  function shouldAutoReplaceEmailBodyWithMirrorContent(snapshot) {
    if (extensionSettings.autoApplyMirrorForConfiguredSenders !== true || !isConfiguredSenderDetected(snapshot)) {
      return false;
    }

    return !hasNativeEmailExpansionControl(getActiveEmailRoot());
  }

  // Function: should replace email body with mirror content.
  function shouldReplaceEmailBodyWithMirrorContent(snapshot) {
    return extensionSettings.replaceEmailBodyWithMirrorContent === true || shouldAutoReplaceEmailBodyWithMirrorContent(snapshot);
  }

  // Function: apply stored pipeline setting.
  function applyStoredPipelineSetting(nextValue) {
    extensionSettings.enableUrlNormalizationRepair = nextValue === true;
  }

  // Function: apply stored replace-email-body setting.
  function applyStoredReplaceEmailBodySetting(nextValue) {
    extensionSettings.replaceEmailBodyWithMirrorContent = nextValue === true;
  }

  // Function: apply stored auto-replace sender setting.
  function applyStoredAutoApplyMirrorForConfiguredSendersSetting(nextValue) {
    if (nextValue === true || nextValue === false) {
      extensionSettings.autoApplyMirrorForConfiguredSenders = nextValue === true;
    }
  }

  // Function: apply stored sender email list.
  function applyStoredAutoApplyMirrorSenderEmailList(nextValue, options) {
    const optionBag = options || {};
    const sanitizedEmailList = sanitizeSenderEmailList(nextValue);

    if (Array.isArray(nextValue) || sanitizedEmailList.length) {
      extensionSettings.autoApplyMirrorSenderEmailList = sanitizedEmailList;
    } else if (optionBag.useDefaultList === true) {
      extensionSettings.autoApplyMirrorSenderEmailList = defaultAutoApplyMirrorSenderEmails.slice();
    }

    refreshAutoApplyConfiguredSenderDetectionState();
  }

  // Function: load pipeline settings.
  async function loadPipelineSettings() {
    if (debugApi) {
      debugApi.functionIn("content.loadPipelineSettings");
    }

    // Branch: follow this path only when the current condition passes.
    if (!extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      setExtensionStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this page context.");
      if (debugApi) {
        debugApi.storage("content storage unavailable");
        debugApi.functionOut("content.loadPipelineSettings", { source: "storage-unavailable" });
      }
      return getPipelineSettings();
    }

    // Branch: try the primary operation before handling failures.
    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys());
      applyStoredPipelineSetting(storedSettings[pipelineSettingStorageKey]);
      applyStoredReplaceEmailBodySetting(storedSettings[replaceEmailBodyWithMirrorContentStorageKey]);
      applyStoredAutoApplyMirrorForConfiguredSendersSetting(resolveStoredAutoApplyConfiguredSendersValue(storedSettings));
      applyStoredAutoApplyMirrorSenderEmailList(storedSettings[autoApplyMirrorSenderEmailListStorageKey], { useDefaultList: true });
      setExtensionStorageSnapshot("storage.local", storedSettings, "");
      if (debugApi) {
        debugApi.storage("content settings loaded", {
          enableUrlNormalizationRepair: extensionSettings.enableUrlNormalizationRepair,
          replaceEmailBodyWithMirrorContent: extensionSettings.replaceEmailBodyWithMirrorContent,
          autoApplyMirrorForConfiguredSenders: extensionSettings.autoApplyMirrorForConfiguredSenders,
          autoApplyMirrorSenderEmailCount: extensionSettings.autoApplyMirrorSenderEmailList.length
        });
        debugApi.functionOut("content.loadPipelineSettings", { source: "storage.local" });
      }
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      setExtensionStorageSnapshot(
        "storage-error",
        null,
        error && error.message ? error.message : "unknown error"
      );
      if (debugApi) {
        debugApi.error("content settings load failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("content.loadPipelineSettings", { source: "storage-error" });
      }
      return getPipelineSettings();
    }

    return getPipelineSettings();
  }

  // Function: open settings page.
  async function openSettingsPage() {
    // Branch: follow this path only when the current condition passes.
    if (!extensionApi.runtime) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (typeof extensionApi.runtime.sendMessage === "function") {
      // Branch: try the primary operation before handling failures.
      try {
        const response = await extensionApi.runtime.sendMessage({
          type: "merged-link-lab:open-settings-page"
        });

        // Branch: follow this path only when the current condition passes.
        if (response && response.ok) {
          return;
        }
      // Branch: handle errors from the guarded operation.
      } catch {
        // Fall through to direct open below.
      }
    }

    // Branch: follow this path only when the current condition passes.
    if (typeof extensionApi.runtime.openOptionsPage === "function") {
      await extensionApi.runtime.openOptionsPage();
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (typeof extensionApi.runtime.getURL === "function") {
      window.open(extensionApi.runtime.getURL("settings.html"), "_blank", "noopener");
    }
  }

  // Function: is page currently visible.
  function isPageCurrentlyVisible() {
    return document.visibilityState !== "hidden";
  }

  // Function: query selector across document and open shadow roots.
  function querySelectorAllAcrossDetectionRoots(selector, root) {
    const matchedElements = [];
    const seenElements = new Set();

    getDetectionSearchRoots(root).forEach(function inspectSearchRoot(searchRoot) {
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

  // Function: get candidate missing grace window.
  function getCandidateMissingGraceWindow() {
    // Branch: follow this path only when the current condition passes.
    if (isOutlookHost() || querySelectorAllAcrossDetectionRoots(outlookMailBodySelector).length > 0) {
      return outlookCandidateMissingGraceMs;
    }

    // Branch: follow this path only when the current condition passes.
    if (isProtonHost()) {
      return protonCandidateMissingGraceMs;
    }

    // Branch: follow this path only when the current condition passes.
    if (inboxHostPattern.test(window.location.hostname || "")) {
      return inboxCandidateMissingGraceMs;
    }

    return 0;
  }

  // Function: get outlook mail body candidates.
  function getOutlookMailBodyCandidates() {
    // Loop: keep only items that match the current check.
    return querySelectorAllAcrossDetectionRoots(outlookMailBodySelector).filter(function keepOutlookMailBodyCandidate(element) {
      return !!(element && element.isConnected && !element.closest("#merged-link-lab-page-pane"));
    });
  }

  // Function: get element hint text.
  function getElementHintText(element) {
    // Branch: follow this path only when the current condition passes.
    if (!element) {
      return "";
    }

    const hintAttributes = [
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
    ];

    return hintAttributes
      // Loop: transform each item in the current collection.
      .map(function readHintAttribute(attributeName) {
        return element.getAttribute(attributeName) || "";
      })
      .join(" ")
      .toLowerCase();
  }

  // Function: get context hint text.
  function getContextHintText(element, maximumDepth) {
    const collectedHintParts = [];
    let currentElement = element;
    let currentDepth = 0;

    // Loop: repeat while the guard condition stays true.
    while (currentElement && currentDepth < (maximumDepth || 5)) {
      collectedHintParts.push(getElementHintText(currentElement));
      currentElement = currentElement.parentElement;
      currentDepth += 1;
    }

    return collectedHintParts.join(" ");
  }

  // Function: is element visible and large enough.
  function isElementVisibleAndLargeEnough(element) {
    // Branch: follow this path only when the current condition passes.
    if (!element || !element.isConnected) {
      return false;
    }

    const elementBounds = element.getBoundingClientRect();
    return elementBounds.width > 120 && elementBounds.height > 60;
  }

  // Function: get current location href.
  function getCurrentLocationHref() {
    return String(window.location.href || "");
  }

  // Function: reset latest email detection state.
  function resetLatestEmailDetectionState() {
    latestDetectedEmailRoot = null;
    latestDetectedEmailMode = "";
    latestInboxCandidateSeenAt = 0;
    inboxCandidateMissingSince = 0;
  }

  // Function: get iframe email root content element.
  function getIframeEmailRootContentElement(iframeElement) {
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

  // Function: get email root content element.
  function getEmailRootContentElement(element) {
    if (!element) {
      return null;
    }

    return getIframeEmailRootContentElement(element) || element;
  }

  // Function: get email root html markup.
  function getEmailRootHtmlMarkup(element) {
    const contentElement = getEmailRootContentElement(element);
    return String(contentElement && contentElement.innerHTML ? contentElement.innerHTML : "");
  }

  // Function: measure element text.
  function measureElementText(element) {
    const contentElement = getEmailRootContentElement(element);
    const normalizedText = mergedLinkLabPipeline.cleanInputText(
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

  // Function: has compose context.
  function hasComposeContext(element) {
    // Branch: follow this path only when the current condition passes.
    if (!element) {
      return false;
    }

    const contentElement = getEmailRootContentElement(element);

    // Branch: follow this path only when the current condition passes.
    if (element.isContentEditable) {
      return true;
    }

    // Branch: follow this path only when the current condition passes.
    if (
      (typeof element.querySelector === "function" && element.querySelector("[contenteditable='true'], textarea, [role='textbox']")) ||
      (
        contentElement &&
        contentElement !== element &&
        typeof contentElement.querySelector === "function" &&
        contentElement.querySelector("[contenteditable='true'], textarea, [role='textbox']")
      )
    ) {
      return true;
    }

    let currentElement = element;
    let currentDepth = 0;

    // Loop: repeat while the guard condition stays true.
    while (currentElement && currentDepth < 4) {
      // Branch: follow this path only when the current condition passes.
      if (currentElement.isContentEditable) {
        return true;
      }

      currentElement = currentElement.parentElement;
      currentDepth += 1;
    }

    return composeContextHintPattern.test(getContextHintText(element, 5));
  }

  // Function: has message structure.
  function hasMessageStructure(element) {
    const contentElement = getEmailRootContentElement(element);

    return !!(
      contentElement &&
      typeof contentElement.querySelector === "function" &&
      contentElement.querySelector("a, p, br, blockquote, table, li, img")
    );
  }

  // Function: element matches any selector.
  function elementMatchesAnySelector(element, selectors) {
    // Branch: follow this path only when the current condition passes.
    if (!element || !selectors || !selectors.length) {
      return false;
    }

    // Loop: stop once any item matches the current check.
    return selectors.some(function matchesSelector(selector) {
      // Branch: try the primary operation before handling failures.
      try {
        return element.matches(selector);
      // Branch: handle errors from the guarded operation.
      } catch {
        return false;
      }
    });
  }

  // Function: has explicit inbox body marker.
  function hasExplicitInboxBodyMarker(element, options) {
    // Branch: follow this path only when the current condition passes.
    if (!element) {
      return false;
    }

    const optionBag = options && typeof options === "object" ? options : {};
    const shouldMatchSelfOnly = optionBag.matchSelfOnly === true;

    // Loop: stop once any item matches the current check.
    return explicitInboxBodySelectors.some(function hasMatchingMarker(selector) {
      // Branch: try the primary operation before handling failures.
      try {
        if (element.matches(selector)) {
          return true;
        }

        return shouldMatchSelfOnly ? false : !!element.querySelector(selector);
      // Branch: handle errors from the guarded operation.
      } catch {
        return false;
      }
    });
  }

  // Function: is generic inbox container.
  function isGenericInboxContainer(element) {
    return elementMatchesAnySelector(element, genericInboxContainerSelectors);
  }

  // Function: count email header lines.
  function countEmailHeaderLines(textValue) {
    const headerScanText = String(textValue || "").split("\n").slice(0, 48).join("\n");
    const matches = headerScanText.match(/(?:^|\n)\s*(from|to|cc|bcc|subject|date|sent|received|reply-to|attachments?)\s*:/gim);
    return matches ? matches.length : 0;
  }

  // Function: measure standalone email signals.
  function measureStandaloneEmailSignals(element, textMetrics) {
    const safeTextMetrics = textMetrics || measureElementText(element);
    const contextualHintText = [
      getContextHintText(element, 7),
      document.title || "",
      window.location.pathname || "",
      window.location.search || "",
      document.contentType || ""
    ].join(" ").toLowerCase();
    const headerLineCount = countEmailHeaderLines(safeTextMetrics.text);
    const hasStandaloneHint = standaloneEmailHintPattern.test(contextualHintText);
    const hasReplyMarker =
      /(?:^|\n)\s*(on .+ wrote:|-----original message-----|forwarded message|begin forwarded message)/im.test(safeTextMetrics.text);
    const hasMarketingFooter =
      /\b(unsubscribe|manage preferences|email preferences|view in browser)\b/i.test(safeTextMetrics.text);
    const hasMimeHint =
      /message\/rfc822/i.test(document.contentType || "") ||
      /\.eml(?:$|[?#])/i.test(window.location.pathname || "");
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

  // Function: is likely inbox email body.
  function isLikelyInboxEmailBody(element) {
    // Branch: follow this path only when the current condition passes.
    if (!element || !inboxHostPattern.test(window.location.hostname || "")) {
      return false;
    }

    // Branch: follow this path only when the current condition passes.
    if (!isElementVisibleAndLargeEnough(element)) {
      return false;
    }

    // Branch: follow this path only when the current condition passes.
    if (hasComposeContext(element)) {
      return false;
    }

    const roleValue = String(element.getAttribute("role") || "").toLowerCase();
    // Branch: follow this path only when the current condition passes.
    if (/row|gridcell|option|menuitem|tab/.test(roleValue)) {
      return false;
    }

    const contextHints = getContextHintText(element, 5);
    const textMetrics = measureElementText(element);
    const elementBounds = element.getBoundingClientRect();
    const isGenericContainer = isGenericInboxContainer(element);
    const hasKnownBodyMarker = hasExplicitInboxBodyMarker(element, {
      matchSelfOnly: isGenericContainer
    });

    // Branch: follow this path only when the current condition passes.
    if (textMetrics.text.length < 80 || textMetrics.words < 15 || textMetrics.lines < 2) {
      return false;
    }

    // Branch: follow this path only when the current condition passes.
    if (elementBounds.width < 220 || elementBounds.height < 80) {
      return false;
    }

    // Branch: follow this path only when the current condition passes.
    if (isGenericContainer && !hasKnownBodyMarker) {
      return false;
    }

    return (
      hasKnownBodyMarker ||
      (
        readViewHintPattern.test(contextHints) &&
        (
          hasMessageStructure(element) ||
          /https?:\/\//i.test(textMetrics.text)
        )
      )
    );
  }

  // Function: check whether an element can be evaluated as standalone email content.
  function canEvaluateStandaloneEmailElement(element) {
    if (!element || !element.isConnected) {
      return false;
    }

    if (element.id === "merged-link-lab-page-pane" || element.closest("#merged-link-lab-page-pane")) {
      return false;
    }

    if (!isElementVisibleAndLargeEnough(element)) {
      return false;
    }

    return !hasComposeContext(element);
  }

  // Function: check whether an ARIA role is not useful for standalone email detection.
  function hasBlockedStandaloneEmailRole(element) {
    const roleValue = String(element.getAttribute("role") || "").toLowerCase();
    return /row|gridcell|option|menuitem|tab|navigation|banner|complementary/.test(roleValue);
  }

  // Function: check minimum standalone email text density.
  function hasStandaloneEmailTextDensity(textMetrics) {
    return textMetrics.text.length >= 120 && textMetrics.words >= 25 && textMetrics.lines >= 3;
  }

  // Function: check minimum standalone email visual size.
  function hasStandaloneEmailVisualSize(elementBounds) {
    return elementBounds.width >= 240 && elementBounds.height >= 100;
  }

  // Function: build standalone email detection context.
  function createStandaloneEmailDetectionContext(element, signalData) {
    const textMetrics = measureElementText(element);
    const elementBounds = element.getBoundingClientRect();
    const standaloneSignals = signalData || measureStandaloneEmailSignals(element, textMetrics);
    const isGenericContainer = isGenericInboxContainer(element);

    return {
      textMetrics: textMetrics,
      elementBounds: elementBounds,
      standaloneSignals: standaloneSignals,
      isInboxHost: inboxHostPattern.test(window.location.hostname || ""),
      isGenericContainer: isGenericContainer,
      hasKnownBodyMarker: hasExplicitInboxBodyMarker(element, {
        matchSelfOnly: isGenericContainer
      })
    };
  }

  // Function: check whether generic inbox containers are specific enough.
  function shouldRejectGenericStandaloneInboxContainer(detectionContext) {
    return detectionContext.isInboxHost && detectionContext.isGenericContainer && !detectionContext.hasKnownBodyMarker;
  }

  // Function: check whether standalone email signals are strong enough.
  function hasStrongStandaloneEmailSignal(standaloneSignals) {
    return (
      standaloneSignals.headerLineCount >= 1 ||
      standaloneSignals.hasReplyMarker ||
      standaloneSignals.hasMimeHint ||
      (standaloneSignals.hasStandaloneHint && standaloneSignals.hasMarketingFooter)
    );
  }

  // Function: check whether content has enough email-specific evidence after scoring.
  function hasStandaloneEmailContentEvidence(element, detectionContext) {
    const standaloneSignals = detectionContext.standaloneSignals;
    const textMetrics = detectionContext.textMetrics;

    return (
      hasMessageStructure(element) ||
      /https?:\/\//i.test(textMetrics.text) ||
      standaloneSignals.headerLineCount >= 2 ||
      standaloneSignals.hasReplyMarker
    );
  }

  // Function: is likely standalone email body.
  function isLikelyStandaloneEmailBody(element, signalData) {
    if (!canEvaluateStandaloneEmailElement(element)) {
      return false;
    }

    if (hasBlockedStandaloneEmailRole(element)) {
      return false;
    }

    const detectionContext = createStandaloneEmailDetectionContext(element, signalData);

    if (!hasStandaloneEmailTextDensity(detectionContext.textMetrics)) {
      return false;
    }

    if (!hasStandaloneEmailVisualSize(detectionContext.elementBounds)) {
      return false;
    }

    if (shouldRejectGenericStandaloneInboxContainer(detectionContext)) {
      return false;
    }

    if (!hasStrongStandaloneEmailSignal(detectionContext.standaloneSignals)) {
      return false;
    }

    return detectionContext.standaloneSignals.score >= 6 && hasStandaloneEmailContentEvidence(element, detectionContext);
  }

  // Function: register email root candidate.
  function registerEmailRootCandidate(candidateMap, element, bonus, detectionMode, signalScore) {
    // Branch: follow this path only when the current condition passes.
    if (!element || !element.isConnected) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (element.id === "merged-link-lab-page-pane" || element.closest("#merged-link-lab-page-pane")) {
      return;
    }

    const existingCandidate = candidateMap.get(element);
    // Branch: follow this path only when the current condition passes.
    if (existingCandidate) {
      existingCandidate.bonus = Math.max(existingCandidate.bonus, bonus || 0);
      existingCandidate.signalScore = Math.max(existingCandidate.signalScore, signalScore || 0);
      // Branch: follow this path only when the current condition passes.
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

  // Function: score inbox root candidate.
  function scoreInboxRootCandidate(candidate) {
    const textMetrics = measureElementText(candidate.root);
    const elementBounds = candidate.root.getBoundingClientRect();
    const areaScore = Math.min((elementBounds.width * elementBounds.height) / 1500, 280);
    const lineScore = Math.min(textMetrics.lines * 4, 120);
    const textScore = Math.min(textMetrics.text.length / 12, 400);
    const viewportCenterY = window.innerHeight * 0.42;
    const distanceScore = Math.max(0, 180 - Math.abs(elementBounds.top - viewportCenterY));
    const signalScore = Math.min((candidate.signalScore || 0) * 20, 180);
    const detectionModeScore = candidate.detectionMode === "full-page-read" ? 36 : 0;

    return (candidate.bonus * 80) + areaScore + lineScore + textScore + distanceScore + signalScore + detectionModeScore + candidate.order;
  }

  // Function: collect proton nested inbox body candidates from a generic container.
  function collectProtonNestedInboxBodyCandidates(containerElement, selectorBonus) {
    if (!isProtonHost() || !containerElement || typeof containerElement.querySelectorAll !== "function") {
      return [];
    }

    const matchedCandidates = new Map();

    explicitInboxBodySelectors.forEach(function inspectExplicitSelector(selector, selectorIndex) {
      const nestedSelectorBonus = Math.max(
        1,
        (selectorBonus || 1) + (explicitInboxBodySelectors.length - selectorIndex)
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

        if (!isLikelyInboxEmailBody(element)) {
          return;
        }

        registerEmailRootCandidate(matchedCandidates, element, nestedSelectorBonus, "inbox-read", 2);
      });
    });

    return Array.from(matchedCandidates.values())
      .sort(function sortProtonNestedCandidates(leftCandidate, rightCandidate) {
        return scoreInboxRootCandidate(rightCandidate) - scoreInboxRootCandidate(leftCandidate);
      });
  }

  // Function: get inbox root candidates.
  function getInboxRootCandidates() {
    const matchedCandidates = new Map();
    const isInboxHost = inboxHostPattern.test(window.location.hostname || "");
    const primaryInboxBodySelectors = getPrimaryInboxBodySelectors();
    const outlookMailBodyCandidates = getOutlookMailBodyCandidates();

    // Loop: iterate through each item in the current collection.
    outlookMailBodyCandidates.forEach(function registerOutlookBodyCandidate(element, candidateIndex) {
      registerEmailRootCandidate(
        matchedCandidates,
        element,
        inboxBodySelectors.length + 80 - Math.min(candidateIndex, 50),
        "outlook-body-read",
        10
      );
    });

    // Loop: iterate through each item in the current collection.
    primaryInboxBodySelectors.forEach(function inspectPrimarySelector(selector, selectorIndex) {
      const selectorBonus = inboxBodySelectors.length + primaryInboxBodySelectors.length + 40 - selectorIndex;

      querySelectorAllAcrossDetectionRoots(selector).forEach(function inspectPrimaryCandidateElement(element) {
        if (!isLikelyInboxEmailBody(element)) {
          return;
        }

        registerEmailRootCandidate(matchedCandidates, element, selectorBonus, "inbox-read", 4);
      });
    });

    // Loop: iterate through each item in the current collection.
    inboxBodySelectors.forEach(function inspectSelector(selector, selectorIndex) {
      const selectorBonus = inboxBodySelectors.length - selectorIndex;
      const isGenericSelector = genericInboxContainerSelectors.indexOf(selector) !== -1;

      // Loop: iterate through each item in the current collection.
      querySelectorAllAcrossDetectionRoots(selector).forEach(function inspectCandidateElement(element) {
        if (isProtonHost() && isGenericSelector) {
          collectProtonNestedInboxBodyCandidates(element, selectorBonus).forEach(function registerNestedCandidate(candidate) {
            registerEmailRootCandidate(
              matchedCandidates,
              candidate.root,
              candidate.bonus,
              candidate.detectionMode,
              candidate.signalScore
            );
          });
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (!isLikelyInboxEmailBody(element)) {
          return;
        }

        registerEmailRootCandidate(matchedCandidates, element, selectorBonus, "inbox-read", 0);
      });
    });

    // Branch: follow this path only when the current condition passes.
    if (!isInboxHost) {
      // Loop: iterate through each item in the current collection.
      standaloneEmailBodySelectors.forEach(function inspectStandaloneSelector(selector, selectorIndex) {
        const selectorBonus = Math.max(1, standaloneEmailBodySelectors.length - selectorIndex);

        // Loop: iterate through each item in the current collection.
        querySelectorAllAcrossDetectionRoots(selector).forEach(function inspectStandaloneCandidate(element) {
          const standaloneSignals = measureStandaloneEmailSignals(element);
          // Branch: follow this path only when the current condition passes.
          if (!isLikelyStandaloneEmailBody(element, standaloneSignals)) {
            return;
          }

          registerEmailRootCandidate(
            matchedCandidates,
            element,
            selectorBonus,
            "full-page-read",
            standaloneSignals.score
          );
        });
      });

      // Branch: follow this path only when the current condition passes.
      if (document.body) {
        // Loop: iterate through each item in the current collection.
        Array.from(document.body.children || []).slice(0, 24).forEach(function inspectBodyChild(element, childIndex) {
          const standaloneSignals = measureStandaloneEmailSignals(element);
          // Branch: follow this path only when the current condition passes.
          if (!isLikelyStandaloneEmailBody(element, standaloneSignals)) {
            return;
          }

          registerEmailRootCandidate(
            matchedCandidates,
            element,
            Math.max(1, 8 - childIndex),
            "full-page-read",
            standaloneSignals.score
          );
        });
      }
    }

    return Array.from(matchedCandidates.values())
      // Function: sort candidates by score.
      .sort(function sortCandidatesByScore(leftCandidate, rightCandidate) {
        return scoreInboxRootCandidate(rightCandidate) - scoreInboxRootCandidate(leftCandidate);
      });
  }

  // Function: choose primary email candidate.
  function choosePrimaryEmailCandidate(candidates) {
    return candidates.length ? candidates[0] : null;
  }

  // Function: choose primary inbox root.
  function choosePrimaryInboxRoot(candidates) {
    const primaryCandidate = choosePrimaryEmailCandidate(candidates);
    return primaryCandidate ? primaryCandidate.root : null;
  }

  // Function: summarize email root.
  function summarizeEmailRoot(root, detectionMode) {
    if (debugApi) {
      debugApi.functionIn("content.summarizeEmailRoot", {
        detectionMode: detectionMode || "",
        rootTagName: root && root.tagName ? root.tagName : ""
      });
    }

    const contentElement = getEmailRootContentElement(root);
    const sourceHtml = getEmailRootHtmlMarkup(root);
    const rawText = mergedLinkLabPipeline.cleanInputText(
      contentElement && (contentElement.innerText || contentElement.textContent)
        ? (contentElement.innerText || contentElement.textContent)
        : ""
    );
    const pipelineSettings = getPipelineSettings();
    const resolvedDetectionMode = detectionMode || (inboxHostPattern.test(window.location.hostname || "") ? "inbox-read" : "full-page-read");
    const defaultSectionLabel = resolvedDetectionMode === "full-page-read" ? "Opened full-page email" : "Opened email body";
    const pipelineResult = mergedLinkLabPipeline.analyzeInput({
      rawText: rawText,
      sourceHtml: sourceHtml,
      options: pipelineSettings
    });
    if (debugApi) {
      debugApi.variable("content email snapshot summary assigned", {
        rawTextLength: rawText.length,
        sourceHtmlLength: sourceHtml.length,
        finalUrlCount: pipelineResult && pipelineResult.finalUrls ? pipelineResult.finalUrls.length : 0,
        errorCount: pipelineResult && pipelineResult.errors ? pipelineResult.errors.length : 0
      });
      debugApi.functionOut("content.summarizeEmailRoot", {
        detectionMode: resolvedDetectionMode,
        isTopicDigest: isTopicDigestSnapshot(rawText, sourceHtml, pipelineResult)
      });
    }

    return {
      detectedAt: Date.now(),
      detectionMode: resolvedDetectionMode,
      sectionLabel: root.getAttribute("aria-label") || root.getAttribute("title") || defaultSectionLabel,
      sourceHtml: sourceHtml,
      rawText: rawText,
      pipelineSettings: pipelineSettings,
      pipeline: pipelineResult,
      isTopicDigest: isTopicDigestSnapshot(rawText, sourceHtml, pipelineResult)
    };
  }

  // Function: is topic digest snapshot.
  function isTopicDigestSnapshot(rawText, sourceHtml, pipelineResult) {
    const headerSnippet = String(rawText || "").split("\n").slice(0, 18).join("\n");
    const sourceSummary = mergedLinkLabPipeline.cleanInputText(String(sourceHtml || "").replace(/<[^>]+>/g, " "));
    const pageTitle = String(document.title || "");
    const digestEntryCount =
      pipelineResult && pipelineResult.digestEntries && pipelineResult.digestEntries.length
        ? pipelineResult.digestEntries.length
        : 0;

    if (topicDigestLabelPattern.test(pageTitle) || topicDigestLabelPattern.test(headerSnippet)) {
      return true;
    }

    return topicDigestLabelPattern.test(sourceSummary) && (topicDigestActionPattern.test(sourceSummary) || digestEntryCount >= 3);
  }

  // Function: create snapshot signature.
  function createSnapshotSignature(snapshot) {
    // Branch: follow this path only when the current condition passes.
    if (!snapshot) {
      return "";
    }

    return [
      snapshot.detectionMode || "",
      snapshot.sectionLabel || "",
      snapshot.sourceHtml || "",
      snapshot.isTopicDigest ? "topic-digest" : "standard"
    ].join("::");
  }

  // Function: create snapshot pane key.
  function createSnapshotPaneKey(snapshot) {
    // Branch: follow this path only when the current condition passes.
    if (!snapshot) {
      return "";
    }

    return [
      snapshot.detectionMode || "",
      snapshot.sectionLabel || "",
      String(snapshot.rawText || "").slice(0, 240)
    ].join("::");
  }

  // Function: format detection time.
  function formatDetectionTime(timestamp) {
    // Branch: follow this path only when the current condition passes.
    if (!timestamp) {
      return "Not detected";
    }

    // Branch: try the primary operation before handling failures.
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      });
    // Branch: handle errors from the guarded operation.
    } catch {
      return "Detected";
    }
  }

  // Function: render empty state.
  function renderEmptyState(message) {
    return '<div class="merged-link-lab-page-pane__empty">' + mergedLinkLabPipeline.escapeHtml(message) + "</div>";
  }

  // Function: format metric count.
  function formatMetricCount(count, singularLabel, pluralLabel) {
    const safeCount = Number.isFinite(count) ? count : 0;
    return safeCount + " " + (safeCount === 1 ? singularLabel : pluralLabel);
  }

  // Function: format rail badge count.
  function formatRailBadgeCount(count) {
    const safeCount = Math.max(0, Math.round(Number(count) || 0));
    return safeCount > 99 ? "99+" : String(safeCount);
  }

  // Function: copy plain text.
  async function copyPlainText(value) {
    // Branch: follow this path only when the current condition passes.
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      return false;
    }

    // Branch: try the primary operation before handling failures.
    try {
      await navigator.clipboard.writeText(String(value || ""));
      return true;
    // Branch: handle errors from the guarded operation.
    } catch {
      return false;
    }
  }

  // Function: copy pane text.
  async function copyPaneText(element) {
    return copyPlainText(element ? (element.innerText || element.textContent || "") : "");
  }

  // Function: render stat.
  function renderStat(targetElement, value) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement) {
      return;
    }

    targetElement.textContent = String(value || 0);
  }

  // Function: create markup fragment.
  function createMarkupFragment(targetElement, htmlMarkup) {
    const targetDocument = targetElement && targetElement.ownerDocument ? targetElement.ownerDocument : document;
    const safeHtmlMarkup = String(htmlMarkup || "");
    const fragment = targetDocument.createDocumentFragment();

    // Branch: follow this path only when the current condition passes.
    if (!safeHtmlMarkup) {
      return fragment;
    }

    // Branch: follow this path only when the current condition passes.
    if (typeof DOMParser !== "function") {
      fragment.appendChild(targetDocument.createTextNode(safeHtmlMarkup));
      return fragment;
    }

    // Branch: try the primary operation before handling failures.
    try {
      const parsedDocument = new DOMParser().parseFromString(safeHtmlMarkup, "text/html");
      const parsedRoot = parsedDocument.body || parsedDocument.documentElement;

      // Branch: follow this path only when the current condition passes.
      if (!parsedRoot) {
        fragment.appendChild(targetDocument.createTextNode(safeHtmlMarkup));
        return fragment;
      }

      // Loop: repeat while the guard condition stays true.
      while (parsedRoot.firstChild) {
        fragment.appendChild(targetDocument.importNode(parsedRoot.firstChild, true));
        parsedRoot.removeChild(parsedRoot.firstChild);
      }

      return fragment;
    // Branch: handle errors from the guarded operation.
    } catch {
      fragment.appendChild(targetDocument.createTextNode(safeHtmlMarkup));
      return fragment;
    }
  }

  // Function: replace element markup.
  function replaceElementMarkup(targetElement, htmlMarkup) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement) {
      return;
    }

    targetElement.replaceChildren(createMarkupFragment(targetElement, htmlMarkup));
    applySidePanelIconFallbacks(targetElement);
  }

  // Function: apply rewrite to email body.
  async function applyRewriteToEmailBody() {
    // Branch: follow this path only when the current condition passes.
    if (!latestSnapshot) {
      syncEmailSnapshot();
    }

    const fallbackEmailCandidate = choosePrimaryEmailCandidate(getInboxRootCandidates());
    const activeEmailRoot = latestDetectedEmailRoot && latestDetectedEmailRoot.isConnected
      ? latestDetectedEmailRoot
      : (fallbackEmailCandidate ? fallbackEmailCandidate.root : null);

    // Branch: follow this path only when the current condition passes.
    if ((!latestDetectedEmailRoot || !latestDetectedEmailRoot.isConnected) && fallbackEmailCandidate) {
      latestDetectedEmailRoot = fallbackEmailCandidate.root;
      latestDetectedEmailMode = fallbackEmailCandidate.detectionMode || latestDetectedEmailMode;
    }

    // Branch: follow this path only when the current condition passes.
    if (!activeEmailRoot || !latestSnapshot || !latestSnapshot.pipeline) {
      return { ok: false, applied: false };
    }

    const rewrittenHtml = latestSnapshot.pipeline.rewrittenHtml || "";
    // Branch: follow this path only when the current condition passes.
    if (!rewrittenHtml) {
      return { ok: false, applied: false, snapshot: latestSnapshot };
    }

    // Branch: follow this path only when the current condition passes.
    if (getEmailRootHtmlMarkup(activeEmailRoot) === rewrittenHtml) {
      const refreshedSnapshot = summarizeEmailRoot(activeEmailRoot, latestDetectedEmailMode);
      await publishSnapshot(refreshedSnapshot);
      return { ok: true, applied: false, snapshot: refreshedSnapshot };
    }

    replaceElementMarkup(getEmailRootContentElement(activeEmailRoot), rewrittenHtml);
    latestDetectedEmailRoot = activeEmailRoot;
    observeEmailRoot(activeEmailRoot);

    const refreshedSnapshot = summarizeEmailRoot(activeEmailRoot, latestDetectedEmailMode);
    await publishSnapshot(refreshedSnapshot);
    scheduleSnapshotSync();

    return { ok: true, applied: true, snapshot: refreshedSnapshot };
  }

  // Function: format timestamp.
  function formatTimestamp(timestamp) {
    // Branch: follow this path only when the current condition passes.
    if (!timestamp) {
      return "Not detected";
    }

    // Branch: try the primary operation before handling failures.
    try {
      return new Date(timestamp).toLocaleString();
    // Branch: handle errors from the guarded operation.
    } catch {
      return "Detected";
    }
  }

  // Function: render summary count.
  function renderSummaryCount(targetElement, label, count) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement) {
      return;
    }

    targetElement.textContent = label + ": " + String(count || 0);
  }

  // Function: escape html attribute.
  function escapeHtmlAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Function: set active tab.
  function setActiveTab(tabKey) {
    const nextTabKey = /^(converted|lab|diagnostics)$/.test(String(tabKey || "")) ? tabKey : "lab";
    workflowRailElements.activeTabKey = nextTabKey;

    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.root) {
      return;
    }

    // Loop: iterate through each item in the current collection.
    workflowRailElements.tabButtons.forEach(function updateTabButton(tabButton) {
      const buttonTabKey = tabButton.getAttribute("data-tab-button");
      const isActive = buttonTabKey === nextTabKey;
      tabButton.classList.toggle("is-active", isActive);
      tabButton.setAttribute("aria-selected", String(isActive));
    });

    // Loop: iterate through each item in the current collection.
    workflowRailElements.tabPanels.forEach(function updateTabPanel(tabPanel) {
      const panelTabKey = tabPanel.getAttribute("data-tab-panel");
      const isActive = panelTabKey === nextTabKey;
      tabPanel.classList.toggle("is-active", isActive);
      tabPanel.classList.toggle("is-hidden", !isActive);
      tabPanel.setAttribute("aria-hidden", String(!isActive));
    });

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.hoverLinkInfo) {
      const shouldShowHoverInfo = nextTabKey === "converted";
      workflowRailElements.hoverLinkInfo.hidden = !shouldShowHoverInfo;
      workflowRailElements.hoverLinkInfo.setAttribute("aria-hidden", String(!shouldShowHoverInfo));
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.isExpanded) {
      syncPageViewportReservation();
    }
  }

  // Function: get active email root.
  function getActiveEmailRoot() {
    // Branch: follow this path only when the current condition passes.
    if (latestDetectedEmailRoot && latestDetectedEmailRoot.isConnected) {
      return latestDetectedEmailRoot;
    }

    return choosePrimaryInboxRoot(getInboxRootCandidates());
  }

  // Function: maybe replace email body with mirror content.
  async function maybeReplaceEmailBodyWithMirrorContent(snapshot) {
    const activeEmailRoot = getActiveEmailRoot();
    const rewrittenHtml = snapshot && snapshot.pipeline ? String(snapshot.pipeline.rewrittenHtml || "") : "";

    if (!shouldReplaceEmailBodyWithMirrorContent(snapshot) || !activeEmailRoot || !rewrittenHtml) {
      return { ok: false, applied: false, snapshot: snapshot || null };
    }

    if (getEmailRootHtmlMarkup(activeEmailRoot) === rewrittenHtml) {
      return { ok: true, applied: false, snapshot: snapshot };
    }

    return applyRewriteToEmailBody();
  }

  // Function: get displayed email body width.
  function getDisplayedEmailBodyWidth() {
    const activeEmailRoot = getActiveEmailRoot();
    // Branch: follow this path only when the current condition passes.
    if (!activeEmailRoot) {
      return 0;
    }

    const emailBounds = activeEmailRoot.getBoundingClientRect();
    const widthCandidates = [emailBounds.width];

    // Branch: follow this path only when the current condition passes.
    if (Number.isFinite(activeEmailRoot.scrollWidth) && activeEmailRoot.scrollWidth > 0) {
      widthCandidates.push(activeEmailRoot.scrollWidth);
    }

    // Loop: iterate through each item in the current collection.
    Array.from(activeEmailRoot.children || []).slice(0, 24).forEach(function collectChildWidth(childElement) {
      // Branch: follow this path only when the current condition passes.
      if (!childElement || typeof childElement.getBoundingClientRect !== "function") {
        return;
      }

      const childBounds = childElement.getBoundingClientRect();
      // Branch: follow this path only when the current condition passes.
      if (Number.isFinite(childBounds.width) && childBounds.width > 0) {
        widthCandidates.push(childBounds.width);
      }
    });

    // Loop: keep only items that match the current check.
    const measurableWidths = widthCandidates.filter(function filterWidth(widthValue) {
      return Number.isFinite(widthValue) && widthValue > 0;
    });

    return measurableWidths.length ? Math.max.apply(null, measurableWidths) : 0;
  }

  // Function: get expanded pane width.
  function getExpandedPaneWidth(viewportWidth) {
    const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
    const isCompactViewport = safeViewportWidth <= 900;
    const displayedBodyWidth = getDisplayedEmailBodyWidth();
    const isWorkflowTab = workflowRailElements.activeTabKey === "lab";
    const isMirrorTab = workflowRailElements.activeTabKey === "converted";
    const layoutOverhead = isWorkflowTab
      ? (safeViewportWidth <= 1100 ? 300 : 340)
      : (isMirrorTab ? (safeViewportWidth <= 1100 ? 180 : 240) : 80);
    const preferredWidth = displayedBodyWidth
      ? Math.round(displayedBodyWidth + layoutOverhead)
      : Math.round(safeViewportWidth * (isCompactViewport ? 0.46 : 0.42));
    const minimumWidth = isWorkflowTab
      ? (isCompactViewport ? 520 : 760)
      : (isMirrorTab ? (isCompactViewport ? 480 : 720) : (isCompactViewport ? 360 : 520));
    const maximumWidth = Math.max(minimumWidth, safeViewportWidth - (isCompactViewport ? 16 : 24));
    const viewportInset = isCompactViewport ? 16 : 24;

    return Math.max(
      56,
      Math.min(
        Math.max(56, safeViewportWidth - viewportInset),
        Math.max(minimumWidth, Math.min(maximumWidth, preferredWidth))
      )
    );
  }

  // Function: get visible pane reserved width.
  function getVisiblePaneReservedWidth() {
    return 0;
  }

  // Function: restore reserved layout targets.
  function restoreReservedLayoutTargets() {
    // Loop: repeat while the guard condition stays true.
    while (reservedLayoutEntries.length) {
      const entry = reservedLayoutEntries.pop();
      // Branch: follow this path only when the current condition passes.
      if (!entry || !entry.element) {
        continue;
      }

      entry.element.style.boxSizing = entry.inlineStyles.boxSizing;
      entry.element.style.paddingRight = entry.inlineStyles.paddingRight;
      entry.element.style.maxWidth = entry.inlineStyles.maxWidth;
      entry.element.style.width = entry.inlineStyles.width;
      entry.element.style.marginRight = entry.inlineStyles.marginRight;
      entry.element.style.transform = entry.inlineStyles.transform;
      entry.element.style.transformOrigin = entry.inlineStyles.transformOrigin;
      entry.element.style.minWidth = entry.inlineStyles.minWidth;
      entry.element.style.transition = entry.inlineStyles.transition;
    }
  }

  // Function: remember reserved layout target.
  function rememberReservedLayoutTarget(element) {
    // Branch: follow this path only when the current condition passes.
    if (!element || reservedLayoutEntries.some(function hasMatchingElement(entry) {
      return entry.element === element;
    })) {
      return false;
    }

    reservedLayoutEntries.push({
      element: element,
      inlineStyles: {
        boxSizing: element.style.boxSizing,
        paddingRight: element.style.paddingRight,
        maxWidth: element.style.maxWidth,
        width: element.style.width,
        marginRight: element.style.marginRight,
        transform: element.style.transform,
        transformOrigin: element.style.transformOrigin,
        minWidth: element.style.minWidth,
        transition: element.style.transition
      }
    });

    return true;
  }

  // Function: build reservation transition.
  function buildReservationTransition(existingTransition) {
    const reservationTransition = "max-width 180ms ease, width 180ms ease, margin-right 180ms ease, padding-right 180ms ease";
    return existingTransition ? existingTransition + ", " + reservationTransition : reservationTransition;
  }

  // Function: apply reservation to target.
  function applyReservationToTarget(targetElement, reserveValue) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement || !rememberReservedLayoutTarget(targetElement)) {
      return false;
    }

    const requestedReserveWidth = parseFloat(String(reserveValue || "").replace(/px$/i, ""));
    const targetBounds = typeof targetElement.getBoundingClientRect === "function"
      ? targetElement.getBoundingClientRect()
      : { width: 0 };
    const viewportWidth = Math.max(
      window.innerWidth || 0,
      document.documentElement ? document.documentElement.clientWidth || 0 : 0
    );
    const minimumRemainingWidth = viewportWidth <= 900 ? 280 : 420;
    const maximumReserveWidth = Math.max(0, (Number(targetBounds.width) || 0) - minimumRemainingWidth);
    const effectiveReserveWidth = Number.isFinite(requestedReserveWidth)
      ? Math.max(0, Math.min(requestedReserveWidth, maximumReserveWidth))
      : 0;

    if (effectiveReserveWidth < 48) {
      return false;
    }

    const effectiveReserveValue = effectiveReserveWidth + "px";

    targetElement.style.boxSizing = "border-box";
    targetElement.style.maxWidth = "calc(100% - " + effectiveReserveValue + ")";
    targetElement.style.width = "calc(100% - " + effectiveReserveValue + ")";
    targetElement.style.marginRight = effectiveReserveValue;
    targetElement.style.minWidth = "0";
    targetElement.style.transition = buildReservationTransition(targetElement.style.transition);
    return true;
  }

  // Function: check whether an element belongs to the URL Forensics pane.
  function isInsideUrlForensicsPane(element) {
    return !!(element && (element.id === "merged-link-lab-page-pane" || element.closest("#merged-link-lab-page-pane")));
  }

  // Function: get viewport reservation dimensions.
  function getViewportReservationDimensions() {
    return {
      width: Math.max(window.innerWidth || 0, document.documentElement ? document.documentElement.clientWidth || 0 : 0),
      height: Math.max(window.innerHeight || 0, document.documentElement ? document.documentElement.clientHeight || 0 : 0)
    };
  }

  // Function: check whether an element has a useful display mode for viewport reservation.
  function hasReservableDisplayMode(element) {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.display !== "inline" && computedStyle.display !== "contents";
  }

  // Function: check whether an element is large enough to reserve viewport space.
  function isLargeEnoughForViewportReservation(element, viewportDimensions) {
    const rect = element.getBoundingClientRect();
    return (
      rect.width >= Math.max(360, viewportDimensions.width * 0.58) &&
      rect.height >= Math.max(220, viewportDimensions.height * 0.42)
    );
  }

  // Function: check whether an element is a viewport reservation candidate.
  function isViewportReservationCandidate(element, viewportDimensions) {
    return hasReservableDisplayMode(element) && isLargeEnoughForViewportReservation(element, viewportDimensions);
  }

  // Function: find structured viewport reservation fallback container.
  function findStructuredViewportReservationContainer(root) {
    const structuredContainer = root.closest("main, [role='main'], [data-app-section], #app, #app-root, #root, #content");

    if (structuredContainer && !isInsideUrlForensicsPane(structuredContainer)) {
      return structuredContainer;
    }

    return null;
  }

  // Function: find viewport reservation container.
  function findViewportReservationContainer(root) {
    if (!root || !root.isConnected) {
      return null;
    }

    const viewportDimensions = getViewportReservationDimensions();
    let currentElement = root;
    let bestContainer = null;
    let depth = 0;

    // Loop: walk outward from the detected email body toward the app shell.
    while (currentElement && currentElement !== document.body && currentElement !== document.documentElement && depth < 14) {
      if (isInsideUrlForensicsPane(currentElement)) {
        break;
      }

      if (isViewportReservationCandidate(currentElement, viewportDimensions)) {
        bestContainer = currentElement;
      }

      currentElement = currentElement.parentElement;
      depth += 1;
    }

    if (bestContainer) {
      return bestContainer;
    }

    return findStructuredViewportReservationContainer(root) || root.parentElement || root;
  }

  // Function: apply reservation to app viewport.
  function applyReservationToAppViewport(reservedWidth) {
    restoreReservedLayoutTargets();

    // Branch: follow this path only when the current condition passes.
    if (!reservedWidth) {
      return false;
    }

    const activeEmailRoot = getActiveEmailRoot();
    // Branch: follow this path only when the current condition passes.
    if (!activeEmailRoot) {
      return false;
    }

    const reserveValue = reservedWidth + "px";
    const containerElement = findViewportReservationContainer(activeEmailRoot);

    // Branch: follow this path only when the current condition passes.
    if (containerElement) {
      return applyReservationToTarget(containerElement, reserveValue);
    }

    return false;
  }

  // Function: sync page viewport reservation.
  function syncPageViewportReservation() {
    const reservedWidth = getVisiblePaneReservedWidth();
    const reservedValue = reservedWidth + "px";
    const rootElement = document.documentElement;
    const bodyElement = document.body;
    const viewportWidth = Math.max(
      window.innerWidth || 0,
      document.documentElement ? document.documentElement.clientWidth || 0 : 0
    );
    const layoutReservationApplied = applyReservationToAppViewport(reservedWidth);

    // Branch: follow this path only when the current condition passes.
    if (rootElement) {
      rootElement.classList.toggle("merged-link-lab-page-pane-reserved", reservedWidth > 0 && !layoutReservationApplied);
      rootElement.style.setProperty(
        "--merged-link-lab-page-pane-reserved-space",
        layoutReservationApplied ? "0px" : reservedValue
      );
    }

    // Branch: follow this path only when the current condition passes.
    if (bodyElement) {
      bodyElement.classList.toggle("merged-link-lab-page-pane-reserved", reservedWidth > 0 && !layoutReservationApplied);
      bodyElement.style.setProperty(
        "--merged-link-lab-page-pane-reserved-space",
        layoutReservationApplied ? "0px" : reservedValue
      );
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.root) {
      workflowRailElements.root.style.setProperty(
        "--merged-link-lab-page-pane-expanded-width",
        getExpandedPaneWidth(viewportWidth) + "px"
      );
    }
  }

  // Function: set pane expanded.
  function setPaneExpanded(isExpanded) {
    workflowRailElements.isExpanded = !!isExpanded && !!latestSnapshot;

    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.root) {
      syncPageViewportReservation();
      return;
    }

    workflowRailElements.root.classList.toggle("has-snapshot", !!latestSnapshot);
    workflowRailElements.root.classList.toggle("is-expanded", workflowRailElements.isExpanded);
    workflowRailElements.root.setAttribute("aria-hidden", latestSnapshot ? "false" : "true");

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railToggleButton) {
      workflowRailElements.railToggleButton.setAttribute("aria-expanded", String(workflowRailElements.isExpanded));
      workflowRailElements.railToggleButton.setAttribute(
        "aria-label",
        workflowRailElements.isExpanded
      ? "Collapse URL Forensics Workbench"
      : "Open URL Forensics Workbench"
      );
    }

    syncPageViewportReservation();
  }

  // Function: show pane.
  function showPane() {
    const paneRoot = ensurePane();
    // Branch: follow this path only when the current condition passes.
    if (!paneRoot || !latestSnapshot) {
      return;
    }

    setPaneExpanded(workflowRailElements.isExpanded);
  }

  // Function: hide pane.
  function hidePane() {
    workflowRailElements.isExpanded = false;

    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.root) {
      syncPageViewportReservation();
      return;
    }

    workflowRailElements.root.classList.remove("has-snapshot", "is-expanded");
    workflowRailElements.root.setAttribute("aria-hidden", "true");

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railToggleButton) {
      workflowRailElements.railToggleButton.setAttribute("aria-expanded", "false");
    }

    syncPageViewportReservation();
  }

  // Function: copy pane rich or plain.
  async function copyPaneRichOrPlain(element) {
    // Branch: follow this path only when the current condition passes.
    if (
      element &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === "function" &&
      typeof ClipboardItem !== "undefined"
    ) {
      // Branch: try the primary operation before handling failures.
      try {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([element.innerHTML || ""], { type: "text/html" }),
          "text/plain": new Blob([element.innerText || element.textContent || ""], { type: "text/plain" })
        });

        await navigator.clipboard.write([clipboardItem]);
        return true;
      // Branch: handle errors from the guarded operation.
      } catch {}
    }

    return copyPaneText(element);
  }

  // Function: count section lines.
  function countSectionLines(sections) {
    // Loop: accumulate the current collection into one result.
    return (sections || []).reduce(function addSectionLines(totalCount, section) {
      return totalCount + ((section && section.lines) ? section.lines.length : 0);
    }, 0);
  }

  // Function: build mirror frame document.
  function buildMirrorFrameDocument(htmlMarkup, options) {
    const optionBag = options || {};
    const shouldDisableSameDocumentLinks = optionBag.disableSameDocumentLinks === true;
    const mirrorBaseUrl = String(optionBag.baseUrl || window.location.href || "");
    const mirrorMarkup = htmlMarkup
      ? (shouldDisableSameDocumentLinks ? disableMirrorSameDocumentLinksInMarkup(htmlMarkup, mirrorBaseUrl) : htmlMarkup)
      : '<div class="merged-link-lab-mirror-empty">Open an inbox email to mirror its formatted body here.</div>';

    return [
      "<!doctype html>",
      "<html>",
      "<head>",
      '  <meta charset="utf-8">',
      '  <base href="' + escapeHtmlAttribute(mirrorBaseUrl) + '" target="_blank">',
      "  <style>",
      "    html, body { margin: 0; padding: 0; background: #ffffff; color: #1f1f1f; }",
      "    body { padding: 18px; }",
      "    img, table, iframe { max-width: 100%; }",
      "    img { height: auto; }",
      "    a { color: #0f766e; }",
      shouldDisableSameDocumentLinks
        ? "    a[data-merged-link-lab-disabled-link='true'] { color: #4a4a4a; text-decoration: none; cursor: default; }"
        : "",
      "    .merged-link-lab-mirror-empty {",
      "      padding: 18px;",
      "      border: 1px dashed #cfcfcf;",
      "      border-radius: 10px;",
      "      background: #f6f6f6;",
      "      font: 13px/1.5 Arial, sans-serif;",
      "      color: #4a4a4a;",
      "    }",
      "  </style>",
      "</head>",
      "<body>",
      mirrorMarkup,
      "</body>",
      "</html>"
    ].join("");
  }

  // Function: remove hash from url value.
  function removeHashFromUrlValue(urlValue) {
    return String(urlValue || "").replace(/#.*$/, "");
  }

  // Function: is same document mirror link.
  function isSameDocumentMirrorLink(hrefValue, baseUrl) {
    const trimmedHrefValue = String(hrefValue || "").trim();
    const trimmedBaseUrl = String(baseUrl || "").trim();

    if (!trimmedHrefValue || !trimmedBaseUrl) {
      return false;
    }

    if (trimmedHrefValue.charAt(0) === "#") {
      return true;
    }

    try {
      const resolvedLinkUrl = new URL(trimmedHrefValue, trimmedBaseUrl);
      const resolvedBaseUrl = new URL(trimmedBaseUrl);

      return removeHashFromUrlValue(resolvedLinkUrl.toString()) === removeHashFromUrlValue(resolvedBaseUrl.toString());
    } catch {
      return false;
    }
  }

  // Function: disable same document mirror links in markup.
  function disableMirrorSameDocumentLinksInMarkup(htmlMarkup, baseUrl) {
    const safeHtmlMarkup = String(htmlMarkup || "");

    if (!safeHtmlMarkup || typeof DOMParser !== "function") {
      return safeHtmlMarkup;
    }

    try {
      const parsedDocument = new DOMParser().parseFromString(safeHtmlMarkup, "text/html");
      const mirrorRoot = parsedDocument.body || parsedDocument.documentElement;

      if (!mirrorRoot || typeof mirrorRoot.querySelectorAll !== "function") {
        return safeHtmlMarkup;
      }

      Array.from(mirrorRoot.querySelectorAll("a[href]")).forEach(function disableMirrorAnchor(anchorElement) {
        const hrefValue = anchorElement.getAttribute("href");

        if (!isSameDocumentMirrorLink(hrefValue, baseUrl)) {
          return;
        }

        anchorElement.setAttribute("data-merged-link-lab-disabled-link", "true");
        anchorElement.setAttribute("aria-disabled", "true");
        anchorElement.setAttribute("tabindex", "-1");
        anchorElement.removeAttribute("href");
        anchorElement.removeAttribute("target");
        anchorElement.removeAttribute("rel");
      });

      return parsedDocument.body && typeof parsedDocument.body.innerHTML === "string"
        ? parsedDocument.body.innerHTML
        : safeHtmlMarkup;
    } catch {
      return safeHtmlMarkup;
    }
  }

  // Function: render converted pane.
  function renderConvertedPane(htmlMarkup, options) {
    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.convertedPane) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.convertedPane.tagName === "IFRAME") {
      workflowRailElements.convertedPane.srcdoc = buildMirrorFrameDocument(htmlMarkup, options);
      return;
    }

    replaceElementMarkup(
      workflowRailElements.convertedPane,
      htmlMarkup || renderEmptyState("The formatted email mirror will appear here when a snapshot is available.")
    );
  }

  // Function: set mirror link hover info text.
  function setMirrorLinkHoverInfoText(textValue, options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const safeTextValue = String(textValue || "").trim();

    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.hoverLinkInfoValue) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (
      optionBag.persistDetectedValue !== false &&
      safeTextValue &&
      safeTextValue !== defaultMirrorLinkHoverMessage &&
      safeTextValue !== unavailableMirrorLinkHoverMessage
    ) {
      latestDetectedMirrorHoverInfoText = safeTextValue;
    }

    let outputTextValue = safeTextValue;
    const shouldPreserveDetectedValue = optionBag.preserveDetectedValue !== false;

    // Branch: follow this path only when the current condition passes.
    if (
      shouldPreserveDetectedValue &&
      latestDetectedMirrorHoverInfoText &&
      (!outputTextValue || outputTextValue === defaultMirrorLinkHoverMessage)
    ) {
      outputTextValue = latestDetectedMirrorHoverInfoText;
    }

    workflowRailElements.hoverLinkInfoValue.textContent =
      outputTextValue || latestDetectedMirrorHoverInfoText || defaultMirrorLinkHoverMessage;
  }

  // Function: get nearest anchor element from event target.
  function getNearestAnchorFromEventTarget(eventTarget) {
    const startElement = eventTarget && eventTarget.nodeType === 1
      ? eventTarget
      : (eventTarget && eventTarget.parentElement ? eventTarget.parentElement : null);

    // Branch: follow this path only when the current condition passes.
    if (!startElement || typeof startElement.closest !== "function") {
      return null;
    }

    return startElement.closest("a[href]");
  }

  // Function: decode mirror hover segment.
  function decodeMirrorHoverSegment(segmentValue) {
    const safeSegmentValue = String(segmentValue || "");

    // Branch: follow this path only when the current condition passes.
    if (!safeSegmentValue) {
      return "";
    }

    // Branch: try the primary operation before handling failures.
    try {
      return decodeURIComponent(safeSegmentValue);
    // Branch: handle errors from the guarded operation.
    } catch {
      return safeSegmentValue;
    }
  }

  // Function: get mirror hover detection type.
  function getMirrorHoverDetectionType(anchorElement, urlValue) {
    const attributeType = String(
      anchorElement.getAttribute("data-link-type") ||
      anchorElement.getAttribute("data-merged-link-lab") ||
      ""
    ).trim();

    // Branch: follow this path only when the current condition passes.
    if (attributeType) {
      return attributeType;
    }

    // Branch: follow this path only when the current condition passes.
    if (
      mergedLinkLabPipeline &&
      typeof mergedLinkLabPipeline.classifyUrlValue === "function"
    ) {
      const classifiedType = String(mergedLinkLabPipeline.classifyUrlValue(urlValue || "") || "").trim();
      // Branch: follow this path only when the current condition passes.
      if (classifiedType) {
        return classifiedType;
      }
    }

    return "unknown";
  }

  // Function: parse mirror hover url components.
  function parseMirrorHoverUrlComponents(urlValue, baseUrl) {
    const safeUrlValue = String(urlValue || "").trim();
    const safeBaseUrl = String(baseUrl || "").trim();
    const emptyValue = "(none)";
    const componentValues = {
      protocol: "unknown",
      domain: "unknown-host",
      subfolder: emptyValue,
      slug: emptyValue,
      parameters: emptyValue,
      anchor: emptyValue
    };

    // Branch: follow this path only when the current condition passes.
    if (!safeUrlValue) {
      return componentValues;
    }

    let parsedUrl = null;
    // Branch: try the primary operation before handling failures.
    try {
      parsedUrl = safeBaseUrl ? new URL(safeUrlValue, safeBaseUrl) : new URL(safeUrlValue);
    // Branch: handle errors from the guarded operation.
    } catch {
      const protocolMatch = safeUrlValue.match(/^([a-z0-9+.-]+):/i);
      // Branch: follow this path only when the current condition passes.
      if (protocolMatch && protocolMatch[1]) {
        componentValues.protocol = String(protocolMatch[1]).toLowerCase();
      }
      return componentValues;
    }

    const protocolValue = String(parsedUrl.protocol || "").replace(/:$/, "").trim();
    componentValues.protocol = protocolValue || componentValues.protocol;
    componentValues.domain = parsedUrl.host || parsedUrl.hostname || componentValues.domain;

    const pathValue = String(parsedUrl.pathname || "");
    const hasTrailingSlash = pathValue.length > 1 && /\/$/.test(pathValue);
    const pathSegments = pathValue
      .split("/")
      .filter(Boolean)
      .map(function mapPathSegment(segment) {
        return decodeMirrorHoverSegment(segment);
      });

    // Branch: follow this path only when the current condition passes.
    if (pathSegments.length) {
      // Branch: follow this path only when the current condition passes.
      if (hasTrailingSlash) {
        componentValues.subfolder = "/" + pathSegments.join("/");
      } else if (pathSegments.length > 1) {
        componentValues.subfolder = "/" + pathSegments.slice(0, pathSegments.length - 1).join("/");
        componentValues.slug = pathSegments[pathSegments.length - 1] || emptyValue;
      } else {
        componentValues.slug = pathSegments[0] || emptyValue;
      }
    }

    const parametersValue = String(parsedUrl.search || "").replace(/^\?/, "");
    const anchorValue = String(parsedUrl.hash || "").replace(/^#/, "");

    componentValues.parameters = decodeMirrorHoverSegment(parametersValue) || emptyValue;
    componentValues.anchor = decodeMirrorHoverSegment(anchorValue) || emptyValue;

    return componentValues;
  }

  // Function: format mirror hover href details.
  function formatMirrorHoverHrefDetails(anchorElement, mirrorDocument) {
    const rawHrefValue = String(anchorElement.getAttribute("href") || "").trim();
    let resolvedHrefValue = String(anchorElement.href || "").trim();
    const baseUrl = String(mirrorDocument.baseURI || window.location.href || "").trim();

    // Branch: follow this path only when the current condition passes.
    if (!resolvedHrefValue && rawHrefValue) {
      // Branch: try the primary operation before handling failures.
      try {
        resolvedHrefValue = new URL(rawHrefValue, baseUrl).toString();
      // Branch: handle errors from the guarded operation.
      } catch {
        resolvedHrefValue = rawHrefValue;
      }
    }

    const formattedUrlValue = resolvedHrefValue || rawHrefValue || "";
    const urlComponents = parseMirrorHoverUrlComponents(formattedUrlValue, baseUrl);
    const detailLines = [
      "Detection Type: " + getMirrorHoverDetectionType(anchorElement, formattedUrlValue),
      "Protocol: " + urlComponents.protocol,
      "Domain: " + urlComponents.domain,
      "Subfolder: " + urlComponents.subfolder,
      "Slug: " + urlComponents.slug,
      "Parameters: " + urlComponents.parameters,
      "Anchor: " + urlComponents.anchor
    ];

    return detailLines.join("\n");
  }

  // Function: bind mirror hover inspector.
  function bindMirrorHoverInspector() {
    // Branch: follow this path only when the current condition passes.
    if (mirrorHoverListenerCleanup) {
      mirrorHoverListenerCleanup();
      mirrorHoverListenerCleanup = null;
    }

    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.convertedPane || workflowRailElements.convertedPane.tagName !== "IFRAME") {
      setMirrorLinkHoverInfoText(defaultMirrorLinkHoverMessage);
      return;
    }

    let mirrorDocument = null;
    // Branch: try the primary operation before handling failures.
    try {
      mirrorDocument = workflowRailElements.convertedPane.contentDocument || null;
    // Branch: handle errors from the guarded operation.
    } catch {
      setMirrorLinkHoverInfoText(unavailableMirrorLinkHoverMessage);
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (!mirrorDocument) {
      setMirrorLinkHoverInfoText(defaultMirrorLinkHoverMessage);
      return;
    }

    // Remove native browser link tooltips inside the mirror so details appear only in the URL pane.
    Array.from(mirrorDocument.querySelectorAll("a[title]")).forEach(function clearAnchorTitle(anchorElement) {
      anchorElement.removeAttribute("title");
    });

    // Function: handle mirror hover.
    const handleMirrorHover = function handleMirrorHover(event) {
      const hoveredAnchor = getNearestAnchorFromEventTarget(event.target);
      // Branch: follow this path only when the current condition passes.
      if (!hoveredAnchor) {
        return;
      }

      setMirrorLinkHoverInfoText(formatMirrorHoverHrefDetails(hoveredAnchor, mirrorDocument));
    };

    mirrorDocument.addEventListener("mouseover", handleMirrorHover, true);
    mirrorDocument.addEventListener("focusin", handleMirrorHover, true);

    mirrorHoverListenerCleanup = function cleanupMirrorHoverListeners() {
      mirrorDocument.removeEventListener("mouseover", handleMirrorHover, true);
      mirrorDocument.removeEventListener("focusin", handleMirrorHover, true);
    };

    setMirrorLinkHoverInfoText(defaultMirrorLinkHoverMessage);
  }

  // Function: get mirror pane markup.
  function getMirrorPaneMarkup(snapshot) {
    // Branch: follow this path only when the current condition passes.
    if (!snapshot) {
      return "";
    }

    const pipelineResult = snapshot.pipeline || null;
    // Branch: follow this path only when the current condition passes.
    if (pipelineResult && pipelineResult.rewrittenHtml) {
      return pipelineResult.rewrittenHtml;
    }

    // Branch: follow this path only when the current condition passes.
    if (snapshot.sourceHtml) {
      return snapshot.sourceHtml;
    }

    // Branch: follow this path only when the current condition passes.
    if (snapshot.rawText) {
      return "<pre>" + mergedLinkLabPipeline.escapeHtml(snapshot.rawText) + "</pre>";
    }

    return "";
  }

  // Function: format timing value.
  function formatTimingValue(value) {
    return Number.isFinite(value) && value >= 0 ? value.toFixed(1) + " ms" : "unavailable";
  }

  // Function: format byte size.
  function formatByteSize(bytes) {
    // Branch: follow this path only when the current condition passes.
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "unavailable";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;

    // Loop: repeat while the guard condition stays true.
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1) + " " + units[unitIndex];
  }

  // Function: get snapshot pipeline result.
  function getSnapshotPipelineResult(snapshot) {
    return snapshot && snapshot.pipeline ? snapshot.pipeline : null;
  }

  // Function: get snapshot pipeline settings.
  function getSnapshotPipelineSettings(snapshot, pipelineResult) {
    if (snapshot && snapshot.pipelineSettings) {
      return snapshot.pipelineSettings;
    }

    return pipelineResult && pipelineResult.options ? pipelineResult.options : getPipelineSettings();
  }

  // Function: get navigation performance entry.
  function getNavigationPerformanceEntry() {
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
      return null;
    }

    return performance.getEntriesByType("navigation")[0] || null;
  }

  // Function: build extension diagnostics section.
  function buildExtensionDiagnosticsSection(snapshot, pipelineSettings) {
    return {
      title: "Extension Details",
      lines: [
        "Name: " + (extensionManifest.name || "URL Forensics Workbench"),
        "Version: " + (extensionManifest.version || "0.0.0"),
        "URL Normalization + Repair: " + (pipelineSettings.enableUrlNormalizationRepair ? "enabled" : "disabled"),
        "Replace Email Body With Mirror: " + (extensionSettings.replaceEmailBodyWithMirrorContent ? "enabled" : "disabled"),
        "Auto-Apply Mirror For Configured Senders: " + (extensionSettings.autoApplyMirrorForConfiguredSenders ? "enabled" : "disabled"),
        "Configured Auto-Apply Sender Count: " + String(extensionSettings.autoApplyMirrorSenderEmailList.length),
        "Inbox Snapshot Ready: " + (snapshot ? "yes" : "no")
      ]
    };
  }

  // Function: build runtime diagnostics section.
  function buildRuntimeDiagnosticsSection(navigationEntry) {
    return {
      title: "Runtime Status",
      lines: [
        "Ready State: " + (document.readyState || "unknown"),
        "Navigation Type: " + (navigationEntry && navigationEntry.type ? navigationEntry.type : "unavailable"),
        "DOM Interactive: " + formatTimingValue(navigationEntry ? navigationEntry.domInteractive : NaN),
        "DOMContentLoaded End: " + formatTimingValue(navigationEntry ? navigationEntry.domContentLoadedEventEnd : NaN),
        "Load Event End: " + formatTimingValue(navigationEntry ? navigationEntry.loadEventEnd : NaN),
        "Time Since Navigation Start: " + formatTimingValue(typeof performance !== "undefined" ? performance.now() : NaN)
      ]
    };
  }

  // Function: build waiting pipeline diagnostics lines.
  function buildWaitingPipelineDiagnosticsLines() {
    return [
      "Waiting for a detected email body.",
      "Open an inbox message so the panel can populate the converted output and Link Lab tabs."
    ];
  }

  // Function: build active pipeline diagnostics lines.
  function buildActivePipelineDiagnosticsLines(snapshot, pipelineResult) {
    const pipelineDiagnostics = pipelineResult && pipelineResult.diagnostics && pipelineResult.diagnostics.lines
      ? pipelineResult.diagnostics.lines
      : [];
    const pipelineErrors = pipelineResult && pipelineResult.errors ? pipelineResult.errors : [];
    const summaryLines = [
      "Detected At: " + formatTimestamp(snapshot.detectedAt),
      "Detection Mode: " + (snapshot.detectionMode || "unknown"),
      "Section Label: " + (snapshot.sectionLabel || "Opened email body"),
      "Source Type: " + (snapshot.sourceHtml ? "HTML email body snapshot" : "Plain text email snapshot"),
      "Raw URL Tokens: " + String(pipelineResult && pipelineResult.items ? pipelineResult.items.length : 0),
      "Final URL Count: " + String(pipelineResult && pipelineResult.finalUrls ? pipelineResult.finalUrls.length : 0),
      "Changed URL Count: " + String(pipelineResult && pipelineResult.changedUrls ? pipelineResult.changedUrls.length : 0),
      "Rewritten Count: " + String(pipelineResult && pipelineResult.rewrittenCount ? pipelineResult.rewrittenCount : 0),
      "Digest Entry Count: " + String(pipelineResult && pipelineResult.digestEntries ? pipelineResult.digestEntries.length : 0),
      "Pipeline Errors: " + (pipelineErrors.length ? pipelineErrors.join(" | ") : "none"),
      ""
    ];

    return summaryLines.concat(
      pipelineDiagnostics.length
        ? pipelineDiagnostics
        : ["No pipeline diagnostics are available for the current snapshot."]
    );
  }

  // Function: build pipeline diagnostics section.
  function buildPipelineDiagnosticsSection(snapshot, pipelineResult) {
    return {
      title: "Pipeline Diagnostics",
      lines: snapshot
        ? buildActivePipelineDiagnosticsLines(snapshot, pipelineResult)
        : buildWaitingPipelineDiagnosticsLines()
    };
  }

  // Function: build diagnostics sections.
  function buildDiagnosticsSections(snapshot) {
    const pipelineResult = getSnapshotPipelineResult(snapshot);
    const pipelineSettings = getSnapshotPipelineSettings(snapshot, pipelineResult);
    const navigationEntry = getNavigationPerformanceEntry();

    return [
      buildExtensionDiagnosticsSection(snapshot, pipelineSettings),
      buildRuntimeDiagnosticsSection(navigationEntry),
      buildPipelineDiagnosticsSection(snapshot, pipelineResult)
    ];
  }

  // Function: render diagnostics sections.
  function renderDiagnosticsSections(sections) {
    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.diagnosticsPane) {
      return;
    }

    replaceElementMarkup(workflowRailElements.diagnosticsPane, (sections || [])
      // Loop: transform each item in the current collection.
      .map(function createDiagnosticsSectionMarkup(section) {
        return [
          '<section class="merged-link-lab-page-pane__diagnostic-card">',
          '  <div class="merged-link-lab-page-pane__diagnostic-title">' + mergedLinkLabPipeline.escapeHtml(section.title || "Diagnostics") + "</div>",
          '  <pre class="merged-link-lab-page-pane__diagnostic-block">' + mergedLinkLabPipeline.escapeHtml((section.lines || []).join("\n")) + "</pre>",
          "</section>"
        ].join("");
      })
      .join(""));
  }

  // Function: sync lab frame with snapshot.
  function syncLabFrameWithSnapshot(snapshot) {
    // Branch: follow this path only when the current condition passes.
    if (
      !workflowRailElements.labFrame ||
      !workflowRailElements.labFrameLoaded ||
      !workflowRailElements.labFrame.contentWindow
    ) {
      return;
    }

    workflowRailElements.labFrame.contentWindow.postMessage(
      snapshot
        ? {
            type: "merged-link-lab:set-snapshot",
            snapshot: snapshot
          }
        : {
            type: "merged-link-lab:clear-snapshot"
          },
      "*"
    );
  }

  // Function: force refresh current snapshot.
  function forceRefreshCurrentSnapshot() {
    syncLabFrameWithSnapshot(null);
    syncEmailSnapshot({ forcePublish: true });
  }

  // Function: render snapshot pane.
  function renderSnapshotPane(snapshot) {
    const paneRoot = ensurePane();
    // Branch: follow this path only when the current condition passes.
    if (!paneRoot || !snapshot || !snapshot.pipeline) {
      return;
    }

    const pipelineResult = snapshot.pipeline;
    const finalUrls = pipelineResult.finalUrls || [];

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railStatus) {
      workflowRailElements.railStatus.textContent = "Email ready";
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railCount) {
      workflowRailElements.railCount.textContent = formatMetricCount(finalUrls.length, "URL", "URLs");
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railBadge) {
      workflowRailElements.railBadge.textContent = formatRailBadgeCount(finalUrls.length);
    }

    renderConvertedPane(getMirrorPaneMarkup(snapshot), {
      disableSameDocumentLinks: snapshot.isTopicDigest === true,
      baseUrl: window.location.href || ""
    });
    renderDiagnosticsSections(buildDiagnosticsSections(snapshot));
    syncLabFrameWithSnapshot(snapshot);
  }

  // Function: clear pane.
  function clearPane() {
    // Branch: follow this path only when the current condition passes.
    if (!workflowRailElements.root) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railStatus) {
      workflowRailElements.railStatus.textContent = "No email";
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railCount) {
      workflowRailElements.railCount.textContent = "0 URLs";
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.railBadge) {
      workflowRailElements.railBadge.textContent = "0";
    }

    latestDetectedMirrorHoverInfoText = "";
    setMirrorLinkHoverInfoText(defaultMirrorLinkHoverMessage, {
      preserveDetectedValue: false,
      persistDetectedValue: false
    });
    renderConvertedPane("");
    renderDiagnosticsSections(buildDiagnosticsSections(null));
    syncLabFrameWithSnapshot(null);
  }

  // Function: ensure pane.
  function ensurePane() {
    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.root && workflowRailElements.root.isConnected) {
      return workflowRailElements.root;
    }

    const paneRoot = document.createElement("aside");
    paneRoot.id = "merged-link-lab-page-pane";
    paneRoot.setAttribute("aria-hidden", "true");
    replaceElementMarkup(paneRoot, [
      '<button type="button" class="merged-link-lab-page-pane__rail" data-role="railToggleButton" aria-expanded="false">',
      '  <span class="merged-link-lab-page-pane__rail-badge" data-role="railBadge">0</span>',
      '  <span class="merged-link-lab-page-pane__rail-dot" aria-hidden="true"></span>',
      '  <span class="merged-link-lab-page-pane__rail-bubble-title" aria-hidden="true">Lab</span>',
      '  <span class="merged-link-lab-page-pane__rail-title">URL Forensics Workbench</span>',
      '  <span class="merged-link-lab-page-pane__rail-status" data-role="railStatus">No email</span>',
      '  <span class="merged-link-lab-page-pane__rail-count" data-role="railCount">0 URLs</span>',
      "</button>",
      '<div class="merged-link-lab-page-pane__shell">',
      '  <div class="merged-link-lab-page-pane__panel-head">',
      '    <div class="merged-link-lab-page-pane__panel-copy">',
      '      <strong class="merged-link-lab-page-pane__panel-title"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__title-icon" data-icon="travel_explore" aria-hidden="true">travel_explore</span><span>URL Forensics Workbench</span></strong>',
      '      <span class="merged-link-lab-page-pane__panel-subtitle">Detected email body workspace</span>',
      "    </div>",
      '    <div class="merged-link-lab-page-pane__panel-actions">',
      '      <button type="button" data-role="settingsButton"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="settings" aria-hidden="true">settings</span><span>Settings</span></button>',
      '      <button type="button" data-role="refreshButton"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="refresh" aria-hidden="true">refresh</span><span>Refresh</span></button>',
      '      <button type="button" data-role="collapseButton"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="close_fullscreen" aria-hidden="true">close_fullscreen</span><span>Minimize</span></button>',
      "    </div>",
      "  </div>",
      '  <div class="merged-link-lab-page-pane__tab-bar" role="tablist" aria-label="URL Forensics Workbench tabs">',
      '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="converted" role="tab" aria-selected="true"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="mail" aria-hidden="true">mail</span><span>Email Mirror</span></button>',
      '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="lab" role="tab" aria-selected="false"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="account_tree" aria-hidden="true">account_tree</span><span>Workflow</span></button>',
      '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="diagnostics" role="tab" aria-selected="false"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="analytics" aria-hidden="true">analytics</span><span>Sidepanel Diagnostics</span></button>',
      "  </div>",
      '  <div class="merged-link-lab-page-pane__hover-link-box" data-role="hoverLinkInfo" aria-live="polite">',
      '    <p class="merged-link-lab-page-pane__hover-link-label"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="link" aria-hidden="true">link</span><span>Hovered Link</span></p>',
      '    <pre class="merged-link-lab-page-pane__hover-link-value" data-role="hoverLinkInfoValue">Hover over a link to reveal URL components</pre>',
      "  </div>",
      '  <div class="merged-link-lab-page-pane__tab-panel-stack">',
      '    <section class="merged-link-lab-page-pane__tab-panel is-active" data-tab-panel="converted" aria-hidden="false">',
      '      <div class="merged-link-lab-page-pane__preview-shell">',
      '        <iframe class="merged-link-lab-page-pane__mirror-frame" data-role="convertedPane" title="Formatted email mirror" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>',
      "      </div>",
      "    </section>",
      '    <section class="merged-link-lab-page-pane__tab-panel is-hidden" data-tab-panel="lab" aria-hidden="true">',
      '      <div class="merged-link-lab-page-pane__frame-shell">',
      '        <iframe class="merged-link-lab-page-pane__lab-frame" data-role="labFrame" title="URL Forensics Workbench workspace"></iframe>',
      "      </div>",
      "    </section>",
      '    <section class="merged-link-lab-page-pane__tab-panel is-hidden" data-tab-panel="diagnostics" aria-hidden="true">',
      '      <div class="merged-link-lab-page-pane__diagnostics-pane" data-role="diagnosticsPane"></div>',
      "    </section>",
      "  </div>",
      "</div>"
    ].join(""));

    const mountTarget = document.body || document.documentElement;
    // Branch: follow this path only when the current condition passes.
    if (!mountTarget) {
      return null;
    }

    mountTarget.appendChild(paneRoot);

    workflowRailElements.root = paneRoot;
    workflowRailElements.railToggleButton = paneRoot.querySelector('[data-role="railToggleButton"]');
    workflowRailElements.railBadge = paneRoot.querySelector('[data-role="railBadge"]');
    workflowRailElements.railStatus = paneRoot.querySelector('[data-role="railStatus"]');
    workflowRailElements.railCount = paneRoot.querySelector('[data-role="railCount"]');
    workflowRailElements.settingsButton = paneRoot.querySelector('[data-role="settingsButton"]');
    workflowRailElements.refreshButton = paneRoot.querySelector('[data-role="refreshButton"]');
    workflowRailElements.tabButtons = Array.from(paneRoot.querySelectorAll("[data-tab-button]"));
    workflowRailElements.tabPanels = Array.from(paneRoot.querySelectorAll("[data-tab-panel]"));
    workflowRailElements.hoverLinkInfo = paneRoot.querySelector('[data-role="hoverLinkInfo"]');
    workflowRailElements.hoverLinkInfoValue = paneRoot.querySelector('[data-role="hoverLinkInfoValue"]');
    workflowRailElements.convertedPane = paneRoot.querySelector('[data-role="convertedPane"]');
    workflowRailElements.labFrame = paneRoot.querySelector('[data-role="labFrame"]');
    workflowRailElements.diagnosticsPane = paneRoot.querySelector('[data-role="diagnosticsPane"]');
    workflowRailElements.collapseButton = paneRoot.querySelector('[data-role="collapseButton"]');

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.convertedPane && workflowRailElements.convertedPane.tagName === "IFRAME") {
      // Function: bind mirror hover inspector on mirror load.
      workflowRailElements.convertedPane.addEventListener("load", function handleMirrorFrameLoad() {
        bindMirrorHoverInspector();
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.labFrame) {
      workflowRailElements.labFrame.src = extensionApi.runtime.getURL("core-components/extension-workbench.html");
      // Function: handle lab frame load.
      workflowRailElements.labFrame.addEventListener("load", function handleLabFrameLoad() {
        workflowRailElements.labFrameLoaded = true;
        syncLabFrameWithSnapshot(latestSnapshot);
      });
    }

    // Function: toggle workflow rail.
    workflowRailElements.railToggleButton.addEventListener("click", function toggleWorkflowRail() {
      // Branch: follow this path only when the current condition passes.
      if (!latestSnapshot) {
        return;
      }

      setPaneExpanded(!workflowRailElements.isExpanded);
    });

    // Function: collapse workflow rail.
    workflowRailElements.collapseButton.addEventListener("click", function collapseWorkflowRail() {
      setPaneExpanded(false);
    });

    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.settingsButton) {
      // Function: open workflow settings.
      workflowRailElements.settingsButton.addEventListener("click", function openWorkflowSettings() {
        openSettingsPage();
      });
    }

    // Function: refresh workflow rail.
    workflowRailElements.refreshButton.addEventListener("click", function refreshWorkflowRail() {
      forceRefreshCurrentSnapshot();
    });

    // Loop: iterate through each item in the current collection.
    workflowRailElements.tabButtons.forEach(function bindTabButton(tabButton) {
      // Function: handle tab click.
      tabButton.addEventListener("click", function handleTabClick() {
        setActiveTab(tabButton.getAttribute("data-tab-button"));
      });
    });

    setActiveTab(workflowRailElements.activeTabKey);
    clearPane();
    return paneRoot;
  }

  // Function: toggle pane visibility.
  function togglePaneVisibility() {
    // Branch: follow this path only when the current condition passes.
    if (!latestSnapshot) {
      hidePane();
      return {
        ok: false,
        hasSnapshot: false,
        visible: false,
        expanded: false
      };
    }

    setPaneExpanded(!workflowRailElements.isExpanded);
    return {
      ok: true,
      hasSnapshot: true,
      visible: true,
      expanded: workflowRailElements.isExpanded
    };
  }

  // Function: publish snapshot.
  async function publishSnapshot(snapshot) {
    latestSnapshot = snapshot;
    lastPublishedSnapshotSignature = createSnapshotSignature(snapshot);

    const nextPaneKey = createSnapshotPaneKey(snapshot);
    // Branch: follow this path only when the current condition passes.
    if (workflowRailElements.currentPaneKey !== nextPaneKey) {
      workflowRailElements.isExpanded = false;
    }

    workflowRailElements.currentPaneKey = nextPaneKey;
    renderSnapshotPane(snapshot);
    showPane();

    // Branch: try the primary operation before handling failures.
    try {
      await extensionApi.runtime.sendMessage({
        type: "merged-link-lab:email-snapshot",
        snapshot: snapshot
      });
    // Branch: handle errors from the guarded operation.
    } catch {
      // Continue so in-page replacement can still run even if messaging fails.
    }

    await maybeReplaceEmailBodyWithMirrorContent(snapshot);
  }

  // Function: publish clear.
  async function publishClear() {
    latestSnapshot = null;
    resetLatestEmailDetectionState();
    lastPublishedSnapshotSignature = "";
    workflowRailElements.currentPaneKey = "";
    workflowRailElements.isExpanded = false;
    clearPane();
    hidePane();

    // Branch: try the primary operation before handling failures.
    try {
      await extensionApi.runtime.sendMessage({
        type: "merged-link-lab:email-cleared"
      });
    // Branch: handle errors from the guarded operation.
    } catch {
      return;
    }
  }

  // Function: observe email root.
  function observeEmailRoot(root) {
    // Branch: follow this path only when the current condition passes.
    if (!root || observedEmailRoots.has(root)) {
      return;
    }

    observedEmailRoots.add(root);

    // Function: schedule after root mutation.
    const rootObserver = new MutationObserver(function scheduleAfterRootMutation() {
      window.clearTimeout(scheduledSnapshotTimer);
      scheduledSnapshotTimer = window.setTimeout(syncEmailSnapshot, 150);
    });

    rootObserver.observe(root, {
      childList: true,
      characterData: true,
      subtree: true
    });

    if (String(root.tagName || "").toUpperCase() === "IFRAME") {
      const attachIframeContentObserver = function attachIframeContentObserver() {
        const iframeContentRoot = getIframeEmailRootContentElement(root);

        if (!iframeContentRoot) {
          return;
        }

        const iframeObserver = new MutationObserver(function scheduleAfterIframeMutation() {
          window.clearTimeout(scheduledSnapshotTimer);
          scheduledSnapshotTimer = window.setTimeout(syncEmailSnapshot, 150);
        });

        iframeObserver.observe(iframeContentRoot, {
          childList: true,
          characterData: true,
          subtree: true
        });
      };

      root.addEventListener("load", function scheduleAfterIframeLoad() {
        attachIframeContentObserver();
        scheduleSnapshotSync();
      }, true);

      attachIframeContentObserver();
    }
  }

  // Function: handle snapshot location change.
  function handleSnapshotLocationChange(currentLocationHref) {
    const hasLocationChanged = currentLocationHref !== lastObservedLocationHref;

    if (!hasLocationChanged) {
      return false;
    }

    lastObservedLocationHref = currentLocationHref;
    resetLatestEmailDetectionState();

    if (debugApi) {
      debugApi.conditional("content observed location changed", {
        forcePublish: true
      });
    }

    return true;
  }

  // Function: observe inbox root candidates.
  function observeInboxRootCandidates(inboxRootCandidates) {
    if (debugApi) {
      debugApi.variable("content inbox candidate count assigned", {
        candidateCount: inboxRootCandidates.length
      });
    }

    inboxRootCandidates.forEach(function observeCandidate(candidate) {
      if (debugApi && candidate) {
        debugApi.loop("content observing inbox candidate", {
          detectionMode: candidate.detectionMode || "",
          score: candidate.score || 0
        });
      }
      observeEmailRoot(candidate.root);
    });
  }

  // Function: should wait for missing-candidate grace window.
  function shouldWaitForMissingCandidateGrace(syncStartedAt, missingGraceWindow) {
    if (!inboxCandidateMissingSince) {
      inboxCandidateMissingSince = syncStartedAt;
    }

    const missingDuration = syncStartedAt - inboxCandidateMissingSince;
    const hasRecentCandidate =
      latestInboxCandidateSeenAt > 0 && (syncStartedAt - latestInboxCandidateSeenAt) <= missingGraceWindow;
    const hasRecentSnapshot =
      latestSnapshot && latestSnapshot.detectedAt && (syncStartedAt - Number(latestSnapshot.detectedAt || 0)) <= missingGraceWindow;

    return missingGraceWindow > 0 && (missingDuration <= missingGraceWindow || hasRecentCandidate || hasRecentSnapshot);
  }

  // Function: can use fallback email root.
  function canUseFallbackEmailRoot(fallbackRoot) {
    if (!fallbackRoot || !fallbackRoot.isConnected || fallbackRoot.closest("#merged-link-lab-page-pane")) {
      return false;
    }

    const fallbackText = mergedLinkLabPipeline.cleanInputText(fallbackRoot.innerText || fallbackRoot.textContent || "");
    const fallbackHasStructuredContent =
      typeof fallbackRoot.querySelector === "function" &&
      !!fallbackRoot.querySelector("a[href], p, div, span, table, li, br");

    return fallbackText.length >= 8 || fallbackHasStructuredContent;
  }

  // Function: try publishing fallback snapshot.
  function tryPublishFallbackSnapshot(shouldForcePublish) {
    const fallbackRoot = latestDetectedEmailRoot;

    if (!canUseFallbackEmailRoot(fallbackRoot)) {
      return false;
    }

    const fallbackSnapshot = summarizeEmailRoot(fallbackRoot, latestDetectedEmailMode);
    const fallbackSnapshotSignature = createSnapshotSignature(fallbackSnapshot);

    if (fallbackSnapshotSignature !== lastPublishedSnapshotSignature || shouldForcePublish) {
      publishSnapshot(fallbackSnapshot);
    }

    scheduleSnapshotSync();
    return true;
  }

  // Function: handle missing primary inbox candidate.
  function handleMissingPrimaryInboxCandidate(syncState) {
    if (debugApi) {
      debugApi.conditional("content no primary inbox candidate found", {
        hadLatestSnapshot: !!latestSnapshot
      });
    }

    if (latestSnapshot) {
      if (syncState.hasLocationChanged) {
        publishClear();
        return;
      }

      const missingGraceWindow = getCandidateMissingGraceWindow();

      if (shouldWaitForMissingCandidateGrace(syncState.startedAt, missingGraceWindow)) {
        scheduleSnapshotSync();
        return;
      }

      if (tryPublishFallbackSnapshot(syncState.shouldForcePublish)) {
        return;
      }

      publishClear();
    }

    if (debugApi) {
      debugApi.functionOut("content.syncEmailSnapshot", { synced: false, reason: "no-primary-candidate" });
    }
  }

  // Function: prepare primary candidate snapshot.
  function preparePrimaryCandidateSnapshot(primaryInboxCandidate, syncState) {
    inboxCandidateMissingSince = 0;
    latestInboxCandidateSeenAt = syncState.startedAt;
    latestDetectedEmailRoot = primaryInboxCandidate.root;
    latestDetectedEmailMode = primaryInboxCandidate.detectionMode || "";

    return summarizeEmailRoot(primaryInboxCandidate.root, latestDetectedEmailMode);
  }

  // Function: publish primary candidate snapshot.
  function publishPrimaryCandidateSnapshot(primaryInboxCandidate, syncState) {
    const nextSnapshot = preparePrimaryCandidateSnapshot(primaryInboxCandidate, syncState);
    const nextSnapshotSignature = createSnapshotSignature(nextSnapshot);

    if (nextSnapshotSignature === lastPublishedSnapshotSignature && !syncState.shouldForcePublish) {
      if (debugApi) {
        debugApi.conditional("content snapshot unchanged; publish skipped");
        debugApi.functionOut("content.syncEmailSnapshot", { synced: false, reason: "unchanged" });
      }
      return;
    }

    publishSnapshot(nextSnapshot);
    if (debugApi) {
      debugApi.runtime("content snapshot published", {
        detectionMode: nextSnapshot.detectionMode || "",
        finalUrlCount: nextSnapshot.pipeline && nextSnapshot.pipeline.finalUrls ? nextSnapshot.pipeline.finalUrls.length : 0
      });
      debugApi.functionOut("content.syncEmailSnapshot", { synced: true });
    }
  }

  // Function: sync email snapshot.
  function syncEmailSnapshot(options) {
    if (debugApi) {
      debugApi.functionIn("content.syncEmailSnapshot", {
        forcePublish: !!(options && options.forcePublish)
      });
    }

    const optionBag = options || {};
    const syncState = {
      shouldForcePublish: !!optionBag.forcePublish,
      startedAt: Date.now(),
      hasLocationChanged: false
    };

    // Branch: follow this path only when the current condition passes.
    if (!isPageCurrentlyVisible()) {
      if (debugApi) {
        debugApi.conditional("content snapshot sync skipped: page not visible");
        debugApi.functionOut("content.syncEmailSnapshot", { synced: false });
      }
      return;
    }

    const currentLocationHref = getCurrentLocationHref();
    syncState.hasLocationChanged = handleSnapshotLocationChange(currentLocationHref);
    if (syncState.hasLocationChanged) {
      syncState.shouldForcePublish = true;
    }

    const inboxRootCandidates = getInboxRootCandidates();
    observeInboxRootCandidates(inboxRootCandidates);

    const primaryInboxCandidate = choosePrimaryEmailCandidate(inboxRootCandidates);
    // Branch: follow this path only when the current condition passes.
    if (!primaryInboxCandidate || !primaryInboxCandidate.root) {
      handleMissingPrimaryInboxCandidate(syncState);
      return;
    }

    publishPrimaryCandidateSnapshot(primaryInboxCandidate, syncState);
  }

  // Function: schedule snapshot sync.
  function scheduleSnapshotSync() {
    window.clearTimeout(scheduledSnapshotTimer);
    scheduledSnapshotTimer = window.setTimeout(syncEmailSnapshot, 150);
  }

  // Function: install history navigation sync.
  function installHistoryNavigationSync() {
    // Branch: follow this path only when the current condition passes.
    if (!window.history) {
      return;
    }

    ["pushState", "replaceState"].forEach(function wrapHistoryMethod(methodName) {
      const originalMethod = window.history[methodName];
      // Branch: follow this path only when the current condition passes.
      if (typeof originalMethod !== "function") {
        return;
      }

      window.history[methodName] = function wrappedHistoryMethod() {
        const result = originalMethod.apply(this, arguments);
        scheduleSnapshotSync();
        return result;
      };
    });
  }

  // Function: handle pipeline storage change.
  function handlePipelineStorageChange(changes, areaName) {
    if (debugApi) {
      debugApi.functionIn("content.handlePipelineStorageChange", {
        areaName: areaName || "",
        changedKeyCount: changes ? Object.keys(changes).length : 0
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (areaName !== "local" || !changes) {
      if (debugApi) {
        debugApi.conditional("content storage change ignored", { areaName: areaName || "" });
        debugApi.functionOut("content.handlePipelineStorageChange", { updated: false });
      }
      return;
    }

    let didUpdateSettings = false;

    if (changes[pipelineSettingStorageKey]) {
      applyStoredPipelineSetting(changes[pipelineSettingStorageKey].newValue);
      didUpdateSettings = true;
    }

    if (changes[replaceEmailBodyWithMirrorContentStorageKey]) {
      applyStoredReplaceEmailBodySetting(changes[replaceEmailBodyWithMirrorContentStorageKey].newValue);
      didUpdateSettings = true;
    }

    if (changes[autoApplyMirrorForConfiguredSendersStorageKey]) {
      applyStoredAutoApplyMirrorForConfiguredSendersSetting(changes[autoApplyMirrorForConfiguredSendersStorageKey].newValue);
      didUpdateSettings = true;
    } else if (changes[legacyAutoApplyMirrorForNamedSenderStorageKey]) {
      applyStoredAutoApplyMirrorForConfiguredSendersSetting(changes[legacyAutoApplyMirrorForNamedSenderStorageKey].newValue);
      didUpdateSettings = true;
    }

    if (changes[autoApplyMirrorSenderEmailListStorageKey]) {
      applyStoredAutoApplyMirrorSenderEmailList(changes[autoApplyMirrorSenderEmailListStorageKey].newValue, { useDefaultList: true });
      didUpdateSettings = true;
    }

    if (didUpdateSettings) {
      setExtensionStorageSnapshot(
        "storage.onChanged",
        {
          [pipelineSettingStorageKey]: extensionSettings.enableUrlNormalizationRepair,
          [replaceEmailBodyWithMirrorContentStorageKey]: extensionSettings.replaceEmailBodyWithMirrorContent,
          [autoApplyMirrorForConfiguredSendersStorageKey]: extensionSettings.autoApplyMirrorForConfiguredSenders,
          [autoApplyMirrorSenderEmailListStorageKey]: extensionSettings.autoApplyMirrorSenderEmailList.slice()
        },
        ""
      );
      syncEmailSnapshot({ forcePublish: true });
      if (debugApi) {
        debugApi.storage("content settings changed; snapshot sync forced", {
          changedKeyCount: Object.keys(changes).length
        });
        debugApi.functionOut("content.handlePipelineStorageChange", { updated: true });
      }
    } else if (debugApi) {
      debugApi.functionOut("content.handlePipelineStorageChange", { updated: false });
    }
  }

  // Branch: follow this path only when the current condition passes.
  if (extensionApi.storage && extensionApi.storage.onChanged) {
    extensionApi.storage.onChanged.addListener(handlePipelineStorageChange);
  }

  // Function: handle runtime message.
  extensionApi.runtime.onMessage.addListener(function handleRuntimeMessage(message) {
    if (debugApi) {
      debugApi.messaging("content runtime message received", {
        type: message && message.type ? message.type : "unknown"
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (!message) {
      return undefined;
    }

    // Branch: follow this path only when the current condition passes.
    if (message.type === "merged-link-lab:get-email-snapshot") {
      // Branch: follow this path only when the current condition passes.
      if (!latestSnapshot) {
        syncEmailSnapshot();
      }

      return Promise.resolve({
        snapshot: latestSnapshot
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (message.type === "merged-link-lab:toggle-page-pane") {
      // Branch: follow this path only when the current condition passes.
      if (!latestSnapshot) {
        syncEmailSnapshot();
      }

      return Promise.resolve(togglePaneVisibility());
    }

    // Branch: follow this path only when the current condition passes.
    if (message.type === "merged-link-lab:apply-rewritten-email") {
      return Promise.resolve(applyRewriteToEmailBody());
    }

    return undefined;
  });

  document.addEventListener("visibilitychange", scheduleSnapshotSync, true);
  window.addEventListener("focus", scheduleSnapshotSync, true);
  window.addEventListener("load", scheduleSnapshotSync, true);
  window.addEventListener("pageshow", scheduleSnapshotSync, true);
  window.addEventListener("popstate", scheduleSnapshotSync, true);
  window.addEventListener("hashchange", scheduleSnapshotSync, true);
  window.addEventListener("resize", syncPageViewportReservation, true);

  const documentObserver = new MutationObserver(scheduleSnapshotSync);
  documentObserver.observe(document.documentElement || document, {
    childList: true,
    subtree: true
  });

  installHistoryNavigationSync();
  loadPipelineSettings().finally(scheduleSnapshotSync);
})();
