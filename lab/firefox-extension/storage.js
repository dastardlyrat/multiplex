// Function: initialize URL Forensics Workbench storage page.
(function initializeUrlForensicsStoragePage() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const storageKeys = {
    enableUrlNormalizationRepair: "enableUrlNormalizationRepair",
    replaceEmailBodyWithMirrorContent: "replaceEmailBodyWithMirrorContent",
    autoApplyMirrorForConfiguredSenders: "autoApplyMirrorForConfiguredSenders",
    autoApplyMirrorSenderEmailList: "autoApplyMirrorSenderEmailList"
  };
  const legacyStorageKeys = {
    autoApplyMirrorForNamedSender: "autoApplyMirrorForNamedSender"
  };
  const debugStorageKeys = {
    programDebugConfig: "programDebugConfig",
    programDebugPageChoices: "programDebugPageChoices"
  };
  const defaults = {
    enableUrlNormalizationRepair: false,
    replaceEmailBodyWithMirrorContent: false,
    autoApplyMirrorForConfiguredSenders: false,
    autoApplyMirrorSenderEmailList: []
  };
  const defaultDebugConfig = {
    level: "off",
    categories: {
      error: true,
      runtime: true,
      storage: true,
      messaging: true,
      ui: true,
      pipeline: true,
      function: false,
      conditional: false,
      loop: false,
      variable: false
    }
  };
  const defaultDebugPageChoices = {
    renderLimit: 750,
    autoRefresh: true
  };
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

  function normalizeSenderEmailAddress(value) {
    const safeValue = String(value || "").trim().toLowerCase();
    const mailtoMatch = safeValue.match(/^mailto:\s*([^?]+)/i);
    const candidateValue = mailtoMatch ? mailtoMatch[1].trim() : safeValue;

    if (!candidateValue) {
      return "";
    }

    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(candidateValue)
      ? candidateValue
      : "";
  }

  function sanitizeSenderEmailList(value) {
    const candidateValues = Array.isArray(value) ? value : (value ? [value] : []);
    const uniqueEmailMap = new Map();

    candidateValues.forEach(function registerSenderEmail(candidateValue) {
      const normalizedEmail = normalizeSenderEmailAddress(candidateValue);

      if (!normalizedEmail || uniqueEmailMap.has(normalizedEmail)) {
        return;
      }

      uniqueEmailMap.set(normalizedEmail, true);
    });

    return Array.from(uniqueEmailMap.keys());
  }

  function resolveStoredAutoApplyConfiguredSendersValue(storedSettings) {
    const safeStoredSettings = storedSettings && typeof storedSettings === "object" ? storedSettings : {};

    if (Object.prototype.hasOwnProperty.call(safeStoredSettings, storageKeys.autoApplyMirrorForConfiguredSenders)) {
      return safeStoredSettings[storageKeys.autoApplyMirrorForConfiguredSenders];
    }

    if (Object.prototype.hasOwnProperty.call(safeStoredSettings, legacyStorageKeys.autoApplyMirrorForNamedSender)) {
      return safeStoredSettings[legacyStorageKeys.autoApplyMirrorForNamedSender];
    }

    return undefined;
  }

  function buildStorageBooleanEntry(storedSettings, key, defaultValue) {
    const hasStoredValue = !!(
      storedSettings &&
      typeof storedSettings === "object" &&
      Object.prototype.hasOwnProperty.call(storedSettings, key)
    );
    const rawValue = hasStoredValue ? storedSettings[key] : undefined;

    return {
      hasStoredValue: hasStoredValue,
      rawValue: rawValue,
      effectiveValue: hasStoredValue ? rawValue === true : defaultValue === true
    };
  }

  function buildStorageEmailListEntry(storedSettings, key, defaultValue) {
    const hasStoredValue = !!(
      storedSettings &&
      typeof storedSettings === "object" &&
      Object.prototype.hasOwnProperty.call(storedSettings, key)
    );
    const rawValue = hasStoredValue ? storedSettings[key] : undefined;

    return {
      hasStoredValue: hasStoredValue,
      rawValue: rawValue,
      effectiveValue: hasStoredValue ? sanitizeSenderEmailList(rawValue) : sanitizeSenderEmailList(defaultValue)
    };
  }

  function normalizeDebugConfigChoices(value) {
    const safeValue = value && typeof value === "object" ? value : {};
    const safeCategories = safeValue.categories && typeof safeValue.categories === "object" ? safeValue.categories : {};
    const allowedLevels = {
      off: true,
      error: true,
      info: true,
      verbose: true,
      trace: true
    };
    const normalizedCategories = Object.assign({}, defaultDebugConfig.categories);

    Object.keys(defaultDebugConfig.categories).forEach(function normalizeDebugCategory(categoryName) {
      if (Object.prototype.hasOwnProperty.call(safeCategories, categoryName)) {
        normalizedCategories[categoryName] = safeCategories[categoryName] === true;
      }
    });
    normalizedCategories.error = true;

    return {
      level: allowedLevels[safeValue.level] ? safeValue.level : defaultDebugConfig.level,
      categories: normalizedCategories
    };
  }

  function normalizeDebugPageChoices(value) {
    const safeValue = value && typeof value === "object" ? value : {};
    const parsedRenderLimit = Number(safeValue.renderLimit);

    return {
      renderLimit: Number.isFinite(parsedRenderLimit) && parsedRenderLimit > 0
        ? Math.min(10000, Math.floor(parsedRenderLimit))
        : defaultDebugPageChoices.renderLimit,
      autoRefresh: safeValue.autoRefresh === true || safeValue.autoRefresh === false
        ? safeValue.autoRefresh
        : defaultDebugPageChoices.autoRefresh
    };
  }

  function debugConfigMatchesDefault(config) {
    const normalizedConfig = normalizeDebugConfigChoices(config);

    if (normalizedConfig.level !== defaultDebugConfig.level) {
      return false;
    }

    return Object.keys(defaultDebugConfig.categories).every(function compareDebugCategory(categoryName) {
      return normalizedConfig.categories[categoryName] === defaultDebugConfig.categories[categoryName];
    });
  }

  function debugPageChoicesMatchDefault(pageChoices) {
    const normalizedChoices = normalizeDebugPageChoices(pageChoices);

    return (
      normalizedChoices.renderLimit === defaultDebugPageChoices.renderLimit &&
      normalizedChoices.autoRefresh === defaultDebugPageChoices.autoRefresh
    );
  }

  function buildDebugConfigEntry(storedSettings) {
    const hasStoredValue = !!(
      storedSettings &&
      typeof storedSettings === "object" &&
      Object.prototype.hasOwnProperty.call(storedSettings, debugStorageKeys.programDebugConfig)
    );
    const rawValue = hasStoredValue ? storedSettings[debugStorageKeys.programDebugConfig] : undefined;
    const effectiveValue = normalizeDebugConfigChoices(rawValue);

    return {
      hasStoredValue: hasStoredValue,
      rawValue: rawValue,
      effectiveValue: effectiveValue,
      differsFromDefault: hasStoredValue && !debugConfigMatchesDefault(rawValue)
    };
  }

  function buildDebugPageChoicesEntry(storedSettings) {
    const hasStoredValue = !!(
      storedSettings &&
      typeof storedSettings === "object" &&
      Object.prototype.hasOwnProperty.call(storedSettings, debugStorageKeys.programDebugPageChoices)
    );
    const rawValue = hasStoredValue ? storedSettings[debugStorageKeys.programDebugPageChoices] : undefined;
    const effectiveValue = normalizeDebugPageChoices(rawValue);

    return {
      hasStoredValue: hasStoredValue,
      rawValue: rawValue,
      effectiveValue: effectiveValue,
      differsFromDefault: hasStoredValue && !debugPageChoicesMatchDefault(rawValue)
    };
  }

  function setStorageSnapshot(source, storedSettings, errorMessage) {
    const safeStoredSettings = storedSettings && typeof storedSettings === "object" ? storedSettings : {};
    const normalizedStoredSettings = Object.assign({}, safeStoredSettings);

    if (
      !Object.prototype.hasOwnProperty.call(normalizedStoredSettings, storageKeys.autoApplyMirrorForConfiguredSenders) &&
      Object.prototype.hasOwnProperty.call(normalizedStoredSettings, legacyStorageKeys.autoApplyMirrorForNamedSender)
    ) {
      normalizedStoredSettings[storageKeys.autoApplyMirrorForConfiguredSenders] =
        normalizedStoredSettings[legacyStorageKeys.autoApplyMirrorForNamedSender];
    }

    const resolvedAutoApplyValue = resolveStoredAutoApplyConfiguredSendersValue(normalizedStoredSettings);

    if (resolvedAutoApplyValue !== undefined) {
      normalizedStoredSettings[storageKeys.autoApplyMirrorForConfiguredSenders] = resolvedAutoApplyValue;
    }

    storageState.storageSnapshot = {
      source: String(source || "unavailable"),
      loadedAt: Date.now(),
      errorMessage: errorMessage ? String(errorMessage) : "",
      enableUrlNormalizationRepair: buildStorageBooleanEntry(
        normalizedStoredSettings,
        storageKeys.enableUrlNormalizationRepair,
        defaults.enableUrlNormalizationRepair
      ),
      replaceEmailBodyWithMirrorContent: buildStorageBooleanEntry(
        normalizedStoredSettings,
        storageKeys.replaceEmailBodyWithMirrorContent,
        defaults.replaceEmailBodyWithMirrorContent
      ),
      autoApplyMirrorForConfiguredSenders: buildStorageBooleanEntry(
        normalizedStoredSettings,
        storageKeys.autoApplyMirrorForConfiguredSenders,
        defaults.autoApplyMirrorForConfiguredSenders
      ),
      autoApplyMirrorSenderEmailList: buildStorageEmailListEntry(
        normalizedStoredSettings,
        storageKeys.autoApplyMirrorSenderEmailList,
        defaults.autoApplyMirrorSenderEmailList
      ),
      programDebugConfig: buildDebugConfigEntry(normalizedStoredSettings),
      programDebugPageChoices: buildDebugPageChoicesEntry(normalizedStoredSettings)
    };
  }

  function getStorageSourceLabel(storageSource) {
    if (storageSource === "storage.local") {
      return "storage.local";
    }

    if (storageSource === "storage.onChanged") {
      return "storage.onChanged event";
    }

    if (storageSource === "storage-unavailable") {
      return "Storage API unavailable";
    }

    if (storageSource === "storage-error") {
      return "Storage read error";
    }

    if (storageSource === "defaults") {
      return "Defaults";
    }

    return "Unavailable";
  }

  function formatStorageBooleanEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return "Unavailable";
    }

    if (entry.hasStoredValue) {
      if (entry.rawValue === true || entry.rawValue === false) {
        return (entry.rawValue ? "true" : "false") + " (stored)";
      }

      return String(entry.rawValue) + " (stored non-boolean)";
    }

    return (entry.effectiveValue ? "true" : "false") + " (default)";
  }

  function formatStorageEmailListEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return "Unavailable";
    }

    const effectiveValue = Array.isArray(entry.effectiveValue) ? entry.effectiveValue : [];
    const sourceLabel = entry.hasStoredValue ? "stored" : "default";

    if (!effectiveValue.length) {
      return "0 addresses (" + sourceLabel + ")";
    }

    return (
      String(effectiveValue.length) +
      " address" +
      (effectiveValue.length === 1 ? "" : "es") +
      " (" +
      sourceLabel +
      "): " +
      effectiveValue.slice(0, 3).join(", ") +
      (effectiveValue.length > 3 ? ", +" + String(effectiveValue.length - 3) + " more" : "")
    );
  }

  function formatDebugConfigEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return "Unavailable";
    }

    const effectiveValue = entry.effectiveValue && typeof entry.effectiveValue === "object"
      ? entry.effectiveValue
      : normalizeDebugConfigChoices(null);
    const enabledCategories = Object.keys(effectiveValue.categories).filter(function keepEnabledCategory(categoryName) {
      return effectiveValue.categories[categoryName] === true;
    });
    const sourceLabel = entry.hasStoredValue
      ? (entry.differsFromDefault ? "stored custom" : "stored default")
      : "not stored; using defaults";

    return (
      sourceLabel +
      "; level=" +
      effectiveValue.level +
      "; categories=" +
      enabledCategories.join(", ")
    );
  }

  function formatDebugPageChoicesEntry(entry) {
    if (!entry || typeof entry !== "object") {
      return "Unavailable";
    }

    const effectiveValue = entry.effectiveValue && typeof entry.effectiveValue === "object"
      ? entry.effectiveValue
      : normalizeDebugPageChoices(null);
    const sourceLabel = entry.hasStoredValue
      ? (entry.differsFromDefault ? "stored custom" : "stored default")
      : "not stored; using defaults";

    return (
      sourceLabel +
      "; renderLimit=" +
      String(effectiveValue.renderLimit) +
      "; liveRefresh=" +
      (effectiveValue.autoRefresh ? "on" : "off")
    );
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
      const storedSettings = await extensionApi.storage.local.get(
        Object.values(storageKeys)
          .concat(Object.values(legacyStorageKeys))
          .concat(Object.values(debugStorageKeys))
      );

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

    const watchedKeys = Object.values(storageKeys)
      .concat(Object.values(legacyStorageKeys))
      .concat(Object.values(debugStorageKeys));
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
