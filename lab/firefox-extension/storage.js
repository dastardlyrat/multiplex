// Function: initialize URL Forensics Workbench storage page.
(function initializeUrlForensicsStoragePage() {
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
  // Shared model owns storage defaults, legacy migration, and debug-choice formatting.
  const storageModel = pageDependencies.storageModel;
  const storageState = {
    manifest: null,
    storageSnapshot: null
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    refreshStorageButton: document.getElementById("refreshStorageButton"),
    storageBadge: document.getElementById("storageBadge"),
    storageDiagnosticsList: document.getElementById("storageDiagnosticsList"),
    statusMessage: document.getElementById("statusMessage")
  };
  const debugApi = pageRuntime.debugApi;

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "storage-page", module: "storage" });
    debugApi.runtime("storage page initialization started");
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

  function formatTimestamp(timestampValue) {
    return pageUi.formatTimestamp(timestampValue);
  }

  function shortenValue(value, maximumLength) {
    return pageUi.shortenValue(value, maximumLength);
  }

  function setStorageSnapshot(source, storedSettings, errorMessage) {
    storageState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage,
      includeDebugChoices: true
    });
  }

  function renderStorageList(listElement, rows) {
    pageUi.renderDefinitionRows(listElement, rows, "storage-row");
  }

  function renderStorageDiagnostics() {
    const rows = storageModel.buildStorageDiagnosticsRows({
      manifest: storageState.manifest,
      storageSnapshot: storageState.storageSnapshot,
      pageLabel: "Storage Page",
      pageUrl: window.location.href,
      readyState: document.readyState,
      shortenValue: shortenValue,
      formatTimestamp: formatTimestamp,
      includeDebugChoices: true
    });

    setBadgeText(DOM.storageBadge, storageModel.getStorageBadgeLabel(storageState.storageSnapshot));
    renderStorageList(DOM.storageDiagnosticsList, rows);
  }
  async function loadStorageDiagnostics(options) {
    const optionBag = options || {};
    const silentStatus = optionBag.silentStatus === true;

    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      setStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this context.");
      renderStorageDiagnostics();
      if (!silentStatus) {
        setStatus("Storage is unavailable in this context.", "error");
      }
      return;
    }

    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys({ includeDebugChoices: true }));

      setStorageSnapshot("storage.local", storedSettings, "");
      renderStorageDiagnostics();
      if (!silentStatus) {
        setStatus("Storage diagnostics loaded.", "saved");
      }
    } catch (error) {
      setStorageSnapshot(
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

    loadStorageDiagnostics({ silentStatus: true });
  }

  function bindUi() {
    if (DOM.refreshStorageButton) {
      DOM.refreshStorageButton.addEventListener("click", function refreshStorageFromButton() {
        loadStorageDiagnostics();
      });
    }

    if (extensionApi && extensionApi.storage && extensionApi.storage.onChanged) {
      extensionApi.storage.onChanged.addListener(handleStorageChange);
    }
  }

  async function initializeStorage() {
    storageState.manifest = resolveManifest();

    if (DOM.extensionVersion) {
      DOM.extensionVersion.textContent =
        "v" + String(storageState.manifest && storageState.manifest.version ? storageState.manifest.version : "0.0.0");
    }

    bindUi();
    setStorageSnapshot("defaults", null, "");
    renderStorageDiagnostics();
    await loadStorageDiagnostics({ silentStatus: true });
    setStatus("Storage ready. Debug output is in-memory only.", "");
  }

  initializeStorage();
})();
