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

function urlForensicsIsWorkflowOptionBag(candidateValue, propertyName) {
  return !!(
    candidateValue &&
    typeof candidateValue === "object" &&
    Object.prototype.hasOwnProperty.call(candidateValue, propertyName)
  );
}

function urlForensicsResolveWorkflowEmailSnapshotSyncOptions(args) {
  if (urlForensicsIsWorkflowOptionBag(args[0], "emailSnapshotSync")) {
    return args[0];
  }

  return {
    emailSnapshotSync: args[0],
    debugApi: args[1],
    mergedLinkLabPipeline: args[2],
    workflowPaneSnapshot: args[3],
    workflowPaneLayout: args[4],
    getLatestSnapshot: args[5],
    getLastPublishedSnapshotSignature: args[6],
    getLatestDetectedEmailRoot: args[7],
    setLatestDetectedEmailRoot: args[8],
    getLatestDetectedEmailMode: args[9],
    setLatestDetectedEmailMode: args[10],
    getLatestInboxCandidateSeenAt: args[11],
    setLatestInboxCandidateSeenAt: args[12],
    getInboxCandidateMissingSince: args[13],
    setInboxCandidateMissingSince: args[14],
    getLastObservedLocationHref: args[15],
    setLastObservedLocationHref: args[16],
    resetLatestEmailDetectionState: args[17],
    isPageCurrentlyVisible: args[18],
    getCurrentLocationHref: args[19],
    getInboxRootCandidates: args[20],
    getInboxDetectionFailure: args[21],
    observeEmailRoot: args[22],
    choosePrimaryEmailCandidate: args[23],
    getCandidateMissingGraceWindow: args[24],
    summarizeEmailRoot: args[25],
    createSnapshotSignature: args[26]
  };
}

function urlForensicsBuildWorkflowEmailSnapshotSyncOptions(workflowOptions) {
  const optionBag = workflowOptions && typeof workflowOptions === "object" ? workflowOptions : {};
  const mergedLinkLabPipeline = optionBag.mergedLinkLabPipeline;
  const workflowPaneSnapshot = optionBag.workflowPaneSnapshot;
  const workflowPaneLayout = optionBag.workflowPaneLayout;

  return {
      windowObject: urlForensicsContentInboxWorkflowsGetWindowObject(),
      debugApi: optionBag.debugApi,
      isPageCurrentlyVisible: optionBag.isPageCurrentlyVisible,
      getCurrentLocationHref: optionBag.getCurrentLocationHref,
      getInboxRootCandidates: optionBag.getInboxRootCandidates,
      getInboxDetectionFailure: optionBag.getInboxDetectionFailure,
      observeEmailRoot: optionBag.observeEmailRoot,
      choosePrimaryEmailCandidate: optionBag.choosePrimaryEmailCandidate,
      getCandidateMissingGraceWindow: optionBag.getCandidateMissingGraceWindow,
      cleanInputText: mergedLinkLabPipeline && typeof mergedLinkLabPipeline.cleanInputText === "function"
        ? mergedLinkLabPipeline.cleanInputText
        : function cleanMissingInputText(value) {
          return String(value || "").trim();
        },
      summarizeEmailRoot: optionBag.summarizeEmailRoot,
      createSnapshotSignature: optionBag.createSnapshotSignature,
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
      getLatestSnapshot: optionBag.getLatestSnapshot,
      getLastPublishedSnapshotSignature: optionBag.getLastPublishedSnapshotSignature,
      getLatestDetectedEmailRoot: optionBag.getLatestDetectedEmailRoot,
      setLatestDetectedEmailRoot: optionBag.setLatestDetectedEmailRoot,
      getLatestDetectedEmailMode: optionBag.getLatestDetectedEmailMode,
      setLatestDetectedEmailMode: optionBag.setLatestDetectedEmailMode,
      getLatestInboxCandidateSeenAt: optionBag.getLatestInboxCandidateSeenAt,
      setLatestInboxCandidateSeenAt: optionBag.setLatestInboxCandidateSeenAt,
      getInboxCandidateMissingSince: optionBag.getInboxCandidateMissingSince,
      setInboxCandidateMissingSince: optionBag.setInboxCandidateMissingSince,
      getLastObservedLocationHref: optionBag.getLastObservedLocationHref,
      setLastObservedLocationHref: optionBag.setLastObservedLocationHref,
      resetLatestEmailDetectionState: optionBag.resetLatestEmailDetectionState
  };
}

function urlForensicsCreateWorkflowEmailSnapshotSync() {
  const workflowOptions = urlForensicsResolveWorkflowEmailSnapshotSyncOptions(arguments);
  const emailSnapshotSync = workflowOptions.emailSnapshotSync;

  return emailSnapshotSync && typeof emailSnapshotSync.create === "function"
    ? emailSnapshotSync.create(urlForensicsBuildWorkflowEmailSnapshotSyncOptions(workflowOptions))
    : Object.freeze({
      scheduleSnapshotSync: function scheduleMissingSnapshotSync() {
        return 0;
      },
      syncEmailSnapshot: function syncMissingEmailSnapshot() {
        return false;
      }
    });
}

function urlForensicsResolveWorkflowPatternMatcher(patternLike) {
  if (patternLike instanceof RegExp) {
    return patternLike;
  }

  if (patternLike && typeof patternLike.test === "function") {
    return Object.freeze({
      test: function testWorkflowPattern(value) {
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
    inboxHostPattern: urlForensicsResolveWorkflowPatternMatcher(detectorPatterns.inboxHost),
    topicDigestLabelPattern: urlForensicsResolveWorkflowPatternMatcher(detectorPatterns.topicDigestLabel),
    topicDigestActionPattern: urlForensicsResolveWorkflowPatternMatcher(detectorPatterns.topicDigestAction)
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

function urlForensicsResolveWorkflowEmailRootRuntimeOptions(args) {
  if (urlForensicsIsWorkflowOptionBag(args[0], "emailRootRuntime")) {
    return args[0];
  }

  return {
    emailRootRuntime: args[0],
    workflowEmailRootSummary: args[1],
    workflowPaneSnapshot: args[2],
    debugApi: args[3],
    getLatestSnapshot: args[4],
    getLatestDetectedEmailRoot: args[5],
    setLatestDetectedEmailRoot: args[6],
    getLatestDetectedEmailMode: args[7],
    setLatestDetectedEmailMode: args[8],
    choosePrimaryEmailCandidate: args[9],
    getInboxRootCandidates: args[10],
    syncEmailSnapshot: args[11],
    scheduleSnapshotSync: args[12],
    summarizeEmailRoot: args[13],
    shouldReplaceEmailBodyWithMirrorContent: args[14],
    replaceElementMarkup: args[15]
  };
}

function urlForensicsBuildWorkflowEmailRootRuntimeOptions(workflowOptions) {
  const optionBag = workflowOptions && typeof workflowOptions === "object" ? workflowOptions : {};
  const emailRootSummary = optionBag.workflowEmailRootSummary;
  const workflowPaneSnapshot = optionBag.workflowPaneSnapshot;

  return {
    debugApi: optionBag.debugApi,
    mutationObserverClass: urlForensicsContentInboxWorkflowsGetMutationObserverClass(),
    replaceElementMarkup: optionBag.replaceElementMarkup,
    syncEmailSnapshot: optionBag.syncEmailSnapshot,
    summarizeEmailRoot: optionBag.summarizeEmailRoot,
    publishSnapshot: workflowPaneSnapshot && typeof workflowPaneSnapshot.publishSnapshot === "function"
      ? workflowPaneSnapshot.publishSnapshot
      : async function publishMissingSnapshot() {},
    scheduleSnapshotSync: optionBag.scheduleSnapshotSync,
    shouldReplaceEmailBodyWithMirrorContent: optionBag.shouldReplaceEmailBodyWithMirrorContent,
    getLatestSnapshot: optionBag.getLatestSnapshot,
    getLatestDetectedEmailRoot: optionBag.getLatestDetectedEmailRoot,
    setLatestDetectedEmailRoot: optionBag.setLatestDetectedEmailRoot,
    getLatestDetectedEmailMode: optionBag.getLatestDetectedEmailMode,
    setLatestDetectedEmailMode: optionBag.setLatestDetectedEmailMode,
    choosePrimaryEmailCandidate: optionBag.choosePrimaryEmailCandidate,
    getInboxRootCandidates: optionBag.getInboxRootCandidates,
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

function urlForensicsCreateWorkflowEmailRootRuntime() {
  const workflowOptions = urlForensicsResolveWorkflowEmailRootRuntimeOptions(arguments);
  const emailRootRuntime = workflowOptions.emailRootRuntime;

  if (emailRootRuntime && typeof emailRootRuntime.create === "function") {
    return emailRootRuntime.create(urlForensicsBuildWorkflowEmailRootRuntimeOptions(workflowOptions));
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
    windowObject: urlForensicsContentInboxWorkflowsGetWindowObject(),
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
    getAutoApplyMirrorOnMobileDeviceEnabled: function getAutoApplyMirrorOnMobileDeviceEnabled() {
      return extensionSettings.autoApplyMirrorOnMobileDevice === true;
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
    isMobileDeviceDetected: function isMissingMobileDeviceDetected() {
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
  autoApplyMirrorOnMobileDeviceStorageKey,
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
    autoApplyMirrorOnMobileDeviceStorageKey: autoApplyMirrorOnMobileDeviceStorageKey,
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
  autoApplyMirrorOnMobileDeviceStorageKey,
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
        autoApplyMirrorOnMobileDeviceStorageKey,
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
  return urlForensicsResolveWorkflowPatternMatcher(patterns ? patterns[propertyName] : null);
}

function urlForensicsResolveWorkflowEmailCandidateDiscoverySelector(selectors, propertyName, fallbackValue) {
  return selectors && Object.prototype.hasOwnProperty.call(selectors, propertyName) ? selectors[propertyName] : fallbackValue;
}

function urlForensicsBuildWorkflowEmailCandidateDiscoveryOptions(
  mergedLinkLabPipeline,
  inboxDetectors,
  debugApi,
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
    debugApi: debugApi,
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
  debugApi,
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
        debugApi,
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
