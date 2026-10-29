// Function: initialize URL Forensics Workbench diagnostics page.
(function initializeUrlForensicsDiagnosticsPage() {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : null;
  const pageRuntimeFactory = globalScope ? globalScope.urlForensicsPageRuntime : null;
  const pageDependenciesFactory = globalScope ? globalScope.urlForensicsPageDependencies : null;

  if (!pageRuntimeFactory || typeof pageRuntimeFactory.create !== "function") {
    throw new Error("URL Forensics page runtime helpers are unavailable.");
  }

  if (!pageDependenciesFactory || typeof pageDependenciesFactory.create !== "function") {
    throw new Error("URL Forensics page dependency helpers are unavailable.");
  }

  const pageRuntime = pageRuntimeFactory.create({
    globalScope: globalScope,
    requirePageUi: true
  });
  const pageDependencies = pageDependenciesFactory.create({
    globalScope: globalScope,
    required: ["storageModel"]
  });
  const extensionApi = pageRuntime.extensionApi;
  const pageUi = pageRuntime.pageUi;
  const storageModel = pageDependencies.storageModel;
  const debugApi = pageRuntime.debugApi;
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
    generalDiagnosticsBadge: document.getElementById("generalDiagnosticsBadge"),
    generalDiagnosticsList: document.getElementById("generalDiagnosticsList"),
    storageBadge: document.getElementById("storageBadge"),
    storageDiagnosticsList: document.getElementById("storageDiagnosticsList"),
    statusMessage: document.getElementById("statusMessage")
  };

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "diagnostics-page", module: "diagnostics" });
    debugApi.runtime("diagnostics page initialization started");
  }

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

  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  function setBadgeText(element, text) {
    pageUi.setBadgeText(element, text, "Unavailable");
  }

  function renderDiagnosticList(listElement, rows) {
    pageUi.renderDefinitionRows(listElement, rows, "diagnostic-row");
  }

  function formatTimestamp(timestampValue) {
    return pageUi.formatTimestamp(timestampValue);
  }

  function shortenValue(value, maximumLength) {
    return pageUi.shortenValue(value, maximumLength);
  }

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

  function formatTimingValue(timingValue) {
    const safeTimingValue = Number(timingValue);

    if (!Number.isFinite(safeTimingValue) || safeTimingValue < 0) {
      return "Unavailable";
    }

    return safeTimingValue.toFixed(1) + " ms";
  }

  function estimateUtf8Bytes(value) {
    const serializedValue = JSON.stringify(value);

    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(serializedValue).length;
    }

    return unescape(encodeURIComponent(serializedValue)).length;
  }

  function formatPermissionList(permissions) {
    return Array.isArray(permissions) && permissions.length ? permissions.join(", ") : "None listed";
  }

  function getRequestedTabId() {
    const tabIdValue = new URLSearchParams(window.location.search || "").get("tabId");
    const parsedTabId = Number(tabIdValue);

    return Number.isInteger(parsedTabId) && parsedTabId > 0 ? parsedTabId : null;
  }

  function setDiagnosticsStorageSnapshot(source, storedSettings, errorMessage) {
    diagnosticsState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage,
      includeDebugChoices: true
    });
  }

  function collectStorageUsageDiagnostics() {
    const storageLocal = extensionApi && extensionApi.storage ? extensionApi.storage.local : null;
    const unavailableResult = Promise.resolve({
      source: "Unavailable",
      bytesUsed: null,
      keyCount: "Unavailable",
      quota: "Unavailable",
      note: "storage.local is unavailable in this context."
    });

    if (!storageLocal || typeof storageLocal.get !== "function") {
      return unavailableResult;
    }

    return (async function buildStorageUsageResult() {
      try {
        const quotaBytes = Number(storageLocal.QUOTA_BYTES);
        const quotaLabel = Number.isFinite(quotaBytes) && quotaBytes > 0
          ? formatByteCount(quotaBytes)
          : "Not exposed by this browser context";
        let bytesUsed = null;
        let source = "Estimated from storage.local JSON payload";

        if (typeof storageLocal.getBytesInUse === "function") {
          bytesUsed = await storageLocal.getBytesInUse(null);
          source = "storage.local.getBytesInUse";
        }

        const storedValues = await storageLocal.get(null);

        if (!Number.isFinite(Number(bytesUsed))) {
          bytesUsed = estimateUtf8Bytes(storedValues || {});
        }

        return {
          source: source,
          bytesUsed: Number(bytesUsed),
          keyCount: String(Object.keys(storedValues || {}).length),
          quota: quotaLabel,
          note: source === "storage.local.getBytesInUse"
            ? "Exact storage byte count reported by the browser."
            : "Estimated from serialized storage because exact byte count is unavailable."
        };
      } catch (error) {
        return {
          source: "Storage error",
          bytesUsed: null,
          keyCount: "Unavailable",
          quota: "Unavailable",
          note: error && error.message ? error.message : "unknown storage error"
        };
      }
    }());
  }

  function collectMemoryUsageDiagnostics() {
    return (async function buildMemoryUsageResult() {
      try {
        if (typeof performance !== "undefined" && typeof performance.measureUserAgentSpecificMemory === "function") {
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
        // Continue to browser-specific memory APIs.
      }

      if (typeof performance !== "undefined" && performance.memory && typeof performance.memory === "object") {
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
    }());
  }

  function getDiagnosticsManifest() {
    return diagnosticsState.manifest || {};
  }

  function getDiagnosticsGeckoSettings(manifest) {
    return (
      manifest &&
      manifest.browser_specific_settings &&
      manifest.browser_specific_settings.gecko &&
      typeof manifest.browser_specific_settings.gecko === "object"
    )
      ? manifest.browser_specific_settings.gecko
      : {};
  }

  function getDiagnosticsDataCollectionPermissions(geckoSettings) {
    return (
      geckoSettings &&
      geckoSettings.data_collection_permissions &&
      Array.isArray(geckoSettings.data_collection_permissions.required)
    )
      ? geckoSettings.data_collection_permissions.required
      : [];
  }

  function getDiagnosticsRuntimeId() {
    return extensionApi && extensionApi.runtime && extensionApi.runtime.id
      ? extensionApi.runtime.id
      : "Unavailable";
  }

  function buildExtensionIdentityRows(manifest, geckoSettings) {
    const dataCollectionPermissions = getDiagnosticsDataCollectionPermissions(geckoSettings);
    const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
    const hostPermissions = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];

    return [
      { label: "Extension", value: String(manifest.name || "URL Forensics Workbench") },
      { label: "Version", value: String(manifest.version || "Unavailable") },
      { label: "Manifest Version", value: String(manifest.manifest_version || "Unavailable") },
      { label: "Gecko ID", value: String(geckoSettings.id || "Unavailable") },
      { label: "Runtime ID", value: String(getDiagnosticsRuntimeId()) },
      { label: "Firefox Min Version", value: String(geckoSettings.strict_min_version || "Unavailable") },
      { label: "Permissions", value: formatPermissionList(permissions) },
      { label: "Host Permissions", value: formatPermissionList(hostPermissions) },
      { label: "Data Collection", value: formatPermissionList(dataCollectionPermissions) }
    ];
  }

  function buildDiagnosticsPageRuntimeRows() {
    return [
      { label: "Diagnostics Page", value: shortenValue(window.location.href, 120) },
      { label: "Ready State", value: String(document.readyState || "unknown") },
      { label: "Visibility", value: String(document.visibilityState || "unknown") },
      { label: "Uptime", value: formatTimingValue(typeof performance !== "undefined" ? performance.now() : NaN) },
      { label: "Online", value: typeof navigator !== "undefined" && navigator.onLine === false ? "no" : "yes" },
      { label: "Language", value: typeof navigator !== "undefined" ? String(navigator.language || "Unavailable") : "Unavailable" },
      { label: "Platform", value: typeof navigator !== "undefined" ? String(navigator.platform || "Unavailable") : "Unavailable" },
      { label: "User Agent", value: typeof navigator !== "undefined" ? shortenValue(navigator.userAgent, 160) : "Unavailable" }
    ];
  }

  function buildTargetTabRows() {
    return [
      { label: "Target Tab ID", value: diagnosticsState.activeTabId ? String(diagnosticsState.activeTabId) : "Unavailable" },
      { label: "Target Tab Title", value: shortenValue(diagnosticsState.activeTabTitle, 120) },
      { label: "Target Tab URL", value: shortenValue(diagnosticsState.activeTabUrl, 140) }
    ];
  }

  function buildMemoryDiagnosticsRows(memoryUsage) {
    const safeMemoryUsage = memoryUsage || {};

    return [
      { label: "Memory Source", value: String(safeMemoryUsage.source || "Unavailable") },
      { label: "Memory Used", value: formatByteCount(safeMemoryUsage.usedBytes) },
      { label: "Memory Total", value: formatByteCount(safeMemoryUsage.totalBytes) },
      { label: "Memory Limit", value: formatByteCount(safeMemoryUsage.limitBytes) },
      { label: "Memory Note", value: String(safeMemoryUsage.note || "Unavailable") }
    ];
  }

  function buildStorageUsageDiagnosticsRows(storageUsage) {
    const safeStorageUsage = storageUsage || {};

    return [
      { label: "Storage Source", value: String(safeStorageUsage.source || "Unavailable") },
      { label: "Storage Keys", value: String(safeStorageUsage.keyCount || "Unavailable") },
      { label: "Storage Used", value: formatByteCount(safeStorageUsage.bytesUsed) },
      { label: "Storage Quota", value: String(safeStorageUsage.quota || "Unavailable") },
      { label: "Storage Note", value: String(safeStorageUsage.note || "Unavailable") },
      { label: "Debug Output Storage", value: "Not persisted; in-memory only" }
    ];
  }

  function appendGeneralDiagnosticsErrorRow(rows) {
    if (diagnosticsState.generalDiagnosticsError) {
      rows.push({ label: "General Diagnostics Error", value: diagnosticsState.generalDiagnosticsError });
    }
  }

  function buildGeneralDiagnosticsRows(storageUsage, memoryUsage) {
    const manifest = getDiagnosticsManifest();
    const geckoSettings = getDiagnosticsGeckoSettings(manifest);
    const rows = []
      .concat(buildExtensionIdentityRows(manifest, geckoSettings))
      .concat(buildDiagnosticsPageRuntimeRows())
      .concat(buildTargetTabRows())
      .concat(buildMemoryDiagnosticsRows(memoryUsage))
      .concat(buildStorageUsageDiagnosticsRows(storageUsage));

    appendGeneralDiagnosticsErrorRow(rows);

    return rows;
  }

  function renderStorageDiagnostics() {
    const rows = storageModel.buildStorageDiagnosticsRows({
      manifest: diagnosticsState.manifest,
      storageSnapshot: diagnosticsState.storageSnapshot,
      pageLabel: "Diagnostics Page",
      pageUrl: window.location.href,
      readyState: document.readyState,
      shortenValue: shortenValue,
      formatTimestamp: formatTimestamp,
      includeDebugChoices: true
    });

    setBadgeText(DOM.storageBadge, storageModel.getStorageBadgeLabel(diagnosticsState.storageSnapshot));
    renderDiagnosticList(DOM.storageDiagnosticsList, rows);
  }

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

  function getActiveTab() {
    if (!extensionApi || !extensionApi.tabs || typeof extensionApi.tabs.query !== "function") {
      return Promise.resolve(null);
    }

    return extensionApi.tabs.query({
      active: true,
      currentWindow: true
    }).then(function resolveActiveTab(activeTabs) {
      return activeTabs && activeTabs.length ? activeTabs[0] : null;
    });
  }

  function getDiagnosticsTargetTab() {
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

  function updateActiveTabState(activeTab) {
    diagnosticsState.activeTabId = activeTab && activeTab.id ? activeTab.id : null;
    diagnosticsState.activeTabUrl = activeTab && activeTab.url ? activeTab.url : "";
    diagnosticsState.activeTabTitle = activeTab && activeTab.title ? activeTab.title : "";
  }

  function loadStorageDiagnostics(options) {
    const optionBag = options || {};
    const silentStatus = optionBag.silentStatus === true;

    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      setDiagnosticsStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this context.");
      renderStorageDiagnostics();
      if (!silentStatus) {
        setStatus("Storage is unavailable in this context.", "error");
      }
      return Promise.resolve();
    }

    return extensionApi.storage.local.get(storageModel.getStorageReadKeys({ includeDebugChoices: true }))
      .then(function applyStoredSettings(storedSettings) {
        setDiagnosticsStorageSnapshot("storage.local", storedSettings, "");
        renderStorageDiagnostics();
        if (!silentStatus) {
          setStatus("Storage diagnostics loaded.", "");
        }
      })
      .catch(function handleStorageError(error) {
        setDiagnosticsStorageSnapshot(
          "storage-error",
          null,
          error && error.message ? error.message : "unknown error"
        );
        renderStorageDiagnostics();
        if (!silentStatus) {
          setStatus("Could not load storage diagnostics: " + (error && error.message ? error.message : "unknown error"), "error");
        }
      });
  }

  function refreshGeneralDiagnostics() {
    return Promise.all([
      collectStorageUsageDiagnostics(),
      collectMemoryUsageDiagnostics()
    ]).then(function applyGeneralDiagnostics(results) {
      diagnosticsState.generalDiagnosticsError = "";
      diagnosticsState.generalDiagnosticsRows = buildGeneralDiagnosticsRows(results[0], results[1]);
      renderGeneralDiagnostics();
    }).catch(function handleGeneralDiagnosticsError(error) {
      diagnosticsState.generalDiagnosticsError = error && error.message ? error.message : "unknown error";
      diagnosticsState.generalDiagnosticsRows = buildGeneralDiagnosticsRows(null, null);
      renderGeneralDiagnostics();
    });
  }

  function refreshTargetTabState() {
    return getDiagnosticsTargetTab().then(function applyActiveTab(activeTab) {
      updateActiveTabState(activeTab);
      return !!diagnosticsState.activeTabId;
    }).catch(function handleActiveTabError(error) {
      diagnosticsState.generalDiagnosticsError = error && error.message ? error.message : "unknown error";
      return false;
    });
  }

  function refreshDiagnostics() {
    return refreshTargetTabState().then(function afterTargetTab(hasTargetTab) {
      return Promise.all([
        refreshGeneralDiagnostics(),
        loadStorageDiagnostics({ silentStatus: true })
      ]).then(function finishRefresh() {
        if (!hasTargetTab) {
          setStatus("Diagnostics refreshed. No active target tab is available.", "");
          return;
        }

        setStatus("Diagnostics refreshed.", "saved");
      });
    });
  }

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
    loadStorageDiagnostics({ silentStatus: true });
  }

  function bindUi() {
    if (DOM.refreshDiagnosticsButton) {
      DOM.refreshDiagnosticsButton.addEventListener("click", refreshDiagnostics);
    }

    if (
      extensionApi &&
      extensionApi.storage &&
      extensionApi.storage.onChanged &&
      typeof extensionApi.storage.onChanged.addListener === "function"
    ) {
      extensionApi.storage.onChanged.addListener(handleStorageChange);
    }
  }

  function initializeDiagnostics() {
    diagnosticsState.manifest = resolveManifest();
    diagnosticsState.requestedTabId = getRequestedTabId();

    if (DOM.extensionVersion) {
      DOM.extensionVersion.textContent =
        "v" + String(diagnosticsState.manifest && diagnosticsState.manifest.version ? diagnosticsState.manifest.version : "0.0.0");
    }

    bindUi();
    renderGeneralDiagnostics();
    renderStorageDiagnostics();
    refreshDiagnostics();
  }

  initializeDiagnostics();
}());
