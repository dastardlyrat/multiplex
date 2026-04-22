"use strict";

function urlForensicsContentRuntimeLifecycleResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsContentRuntimeLifecycleCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    extensionApi: optionBag.extensionApi && typeof optionBag.extensionApi === "object" ? optionBag.extensionApi : null,
    debugApi: optionBag.debugApi && typeof optionBag.debugApi === "object" ? optionBag.debugApi : null,
    mutationObserverClass: typeof optionBag.mutationObserverClass === "function" ? optionBag.mutationObserverClass : null,
    scheduleSnapshotSync: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.scheduleSnapshotSync,
      function scheduleMissingSnapshotSync() {
        return 0;
      }
    ),
    syncEmailSnapshot: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.syncEmailSnapshot,
      function syncMissingEmailSnapshot() {
        return false;
      }
    ),
    togglePaneVisibility: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.togglePaneVisibility,
      function toggleMissingPaneVisibility() {
        return {
          ok: false,
          hasSnapshot: false,
          visible: false,
          expanded: false
        };
      }
    ),
    openPaneVisibility: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.openPaneVisibility,
      function openMissingPaneVisibility() {
        return {
          ok: false,
          hasSnapshot: false,
          visible: false,
          expanded: false
        };
      }
    ),
    shouldAllowOpenWithoutSnapshot: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.shouldAllowOpenWithoutSnapshot,
      function shouldDisallowOpenWithoutSnapshot() {
        return false;
      }
    ),
    applyRewriteToEmailBody: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.applyRewriteToEmailBody,
      async function applyMissingRewriteToEmailBody() {
        return { ok: false, applied: false };
      }
    ),
    getLatestSnapshot: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.getLatestSnapshot,
      function getMissingLatestSnapshot() {
        return null;
      }
    ),
    loadPipelineSettings: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.loadPipelineSettings,
      async function loadMissingPipelineSettings() {
        return null;
      }
    ),
    handlePipelineStorageChange: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.handlePipelineStorageChange,
      function handleMissingPipelineStorageChange() {
        return false;
      }
    ),
    syncPageViewportReservation: urlForensicsContentRuntimeLifecycleResolveFunction(
      optionBag.syncPageViewportReservation,
      function syncMissingPageViewportReservation() {}
    )
  });
}

function urlForensicsContentRuntimeLifecycleDebugCall(debugApi, methodName, message, payload) {
  if (debugApi && typeof debugApi.isMethodEnabled === "function" && debugApi.isMethodEnabled(methodName) !== true) {
    return;
  }

  if (debugApi && typeof debugApi[methodName] === "function") {
    debugApi[methodName](message, payload);
  }
}

function urlForensicsContentRuntimeLifecycleHandleRuntimeMessage(message, options) {
  urlForensicsContentRuntimeLifecycleDebugCall(options.debugApi, "messaging", "content runtime message received", {
    type: message && message.type ? message.type : "unknown"
  });

  if (!message) {
    return undefined;
  }

  if (message.type === "merged-link-lab:get-email-snapshot") {
    if (!options.getLatestSnapshot()) {
      options.syncEmailSnapshot();
    }

    return Promise.resolve({
      snapshot: options.getLatestSnapshot()
    });
  }

  if (message.type === "merged-link-lab:toggle-page-pane") {
    if (!options.getLatestSnapshot()) {
      options.syncEmailSnapshot();
    }

    return Promise.resolve(options.togglePaneVisibility());
  }

  if (message.type === "merged-link-lab:open-page-pane") {
    if (!options.getLatestSnapshot()) {
      options.syncEmailSnapshot();

      if (!options.getLatestSnapshot() && options.shouldAllowOpenWithoutSnapshot() !== true) {
        return Promise.resolve({
          ok: false,
          hasSnapshot: false,
          visible: false,
          expanded: false
        });
      }
    }

    return Promise.resolve(options.openPaneVisibility());
  }

  if (message.type === "merged-link-lab:apply-rewritten-email") {
    return Promise.resolve(options.applyRewriteToEmailBody());
  }

  return undefined;
}

function urlForensicsContentRuntimeLifecycleRegisterStorageListener(options) {
  if (
    !options.extensionApi ||
    !options.extensionApi.storage ||
    !options.extensionApi.storage.onChanged ||
    typeof options.extensionApi.storage.onChanged.addListener !== "function"
  ) {
    return false;
  }

  options.extensionApi.storage.onChanged.addListener(options.handlePipelineStorageChange);
  return true;
}

function urlForensicsContentRuntimeLifecycleRegisterRuntimeListener(runtimeMessageHandler, options) {
  if (
    !options.extensionApi ||
    !options.extensionApi.runtime ||
    !options.extensionApi.runtime.onMessage ||
    typeof options.extensionApi.runtime.onMessage.addListener !== "function"
  ) {
    return false;
  }

  options.extensionApi.runtime.onMessage.addListener(runtimeMessageHandler);
  return true;
}

function urlForensicsContentRuntimeLifecycleRegisterPageEvents(options) {
  function scheduleFromEvent() {
    return options.scheduleSnapshotSync();
  }

  if (options.documentObject && typeof options.documentObject.addEventListener === "function") {
    options.documentObject.addEventListener("visibilitychange", function handleContentVisibilityChange() {
      scheduleFromEvent();
    }, true);
    options.documentObject.addEventListener("click", function handleContentDocumentClick() {
      scheduleFromEvent();
    }, true);
  }

  if (!options.windowObject || typeof options.windowObject.addEventListener !== "function") {
    return;
  }

  [
    "focus",
    "load",
    "pageshow",
    "popstate",
    "hashchange"
  ].forEach(function registerWindowEvent(eventName) {
    options.windowObject.addEventListener(eventName, function handleContentWindowEvent() {
      scheduleFromEvent();
    }, true);
  });
  options.windowObject.addEventListener("resize", options.syncPageViewportReservation, true);
}

function urlForensicsContentRuntimeLifecycleCreateDocumentObserver(options) {
  const observedTarget = options.documentObject
    ? (options.documentObject.documentElement || options.documentObject)
    : null;

  if (!options.mutationObserverClass || !observedTarget) {
    return null;
  }

  const documentObserver = new options.mutationObserverClass(function handleContentRuntimeMutation() {
    options.scheduleSnapshotSync();
  });

  documentObserver.observe(observedTarget, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden", "role", "data-message-id"]
  });
  return documentObserver;
}

function urlForensicsContentRuntimeLifecycleInstallHistoryNavigationSync(state, options) {
  if (state.historyWrapped || !options.windowObject || !options.windowObject.history) {
    return false;
  }

  ["pushState", "replaceState"].forEach(function wrapHistoryMethod(methodName) {
    const originalMethod = options.windowObject.history[methodName];

    if (typeof originalMethod !== "function") {
      return;
    }

    options.windowObject.history[methodName] = function wrappedHistoryMethod() {
      const result = originalMethod.apply(this, arguments);

      options.scheduleSnapshotSync();
      return result;
    };
  });
  state.historyWrapped = true;
  return true;
}

function urlForensicsContentRuntimeLifecycleInstallSnapshotRetryPolling(state, options) {
  if (
    state.snapshotRetryPollingInstalled ||
    !options.windowObject ||
    typeof options.windowObject.setInterval !== "function"
  ) {
    return false;
  }

  state.snapshotRetryPollingInstalled = true;
  state.snapshotRetryTimer = options.windowObject.setInterval(function retrySnapshotSyncUntilDetected() {
    if (options.getLatestSnapshot()) {
      return;
    }

    options.scheduleSnapshotSync();
  }, 2000);
  return true;
}

function urlForensicsContentRuntimeLifecycleCreate(options) {
  const resolvedOptions = urlForensicsContentRuntimeLifecycleCreateDefaultOptions(options);
  const state = {
    documentObserver: null,
    historyWrapped: false,
    initialized: false,
    runtimeMessageHandler: null,
    snapshotRetryPollingInstalled: false,
    snapshotRetryTimer: 0
  };

  state.runtimeMessageHandler = function handleRuntimeMessage(message) {
    return urlForensicsContentRuntimeLifecycleHandleRuntimeMessage(message, resolvedOptions);
  };

  async function initialize() {
    if (state.initialized) {
      return {
        alreadyInitialized: true,
        hasObserver: !!state.documentObserver,
        historyWrapped: state.historyWrapped,
        initialized: false
      };
    }

    state.initialized = true;
    urlForensicsContentRuntimeLifecycleRegisterStorageListener({
      extensionApi: resolvedOptions.extensionApi,
      handlePipelineStorageChange: resolvedOptions.handlePipelineStorageChange
    });
    urlForensicsContentRuntimeLifecycleRegisterRuntimeListener(state.runtimeMessageHandler, resolvedOptions);
    urlForensicsContentRuntimeLifecycleRegisterPageEvents(resolvedOptions);
    state.documentObserver = urlForensicsContentRuntimeLifecycleCreateDocumentObserver(resolvedOptions);
    urlForensicsContentRuntimeLifecycleInstallHistoryNavigationSync(state, resolvedOptions);
    urlForensicsContentRuntimeLifecycleInstallSnapshotRetryPolling(state, resolvedOptions);
    await Promise.resolve(resolvedOptions.loadPipelineSettings()).finally(function finalizeLifecycleInitialization() {
      resolvedOptions.scheduleSnapshotSync();
    });

    return {
      alreadyInitialized: false,
      hasObserver: !!state.documentObserver,
      historyWrapped: state.historyWrapped,
      snapshotRetryPollingInstalled: state.snapshotRetryPollingInstalled,
      initialized: true
    };
  }

  return Object.freeze({
    getDocumentObserver: function getDocumentObserver() {
      return state.documentObserver;
    },
    handleRuntimeMessage: state.runtimeMessageHandler,
    initialize: initialize,
    installHistoryNavigationSync: function installHistoryNavigationSync() {
      return urlForensicsContentRuntimeLifecycleInstallHistoryNavigationSync(state, resolvedOptions);
    }
  });
}

(function attachUrlForensicsContentRuntimeLifecycle(globalScope) {
  const contentRuntimeLifecycle = Object.freeze({
    create: urlForensicsContentRuntimeLifecycleCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentRuntimeLifecycle;
  }

  if (globalScope) {
    globalScope.urlForensicsContentRuntimeLifecycle = contentRuntimeLifecycle;
  }
 }(typeof globalThis !== "undefined" ? globalThis : this));
