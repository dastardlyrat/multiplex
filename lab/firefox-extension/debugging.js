// Function: initialize URL Forensics Workbench debugging page.
(function initializeUrlForensicsDebuggingPage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const pageUi = globalThis.urlForensicsPageUi;
  const defaultDebugConfig = {
    level: "off",
    categories: {
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
    }
  };
  const pageChoicesStorageKey = "programDebugPageChoices";
  const maxVisibleRenderLimit = 10000;
  const debugState = {
    config: {
      level: defaultDebugConfig.level,
      categories: Object.assign({}, defaultDebugConfig.categories)
    },
    events: [],
    eventCount: 0,
    isTruncated: false,
    isPoolFull: false,
    droppedEventCount: 0,
    lastCollectorError: "",
    maxEvents: 0,
    renderLimit: 750,
    autoRefresh: true,
    isRefreshing: false
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    refreshDebugButton: document.getElementById("refreshDebugButton"),
    emitDebugTestButton: document.getElementById("emitDebugTestButton"),
    clearDebugButton: document.getElementById("clearDebugButton"),
    exportDebugButton: document.getElementById("exportDebugButton"),
    openDiagnosticsPageButton: document.getElementById("openDiagnosticsPageButton"),
    openStoragePageButton: document.getElementById("openStoragePageButton"),
    openSettingsPageButton: document.getElementById("openSettingsPageButton"),
    openHelpPageButton: document.getElementById("openHelpPageButton"),
    debugBadge: document.getElementById("debugBadge"),
    debugLevelSelect: document.getElementById("debugLevelSelect"),
    renderLimitSelect: document.getElementById("renderLimitSelect"),
    autoRefreshDebugOutput: document.getElementById("autoRefreshDebugOutput"),
    traceSummary: document.getElementById("traceSummary"),
    debugTrace: document.getElementById("debugTrace"),
    statusMessage: document.getElementById("statusMessage")
  };
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "debugging-page", module: "debugging" });
    debugApi.runtime("debugging page initialization started");
  }

  // Function: set status.
  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  // Function: set badge text.
  function setBadgeText(element, text) {
    pageUi.setBadgeText(element, text, "Unavailable");
  }

  // Function: format timestamp.
  function formatTimestamp(timestampValue) {
    return pageUi.formatTimestamp(timestampValue, { timeOnly: true });
  }

  // Function: send runtime message.
  async function sendRuntimeMessage(message) {
    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.sendMessage !== "function") {
      return null;
    }

    return extensionApi.runtime.sendMessage(message);
  }

  // Function: normalize visible render limit.
  function normalizeVisibleRenderLimit(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return 750;
    }

    return Math.min(maxVisibleRenderLimit, Math.floor(parsedValue));
  }

  // Function: load persisted page display choices.
  async function loadDebugPageChoices() {
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      return;
    }

    try {
      const storedChoices = await extensionApi.storage.local.get(pageChoicesStorageKey);
      const pageChoices = storedChoices ? storedChoices[pageChoicesStorageKey] : null;
      if (!pageChoices || typeof pageChoices !== "object") {
        return;
      }

      debugState.renderLimit = normalizeVisibleRenderLimit(pageChoices.renderLimit);

      if (pageChoices.autoRefresh === true || pageChoices.autoRefresh === false) {
        debugState.autoRefresh = pageChoices.autoRefresh;
      }
    } catch (error) {
      setStatus("Could not load debug page choices: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: persist page display choices.
  async function persistDebugPageChoices() {
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.set !== "function") {
      return;
    }

    try {
      await extensionApi.storage.local.set({
        [pageChoicesStorageKey]: {
          renderLimit: debugState.renderLimit,
          autoRefresh: debugState.autoRefresh
        }
      });
    } catch (error) {
      setStatus("Could not save debug page choices: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: apply debug state payload.
  function applyDebugStatePayload(payload) {
    const safePayload = payload && typeof payload === "object" ? payload : {};
    const safeConfig = safePayload.config && typeof safePayload.config === "object" ? safePayload.config : defaultDebugConfig;
    const safeCategories = safeConfig.categories && typeof safeConfig.categories === "object"
      ? safeConfig.categories
      : defaultDebugConfig.categories;

    debugState.config = {
      level: safeConfig.level || defaultDebugConfig.level,
      categories: Object.assign({}, defaultDebugConfig.categories, safeCategories)
    };
    debugState.config.categories.error = true;
    debugState.events = Array.isArray(safePayload.events) ? safePayload.events : [];
    debugState.eventCount = Number.isFinite(safePayload.eventCount) ? safePayload.eventCount : debugState.events.length;
    debugState.isTruncated = safePayload.isTruncated === true || debugState.events.length < debugState.eventCount;
    debugState.isPoolFull = safePayload.isPoolFull === true;
    debugState.droppedEventCount = Number.isFinite(safePayload.droppedEventCount) ? safePayload.droppedEventCount : 0;
    debugState.lastCollectorError = safePayload.lastCollectorError ? String(safePayload.lastCollectorError) : "";
    debugState.maxEvents = Number.isFinite(safePayload.maxEvents) ? safePayload.maxEvents : 0;
    renderDebugPage();
  }

  // Function: get enabled categories.
  function getEnabledCategoryNames(config) {
    const safeConfig = config && typeof config === "object" ? config : debugState.config;
    return Object.keys(safeConfig.categories).filter(function keepEnabledCategory(categoryName) {
      return safeConfig.categories[categoryName] === true;
    });
  }

  // Function: render debug controls.
  function renderDebugControls() {
    if (DOM.debugLevelSelect) {
      DOM.debugLevelSelect.value = debugState.config.level;
    }

    document.querySelectorAll("[data-debug-category]").forEach(function renderDebugCategoryCheckbox(checkbox) {
      const categoryName = checkbox.getAttribute("data-debug-category");
      const isChecked = debugState.config.categories[categoryName] === true;
      checkbox.checked = isChecked;
      checkbox.setAttribute("aria-checked", isChecked ? "true" : "false");
    });

    if (DOM.renderLimitSelect) {
      DOM.renderLimitSelect.value = String(normalizeVisibleRenderLimit(debugState.renderLimit));
    }

    if (DOM.autoRefreshDebugOutput) {
      DOM.autoRefreshDebugOutput.checked = debugState.autoRefresh === true;
      DOM.autoRefreshDebugOutput.setAttribute("aria-checked", debugState.autoRefresh === true ? "true" : "false");
    }
  }

  // Function: format debug event details.
  function formatDebugEventDetails(details) {
    if (!details || typeof details !== "object" || !Object.keys(details).length) {
      return "";
    }

    try {
      return JSON.stringify(details);
    } catch {
      return "[details unavailable]";
    }
  }

  // Function: append text cell.
  function appendTextCell(rowElement, className, text) {
    const cellElement = document.createElement("span");
    cellElement.className = className;
    cellElement.textContent = String(text || "");
    rowElement.appendChild(cellElement);
  }

  // Function: create debug event row.
  function createDebugEventRow(event) {
    const safeEvent = event && typeof event === "object" ? event : {};
    const rowElement = document.createElement("div");
    rowElement.className = "debug-row";
    rowElement.dataset.level = String(safeEvent.level || "info");
    rowElement.dataset.category = String(safeEvent.category || "runtime");

    appendTextCell(rowElement, "debug-time", formatTimestamp(safeEvent.timestamp));
    appendTextCell(rowElement, "debug-level", String(safeEvent.level || "info"));
    appendTextCell(rowElement, "debug-category", String(safeEvent.category || "runtime"));
    appendTextCell(
      rowElement,
      "debug-context",
      String(safeEvent.context || "extension") + "/" + String(safeEvent.module || "unknown")
    );
    appendTextCell(rowElement, "debug-message", String(safeEvent.message || ""));
    appendTextCell(rowElement, "debug-details", formatDebugEventDetails(safeEvent.details));

    return rowElement;
  }

  // Function: render trace output.
  function renderTraceOutput() {
    if (!DOM.debugTrace) {
      return;
    }

    const events = Array.isArray(debugState.events) ? debugState.events : [];
    const renderLimit = normalizeVisibleRenderLimit(debugState.renderLimit);
    const renderedEvents = events.slice(Math.max(0, events.length - renderLimit));
    const wasPinnedToBottom =
      DOM.debugTrace.scrollTop + DOM.debugTrace.clientHeight >= DOM.debugTrace.scrollHeight - 24;

    if (debugState.config.level === "off") {
      const emptyElement = document.createElement("div");
      emptyElement.className = "debug-empty";
      emptyElement.textContent = "Program debugging is off. Select a debug level or click Test Event to enable Runtime logging for this session.";
      DOM.debugTrace.replaceChildren(emptyElement);
    } else if (!events.length) {
      const emptyElement = document.createElement("div");
      emptyElement.className = "debug-empty";
      emptyElement.textContent = "No debug events have been collected for the selected level and categories yet.";
      DOM.debugTrace.replaceChildren(emptyElement);
    } else {
      const fragment = document.createDocumentFragment();
      renderedEvents.forEach(function appendDebugEvent(event) {
        fragment.appendChild(createDebugEventRow(event));
      });
      DOM.debugTrace.replaceChildren(fragment);
    }

    if (wasPinnedToBottom) {
      DOM.debugTrace.scrollTop = DOM.debugTrace.scrollHeight;
    }

    const traceSummaryParts = [
      debugState.isTruncated || renderedEvents.length < debugState.eventCount
        ? "Showing latest " + String(renderedEvents.length) + " of " + String(debugState.eventCount)
        : String(debugState.eventCount) + " event" + (debugState.eventCount === 1 ? "" : "s")
    ];

    if (debugState.droppedEventCount > 0) {
      traceSummaryParts.push(String(debugState.droppedEventCount) + " dropped");
    }

    if (debugState.isPoolFull) {
      traceSummaryParts.push("pool full");
    }

    if (debugState.lastCollectorError) {
      traceSummaryParts.push("collector recovered");
    }

    setBadgeText(DOM.traceSummary, traceSummaryParts.join(" | "));
  }

  // Function: render debug page.
  function renderDebugPage() {
    renderDebugControls();
    renderTraceOutput();
    setBadgeText(
      DOM.debugBadge,
      debugState.config.level === "off"
        ? "Off"
        : String(debugState.eventCount) + " event" + (debugState.eventCount === 1 ? "" : "s") +
          (debugState.isPoolFull ? " | pool full" : "")
    );

    if (DOM.exportDebugButton) {
      DOM.exportDebugButton.disabled = !debugState.eventCount;
    }
  }

  // Function: refresh debug state.
  async function refreshDebugState(options) {
    const optionBag = options || {};
    const silentStatus = optionBag.silentStatus === true;

    if (debugState.isRefreshing) {
      return;
    }

    debugState.isRefreshing = true;
    try {
      const response = await sendRuntimeMessage({
        type: "merged-link-lab:debug:get-state",
        eventLimit: normalizeVisibleRenderLimit(debugState.renderLimit)
      });

      if (response && response.ok) {
        applyDebugStatePayload(response);
        if (!silentStatus) {
          setStatus("Debug output refreshed.", "saved");
        }
        return;
      }

      throw new Error("background did not return debug state");
    } catch (error) {
      debugState.events =
        debugApi && typeof debugApi.getLocalEvents === "function"
          ? debugApi.getLocalEvents()
          : [];
      debugState.eventCount = debugState.events.length;
      debugState.isTruncated = false;
      debugState.isPoolFull = false;
      debugState.droppedEventCount = 0;
      debugState.lastCollectorError = "";
      renderDebugPage();
      if (!silentStatus) {
        setStatus("Could not refresh background debug output: " + (error && error.message ? error.message : "unknown error"), "error");
      }
    } finally {
      debugState.isRefreshing = false;
    }
  }

  // Function: get debug config from controls.
  function getDebugConfigFromControls() {
    const nextCategories = Object.assign({}, debugState.config.categories);

    document.querySelectorAll("[data-debug-category]").forEach(function readDebugCategoryCheckbox(checkbox) {
      const categoryName = checkbox.getAttribute("data-debug-category");
      nextCategories[categoryName] = checkbox.checked === true;
    });

    nextCategories.error = true;

    return {
      level: DOM.debugLevelSelect ? DOM.debugLevelSelect.value : debugState.config.level,
      categories: nextCategories
    };
  }

  // Function: save debug config.
  async function saveDebugConfig() {
    const nextDebugConfig = getDebugConfigFromControls();
    if (debugApi) {
      debugApi.ui("debugging debug config changed", {
        level: nextDebugConfig.level,
        enabledCategories: getEnabledCategoryNames(nextDebugConfig).join(",")
      });
    }

    try {
      const response = await sendRuntimeMessage({
        type: "merged-link-lab:debug:set-config",
        config: nextDebugConfig,
        eventLimit: normalizeVisibleRenderLimit(debugState.renderLimit)
      });

      if (response && response.ok) {
        applyDebugStatePayload(response);
        setStatus("Program debug choices saved. Debug output remains in memory only.", "saved");
        return;
      }

      debugState.config = nextDebugConfig;
      renderDebugPage();
      setStatus("Program debug choices updated for this page only.", "error");
    } catch (error) {
      debugState.config = nextDebugConfig;
      renderDebugPage();
      setStatus("Could not save program debug choices: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: emit debug test event.
  async function emitDebugTestEvent() {
    const nextDebugConfig = getDebugConfigFromControls();
    let didAdjustConfigForTest = false;

    if (nextDebugConfig.level === "off") {
      nextDebugConfig.level = "info";
      didAdjustConfigForTest = true;
      if (DOM.debugLevelSelect) {
        DOM.debugLevelSelect.value = "info";
      }
    }

    if (nextDebugConfig.categories.runtime !== true) {
      nextDebugConfig.categories.runtime = true;
      didAdjustConfigForTest = true;
      document.querySelectorAll('[data-debug-category="runtime"]').forEach(function checkRuntimeCategory(checkbox) {
        checkbox.checked = true;
        checkbox.setAttribute("aria-checked", "true");
      });
    }

    try {
      const configResponse = await sendRuntimeMessage({
        type: "merged-link-lab:debug:set-config",
        config: nextDebugConfig,
        eventLimit: normalizeVisibleRenderLimit(debugState.renderLimit)
      });

      if (configResponse && configResponse.ok) {
        applyDebugStatePayload(configResponse);
      }

      const testResponse = await sendRuntimeMessage({
        type: "merged-link-lab:debug:test",
        source: "debugging-page",
        adjustedConfig: didAdjustConfigForTest
      });

      if (!testResponse || !testResponse.ok) {
        setStatus("Program debug test event did not receive a background response.", "error");
        await refreshDebugState({ silentStatus: true });
        return;
      }

      await refreshDebugState({ silentStatus: true });
      setStatus(
        didAdjustConfigForTest
          ? "Program debug test event emitted. Runtime debug was enabled and saved."
          : "Program debug test event emitted.",
        "saved"
      );
    } catch (error) {
      setStatus("Could not emit program debug test event: " + (error && error.message ? error.message : "unknown error"), "error");
      await refreshDebugState({ silentStatus: true });
    }
  }

  // Function: clear debug events.
  async function clearDebugEvents() {
    if (debugApi) {
      debugApi.ui("debugging clear debug events clicked");
    }

    try {
      const response = await sendRuntimeMessage({
        type: "merged-link-lab:debug:clear",
        eventLimit: normalizeVisibleRenderLimit(debugState.renderLimit)
      });

      if (response && response.ok) {
        applyDebugStatePayload(response);
        setStatus("Program debug output cleared. Saved choices were kept.", "saved");
        return;
      }
    } catch {
      // Continue to local fallback.
    }

    debugState.events = [];
    debugState.eventCount = 0;
    debugState.isTruncated = false;
    debugState.isPoolFull = false;
    debugState.droppedEventCount = 0;
    debugState.lastCollectorError = "";
    renderDebugPage();
    setStatus("Program debug output cleared for this page only.", "");
  }

  // Function: build debug export text.
  function buildDebugExportText(exportPayload) {
    const safeExportPayload = exportPayload && typeof exportPayload === "object" ? exportPayload : {};
    const exportEvents = Array.isArray(safeExportPayload.events) ? safeExportPayload.events : debugState.events;
    const exportConfig = safeExportPayload.config && typeof safeExportPayload.config === "object"
      ? safeExportPayload.config
      : debugState.config;

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      config: exportConfig,
      eventCount: Number.isFinite(safeExportPayload.eventCount) ? safeExportPayload.eventCount : exportEvents.length,
      maxEvents: Number.isFinite(safeExportPayload.maxEvents) ? safeExportPayload.maxEvents : debugState.maxEvents,
      droppedEventCount: Number.isFinite(safeExportPayload.droppedEventCount)
        ? safeExportPayload.droppedEventCount
        : debugState.droppedEventCount,
      lastCollectorError: safeExportPayload.lastCollectorError || debugState.lastCollectorError,
      events: exportEvents
    }, null, 2);
  }

  // Function: export debug events.
  async function exportDebugEvents() {
    if (debugApi) {
      debugApi.ui("debugging export debug events clicked", {
        eventCount: debugState.eventCount
      });
    }

    if (!debugState.eventCount) {
      setStatus("No program debug output is available to export.", "");
      return;
    }

    try {
      const response = await sendRuntimeMessage({
        type: "merged-link-lab:debug:get-state",
        includeAllEvents: true
      });
      const exportPayload = response && response.ok ? response : {
        config: debugState.config,
        eventCount: debugState.eventCount,
        maxEvents: debugState.maxEvents,
        droppedEventCount: debugState.droppedEventCount,
        lastCollectorError: debugState.lastCollectorError,
        events: debugState.events
      };
      const exportText = buildDebugExportText(exportPayload);
      const blob = new Blob([exportText], { type: "application/json" });
      const exportUrl = URL.createObjectURL(blob);
      const exportLink = document.createElement("a");

      exportLink.href = exportUrl;
      exportLink.download = "url-forensics-workbench-program-debug-" + String(Date.now()) + ".json";
      exportLink.click();
      URL.revokeObjectURL(exportUrl);
      setStatus("Program debug output exported.", "saved");
    } catch (error) {
      setStatus("Could not export program debug output: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: open extension page.
  async function openExtensionPage(pageName, label) {
    await pageUi.openExtensionPage(extensionApi, pageName, label, setStatus);
  }

  // Function: open settings page.
  async function openSettingsPage() {
    await pageUi.openSettingsPage(extensionApi, setStatus);
  }

  // Function: update render limit.
  function updateRenderLimit() {
    debugState.renderLimit = normalizeVisibleRenderLimit(DOM.renderLimitSelect ? DOM.renderLimitSelect.value : debugState.renderLimit);
    refreshDebugState({ silentStatus: true });
    persistDebugPageChoices();
  }

  // Function: update auto refresh.
  function updateAutoRefresh() {
    debugState.autoRefresh = !!(DOM.autoRefreshDebugOutput && DOM.autoRefreshDebugOutput.checked);
    if (DOM.autoRefreshDebugOutput) {
      DOM.autoRefreshDebugOutput.setAttribute("aria-checked", debugState.autoRefresh ? "true" : "false");
    }
    persistDebugPageChoices();
    setStatus(debugState.autoRefresh ? "Live refresh enabled." : "Live refresh paused.", "");
  }

  // Function: bind UI.
  function bindUi() {
    if (DOM.refreshDebugButton) {
      DOM.refreshDebugButton.addEventListener("click", function refreshFromButton() {
        refreshDebugState();
      });
    }

    if (DOM.emitDebugTestButton) {
      DOM.emitDebugTestButton.addEventListener("click", emitDebugTestEvent);
    }

    if (DOM.clearDebugButton) {
      DOM.clearDebugButton.addEventListener("click", clearDebugEvents);
    }

    if (DOM.exportDebugButton) {
      DOM.exportDebugButton.addEventListener("click", exportDebugEvents);
    }

    if (DOM.openDiagnosticsPageButton) {
      DOM.openDiagnosticsPageButton.addEventListener("click", function openDiagnosticsFromDebugging() {
        openExtensionPage("diagnostics.html", "Diagnostics");
      });
    }

    if (DOM.openStoragePageButton) {
      DOM.openStoragePageButton.addEventListener("click", function openStorageFromDebugging() {
        openExtensionPage("storage.html", "Storage");
      });
    }

    if (DOM.openSettingsPageButton) {
      DOM.openSettingsPageButton.addEventListener("click", openSettingsPage);
    }

    if (DOM.openHelpPageButton) {
      DOM.openHelpPageButton.addEventListener("click", function openHelpFromDebugging() {
        openExtensionPage("help.html", "Help");
      });
    }

    if (DOM.debugLevelSelect) {
      DOM.debugLevelSelect.addEventListener("change", saveDebugConfig);
    }

    document.querySelectorAll("[data-debug-category]").forEach(function bindDebugCategorySwitch(checkbox) {
      checkbox.addEventListener("change", function handleDebugCategorySwitchChange() {
        checkbox.setAttribute("aria-checked", checkbox.checked ? "true" : "false");
        saveDebugConfig();
      });
    });

    if (DOM.renderLimitSelect) {
      DOM.renderLimitSelect.addEventListener("change", updateRenderLimit);
    }

    if (DOM.autoRefreshDebugOutput) {
      DOM.autoRefreshDebugOutput.addEventListener("change", updateAutoRefresh);
    }
  }

  // Function: initialize debugging page.
  async function initializeDebugging() {
    if (DOM.extensionVersion && extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getManifest === "function") {
      const manifest = extensionApi.runtime.getManifest();
      DOM.extensionVersion.textContent = "v" + String(manifest && manifest.version ? manifest.version : "0.0.0");
    }

    bindUi();
    await loadDebugPageChoices();
    renderDebugPage();
    await refreshDebugState({ silentStatus: true });
    setStatus("Debugging ready. Choices persist; output does not.", "");
    window.setInterval(function refreshLiveDebugOutput() {
      if (debugState.autoRefresh) {
        refreshDebugState({ silentStatus: true });
      }
    }, 1000);
  }

  initializeDebugging();
})();
