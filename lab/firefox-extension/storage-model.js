// Function: initialize shared URL Forensics storage model.
(function initializeUrlForensicsStorageModel() {
  "use strict";

  const storageKeys = Object.freeze({
    enableUrlNormalizationRepair: "enableUrlNormalizationRepair",
    replaceEmailBodyWithMirrorContent: "replaceEmailBodyWithMirrorContent",
    autoApplyMirrorForConfiguredSenders: "autoApplyMirrorForConfiguredSenders",
    autoApplyMirrorSenderEmailList: "autoApplyMirrorSenderEmailList"
  });
  const legacyStorageKeys = Object.freeze({
    autoApplyMirrorForNamedSender: "autoApplyMirrorForNamedSender"
  });
  const debugStorageKeys = Object.freeze({
    programDebugConfig: "programDebugConfig",
    programDebugPageChoices: "programDebugPageChoices"
  });
  const defaultSettings = Object.freeze({
    enableUrlNormalizationRepair: false,
    replaceEmailBodyWithMirrorContent: false,
    autoApplyMirrorForConfiguredSenders: false,
    autoApplyMirrorSenderEmailList: Object.freeze([])
  });
  const defaultDebugConfig = Object.freeze({
    level: "off",
    categories: Object.freeze({
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
    })
  });
  const defaultDebugPageChoices = Object.freeze({
    renderLimit: 750,
    autoRefresh: true
  });

  // Function: normalize sender email address.
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

  // Function: sanitize sender email list.
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

  // Function: resolve stored configured-sender auto-apply value.
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

  // Function: normalize stored settings.
  function normalizeStoredSettings(storedSettings) {
    const safeStoredSettings = storedSettings && typeof storedSettings === "object" ? storedSettings : {};
    const normalizedStoredSettings = Object.assign({}, safeStoredSettings);
    const resolvedAutoApplyValue = resolveStoredAutoApplyConfiguredSendersValue(normalizedStoredSettings);

    // Preserve compatibility with the old key while keeping downstream code on the current key.
    if (resolvedAutoApplyValue !== undefined) {
      normalizedStoredSettings[storageKeys.autoApplyMirrorForConfiguredSenders] = resolvedAutoApplyValue;
    }

    return normalizedStoredSettings;
  }

  // Function: build storage boolean entry.
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

  // Function: build storage email list entry.
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

  // Function: normalize debug config choices.
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

  // Function: normalize debug page choices.
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

  // Function: compare debug config choices.
  function debugConfigMatchesDefault(config) {
    const normalizedConfig = normalizeDebugConfigChoices(config);

    if (normalizedConfig.level !== defaultDebugConfig.level) {
      return false;
    }

    return Object.keys(defaultDebugConfig.categories).every(function compareDebugCategory(categoryName) {
      return normalizedConfig.categories[categoryName] === defaultDebugConfig.categories[categoryName];
    });
  }

  // Function: compare debug page choices.
  function debugPageChoicesMatchDefault(pageChoices) {
    const normalizedChoices = normalizeDebugPageChoices(pageChoices);

    return (
      normalizedChoices.renderLimit === defaultDebugPageChoices.renderLimit &&
      normalizedChoices.autoRefresh === defaultDebugPageChoices.autoRefresh
    );
  }

  // Function: build debug config storage entry.
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

  // Function: build debug page choices storage entry.
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

  // Function: create storage snapshot.
  function createStorageSnapshot(options) {
    const snapshotOptions = options && typeof options === "object" ? options : {};
    const normalizedStoredSettings = normalizeStoredSettings(snapshotOptions.storedSettings);
    const snapshot = {
      source: String(snapshotOptions.source || "unavailable"),
      loadedAt: Date.now(),
      errorMessage: snapshotOptions.errorMessage ? String(snapshotOptions.errorMessage) : "",
      enableUrlNormalizationRepair: buildStorageBooleanEntry(
        normalizedStoredSettings,
        storageKeys.enableUrlNormalizationRepair,
        defaultSettings.enableUrlNormalizationRepair
      ),
      replaceEmailBodyWithMirrorContent: buildStorageBooleanEntry(
        normalizedStoredSettings,
        storageKeys.replaceEmailBodyWithMirrorContent,
        defaultSettings.replaceEmailBodyWithMirrorContent
      ),
      autoApplyMirrorForConfiguredSenders: buildStorageBooleanEntry(
        normalizedStoredSettings,
        storageKeys.autoApplyMirrorForConfiguredSenders,
        defaultSettings.autoApplyMirrorForConfiguredSenders
      ),
      autoApplyMirrorSenderEmailList: buildStorageEmailListEntry(
        normalizedStoredSettings,
        storageKeys.autoApplyMirrorSenderEmailList,
        defaultSettings.autoApplyMirrorSenderEmailList
      )
    };

    if (snapshotOptions.includeDebugChoices) {
      snapshot.programDebugConfig = buildDebugConfigEntry(normalizedStoredSettings);
      snapshot.programDebugPageChoices = buildDebugPageChoicesEntry(normalizedStoredSettings);
    }

    return snapshot;
  }

  // Function: get storage read keys.
  function getStorageReadKeys(options) {
    const keyOptions = options && typeof options === "object" ? options : {};
    const readKeys = Object.values(storageKeys).concat(Object.values(legacyStorageKeys));

    if (keyOptions.includeDebugChoices) {
      return readKeys.concat(Object.values(debugStorageKeys));
    }

    return readKeys;
  }

  // Function: get storage source label.
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

  // Function: format storage boolean entry.
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

  // Function: format storage email list entry.
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

  // Function: format debug config entry.
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

  // Function: format debug page choices entry.
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

  globalThis.urlForensicsStorageModel = Object.freeze({
    storageKeys: storageKeys,
    legacyStorageKeys: legacyStorageKeys,
    debugStorageKeys: debugStorageKeys,
    defaultSettings: defaultSettings,
    defaultDebugConfig: defaultDebugConfig,
    defaultDebugPageChoices: defaultDebugPageChoices,
    normalizeSenderEmailAddress: normalizeSenderEmailAddress,
    sanitizeSenderEmailList: sanitizeSenderEmailList,
    resolveStoredAutoApplyConfiguredSendersValue: resolveStoredAutoApplyConfiguredSendersValue,
    normalizeStoredSettings: normalizeStoredSettings,
    buildStorageBooleanEntry: buildStorageBooleanEntry,
    buildStorageEmailListEntry: buildStorageEmailListEntry,
    normalizeDebugConfigChoices: normalizeDebugConfigChoices,
    normalizeDebugPageChoices: normalizeDebugPageChoices,
    debugConfigMatchesDefault: debugConfigMatchesDefault,
    debugPageChoicesMatchDefault: debugPageChoicesMatchDefault,
    buildDebugConfigEntry: buildDebugConfigEntry,
    buildDebugPageChoicesEntry: buildDebugPageChoicesEntry,
    createStorageSnapshot: createStorageSnapshot,
    getStorageReadKeys: getStorageReadKeys,
    getStorageSourceLabel: getStorageSourceLabel,
    formatStorageBooleanEntry: formatStorageBooleanEntry,
    formatStorageEmailListEntry: formatStorageEmailListEntry,
    formatDebugConfigEntry: formatDebugConfigEntry,
    formatDebugPageChoicesEntry: formatDebugPageChoicesEntry
  });
}());
