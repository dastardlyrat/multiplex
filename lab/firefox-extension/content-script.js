function urlForensicsResolveGlobalValue(propertyName) {
  if (typeof globalThis === "undefined" || !globalThis) {
    return null;
  }

  return globalThis[propertyName] || null;
}

function urlForensicsBuildWorkflowContentUiHelpersOptions(extensionApi, mergedLinkLabPipeline) {
  return {
    documentObject: document,
    navigatorObject: typeof navigator !== "undefined" ? navigator : null,
    performanceObject: typeof performance !== "undefined" ? performance : null,
    extensionApi: extensionApi,
    escapeHtml:
      mergedLinkLabPipeline && typeof mergedLinkLabPipeline.escapeHtml === "function"
        ? mergedLinkLabPipeline.escapeHtml
        : function escapeMissingContentUiHtml(value) {
          return String(value || "");
        }
  };
}

function urlForensicsCreateWorkflowContentUiHelpers(contentUiHelpers, extensionApi, mergedLinkLabPipeline) {
  if (contentUiHelpers && typeof contentUiHelpers.create === "function") {
    return contentUiHelpers.create(
      urlForensicsBuildWorkflowContentUiHelpersOptions(extensionApi, mergedLinkLabPipeline)
    );
  }

  return Object.freeze({
    formatMetricCount: function formatMissingMetricCount(count, singularLabel, pluralLabel) {
      const safeCount = Number.isFinite(count) ? count : 0;
      return safeCount + " " + (safeCount === 1 ? singularLabel : pluralLabel);
    },
    formatRailBadgeCount: function formatMissingRailBadgeCount(count) {
      const safeCount = Math.max(0, Math.round(Number(count) || 0));
      return safeCount > 99 ? "99+" : String(safeCount);
    },
    formatTimingValue: function formatMissingTimingValue(value) {
      return Number.isFinite(value) && value >= 0 ? value.toFixed(1) + " ms" : "unavailable";
    },
    formatTimestamp: function formatMissingTimestamp(timestamp) {
      if (!timestamp) {
        return "Not detected";
      }

      try {
        return new Date(timestamp).toLocaleString();
      } catch {
        return "Detected";
      }
    },
    getNavigationPerformanceEntry: function getMissingNavigationPerformanceEntry() {
      return null;
    },
    installSidePanelIconFontFace: function installMissingSidePanelIconFontFace() {
      return false;
    },
    replaceElementMarkup: function replaceMissingElementMarkup(targetElement, htmlMarkup) {
      if (targetElement && Object.prototype.hasOwnProperty.call(targetElement, "innerHTML")) {
        targetElement.innerHTML = String(htmlMarkup || "");
      }
    }
  });
}

function urlForensicsBuildWorkflowContentPageContextOptions(
  setLatestDetectedEmailRoot,
  setLatestDetectedEmailMode,
  setLatestInboxCandidateSeenAt,
  setInboxCandidateMissingSince
) {
  return {
    documentObject: document,
    windowObject: window,
    setLatestDetectedEmailRoot: setLatestDetectedEmailRoot,
    setLatestDetectedEmailMode: setLatestDetectedEmailMode,
    setLatestInboxCandidateSeenAt: setLatestInboxCandidateSeenAt,
    setInboxCandidateMissingSince: setInboxCandidateMissingSince
  };
}

function urlForensicsCreateWorkflowContentPageContext(
  contentPageContext,
  setLatestDetectedEmailRoot,
  setLatestDetectedEmailMode,
  setLatestInboxCandidateSeenAt,
  setInboxCandidateMissingSince,
  getFallbackWindowLocationHref,
  isFallbackBuiltInTestSuitePage,
  isFallbackPageCurrentlyVisible,
  resetFallbackLatestEmailDetectionState
) {
  if (contentPageContext && typeof contentPageContext.create === "function") {
    return contentPageContext.create(
      urlForensicsBuildWorkflowContentPageContextOptions(
        setLatestDetectedEmailRoot,
        setLatestDetectedEmailMode,
        setLatestInboxCandidateSeenAt,
        setInboxCandidateMissingSince
      )
    );
  }

  return Object.freeze({
    createSnapshotPaneKey: function createMissingSnapshotPaneKey(snapshot) {
      if (!snapshot) {
        return "";
      }

      return [
        snapshot.detectionMode || "",
        snapshot.sectionLabel || "",
        String(snapshot.rawText || "").slice(0, 240)
      ].join("::");
    },
    createSnapshotSignature: function createMissingSnapshotSignature(snapshot) {
      if (!snapshot) {
        return "";
      }

      return [
        snapshot.detectionMode || "",
        snapshot.sectionLabel || "",
        snapshot.sourceHtml || "",
        snapshot.isTopicDigest ? "topic-digest" : "standard"
      ].join("::");
    },
    getCurrentLocationHref: function getMissingCurrentLocationHref() {
      return getFallbackWindowLocationHref();
    },
    isBuiltInTestSuitePage: function isMissingBuiltInTestSuitePage() {
      return isFallbackBuiltInTestSuitePage();
    },
    isPageCurrentlyVisible: function isMissingPageCurrentlyVisible() {
      return isFallbackPageCurrentlyVisible();
    },
    resetLatestEmailDetectionState: function resetMissingLatestEmailDetectionState() {
      resetFallbackLatestEmailDetectionState();
    }
  });
}

function initializeMergedLinkLabContentScript(globalScope) {
  "use strict";

  const runtime = urlForensicsResolveGlobalValue("urlForensicsContentScriptRuntime");
  if (!runtime || typeof runtime.initialize !== "function") {
    return false;
  }

  runtime.initialize({
    globalScope: globalScope,
    windowObject: typeof window !== "undefined" ? window : null,
    documentObject: typeof document !== "undefined" ? document : null,
    resolveGlobalValue: urlForensicsResolveGlobalValue,
    createWorkflowContentUiHelpers: urlForensicsCreateWorkflowContentUiHelpers,
    createWorkflowContentPageContext: urlForensicsCreateWorkflowContentPageContext
  });
  return true;
}

const urlForensicsContentScript = Object.freeze({
  initialize: initializeMergedLinkLabContentScript,
  resolveGlobalValue: urlForensicsResolveGlobalValue,
  buildWorkflowContentUiHelpersOptions: urlForensicsBuildWorkflowContentUiHelpersOptions,
  createWorkflowContentUiHelpers: urlForensicsCreateWorkflowContentUiHelpers,
  buildWorkflowContentPageContextOptions: urlForensicsBuildWorkflowContentPageContextOptions,
  createWorkflowContentPageContext: urlForensicsCreateWorkflowContentPageContext
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = urlForensicsContentScript;
}

(function autoInitializeMergedLinkLabContentScript(globalScope) {
  initializeMergedLinkLabContentScript(globalScope);
}(typeof globalThis !== "undefined" ? globalThis : this));
