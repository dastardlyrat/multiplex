// Function: initialize URL Forensics Workbench storage page.
(function initializeUrlForensicsStoragePage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const pageUi = globalThis.urlForensicsPageUi;
  // Shared model owns storage defaults, legacy migration, and debug-choice formatting.
  const storageModel = globalThis.urlForensicsStorageModel;
  const storageState = {
    manifest: null,
    storageSnapshot: null
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    refreshStorageButton: document.getElementById("refreshStorageButton"),
    openSettingsPageButton: document.getElementById("openSettingsPageButton"),
    openDiagnosticsPageButton: document.getElementById("openDiagnosticsPageButton"),
    openDebuggingPageButton: document.getElementById("openDebuggingPageButton"),
    openHelpPageButton: document.getElementById("openHelpPageButton"),
    storageBadge: document.getElementById("storageBadge"),
    storageDiagnosticsList: document.getElementById("storageDiagnosticsList"),
    statusMessage: document.getElementById("statusMessage")
  };
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;

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

  async function openExtensionPage(pageName, label) {
    await pageUi.openExtensionPage(extensionApi, pageName, label, setStatus);
  }

  async function openSettingsPage() {
    await pageUi.openSettingsPage(extensionApi, setStatus, {
      successMessage: "Opened settings hub."
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

    loadStorageDiagnostics({ silentStatus: true });
  }

  function bindUi() {
    if (DOM.refreshStorageButton) {
      DOM.refreshStorageButton.addEventListener("click", function refreshStorageFromButton() {
        loadStorageDiagnostics();
      });
    }

    if (DOM.openSettingsPageButton) {
      DOM.openSettingsPageButton.addEventListener("click", openSettingsPage);
    }

    if (DOM.openDiagnosticsPageButton) {
      DOM.openDiagnosticsPageButton.addEventListener("click", function openDiagnosticsFromStorage() {
        openExtensionPage("diagnostics.html", "Diagnostics");
      });
    }

    if (DOM.openDebuggingPageButton) {
      DOM.openDebuggingPageButton.addEventListener("click", function openDebuggingFromStorage() {
        openExtensionPage("debugging.html", "Debugging");
      });
    }

    if (DOM.openHelpPageButton) {
      DOM.openHelpPageButton.addEventListener("click", function openHelpFromStorage() {
        openExtensionPage("help.html", "Help");
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
