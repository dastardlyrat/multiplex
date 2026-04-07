// Function: initialize merged link lab settings page.
(function initializeMergedLinkLabSettingsPage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;
  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "settings-page", module: "settings" });
    debugApi.runtime("settings page initialization started");
  }
  // Shared model keeps storage migration and sender-list normalization in one place.
  const storageModel = globalThis.urlForensicsStorageModel;
  const storageKeys = storageModel.storageKeys;
  const legacyStorageKeys = storageModel.legacyStorageKeys;
  const defaults = storageModel.defaultSettings;
  const normalizeSenderEmailAddress = storageModel.normalizeSenderEmailAddress;
  const sanitizeSenderEmailList = storageModel.sanitizeSenderEmailList;
  const resolveStoredAutoApplyConfiguredSendersValue = storageModel.resolveStoredAutoApplyConfiguredSendersValue;
  const formatStorageBooleanEntry = storageModel.formatStorageBooleanEntry;
  const formatStorageEmailListEntry = storageModel.formatStorageEmailListEntry;
  const getStorageSourceLabel = storageModel.getStorageSourceLabel;
  const settingsState = {
    manifest: null,
    storageSnapshot: null,
    senderEmailList: defaults.autoApplyMirrorSenderEmailList.slice()
  };
  const DOM = {
    enableUrlNormalizationRepair: document.getElementById("enableUrlNormalizationRepair"),
    replaceEmailBodyWithMirrorContent: document.getElementById("replaceEmailBodyWithMirrorContent"),
    autoApplyMirrorForConfiguredSenders: document.getElementById("autoApplyMirrorForConfiguredSenders"),
    autoApplySenderListSummary: document.getElementById("autoApplySenderListSummary"),
    senderAddressForm: document.getElementById("senderAddressForm"),
    senderAddressInput: document.getElementById("senderAddressInput"),
    addSenderAddressButton: document.getElementById("addSenderAddressButton"),
    senderAddressList: document.getElementById("senderAddressList"),
    senderAddressCount: document.getElementById("senderAddressCount"),
    senderAddressStatus: document.getElementById("senderAddressStatus"),
    openHelpPageButton: document.getElementById("openHelpPageButton"),
    openDiagnosticsPageButton: document.getElementById("openDiagnosticsPageButton"),
    openDebuggingPageButton: document.getElementById("openDebuggingPageButton"),
    openStoragePageButton: document.getElementById("openStoragePageButton"),
    diagnosticsList: document.getElementById("diagnosticsList"),
    diagnosticBadge: document.getElementById("diagnosticBadge"),
    refreshDiagnosticsButton: document.getElementById("refreshDiagnosticsButton"),
    statusMessage: document.getElementById("statusMessage")
  };

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
    // Branch: follow this path only when the current condition passes.
    if (!DOM.statusMessage) {
      return;
    }

    DOM.statusMessage.textContent = message;
    DOM.statusMessage.classList.toggle("is-saved", tone === "saved");
    DOM.statusMessage.classList.toggle("is-error", tone === "error");
  }

  // Function: set sender-address status.
  function setSenderAddressStatus(message, tone) {
    if (!DOM.senderAddressStatus) {
      return;
    }

    DOM.senderAddressStatus.textContent = String(message || "");
    DOM.senderAddressStatus.classList.toggle("is-saved", tone === "saved");
    DOM.senderAddressStatus.classList.toggle("is-error", tone === "error");
  }

  // Function: set diagnostic badge.
  function setDiagnosticBadge(text) {
    if (!DOM.diagnosticBadge) {
      return;
    }

    DOM.diagnosticBadge.textContent = String(text || "Unavailable");
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
    const safeMaximumLength = Number.isFinite(maximumLength) ? Number(maximumLength) : 92;

    if (!normalizedValue) {
      return "Unavailable";
    }

    if (normalizedValue.length <= safeMaximumLength) {
      return normalizedValue;
    }

    return normalizedValue.slice(0, safeMaximumLength - 3) + "...";
  }

  // Function: update sender count chip.
  function updateSenderAddressCount(senderEmailList) {
    if (!DOM.senderAddressCount) {
      return;
    }

    const safeSenderEmailList = Array.isArray(senderEmailList) ? senderEmailList : [];
    DOM.senderAddressCount.textContent =
      String(safeSenderEmailList.length) + " address" + (safeSenderEmailList.length === 1 ? "" : "es");
  }

  // Function: render sender email list.
  function renderSenderEmailList() {
    if (!DOM.senderAddressList) {
      return;
    }

    const senderEmailList = Array.isArray(settingsState.senderEmailList) ? settingsState.senderEmailList : [];
    const fragment = document.createDocumentFragment();

    DOM.senderAddressList.textContent = "";

    if (!senderEmailList.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "address-list__empty";
      emptyItem.textContent = "No sender addresses are configured yet.";
      fragment.appendChild(emptyItem);
      DOM.senderAddressList.appendChild(fragment);
      updateSenderAddressCount(senderEmailList);
      return;
    }

    senderEmailList.forEach(function appendSenderEmail(emailAddress) {
      const item = document.createElement("li");
      const emailValue = document.createElement("code");
      const deleteButton = document.createElement("button");

      item.className = "address-list__item";
      emailValue.className = "address-list__email";
      emailValue.textContent = emailAddress;

      deleteButton.type = "button";
      deleteButton.className = "address-list__delete";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("data-email-address", emailAddress);
      deleteButton.setAttribute("aria-label", "Delete sender address " + emailAddress);

      item.appendChild(emailValue);
      item.appendChild(deleteButton);
      fragment.appendChild(item);
    });

    DOM.senderAddressList.appendChild(fragment);
    updateSenderAddressCount(senderEmailList);
  }

  // Function: apply sender email list.
  function applySenderEmailList(senderEmailList) {
    settingsState.senderEmailList = sanitizeSenderEmailList(senderEmailList);
    setSenderListSummary(settingsState.senderEmailList);
    renderSenderEmailList();
  }

  // Function: set settings storage snapshot.
  function setSettingsStorageSnapshot(source, storedSettings, errorMessage) {
    settingsState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage
    });
  }

  // Function: set sender list summary.
  function setSenderListSummary(senderEmailList) {
    if (!DOM.autoApplySenderListSummary) {
      return;
    }

    const safeSenderEmailList = Array.isArray(senderEmailList) ? senderEmailList : [];

    if (!safeSenderEmailList.length) {
      DOM.autoApplySenderListSummary.textContent = "Configured list: no sender addresses saved.";
      return;
    }

    DOM.autoApplySenderListSummary.textContent =
      "Configured list: " +
      String(safeSenderEmailList.length) +
      " address" +
      (safeSenderEmailList.length === 1 ? "" : "es") +
      " (" +
      safeSenderEmailList.slice(0, 3).join(", ") +
      (safeSenderEmailList.length > 3 ? ", +" + String(safeSenderEmailList.length - 3) + " more" : "") +
      ").";
  }

  // Function: render diagnostics list.
  function renderDiagnosticsList(rows) {
    if (!DOM.diagnosticsList) {
      return;
    }

    const listRows = Array.isArray(rows) ? rows : [];
    const fragment = document.createDocumentFragment();
    DOM.diagnosticsList.textContent = "";

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

    DOM.diagnosticsList.appendChild(fragment);
  }

  // Function: render diagnostics.
  function renderDiagnostics() {
    const manifest = settingsState.manifest || {};
    const geckoSettings =
      manifest &&
      manifest.browser_specific_settings &&
      manifest.browser_specific_settings.gecko &&
      typeof manifest.browser_specific_settings.gecko === "object"
        ? manifest.browser_specific_settings.gecko
        : {};
    const storageSnapshot = settingsState.storageSnapshot;
    const rows = [
      { label: "Extension", value: String(manifest.name || "URL Forensics Workbench") },
      { label: "Version", value: String(manifest.version || "Unavailable") },
      { label: "Gecko ID", value: String(geckoSettings.id || "Unavailable") },
      { label: "Firefox Min Version", value: String(geckoSettings.strict_min_version || "Unavailable") },
      { label: "Settings Page", value: shortenValue(window.location.href, 108) },
      { label: "Ready State", value: String(document.readyState || "unknown") }
    ];

    if (!storageSnapshot) {
      rows.push({ label: "Storage Source", value: "Unavailable" });
      setDiagnosticBadge("Storage unknown");
      renderDiagnosticsList(rows);
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

    if (storageSnapshot.errorMessage) {
      rows.push({
        label: "Storage Error",
        value: storageSnapshot.errorMessage
      });
    }

    if (storageSnapshot.source === "storage.local" || storageSnapshot.source === "storage.onChanged") {
      setDiagnosticBadge("Storage loaded");
    } else if (storageSnapshot.source === "storage-error") {
      setDiagnosticBadge("Storage error");
    } else if (storageSnapshot.source === "storage-unavailable") {
      setDiagnosticBadge("Storage unavailable");
    } else {
      setDiagnosticBadge("Storage unknown");
    }

    renderDiagnosticsList(rows);
  }

  // Function: apply default checkbox values.
  function applyDefaultCheckboxValues() {
    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.checked = defaults.enableUrlNormalizationRepair;
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.checked = defaults.replaceEmailBodyWithMirrorContent;
    }

    if (DOM.autoApplyMirrorForConfiguredSenders) {
      DOM.autoApplyMirrorForConfiguredSenders.checked = defaults.autoApplyMirrorForConfiguredSenders;
    }

    applySenderEmailList(defaults.autoApplyMirrorSenderEmailList);
  }

  // Function: get next settings payload.
  function getNextSettingsPayload() {
    return {
      [storageKeys.enableUrlNormalizationRepair]: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
      [storageKeys.replaceEmailBodyWithMirrorContent]: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked),
      [storageKeys.autoApplyMirrorForConfiguredSenders]:
        !!(DOM.autoApplyMirrorForConfiguredSenders && DOM.autoApplyMirrorForConfiguredSenders.checked)
    };
  }

  // Function: build saved status message.
  function buildSavedStatusMessage(changedControlId, isEnabled) {
    if (changedControlId === "replaceEmailBodyWithMirrorContent") {
      return isEnabled
        ? "Saved. Replacing the opened email body with mirror content is enabled."
        : "Saved. Replacing the opened email body with mirror content is disabled.";
    }

    if (changedControlId === "autoApplyMirrorForConfiguredSenders") {
      return isEnabled
        ? "Saved. Auto-apply is enabled for the configured sender address list."
        : "Saved. Auto-apply is disabled for the configured sender address list.";
    }

    return isEnabled
      ? "Saved. URL normalization and repair is enabled."
      : "Saved. URL normalization and repair is disabled.";
  }

  // Function: persist sender email list.
  async function persistSenderEmailList(nextSenderEmailList, successMessage) {
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.set !== "function") {
      setSenderAddressStatus("Storage is unavailable in this context.", "error");
      setStatus("Storage is unavailable in this context.", "error");
      return;
    }

    const sanitizedSenderEmailList = sanitizeSenderEmailList(nextSenderEmailList);

    try {
      await extensionApi.storage.local.set({
        [storageKeys.autoApplyMirrorSenderEmailList]: sanitizedSenderEmailList
      });

      applySenderEmailList(sanitizedSenderEmailList);

      const nextSnapshotSettings = getNextSettingsPayload();
      nextSnapshotSettings[storageKeys.autoApplyMirrorSenderEmailList] = sanitizedSenderEmailList.slice();
      setSettingsStorageSnapshot("storage.local", nextSnapshotSettings, "");
      renderDiagnostics();

      setSenderAddressStatus(successMessage, "saved");
      setStatus(successMessage, "saved");
    } catch (error) {
      const errorMessage = "Could not save sender address list: " + (error && error.message ? error.message : "unknown error");
      setSenderAddressStatus(errorMessage, "error");
      setStatus(errorMessage, "error");
    }
  }

  // Function: handle sender address submit.
  async function handleSenderAddressSubmit(event) {
    if (event) {
      event.preventDefault();
    }

    const nextEmailAddress = normalizeSenderEmailAddress(DOM.senderAddressInput ? DOM.senderAddressInput.value : "");

    if (!nextEmailAddress) {
      setSenderAddressStatus("Enter a valid sender email address before adding it.", "error");
      return;
    }

    if (settingsState.senderEmailList.indexOf(nextEmailAddress) !== -1) {
      setSenderAddressStatus("That sender address is already in the list.", "error");
      return;
    }

    await persistSenderEmailList(
      settingsState.senderEmailList.concat(nextEmailAddress),
      "Added sender address " + nextEmailAddress + "."
    );

    if (DOM.senderAddressInput) {
      DOM.senderAddressInput.value = "";
      DOM.senderAddressInput.focus();
    }
  }

  // Function: handle sender address delete.
  async function handleSenderAddressDelete(event) {
    const targetElement = event && event.target ? event.target : null;
    const deleteButton = targetElement && typeof targetElement.closest === "function"
      ? targetElement.closest(".address-list__delete")
      : null;

    if (!deleteButton) {
      return;
    }

    const targetEmailAddress = normalizeSenderEmailAddress(deleteButton.getAttribute("data-email-address"));

    if (!targetEmailAddress) {
      return;
    }

    await persistSenderEmailList(
      settingsState.senderEmailList.filter(function keepSenderEmail(emailAddress) {
        return emailAddress !== targetEmailAddress;
      }),
      "Deleted sender address " + targetEmailAddress + "."
    );
  }

  // Function: load settings.
  async function loadSettings(options) {
    if (debugApi) {
      debugApi.functionIn("settings.loadSettings", { silentStatus: !!(options && options.silentStatus) });
    }

    const optionBag = options || {};
    const silentStatus = optionBag.silentStatus === true;

    // Branch: follow this path only when the current condition passes.
    if (
      !DOM.enableUrlNormalizationRepair &&
      !DOM.replaceEmailBodyWithMirrorContent &&
      !DOM.autoApplyMirrorForConfiguredSenders &&
      !DOM.senderAddressList
    ) {
      renderDiagnostics();
      if (debugApi) {
        debugApi.conditional("settings load skipped because settings controls are unavailable");
        debugApi.functionOut("settings.loadSettings", { source: "no-controls" });
      }
      return;
    }

    // Branch: follow this path only when the current condition passes.
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      applyDefaultCheckboxValues();
      setSettingsStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this context.");
      renderDiagnostics();
      setSenderAddressStatus("Storage is unavailable in this context.", "error");
      if (!silentStatus) {
        setStatus("Storage is unavailable in this context.", "error");
      }
      if (debugApi) {
        debugApi.storage("settings storage unavailable", { hasExtensionApi: !!extensionApi });
        debugApi.functionOut("settings.loadSettings", { source: "storage-unavailable" });
      }
      return;
    }

    // Branch: try the primary operation before handling failures.
    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys());

      if (DOM.enableUrlNormalizationRepair) {
        DOM.enableUrlNormalizationRepair.checked = storedSettings[storageKeys.enableUrlNormalizationRepair] === true;
      }

      if (DOM.replaceEmailBodyWithMirrorContent) {
        DOM.replaceEmailBodyWithMirrorContent.checked = storedSettings[storageKeys.replaceEmailBodyWithMirrorContent] === true;
      }

      if (DOM.autoApplyMirrorForConfiguredSenders) {
        const resolvedAutoApplyValue = resolveStoredAutoApplyConfiguredSendersValue(storedSettings);
        DOM.autoApplyMirrorForConfiguredSenders.checked =
          resolvedAutoApplyValue === true || resolvedAutoApplyValue === false
            ? resolvedAutoApplyValue === true
            : defaults.autoApplyMirrorForConfiguredSenders;
      }

      applySenderEmailList(
        Object.prototype.hasOwnProperty.call(storedSettings, storageKeys.autoApplyMirrorSenderEmailList)
          ? sanitizeSenderEmailList(storedSettings[storageKeys.autoApplyMirrorSenderEmailList])
          : defaults.autoApplyMirrorSenderEmailList
      );

      setSettingsStorageSnapshot("storage.local", storedSettings, "");
      renderDiagnostics();
      setSenderAddressStatus("Sender address list loaded.", "");
      if (!silentStatus) {
        setStatus("Settings loaded. You can change any toggle at any time.", "");
      }
      if (debugApi) {
        debugApi.storage("settings loaded", {
          senderEmailCount: settingsState.senderEmailList.length,
          enableUrlNormalizationRepair: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
          replaceEmailBodyWithMirrorContent: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked),
          autoApplyMirrorForConfiguredSenders: !!(DOM.autoApplyMirrorForConfiguredSenders && DOM.autoApplyMirrorForConfiguredSenders.checked)
        });
        debugApi.functionOut("settings.loadSettings", { source: "storage.local" });
      }
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      applyDefaultCheckboxValues();
      setSettingsStorageSnapshot(
        "storage-error",
        null,
        error && error.message ? error.message : "unknown error"
      );
      renderDiagnostics();
      setSenderAddressStatus(
        "Could not load sender address list: " + (error && error.message ? error.message : "unknown error"),
        "error"
      );
      if (!silentStatus) {
        setStatus("Could not load settings: " + (error && error.message ? error.message : "unknown error"), "error");
      }
      if (debugApi) {
        debugApi.error("settings load failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("settings.loadSettings", { source: "storage-error" });
      }
    }
  }

  // Function: save settings.
  async function saveSettings(event) {
    if (debugApi) {
      debugApi.functionIn("settings.saveSettings", {
        changedControlId: event && event.target ? event.target.id : ""
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (
      (!DOM.enableUrlNormalizationRepair && !DOM.replaceEmailBodyWithMirrorContent && !DOM.autoApplyMirrorForConfiguredSenders) ||
      !extensionApi ||
      !extensionApi.storage ||
      !extensionApi.storage.local ||
      typeof extensionApi.storage.local.set !== "function"
    ) {
      if (debugApi) {
        debugApi.conditional("settings save skipped because storage or controls are unavailable");
        debugApi.functionOut("settings.saveSettings", { saved: false });
      }
      return;
    }

    // Branch: try the primary operation before handling failures.
    try {
      const nextSettingsPayload = getNextSettingsPayload();
      const changedControlId = event && event.target ? event.target.id : "";
      await extensionApi.storage.local.set(nextSettingsPayload);

      setStatus(
        buildSavedStatusMessage(changedControlId, !!nextSettingsPayload[changedControlId]),
        "saved"
      );
      await loadSettings({ silentStatus: true });
      if (debugApi) {
        debugApi.storage("settings saved", {
          changedControlId: changedControlId,
          changedValue: !!nextSettingsPayload[changedControlId]
        });
        debugApi.functionOut("settings.saveSettings", { saved: true });
      }
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      setStatus("Could not save settings: " + (error && error.message ? error.message : "unknown error"), "error");
      if (debugApi) {
        debugApi.error("settings save failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("settings.saveSettings", { saved: false });
      }
    }
  }

  // Function: refresh diagnostics.
  async function refreshDiagnostics() {
    await loadSettings({ silentStatus: true });

    if (settingsState.storageSnapshot && settingsState.storageSnapshot.source === "storage-error") {
      setStatus("Diagnostics refreshed with storage read error details.", "error");
      return;
    }

    if (settingsState.storageSnapshot && settingsState.storageSnapshot.source === "storage-unavailable") {
      setStatus("Diagnostics refreshed. Storage API is unavailable in this context.", "error");
      return;
    }

    setStatus("Diagnostics refreshed for the full settings page.", "saved");
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

  // Function: open diagnostics page.
  async function openDiagnosticsPage() {
    if (debugApi) {
      debugApi.ui("settings open diagnostics clicked");
    }

    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      setStatus("Diagnostics page is unavailable in this context.", "error");
      return;
    }

    try {
      const diagnosticsUrl = extensionApi.runtime.getURL("diagnostics.html");

      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        await extensionApi.tabs.create({ url: diagnosticsUrl });
      } else {
        window.open(diagnosticsUrl, "_blank", "noopener");
      }

      setStatus("Opened diagnostics page.", "saved");
    } catch (error) {
      setStatus("Could not open diagnostics page: " + (error && error.message ? error.message : "unknown error"), "error");
    }
  }

  // Function: open debugging page.
  async function openDebuggingPage() {
    if (debugApi) {
      debugApi.ui("settings open debugging clicked");
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
      debugApi.ui("settings open storage clicked");
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

  // Function: handle storage changes.
  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes) {
      return;
    }

    let didUpdate = false;

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.enableUrlNormalizationRepair)) {
      if (DOM.enableUrlNormalizationRepair) {
        DOM.enableUrlNormalizationRepair.checked = changes[storageKeys.enableUrlNormalizationRepair].newValue === true;
      }
      didUpdate = true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.replaceEmailBodyWithMirrorContent)) {
      if (DOM.replaceEmailBodyWithMirrorContent) {
        DOM.replaceEmailBodyWithMirrorContent.checked = changes[storageKeys.replaceEmailBodyWithMirrorContent].newValue === true;
      }
      didUpdate = true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.autoApplyMirrorForConfiguredSenders)) {
      if (DOM.autoApplyMirrorForConfiguredSenders) {
        const hasBooleanValue =
          changes[storageKeys.autoApplyMirrorForConfiguredSenders].newValue === true ||
          changes[storageKeys.autoApplyMirrorForConfiguredSenders].newValue === false;
        DOM.autoApplyMirrorForConfiguredSenders.checked = hasBooleanValue
          ? changes[storageKeys.autoApplyMirrorForConfiguredSenders].newValue === true
          : defaults.autoApplyMirrorForConfiguredSenders;
      }
      didUpdate = true;
    } else if (Object.prototype.hasOwnProperty.call(changes, legacyStorageKeys.autoApplyMirrorForNamedSender)) {
      if (DOM.autoApplyMirrorForConfiguredSenders) {
        const hasBooleanValue =
          changes[legacyStorageKeys.autoApplyMirrorForNamedSender].newValue === true ||
          changes[legacyStorageKeys.autoApplyMirrorForNamedSender].newValue === false;
        DOM.autoApplyMirrorForConfiguredSenders.checked = hasBooleanValue
          ? changes[legacyStorageKeys.autoApplyMirrorForNamedSender].newValue === true
          : defaults.autoApplyMirrorForConfiguredSenders;
      }
      didUpdate = true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.autoApplyMirrorSenderEmailList)) {
      applySenderEmailList(sanitizeSenderEmailList(changes[storageKeys.autoApplyMirrorSenderEmailList].newValue));
      setSenderAddressStatus("Sender address list updated.", "saved");
      didUpdate = true;
    }

    if (didUpdate) {
      const nextSnapshotSettings = getNextSettingsPayload();
      nextSnapshotSettings[storageKeys.autoApplyMirrorSenderEmailList] =
        settingsState.storageSnapshot &&
        settingsState.storageSnapshot.autoApplyMirrorSenderEmailList &&
        Array.isArray(settingsState.storageSnapshot.autoApplyMirrorSenderEmailList.effectiveValue)
          ? settingsState.storageSnapshot.autoApplyMirrorSenderEmailList.effectiveValue.slice()
          : defaults.autoApplyMirrorSenderEmailList.slice();

      if (Object.prototype.hasOwnProperty.call(changes, storageKeys.autoApplyMirrorSenderEmailList)) {
        nextSnapshotSettings[storageKeys.autoApplyMirrorSenderEmailList] =
          sanitizeSenderEmailList(changes[storageKeys.autoApplyMirrorSenderEmailList].newValue);
      }

      setSettingsStorageSnapshot("storage.onChanged", nextSnapshotSettings, "");
      renderDiagnostics();
    }
  }

  // Branch: follow this path only when the current condition passes.
  if (DOM.enableUrlNormalizationRepair) {
    DOM.enableUrlNormalizationRepair.addEventListener("change", saveSettings);
  }

  if (DOM.replaceEmailBodyWithMirrorContent) {
    DOM.replaceEmailBodyWithMirrorContent.addEventListener("change", saveSettings);
  }

  if (DOM.autoApplyMirrorForConfiguredSenders) {
    DOM.autoApplyMirrorForConfiguredSenders.addEventListener("change", saveSettings);
  }

  if (DOM.senderAddressForm) {
    DOM.senderAddressForm.addEventListener("submit", handleSenderAddressSubmit);
  }

  if (DOM.senderAddressList) {
    DOM.senderAddressList.addEventListener("click", handleSenderAddressDelete);
  }

  if (DOM.refreshDiagnosticsButton) {
    DOM.refreshDiagnosticsButton.addEventListener("click", refreshDiagnostics);
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

  if (DOM.openStoragePageButton) {
    DOM.openStoragePageButton.addEventListener("click", openStoragePage);
  }

  if (extensionApi && extensionApi.storage && extensionApi.storage.onChanged) {
    extensionApi.storage.onChanged.addListener(handleStorageChange);
  }

  settingsState.manifest = resolveManifest();
  setSettingsStorageSnapshot("defaults", null, "");
  renderDiagnostics();
  loadSettings();
})();
