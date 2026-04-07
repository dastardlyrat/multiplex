// Function: initialize URL Forensics Workbench diagnostics page.
(function initializeUrlForensicsDiagnosticsPage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  // Shared model keeps storage/debug-choice diagnostics aligned with the storage page.
  const storageModel = globalThis.urlForensicsStorageModel;
  const formatStorageBooleanEntry = storageModel.formatStorageBooleanEntry;
  const formatStorageEmailListEntry = storageModel.formatStorageEmailListEntry;
  const formatDebugConfigEntry = storageModel.formatDebugConfigEntry;
  const formatDebugPageChoicesEntry = storageModel.formatDebugPageChoicesEntry;
  const getStorageSourceLabel = storageModel.getStorageSourceLabel;
  const diagnosticsState = {
    manifest: null,
    activeTabId: null,
    requestedTabId: null,
    activeTabUrl: "",
    activeTabTitle: "",
    generalDiagnosticsRows: [],
    generalDiagnosticsError: "",
    storageSnapshot: null
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    refreshDiagnosticsButton: document.getElementById("refreshDiagnosticsButton"),
    openDebuggingPageButton: document.getElementById("openDebuggingPageButton"),
    openStoragePageButton: document.getElementById("openStoragePageButton"),
    openSettingsPageButton: document.getElementById("openSettingsPageButton"),
    openHelpPageButton: document.getElementById("openHelpPageButton"),
    generalDiagnosticsBadge: document.getElementById("generalDiagnosticsBadge"),
    generalDiagnosticsList: document.getElementById("generalDiagnosticsList"),
    storageBadge: document.getElementById("storageBadge"),
    storageDiagnosticsList: document.getElementById("storageDiagnosticsList"),
    statusMessage: document.getElementById("statusMessage")
  };
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "diagnostics-page", module: "diagnostics" });
    debugApi.runtime("diagnostics page initialization started");
  }

  // Function: resolve extension manifest.
  function resolveManifest() {
    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getManifest !== "function") {
      return null;
    }

    try {
      return extensionApi.runtime.getManifest();
    } catch {
      return null;
    }
  }

  // Function: set status.
  function setStatus(message, tone) {
    if (!DOM.statusMessage) {
      return;
    }

    DOM.statusMessage.textContent = String(message || "");
    DOM.statusMessage.classList.toggle("is-saved", tone === "saved");
    DOM.statusMessage.classList.toggle("is-error", tone === "error");
  }

  // Function: set badge text.
  function setBadgeText(element, text) {
    if (!element) {
      return;
    }

    element.textContent = String(text || "Unavailable");
  }

  // Function: format timestamp.
  function formatTimestamp(timestampValue) {
    if (!timestampValue) {
      return "Unavailable";
    }

    try {
      return new Date(timestampValue).toLocaleString();
    } catch {
      return "Unavailable";
    }
  }

  // Function: shorten value.
  function shortenValue(value, maximumLength) {
    const normalizedValue = String(value || "").trim();
    const safeMaximumLength = Number.isFinite(maximumLength) ? Number(maximumLength) : 96;

    if (!normalizedValue) {
      return "Unavailable";
    }

    if (normalizedValue.length <= safeMaximumLength) {
      return normalizedValue;
    }

    return normalizedValue.slice(0, safeMaximumLength - 3) + "...";
  }

  // Function: format byte count.
  function formatByteCount(byteCount) {
    if (byteCount === null || typeof byteCount === "undefined" || byteCount === "") {
      return "Unavailable";
    }

    const safeByteCount = Number(byteCount);
    const units = ["bytes", "KiB", "MiB", "GiB"];
    let unitIndex = 0;
    let scaledValue = safeByteCount;

    if (!Number.isFinite(safeByteCount) || safeByteCount < 0) {
      return "Unavailable";
    }

    while (scaledValue >= 1024 && unitIndex < units.length - 1) {
      scaledValue /= 1024;
      unitIndex += 1;
    }

    return (
      (unitIndex === 0 ? String(Math.round(scaledValue)) : scaledValue.toFixed(2)) +
      " " +
      units[unitIndex] +
      " (" +
      safeByteCount.toLocaleString() +
      " bytes)"
    );
  }

  // Function: format timing value.
  function formatTimingValue(timingValue) {
    const safeTimingValue = Number(timingValue);

    if (!Number.isFinite(safeTimingValue) || safeTimingValue < 0) {
      return "Unavailable";
    }

    return safeTimingValue.toFixed(1) + " ms";
  }

  // Function: estimate UTF-8 bytes.
  function estimateUtf8Bytes(value) {
    const serializedValue = JSON.stringify(value);

    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(serializedValue).length;
    }

    return unescape(encodeURIComponent(serializedValue)).length;
  }

  // Function: format permission list.
  function formatPermissionList(permissions) {
    return Array.isArray(permissions) && permissions.length ? permissions.join(", ") : "None listed";
  }

  // Function: get requested tab id.
  function getRequestedTabId() {
    const tabIdValue = new URLSearchParams(window.location.search || "").get("tabId");
    const parsedTabId = Number(tabIdValue);

    return Number.isInteger(parsedTabId) && parsedTabId > 0 ? parsedTabId : null;
  }

  // Function: set diagnostics storage snapshot.
  function setDiagnosticsStorageSnapshot(source, storedSettings, errorMessage) {
    diagnosticsState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage,
      includeDebugChoices: true
    });
  }

  // Function: render diagnostic list.
  function renderDiagnosticList(listElement, rows) {
    if (!listElement) {
      return;
    }

    const listRows = Array.isArray(rows) ? rows : [];
    const fragment = document.createDocumentFragment();
    listElement.textContent = "";

    listRows.forEach(function appendDiagnosticRow(row) {
      const nextRow = row && typeof row === "object" ? row : {};
      const rowContainer = document.createElement("div");
      const labelElement = document.createElement("dt");
      const valueElement = document.createElement("dd");

      rowContainer.className = "diagnostic-row";
      labelElement.textContent = String(nextRow.label || "");
      valueElement.textContent = String(nextRow.value || "");
      rowContainer.appendChild(labelElement);
      rowContainer.appendChild(valueElement);
      fragment.appendChild(rowContainer);
    });

    listElement.appendChild(fragment);
  }

  // Function: render storage diagnostics.
  function renderStorageDiagnostics() {
    const manifest = diagnosticsState.manifest || {};
    const geckoSettings =
      manifest &&
      manifest.browser_specific_settings &&
      manifest.browser_specific_settings.gecko &&
      typeof manifest.browser_specific_settings.gecko === "object"
        ? manifest.browser_specific_settings.gecko
        : {};
    const storageSnapshot = diagnosticsState.storageSnapshot;
    const rows = [
      { label: "Extension", value: String(manifest.name || "URL Forensics Workbench") },
      { label: "Version", value: String(manifest.version || "Unavailable") },
      { label: "Gecko ID", value: String(geckoSettings.id || "Unavailable") },
      { label: "Firefox Min Version", value: String(geckoSettings.strict_min_version || "Unavailable") },
      { label: "Diagnostics Page", value: shortenValue(window.location.href, 108) },
      { label: "Ready State", value: String(document.readyState || "unknown") }
    ];

    if (!storageSnapshot) {
      rows.push({ label: "Storage Source", value: "Unavailable" });
      setBadgeText(DOM.storageBadge, "Storage unknown");
      renderDiagnosticList(DOM.storageDiagnosticsList, rows);
      return;
    }

    rows.push({ label: "Storage Source", value: getStorageSourceLabel(storageSnapshot.source) });
    rows.push({ label: "Storage Loaded", value: formatTimestamp(storageSnapshot.loadedAt) });
    rows.push({
      label: "Storage URL Normalization",
      value: formatStorageBooleanEntry(storageSnapshot.enableUrlNormalizationRepair)
    });
    rows.push({
      label: "Storage Replace Body",
      value: formatStorageBooleanEntry(storageSnapshot.replaceEmailBodyWithMirrorContent)
    });
    rows.push({
      label: "Storage Auto-Apply Toggle",
      value: formatStorageBooleanEntry(storageSnapshot.autoApplyMirrorForConfiguredSenders)
    });
    rows.push({
      label: "Storage Sender Addresses",
      value: formatStorageEmailListEntry(storageSnapshot.autoApplyMirrorSenderEmailList)
    });
    rows.push({
      label: "Debug Output Choices",
      value: formatDebugConfigEntry(storageSnapshot.programDebugConfig)
    });
    rows.push({
      label: "Debug Page Choices",
      value: formatDebugPageChoicesEntry(storageSnapshot.programDebugPageChoices)
    });
    rows.push({
      label: "Debug Output Storage",
      value: "Not persisted; in-memory only"
    });
    if (storageSnapshot.errorMessage) {
      rows.push({
        label: "Storage Error",
        value: storageSnapshot.errorMessage
      });
    }

    if (storageSnapshot.source === "storage.local" || storageSnapshot.source === "storage.onChanged") {
      setBadgeText(DOM.storageBadge, "Storage loaded");
    } else if (storageSnapshot.source === "storage-error") {
      setBadgeText(DOM.storageBadge, "Storage error");
    } else if (storageSnapshot.source === "storage-unavailable") {
      setBadgeText(DOM.storageBadge, "Storage unavailable");
    } else {
      setBadgeText(DOM.storageBadge, "Storage unknown");
    }

    renderDiagnosticList(DOM.storageDiagnosticsList, rows);
  }

  // Function: collect storage usage diagnostics.
  async function collectStorageUsageDiagnostics() {
    const storageLocal = extensionApi && extensionApi.storage ? extensionApi.storage.local : null;
    const unavailableResult = {
      source: "Unavailable",
      bytesUsed: null,
      keyCount: "Unavailable",
      quota: "Unavailable",
      note: "storage.local is unavailable in this context.",
      isExact: false
    };

    if (!storageLocal || typeof storageLocal.get !== "function") {
      return unavailableResult;
    }

    try {
      const quotaBytes = Number(storageLocal.QUOTA_BYTES);
      const quotaLabel = Number.isFinite(quotaBytes) && quotaBytes > 0
        ? formatByteCount(quotaBytes)
        : "Not exposed by this browser context";
      let storedValues = null;
      let bytesUsed = null;
      let source = "Estimated from storage.local JSON payload";
      let isExact = false;

      if (typeof storageLocal.getBytesInUse === "function") {
        bytesUsed = await storageLocal.getBytesInUse(null);
        source = "storage.local.getBytesInUse";
        isExact = true;
      }

      storedValues = await storageLocal.get(null);

      if (!Number.isFinite(Number(bytesUsed))) {
        bytesUsed = estimateUtf8Bytes(storedValues || {});
      }

      return {
        source: source,
        bytesUsed: Number(bytesUsed),
        keyCount: String(Object.keys(storedValues || {}).length),
        quota: quotaLabel,
        note: isExact
          ? "Exact storage byte count reported by the browser."
          : "Estimated from serialized storage because exact byte count is unavailable.",
        isExact: isExact
      };
    } catch (error) {
      return {
        source: "Storage error",
        bytesUsed: null,
        keyCount: "Unavailable",
        quota: "Unavailable",
        note: error && error.message ? error.message : "unknown storage error",
        isExact: false
      };
    }
  }

  // Function: collect memory usage diagnostics.
  async function collectMemoryUsageDiagnostics() {
    try {
      if (
        typeof performance !== "undefined" &&
        typeof performance.measureUserAgentSpecificMemory === "function"
      ) {
        const memoryMeasurement = await performance.measureUserAgentSpecificMemory();
        const measuredBytes = memoryMeasurement && Number.isFinite(Number(memoryMeasurement.bytes))
          ? Number(memoryMeasurement.bytes)
          : null;

        if (measuredBytes !== null) {
          return {
            source: "performance.measureUserAgentSpecificMemory",
            usedBytes: measuredBytes,
            totalBytes: null,
            limitBytes: null,
            note: "Browser-reported memory for this agent cluster."
          };
        }
      }
    } catch {
      // Fall through to performance.memory or the unavailable response.
    }

    if (
      typeof performance !== "undefined" &&
      performance.memory &&
      typeof performance.memory === "object"
    ) {
      return {
        source: "performance.memory",
        usedBytes: Number(performance.memory.usedJSHeapSize),
        totalBytes: Number(performance.memory.totalJSHeapSize),
        limitBytes: Number(performance.memory.jsHeapSizeLimit),
        note: "JavaScript heap values are browser-specific and may not include total extension process memory."
      };
    }

    return {
      source: "Unavailable",
      usedBytes: null,
      totalBytes: null,
      limitBytes: null,
      note: "Firefox does not expose per-extension memory usage to this diagnostics page."
    };
  }

  // Function: build general diagnostics rows.
  function buildGeneralDiagnosticsRows(storageUsage, memoryUsage) {
    const manifest = diagnosticsState.manifest || {};
    const geckoSettings =
      manifest &&
      manifest.browser_specific_settings &&
      manifest.browser_specific_settings.gecko &&
      typeof manifest.browser_specific_settings.gecko === "object"
        ? manifest.browser_specific_settings.gecko
        : {};
    const dataCollectionPermissions =
      geckoSettings &&
      geckoSettings.data_collection_permissions &&
      Array.isArray(geckoSettings.data_collection_permissions.required)
        ? geckoSettings.data_collection_permissions.required
        : [];
    const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
    const hostPermissions = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
    const runtimeId = extensionApi && extensionApi.runtime && extensionApi.runtime.id
      ? extensionApi.runtime.id
      : "Unavailable";
    const safeStorageUsage = storageUsage || {};
    const safeMemoryUsage = memoryUsage || {};
    const rows = [
      { label: "Extension", value: String(manifest.name || "URL Forensics Workbench") },
      { label: "Version", value: String(manifest.version || "Unavailable") },
      { label: "Manifest Version", value: String(manifest.manifest_version || "Unavailable") },
      { label: "Gecko ID", value: String(geckoSettings.id || "Unavailable") },
      { label: "Runtime ID", value: String(runtimeId) },
      { label: "Firefox Min Version", value: String(geckoSettings.strict_min_version || "Unavailable") },
      { label: "Permissions", value: formatPermissionList(permissions) },
      { label: "Host Permissions", value: formatPermissionList(hostPermissions) },
      { label: "Data Collection", value: formatPermissionList(dataCollectionPermissions) },
      { label: "Diagnostics Page", value: shortenValue(window.location.href, 120) },
      { label: "Ready State", value: String(document.readyState || "unknown") },
      { label: "Visibility", value: String(document.visibilityState || "unknown") },
      { label: "Uptime", value: formatTimingValue(typeof performance !== "undefined" ? performance.now() : NaN) },
      { label: "Online", value: typeof navigator !== "undefined" && navigator.onLine === false ? "no" : "yes" },
      { label: "Language", value: typeof navigator !== "undefined" ? String(navigator.language || "Unavailable") : "Unavailable" },
      { label: "Platform", value: typeof navigator !== "undefined" ? String(navigator.platform || "Unavailable") : "Unavailable" },
      { label: "User Agent", value: typeof navigator !== "undefined" ? shortenValue(navigator.userAgent, 160) : "Unavailable" },
      { label: "Target Tab ID", value: diagnosticsState.activeTabId ? String(diagnosticsState.activeTabId) : "Unavailable" },
      { label: "Target Tab Title", value: shortenValue(diagnosticsState.activeTabTitle, 120) },
      { label: "Target Tab URL", value: shortenValue(diagnosticsState.activeTabUrl, 140) },
      { label: "Memory Source", value: String(safeMemoryUsage.source || "Unavailable") },
      { label: "Memory Used", value: formatByteCount(safeMemoryUsage.usedBytes) },
      { label: "Memory Total", value: formatByteCount(safeMemoryUsage.totalBytes) },
      { label: "Memory Limit", value: formatByteCount(safeMemoryUsage.limitBytes) },
      { label: "Memory Note", value: String(safeMemoryUsage.note || "Unavailable") },
      { label: "Storage Source", value: String(safeStorageUsage.source || "Unavailable") },
      { label: "Storage Keys", value: String(safeStorageUsage.keyCount || "Unavailable") },
      { label: "Storage Used", value: formatByteCount(safeStorageUsage.bytesUsed) },
      { label: "Storage Quota", value: String(safeStorageUsage.quota || "Unavailable") },
      { label: "Storage Note", value: String(safeStorageUsage.note || "Unavailable") },
      { label: "Debug Output Storage", value: "Not persisted; in-memory only" }
    ];

    if (diagnosticsState.generalDiagnosticsError) {
      rows.push({ label: "General Diagnostics Error", value: diagnosticsState.generalDiagnosticsError });
    }

    return rows;
  }

  // Function: get active tab.
  async function getActiveTab() {
    if (!extensionApi || !extensionApi.tabs || typeof extensionApi.tabs.query !== "function") {
      return null;
    }

    const activeTabs = await extensionApi.tabs.query({
      active: true,
      currentWindow: true
    });

    return activeTabs && activeTabs.length ? activeTabs[0] : null;
  }

  // Function: get diagnostics target tab.
  async function getDiagnosticsTargetTab() {
    if (
      diagnosticsState.requestedTabId &&
      extensionApi &&
      extensionApi.tabs &&
      typeof extensionApi.tabs.get === "function"
    ) {
      return extensionApi.tabs.get(diagnosticsState.requestedTabId);
    }

    return getActiveTab();
  }

  // Function: update active tab state.
  function updateActiveTabState(activeTab) {
    diagnosticsState.activeTabId = activeTab && activeTab.id ? activeTab.id : null;
    diagnosticsState.activeTabUrl = activeTab && activeTab.url ? activeTab.url : "";
    diagnosticsState.activeTabTitle = activeTab && activeTab.title ? activeTab.title : "";
  }

  // Function: render general diagnostics.
  function renderGeneralDiagnostics() {
    const rows = Array.isArray(diagnosticsState.generalDiagnosticsRows)
      ? diagnosticsState.generalDiagnosticsRows
      : [];

    if (!rows.length) {
      setBadgeText(DOM.generalDiagnosticsBadge, "Loading runtime");
      renderDiagnosticList(DOM.generalDiagnosticsList, [
        { label: "Status", value: diagnosticsState.generalDiagnosticsError || "Loading general diagnostics..." }
      ]);
      return;
    }

    setBadgeText(DOM.generalDiagnosticsBadge, diagnosticsState.generalDiagnosticsError ? "General partial" : "General loaded");
    renderDiagnosticList(DOM.generalDiagnosticsList, rows);
  }

  // Function: load storage diagnostics.
  async function loadStorageDiagnostics(options) {
    const optionBag = options || {};
    const silentStatus = optionBag.silentStatus === true;

    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      setDiagnosticsStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this context.");
      renderStorageDiagnostics();
      if (!silentStatus) {
        setStatus("Storage is unavailable in this context.", "error");
      }
      return;
    }

    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys({ includeDebugChoices: true }));

      setDiagnosticsStorageSnapshot("storage.local", storedSettings, "");
      renderStorageDiagnostics();
      if (!silentStatus) {
        setStatus("Storage diagnostics loaded.", "");
      }
    } catch (error) {
      setDiagnosticsStorageSnapshot(
        "storage-error",
        null,
        error && error.message ? error.message : "unknown error"
      );
      renderStorageDiagnostics();
      if (!silentStatus) {
        setStatus("Could not load storage diagnostics: " + (error && error.message ? error.message : "unknown error"), "error");
      }
    }
  }

  // Function: refresh general diagnostics.
  async function refreshGeneralDiagnostics() {
    try {
      const storageUsage = await collectStorageUsageDiagnostics();
      const memoryUsage = await collectMemoryUsageDiagnostics();

      diagnosticsState.generalDiagnosticsError = "";
      diagnosticsState.generalDiagnosticsRows = buildGeneralDiagnosticsRows(storageUsage, memoryUsage);
    } catch (error) {
      diagnosticsState.generalDiagnosticsError = error && error.message ? error.message : "unknown error";
      diagnosticsState.generalDiagnosticsRows = buildGeneralDiagnosticsRows(null, null);
    }

    renderGeneralDiagnostics();
  }

  // Function: refresh target tab state.
  async function refreshTargetTabState() {
    try {
      const activeTab = await getDiagnosticsTargetTab();
      updateActiveTabState(activeTab);

      if (!diagnosticsState.activeTabId) {
        return false;
      }

      return true;
    } catch (error) {
      diagnosticsState.generalDiagnosticsError = error && error.message ? error.message : "unknown error";
      return false;
    }
  }

  // Function: refresh diagnostics.
  async function refreshDiagnostics() {
    const hasTargetTab = await refreshTargetTabState();
    await refreshGeneralDiagnostics();

    if (!hasTargetTab) {
      setStatus("General diagnostics refreshed. No active target tab is available.", "");
      return;
    }

    setStatus("General diagnostics refreshed.", "saved");
  }

  // Function: open debugging page.
  async function openDebuggingPage() {
    if (debugApi) {
      debugApi.ui("diagnostics open debugging clicked");
    }

    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      setStatus("Debugging page is unavailable in this context.", "error");
      return;
    }

    try {
      const debuggingUrl = extensionApi.runtime.getURL("debugging.html");

      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        await extensionApi.tabs.create({ url: debuggingUrl });
      } else {
        window.open(debuggingUrl, "_blank", "noopener");
      }

      setStatus("Opened debugging page.", "saved");
    } catch (error) {
      setStatus("Could not open debugging page: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: open storage page.
  async function openStoragePage() {
    if (debugApi) {
      debugApi.ui("diagnostics open storage clicked");
    }

    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      setStatus("Storage page is unavailable in this context.", "error");
      return;
    }

    try {
      const storageUrl = extensionApi.runtime.getURL("storage.html");

      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        await extensionApi.tabs.create({ url: storageUrl });
      } else {
        window.open(storageUrl, "_blank", "noopener");
      }

      setStatus("Opened storage page.", "saved");
    } catch (error) {
      setStatus("Could not open storage page: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: open help page.
  async function openHelpPage() {
    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      setStatus("Help page is unavailable in this context.", "error");
      return;
    }

    try {
      const helpUrl = extensionApi.runtime.getURL("help.html");

      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        await extensionApi.tabs.create({ url: helpUrl });
      } else {
        window.open(helpUrl, "_blank", "noopener");
      }

      setStatus("Opened help page.", "saved");
    } catch (error) {
      setStatus("Could not open help page: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: open settings page.
  async function openSettingsPage() {
    if (!extensionApi || !extensionApi.runtime) {
      setStatus("Settings page is unavailable in this context.", "error");
      return;
    }

    try {
      if (typeof extensionApi.runtime.openOptionsPage === "function") {
        await extensionApi.runtime.openOptionsPage();
        setStatus("Opened settings page.", "saved");
        return;
      }

      if (
        extensionApi.tabs &&
        typeof extensionApi.tabs.create === "function" &&
        typeof extensionApi.runtime.getURL === "function"
      ) {
        await extensionApi.tabs.create({
          url: extensionApi.runtime.getURL("settings.html")
        });
        setStatus("Opened settings page.", "saved");
        return;
      }
    } catch (error) {
      setStatus("Could not open settings page: " + (error && error.message ? error.message : "unknown error"), "error");
      return;
    }

    setStatus("Settings page is unavailable in this context.", "error");
  }

  // Function: handle storage change.
  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes) {
      return;
    }

    const watchedKeys = storageModel.getStorageReadKeys({ includeDebugChoices: true });
    const didChangeWatchedKey = watchedKeys.some(function didStorageKeyChange(storageKey) {
      return Object.prototype.hasOwnProperty.call(changes, storageKey);
    });

    if (!didChangeWatchedKey) {
      return;
    }

    refreshGeneralDiagnostics();
  }

  // Function: bind ui.
  function bindUi() {
    if (DOM.refreshDiagnosticsButton) {
      DOM.refreshDiagnosticsButton.addEventListener("click", refreshDiagnostics);
    }

    if (DOM.openDebuggingPageButton) {
      DOM.openDebuggingPageButton.addEventListener("click", openDebuggingPage);
    }

    if (DOM.openStoragePageButton) {
      DOM.openStoragePageButton.addEventListener("click", openStoragePage);
    }

    if (DOM.openSettingsPageButton) {
      DOM.openSettingsPageButton.addEventListener("click", openSettingsPage);
    }

    if (DOM.openHelpPageButton) {
      DOM.openHelpPageButton.addEventListener("click", openHelpPage);
    }

  }

  // Function: initialize diagnostics.
  async function initializeDiagnostics() {
    diagnosticsState.manifest = resolveManifest();
    diagnosticsState.requestedTabId = getRequestedTabId();

    if (DOM.extensionVersion) {
      DOM.extensionVersion.textContent =
        "v" + String(diagnosticsState.manifest && diagnosticsState.manifest.version ? diagnosticsState.manifest.version : "0.0.0");
    }

    bindUi();
    renderGeneralDiagnostics();
    await refreshDiagnostics();
  }

  initializeDiagnostics();
})();
