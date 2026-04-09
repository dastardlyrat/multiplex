"use strict";

function urlForensicsPagePaneSnapshotResolveObject(candidateValue, fallbackValue) {
  return candidateValue && typeof candidateValue === "object" ? candidateValue : fallbackValue;
}

function urlForensicsPagePaneSnapshotResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsPagePaneSnapshotCreateFallbackPaneMirror() {
  return Object.freeze({
    clearRenderedPane: function clearMissingRenderedPane() {},
    renderSnapshot: function renderMissingSnapshot() {},
    setHoverLinkPanelExpanded: function setMissingHoverLinkPanelExpanded() {}
  });
}

function urlForensicsPagePaneSnapshotCreateFallbackDiagnostics() {
  return Object.freeze({
    buildDiagnosticsSections: function buildMissingDiagnosticsSections() {
      return [];
    },
    renderDiagnosticsSections: function renderMissingDiagnosticsSections() {}
  });
}

function urlForensicsPagePaneSnapshotCreateFallbackPaneLayout() {
  return Object.freeze({
    hidePane: function hideMissingPane() {},
    showPane: function showMissingPane() {}
  });
}

function urlForensicsPagePaneSnapshotCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    elements: urlForensicsPagePaneSnapshotResolveObject(optionBag.elements, {}),
    ensurePane: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.ensurePane,
      function ensureMissingPane() {
        return null;
      }
    ),
    paneMirror: urlForensicsPagePaneSnapshotResolveObject(
      optionBag.paneMirror,
      urlForensicsPagePaneSnapshotCreateFallbackPaneMirror()
    ),
    diagnostics: urlForensicsPagePaneSnapshotResolveObject(
      optionBag.diagnostics,
      urlForensicsPagePaneSnapshotCreateFallbackDiagnostics()
    ),
    paneLayout: urlForensicsPagePaneSnapshotResolveObject(
      optionBag.paneLayout,
      urlForensicsPagePaneSnapshotCreateFallbackPaneLayout()
    ),
    formatMetricCount: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.formatMetricCount,
      function formatMissingMetricCount(countValue) {
        return String(Number(countValue) || 0) + " URLs";
      }
    ),
    formatRailBadgeCount: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.formatRailBadgeCount,
      function formatMissingRailBadgeCount(countValue) {
        return String(Number(countValue) || 0);
      }
    ),
    getBaseUrl: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.getBaseUrl,
      function getMissingBaseUrl() {
        return "";
      }
    ),
    syncEmailSnapshot: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.syncEmailSnapshot,
      function syncMissingEmailSnapshot() {}
    ),
    maybeReplaceEmailBodyWithMirrorContent: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.maybeReplaceEmailBodyWithMirrorContent,
      async function replaceMissingEmailBodyWithMirrorContent() {}
    ),
    isBuiltInTestSuitePage: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.isBuiltInTestSuitePage,
      function isMissingBuiltInTestSuitePage() {
        return false;
      }
    ),
    createSnapshotSignature: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.createSnapshotSignature,
      function createMissingSnapshotSignature(snapshot) {
        return JSON.stringify(snapshot || null);
      }
    ),
    createSnapshotPaneKey: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.createSnapshotPaneKey,
      function createMissingSnapshotPaneKey(snapshot) {
        return String((snapshot && snapshot.id) || "");
      }
    ),
    resetLatestEmailDetectionState: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.resetLatestEmailDetectionState,
      function resetMissingLatestEmailDetectionState() {}
    ),
    getLatestSnapshot: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.getLatestSnapshot,
      function getMissingLatestSnapshot() {
        return null;
      }
    ),
    setLatestSnapshot: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.setLatestSnapshot,
      function setMissingLatestSnapshot() {}
    ),
    setLastPublishedSnapshotSignature: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.setLastPublishedSnapshotSignature,
      function setMissingLastPublishedSnapshotSignature() {}
    ),
    getDidAutoExpandBuiltInTestPagePane: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.getDidAutoExpandBuiltInTestPagePane,
      function getMissingDidAutoExpandBuiltInTestPagePane() {
        return false;
      }
    ),
    setDidAutoExpandBuiltInTestPagePane: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.setDidAutoExpandBuiltInTestPagePane,
      function setMissingDidAutoExpandBuiltInTestPagePane() {}
    ),
    sendRuntimeMessage: urlForensicsPagePaneSnapshotResolveFunction(
      optionBag.sendRuntimeMessage,
      async function sendMissingRuntimeMessage() {}
    )
  });
}

function urlForensicsPagePaneSnapshotSyncLabFrame(elements, snapshot) {
  if (
    !elements.labFrame ||
    !elements.labFrameLoaded ||
    !elements.labFrame.contentWindow ||
    typeof elements.labFrame.contentWindow.postMessage !== "function"
  ) {
    return false;
  }

  elements.labFrame.contentWindow.postMessage(
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

  return true;
}

function urlForensicsPagePaneSnapshotSetRailMetrics(elements, finalUrlCount, formatMetricCount, formatRailBadgeCount) {
  if (elements.railStatus) {
    elements.railStatus.textContent = "Email ready";
  }

  if (elements.railCount) {
    elements.railCount.textContent = formatMetricCount(finalUrlCount, "URL", "URLs");
  }

  if (elements.railBadge) {
    elements.railBadge.textContent = formatRailBadgeCount(finalUrlCount);
  }
}

function urlForensicsPagePaneSnapshotResetRailMetrics(elements) {
  if (elements.railStatus) {
    elements.railStatus.textContent = "No email";
  }

  if (elements.railCount) {
    elements.railCount.textContent = "0 URLs";
  }

  if (elements.railBadge) {
    elements.railBadge.textContent = "0";
  }
}

function urlForensicsPagePaneSnapshotRender(options, snapshot) {
  const paneRoot = options.ensurePane();

  if (!paneRoot || !snapshot || !snapshot.pipeline) {
    return false;
  }

  const finalUrls = Array.isArray(snapshot.pipeline.finalUrls) ? snapshot.pipeline.finalUrls : [];

  urlForensicsPagePaneSnapshotSetRailMetrics(
    options.elements,
    finalUrls.length,
    options.formatMetricCount,
    options.formatRailBadgeCount
  );
  options.paneMirror.renderSnapshot(snapshot, {
    disableSameDocumentLinks: snapshot.isTopicDigest === true,
    baseUrl: options.getBaseUrl()
  });
  options.diagnostics.renderDiagnosticsSections(
    options.elements.diagnosticsPane,
    options.diagnostics.buildDiagnosticsSections(snapshot)
  );
  urlForensicsPagePaneSnapshotSyncLabFrame(options.elements, snapshot);

  return true;
}

function urlForensicsPagePaneSnapshotClear(options) {
  if (!options.elements.root) {
    return false;
  }

  urlForensicsPagePaneSnapshotResetRailMetrics(options.elements);
  options.paneMirror.clearRenderedPane();
  options.diagnostics.renderDiagnosticsSections(
    options.elements.diagnosticsPane,
    options.diagnostics.buildDiagnosticsSections(null)
  );
  urlForensicsPagePaneSnapshotSyncLabFrame(options.elements, null);

  return true;
}

function urlForensicsPagePaneSnapshotMaybeAutoExpandForBuiltInTestPage(options) {
  if (!options.isBuiltInTestSuitePage() || options.getDidAutoExpandBuiltInTestPagePane()) {
    return false;
  }

  options.elements.isExpanded = true;
  options.setDidAutoExpandBuiltInTestPagePane(true);
  return true;
}

function urlForensicsPagePaneSnapshotHandlePaneKeyTransition(options, nextPaneKey) {
  if (options.elements.currentPaneKey === nextPaneKey) {
    return false;
  }

  options.elements.isExpanded = false;
  options.paneMirror.setHoverLinkPanelExpanded(false);
  return true;
}

function urlForensicsPagePaneSnapshotBeginOperation(state) {
  state.latestOperationId += 1;
  return state.latestOperationId;
}

function urlForensicsPagePaneSnapshotIsCurrentOperation(state, operationId) {
  return state.latestOperationId === operationId;
}

async function urlForensicsPagePaneSnapshotPublish(state, options, snapshot) {
  const operationId = urlForensicsPagePaneSnapshotBeginOperation(state);

  options.setLatestSnapshot(snapshot);
  options.setLastPublishedSnapshotSignature(options.createSnapshotSignature(snapshot));
  urlForensicsPagePaneSnapshotMaybeAutoExpandForBuiltInTestPage(options);

  const nextPaneKey = options.createSnapshotPaneKey(snapshot);
  urlForensicsPagePaneSnapshotHandlePaneKeyTransition(options, nextPaneKey);
  options.elements.currentPaneKey = nextPaneKey;

  urlForensicsPagePaneSnapshotRender(options, snapshot);
  options.paneLayout.showPane();

  if (!urlForensicsPagePaneSnapshotIsCurrentOperation(state, operationId)) {
    return false;
  }

  try {
    await options.sendRuntimeMessage({
      type: "merged-link-lab:email-snapshot",
      snapshot: snapshot
    });
  } catch {}

  if (!urlForensicsPagePaneSnapshotIsCurrentOperation(state, operationId)) {
    return false;
  }

  await options.maybeReplaceEmailBodyWithMirrorContent(snapshot);
  return urlForensicsPagePaneSnapshotIsCurrentOperation(state, operationId);
}

async function urlForensicsPagePaneSnapshotPublishClear(state, options) {
  const operationId = urlForensicsPagePaneSnapshotBeginOperation(state);

  options.setLatestSnapshot(null);
  options.resetLatestEmailDetectionState();
  options.setLastPublishedSnapshotSignature("");
  options.elements.currentPaneKey = "";
  options.elements.isExpanded = false;
  options.paneMirror.setHoverLinkPanelExpanded(false);
  urlForensicsPagePaneSnapshotClear(options);
  options.paneLayout.hidePane();

  if (!urlForensicsPagePaneSnapshotIsCurrentOperation(state, operationId)) {
    return false;
  }

  try {
    await options.sendRuntimeMessage({
      type: "merged-link-lab:email-cleared"
    });
  } catch {}

  return urlForensicsPagePaneSnapshotIsCurrentOperation(state, operationId);
}

function urlForensicsPagePaneSnapshotForceRefresh(options) {
  urlForensicsPagePaneSnapshotSyncLabFrame(options.elements, null);
  options.syncEmailSnapshot({ forcePublish: true });
}

function urlForensicsPagePaneSnapshotCreate(options) {
  const resolvedOptions = urlForensicsPagePaneSnapshotCreateDefaultOptions(options);
  const state = {
    latestOperationId: 0
  };

  return Object.freeze({
    clearPane: function clearPane() {
      return urlForensicsPagePaneSnapshotClear(resolvedOptions);
    },
    forceRefreshCurrentSnapshot: function forceRefreshCurrentSnapshot() {
      return urlForensicsPagePaneSnapshotForceRefresh(resolvedOptions);
    },
    publishClear: async function publishClear() {
      return urlForensicsPagePaneSnapshotPublishClear(state, resolvedOptions);
    },
    publishSnapshot: async function publishSnapshot(snapshot) {
      return urlForensicsPagePaneSnapshotPublish(state, resolvedOptions, snapshot);
    },
    renderSnapshotPane: function renderSnapshotPane(snapshot) {
      return urlForensicsPagePaneSnapshotRender(resolvedOptions, snapshot);
    },
    syncLabFrameWithSnapshot: function syncLabFrameWithSnapshot(snapshot) {
      return urlForensicsPagePaneSnapshotSyncLabFrame(resolvedOptions.elements, snapshot);
    }
  });
}

(function attachUrlForensicsPagePaneSnapshot(globalScope) {
  const pagePaneSnapshot = Object.freeze({
    create: urlForensicsPagePaneSnapshotCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneSnapshot;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneSnapshot = pagePaneSnapshot;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
