"use strict";

function urlForensicsContentInboxWorkflowsGetWindowObject() {
  return typeof window !== "undefined" ? window : null;
}

function urlForensicsContentInboxWorkflowsGetDocumentObject() {
  return typeof document !== "undefined" ? document : null;
}

function urlForensicsContentInboxWorkflowsGetMutationObserverClass() {
  return typeof MutationObserver === "function" ? MutationObserver : null;
}

function urlForensicsContentInboxWorkflowsGetCssObject() {
  return typeof CSS !== "undefined" ? CSS : null;
}

function urlForensicsCreateWorkflowEmailSnapshotSync(
  emailSnapshotSync,
  debugApi,
  mergedLinkLabPipeline,
  workflowPaneSnapshot,
  workflowPaneLayout,
  getLatestSnapshot,
  getLastPublishedSnapshotSignature,
  getLatestDetectedEmailRoot,
  setLatestDetectedEmailRoot,
  getLatestDetectedEmailMode,
  setLatestDetectedEmailMode,
  getLatestInboxCandidateSeenAt,
  setLatestInboxCandidateSeenAt,
  getInboxCandidateMissingSince,
  setInboxCandidateMissingSince,
  getLastObservedLocationHref,
  setLastObservedLocationHref,
  resetLatestEmailDetectionState,
  isPageCurrentlyVisible,
  getCurrentLocationHref,
  getInboxRootCandidates,
  getInboxDetectionFailure,
  observeEmailRoot,
  choosePrimaryEmailCandidate,
  getCandidateMissingGraceWindow,
  summarizeEmailRoot,
  createSnapshotSignature
) {
  return emailSnapshotSync && typeof emailSnapshotSync.create === "function"
    ? emailSnapshotSync.create({
      windowObject: urlForensicsContentInboxWorkflowsGetWindowObject(),
      debugApi: debugApi,
      isPageCurrentlyVisible: isPageCurrentlyVisible,
      getCurrentLocationHref: getCurrentLocationHref,
      getInboxRootCandidates: getInboxRootCandidates,
      getInboxDetectionFailure: getInboxDetectionFailure,
      observeEmailRoot: observeEmailRoot,
      choosePrimaryEmailCandidate: choosePrimaryEmailCandidate,
      getCandidateMissingGraceWindow: getCandidateMissingGraceWindow,
      cleanInputText: mergedLinkLabPipeline && typeof mergedLinkLabPipeline.cleanInputText === "function"
        ? mergedLinkLabPipeline.cleanInputText
        : function cleanMissingInputText(value) {
          return String(value || "").trim();
        },
      summarizeEmailRoot: summarizeEmailRoot,
      createSnapshotSignature: createSnapshotSignature,
      publishSnapshot: workflowPaneSnapshot && typeof workflowPaneSnapshot.publishSnapshot === "function"
        ? workflowPaneSnapshot.publishSnapshot
        : async function publishMissingSnapshot() {},
      publishClear: workflowPaneSnapshot && typeof workflowPaneSnapshot.publishClear === "function"
        ? workflowPaneSnapshot.publishClear
        : async function publishMissingClear() {},
      renderEmptyPaneState: function renderEmptyPaneState() {
        if (workflowPaneSnapshot && typeof workflowPaneSnapshot.clearPane === "function") {
          workflowPaneSnapshot.clearPane();
        }

        if (workflowPaneLayout && typeof workflowPaneLayout.hidePane === "function") {
          workflowPaneLayout.hidePane();
        }
      },
      getLatestSnapshot: getLatestSnapshot,
      getLastPublishedSnapshotSignature: getLastPublishedSnapshotSignature,
      getLatestDetectedEmailRoot: getLatestDetectedEmailRoot,
      setLatestDetectedEmailRoot: setLatestDetectedEmailRoot,
      getLatestDetectedEmailMode: getLatestDetectedEmailMode,
      setLatestDetectedEmailMode: setLatestDetectedEmailMode,
      getLatestInboxCandidateSeenAt: getLatestInboxCandidateSeenAt,
      setLatestInboxCandidateSeenAt: setLatestInboxCandidateSeenAt,
      getInboxCandidateMissingSince: getInboxCandidateMissingSince,
      setInboxCandidateMissingSince: setInboxCandidateMissingSince,
      getLastObservedLocationHref: getLastObservedLocationHref,
      setLastObservedLocationHref: setLastObservedLocationHref,
      resetLatestEmailDetectionState: resetLatestEmailDetectionState
    })
    : Object.freeze({
      scheduleSnapshotSync: function scheduleMissingSnapshotSync() {
        return 0;
      },
      syncEmailSnapshot: function syncMissingEmailSnapshot() {
        return false;
      }
    });
}

function urlForensicsBuildWorkflowEmailRootSummaryOptions(
  mergedLinkLabPipeline,
  inboxDetectors,
  debugApi,
  getPipelineSettings
) {
  const detectorPatterns = inboxDetectors && typeof inboxDetectors === "object" && inboxDetectors.patterns
    ? inboxDetectors.patterns
    : {};

  return {
    windowObject: urlForensicsContentInboxWorkflowsGetWindowObject(),
    documentObject: urlForensicsContentInboxWorkflowsGetDocumentObject(),
    cleanInputText:
      mergedLinkLabPipeline && typeof mergedLinkLabPipeline.cleanInputText === "function"
        ? mergedLinkLabPipeline.cleanInputText
        : function cleanMissingInputText(value) {
          return String(value || "").trim();
        },
    analyzeInput:
      mergedLinkLabPipeline && typeof mergedLinkLabPipeline.analyzeInput === "function"
        ? mergedLinkLabPipeline.analyzeInput
        : function analyzeMissingInput() {
          return {
            finalUrls: [],
            digestEntries: [],
            errors: []
          };
        },
    getPipelineSettings: typeof getPipelineSettings === "function"
      ? getPipelineSettings
      : function getMissingPipelineSettings() {
        return {};
      },
    debugApi: debugApi,
    inboxHostPattern: detectorPatterns.inboxHost instanceof RegExp ? detectorPatterns.inboxHost : /^$/,
    topicDigestLabelPattern: detectorPatterns.topicDigestLabel instanceof RegExp ? detectorPatterns.topicDigestLabel : /^$/,
    topicDigestActionPattern: detectorPatterns.topicDigestAction instanceof RegExp ? detectorPatterns.topicDigestAction : /^$/
  };
}

function urlForensicsCreateWorkflowEmailRootSummary(
  emailRootSummary,
  mergedLinkLabPipeline,
  inboxDetectors,
  debugApi,
  getPipelineSettings
) {
  if (emailRootSummary && typeof emailRootSummary.create === "function") {
    return emailRootSummary.create(
      urlForensicsBuildWorkflowEmailRootSummaryOptions(
        mergedLinkLabPipeline,
        inboxDetectors,
        debugApi,
        getPipelineSettings
      )
    );
  }

  return Object.freeze({
    getIframeEmailRootContentElement: function getMissingIframeEmailRootContentElement() {
      return null;
    },
    getEmailRootContentElement: function getMissingEmailRootContentElement(element) {
      return element || null;
    },
    getEmailRootHtmlMarkup: function getMissingEmailRootHtmlMarkup() {
      return "";
    },
    measureElementText: function measureMissingElementText() {
      return {
        text: "",
        lines: 0,
        words: 0
      };
    },
    summarizeEmailRoot: function summarizeMissingEmailRoot(root, detectionMode) {
      return {
        detectedAt: Date.now(),
        detectionMode: detectionMode || "",
        sectionLabel: "",
        sourceHtml: "",
        rawText: "",
        pipelineSettings: {},
        pipeline: {
          finalUrls: [],
          digestEntries: [],
          errors: []
        },
        isTopicDigest: false
      };
    }
  });
}

function urlForensicsBuildWorkflowEmailRootRuntimeOptions(
  emailRootSummary,
  workflowPaneSnapshot,
  getLatestSnapshot,
  getLatestDetectedEmailRoot,
  setLatestDetectedEmailRoot,
  getLatestDetectedEmailMode,
  setLatestDetectedEmailMode,
  choosePrimaryEmailCandidate,
  getInboxRootCandidates,
  syncEmailSnapshot,
  scheduleSnapshotSync,
  summarizeEmailRoot,
  shouldReplaceEmailBodyWithMirrorContent,
  replaceElementMarkup
) {
  return {
    mutationObserverClass: urlForensicsContentInboxWorkflowsGetMutationObserverClass(),
    replaceElementMarkup: replaceElementMarkup,
    syncEmailSnapshot: syncEmailSnapshot,
    summarizeEmailRoot: summarizeEmailRoot,
    publishSnapshot: workflowPaneSnapshot && typeof workflowPaneSnapshot.publishSnapshot === "function"
      ? workflowPaneSnapshot.publishSnapshot
      : async function publishMissingSnapshot() {},
    scheduleSnapshotSync: scheduleSnapshotSync,
    shouldReplaceEmailBodyWithMirrorContent: shouldReplaceEmailBodyWithMirrorContent,
    getLatestSnapshot: getLatestSnapshot,
    getLatestDetectedEmailRoot: getLatestDetectedEmailRoot,
    setLatestDetectedEmailRoot: setLatestDetectedEmailRoot,
    getLatestDetectedEmailMode: getLatestDetectedEmailMode,
    setLatestDetectedEmailMode: setLatestDetectedEmailMode,
    choosePrimaryEmailCandidate: choosePrimaryEmailCandidate,
    getInboxRootCandidates: getInboxRootCandidates,
    getEmailRootHtmlMarkup: emailRootSummary && typeof emailRootSummary.getEmailRootHtmlMarkup === "function"
      ? emailRootSummary.getEmailRootHtmlMarkup
      : function getMissingEmailRootHtmlMarkup() {
        return "";
      },
    getEmailRootContentElement: emailRootSummary && typeof emailRootSummary.getEmailRootContentElement === "function"
      ? emailRootSummary.getEmailRootContentElement
      : function getMissingEmailRootContentElement(element) {
        return element || null;
      },
    getIframeEmailRootContentElement:
      emailRootSummary && typeof emailRootSummary.getIframeEmailRootContentElement === "function"
        ? emailRootSummary.getIframeEmailRootContentElement
        : function getMissingIframeEmailRootContentElement() {
          return null;
        }
  };
}

function urlForensicsCreateWorkflowEmailRootRuntime(
  emailRootRuntime,
  workflowEmailRootSummary,
  workflowPaneSnapshot,
  getLatestSnapshot,
  getLatestDetectedEmailRoot,
  setLatestDetectedEmailRoot,
  getLatestDetectedEmailMode,
  setLatestDetectedEmailMode,
  choosePrimaryEmailCandidate,
  getInboxRootCandidates,
  syncEmailSnapshot,
  scheduleSnapshotSync,
  summarizeEmailRoot,
  shouldReplaceEmailBodyWithMirrorContent,
  replaceElementMarkup
) {
  if (emailRootRuntime && typeof emailRootRuntime.create === "function") {
    return emailRootRuntime.create(
      urlForensicsBuildWorkflowEmailRootRuntimeOptions(
        workflowEmailRootSummary,
        workflowPaneSnapshot,
        getLatestSnapshot,
        getLatestDetectedEmailRoot,
        setLatestDetectedEmailRoot,
        getLatestDetectedEmailMode,
        setLatestDetectedEmailMode,
        choosePrimaryEmailCandidate,
        getInboxRootCandidates,
        syncEmailSnapshot,
        scheduleSnapshotSync,
        summarizeEmailRoot,
        shouldReplaceEmailBodyWithMirrorContent,
        replaceElementMarkup
      )
    );
  }

  return Object.freeze({
    applyRewriteToEmailBody: async function applyMissingRewriteToEmailBody() {
      return { ok: false, applied: false };
    },
    getActiveEmailRoot: function getMissingActiveEmailRoot() {
      return null;
    },
    maybeReplaceEmailBodyWithMirrorContent: async function maybeReplaceMissingEmailBodyWithMirrorContent(snapshot) {
      return { ok: false, applied: false, snapshot: snapshot || null };
    },
    observeEmailRoot: function observeMissingEmailRoot() {}
  });
}

function urlForensicsBuildWorkflowEmailAutoReplaceOptions(
  extensionSettings,
  getActiveEmailRoot,
  getAutoApplyMirrorSenderSelector,
  getAutoApplyMirrorSenderEmailPattern,
  getAutoApplyMirrorSenderHeaderPattern,
  nativeExpansionControlHintPattern
) {
  return {
    documentObject: urlForensicsContentInboxWorkflowsGetDocumentObject(),
    getActiveEmailRoot: getActiveEmailRoot,
    getAutoApplyMirrorSenderSelector: getAutoApplyMirrorSenderSelector,
    getAutoApplyMirrorSenderEmailPattern: getAutoApplyMirrorSenderEmailPattern,
    getAutoApplyMirrorSenderHeaderPattern: getAutoApplyMirrorSenderHeaderPattern,
    nativeExpansionControlHintPattern: nativeExpansionControlHintPattern,
    getReplaceEmailBodyWithMirrorContentEnabled: function getReplaceEmailBodyWithMirrorContentEnabled() {
      return extensionSettings.replaceEmailBodyWithMirrorContent === true;
    },
    getAutoApplyMirrorForConfiguredSendersEnabled: function getAutoApplyMirrorForConfiguredSendersEnabled() {
      return extensionSettings.autoApplyMirrorForConfiguredSenders === true;
    },
    getAutoApplyMirrorSenderEmailList: function getAutoApplyMirrorSenderEmailList() {
      return Array.isArray(extensionSettings.autoApplyMirrorSenderEmailList)
        ? extensionSettings.autoApplyMirrorSenderEmailList.slice()
        : [];
    }
  };
}

function urlForensicsCreateWorkflowEmailAutoReplace(
  emailAutoReplace,
  extensionSettings,
  getActiveEmailRoot,
  getAutoApplyMirrorSenderSelector,
  getAutoApplyMirrorSenderEmailPattern,
  getAutoApplyMirrorSenderHeaderPattern,
  nativeExpansionControlHintPattern
) {
  if (emailAutoReplace && typeof emailAutoReplace.create === "function") {
    return emailAutoReplace.create(
      urlForensicsBuildWorkflowEmailAutoReplaceOptions(
        extensionSettings,
        getActiveEmailRoot,
        getAutoApplyMirrorSenderSelector,
        getAutoApplyMirrorSenderEmailPattern,
        getAutoApplyMirrorSenderHeaderPattern,
        nativeExpansionControlHintPattern
      )
    );
  }

  return Object.freeze({
    hasConfiguredSenderElement: function hasMissingConfiguredSenderElement() {
      return false;
    },
    hasConfiguredSenderText: function hasMissingConfiguredSenderText() {
      return false;
    },
    hasNativeEmailExpansionControl: function hasMissingNativeEmailExpansionControl() {
      return false;
    },
    isConfiguredSenderDetected: function isMissingConfiguredSenderDetected() {
      return false;
    },
    shouldAutoReplaceEmailBodyWithMirrorContent: function shouldMissingAutoReplaceEmailBodyWithMirrorContent() {
      return false;
    },
    shouldReplaceEmailBodyWithMirrorContent: function shouldMissingReplaceEmailBodyWithMirrorContent() {
      return false;
    }
  });
}

function urlForensicsCreateWorkflowEmailAutoReplaceState(
  emailAutoReplaceState,
  extensionSettings,
  defaultAutoApplyMirrorSenderEmails,
  sanitizeSenderEmailList,
  defaultAutoApplyMirrorForConfiguredSenders
) {
  if (emailAutoReplaceState && typeof emailAutoReplaceState.create === "function") {
    return emailAutoReplaceState.create({
      cssObject: urlForensicsContentInboxWorkflowsGetCssObject(),
      extensionSettings: extensionSettings,
      defaultAutoApplyMirrorSenderEmails: defaultAutoApplyMirrorSenderEmails,
      defaultAutoApplyMirrorForConfiguredSenders: defaultAutoApplyMirrorForConfiguredSenders,
      sanitizeSenderEmailList: sanitizeSenderEmailList
    });
  }

  return Object.freeze({
    applyStoredAutoApplyMirrorForConfiguredSendersSetting: function applyMissingAutoApplyMirrorForConfiguredSendersSetting(
      nextValue
    ) {
      if (nextValue === true || nextValue === false) {
        extensionSettings.autoApplyMirrorForConfiguredSenders = nextValue === true;
      }
    },
    applyStoredAutoApplyMirrorSenderEmailList: function applyMissingAutoApplyMirrorSenderEmailList(nextValue, options) {
      const optionBag = options || {};
      if (Array.isArray(nextValue)) {
        extensionSettings.autoApplyMirrorSenderEmailList = nextValue.slice();
      } else if (optionBag.useDefaultList === true) {
        extensionSettings.autoApplyMirrorSenderEmailList = Array.isArray(defaultAutoApplyMirrorSenderEmails)
          ? defaultAutoApplyMirrorSenderEmails.slice()
          : [];
      }
    },
    getAutoApplyMirrorSenderEmailPattern: function getMissingAutoApplyMirrorSenderEmailPattern() {
      return null;
    },
    getAutoApplyMirrorSenderHeaderPattern: function getMissingAutoApplyMirrorSenderHeaderPattern() {
      return null;
    },
    getAutoApplyMirrorSenderSelector: function getMissingAutoApplyMirrorSenderSelector() {
      return "";
    },
    refreshConfiguredSenderDetectionState: function refreshMissingConfiguredSenderDetectionState() {}
  });
}

function urlForensicsBuildWorkflowContentSettingsStorageOptions(
  extensionApi,
  storageModel,
  extensionSettings,
  extensionStorageSnapshot,
  debugApi,
  getPipelineSettings,
  syncEmailSnapshot,
  workflowEmailAutoReplaceState,
  urlNormalizationRepairStorageKey,
  trackingParameterStripStorageKey,
  trackingParameterFiltersStorageKey,
  replaceEmailBodyWithMirrorContentStorageKey,
  allowHelperOpenWithoutDetectedEmailBodyStorageKey,
  autoApplyMirrorForConfiguredSendersStorageKey,
  autoApplyMirrorSenderEmailListStorageKey,
  legacyAutoApplyMirrorForNamedSenderStorageKey,
  buildStorageBooleanSnapshotEntry,
  buildTrackingParameterFilterSnapshotEntry,
  buildStorageEmailListSnapshotEntry,
  resolveStoredAutoApplyConfiguredSendersValue
) {
  return {
    extensionApi: extensionApi,
    storageModel: storageModel,
    extensionSettings: extensionSettings,
    extensionStorageSnapshot: extensionStorageSnapshot,
    debugApi: debugApi,
    getNow: function getNow() {
      return Date.now();
    },
    getPipelineSettings: getPipelineSettings,
    syncEmailSnapshot: syncEmailSnapshot,
    urlNormalizationRepairStorageKey: urlNormalizationRepairStorageKey,
    trackingParameterStripStorageKey: trackingParameterStripStorageKey,
    trackingParameterFiltersStorageKey: trackingParameterFiltersStorageKey,
    replaceEmailBodyWithMirrorContentStorageKey: replaceEmailBodyWithMirrorContentStorageKey,
    allowHelperOpenWithoutDetectedEmailBodyStorageKey: allowHelperOpenWithoutDetectedEmailBodyStorageKey,
    autoApplyMirrorForConfiguredSendersStorageKey: autoApplyMirrorForConfiguredSendersStorageKey,
    autoApplyMirrorSenderEmailListStorageKey: autoApplyMirrorSenderEmailListStorageKey,
    legacyAutoApplyMirrorForNamedSenderStorageKey: legacyAutoApplyMirrorForNamedSenderStorageKey,
    buildStorageBooleanSnapshotEntry: buildStorageBooleanSnapshotEntry,
    buildTrackingParameterFilterSnapshotEntry: buildTrackingParameterFilterSnapshotEntry,
    buildStorageEmailListSnapshotEntry: buildStorageEmailListSnapshotEntry,
    resolveStoredAutoApplyConfiguredSendersValue: resolveStoredAutoApplyConfiguredSendersValue,
    applyStoredAutoApplyMirrorForConfiguredSendersSetting:
      workflowEmailAutoReplaceState && typeof workflowEmailAutoReplaceState.applyStoredAutoApplyMirrorForConfiguredSendersSetting === "function"
        ? workflowEmailAutoReplaceState.applyStoredAutoApplyMirrorForConfiguredSendersSetting
        : function applyMissingAutoApplyMirrorForConfiguredSendersSetting() {},
    applyStoredAutoApplyMirrorSenderEmailList:
      workflowEmailAutoReplaceState && typeof workflowEmailAutoReplaceState.applyStoredAutoApplyMirrorSenderEmailList === "function"
        ? workflowEmailAutoReplaceState.applyStoredAutoApplyMirrorSenderEmailList
        : function applyMissingAutoApplyMirrorSenderEmailList() {}
  };
}

function urlForensicsCreateWorkflowContentSettingsStorage(
  contentSettingsStorage,
  extensionApi,
  storageModel,
  extensionSettings,
  extensionStorageSnapshot,
  debugApi,
  getPipelineSettings,
  syncEmailSnapshot,
  workflowEmailAutoReplaceState,
  urlNormalizationRepairStorageKey,
  trackingParameterStripStorageKey,
  trackingParameterFiltersStorageKey,
  replaceEmailBodyWithMirrorContentStorageKey,
  allowHelperOpenWithoutDetectedEmailBodyStorageKey,
  autoApplyMirrorForConfiguredSendersStorageKey,
  autoApplyMirrorSenderEmailListStorageKey,
  legacyAutoApplyMirrorForNamedSenderStorageKey,
  buildStorageBooleanSnapshotEntry,
  buildTrackingParameterFilterSnapshotEntry,
  buildStorageEmailListSnapshotEntry,
  resolveStoredAutoApplyConfiguredSendersValue
) {
  if (contentSettingsStorage && typeof contentSettingsStorage.create === "function") {
    return contentSettingsStorage.create(
      urlForensicsBuildWorkflowContentSettingsStorageOptions(
        extensionApi,
        storageModel,
        extensionSettings,
        extensionStorageSnapshot,
        debugApi,
        getPipelineSettings,
        syncEmailSnapshot,
        workflowEmailAutoReplaceState,
        urlNormalizationRepairStorageKey,
        trackingParameterStripStorageKey,
        trackingParameterFiltersStorageKey,
        replaceEmailBodyWithMirrorContentStorageKey,
        allowHelperOpenWithoutDetectedEmailBodyStorageKey,
        autoApplyMirrorForConfiguredSendersStorageKey,
        autoApplyMirrorSenderEmailListStorageKey,
        legacyAutoApplyMirrorForNamedSenderStorageKey,
        buildStorageBooleanSnapshotEntry,
        buildTrackingParameterFilterSnapshotEntry,
        buildStorageEmailListSnapshotEntry,
        resolveStoredAutoApplyConfiguredSendersValue
      )
    );
  }

  return Object.freeze({
    applyStoredPipelineSetting: function applyMissingStoredPipelineSetting() {},
    applyStoredReplaceEmailBodySetting: function applyMissingStoredReplaceEmailBodySetting() {},
    applyStoredTrackingParameterFiltersSetting: function applyMissingStoredTrackingParameterFiltersSetting() {},
    applyStoredTrackingParameterStripSetting: function applyMissingStoredTrackingParameterStripSetting() {},
    handlePipelineStorageChange: function handleMissingPipelineStorageChange() {
      return false;
    },
    loadPipelineSettings: async function loadMissingPipelineSettings() {
      return getPipelineSettings();
    },
    setExtensionStorageSnapshot: function setMissingExtensionStorageSnapshot() {}
  });
}

function urlForensicsBuildWorkflowContentRuntimeLifecycleOptions(
  extensionApi,
  debugApi,
  loadPipelineSettings,
  handlePipelineStorageChange,
  scheduleSnapshotSync,
  syncEmailSnapshot,
  openPaneVisibility,
  togglePaneVisibility,
  shouldAllowOpenWithoutSnapshot,
  applyRewriteToEmailBody,
  getLatestSnapshot,
  workflowPaneLayout
) {
  return {
    windowObject: urlForensicsContentInboxWorkflowsGetWindowObject(),
    documentObject: urlForensicsContentInboxWorkflowsGetDocumentObject(),
    extensionApi: extensionApi,
    debugApi: debugApi,
    mutationObserverClass: urlForensicsContentInboxWorkflowsGetMutationObserverClass(),
    loadPipelineSettings: loadPipelineSettings,
    handlePipelineStorageChange: handlePipelineStorageChange,
    scheduleSnapshotSync: scheduleSnapshotSync,
    syncEmailSnapshot: syncEmailSnapshot,
    openPaneVisibility: openPaneVisibility,
    togglePaneVisibility: togglePaneVisibility,
    shouldAllowOpenWithoutSnapshot: shouldAllowOpenWithoutSnapshot,
    applyRewriteToEmailBody: applyRewriteToEmailBody,
    getLatestSnapshot: getLatestSnapshot,
    syncPageViewportReservation:
      workflowPaneLayout && typeof workflowPaneLayout.syncPageViewportReservation === "function"
        ? workflowPaneLayout.syncPageViewportReservation
        : function syncMissingPageViewportReservation() {}
  };
}

function urlForensicsCreateWorkflowContentRuntimeLifecycle(
  contentRuntimeLifecycle,
  extensionApi,
  debugApi,
  loadPipelineSettings,
  handlePipelineStorageChange,
  scheduleSnapshotSync,
  syncEmailSnapshot,
  openPaneVisibility,
  togglePaneVisibility,
  shouldAllowOpenWithoutSnapshot,
  applyRewriteToEmailBody,
  getLatestSnapshot,
  workflowPaneLayout
) {
  if (contentRuntimeLifecycle && typeof contentRuntimeLifecycle.create === "function") {
    return contentRuntimeLifecycle.create(
      urlForensicsBuildWorkflowContentRuntimeLifecycleOptions(
        extensionApi,
        debugApi,
        loadPipelineSettings,
        handlePipelineStorageChange,
        scheduleSnapshotSync,
        syncEmailSnapshot,
        openPaneVisibility,
        togglePaneVisibility,
        shouldAllowOpenWithoutSnapshot,
        applyRewriteToEmailBody,
        getLatestSnapshot,
        workflowPaneLayout
      )
    );
  }

  return Object.freeze({
    handleRuntimeMessage: function handleMissingRuntimeMessage() {
      return undefined;
    },
    initialize: async function initializeMissingContentRuntimeLifecycle() {
      return {
        alreadyInitialized: false,
        hasObserver: false,
        historyWrapped: false,
        initialized: false
      };
    }
  });
}

function urlForensicsResolveWorkflowEmailCandidateDiscoveryPatterns(inboxDetectors) {
  return inboxDetectors && typeof inboxDetectors === "object" && inboxDetectors.patterns
    ? inboxDetectors.patterns
    : {};
}

function urlForensicsResolveWorkflowEmailCandidateDiscoverySelectors(inboxDetectors) {
  return inboxDetectors && typeof inboxDetectors === "object" && inboxDetectors.selectors
    ? inboxDetectors.selectors
    : {};
}

function urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(inboxDetectors, propertyName, fallbackValue) {
  return inboxDetectors && typeof inboxDetectors[propertyName] === "function"
    ? inboxDetectors[propertyName]
    : fallbackValue;
}

function urlForensicsResolveWorkflowEmailCandidateDiscoveryPattern(patterns, propertyName) {
  return patterns && patterns[propertyName] instanceof RegExp ? patterns[propertyName] : /^$/;
}

function urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(selectors, propertyName, fallbackValue) {
  return selectors && Object.prototype.hasOwnProperty.call(selectors, propertyName) ? selectors[propertyName] : fallbackValue;
}

function urlForensicsBuildWorkflowEmailCandidateDiscoveryOptions(
  mergedLinkLabPipeline,
  inboxDetectors,
  getEmailRootContentElement,
  measureElementText,
  inboxCandidateMissingGraceMs,
  outlookCandidateMissingGraceMs,
  protonCandidateMissingGraceMs
) {
  const detectorPatterns = urlForensicsResolveWorkflowEmailCandidateDiscoveryPatterns(inboxDetectors);
  const detectorSelectors = urlForensicsResolveWorkflowEmailCandidateDiscoverySelectors(inboxDetectors);

  return {
    windowObject: urlForensicsContentInboxWorkflowsGetWindowObject(),
    documentObject: urlForensicsContentInboxWorkflowsGetDocumentObject(),
    cleanInputText:
      mergedLinkLabPipeline && typeof mergedLinkLabPipeline.cleanInputText === "function"
        ? mergedLinkLabPipeline.cleanInputText
        : function cleanMissingInputText(value) {
          return String(value || "").trim();
        },
    getDetectionSearchRoots: urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(
      inboxDetectors,
      "getDetectionSearchRoots",
      function getMissingDetectionSearchRoots(root) {
        return root ? [root] : [];
      }
    ),
    getEmailRootContentElement: getEmailRootContentElement,
    measureElementText: measureElementText,
    inboxHostPattern: urlForensicsResolveWorkflowEmailCandidateDiscoveryPattern(detectorPatterns, "inboxHost"),
    readViewHintPattern: urlForensicsResolveWorkflowEmailCandidateDiscoveryPattern(detectorPatterns, "readViewHint"),
    composeContextHintPattern: urlForensicsResolveWorkflowEmailCandidateDiscoveryPattern(
      detectorPatterns,
      "composeContextHint"
    ),
    standaloneEmailHintPattern: urlForensicsResolveWorkflowEmailCandidateDiscoveryPattern(
      detectorPatterns,
      "standaloneEmailHint"
    ),
    outlookMailBodySelector: String(
      urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(detectorSelectors, "outlookMailBody", "")
    ),
    inboxBodySelectors: urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(detectorSelectors, "inboxBody", []),
    standaloneEmailBodySelectors: urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(
      detectorSelectors,
      "standaloneEmailBody",
      []
    ),
    genericInboxContainerSelectors: urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(
      detectorSelectors,
      "genericInboxContainer",
      []
    ),
    explicitInboxBodySelectors: urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(
      detectorSelectors,
      "explicitInboxBody",
      []
    ),
    getPrimaryInboxBodySelectors: urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(
      inboxDetectors,
      "getPrimaryInboxBodySelectors",
      function getMissingPrimaryInboxBodySelectors() {
        return [];
      }
    ),
    getInboxProviderKey: urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(
      inboxDetectors,
      "getInboxProviderKey",
      function getMissingInboxProviderKey() {
        return "";
      }
    ),
    listProviderDefinitions: urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(
      inboxDetectors,
      "listProviderDefinitions",
      function listMissingProviderDefinitions() {
        return [];
      }
    ),
    isOutlookHost: urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(
      inboxDetectors,
      "isOutlookHost",
      function isMissingOutlookHost() {
        return false;
      }
    ),
    isProtonHost: urlForensicsResolveWorkflowEmailCandidateDiscoveryFunction(
      inboxDetectors,
      "isProtonHost",
      function isMissingProtonHost() {
        return false;
      }
    ),
    inboxCandidateMissingGraceMs: inboxCandidateMissingGraceMs,
    outlookCandidateMissingGraceMs: outlookCandidateMissingGraceMs,
    protonCandidateMissingGraceMs: protonCandidateMissingGraceMs
  };
}

function urlForensicsCreateWorkflowEmailCandidateDiscovery(
  emailCandidateDiscovery,
  mergedLinkLabPipeline,
  inboxDetectors,
  getEmailRootContentElement,
  measureElementText,
  inboxCandidateMissingGraceMs,
  outlookCandidateMissingGraceMs,
  protonCandidateMissingGraceMs
) {
  if (emailCandidateDiscovery && typeof emailCandidateDiscovery.create === "function") {
    return emailCandidateDiscovery.create(
      urlForensicsBuildWorkflowEmailCandidateDiscoveryOptions(
        mergedLinkLabPipeline,
        inboxDetectors,
        getEmailRootContentElement,
        measureElementText,
        inboxCandidateMissingGraceMs,
        outlookCandidateMissingGraceMs,
        protonCandidateMissingGraceMs
      )
    );
  }

  return Object.freeze({
    choosePrimaryEmailCandidate: function chooseMissingPrimaryEmailCandidate(candidates) {
      return Array.isArray(candidates) && candidates.length ? candidates[0] : null;
    },
    choosePrimaryInboxRoot: function chooseMissingPrimaryInboxRoot(candidates) {
      const primaryCandidate = Array.isArray(candidates) && candidates.length ? candidates[0] : null;
      return primaryCandidate ? primaryCandidate.root : null;
    },
    getCandidateMissingGraceWindow: function getMissingCandidateMissingGraceWindow() {
      return 0;
    },
    getInboxDetectionFailure: function getMissingInboxDetectionFailure() {
      return null;
    },
    getInboxRootCandidates: function getMissingInboxRootCandidates() {
      return [];
    }
  });
}

(function attachUrlForensicsContentInboxWorkflows(globalScope) {
  const contentInboxWorkflows = Object.freeze({
    createWorkflowEmailSnapshotSync: urlForensicsCreateWorkflowEmailSnapshotSync,
    createWorkflowEmailRootSummary: urlForensicsCreateWorkflowEmailRootSummary,
    createWorkflowEmailRootRuntime: urlForensicsCreateWorkflowEmailRootRuntime,
    createWorkflowEmailAutoReplace: urlForensicsCreateWorkflowEmailAutoReplace,
    createWorkflowEmailAutoReplaceState: urlForensicsCreateWorkflowEmailAutoReplaceState,
    createWorkflowContentSettingsStorage: urlForensicsCreateWorkflowContentSettingsStorage,
    createWorkflowContentRuntimeLifecycle: urlForensicsCreateWorkflowContentRuntimeLifecycle,
    createWorkflowEmailCandidateDiscovery: urlForensicsCreateWorkflowEmailCandidateDiscovery
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentInboxWorkflows;
  }

  if (globalScope) {
    globalScope.urlForensicsContentInboxWorkflows = contentInboxWorkflows;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
