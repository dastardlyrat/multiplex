// Function: initialize merged link lab settings page.
(function initializeMergedLinkLabSettingsPage() {
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
  const debugApi = pageRuntime.debugApi;
  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "settings-page", module: "settings" });
    debugApi.runtime("settings page initialization started");
  }
  // Shared model keeps storage migration and sender-list normalization in one place.
  const storageModel = pageDependencies.storageModel;
  const storageKeys = storageModel.storageKeys;
  const legacyStorageKeys = storageModel.legacyStorageKeys;
  const defaults = storageModel.defaultSettings;
  const normalizeSenderEmailAddress = storageModel.normalizeSenderEmailAddress;
  const sanitizeSenderEmailList = storageModel.sanitizeSenderEmailList;
  const resolveStoredAutoApplyConfiguredSendersValue = storageModel.resolveStoredAutoApplyConfiguredSendersValue;
  const applyStoredBooleanSettingToControl = storageModel.applyStoredBooleanSettingToControl;
  const settingsState = {
    senderEmailList: defaults.autoApplyMirrorSenderEmailList.slice()
  };
  const DOM = {
    enableUrlNormalizationRepair: document.getElementById("enableUrlNormalizationRepair"),
    replaceEmailBodyWithMirrorContent: document.getElementById("replaceEmailBodyWithMirrorContent"),
    autoApplyMirrorOnMobileDevice: document.getElementById("autoApplyMirrorOnMobileDevice"),
    autoApplyMirrorForConfiguredSenders: document.getElementById("autoApplyMirrorForConfiguredSenders"),
    autoApplySenderListSummary: document.getElementById("autoApplySenderListSummary"),
    senderAddressForm: document.getElementById("senderAddressForm"),
    senderAddressInput: document.getElementById("senderAddressInput"),
    addSenderAddressButton: document.getElementById("addSenderAddressButton"),
    senderAddressList: document.getElementById("senderAddressList"),
    senderAddressCount: document.getElementById("senderAddressCount"),
    senderAddressStatus: document.getElementById("senderAddressStatus"),
    statusMessage: document.getElementById("statusMessage")
  };

  // Function: set status.
  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  // Function: set sender-address status.
  function setSenderAddressStatus(message, tone) {
    pageUi.setStatusText(DOM.senderAddressStatus, message, tone);
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

  // Function: apply default checkbox values.
  function applyDefaultCheckboxValues() {
    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.checked = defaults.enableUrlNormalizationRepair;
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.checked = defaults.replaceEmailBodyWithMirrorContent;
    }

    if (DOM.autoApplyMirrorOnMobileDevice) {
      DOM.autoApplyMirrorOnMobileDevice.checked = defaults.autoApplyMirrorOnMobileDevice;
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
      [storageKeys.autoApplyMirrorOnMobileDevice]:
        !!(DOM.autoApplyMirrorOnMobileDevice && DOM.autoApplyMirrorOnMobileDevice.checked),
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

    if (changedControlId === "autoApplyMirrorOnMobileDevice") {
      return isEnabled
        ? "Saved. Mobile-device auto-apply is enabled."
        : "Saved. Mobile-device auto-apply is disabled.";
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
      await loadSettings({ silentStatus: true });

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
      DOM.autoApplyMirrorOnMobileDevice ||
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
      DOM.replaceEmailBodyWithMirrorContent,
      storedSettings,
      storageKeys.replaceEmailBodyWithMirrorContent,
      defaults.replaceEmailBodyWithMirrorContent
    );
    applyStoredBooleanSettingToControl(
      DOM.autoApplyMirrorOnMobileDevice,
      storedSettings,
      storageKeys.autoApplyMirrorOnMobileDevice,
      defaults.autoApplyMirrorOnMobileDevice
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
      replaceEmailBodyWithMirrorContent: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked),
      autoApplyMirrorOnMobileDevice: !!(DOM.autoApplyMirrorOnMobileDevice && DOM.autoApplyMirrorOnMobileDevice.checked),
      autoApplyMirrorForConfiguredSenders: !!(DOM.autoApplyMirrorForConfiguredSenders && DOM.autoApplyMirrorForConfiguredSenders.checked)
    });
    debugApi.functionOut("settings.loadSettings", { source: "storage.local" });
  }

  // Function: finish successful settings load.
  function finishSuccessfulSettingsLoad(storedSettings, loadOptions) {
    setSenderAddressStatus("Sender address list loaded.", "");

    if (!loadOptions.silentStatus) {
      setStatus("Settings loaded. You can change any toggle at any time.", "");
    }

    logLoadedSettingsDebugState();
  }

  // Function: handle settings controls unavailable.
  function handleSettingsControlsUnavailable() {
    if (debugApi) {
      debugApi.conditional("settings load skipped because settings controls are unavailable");
      debugApi.functionOut("settings.loadSettings", { source: "no-controls" });
    }
  }

  // Function: handle settings storage unavailable.
  function handleSettingsStorageUnavailable(loadOptions) {
    applyDefaultCheckboxValues();
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
        !DOM.replaceEmailBodyWithMirrorContent &&
        !DOM.autoApplyMirrorOnMobileDevice &&
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

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.replaceEmailBodyWithMirrorContent)) {
      if (DOM.replaceEmailBodyWithMirrorContent) {
        DOM.replaceEmailBodyWithMirrorContent.checked = changes[storageKeys.replaceEmailBodyWithMirrorContent].newValue === true;
      }
      didUpdate = true;
    }

    if (Object.prototype.hasOwnProperty.call(changes, storageKeys.autoApplyMirrorOnMobileDevice)) {
      if (DOM.autoApplyMirrorOnMobileDevice) {
        DOM.autoApplyMirrorOnMobileDevice.checked =
          changes[storageKeys.autoApplyMirrorOnMobileDevice].newValue === true;
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
      loadSettings({ silentStatus: true });
    }
  }

  // Branch: follow this path only when the current condition passes.
    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.addEventListener("change", saveSettings);
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.addEventListener("change", saveSettings);
    }

  if (DOM.autoApplyMirrorOnMobileDevice) {
    DOM.autoApplyMirrorOnMobileDevice.addEventListener("change", saveSettings);
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

  if (extensionApi && extensionApi.storage && extensionApi.storage.onChanged) {
    extensionApi.storage.onChanged.addListener(handleStorageChange);
  }

  loadSettings();
})();
