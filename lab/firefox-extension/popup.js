// Function: initialize URL Forensics Workbench popup.
(function initializeUrlForensicsPopup() {
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
    debugApi.configure({ context: "popup", module: "popup" });
    debugApi.runtime("popup initialization started");
  }
  // Shared model keeps storage migration and formatting consistent across extension pages.
  const storageModel = pageDependencies.storageModel;
  const storageKeys = storageModel.storageKeys;
  const defaults = storageModel.defaultSettings;
  const applyStoredBooleanSettingToControl = storageModel.applyStoredBooleanSettingToControl;
  const setTrackingParameterBucketEnabled = storageModel.setTrackingParameterBucketEnabled;
  const isTrackingParameterBucketFullyEnabled = storageModel.isTrackingParameterBucketFullyEnabled;
  const popupState = {
    storageSnapshot: null
  };
  const DOM = {
    extensionVersion: document.getElementById("extensionVersion"),
    openPagePaneButton: document.getElementById("openPagePaneButton"),
    openSettingsPageButtonHero: document.getElementById("openSettingsPageButtonHero"),
    enableUrlNormalizationRepair: document.getElementById("enableUrlNormalizationRepair"),
    enableSafeTrackerCleaning: document.getElementById("enableSafeTrackerCleaning"),
    replaceEmailBodyWithMirrorContent: document.getElementById("replaceEmailBodyWithMirrorContent"),
    statusMessage: document.getElementById("statusMessage")
  };

  // Function: set status.
  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  // Function: check whether the toolbar is running on a mobile device.
  function isMobileDeviceDetected() {
    const pageNavigation = globalScope && globalScope.urlForensicsPageNavigation
      ? globalScope.urlForensicsPageNavigation
      : null;

    return !!(
      pageNavigation &&
      typeof pageNavigation.isMobileDeviceDetected === "function" &&
      pageNavigation.isMobileDeviceDetected()
    );
  }

  // Function: hide helper launch controls that are not available on mobile.
  function syncMobileToolbarControls() {
    if (!DOM.openPagePaneButton) {
      return false;
    }

    const shouldHideHelperButton = isMobileDeviceDetected();
    DOM.openPagePaneButton.hidden = shouldHideHelperButton;
    DOM.openPagePaneButton.disabled = shouldHideHelperButton;
    DOM.openPagePaneButton.setAttribute("aria-hidden", shouldHideHelperButton ? "true" : "false");
    return shouldHideHelperButton;
  }

  // Function: apply default settings.
  function applyDefaultSettings() {
    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.checked = defaults.enableUrlNormalizationRepair;
    }

    if (DOM.enableSafeTrackerCleaning) {
      DOM.enableSafeTrackerCleaning.checked = defaults.stripKnownTrackingParameters === true &&
        isTrackingParameterBucketFullyEnabled(defaults.trackingParameterFilters, "safe");
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.checked = defaults.replaceEmailBodyWithMirrorContent;
    }
  }

  // Function: get popup boolean settings payload.
  function getPopupBooleanSettingsPayload() {
    return {
      [storageKeys.enableUrlNormalizationRepair]: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
      [storageKeys.replaceEmailBodyWithMirrorContent]: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked)
    };
  }

  // Function: check whether safe tracker cleaning is enabled.
  function isSafeTrackerCleaningEnabled(storedSettings) {
    const stripKnownTrackingParameters = storageModel.getEffectiveBooleanSettingValue(
      storedSettings,
      storageKeys.stripKnownTrackingParameters,
      defaults.stripKnownTrackingParameters
    );
    const effectiveTrackingParameterFilters = storageModel.getEffectiveTrackingParameterFilters(
      storedSettings,
      storageKeys.trackingParameterFilters,
      defaults.trackingParameterFilters
    );

    return stripKnownTrackingParameters === true &&
      isTrackingParameterBucketFullyEnabled(effectiveTrackingParameterFilters, "safe");
  }

  // Function: build safe tracker cleaning payload.
  function buildSafeTrackerCleaningPayload(isEnabled) {
    const currentFilters = popupState.storageSnapshot &&
      popupState.storageSnapshot.trackingParameterFilters &&
      popupState.storageSnapshot.trackingParameterFilters.effectiveValue
        ? popupState.storageSnapshot.trackingParameterFilters.effectiveValue
        : defaults.trackingParameterFilters;
    const nextPayload = {
      [storageKeys.stripKnownTrackingParameters]: isEnabled === true
    };

    if (isEnabled === true) {
      nextPayload[storageKeys.trackingParameterFilters] = setTrackingParameterBucketEnabled(currentFilters, "safe", true);
    }

    return nextPayload;
  }

  // Function: get changed setting id from an event.
  function getChangedSettingId(event) {
    return event && event.target ? String(event.target.id || "") : "";
  }

  // Function: check whether popup storage is available for a method.
  function isPopupStorageMethodAvailable(methodName) {
    return !!(
      extensionApi &&
      extensionApi.storage &&
      extensionApi.storage.local &&
      typeof extensionApi.storage.local[methodName] === "function"
    );
  }

  // Function: build save payload for the changed popup setting.
  function buildPopupSettingsSavePayload(event) {
    const changedSettingId = getChangedSettingId(event);

    return {
      changedSettingId: changedSettingId,
      nextPayload: changedSettingId === "enableSafeTrackerCleaning"
        ? buildSafeTrackerCleaningPayload(!!(event && event.target && event.target.checked))
        : getPopupBooleanSettingsPayload()
    };
  }

  // Function: update popup save status text.
  function updatePopupSaveStatus(changedSettingId, nextPayload) {
    if (changedSettingId === "replaceEmailBodyWithMirrorContent") {
      setStatus(
        nextPayload.replaceEmailBodyWithMirrorContent
          ? "Mirror replace on."
          : "Mirror replace off.",
        "saved"
      );
      return;
    }

    if (changedSettingId === "enableSafeTrackerCleaning") {
      setStatus(
        nextPayload[storageKeys.stripKnownTrackingParameters]
          ? "Safe tracker cleaning on."
          : "Safe tracker cleaning off.",
        "saved"
      );
      return;
    }

    setStatus(
      nextPayload.enableUrlNormalizationRepair
        ? "URL repair on."
        : "URL repair off.",
      "saved"
    );
  }

  // Function: log saved popup settings.
  function logSavedPopupSettings(changedSettingId, nextPayload) {
    if (!debugApi) {
      return;
    }

    debugApi.storage("popup settings saved", {
      changedSettingId: changedSettingId,
      enableUrlNormalizationRepair: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
      enableSafeTrackerCleaning: changedSettingId === "enableSafeTrackerCleaning"
        ? nextPayload[storageKeys.stripKnownTrackingParameters] === true
        : !!(DOM.enableSafeTrackerCleaning && DOM.enableSafeTrackerCleaning.checked),
      replaceEmailBodyWithMirrorContent: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked)
    });
    debugApi.functionOut("popup.saveSettings", { saved: true });
  }

  // Function: set popup storage snapshot.
  function setPopupStorageSnapshot(source, storedSettings, errorMessage) {
    popupState.storageSnapshot = storageModel.createStorageSnapshot({
      source: source,
      storedSettings: storedSettings,
      errorMessage: errorMessage
    });
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

      applyStoredBooleanSettingToControl(
        DOM.enableUrlNormalizationRepair,
        storedSettings,
        storageKeys.enableUrlNormalizationRepair,
        defaults.enableUrlNormalizationRepair
      );
      if (DOM.enableSafeTrackerCleaning) {
        DOM.enableSafeTrackerCleaning.checked = isSafeTrackerCleaningEnabled(storedSettings);
      }
      applyStoredBooleanSettingToControl(
        DOM.replaceEmailBodyWithMirrorContent,
        storedSettings,
        storageKeys.replaceEmailBodyWithMirrorContent,
        defaults.replaceEmailBodyWithMirrorContent
      );
      if (debugApi) {
        debugApi.storage("popup settings loaded", {
          enableUrlNormalizationRepair: !!(DOM.enableUrlNormalizationRepair && DOM.enableUrlNormalizationRepair.checked),
          enableSafeTrackerCleaning: !!(DOM.enableSafeTrackerCleaning && DOM.enableSafeTrackerCleaning.checked),
          replaceEmailBodyWithMirrorContent: !!(DOM.replaceEmailBodyWithMirrorContent && DOM.replaceEmailBodyWithMirrorContent.checked)
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
    const changedSettingId = getChangedSettingId(event);
    if (debugApi) {
      debugApi.functionIn("popup.saveSettings", {
        changedSettingId: changedSettingId
      });
    }

    if (!isPopupStorageMethodAvailable("set")) {
      if (debugApi) {
        debugApi.conditional("popup save skipped because storage is unavailable");
        debugApi.functionOut("popup.saveSettings", { saved: false });
      }
      return;
    }

    try {
      const savePayload = buildPopupSettingsSavePayload(event);
      const nextPayload = savePayload.nextPayload;
      await extensionApi.storage.local.set(nextPayload);

      updatePopupSaveStatus(savePayload.changedSettingId, nextPayload);
      await loadSettings();
      logSavedPopupSettings(savePayload.changedSettingId, nextPayload);
    } catch (error) {
      setStatus("Save failed: " + (error && error.message ? error.message : "unknown error"), "error");
      if (debugApi) {
        debugApi.error("popup settings save failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("popup.saveSettings", { saved: false });
      }
    }
  }

  // Function: open in-page helper.
  async function openInPageHelper() {
    if (isMobileDeviceDetected()) {
      setStatus("Helper launch is hidden on mobile devices.", "error");
      return;
    }

    if (debugApi) {
      debugApi.ui("popup open helper clicked");
    }

    if (!extensionApi || !extensionApi.tabs || typeof extensionApi.tabs.sendMessage !== "function") {
      setStatus("Helper unavailable here.", "error");
      return;
    }

    try {
      const activeTab = await getActiveTab();
      const activeTabId = activeTab && activeTab.id ? activeTab.id : null;

      if (!activeTabId) {
        setStatus("No active tab.", "error");
        return;
      }

      const response = await extensionApi.tabs.sendMessage(activeTabId, {
        type: "merged-link-lab:open-page-pane"
      });

      if (response && response.visible === true) {
        setStatus(
          response.hasSnapshot
            ? "Helper opened."
            : "Helper opened. Waiting for email body.",
          "saved"
        );
        window.close();
        return;
      }

      setStatus("Helper unavailable: no readable email body yet.", "error");
    } catch (error) {
      setStatus(
        "Helper unavailable: " + (error && error.message ? error.message : "unknown error"),
        "error"
      );
    }
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
    if (DOM.openPagePaneButton && DOM.openPagePaneButton.hidden !== true) {
      DOM.openPagePaneButton.addEventListener("click", openInPageHelper);
    }

    if (DOM.enableUrlNormalizationRepair) {
      DOM.enableUrlNormalizationRepair.addEventListener("change", saveSettings);
    }

    if (DOM.enableSafeTrackerCleaning) {
      DOM.enableSafeTrackerCleaning.addEventListener("change", saveSettings);
    }

    if (DOM.replaceEmailBodyWithMirrorContent) {
      DOM.replaceEmailBodyWithMirrorContent.addEventListener("change", saveSettings);
    }

    if (DOM.openSettingsPageButtonHero) {
      DOM.openSettingsPageButtonHero.addEventListener("click", openSettingsPage);
    }
  }

  // Function: initialize popup.
  async function initializePopup() {
    if (DOM.extensionVersion && extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getManifest === "function") {
      const manifest = extensionApi.runtime.getManifest();
      DOM.extensionVersion.textContent = "v" + String(manifest && manifest.version ? manifest.version : "0.0.0");
    }

    syncMobileToolbarControls();
    bindUi();
    await loadSettings();
    setStatus("Controls ready.", "");
  }

  initializePopup();
})();
