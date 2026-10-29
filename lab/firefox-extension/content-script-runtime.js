"use strict";

function urlForensicsContentScriptRuntimeGetWindowObject(globalScope, fallbackWindowObject) {
  if (fallbackWindowObject) {
    return fallbackWindowObject;
  }

  if (globalScope && globalScope.window) {
    return globalScope.window;
  }

  return globalScope || null;
}

function urlForensicsContentScriptRuntimeGetDocumentObject(globalScope, windowObject, fallbackDocumentObject) {
  if (fallbackDocumentObject) {
    return fallbackDocumentObject;
  }

  if (windowObject && windowObject.document) {
    return windowObject.document;
  }

  if (globalScope && globalScope.document) {
    return globalScope.document;
  }

  return null;
}

function urlForensicsContentScriptRuntimeResolveContext(options) {
  const runtimeOptions = options && typeof options === "object" ? options : {};
  const globalScope = runtimeOptions.globalScope || (typeof globalThis !== "undefined" ? globalThis : null);
  const windowObject = urlForensicsContentScriptRuntimeGetWindowObject(globalScope, runtimeOptions.windowObject || null);
  const documentObject = urlForensicsContentScriptRuntimeGetDocumentObject(
    globalScope,
    windowObject,
    runtimeOptions.documentObject || null
  );
  const resolveGlobalValue =
    typeof runtimeOptions.resolveGlobalValue === "function"
      ? runtimeOptions.resolveGlobalValue
      : function resolveMissingGlobalValue() {
        return null;
      };

  return {
    globalScope: globalScope,
    windowObject: windowObject,
    documentObject: documentObject,
    resolveGlobalValue: resolveGlobalValue,
    createWorkflowContentUiHelpers:
      typeof runtimeOptions.createWorkflowContentUiHelpers === "function"
        ? runtimeOptions.createWorkflowContentUiHelpers
        : null,
    createWorkflowContentPageContext:
      typeof runtimeOptions.createWorkflowContentPageContext === "function"
        ? runtimeOptions.createWorkflowContentPageContext
        : null,
    extensionApi:
      globalScope && (globalScope.browser || globalScope.chrome)
        ? (globalScope.browser || globalScope.chrome)
        : null,
    mergedLinkLabPipeline: globalScope && globalScope.MergedLinkLabPipeline
      ? globalScope.MergedLinkLabPipeline
      : null,
    storageModel: resolveGlobalValue("urlForensicsStorageModel"),
    inboxDetectors: resolveGlobalValue("urlForensicsInboxDetectors"),
    pagePaneDiagnostics: resolveGlobalValue("urlForensicsPagePaneDiagnostics"),
    pagePaneShell: resolveGlobalValue("urlForensicsPagePaneShell"),
    pagePaneBootstrap: resolveGlobalValue("urlForensicsPagePaneBootstrap"),
    pagePaneAssembly: resolveGlobalValue("urlForensicsPagePaneAssembly"),
    pagePaneLayout: resolveGlobalValue("urlForensicsPagePaneLayout"),
    pagePaneMirror: resolveGlobalValue("urlForensicsPagePaneMirror"),
    pagePaneSnapshot: resolveGlobalValue("urlForensicsPagePaneSnapshot"),
    emailSnapshotSync: resolveGlobalValue("urlForensicsEmailSnapshotSync"),
    emailRootSummary: resolveGlobalValue("urlForensicsEmailRootSummary"),
    emailRootRuntime: resolveGlobalValue("urlForensicsEmailRootRuntime"),
    emailAutoReplace: resolveGlobalValue("urlForensicsEmailAutoReplace"),
    emailAutoReplaceState: resolveGlobalValue("urlForensicsEmailAutoReplaceState"),
    contentSettingsStorage: resolveGlobalValue("urlForensicsContentSettingsStorage"),
    contentRuntimeLifecycle: resolveGlobalValue("urlForensicsContentRuntimeLifecycle"),
    contentUiHelpers: resolveGlobalValue("urlForensicsContentUiHelpers"),
    contentPageContext: resolveGlobalValue("urlForensicsContentPageContext"),
    contentInboxWorkflows: resolveGlobalValue("urlForensicsContentInboxWorkflows"),
    contentPaneWorkflows: resolveGlobalValue("urlForensicsContentPaneWorkflows"),
    contentWorkflowAccessors: resolveGlobalValue("urlForensicsContentWorkflowAccessors"),
    emailCandidateDiscovery: resolveGlobalValue("urlForensicsEmailCandidateDiscovery"),
    settingsOpener: resolveGlobalValue("urlForensicsSettingsOpener"),
    debugApi: resolveGlobalValue("mergedLinkLabDebug")
  };
}

function urlForensicsContentScriptRuntimeBuildMissingDependencyFlags(context) {
  return {
    hasExtensionApi: !!context.extensionApi,
    hasRuntime: !!(context.extensionApi && context.extensionApi.runtime),
    hasPipeline: !!context.mergedLinkLabPipeline,
    hasStorageModel: !!context.storageModel,
    hasInboxDetectors: !!context.inboxDetectors,
    hasContentInboxWorkflows: !!context.contentInboxWorkflows,
    hasContentPaneWorkflows: !!context.contentPaneWorkflows,
    hasContentWorkflowAccessors: !!context.contentWorkflowAccessors,
    hasCreateWorkflowContentUiHelpers: !!context.createWorkflowContentUiHelpers,
    hasCreateWorkflowContentPageContext: !!context.createWorkflowContentPageContext
  };
}

function urlForensicsContentScriptRuntimeHasRequiredDependencies(context) {
  const dependencyFlags = urlForensicsContentScriptRuntimeBuildMissingDependencyFlags(context);

  return Object.keys(dependencyFlags).every(function everyDependencyFlag(flagName) {
    return dependencyFlags[flagName];
  });
}

function urlForensicsContentScriptRuntimeLogInitializationStart(context) {
  if (!context.debugApi || typeof context.debugApi.configure !== "function") {
    return;
  }

  context.debugApi.configure({ context: "content-script", module: "content-script-runtime" });
  context.debugApi.runtime("content script runtime initialization started", {
    host:
      context.windowObject &&
      context.windowObject.location &&
      context.windowObject.location.hostname
        ? context.windowObject.location.hostname
        : "",
    readyState:
      context.documentObject && context.documentObject.readyState
        ? context.documentObject.readyState
        : "unknown"
  });
}

function urlForensicsContentScriptRuntimeReportMissingDependencies(context) {
  if (!context.debugApi) {
    return;
  }

  context.debugApi.error(
    "content script runtime initialization aborted: required modules unavailable",
    urlForensicsContentScriptRuntimeBuildMissingDependencyFlags(context)
  );
}

function urlForensicsContentScriptRuntimeBuildExtensionSettings(context) {
  return {
    enableUrlNormalizationRepair: !!(
      context.mergedLinkLabPipeline.resolvePipelineSettings
        ? context.mergedLinkLabPipeline.resolvePipelineSettings(
          context.mergedLinkLabPipeline.defaultPipelineSettings
        ).enableUrlNormalizationRepair
        : false
    ),
    stripKnownTrackingParameters: context.storageModel.defaultSettings.stripKnownTrackingParameters,
    trackingParameterFilters: context.storageModel.defaultSettings.trackingParameterFilters,
    replaceEmailBodyWithMirrorContent: false,
    allowHelperOpenWithoutDetectedEmailBody: false,
    autoApplyMirrorOnMobileDevice: context.storageModel.defaultSettings.autoApplyMirrorOnMobileDevice,
    autoApplyMirrorForConfiguredSenders: false,
    autoApplyMirrorSenderEmailList: context.storageModel.defaultSettings.autoApplyMirrorSenderEmailList.slice()
  };
}

function urlForensicsContentScriptRuntimeBuildExtensionStorageSnapshot(extensionSettings) {
  return {
    source: "defaults",
    loadedAt: 0,
    loadError: "",
    values: {
      enableUrlNormalizationRepair: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.enableUrlNormalizationRepair
      },
      stripKnownTrackingParameters: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.stripKnownTrackingParameters
      },
      trackingParameterFilters: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.trackingParameterFilters
      },
      replaceEmailBodyWithMirrorContent: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.replaceEmailBodyWithMirrorContent
      },
      allowHelperOpenWithoutDetectedEmailBody: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.allowHelperOpenWithoutDetectedEmailBody
      },
      autoApplyMirrorOnMobileDevice: {
        hasStoredValue: false,
        rawValue: undefined,
        effectiveValue: extensionSettings.autoApplyMirrorOnMobileDevice
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
}

function urlForensicsContentScriptRuntimeBuildWorkflowRailElements() {
  return {
    root: null,
    railToggleButton: null,
    railBadge: null,
    railStatus: null,
    railCount: null,
    sectionLabel: null,
    finalUrlCount: null,
    rewrittenCount: null,
    digestCount: null,
    refreshButton: null,
    settingsButton: null,
    tabButtons: [],
    tabPanels: [],
    convertedPane: null,
    convertedSummary: null,
    backupPane: null,
    backupSummary: null,
    backupFrame: null,
    backupPayload: null,
    labFrame: null,
    labFrameLoaded: false,
    diagnosticsPane: null,
    diagnosticsSummary: null,
    hoverLinkInfo: null,
    hoverLinkInfoSummary: null,
    hoverLinkPanelExpanded: false,
    hoverLinkInfoValue: null,
    applyChangesButton: null,
    copyDiagnosticsButton: null,
    collapseButton: null,
    currentPaneKey: "",
    activeTabKey: "converted",
    isExpanded: false
  };
}

function urlForensicsContentScriptRuntimeBuildState(context) {
  const extensionSettings = urlForensicsContentScriptRuntimeBuildExtensionSettings(context);

  return {
    latestSnapshot: null,
    latestDetectedEmailRoot: null,
    latestDetectedEmailMode: "",
    lastPublishedSnapshotSignature: "",
    latestInboxCandidateSeenAt: 0,
    inboxCandidateMissingSince: 0,
    lastObservedLocationHref: String(
      context.windowObject &&
      context.windowObject.location &&
      context.windowObject.location.href
        ? context.windowObject.location.href
        : ""
    ),
    didAutoExpandBuiltInTestPagePane: false,
    defaultMirrorLinkHoverMessage: "Hover over a link to reveal URL components",
    unavailableMirrorLinkHoverMessage: "Mirror hover inspection is unavailable for this email body.",
    inboxCandidateMissingGraceMs: 4000,
    outlookCandidateMissingGraceMs: 12000,
    protonCandidateMissingGraceMs: 12000,
    nativeExpansionControlHintPattern: context.inboxDetectors.patterns.nativeExpansionControlHint,
    extensionManifest:
      context.extensionApi.runtime && typeof context.extensionApi.runtime.getManifest === "function"
        ? context.extensionApi.runtime.getManifest()
        : { name: "URL Forensics Workbench", version: "0.0.0" },
    extensionSettings: extensionSettings,
    extensionStorageSnapshot: urlForensicsContentScriptRuntimeBuildExtensionStorageSnapshot(extensionSettings),
    workflowRailElements: urlForensicsContentScriptRuntimeBuildWorkflowRailElements(),
    storageKeys: {
      urlNormalizationRepair: context.storageModel.storageKeys.enableUrlNormalizationRepair,
      trackingParameterStrip: context.storageModel.storageKeys.stripKnownTrackingParameters,
      trackingParameterFilters: context.storageModel.storageKeys.trackingParameterFilters,
      replaceEmailBodyWithMirrorContent: context.storageModel.storageKeys.replaceEmailBodyWithMirrorContent,
      allowHelperOpenWithoutDetectedEmailBody: context.storageModel.storageKeys.allowHelperOpenWithoutDetectedEmailBody,
      autoApplyMirrorOnMobileDevice: context.storageModel.storageKeys.autoApplyMirrorOnMobileDevice,
      autoApplyMirrorForConfiguredSenders: context.storageModel.storageKeys.autoApplyMirrorForConfiguredSenders,
      autoApplyMirrorSenderEmailList: context.storageModel.storageKeys.autoApplyMirrorSenderEmailList,
      legacyAutoApplyMirrorForNamedSender: context.storageModel.legacyStorageKeys.autoApplyMirrorForNamedSender
    },
    storageHelpers: {
      defaultAutoApplyMirrorSenderEmails: context.storageModel.defaultSettings.autoApplyMirrorSenderEmailList,
      sanitizeSenderEmailList: context.storageModel.sanitizeSenderEmailList,
      resolveStoredAutoApplyConfiguredSendersValue: context.storageModel.resolveStoredAutoApplyConfiguredSendersValue,
      buildStorageBooleanSnapshotEntry: context.storageModel.buildStorageBooleanEntry,
      buildTrackingParameterFilterSnapshotEntry: context.storageModel.buildTrackingParameterFilterEntry,
      buildStorageEmailListSnapshotEntry: context.storageModel.buildStorageEmailListEntry
    }
  };
}

function urlForensicsContentScriptRuntimeResetStalePaneDom(context) {
  const documentObject = context && context.documentObject ? context.documentObject : null;

  if (!documentObject || typeof documentObject.querySelector !== "function") {
    return false;
  }

  const stalePaneRoot = documentObject.querySelector("#merged-link-lab-page-pane");

  if (
    stalePaneRoot &&
    stalePaneRoot.parentNode &&
    typeof stalePaneRoot.parentNode.removeChild === "function"
  ) {
    stalePaneRoot.parentNode.removeChild(stalePaneRoot);
  }

  [documentObject.documentElement, documentObject.body].forEach(function clearReservedPaneState(targetElement) {
    if (!targetElement) {
      return;
    }

    if (targetElement.classList && typeof targetElement.classList.remove === "function") {
      targetElement.classList.remove("merged-link-lab-page-pane-reserved");
    }

    if (targetElement.style && typeof targetElement.style.removeProperty === "function") {
      targetElement.style.removeProperty("--merged-link-lab-page-pane-reserved-space");
      targetElement.style.removeProperty("--merged-link-lab-page-pane-expanded-width");
    }
  });

  return !!stalePaneRoot;
}

function urlForensicsContentScriptRuntimeCreatePageContext(context, state) {
  return context.createWorkflowContentPageContext(
    context.contentPageContext,
    function setLatestDetectedEmailRoot(nextLatestDetectedEmailRoot) {
      state.latestDetectedEmailRoot = nextLatestDetectedEmailRoot;
    },
    function setLatestDetectedEmailMode(nextLatestDetectedEmailMode) {
      state.latestDetectedEmailMode = String(nextLatestDetectedEmailMode || "");
    },
    function setLatestInboxCandidateSeenAt(nextLatestInboxCandidateSeenAt) {
      state.latestInboxCandidateSeenAt = Number(nextLatestInboxCandidateSeenAt) || 0;
    },
    function setInboxCandidateMissingSince(nextInboxCandidateMissingSince) {
      state.inboxCandidateMissingSince = Number(nextInboxCandidateMissingSince) || 0;
    },
    function getFallbackWindowLocationHref() {
      return String(
        context.windowObject &&
        context.windowObject.location &&
        context.windowObject.location.href
          ? context.windowObject.location.href
          : ""
      );
    },
    function isFallbackBuiltInTestSuitePage() {
      return !!(
        context.documentObject &&
        context.documentObject.body &&
        typeof context.documentObject.body.getAttribute === "function" &&
        context.documentObject.body.getAttribute("data-url-forensics-test-page") === "true"
      );
    },
    function isFallbackPageCurrentlyVisible() {
      return !context.documentObject || context.documentObject.visibilityState !== "hidden";
    },
    function resetFallbackLatestEmailDetectionState() {
      state.latestDetectedEmailRoot = null;
      state.latestDetectedEmailMode = "";
      state.latestInboxCandidateSeenAt = 0;
      state.inboxCandidateMissingSince = 0;
    }
  );
}

function urlForensicsContentScriptRuntimeCreateSharedWorkflowState(context, state) {
  const workflowRefs = {
    paneAssembly: null,
    emailRootSummary: null,
    emailCandidateDiscovery: null,
    emailSnapshotSync: null,
    emailRootRuntime: null,
    emailAutoReplace: null,
    contentSettingsStorage: null
  };
  const workflowEmailAutoReplaceState = context.contentInboxWorkflows.createWorkflowEmailAutoReplaceState(
    context.emailAutoReplaceState,
    state.extensionSettings,
    state.storageHelpers.defaultAutoApplyMirrorSenderEmails,
    state.storageHelpers.sanitizeSenderEmailList,
    context.storageModel.defaultSettings.autoApplyMirrorForConfiguredSenders
  );
  const workflowContentAccessors = context.contentWorkflowAccessors.create({
    storageModel: context.storageModel,
    extensionSettings: state.extensionSettings,
    getWorkflowEmailCandidateDiscovery: function getWorkflowEmailCandidateDiscovery() {
      return workflowRefs.emailCandidateDiscovery;
    },
    getWorkflowContentSettingsStorage: function getWorkflowContentSettingsStorage() {
      return workflowRefs.contentSettingsStorage;
    },
    getWorkflowEmailAutoReplaceState: function getWorkflowEmailAutoReplaceState() {
      return workflowEmailAutoReplaceState;
    },
    getWorkflowEmailAutoReplace: function getWorkflowEmailAutoReplace() {
      return workflowRefs.emailAutoReplace;
    },
    getWorkflowEmailRootSummary: function getWorkflowEmailRootSummary() {
      return workflowRefs.emailRootSummary;
    },
    getWorkflowEmailRootRuntime: function getWorkflowEmailRootRuntime() {
      return workflowRefs.emailRootRuntime;
    }
  });

  return {
    workflowRefs: workflowRefs,
    workflowEmailAutoReplaceState: workflowEmailAutoReplaceState,
    workflowContentAccessors: workflowContentAccessors
  };
}

function urlForensicsContentScriptRuntimeCreateDiagnosticsWorkflow(context, state, workflowContentUiHelpers, shared) {
  const replaceElementMarkup = workflowContentUiHelpers.replaceElementMarkup;

  return context.pagePaneDiagnostics && typeof context.pagePaneDiagnostics.create === "function"
    ? context.pagePaneDiagnostics.create({
      extensionManifest: state.extensionManifest,
      extensionSettings: state.extensionSettings,
      extensionStorageSnapshot: state.extensionStorageSnapshot,
      getPipelineSettings: shared.workflowContentAccessors.getPipelineSettings,
      getInboxDetectionFailure: shared.workflowContentAccessors.getInboxDetectionFailure,
      formatTrackingParameterFilterSnapshotEntry: context.storageModel.formatTrackingParameterFilterEntry,
      formatTimingValue: workflowContentUiHelpers.formatTimingValue,
      formatTimestamp: workflowContentUiHelpers.formatTimestamp,
      getNavigationPerformanceEntry: workflowContentUiHelpers.getNavigationPerformanceEntry,
      escapeHtml: context.mergedLinkLabPipeline.escapeHtml,
      replaceElementMarkup: replaceElementMarkup
    })
    : Object.freeze({
      buildDiagnosticsSections: function buildMissingDiagnosticsSections() {
        return [];
      },
      renderDiagnosticsSections: function renderMissingDiagnosticsSections(targetElement) {
        if (targetElement) {
          replaceElementMarkup(targetElement, "");
        }
      }
    });
}

function urlForensicsContentScriptRuntimeBuildPaneContextControls(workflowContentPageContext, shared) {
  return {
    isBuiltInTestSuitePage: function isBuiltInTestSuitePage() {
      return workflowContentPageContext ? workflowContentPageContext.isBuiltInTestSuitePage() : false;
    },
    isPageCurrentlyVisible: function isPageCurrentlyVisible() {
      return workflowContentPageContext ? workflowContentPageContext.isPageCurrentlyVisible() : true;
    },
    getCurrentLocationHref: function getCurrentLocationHref() {
      return workflowContentPageContext ? workflowContentPageContext.getCurrentLocationHref() : "";
    },
    resetLatestEmailDetectionState: function resetLatestEmailDetectionState() {
      if (workflowContentPageContext) {
        workflowContentPageContext.resetLatestEmailDetectionState();
      }
    },
    createSnapshotSignature: function createSnapshotSignature(snapshot) {
      return workflowContentPageContext ? workflowContentPageContext.createSnapshotSignature(snapshot) : "";
    },
    createSnapshotPaneKey: function createSnapshotPaneKey(snapshot) {
      return workflowContentPageContext ? workflowContentPageContext.createSnapshotPaneKey(snapshot) : "";
    },
    ensurePane: function ensurePane() {
      return shared.workflowRefs.paneAssembly ? shared.workflowRefs.paneAssembly.ensurePane() : null;
    }
  };
}

function urlForensicsContentScriptRuntimeCreatePaneSnapshotWorkflow(
  context,
  state,
  workflowContentUiHelpers,
  shared,
  paneControls,
  workflowDiagnostics,
  workflowPaneLayout,
  workflowPaneMirror
) {
  function syncEmailSnapshot(options) {
    return shared.workflowRefs.emailSnapshotSync ? shared.workflowRefs.emailSnapshotSync.syncEmailSnapshot(options) : false;
  }

  function scheduleSnapshotSync() {
    return shared.workflowRefs.emailSnapshotSync ? shared.workflowRefs.emailSnapshotSync.scheduleSnapshotSync() : 0;
  }

  return {
    workflowPaneSnapshot: context.contentPaneWorkflows.createWorkflowPaneSnapshot({
      pagePaneSnapshot: context.pagePaneSnapshot,
      workflowRailElements: state.workflowRailElements,
      ensurePane: paneControls.ensurePane,
      workflowPaneMirror: workflowPaneMirror,
      workflowDiagnostics: workflowDiagnostics,
      workflowPaneLayout: workflowPaneLayout,
      extensionApi: context.extensionApi,
      debugApi: context.debugApi,
      getLatestSnapshot: function getLatestSnapshot() {
        return state.latestSnapshot;
      },
      setLatestSnapshot: function setLatestSnapshot(nextSnapshot) {
        state.latestSnapshot = nextSnapshot;
      },
      setLastPublishedSnapshotSignature: function setLastPublishedSnapshotSignature(nextSignature) {
        state.lastPublishedSnapshotSignature = nextSignature;
      },
      getDidAutoExpandBuiltInTestPagePane: function getDidAutoExpandBuiltInTestPagePane() {
        return state.didAutoExpandBuiltInTestPagePane;
      },
      setDidAutoExpandBuiltInTestPagePane: function setDidAutoExpandBuiltInTestPagePane(
        nextDidAutoExpandBuiltInTestPagePane
      ) {
        state.didAutoExpandBuiltInTestPagePane = !!nextDidAutoExpandBuiltInTestPagePane;
      },
      formatMetricCount: workflowContentUiHelpers.formatMetricCount,
      formatRailBadgeCount: workflowContentUiHelpers.formatRailBadgeCount,
      syncEmailSnapshot: syncEmailSnapshot,
      maybeReplaceEmailBodyWithMirrorContent: shared.workflowContentAccessors.maybeReplaceEmailBodyWithMirrorContent,
      isBuiltInTestSuitePage: paneControls.isBuiltInTestSuitePage,
      createSnapshotSignature: paneControls.createSnapshotSignature,
      createSnapshotPaneKey: paneControls.createSnapshotPaneKey,
      resetLatestEmailDetectionState: paneControls.resetLatestEmailDetectionState
    }),
    syncEmailSnapshot: syncEmailSnapshot,
    scheduleSnapshotSync: scheduleSnapshotSync
  };
}

function urlForensicsContentScriptRuntimeCreatePaneWorkflows(
  context,
  state,
  workflowContentUiHelpers,
  workflowContentPageContext,
  shared,
  workflowDiagnostics
) {
  const workflowPaneBootstrap = context.contentPaneWorkflows.createWorkflowPaneBootstrap(context.pagePaneBootstrap);
  const paneControls = urlForensicsContentScriptRuntimeBuildPaneContextControls(workflowContentPageContext, shared);
  function shouldSuppressPaneVisibility() {
    const locationObject =
      context.windowObject && context.windowObject.location
        ? context.windowObject.location
        : null;
    const inboxRootCandidates = shared.workflowContentAccessors.getInboxRootCandidates();
    const candidateCount = Array.isArray(inboxRootCandidates) ? inboxRootCandidates.length : 0;
    const isSupportedInboxHost = !!(
      locationObject &&
      context.inboxDetectors &&
      typeof context.inboxDetectors.isSupportedInboxHost === "function" &&
      context.inboxDetectors.isSupportedInboxHost(locationObject)
    );
    const shouldSuppress = isSupportedInboxHost && candidateCount === 0;

    if (context.debugApi && typeof context.debugApi.conditional === "function") {
      context.debugApi.conditional("content pane visibility suppression evaluated", {
        href: locationObject && locationObject.href ? String(locationObject.href) : "",
        isSupportedInboxHost: isSupportedInboxHost,
        candidateCount: candidateCount,
        suppressed: shouldSuppress
      });
    }

    if (
      !locationObject ||
      !context.inboxDetectors ||
      typeof context.inboxDetectors.isSupportedInboxHost !== "function" ||
      !context.inboxDetectors.isSupportedInboxHost(locationObject)
    ) {
      return false;
    }

    return shouldSuppress;
  }

  const workflowPaneLayout = context.contentPaneWorkflows.createWorkflowPaneLayout(
    context.pagePaneLayout,
    state.workflowRailElements,
    paneControls.ensurePane,
    function getLatestSnapshot() {
      return state.latestSnapshot;
    },
    shared.workflowContentAccessors.getActiveEmailRoot,
    function shouldAllowOpenWithoutSnapshot() {
      return false;
    },
    shouldSuppressPaneVisibility,
    context.debugApi
  );
  const workflowPaneMirror = context.contentPaneWorkflows.createWorkflowPaneMirror(
    context.pagePaneMirror,
    state.workflowRailElements,
    context.mergedLinkLabPipeline,
    workflowContentUiHelpers.replaceElementMarkup,
    state.defaultMirrorLinkHoverMessage,
    state.unavailableMirrorLinkHoverMessage
  );
  const paneSnapshotWorkflow = urlForensicsContentScriptRuntimeCreatePaneSnapshotWorkflow(
    context,
    state,
    workflowContentUiHelpers,
    shared,
    paneControls,
    workflowDiagnostics,
    workflowPaneLayout,
    workflowPaneMirror
  );

  async function openSettingsPage() {
    if (context.settingsOpener && typeof context.settingsOpener.openSettingsPage === "function") {
      await context.settingsOpener.openSettingsPage(context.extensionApi);
    }
  }

  shared.workflowRefs.paneAssembly = context.contentPaneWorkflows.createWorkflowPaneAssembly(
    context.pagePaneAssembly,
    state.workflowRailElements,
    context.pagePaneShell,
    workflowPaneBootstrap,
    context.extensionApi,
    workflowPaneLayout,
    workflowPaneMirror,
    paneSnapshotWorkflow.workflowPaneSnapshot,
    workflowContentUiHelpers.replaceElementMarkup,
    openSettingsPage,
    function getLatestSnapshotForPaneAssembly() {
      return state.latestSnapshot;
    }
  );

  return {
    workflowPaneLayout: workflowPaneLayout,
    workflowPaneSnapshot: paneSnapshotWorkflow.workflowPaneSnapshot,
    syncEmailSnapshot: paneSnapshotWorkflow.syncEmailSnapshot,
    scheduleSnapshotSync: paneSnapshotWorkflow.scheduleSnapshotSync,
    isPageCurrentlyVisible: paneControls.isPageCurrentlyVisible,
    getCurrentLocationHref: paneControls.getCurrentLocationHref,
    resetLatestEmailDetectionState: paneControls.resetLatestEmailDetectionState,
    createSnapshotSignature: paneControls.createSnapshotSignature,
    togglePaneVisibility: function togglePaneVisibility() {
      return workflowPaneLayout.togglePaneVisibility();
    }
  };
}

function urlForensicsContentScriptRuntimeCreateSummaryAndSettingsWorkflows(context, state, shared, paneWorkflows) {
  shared.workflowRefs.emailRootSummary = context.contentInboxWorkflows.createWorkflowEmailRootSummary(
    context.emailRootSummary,
    context.mergedLinkLabPipeline,
    context.inboxDetectors,
    context.debugApi,
    shared.workflowContentAccessors.getPipelineSettings
  );
  shared.workflowRefs.contentSettingsStorage = context.contentInboxWorkflows.createWorkflowContentSettingsStorage(
    context.contentSettingsStorage,
    context.extensionApi,
    context.storageModel,
    state.extensionSettings,
    state.extensionStorageSnapshot,
    context.debugApi,
    shared.workflowContentAccessors.getPipelineSettings,
    paneWorkflows.syncEmailSnapshot,
    shared.workflowEmailAutoReplaceState,
    state.storageKeys.urlNormalizationRepair,
    state.storageKeys.trackingParameterStrip,
    state.storageKeys.trackingParameterFilters,
    state.storageKeys.replaceEmailBodyWithMirrorContent,
    state.storageKeys.allowHelperOpenWithoutDetectedEmailBody,
    state.storageKeys.autoApplyMirrorOnMobileDevice,
    state.storageKeys.autoApplyMirrorForConfiguredSenders,
    state.storageKeys.autoApplyMirrorSenderEmailList,
    state.storageKeys.legacyAutoApplyMirrorForNamedSender,
    state.storageHelpers.buildStorageBooleanSnapshotEntry,
    state.storageHelpers.buildTrackingParameterFilterSnapshotEntry,
    state.storageHelpers.buildStorageEmailListSnapshotEntry,
    state.storageHelpers.resolveStoredAutoApplyConfiguredSendersValue
  );
}

function urlForensicsContentScriptRuntimeCreateSnapshotAndRootRuntimeWorkflows(
  context,
  state,
  workflowContentUiHelpers,
  shared,
  paneWorkflows
) {
  shared.workflowRefs.emailSnapshotSync = context.contentInboxWorkflows.createWorkflowEmailSnapshotSync({
    emailSnapshotSync: context.emailSnapshotSync,
    debugApi: context.debugApi,
    mergedLinkLabPipeline: context.mergedLinkLabPipeline,
    workflowPaneSnapshot: paneWorkflows.workflowPaneSnapshot,
    workflowPaneLayout: paneWorkflows.workflowPaneLayout,
    getLatestSnapshot: function getLatestSnapshot() {
      return state.latestSnapshot;
    },
    getLastPublishedSnapshotSignature: function getLastPublishedSnapshotSignature() {
      return state.lastPublishedSnapshotSignature;
    },
    getLatestDetectedEmailRoot: function getLatestDetectedEmailRoot() {
      return state.latestDetectedEmailRoot;
    },
    setLatestDetectedEmailRoot: function setLatestDetectedEmailRoot(nextLatestDetectedEmailRoot) {
      state.latestDetectedEmailRoot = nextLatestDetectedEmailRoot;
    },
    getLatestDetectedEmailMode: function getLatestDetectedEmailMode() {
      return state.latestDetectedEmailMode;
    },
    setLatestDetectedEmailMode: function setLatestDetectedEmailMode(nextLatestDetectedEmailMode) {
      state.latestDetectedEmailMode = String(nextLatestDetectedEmailMode || "");
    },
    getLatestInboxCandidateSeenAt: function getLatestInboxCandidateSeenAt() {
      return state.latestInboxCandidateSeenAt;
    },
    setLatestInboxCandidateSeenAt: function setLatestInboxCandidateSeenAt(nextLatestInboxCandidateSeenAt) {
      state.latestInboxCandidateSeenAt = Number(nextLatestInboxCandidateSeenAt) || 0;
    },
    getInboxCandidateMissingSince: function getInboxCandidateMissingSince() {
      return state.inboxCandidateMissingSince;
    },
    setInboxCandidateMissingSince: function setInboxCandidateMissingSince(nextInboxCandidateMissingSince) {
      state.inboxCandidateMissingSince = Number(nextInboxCandidateMissingSince) || 0;
    },
    getLastObservedLocationHref: function getLastObservedLocationHref() {
      return state.lastObservedLocationHref;
    },
    setLastObservedLocationHref: function setLastObservedLocationHref(nextLastObservedLocationHref) {
      state.lastObservedLocationHref = String(nextLastObservedLocationHref || "");
    },
    resetLatestEmailDetectionState: paneWorkflows.resetLatestEmailDetectionState,
    isPageCurrentlyVisible: paneWorkflows.isPageCurrentlyVisible,
    getCurrentLocationHref: paneWorkflows.getCurrentLocationHref,
    getInboxRootCandidates: shared.workflowContentAccessors.getInboxRootCandidates,
    getInboxDetectionFailure: shared.workflowContentAccessors.getInboxDetectionFailure,
    observeEmailRoot: shared.workflowContentAccessors.observeEmailRoot,
    choosePrimaryEmailCandidate: shared.workflowContentAccessors.choosePrimaryEmailCandidate,
    getCandidateMissingGraceWindow: shared.workflowContentAccessors.getCandidateMissingGraceWindow,
    summarizeEmailRoot: shared.workflowContentAccessors.summarizeEmailRoot,
    createSnapshotSignature: paneWorkflows.createSnapshotSignature
  });
  shared.workflowRefs.emailRootRuntime = context.contentInboxWorkflows.createWorkflowEmailRootRuntime({
    emailRootRuntime: context.emailRootRuntime,
    workflowEmailRootSummary: shared.workflowRefs.emailRootSummary,
    workflowPaneSnapshot: paneWorkflows.workflowPaneSnapshot,
    debugApi: context.debugApi,
    getLatestSnapshot: function getLatestSnapshot() {
      return state.latestSnapshot;
    },
    getLatestDetectedEmailRoot: function getLatestDetectedEmailRoot() {
      return state.latestDetectedEmailRoot;
    },
    setLatestDetectedEmailRoot: function setLatestDetectedEmailRoot(nextLatestDetectedEmailRoot) {
      state.latestDetectedEmailRoot = nextLatestDetectedEmailRoot;
    },
    getLatestDetectedEmailMode: function getLatestDetectedEmailMode() {
      return state.latestDetectedEmailMode;
    },
    setLatestDetectedEmailMode: function setLatestDetectedEmailMode(nextLatestDetectedEmailMode) {
      state.latestDetectedEmailMode = String(nextLatestDetectedEmailMode || "");
    },
    choosePrimaryEmailCandidate: shared.workflowContentAccessors.choosePrimaryEmailCandidate,
    getInboxRootCandidates: shared.workflowContentAccessors.getInboxRootCandidates,
    syncEmailSnapshot: paneWorkflows.syncEmailSnapshot,
    scheduleSnapshotSync: paneWorkflows.scheduleSnapshotSync,
    summarizeEmailRoot: shared.workflowContentAccessors.summarizeEmailRoot,
    shouldReplaceEmailBodyWithMirrorContent: shared.workflowContentAccessors.shouldReplaceEmailBodyWithMirrorContent,
    replaceElementMarkup: workflowContentUiHelpers.replaceElementMarkup
  });
}

function urlForensicsContentScriptRuntimeCreateAutoReplaceAndCandidateWorkflows(context, state, shared) {
  shared.workflowEmailAutoReplaceState.refreshConfiguredSenderDetectionState();
  shared.workflowRefs.emailAutoReplace = context.contentInboxWorkflows.createWorkflowEmailAutoReplace(
    context.emailAutoReplace,
    state.extensionSettings,
    shared.workflowContentAccessors.getActiveEmailRoot,
    function getAutoApplyMirrorSenderSelector() {
      return shared.workflowEmailAutoReplaceState.getAutoApplyMirrorSenderSelector();
    },
    function getAutoApplyMirrorSenderEmailPattern() {
      return shared.workflowEmailAutoReplaceState.getAutoApplyMirrorSenderEmailPattern();
    },
    function getAutoApplyMirrorSenderHeaderPattern() {
      return shared.workflowEmailAutoReplaceState.getAutoApplyMirrorSenderHeaderPattern();
    },
    state.nativeExpansionControlHintPattern
  );
  shared.workflowRefs.emailCandidateDiscovery = context.contentInboxWorkflows.createWorkflowEmailCandidateDiscovery(
    context.emailCandidateDiscovery,
    context.mergedLinkLabPipeline,
    context.inboxDetectors,
    context.debugApi,
    shared.workflowContentAccessors.getEmailRootContentElement,
    shared.workflowContentAccessors.measureElementText,
    state.inboxCandidateMissingGraceMs,
    state.outlookCandidateMissingGraceMs,
    state.protonCandidateMissingGraceMs
  );
}

function urlForensicsContentScriptRuntimeCreateEmailAndLifecycleWorkflows(
  context,
  state,
  workflowContentUiHelpers,
  shared,
  paneWorkflows
) {
  urlForensicsContentScriptRuntimeCreateSummaryAndSettingsWorkflows(context, state, shared, paneWorkflows);
  urlForensicsContentScriptRuntimeCreateSnapshotAndRootRuntimeWorkflows(
    context,
    state,
    workflowContentUiHelpers,
    shared,
    paneWorkflows
  );
  urlForensicsContentScriptRuntimeCreateAutoReplaceAndCandidateWorkflows(context, state, shared);

  return context.contentInboxWorkflows.createWorkflowContentRuntimeLifecycle(
    context.contentRuntimeLifecycle,
    context.extensionApi,
    context.debugApi,
    shared.workflowContentAccessors.loadPipelineSettings,
    shared.workflowContentAccessors.handlePipelineStorageChange,
    paneWorkflows.scheduleSnapshotSync,
    paneWorkflows.syncEmailSnapshot,
    function openPaneVisibility() {
      return paneWorkflows.workflowPaneLayout.openPane();
    },
    paneWorkflows.togglePaneVisibility,
    function shouldAllowOpenWithoutSnapshot() {
      return false;
    },
    shared.workflowContentAccessors.applyRewriteToEmailBody,
    function getLatestSnapshotForContentRuntimeLifecycle() {
      return state.latestSnapshot;
    },
    paneWorkflows.workflowPaneLayout
  );
}

function initializeMergedLinkLabContentScriptRuntime(options) {
  const context = urlForensicsContentScriptRuntimeResolveContext(options);

  urlForensicsContentScriptRuntimeLogInitializationStart(context);
  if (!urlForensicsContentScriptRuntimeHasRequiredDependencies(context)) {
    urlForensicsContentScriptRuntimeReportMissingDependencies(context);
    return false;
  }

  const workflowContentUiHelpers = context.createWorkflowContentUiHelpers(
    context.contentUiHelpers,
    context.extensionApi,
    context.mergedLinkLabPipeline
  );
  urlForensicsContentScriptRuntimeResetStalePaneDom(context);
  const state = urlForensicsContentScriptRuntimeBuildState(context);
  const workflowContentPageContext = urlForensicsContentScriptRuntimeCreatePageContext(context, state);
  const shared = urlForensicsContentScriptRuntimeCreateSharedWorkflowState(context, state);
  const workflowDiagnostics = urlForensicsContentScriptRuntimeCreateDiagnosticsWorkflow(
    context,
    state,
    workflowContentUiHelpers,
    shared
  );
  const paneWorkflows = urlForensicsContentScriptRuntimeCreatePaneWorkflows(
    context,
    state,
    workflowContentUiHelpers,
    workflowContentPageContext,
    shared,
    workflowDiagnostics
  );
  const workflowContentRuntimeLifecycle = urlForensicsContentScriptRuntimeCreateEmailAndLifecycleWorkflows(
    context,
    state,
    workflowContentUiHelpers,
    shared,
    paneWorkflows
  );

  workflowContentRuntimeLifecycle.initialize();
  return true;
}

(function attachUrlForensicsContentScriptRuntime(globalScope) {
  const contentScriptRuntime = Object.freeze({
    initialize: initializeMergedLinkLabContentScriptRuntime
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentScriptRuntime;
  }

  if (globalScope) {
    globalScope.urlForensicsContentScriptRuntime = contentScriptRuntime;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
