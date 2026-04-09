"use strict";

function urlForensicsEmailSnapshotSyncResolveObject(candidateValue, fallbackValue) {
  return candidateValue && typeof candidateValue === "object" ? candidateValue : fallbackValue;
}

function urlForensicsEmailSnapshotSyncResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsEmailSnapshotSyncBuildCoreOptions(optionBag) {
  return {
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    debugApi: urlForensicsEmailSnapshotSyncResolveObject(optionBag.debugApi, null),
    syncDelayMs: Number.isFinite(optionBag.syncDelayMs) && optionBag.syncDelayMs >= 0
      ? optionBag.syncDelayMs
      : 150,
    isPageCurrentlyVisible: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.isPageCurrentlyVisible,
      function isMissingPageCurrentlyVisible() {
        return true;
      }
    ),
    getCurrentLocationHref: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getCurrentLocationHref,
      function getMissingCurrentLocationHref() {
        return "";
      }
    ),
    getInboxRootCandidates: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getInboxRootCandidates,
      function getMissingInboxRootCandidates() {
        return [];
      }
    ),
    getInboxDetectionFailure: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getInboxDetectionFailure,
      function getMissingInboxDetectionFailure() {
        return null;
      }
    ),
    observeEmailRoot: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.observeEmailRoot,
      function observeMissingEmailRoot() {}
    ),
    choosePrimaryEmailCandidate: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.choosePrimaryEmailCandidate,
      function chooseMissingPrimaryEmailCandidate() {
        return null;
      }
    ),
    getCandidateMissingGraceWindow: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getCandidateMissingGraceWindow,
      function getMissingCandidateGraceWindow() {
        return 0;
      }
    ),
    cleanInputText: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.cleanInputText,
      function cleanMissingInputText(value) {
        return String(value || "").trim();
      }
    ),
    summarizeEmailRoot: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.summarizeEmailRoot,
      function summarizeMissingEmailRoot() {
        return null;
      }
    ),
    createSnapshotSignature: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.createSnapshotSignature,
      function createMissingSnapshotSignature(snapshot) {
        return JSON.stringify(snapshot || null);
      }
    ),
    publishSnapshot: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.publishSnapshot,
      function publishMissingSnapshot() {}
    ),
    publishClear: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.publishClear,
      function publishMissingClear() {}
    ),
    renderEmptyPaneState: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.renderEmptyPaneState,
      function renderMissingEmptyPaneState() {}
    )
  };
}

function urlForensicsEmailSnapshotSyncBuildStateOptions(optionBag) {
  return {
    getLatestSnapshot: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getLatestSnapshot,
      function getMissingLatestSnapshot() {
        return null;
      }
    ),
    getLastPublishedSnapshotSignature: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getLastPublishedSnapshotSignature,
      function getMissingLastPublishedSnapshotSignature() {
        return "";
      }
    ),
    getLatestDetectedEmailRoot: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getLatestDetectedEmailRoot,
      function getMissingLatestDetectedEmailRoot() {
        return null;
      }
    ),
    setLatestDetectedEmailRoot: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.setLatestDetectedEmailRoot,
      function setMissingLatestDetectedEmailRoot() {}
    ),
    getLatestDetectedEmailMode: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getLatestDetectedEmailMode,
      function getMissingLatestDetectedEmailMode() {
        return "";
      }
    ),
    setLatestDetectedEmailMode: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.setLatestDetectedEmailMode,
      function setMissingLatestDetectedEmailMode() {}
    ),
    getLatestInboxCandidateSeenAt: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getLatestInboxCandidateSeenAt,
      function getMissingLatestInboxCandidateSeenAt() {
        return 0;
      }
    ),
    setLatestInboxCandidateSeenAt: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.setLatestInboxCandidateSeenAt,
      function setMissingLatestInboxCandidateSeenAt() {}
    ),
    getInboxCandidateMissingSince: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getInboxCandidateMissingSince,
      function getMissingInboxCandidateMissingSince() {
        return 0;
      }
    ),
    setInboxCandidateMissingSince: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.setInboxCandidateMissingSince,
      function setMissingInboxCandidateMissingSince() {}
    ),
    getLastObservedLocationHref: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.getLastObservedLocationHref,
      function getMissingLastObservedLocationHref() {
        return "";
      }
    ),
    setLastObservedLocationHref: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.setLastObservedLocationHref,
      function setMissingLastObservedLocationHref() {}
    ),
    resetLatestEmailDetectionState: urlForensicsEmailSnapshotSyncResolveFunction(
      optionBag.resetLatestEmailDetectionState,
      function resetMissingLatestEmailDetectionState() {}
    )
  };
}

function urlForensicsEmailSnapshotSyncCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsEmailSnapshotSyncBuildCoreOptions(optionBag),
    urlForensicsEmailSnapshotSyncBuildStateOptions(optionBag)
  ));
}

function urlForensicsEmailSnapshotSyncDebugCall(debugApi, methodName, message, payload) {
  if (debugApi && typeof debugApi[methodName] === "function") {
    debugApi[methodName](message, payload);
  }
}

function urlForensicsEmailSnapshotSyncHandleLocationChange(currentLocationHref, options) {
  const hasLocationChanged = currentLocationHref !== options.getLastObservedLocationHref();

  if (!hasLocationChanged) {
    return false;
  }

  options.setLastObservedLocationHref(currentLocationHref);
  options.resetLatestEmailDetectionState();
  urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "conditional", "content observed location changed", {
    forcePublish: true
  });
  return true;
}

function urlForensicsEmailSnapshotSyncObserveCandidates(inboxRootCandidates, options) {
  urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "variable", "content inbox candidate count assigned", {
    candidateCount: inboxRootCandidates.length
  });

  inboxRootCandidates.forEach(function observeCandidate(candidate) {
    if (options.debugApi && candidate) {
      urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "loop", "content observing inbox candidate", {
        detectionMode: candidate.detectionMode || "",
        score: candidate.score || 0
      });
    }

    options.observeEmailRoot(candidate.root);
  });
}

function urlForensicsEmailSnapshotSyncShouldWaitForMissingCandidateGrace(syncStartedAt, missingGraceWindow, options) {
  if (!options.getInboxCandidateMissingSince()) {
    options.setInboxCandidateMissingSince(syncStartedAt);
  }

  const missingSince = options.getInboxCandidateMissingSince() || syncStartedAt;
  const latestSnapshot = options.getLatestSnapshot();
  const missingDuration = syncStartedAt - missingSince;
  const latestInboxCandidateSeenAt = options.getLatestInboxCandidateSeenAt();
  const hasRecentCandidate =
    latestInboxCandidateSeenAt > 0 && (syncStartedAt - latestInboxCandidateSeenAt) <= missingGraceWindow;
  const hasRecentSnapshot =
    latestSnapshot &&
    latestSnapshot.detectedAt &&
    (syncStartedAt - Number(latestSnapshot.detectedAt || 0)) <= missingGraceWindow;

  return missingGraceWindow > 0 && (missingDuration <= missingGraceWindow || hasRecentCandidate || hasRecentSnapshot);
}

function urlForensicsEmailSnapshotSyncCanUseFallbackRoot(fallbackRoot, options) {
  if (!fallbackRoot || !fallbackRoot.isConnected || fallbackRoot.closest("#merged-link-lab-page-pane")) {
    return false;
  }

  const fallbackText = options.cleanInputText(fallbackRoot.innerText || fallbackRoot.textContent || "");
  const fallbackHasStructuredContent =
    typeof fallbackRoot.querySelector === "function" &&
    !!fallbackRoot.querySelector("a[href], p, div, span, table, li, br");

  return fallbackText.length >= 8 || fallbackHasStructuredContent;
}

function urlForensicsEmailSnapshotSyncTryPublishFallbackSnapshot(shouldForcePublish, scheduleSnapshotSync, options) {
  const fallbackRoot = options.getLatestDetectedEmailRoot();

  if (!urlForensicsEmailSnapshotSyncCanUseFallbackRoot(fallbackRoot, options)) {
    return false;
  }

  const fallbackSnapshot = options.summarizeEmailRoot(fallbackRoot, options.getLatestDetectedEmailMode());
  const fallbackSnapshotSignature = options.createSnapshotSignature(fallbackSnapshot);

  if (fallbackSnapshotSignature !== options.getLastPublishedSnapshotSignature() || shouldForcePublish) {
    options.publishSnapshot(fallbackSnapshot);
  }

  scheduleSnapshotSync();
  return true;
}

function urlForensicsEmailSnapshotSyncHandleMissingPrimaryCandidate(syncState, scheduleSnapshotSync, inboxDetectionFailure, options) {
  urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "conditional", "content no primary inbox candidate found", {
    hadLatestSnapshot: !!options.getLatestSnapshot(),
    failureKind: inboxDetectionFailure && inboxDetectionFailure.kind ? inboxDetectionFailure.kind : ""
  });

  if (options.getLatestSnapshot()) {
    if (syncState.hasLocationChanged) {
      options.publishClear();
      return;
    }

    const missingGraceWindow = options.getCandidateMissingGraceWindow();

    if (
      urlForensicsEmailSnapshotSyncShouldWaitForMissingCandidateGrace(
        syncState.startedAt,
        missingGraceWindow,
        options
      )
    ) {
      scheduleSnapshotSync();
      return;
    }

    if (
      urlForensicsEmailSnapshotSyncTryPublishFallbackSnapshot(
        syncState.shouldForcePublish,
        scheduleSnapshotSync,
        options
      )
    ) {
      return;
    }

    options.publishClear();
  }

  if (!options.getLatestSnapshot()) {
    options.renderEmptyPaneState();
  }

  urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "functionOut", "content.syncEmailSnapshot", {
    synced: false,
    reason: inboxDetectionFailure && inboxDetectionFailure.kind ? inboxDetectionFailure.kind : "no-primary-candidate"
  });
}

function urlForensicsEmailSnapshotSyncPreparePrimaryCandidateSnapshot(primaryInboxCandidate, syncState, options) {
  options.setInboxCandidateMissingSince(0);
  options.setLatestInboxCandidateSeenAt(syncState.startedAt);
  options.setLatestDetectedEmailRoot(primaryInboxCandidate.root);
  options.setLatestDetectedEmailMode(primaryInboxCandidate.detectionMode || "");

  return options.summarizeEmailRoot(primaryInboxCandidate.root, options.getLatestDetectedEmailMode());
}

function urlForensicsEmailSnapshotSyncPublishPrimaryCandidate(primaryInboxCandidate, syncState, options) {
  const nextSnapshot = urlForensicsEmailSnapshotSyncPreparePrimaryCandidateSnapshot(
    primaryInboxCandidate,
    syncState,
    options
  );
  const nextSnapshotSignature = options.createSnapshotSignature(nextSnapshot);

  if (nextSnapshotSignature === options.getLastPublishedSnapshotSignature() && !syncState.shouldForcePublish) {
    urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "conditional", "content snapshot unchanged; publish skipped");
    urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "functionOut", "content.syncEmailSnapshot", {
      synced: false,
      reason: "unchanged"
    });
    return false;
  }

  options.publishSnapshot(nextSnapshot);
  urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "runtime", "content snapshot published", {
    detectionMode: nextSnapshot.detectionMode || "",
    finalUrlCount: nextSnapshot.pipeline && nextSnapshot.pipeline.finalUrls ? nextSnapshot.pipeline.finalUrls.length : 0
  });
  urlForensicsEmailSnapshotSyncDebugCall(options.debugApi, "functionOut", "content.syncEmailSnapshot", {
    synced: true
  });
  return true;
}

function urlForensicsEmailSnapshotSyncCreate(options) {
  const resolvedOptions = urlForensicsEmailSnapshotSyncCreateDefaultOptions(options);
  const state = {
    scheduledSnapshotTimer: 0
  };
  const api = {
    scheduleSnapshotSync: function scheduleSnapshotSync() {
      if (!resolvedOptions.windowObject) {
        return 0;
      }

      if (typeof resolvedOptions.windowObject.clearTimeout === "function") {
        resolvedOptions.windowObject.clearTimeout(state.scheduledSnapshotTimer);
      }

      if (typeof resolvedOptions.windowObject.setTimeout === "function") {
        state.scheduledSnapshotTimer = resolvedOptions.windowObject.setTimeout(function triggerSnapshotSync() {
          api.syncEmailSnapshot();
        }, resolvedOptions.syncDelayMs);
      }

      return state.scheduledSnapshotTimer;
    },
    syncEmailSnapshot: function syncEmailSnapshot(options) {
      urlForensicsEmailSnapshotSyncDebugCall(resolvedOptions.debugApi, "functionIn", "content.syncEmailSnapshot", {
        forcePublish: !!(options && options.forcePublish)
      });

      const optionBag = options && typeof options === "object" ? options : {};
      const syncState = {
        shouldForcePublish: !!optionBag.forcePublish,
        startedAt: Date.now(),
        hasLocationChanged: false
      };

      if (!resolvedOptions.isPageCurrentlyVisible()) {
        urlForensicsEmailSnapshotSyncDebugCall(
          resolvedOptions.debugApi,
          "conditional",
          "content snapshot sync skipped: page not visible"
        );
        urlForensicsEmailSnapshotSyncDebugCall(resolvedOptions.debugApi, "functionOut", "content.syncEmailSnapshot", {
          synced: false
        });
        return false;
      }

      syncState.hasLocationChanged = urlForensicsEmailSnapshotSyncHandleLocationChange(
        resolvedOptions.getCurrentLocationHref(),
        resolvedOptions
      );

      if (syncState.hasLocationChanged) {
        syncState.shouldForcePublish = true;
      }

      const inboxRootCandidates = resolvedOptions.getInboxRootCandidates();
      urlForensicsEmailSnapshotSyncObserveCandidates(inboxRootCandidates, resolvedOptions);
      const inboxDetectionFailure = resolvedOptions.getInboxDetectionFailure(inboxRootCandidates);

      const primaryInboxCandidate = resolvedOptions.choosePrimaryEmailCandidate(inboxRootCandidates);

      if (!primaryInboxCandidate || !primaryInboxCandidate.root) {
        urlForensicsEmailSnapshotSyncHandleMissingPrimaryCandidate(
          syncState,
          api.scheduleSnapshotSync,
          inboxDetectionFailure,
          resolvedOptions
        );
        return false;
      }

      return urlForensicsEmailSnapshotSyncPublishPrimaryCandidate(
        primaryInboxCandidate,
        syncState,
        resolvedOptions
      );
    }
  };

  return Object.freeze(api);
}

(function attachUrlForensicsEmailSnapshotSync(globalScope) {
  const emailSnapshotSync = Object.freeze({
    create: urlForensicsEmailSnapshotSyncCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailSnapshotSync;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailSnapshotSync = emailSnapshotSync;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
