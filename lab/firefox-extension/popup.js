// Function: initialize URL Forensics Workbench popup.
(function initializeUrlForensicsPopup() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const pageUi = globalThis.urlForensicsPageUi;
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;
  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "popup", module: "popup" });
    debugApi.runtime("popup initialization started");
  }
  // Shared model keeps storage migration and formatting consistent across extension pages.
  const storageModel = globalThis.urlForensicsStorageModel;
  const storageKeys = storageModel.storageKeys;
  const defaults = storageModel.defaultSettings;
  const formatStorageBooleanEntry = storageModel.formatStorageBooleanEntry;
  const formatStorageEmailListEntry = storageModel.formatStorageEmailListEntry;
  const getStorageSourceLabel = storageModel.getStorageSourceLabel;
  const popupState = {
    activeTabId: null,
    activeTabUrl: "",
    snapshot: null,
    storageSnapshot: null
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    openPagePaneButton: document.getElementById("openPagePaneButton"),
    openHelpPageButton: document.getElementById("openHelpPageButton"),
    openSettingsPageButton: document.getElementById("openSettingsPageButton"),
    openDiagnosticsPageButton: document.getElementById("openDiagnosticsPageButton"),
    openDebuggingPageButton: document.getElementById("openDebuggingPageButton"),
    refreshDiagnosticsButton: document.getElementById("refreshDiagnosticsButton"),
    enableUrlNormalizationRepair: document.getElementById("enableUrlNormalizationRepair"),
    replaceEmailBodyWithMirrorContent: document.getElementById("replaceEmailBodyWithMirrorContent"),
    diagnosticBadge: document.getElementById("diagnosticBadge"),
    diagnosticsList: document.getElementById("diagnosticsList"),
    statusMessage: document.getElementById("statusMessage")
  };

  // Function: set status.
  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  // Function: apply default settings.
  function applyDefaultSettings() {
    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.checked = defaults.enableUrlNormalizationRepair;
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.checked = defaults.replaceEmailBodyWithMirrorContent;
    }
  }

  // Function: get settings payload.
  function getSettingsPayload() {
    return {
      [storageKeys.enableUrlNormalizationRepair]: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
      [storageKeys.replaceEmailBodyWithMirrorContent]: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked)
    };
  }

  // Function: format timestamp.
  function formatTimestamp(timestampValue) {
    return pageUi.formatTimestamp(timestampValue);
  }

  // Function: format diagnostic value.
  function formatDiagnosticValue(value) {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || "Unavailable";
  }

  // Function: set popup storage snapshot.
  function setPopupStorageSnapshot(source, storedSettings, errorMessage) {
    popupState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage
    });
  }

  // Function: get storage diagnostic rows.
  function getStorageDiagnosticRows() {
    const storageSnapshot = popupState.storageSnapshot;

    if (!storageSnapshot) {
      return [
        { label: "Storage Source", value: "Unavailable" }
      ];
    }

    const rows = [
      { label: "Storage Source", value: getStorageSourceLabel(storageSnapshot.source) },
      { label: "Storage Loaded", value: formatTimestamp(storageSnapshot.loadedAt) },
      {
        label: "Storage URL Normalization",
        value: formatStorageBooleanEntry(storageSnapshot.enableUrlNormalizationRepair)
      },
      {
        label: "Storage Replace Body",
        value: formatStorageBooleanEntry(storageSnapshot.replaceEmailBodyWithMirrorContent)
      },
      {
        label: "Storage Auto-Apply Toggle",
        value: formatStorageBooleanEntry(storageSnapshot.autoApplyMirrorForConfiguredSenders)
      },
      {
        label: "Storage Sender Addresses",
        value: formatStorageEmailListEntry(storageSnapshot.autoApplyMirrorSenderEmailList)
      }
    ];

    if (storageSnapshot.errorMessage) {
      rows.push({
        label: "Storage Error",
        value: storageSnapshot.errorMessage
      });
    }

    return rows;
  }

  // Function: shorten url value.
  function shortenUrlValue(urlValue) {
    return pageUi.shortenValue(urlValue, 72);
  }

  // Function: render diagnostic list.
  function renderDiagnosticList(rows) {
    pageUi.renderDefinitionRows(DOM.diagnosticsList, rows, "diagnostic-row");
  }

  // Function: set diagnostic badge.
  function setDiagnosticBadge(text) {
    pageUi.setBadgeText(DOM.diagnosticBadge, text, "Unavailable");
  }

  // Function: render diagnostics from snapshot.
  function renderDiagnostics(snapshot) {
    const pipelineResult = snapshot && snapshot.pipeline ? snapshot.pipeline : null;
    const tabUrl = popupState.activeTabUrl || "";
    const storageRows = getStorageDiagnosticRows();

    if (!snapshot || !pipelineResult) {
      setDiagnosticBadge(tabUrl ? "No email detected" : "No active tab");
      renderDiagnosticList([
        { label: "Page", value: shortenUrlValue(tabUrl) },
        { label: "Status", value: tabUrl ? "Open an email body to populate diagnostics." : "Active tab unavailable." },
        { label: "Helper", value: tabUrl ? "Waiting for a detected email body" : "Unavailable on this page" }
      ].concat(storageRows));
      return;
    }

    setDiagnosticBadge("Email detected");
    renderDiagnosticList([
      { label: "Page", value: shortenUrlValue(tabUrl) },
      { label: "Detected", value: formatTimestamp(snapshot.detectedAt) },
      { label: "Mode", value: formatDiagnosticValue(snapshot.detectionMode) },
      { label: "Section", value: formatDiagnosticValue(snapshot.sectionLabel) },
      { label: "Final URLs", value: String((pipelineResult.finalUrls || []).length) },
      { label: "Changed", value: String((pipelineResult.changedUrls || []).length) },
      { label: "Digest", value: String((pipelineResult.digestEntries || []).length) },
      { label: "Rewritten", value: String(pipelineResult.rewrittenCount || 0) },
      { label: "Errors", value: pipelineResult.errors && pipelineResult.errors.length ? pipelineResult.errors.join(" | ") : "None" }
    ].concat(storageRows));
  }

  // Function: update active tab state.
  function updateActiveTabState(activeTab) {
    popupState.activeTabId = activeTab && activeTab.id ? activeTab.id : null;
    popupState.activeTabUrl = activeTab && activeTab.url ? activeTab.url : "";
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

  // Function: load settings.
  async function loadSettings() {
    if (debugApi) {
      debugApi.functionIn("popup.loadSettings");
    }

    if (
      !extensionApi ||
      !extensionApi.storage ||
      !extensionApi.storage.local ||
      typeof extensionApi.storage.local.get !== "function"
    ) {
      applyDefaultSettings();
      setPopupStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this popup context.");
      setStatus("Storage is unavailable in this popup.", "error");
      if (debugApi) {
        debugApi.conditional("popup storage unavailable", { hasExtensionApi: !!extensionApi });
        debugApi.functionOut("popup.loadSettings", { source: "storage-unavailable" });
      }
      return;
    }

    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys());
      setPopupStorageSnapshot("storage.local", storedSettings, "");

      if (DOM.enableUrlNormalizationRepair) {
        DOM.enableUrlNormalizationRepair.checked = storedSettings[storageKeys.enableUrlNormalizationRepair] === true;
      }

      if (DOM.replaceEmailBodyWithMirrorContent) {
        DOM.replaceEmailBodyWithMirrorContent.checked = storedSettings[storageKeys.replaceEmailBodyWithMirrorContent] === true;
      }
      if (debugApi) {
        debugApi.storage("popup settings loaded", {
          enableUrlNormalizationRepair: storedSettings[storageKeys.enableUrlNormalizationRepair] === true,
          replaceEmailBodyWithMirrorContent: storedSettings[storageKeys.replaceEmailBodyWithMirrorContent] === true
        });
        debugApi.functionOut("popup.loadSettings", { source: "storage.local" });
      }
    } catch (error) {
      applyDefaultSettings();
      setPopupStorageSnapshot(
        "storage-error",
        null,
        error && error.message ? error.message : "unknown error"
      );
      setStatus("Load failed: " + (error && error.message ? error.message : "unknown error"), "error");
      if (debugApi) {
        debugApi.error("popup settings load failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("popup.loadSettings", { source: "storage-error" });
      }
    }
  }

  // Function: save settings.
  async function saveSettings(event) {
    if (debugApi) {
      debugApi.functionIn("popup.saveSettings", {
        changedSettingId: event && event.target ? event.target.id : ""
      });
    }

    if (
      !extensionApi ||
      !extensionApi.storage ||
      !extensionApi.storage.local ||
      typeof extensionApi.storage.local.set !== "function"
    ) {
      if (debugApi) {
        debugApi.conditional("popup save skipped because storage is unavailable");
        debugApi.functionOut("popup.saveSettings", { saved: false });
      }
      return;
    }

    try {
      const changedSettingId = event && event.target ? event.target.id : "";
      const nextPayload = getSettingsPayload();
      await extensionApi.storage.local.set(nextPayload);

      if (changedSettingId === "replaceEmailBodyWithMirrorContent") {
        setStatus(
          nextPayload.replaceEmailBodyWithMirrorContent
            ? "Mirror replace on."
            : "Mirror replace off.",
          "saved"
        );
      } else {
        setStatus(
          nextPayload.enableUrlNormalizationRepair
            ? "URL repair on."
            : "URL repair off.",
          "saved"
        );
      }

      await loadSettings();
      renderDiagnostics(popupState.snapshot);
      if (debugApi) {
        debugApi.storage("popup settings saved", {
          changedSettingId: changedSettingId,
          enableUrlNormalizationRepair: nextPayload.enableUrlNormalizationRepair,
          replaceEmailBodyWithMirrorContent: nextPayload.replaceEmailBodyWithMirrorContent
        });
        debugApi.functionOut("popup.saveSettings", { saved: true });
      }
    } catch (error) {
      setStatus("Save failed: " + (error && error.message ? error.message : "unknown error"), "error");
      if (debugApi) {
        debugApi.error("popup settings save failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("popup.saveSettings", { saved: false });
      }
    }
  }

  // Function: request snapshot.
  async function requestSnapshot(tabId) {
    if (!extensionApi || !extensionApi.tabs || typeof extensionApi.tabs.sendMessage !== "function" || !tabId) {
      return null;
    }

    const response = await extensionApi.tabs.sendMessage(tabId, {
      type: "merged-link-lab:get-email-snapshot"
    });

    return response && response.snapshot ? response.snapshot : null;
  }

  // Function: refresh diagnostics.
  async function refreshDiagnostics() {
    if (debugApi) {
      debugApi.functionIn("popup.refreshDiagnostics");
    }

    try {
      const activeTab = await getActiveTab();
      updateActiveTabState(activeTab);

      if (!popupState.activeTabId) {
        popupState.snapshot = null;
        renderDiagnostics(null);
        setStatus("No active tab.", "error");
        if (debugApi) {
          debugApi.conditional("popup diagnostics refresh skipped: no active tab");
          debugApi.functionOut("popup.refreshDiagnostics", { hasSnapshot: false });
        }
        return;
      }

      popupState.snapshot = await requestSnapshot(popupState.activeTabId);
      renderDiagnostics(popupState.snapshot);
      setStatus(
        popupState.snapshot
          ? "Diagnostics refreshed."
          : "Open an email to load diagnostics.",
        popupState.snapshot ? "saved" : ""
      );
      if (debugApi) {
        debugApi.runtime("popup diagnostics refreshed", {
          activeTabId: popupState.activeTabId,
          hasSnapshot: !!popupState.snapshot
        });
        debugApi.functionOut("popup.refreshDiagnostics", { hasSnapshot: !!popupState.snapshot });
      }
    } catch (error) {
      popupState.snapshot = null;
      renderDiagnostics(null);
      setStatus(
        "Unavailable here: " + (error && error.message ? error.message : "unknown error"),
        "error"
      );
      if (debugApi) {
        debugApi.error("popup diagnostics refresh failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("popup.refreshDiagnostics", { hasSnapshot: false });
      }
    }
  }

  // Function: open in-page helper.
  async function openInPageHelper() {
    if (debugApi) {
      debugApi.ui("popup open helper clicked");
    }

    if (!extensionApi || !extensionApi.tabs || typeof extensionApi.tabs.sendMessage !== "function") {
      setStatus("Helper unavailable here.", "error");
      return;
    }

    try {
      const activeTab = await getActiveTab();
      updateActiveTabState(activeTab);

      if (!popupState.activeTabId) {
        setStatus("No active tab.", "error");
        return;
      }

      await extensionApi.tabs.sendMessage(popupState.activeTabId, {
        type: "merged-link-lab:toggle-page-pane"
      });

      setStatus("Helper opened.", "saved");
      window.close();
    } catch (error) {
      setStatus(
        "Helper unavailable: " + (error && error.message ? error.message : "unknown error"),
        "error"
      );
    }
  }

  // Function: open help page.
  async function openHelpPage() {
    await pageUi.openExtensionPage(extensionApi, "help.html", "Help", setStatus, {
      closeOnSuccess: true,
      unavailableMessage: "Help unavailable here."
    });
  }

  // Function: open diagnostics page.
  async function openDiagnosticsPage() {
    if (debugApi) {
      debugApi.ui("popup open diagnostics clicked");
    }

    try {
      const activeTab = await getActiveTab();
      const sourceTabId = activeTab && activeTab.id ? String(activeTab.id) : "";
      const diagnosticsPageName = sourceTabId
        ? "diagnostics.html?tabId=" + encodeURIComponent(sourceTabId)
        : "diagnostics.html";

      await pageUi.openExtensionPage(extensionApi, diagnosticsPageName, "Diagnostics", setStatus, {
        closeOnSuccess: true,
        unavailableMessage: "Diagnostics unavailable here."
      });
    } catch (error) {
      setStatus(
        "Diagnostics open failed: " + pageUi.getReadableErrorMessage(error),
        "error"
      );
    }
  }

  // Function: open debugging page.
  async function openDebuggingPage() {
    if (debugApi) {
      debugApi.ui("popup open debugging clicked");
    }

    await pageUi.openExtensionPage(extensionApi, "debugging.html", "Debugging", setStatus, {
      closeOnSuccess: true,
      unavailableMessage: "Debugging unavailable here."
    });
  }

  // Function: open full settings page.
  async function openSettingsPage() {
    if (debugApi) {
      debugApi.ui("popup open settings clicked");
    }

    await pageUi.openSettingsPage(extensionApi, setStatus, {
      closeOnSuccess: true,
      unavailableMessage: "Settings unavailable here."
    });
  }

  // Function: bind ui.
  function bindUi() {
    if (DOM.openPagePaneButton) {
      DOM.openPagePaneButton.addEventListener("click", openInPageHelper);
    }

    if (DOM.openHelpPageButton) {
      DOM.openHelpPageButton.addEventListener("click", openHelpPage);
    }

    if (DOM.openDiagnosticsPageButton) {
      DOM.openDiagnosticsPageButton.addEventListener("click", openDiagnosticsPage);
    }

    if (DOM.openDebuggingPageButton) {
      DOM.openDebuggingPageButton.addEventListener("click", openDebuggingPage);
    }

    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.addEventListener("change", saveSettings);
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.addEventListener("change", saveSettings);
    }

    if (DOM.refreshDiagnosticsButton) {
      DOM.refreshDiagnosticsButton.addEventListener("click", refreshDiagnostics);
    }

    if (DOM.openSettingsPageButton) {
      DOM.openSettingsPageButton.addEventListener("click", openSettingsPage);
    }
  }

  // Function: initialize popup.
  async function initializePopup() {
    if (DOM.extensionVersion && extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getManifest === "function") {
      const manifest = extensionApi.runtime.getManifest();
      DOM.extensionVersion.textContent = "v" + String(manifest && manifest.version ? manifest.version : "0.0.0");
    }

    bindUi();
    await loadSettings();
    if (DOM.diagnosticsList || DOM.diagnosticBadge) {
      await refreshDiagnostics();
    } else {
      setStatus("Controls ready.", "");
    }
  }

  initializePopup();
})();
