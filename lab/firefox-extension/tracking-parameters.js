// Function: initialize tracking-parameter settings page.
(function initializeTrackingParameterSettingsPage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const pageUi = globalThis.urlForensicsPageUi;
  const storageModel = globalThis.urlForensicsStorageModel;
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;

  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "tracking-parameters-page", module: "tracking-parameters" });
    debugApi.runtime("tracking-parameter settings page initialization started");
  }

  const storageKeys = storageModel.storageKeys;
  const defaultSettings = storageModel.defaultSettings;
  const trackingParameterDefinitions = storageModel.trackingParameterDefinitions;
  const normalizeTrackingParameterFilters = storageModel.normalizeTrackingParameterFilters;
  const getEffectiveBooleanSettingValue = storageModel.getEffectiveBooleanSettingValue;
  const getEffectiveTrackingParameterFilters = storageModel.getEffectiveTrackingParameterFilters;
  const getTrackingParameterDefinitionsByBucket = storageModel.getTrackingParameterDefinitionsByBucket;
  const setTrackingParameterBucketEnabled = storageModel.setTrackingParameterBucketEnabled;
  const formatTrackingParameterFilterSummary = storageModel.formatTrackingParameterFilterSummary;
  const safeTrackingParameterDefinitions = getTrackingParameterDefinitionsByBucket("safe");
  const trackerState = {
    manifest: null,
    stripKnownTrackingParameters: defaultSettings.stripKnownTrackingParameters,
    trackingParameterFilters: normalizeTrackingParameterFilters(defaultSettings.trackingParameterFilters)
  };
  const DOM = {
    stripKnownTrackingParameters: document.getElementById("stripKnownTrackingParameters"),
    trackerFilterBadge: document.getElementById("trackerFilterBadge"),
    trackerFilterSummary: document.getElementById("trackerFilterSummary"),
    trackerStripMasterStatus: document.getElementById("trackerStripMasterStatus"),
    enableAllTrackersButton: document.getElementById("enableAllTrackersButton"),
    disableAllTrackersButton: document.getElementById("disableAllTrackersButton"),
    restoreDefaultTrackersButton: document.getElementById("restoreDefaultTrackersButton"),
    trackingParameterList: document.getElementById("trackingParameterList"),
    statusMessage: document.getElementById("statusMessage")
  };

  // Function: set page status.
  function setStatus(message, tone) {
    pageUi.setStatusText(DOM.statusMessage, message, tone);
  }

  // Function: resolve manifest.
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

  // Function: render tracker summary.
  function renderTrackerSummary() {
    const summaryText = formatTrackingParameterFilterSummary(trackerState.trackingParameterFilters, {
      maxVisibleLabels: 6
    });
    const visibleTrackingParameterDefinitions = safeTrackingParameterDefinitions.length
      ? safeTrackingParameterDefinitions
      : trackingParameterDefinitions;
    const enabledSummary = visibleTrackingParameterDefinitions.filter(function keepEnabledTrackingParameter(definition) {
      return trackerState.trackingParameterFilters[definition.key] === true;
    });

    pageUi.setBadgeText(
      DOM.trackerFilterBadge,
      String(enabledSummary.length) + "/" + String(visibleTrackingParameterDefinitions.length) + " safe enabled",
      "Unavailable"
    );

    if (DOM.trackerFilterSummary) {
      DOM.trackerFilterSummary.textContent = summaryText + ". Safe bucket controls are shown here; dubious tracking removal will be added later.";
    }

    if (DOM.trackerStripMasterStatus) {
      DOM.trackerStripMasterStatus.textContent = trackerState.stripKnownTrackingParameters
        ? "Safe tracker cleaning is currently enabled."
        : "Safe tracker cleaning is currently disabled. These filters are saved but inactive until the master switch is turned on.";
    }

    if (DOM.stripKnownTrackingParameters) {
      DOM.stripKnownTrackingParameters.checked = trackerState.stripKnownTrackingParameters === true;
    }
  }

  // Function: create tracker switch row.
  function createTrackerSwitchRow(definition) {
    const row = document.createElement("div");
    const copy = document.createElement("span");
    const label = document.createElement("strong");
    const note = document.createElement("span");
    const switchShell = document.createElement("span");
    const input = document.createElement("input");
    const switchTrack = document.createElement("span");

    row.className = "setting-row";
    copy.className = "setting-copy";
    label.textContent = definition.label;
    note.className = "setting-note";
    note.textContent = definition.description;
    switchShell.className = "switch";
    input.type = "checkbox";
    input.checked = trackerState.trackingParameterFilters[definition.key] === true;
    input.setAttribute("data-tracking-filter-key", definition.key);
    input.setAttribute("aria-label", "Toggle stripping for " + definition.label);
    switchTrack.className = "switch-track";
    switchTrack.setAttribute("aria-hidden", "true");

    copy.appendChild(label);
    copy.appendChild(note);
    switchShell.appendChild(input);
    switchShell.appendChild(switchTrack);
    row.appendChild(copy);
    row.appendChild(switchShell);

    return row;
  }

  // Function: render tracker filter rows.
  function renderTrackerFilterRows() {
    if (!DOM.trackingParameterList) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const visibleTrackingParameterDefinitions = safeTrackingParameterDefinitions.length
      ? safeTrackingParameterDefinitions
      : trackingParameterDefinitions;
    DOM.trackingParameterList.textContent = "";

    visibleTrackingParameterDefinitions.forEach(function appendTrackingParameterRow(definition) {
      fragment.appendChild(createTrackerSwitchRow(definition));
    });

    DOM.trackingParameterList.appendChild(fragment);
    renderTrackerSummary();
  }

  // Function: set tracker filters.
  function setTrackerFilters(nextFilters) {
    trackerState.trackingParameterFilters = normalizeTrackingParameterFilters(nextFilters);
    renderTrackerFilterRows();
  }

  // Function: save tracker filters.
  async function saveTrackerFilters(nextFilters, successMessage) {
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.set !== "function") {
      setStatus("Storage is unavailable in this page.", "error");
      return;
    }

    const normalizedFilters = normalizeTrackingParameterFilters(nextFilters);
    await extensionApi.storage.local.set({
      [storageKeys.trackingParameterFilters]: normalizedFilters
    });
    setTrackerFilters(normalizedFilters);
    setStatus(successMessage, "saved");
  }

  // Function: save master tracking strip setting.
  async function saveTrackingStripMasterSetting(isEnabled) {
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.set !== "function") {
      setStatus("Storage is unavailable in this page.", "error");
      return;
    }

    await extensionApi.storage.local.set({
      [storageKeys.stripKnownTrackingParameters]: isEnabled === true
    });
    trackerState.stripKnownTrackingParameters = isEnabled === true;
    renderTrackerSummary();
    setStatus(
      trackerState.stripKnownTrackingParameters
        ? "Safe tracker cleaning enabled."
        : "Safe tracker cleaning disabled. Filters remain saved.",
      "saved"
    );
  }

  // Function: load tracker settings.
  async function loadTrackerSettings(options) {
    const loadOptions = options && typeof options === "object" ? options : {};
    const silentStatus = loadOptions.silentStatus === true;

    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      renderTrackerFilterRows();
      if (!silentStatus) {
        setStatus("Storage is unavailable in this page.", "error");
      }
      return;
    }

    try {
      const storedSettings = await extensionApi.storage.local.get(storageModel.getStorageReadKeys());

      trackerState.stripKnownTrackingParameters = getEffectiveBooleanSettingValue(
        storedSettings,
        storageKeys.stripKnownTrackingParameters,
        defaultSettings.stripKnownTrackingParameters
      );
      trackerState.trackingParameterFilters = getEffectiveTrackingParameterFilters(
        storedSettings,
        storageKeys.trackingParameterFilters,
        defaultSettings.trackingParameterFilters
      );
      renderTrackerFilterRows();
      if (!silentStatus) {
        setStatus("Safe tracker filters loaded.", "saved");
      }
    } catch (error) {
      renderTrackerFilterRows();
      if (!silentStatus) {
      setStatus(
        "Could not load safe tracker filters: " + (error && error.message ? error.message : "unknown error"),
        "error"
      );
      }
    }
  }

  // Function: handle tracker filter toggle.
  async function handleTrackerFilterToggle(event) {
    const control = event && event.target ? event.target : null;
    const filterKey = control ? control.getAttribute("data-tracking-filter-key") : "";

    if (!filterKey) {
      return;
    }

    const nextFilters = Object.assign({}, trackerState.trackingParameterFilters, {
      [filterKey]: control.checked === true
    });
    const matchingDefinition = trackingParameterDefinitions.find(function findTrackingDefinition(definition) {
      return definition.key === filterKey;
    });

    await saveTrackerFilters(
      nextFilters,
      (matchingDefinition ? matchingDefinition.label : "Tracker filter") + (control.checked ? " enabled." : " disabled.")
    );
  }

  // Function: handle storage changes.
  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes) {
      return;
    }

    if (
      !Object.prototype.hasOwnProperty.call(changes, storageKeys.trackingParameterFilters) &&
      !Object.prototype.hasOwnProperty.call(changes, storageKeys.stripKnownTrackingParameters)
    ) {
      return;
    }

    loadTrackerSettings({ silentStatus: true });
  }

  // Function: bind tracker settings UI.
  function bindUi() {
    if (DOM.trackingParameterList) {
      DOM.trackingParameterList.addEventListener("change", function handleTrackingParameterListChange(event) {
        handleTrackerFilterToggle(event);
      });
    }

    if (DOM.enableAllTrackersButton) {
      DOM.enableAllTrackersButton.addEventListener("click", function enableAllTrackerFilters() {
        const nextFilters = setTrackingParameterBucketEnabled(trackerState.trackingParameterFilters, "safe", true);
        saveTrackerFilters(nextFilters, "Enabled all safe tracker filters.");
      });
    }

    if (DOM.stripKnownTrackingParameters) {
      DOM.stripKnownTrackingParameters.addEventListener("change", function handleTrackingStripMasterChange(event) {
        saveTrackingStripMasterSetting(!!(event && event.target && event.target.checked));
      });
    }

    if (DOM.disableAllTrackersButton) {
      DOM.disableAllTrackersButton.addEventListener("click", function disableAllTrackerFilters() {
        const nextFilters = setTrackingParameterBucketEnabled(trackerState.trackingParameterFilters, "safe", false);
        saveTrackerFilters(nextFilters, "Disabled all safe tracker filters.");
      });
    }

    if (DOM.restoreDefaultTrackersButton) {
      DOM.restoreDefaultTrackersButton.addEventListener("click", function restoreDefaultTrackerFilters() {
        saveTrackerFilters(defaultSettings.trackingParameterFilters, "Restored default safe tracker filters.");
      });
    }

    if (extensionApi && extensionApi.storage && extensionApi.storage.onChanged) {
      extensionApi.storage.onChanged.addListener(handleStorageChange);
    }
  }

  async function initializeTrackingParameterSettingsPage() {
    trackerState.manifest = resolveManifest();
    bindUi();
    renderTrackerFilterRows();
    await loadTrackerSettings({ silentStatus: true });
    setStatus("Safe tracker filter page ready.", "");
  }

  initializeTrackingParameterSettingsPage();
}());
