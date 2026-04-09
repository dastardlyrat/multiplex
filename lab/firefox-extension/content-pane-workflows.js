"use strict";

function urlForensicsContentPaneWorkflowsGetWindowObject() {
  return typeof window !== "undefined" ? window : null;
}

function urlForensicsContentPaneWorkflowsGetDocumentObject() {
  return typeof document !== "undefined" ? document : null;
}

function urlForensicsCreateWorkflowPaneBootstrap(pagePaneBootstrap) {
  return pagePaneBootstrap && typeof pagePaneBootstrap.initialize === "function"
    ? pagePaneBootstrap
    : Object.freeze({
      initialize: function initializeMissingPagePaneBootstrap() {}
    });
}

function urlForensicsBuildWorkflowPaneAssemblyOptions(
  workflowRailElements,
  pagePaneShell,
  workflowPaneBootstrap,
  extensionApi,
  workflowPaneLayout,
  workflowPaneMirror,
  workflowPaneSnapshot,
  replaceElementMarkup,
  openSettingsPage,
  getLatestSnapshot
) {
  return {
    documentObject: urlForensicsContentPaneWorkflowsGetDocumentObject(),
    elements: workflowRailElements,
    labFrameUrl:
      extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getURL === "function"
        ? extensionApi.runtime.getURL("core-components/extension-workbench.html")
        : "",
    buildPaneMarkup:
      pagePaneShell && typeof pagePaneShell.buildPaneMarkup === "function"
        ? pagePaneShell.buildPaneMarkup
        : function buildMissingPaneMarkup() {
          return "";
        },
    collectPaneElements:
      pagePaneShell && typeof pagePaneShell.collectElements === "function"
        ? pagePaneShell.collectElements
        : function collectMissingPaneElements() {
          return {};
        },
    initializePaneBootstrap:
      workflowPaneBootstrap && typeof workflowPaneBootstrap.initialize === "function"
        ? workflowPaneBootstrap.initialize
        : function initializeMissingPaneBootstrap() {},
    replaceElementMarkup: replaceElementMarkup,
    syncHoverLinkExpanded:
      workflowPaneMirror && typeof workflowPaneMirror.setHoverLinkPanelExpanded === "function"
        ? workflowPaneMirror.setHoverLinkPanelExpanded
        : function syncMissingHoverLinkExpanded() {},
    bindHoverInspector:
      workflowPaneMirror && typeof workflowPaneMirror.bindHoverInspector === "function"
        ? workflowPaneMirror.bindHoverInspector
        : function bindMissingHoverInspector() {},
    syncLabFrameWithSnapshot:
      workflowPaneSnapshot && typeof workflowPaneSnapshot.syncLabFrameWithSnapshot === "function"
        ? workflowPaneSnapshot.syncLabFrameWithSnapshot
        : function syncMissingLabFrameWithSnapshot() {},
    getLatestSnapshot: getLatestSnapshot,
    setPaneExpanded:
      workflowPaneLayout && typeof workflowPaneLayout.setPaneExpanded === "function"
        ? workflowPaneLayout.setPaneExpanded
        : function setMissingPaneExpanded() {},
    syncPageViewportReservation:
      workflowPaneLayout && typeof workflowPaneLayout.syncPageViewportReservation === "function"
        ? workflowPaneLayout.syncPageViewportReservation
        : function syncMissingPageViewportReservation() {},
    openSettingsPage: openSettingsPage,
    forceRefreshCurrentSnapshot:
      workflowPaneSnapshot && typeof workflowPaneSnapshot.forceRefreshCurrentSnapshot === "function"
        ? workflowPaneSnapshot.forceRefreshCurrentSnapshot
        : function forceRefreshMissingCurrentSnapshot() {},
    clearPane:
      workflowPaneSnapshot && typeof workflowPaneSnapshot.clearPane === "function"
        ? workflowPaneSnapshot.clearPane
        : function clearMissingPane() {}
  };
}

function urlForensicsCreateWorkflowPaneAssembly(
  pagePaneAssembly,
  workflowRailElements,
  pagePaneShell,
  workflowPaneBootstrap,
  extensionApi,
  workflowPaneLayout,
  workflowPaneMirror,
  workflowPaneSnapshot,
  replaceElementMarkup,
  openSettingsPage,
  getLatestSnapshot
) {
  if (pagePaneAssembly && typeof pagePaneAssembly.create === "function") {
    return pagePaneAssembly.create(
      urlForensicsBuildWorkflowPaneAssemblyOptions(
        workflowRailElements,
        pagePaneShell,
        workflowPaneBootstrap,
        extensionApi,
        workflowPaneLayout,
        workflowPaneMirror,
        workflowPaneSnapshot,
        replaceElementMarkup,
        openSettingsPage,
        getLatestSnapshot
      )
    );
  }

  return Object.freeze({
    ensurePane: function ensureMissingPane() {
      return workflowRailElements && workflowRailElements.root && workflowRailElements.root.isConnected
        ? workflowRailElements.root
        : null;
    },
    setActiveTab: function setMissingActiveTab(tabKey) {
      workflowRailElements.activeTabKey = /^(converted|lab|diagnostics)$/.test(String(tabKey || "")) ? tabKey : "lab";
      return workflowRailElements.activeTabKey;
    }
  });
}

function urlForensicsCreateWorkflowPaneLayout(
  pagePaneLayout,
  workflowRailElements,
  ensurePane,
  getLatestSnapshot,
  getActiveEmailRoot,
  shouldAllowOpenWithoutSnapshot
) {
  return pagePaneLayout && typeof pagePaneLayout.create === "function"
    ? pagePaneLayout.create({
      elements: workflowRailElements,
      ensurePane: ensurePane,
      getLatestSnapshot: getLatestSnapshot,
      getActiveEmailRoot: getActiveEmailRoot,
      shouldAllowOpenWithoutSnapshot: shouldAllowOpenWithoutSnapshot
    })
    : Object.freeze({
      hidePane: function hideMissingPane() {},
      openPane: function openMissingPane() {
        return {
          ok: false,
          hasSnapshot: false,
          visible: false,
          expanded: false
        };
      },
      setPaneExpanded: function setMissingPaneExpanded() {},
      showPane: function showMissingPane() {},
      syncPageViewportReservation: function syncMissingPageViewportReservation() {},
      togglePaneVisibility: function toggleMissingPaneVisibility() {
        return {
          ok: false,
          hasSnapshot: false,
          visible: false,
          expanded: false
        };
      }
    });
}

function urlForensicsCreateWorkflowPaneMirror(
  pagePaneMirror,
  workflowRailElements,
  mergedLinkLabPipeline,
  replaceElementMarkup,
  defaultHoverMessage,
  unavailableHoverMessage
) {
  return pagePaneMirror && typeof pagePaneMirror.create === "function"
    ? pagePaneMirror.create({
      elements: workflowRailElements,
      defaultHoverMessage: defaultHoverMessage,
      unavailableHoverMessage: unavailableHoverMessage,
      escapeHtml: mergedLinkLabPipeline && typeof mergedLinkLabPipeline.escapeHtml === "function"
        ? mergedLinkLabPipeline.escapeHtml
        : function escapeMissingMirrorHtml(value) {
          return String(value || "");
        },
      classifyUrlValue: mergedLinkLabPipeline && typeof mergedLinkLabPipeline.classifyUrlValue === "function"
        ? mergedLinkLabPipeline.classifyUrlValue
        : function classifyMissingMirrorUrl() {
          return "";
        },
      extractKnownTrackingParameterNames:
        mergedLinkLabPipeline && typeof mergedLinkLabPipeline.extractKnownTrackingParameterNames === "function"
          ? mergedLinkLabPipeline.extractKnownTrackingParameterNames
          : function extractMissingMirrorTrackingParameterNames() {
            return [];
          },
      replaceElementMarkup: replaceElementMarkup
    })
    : Object.freeze({
      bindHoverInspector: function bindMissingMirrorHoverInspector() {},
      clearRenderedPane: function clearMissingMirrorPane() {},
      renderSnapshot: function renderMissingMirrorSnapshot() {},
      setHoverInfoText: function setMissingMirrorHoverInfoText() {},
      setHoverLinkPanelExpanded: function setMissingMirrorHoverPanelExpanded() {}
    });
}

function urlForensicsCreateWorkflowPaneSnapshot(
  pagePaneSnapshot,
  workflowRailElements,
  ensurePane,
  workflowPaneMirror,
  workflowDiagnostics,
  workflowPaneLayout,
  extensionApi,
  getLatestSnapshot,
  setLatestSnapshot,
  setLastPublishedSnapshotSignature,
  getDidAutoExpandBuiltInTestPagePane,
  setDidAutoExpandBuiltInTestPagePane,
  formatMetricCount,
  formatRailBadgeCount,
  syncEmailSnapshot,
  maybeReplaceEmailBodyWithMirrorContent,
  isBuiltInTestSuitePage,
  createSnapshotSignature,
  createSnapshotPaneKey,
  resetLatestEmailDetectionState
) {
  const windowObject = urlForensicsContentPaneWorkflowsGetWindowObject();

  return pagePaneSnapshot && typeof pagePaneSnapshot.create === "function"
    ? pagePaneSnapshot.create({
      elements: workflowRailElements,
      ensurePane: ensurePane,
      paneMirror: workflowPaneMirror,
      diagnostics: workflowDiagnostics,
      paneLayout: workflowPaneLayout,
      formatMetricCount: formatMetricCount,
      formatRailBadgeCount: formatRailBadgeCount,
      getBaseUrl: function getPaneSnapshotBaseUrl() {
        return windowObject && windowObject.location && windowObject.location.href
          ? windowObject.location.href
          : "";
      },
      syncEmailSnapshot: syncEmailSnapshot,
      maybeReplaceEmailBodyWithMirrorContent: maybeReplaceEmailBodyWithMirrorContent,
      isBuiltInTestSuitePage: isBuiltInTestSuitePage,
      createSnapshotSignature: createSnapshotSignature,
      createSnapshotPaneKey: createSnapshotPaneKey,
      resetLatestEmailDetectionState: resetLatestEmailDetectionState,
      getLatestSnapshot: getLatestSnapshot,
      setLatestSnapshot: setLatestSnapshot,
      setLastPublishedSnapshotSignature: setLastPublishedSnapshotSignature,
      getDidAutoExpandBuiltInTestPagePane: getDidAutoExpandBuiltInTestPagePane,
      setDidAutoExpandBuiltInTestPagePane: setDidAutoExpandBuiltInTestPagePane,
      sendRuntimeMessage:
        extensionApi && extensionApi.runtime && typeof extensionApi.runtime.sendMessage === "function"
          ? function sendPaneSnapshotRuntimeMessage(message) {
            return extensionApi.runtime.sendMessage(message);
          }
          : async function sendMissingPaneSnapshotRuntimeMessage() {}
    })
    : Object.freeze({
      clearPane: function clearMissingPane() {},
      forceRefreshCurrentSnapshot: function forceRefreshMissingCurrentSnapshot() {},
      publishClear: async function publishMissingClear() {},
      publishSnapshot: async function publishMissingSnapshot() {},
      renderSnapshotPane: function renderMissingSnapshotPane() {},
      syncLabFrameWithSnapshot: function syncMissingLabFrameWithSnapshot() {
        return false;
      }
    });
}

(function attachUrlForensicsContentPaneWorkflows(globalScope) {
  const contentPaneWorkflows = Object.freeze({
    createWorkflowPaneBootstrap: urlForensicsCreateWorkflowPaneBootstrap,
    createWorkflowPaneAssembly: urlForensicsCreateWorkflowPaneAssembly,
    createWorkflowPaneLayout: urlForensicsCreateWorkflowPaneLayout,
    createWorkflowPaneMirror: urlForensicsCreateWorkflowPaneMirror,
    createWorkflowPaneSnapshot: urlForensicsCreateWorkflowPaneSnapshot
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentPaneWorkflows;
  }

  if (globalScope) {
    globalScope.urlForensicsContentPaneWorkflows = contentPaneWorkflows;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
