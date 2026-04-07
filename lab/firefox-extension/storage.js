// Function: initialize URL Forensics Workbench storage page.
(function initializeUrlForensicsStoragePage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  // Shared model owns storage defaults, legacy migration, and debug-choice formatting.
  const storageModel = globalThis.urlForensicsStorageModel;
  const formatStorageBooleanEntry = storageModel.formatStorageBooleanEntry;
  const formatStorageEmailListEntry = storageModel.formatStorageEmailListEntry;
  const formatDebugConfigEntry = storageModel.formatDebugConfigEntry;
  const formatDebugPageChoicesEntry = storageModel.formatDebugPageChoicesEntry;
  const getStorageSourceLabel = storageModel.getStorageSourceLabel;
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
    if (!DOM.statusMessage) {
      return;
    }

    DOM.statusMessage.textContent = String(message || "");
    DOM.statusMessage.classList.toggle("is-saved", tone === "saved");
    DOM.statusMessage.classList.toggle("is-error", tone === "error");
  }

  function setBadgeText(element, text) {
    if (!element) {
      return;
    }

    element.textContent = String(text || "Unavailable");
  }

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

  function setStorageSnapshot(source, storedSettings, errorMessage) {
    storageState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage,
      includeDebugChoices: true
    });
  }

  function renderStorageList(listElement, rows) {
    if (!listElement) {
      return;
    }

    const listRows = Array.isArray(rows) ? rows : [];
    const fragment = document.createDocumentFragment();
    listElement.textContent = "";

    listRows.forEach(function appendStorageRow(row) {
      const nextRow = row && typeof row === "object" ? row : {};
      const rowContainer = document.createElement("div");
      const labelElement = document.createElement("dt");
      const valueElement = document.createElement("dd");

      rowContainer.className = "storage-row";
      labelElement.textContent = String(nextRow.label || "");
      valueElement.textContent = String(nextRow.value || "");
      rowContainer.appendChild(labelElement);
      rowContainer.appendChild(valueElement);
      fragment.appendChild(rowContainer);
    });

    listElement.appendChild(fragment);
  }

  function renderStorageDiagnostics() {
    const manifest = storageState.manifest || {};
    const geckoSettings =
      manifest &&
      manifest.browser_specific_settings &&
      manifest.browser_specific_settings.gecko &&
      typeof manifest.browser_specific_settings.gecko === "object"
        ? manifest.browser_specific_settings.gecko
        : {};
    const storageSnapshot = storageState.storageSnapshot;
    const rows = [
      { label: "Extension", value: String(manifest.name || "URL Forensics Workbench") },
      { label: "Version", value: String(manifest.version || "Unavailable") },
      { label: "Gecko ID", value: String(geckoSettings.id || "Unavailable") },
      { label: "Firefox Min Version", value: String(geckoSettings.strict_min_version || "Unavailable") },
      { label: "Storage Page", value: shortenValue(window.location.href, 108) },
      { label: "Ready State", value: String(document.readyState || "unknown") }
    ];

    if (!storageSnapshot) {
      rows.push({ label: "Storage Source", value: "Unavailable" });
      setBadgeText(DOM.storageBadge, "Storage unknown");
      renderStorageList(DOM.storageDiagnosticsList, rows);
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
    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      setStatus(label + " page is unavailable in this context.", "error");
      return;
    }

    try {
      const pageUrl = extensionApi.runtime.getURL(pageName);

      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        await extensionApi.tabs.create({ url: pageUrl });
      } else {
        window.open(pageUrl, "_blank", "noopener");
      }

      setStatus("Opened " + label.toLowerCase() + " page.", "saved");
    } catch (error) {
      setStatus("Could not open " + label.toLowerCase() + " page: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  async function openSettingsPage() {
    if (!extensionApi || !extensionApi.runtime) {
      setStatus("Settings page is unavailable in this context.", "error");
      return;
    }

    try {
      if (typeof extensionApi.runtime.openOptionsPage === "function") {
        await extensionApi.runtime.openOptionsPage();
        setStatus("Opened settings hub.", "saved");
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
        setStatus("Opened settings hub.", "saved");
        return;
      }
    } catch (error) {
      setStatus("Could not open settings hub: " + (error && error.message ? error.message : "unknown error"), "error");
      return;
    }

    setStatus("Settings page is unavailable in this context.", "error");
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
