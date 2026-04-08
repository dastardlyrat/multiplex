// Function: initialize merged link lab settings page.
(function initializeMergedLinkLabSettingsPage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const pageUi = globalThis.urlForensicsPageUi;
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
  const applyStoredBooleanSettingToControl = storageModel.applyStoredBooleanSettingToControl;
  const settingsState = {
    manifest: null,
    storageSnapshot: null,
    senderEmailList: defaults.autoApplyMirrorSenderEmailList.slice()
  };
  const DOM = {
    enableUrlNormalizationRepair: document.getElementById("enableUrlNormalizationRepair"),
    stripKnownTrackingParameters: document.getElementById("stripKnownTrackingParameters"),
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
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  // Function: set sender-address status.
  function setSenderAddressStatus(message, tone) {
    pageUi.setStatusText(DOM.senderAddressStatus, message, tone);
  }

  // Function: set diagnostic badge.
  function setDiagnosticBadge(text) {
    pageUi.setBadgeText(DOM.diagnosticBadge, text, "Unavailable");
  }

  // Function: format timestamp.
  function formatTimestamp(timestampValue) {
    return pageUi.formatTimestamp(timestampValue);
  }

  // Function: shorten value.
  function shortenValue(value, maximumLength) {
    return pageUi.shortenValue(value, Number.isFinite(maximumLength) ? maximumLength : 92);
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
    pageUi.renderDefinitionRows(DOM.diagnosticsList, rows, "diagnostic-row");
  }

  // Function: render diagnostics.
  function renderDiagnostics() {
    const rows = storageModel.buildStorageDiagnosticsRows({
      manifest: settingsState.manifest,
      storageSnapshot: settingsState.storageSnapshot,
      pageLabel: "Settings Page",
      pageUrl: window.location.href,
      readyState: document.readyState,
      shortenValue: shortenValue,
      formatTimestamp: formatTimestamp
    });

    setDiagnosticBadge(storageModel.getStorageBadgeLabel(settingsState.storageSnapshot));
    renderDiagnosticsList(rows);
  }
  // Function: apply default checkbox values.
  function applyDefaultCheckboxValues() {
    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.checked = defaults.enableUrlNormalizationRepair;
    }

    if (DOM.stripKnownTrackingParameters) {
      DOM.stripKnownTrackingParameters.checked = defaults.stripKnownTrackingParameters;
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
      [storageKeys.stripKnownTrackingParameters]: !!(DOM.stripKnownTrackingParameters && DOM.stripKnownTrackingParameters.checked),
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

    if (changedControlId === "stripKnownTrackingParameters") {
      return isEnabled
        ? "Saved. Enabled tracker filters will be stripped from workflow URLs."
        : "Saved. Tracker filters are saved but currently bypassed.";
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

  // Function: check whether settings controls are available.
  function hasSettingsControls() {
    return !!(
      DOM.enableUrlNormalizationRepair ||
      DOM.replaceEmailBodyWithMirrorContent ||
      DOM.stripKnownTrackingParameters ||
      DOM.autoApplyMirrorForConfiguredSenders ||
      DOM.senderAddressList
    );
  }

  // Function: check whether settings storage can be read.
  function canReadSettingsStorage() {
    return !!(
      extensionApi &&
      extensionApi.storage &&
      extensionApi.storage.local &&
      typeof extensionApi.storage.local.get === "function"
    );
  }

  // Function: resolve load settings options.
  function resolveLoadSettingsOptions(options) {
    const optionBag = options || {};

    return {
      silentStatus: optionBag.silentStatus === true
    };
  }

  // Function: apply stored checkbox values.
  function applyStoredCheckboxValues(storedSettings) {
    applyStoredBooleanSettingToControl(
      DOM.enableUrlNormalizationRepair,
      storedSettings,
      storageKeys.enableUrlNormalizationRepair,
      defaults.enableUrlNormalizationRepair
    );
    applyStoredBooleanSettingToControl(
      DOM.stripKnownTrackingParameters,
      storedSettings,
      storageKeys.stripKnownTrackingParameters,
      defaults.stripKnownTrackingParameters
    );
    applyStoredBooleanSettingToControl(
      DOM.replaceEmailBodyWithMirrorContent,
      storedSettings,
      storageKeys.replaceEmailBodyWithMirrorContent,
      defaults.replaceEmailBodyWithMirrorContent
    );

    if (DOM.autoApplyMirrorForConfiguredSenders) {
      const resolvedAutoApplyValue = resolveStoredAutoApplyConfiguredSendersValue(storedSettings);
      DOM.autoApplyMirrorForConfiguredSenders.checked =
        resolvedAutoApplyValue === true || resolvedAutoApplyValue === false
          ? resolvedAutoApplyValue === true
          : defaults.autoApplyMirrorForConfiguredSenders;
    }
  }

  // Function: get stored sender email list.
  function getStoredSenderEmailList(storedSettings) {
    return Object.prototype.hasOwnProperty.call(storedSettings, storageKeys.autoApplyMirrorSenderEmailList)
      ? sanitizeSenderEmailList(storedSettings[storageKeys.autoApplyMirrorSenderEmailList])
      : defaults.autoApplyMirrorSenderEmailList;
  }

  // Function: apply stored settings to controls.
  function applyStoredSettingsToControls(storedSettings) {
    applyStoredCheckboxValues(storedSettings);
    applySenderEmailList(getStoredSenderEmailList(storedSettings));
  }

  // Function: log loaded settings debug state.
  function logLoadedSettingsDebugState() {
    if (!debugApi) {
      return;
    }

    debugApi.storage("settings loaded", {
      senderEmailCount: settingsState.senderEmailList.length,
      enableUrlNormalizationRepair: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
      stripKnownTrackingParameters: !!(DOM.stripKnownTrackingParameters && DOM.stripKnownTrackingParameters.checked),
      replaceEmailBodyWithMirrorContent: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked),
      autoApplyMirrorForConfiguredSenders: !!(DOM.autoApplyMirrorForConfiguredSenders && DOM.autoApplyMirrorForConfiguredSenders.checked)
    });
    debugApi.functionOut("settings.loadSettings", { source: "storage.local" });
  }

  // Function: finish successful settings load.
  function finishSuccessfulSettingsLoad(storedSettings, loadOptions) {
    setSettingsStorageSnapshot("storage.local", storedSettings, "");
    renderDiagnostics();
    setSenderAddressStatus("Sender address list loaded.", "");

    if (!loadOptions.silentStatus) {
      setStatus("Settings loaded. You can change any toggle at any time.", "");
    }

    logLoadedSettingsDebugState();
  }

  // Function: handle settings controls unavailable.
  function handleSettingsControlsUnavailable() {
    renderDiagnostics();

    if (debugApi) {
      debugApi.conditional("settings load skipped because settings controls are unavailable");
      debugApi.functionOut("settings.loadSettings", { source: "no-controls" });
    }
  }

  // Function: handle settings storage unavailable.
  function handleSettingsStorageUnavailable(loadOptions) {
    applyDefaultCheckboxValues();
    setSettingsStorageSnapshot("storage-unavailable", null, "storage.local.get is unavailable in this context.");
    renderDiagnostics();
    setSenderAddressStatus("Storage is unavailable in this context.", "error");

    if (!loadOptions.silentStatus) {
      setStatus("Storage is unavailable in this context.", "error");
    }

    if (debugApi) {
      debugApi.storage("settings storage unavailable", { hasExtensionApi: !!extensionApi });
      debugApi.functionOut("settings.loadSettings", { source: "storage-unavailable" });
    }
  }

  // Function: handle settings load failure.
  function handleSettingsLoadFailure(error, loadOptions) {
    const errorMessage = error && error.message ? error.message : "unknown error";

    applyDefaultCheckboxValues();
    setSettingsStorageSnapshot("storage-error", null, errorMessage);
    renderDiagnostics();
    setSenderAddressStatus("Could not load sender address list: " + errorMessage, "error");

    if (!loadOptions.silentStatus) {
      setStatus("Could not load settings: " + errorMessage, "error");
    }

    if (debugApi) {
      debugApi.error("settings load failed", { message: errorMessage });
      debugApi.functionOut("settings.loadSettings", { source: "storage-error" });
    }
  }

  // Function: load settings.
  async function loadSettings(options) {
    if (debugApi) {
      debugApi.functionIn("settings.loadSettings", { silentStatus: !!(options && options.silentStatus) });
    }

    const loadOptions = resolveLoadSettingsOptions(options);

    if (!hasSettingsControls()) {
      handleSettingsControlsUnavailable();
      return;
    }

    if (!canReadSettingsStorage()) {
      handleSettingsStorageUnavailable(loadOptions);
      return;
    }

    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys());
      applyStoredSettingsToControls(storedSettings);
      finishSuccessfulSettingsLoad(storedSettings, loadOptions);
    } catch (error) {
      handleSettingsLoadFailure(error, loadOptions);
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
      (
        !DOM.enableUrlNormalizationRepair &&
        !DOM.stripKnownTrackingParameters &&
        !DOM.replaceEmailBodyWithMirrorContent &&
        !DOM.autoApplyMirrorForConfiguredSenders
      ) ||
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
    await pageUi.openExtensionPage(extensionApi, "help.html", "Help", setStatus);
  }

  // Function: open diagnostics page.
  async function openDiagnosticsPage() {
    if (debugApi) {
      debugApi.ui("settings open diagnostics clicked");
    }

    await pageUi.openExtensionPage(extensionApi, "diagnostics.html", "Diagnostics", setStatus);
  }

  // Function: open debugging page.
  async function openDebuggingPage() {
    if (debugApi) {
      debugApi.ui("settings open debugging clicked");
    }

    await pageUi.openExtensionPage(extensionApi, "debugging.html", "Debugging", setStatus);
  }

  // Function: open storage page.
  async function openStoragePage() {
    if (debugApi) {
      debugApi.ui("settings open storage clicked");
    }

    await pageUi.openExtensionPage(extensionApi, "storage.html", "Storage", setStatus);
  }

  // Function: handle storage changes.
  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes) {
      return;
    }

    let didUpdate = false;

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.enableUrlNormalizationRepair)) {
      if (DOM.enableUrlNormalizationRepair) {
        DOM.enableUrlNormalizationRepair.checked =
          changes[storageKeys.enableUrlNormalizationRepair].newValue === undefined
            ? defaults.enableUrlNormalizationRepair
            : changes[storageKeys.enableUrlNormalizationRepair].newValue === true;
      }
      didUpdate = true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.stripKnownTrackingParameters)) {
      if (DOM.stripKnownTrackingParameters) {
        DOM.stripKnownTrackingParameters.checked =
          changes[storageKeys.stripKnownTrackingParameters].newValue === undefined
            ? defaults.stripKnownTrackingParameters
            : changes[storageKeys.stripKnownTrackingParameters].newValue === true;
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

    if (DOM.stripKnownTrackingParameters) {
      DOM.stripKnownTrackingParameters.addEventListener("change", saveSettings);
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
