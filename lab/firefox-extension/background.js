// Function: initialize merged link lab background script.
(function initializeMergedLinkLabBackgroundScript() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : chrome;

  // Branch: follow this path only when the current condition passes.
  if (!extensionApi || !extensionApi.action || !extensionApi.tabs || !extensionApi.runtime) {
    return;
  }

  const backgroundState = {
    activeTabIdByWindowId: new Map(),
    detectedEmailByTabId: new Map(),
    focusedWindowId: null
  };
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;
  const debugRedaction = typeof globalThis !== "undefined" && globalThis.urlForensicsDebugRedaction
    ? globalThis.urlForensicsDebugRedaction
    : {
        sanitizeDetails: function sanitizeDebugDetailsFailClosed() {
          return "[debug redaction helper unavailable]";
        }
      };
  const debugLevels = {
    off: 0,
    error: 1,
    info: 2,
    verbose: 3,
    trace: 4
  };
  const defaultDebugCategories = {
    error: true,
    runtime: true,
    storage: true,
    messaging: true,
    ui: true,
    pipeline: true,
    function: false,
    conditional: false,
    loop: false,
    variable: false
  };
  const debugStorageKey = "programDebugConfig";
  const debugPayloadDefaultEventLimit = 10000;
  const debugState = {
    nextId: 1,
    maxEvents: 100000,
    events: [],
    droppedEventCount: 0,
    lastCollectorError: "",
    config: {
      level: "off",
      categories: Object.assign({}, defaultDebugCategories)
    }
  };

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "background", module: "background" });
  }

  // Function: normalize debug config.
  function normalizeDebugConfig(config) {
    const safeConfig = config && typeof config === "object" ? config : {};
    const nextLevel = Object.prototype.hasOwnProperty.call(debugLevels, safeConfig.level)
      ? safeConfig.level
      : debugState.config.level;
    const nextCategories = Object.assign({}, debugState.config.categories);
    const candidateCategories = safeConfig.categories && typeof safeConfig.categories === "object" ? safeConfig.categories : {};

    Object.keys(defaultDebugCategories).forEach(function normalizeDebugCategory(categoryName) {
      if (Object.prototype.hasOwnProperty.call(candidateCategories, categoryName)) {
        nextCategories[categoryName] = candidateCategories[categoryName] === true;
      }
    });

    nextCategories.error = true;

    return {
      level: nextLevel,
      categories: nextCategories
    };
  }

  // Function: should record debug event.
  function shouldRecordDebugEvent(event) {
    const safeEvent = event && typeof event === "object" ? event : {};
    const eventLevel = Object.prototype.hasOwnProperty.call(debugLevels, safeEvent.level) ? safeEvent.level : "info";
    const eventCategory = Object.prototype.hasOwnProperty.call(defaultDebugCategories, safeEvent.category)
      ? safeEvent.category
      : "runtime";

    if (debugState.config.level === "off") {
      return false;
    }

    if (debugLevels[eventLevel] > debugLevels[debugState.config.level]) {
      return false;
    }

    return eventCategory === "error" || debugState.config.categories[eventCategory] === true;
  }

  // Function: record debug event.
  function recordDebugEvent(event, sender) {
    const safeEvent = event && typeof event === "object" ? event : {};
    const senderTab = sender && sender.tab ? sender.tab : null;
    const nextEvent = {
      id: debugState.nextId,
      timestamp: Number.isFinite(safeEvent.timestamp) ? safeEvent.timestamp : Date.now(),
      level: Object.prototype.hasOwnProperty.call(debugLevels, safeEvent.level) ? safeEvent.level : "info",
      category: Object.prototype.hasOwnProperty.call(defaultDebugCategories, safeEvent.category) ? safeEvent.category : "runtime",
      context: String(safeEvent.context || (senderTab ? "content-script" : "extension")),
      module: String(safeEvent.module || "unknown"),
      message: String(safeEvent.message || ""),
      details: debugRedaction.sanitizeDetails(safeEvent.details || {}, 0),
      tabId: senderTab && senderTab.id ? senderTab.id : null,
      url: senderTab && senderTab.url ? senderTab.url : ""
    };

    debugState.nextId += 1;

    if (!shouldRecordDebugEvent(nextEvent)) {
      return { ok: true, recorded: false };
    }

    try {
      if (debugState.events.length >= debugState.maxEvents) {
        const removeCount = Math.max(1, debugState.events.length - debugState.maxEvents + 1);
        debugState.events.splice(0, removeCount);
        debugState.droppedEventCount += removeCount;
      }

      debugState.events.push(nextEvent);
    } catch (error) {
      const errorMessage = error && error.message ? error.message : "unknown debug collector error";
      debugState.droppedEventCount += 1;
      debugState.lastCollectorError = errorMessage;

      try {
        const recoveryTrimCount = Math.max(1, Math.ceil(debugState.events.length / 4));
        debugState.events.splice(0, recoveryTrimCount);
        debugState.droppedEventCount += recoveryTrimCount;
      } catch {
        debugState.events = [];
      }

      return {
        ok: false,
        recorded: false,
        dropped: true,
        poolFull: true,
        error: errorMessage
      };
    }

    return { ok: true, recorded: true, id: nextEvent.id };
  }

  // Function: get debug state payload.
  function getDebugStatePayload(options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const eventCount = debugState.events.length;
    const requestedEventLimit = Number(optionBag.eventLimit);
    const eventLimit = optionBag.includeAllEvents === true
      ? eventCount
      : Math.min(
        debugState.maxEvents,
        Number.isFinite(requestedEventLimit) && requestedEventLimit > 0
          ? Math.floor(requestedEventLimit)
          : debugPayloadDefaultEventLimit
      );
    const events = debugState.events.slice(Math.max(0, eventCount - eventLimit));

    return {
      ok: true,
      config: {
        level: debugState.config.level,
        categories: Object.assign({}, debugState.config.categories)
      },
      events: events,
      eventCount: eventCount,
      returnedEventCount: events.length,
      isTruncated: events.length < eventCount,
      isPoolFull: eventCount >= debugState.maxEvents,
      droppedEventCount: debugState.droppedEventCount,
      lastCollectorError: debugState.lastCollectorError,
      maxEvents: debugState.maxEvents,
      availableLevels: Object.keys(debugLevels),
      availableCategories: Object.keys(defaultDebugCategories)
    };
  }

  // Function: persist debug config choices only.
  async function persistDebugConfig(config) {
    if (!extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.set !== "function") {
      return;
    }

    await extensionApi.storage.local.set({
      [debugStorageKey]: {
        level: config.level,
        categories: Object.assign({}, config.categories)
      }
    });
  }

  // Function: load persisted debug config choices.
  async function loadPersistedDebugConfig() {
    if (!extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      return;
    }

    const storedDebugSettings = await extensionApi.storage.local.get(debugStorageKey);
    const storedDebugConfig = storedDebugSettings ? storedDebugSettings[debugStorageKey] : null;
    if (storedDebugConfig && typeof storedDebugConfig === "object") {
      debugState.config = normalizeDebugConfig(storedDebugConfig);
    }
  }

  // Function: set debug config.
  async function setDebugConfig(config, options) {
    debugState.config = normalizeDebugConfig(config);
    debugLog("runtime", "info", "debug config updated", {
      level: debugState.config.level,
      enabledCategories: Object.keys(debugState.config.categories).filter(function keepEnabledDebugCategory(categoryName) {
        return debugState.config.categories[categoryName] === true;
      }).join(",")
    });
    await persistDebugConfig(debugState.config);
    return getDebugStatePayload(options);
  }

  // Function: clear debug events.
  function clearDebugEvents(options) {
    debugState.events = [];
    debugState.droppedEventCount = 0;
    debugState.lastCollectorError = "";
    return getDebugStatePayload(options);
  }

  // Function: emit local background debug event.
  function debugLog(category, level, message, details) {
    return recordDebugEvent({
      timestamp: Date.now(),
      level: level,
      category: category,
      context: "background",
      module: "background",
      message: message,
      details: details || {}
    }, null);
  }

  // Function: respond to runtime message.
  function respondToRuntimeMessage(response, sendResponse) {
    if (typeof sendResponse === "function") {
      sendResponse(response);
      return true;
    }

    return Promise.resolve(response);
  }

  // Function: respond to runtime message promise.
  function respondToRuntimeMessagePromise(responsePromise, sendResponse) {
    if (typeof sendResponse === "function") {
      Promise.resolve(responsePromise)
        .then(function sendRuntimeMessageResponse(response) {
          sendResponse(response);
        })
        .catch(function sendRuntimeMessageError(error) {
          sendResponse({
            ok: false,
            error: error && error.message ? error.message : "unknown error"
          });
        });
      return true;
    }

    return Promise.resolve(responsePromise);
  }

  // Function: remember whether tab has detected email.
  function rememberWhetherTabHasDetectedEmail(tabId, hasDetectedEmail) {
    // Branch: follow this path only when the current condition passes.
    if (!tabId) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (hasDetectedEmail) {
      backgroundState.detectedEmailByTabId.set(tabId, true);
      debugLog("runtime", "info", "tab marked with detected email", { tabId: tabId });
      return;
    }

    backgroundState.detectedEmailByTabId.delete(tabId);
    debugLog("runtime", "info", "tab email detection cleared", { tabId: tabId });
  }

  // Function: forget tab.
  function forgetTab(tabId) {
    // Branch: follow this path only when the current condition passes.
    if (!tabId) {
      return;
    }

    backgroundState.detectedEmailByTabId.delete(tabId);
    debugLog("runtime", "info", "tab forgotten", { tabId: tabId });

    // Loop: iterate through each item in the current collection.
    backgroundState.activeTabIdByWindowId.forEach(function forgetRemovedTab(activeTabId, windowId) {
      // Branch: follow this path only when the current condition passes.
      if (activeTabId === tabId) {
        backgroundState.activeTabIdByWindowId.delete(windowId);
        debugLog("loop", "trace", "removed active tab mapping for closed tab", { tabId: tabId, windowId: windowId });
      }
    });
  }

  // Function: remember active tab.
  function rememberActiveTab(tabId, windowId) {
    // Branch: follow this path only when the current condition passes.
    if (!tabId || windowId === null || typeof windowId === "undefined") {
      return;
    }

    backgroundState.activeTabIdByWindowId.set(windowId, tabId);
    debugLog("variable", "trace", "active tab mapping assigned", { windowId: windowId, tabId: tabId });
  }

  // Function: get focused window id.
  function getFocusedWindowId() {
    // Branch: follow this path only when the current condition passes.
    if (backgroundState.focusedWindowId !== null && typeof backgroundState.focusedWindowId !== "undefined") {
      return backgroundState.focusedWindowId;
    }

    const firstKnownWindowEntry = backgroundState.activeTabIdByWindowId.keys().next();
    return firstKnownWindowEntry.done ? null : firstKnownWindowEntry.value;
  }

  // Function: get active tab id for focused window.
  function getActiveTabIdForFocusedWindow() {
    const focusedWindowId = getFocusedWindowId();
    // Branch: follow this path only when the current condition passes.
    if (focusedWindowId === null || typeof focusedWindowId === "undefined") {
      return null;
    }

    return backgroundState.activeTabIdByWindowId.get(focusedWindowId) || null;
  }

  // Function: active tab has detected email.
  function activeTabHasDetectedEmail() {
    const activeTabId = getActiveTabIdForFocusedWindow();
    return activeTabId ? !!backgroundState.detectedEmailByTabId.get(activeTabId) : false;
  }

  // Function: open settings page.
  async function openSettingsPage() {
    // Branch: try the primary operation before handling failures.
    try {
      // Branch: follow this path only when the current condition passes.
      if (typeof extensionApi.runtime.openOptionsPage === "function") {
        await extensionApi.runtime.openOptionsPage();
        return { ok: true };
      }

      // Branch: follow this path only when the current condition passes.
      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function" && typeof extensionApi.runtime.getURL === "function") {
        await extensionApi.tabs.create({
          url: extensionApi.runtime.getURL("settings.html")
        });
        return { ok: true };
      }
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      console.error("URL Forensics Workbench could not open the settings page.", error);
      return {
        ok: false,
        error: error && error.message ? error.message : "unknown error"
      };
    }

    return {
      ok: false,
      error: "settings page is unavailable"
    };
  }

  // Function: sync toolbar button title.
  function syncToolbarButtonTitle() {
    // Branch: follow this path only when the current condition passes.
    if (!extensionApi.action || typeof extensionApi.action.setTitle !== "function") {
      return;
    }

    const nextToolbarTitle = activeTabHasDetectedEmail()
      ? "Open URL Forensics Workbench popup for controls, the settings hub, and the in-page helper."
      : "Open URL Forensics Workbench popup. Use Settings for Diagnostics, Debugging, Storage, and Help.";

    // Branch: try the primary operation before handling failures.
    try {
      const maybePromise = extensionApi.action.setTitle({ title: nextToolbarTitle });
      // Branch: follow this path only when the current condition passes.
      if (maybePromise && typeof maybePromise.catch === "function") {
        // Function: ignore action title errors.
        maybePromise.catch(function ignoreActionTitleErrors() {});
      }
    // Branch: handle errors from the guarded operation.
    } catch {
      return;
    }
  }

  // Function: get runtime message type.
  function getRuntimeMessageType(message) {
    return message && message.type ? String(message.type) : "";
  }

  // Function: create debug test event.
  function createDebugTestEvent(message) {
    return {
      timestamp: Date.now(),
      level: "info",
      category: "runtime",
      context: "debugging-page",
      module: "debug-test",
      message: "program debug test event",
      details: {
        source: message.source || "unknown",
        adjustedConfig: message.adjustedConfig === true
      }
    };
  }

  // Function: handle debug runtime message.
  function handleDebugRuntimeMessage(message, sender, sendResponse) {
    const messageType = getRuntimeMessageType(message);

    if (messageType === "merged-link-lab:debug-event") {
      return respondToRuntimeMessage(recordDebugEvent(message.event, sender), sendResponse);
    }

    if (messageType === "merged-link-lab:debug:get-state") {
      return respondToRuntimeMessage(getDebugStatePayload(message), sendResponse);
    }

    if (messageType === "merged-link-lab:debug:set-config") {
      return respondToRuntimeMessagePromise(setDebugConfig(message.config, message), sendResponse);
    }

    if (messageType === "merged-link-lab:debug:test") {
      return respondToRuntimeMessage(recordDebugEvent(createDebugTestEvent(message), sender), sendResponse);
    }

    if (messageType === "merged-link-lab:debug:clear") {
      return respondToRuntimeMessage(clearDebugEvents(message), sendResponse);
    }

    return null;
  }

  // Function: log runtime message receipt.
  function logRuntimeMessageReceipt(message, sender) {
    debugLog("messaging", "info", "runtime message received", {
      type: getRuntimeMessageType(message) || "unknown",
      hasSenderTab: !!(sender && sender.tab && sender.tab.id)
    });
  }

  // Function: handle settings page runtime message.
  function handleSettingsPageRuntimeMessage(message, sendResponse) {
    if (getRuntimeMessageType(message) !== "merged-link-lab:open-settings-page") {
      return null;
    }

    return respondToRuntimeMessagePromise(openSettingsPage(), sendResponse);
  }

  // Function: remember active sender tab if needed.
  function rememberActiveSenderTabIfNeeded(sender) {
    if (sender && sender.tab && sender.tab.id && sender.tab.active) {
      rememberActiveTab(sender.tab.id, sender.tab.windowId);
    }
  }

  // Function: handle email state runtime message.
  function handleEmailStateRuntimeMessage(message, sender) {
    const senderTabId = sender && sender.tab ? sender.tab.id : null;
    const messageType = getRuntimeMessageType(message);

    if (!senderTabId) {
      return;
    }

    rememberActiveSenderTabIfNeeded(sender);

    if (messageType === "merged-link-lab:email-snapshot") {
      rememberWhetherTabHasDetectedEmail(senderTabId, true);
      syncToolbarButtonTitle();
      return;
    }

    if (messageType === "merged-link-lab:email-cleared") {
      rememberWhetherTabHasDetectedEmail(senderTabId, false);
      syncToolbarButtonTitle();
    }
  }

  // Function: handle tab activated.
  extensionApi.tabs.onActivated.addListener(function handleTabActivated(activeInfo) {
    // Branch: follow this path only when the current condition passes.
    if (!activeInfo) {
      return;
    }

    rememberActiveTab(activeInfo.tabId, activeInfo.windowId);
    syncToolbarButtonTitle();
  });

  // Function: handle tab updated.
  extensionApi.tabs.onUpdated.addListener(function handleTabUpdated(tabId, changeInfo, tab) {
    // Branch: follow this path only when the current condition passes.
    if (!tabId) {
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (tab && tab.active) {
      rememberActiveTab(tabId, tab.windowId);
    }

    // Branch: follow this path only when the current condition passes.
    if (changeInfo && (changeInfo.status === "loading" || changeInfo.url)) {
      rememberWhetherTabHasDetectedEmail(tabId, false);
    }

    syncToolbarButtonTitle();
  });

  // Function: handle tab removed.
  extensionApi.tabs.onRemoved.addListener(function handleTabRemoved(tabId) {
    forgetTab(tabId);
    syncToolbarButtonTitle();
  });

  // Branch: follow this path only when the current condition passes.
  if (extensionApi.windows && extensionApi.windows.onFocusChanged) {
    // Function: handle window focus changed.
    extensionApi.windows.onFocusChanged.addListener(function handleWindowFocusChanged(windowId) {
      backgroundState.focusedWindowId = windowId;
      syncToolbarButtonTitle();
    });
  }

  // Function: handle runtime message.
  extensionApi.runtime.onMessage.addListener(function handleRuntimeMessage(message, sender, sendResponse) {
    const debugResponse = handleDebugRuntimeMessage(message, sender, sendResponse);

    if (debugResponse !== null) {
      return debugResponse;
    }

    logRuntimeMessageReceipt(message, sender);

    const settingsResponse = handleSettingsPageRuntimeMessage(message, sendResponse);

    if (settingsResponse !== null) {
      return settingsResponse;
    }

    handleEmailStateRuntimeMessage(message, sender);
    return undefined;
  });

  // Function: bootstrap background state.
  (async function bootstrapBackgroundState() {
    try {
      await loadPersistedDebugConfig();
    } catch (error) {
      console.error("URL Forensics Workbench could not load debug choices.", error);
    }

    // Branch: try the primary operation before handling failures.
    try {
      const allWindows = extensionApi.windows && typeof extensionApi.windows.getAll === "function"
        ? await extensionApi.windows.getAll({ populate: true })
        : [];

      // Loop: iterate through each item in the current collection.
      allWindows.forEach(function rememberExistingWindow(windowInfo) {
        // Branch: follow this path only when the current condition passes.
        if (windowInfo && windowInfo.focused) {
          backgroundState.focusedWindowId = windowInfo.id;
        }

        // Loop: iterate through each item in the current collection.
        (windowInfo && windowInfo.tabs ? windowInfo.tabs : []).forEach(function rememberExistingActiveTab(tab) {
          // Branch: follow this path only when the current condition passes.
          if (tab && tab.active) {
            rememberActiveTab(tab.id, tab.windowId);
          }
        });
      });
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      console.error("URL Forensics Workbench could not initialize Firefox tab state.", error);
    }

    syncToolbarButtonTitle();
  })();
})();
