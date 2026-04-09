"use strict";

function urlForensicsContentSettingsStorageResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsContentSettingsStorageBuildEnvironmentOptions(optionBag) {
  return {
    extensionApi: optionBag.extensionApi || null,
    storageModel: optionBag.storageModel && typeof optionBag.storageModel === "object" ? optionBag.storageModel : null,
    extensionSettings: optionBag.extensionSettings && typeof optionBag.extensionSettings === "object"
      ? optionBag.extensionSettings
      : {},
    extensionStorageSnapshot: optionBag.extensionStorageSnapshot && typeof optionBag.extensionStorageSnapshot === "object"
      ? optionBag.extensionStorageSnapshot
      : {},
    debugApi: optionBag.debugApi && typeof optionBag.debugApi === "object" ? optionBag.debugApi : null,
    getNow: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.getNow,
      function getDefaultNow() {
        return Date.now();
      }
    ),
    getPipelineSettings: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.getPipelineSettings,
      function getMissingPipelineSettings() {
        return {};
      }
    ),
    syncEmailSnapshot: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.syncEmailSnapshot,
      function syncMissingEmailSnapshot() {
        return false;
      }
    )
  };
}

function urlForensicsContentSettingsStorageBuildKeyOptions(optionBag) {
  return {
    urlNormalizationRepairStorageKey: String(optionBag.urlNormalizationRepairStorageKey || ""),
    trackingParameterStripStorageKey: String(optionBag.trackingParameterStripStorageKey || ""),
    trackingParameterFiltersStorageKey: String(optionBag.trackingParameterFiltersStorageKey || ""),
    replaceEmailBodyWithMirrorContentStorageKey: String(optionBag.replaceEmailBodyWithMirrorContentStorageKey || ""),
    allowHelperOpenWithoutDetectedEmailBodyStorageKey: String(optionBag.allowHelperOpenWithoutDetectedEmailBodyStorageKey || ""),
    autoApplyMirrorForConfiguredSendersStorageKey: String(optionBag.autoApplyMirrorForConfiguredSendersStorageKey || ""),
    autoApplyMirrorSenderEmailListStorageKey: String(optionBag.autoApplyMirrorSenderEmailListStorageKey || ""),
    legacyAutoApplyMirrorForNamedSenderStorageKey: String(optionBag.legacyAutoApplyMirrorForNamedSenderStorageKey || "")
  };
}

function urlForensicsContentSettingsStorageBuildApplyOptions(optionBag) {
  return {
    buildStorageBooleanSnapshotEntry: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.buildStorageBooleanSnapshotEntry,
      function buildMissingStorageBooleanSnapshotEntry(storedSettings, storageKey, effectiveValue) {
        return {
          hasStoredValue: !!(storedSettings && Object.prototype.hasOwnProperty.call(storedSettings, storageKey)),
          rawValue: storedSettings ? storedSettings[storageKey] : undefined,
          effectiveValue: effectiveValue
        };
      }
    ),
    buildTrackingParameterFilterSnapshotEntry: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.buildTrackingParameterFilterSnapshotEntry,
      function buildMissingTrackingParameterFilterSnapshotEntry(storedSettings, storageKey, effectiveValue) {
        return {
          hasStoredValue: !!(storedSettings && Object.prototype.hasOwnProperty.call(storedSettings, storageKey)),
          rawValue: storedSettings ? storedSettings[storageKey] : undefined,
          effectiveValue: effectiveValue
        };
      }
    ),
    buildStorageEmailListSnapshotEntry: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.buildStorageEmailListSnapshotEntry,
      function buildMissingStorageEmailListSnapshotEntry(storedSettings, storageKey, effectiveValue) {
        return {
          hasStoredValue: !!(storedSettings && Object.prototype.hasOwnProperty.call(storedSettings, storageKey)),
          rawValue: storedSettings ? storedSettings[storageKey] : undefined,
          effectiveValue: effectiveValue
        };
      }
    ),
    resolveStoredAutoApplyConfiguredSendersValue: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.resolveStoredAutoApplyConfiguredSendersValue,
      function resolveMissingStoredAutoApplyConfiguredSendersValue(storedSettings) {
        return storedSettings && storedSettings.autoApplyMirrorForConfiguredSenders;
      }
    ),
    applyStoredAutoApplyMirrorForConfiguredSendersSetting: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.applyStoredAutoApplyMirrorForConfiguredSendersSetting,
      function applyMissingAutoApplyMirrorForConfiguredSendersSetting(nextValue) {
        if (nextValue === true || nextValue === false) {
          optionBag.extensionSettings.autoApplyMirrorForConfiguredSenders = nextValue === true;
        }
      }
    ),
    applyStoredAutoApplyMirrorSenderEmailList: urlForensicsContentSettingsStorageResolveFunction(
      optionBag.applyStoredAutoApplyMirrorSenderEmailList,
      function applyMissingAutoApplyMirrorSenderEmailList(nextValue) {
        if (Array.isArray(nextValue)) {
          optionBag.extensionSettings.autoApplyMirrorSenderEmailList = nextValue.slice();
        }
      }
    )
  };
}

function urlForensicsContentSettingsStorageCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsContentSettingsStorageBuildEnvironmentOptions(optionBag),
    urlForensicsContentSettingsStorageBuildKeyOptions(optionBag),
    urlForensicsContentSettingsStorageBuildApplyOptions(optionBag)
  ));
}

function urlForensicsContentSettingsStorageDebugCall(debugApi, methodName, message, payload) {
  if (debugApi && typeof debugApi[methodName] === "function") {
    debugApi[methodName](message, payload);
  }
}

function urlForensicsContentSettingsStorageGetDefaultSetting(storageModel, settingName, fallbackValue) {
  return storageModel && storageModel.defaultSettings && Object.prototype.hasOwnProperty.call(storageModel.defaultSettings, settingName)
    ? storageModel.defaultSettings[settingName]
    : fallbackValue;
}

function urlForensicsContentSettingsStorageNormalizeStoredSettings(storedSettings, options) {
  return options.storageModel && typeof options.storageModel.normalizeStoredSettings === "function"
    ? options.storageModel.normalizeStoredSettings(storedSettings)
    : (storedSettings && typeof storedSettings === "object" ? storedSettings : {});
}

function urlForensicsContentSettingsStorageBuildSnapshotValues(normalizedStoredSettings, options) {
  return {
    enableUrlNormalizationRepair: options.buildStorageBooleanSnapshotEntry(
      normalizedStoredSettings,
      options.urlNormalizationRepairStorageKey,
      options.extensionSettings.enableUrlNormalizationRepair
    ),
    stripKnownTrackingParameters: options.buildStorageBooleanSnapshotEntry(
      normalizedStoredSettings,
      options.trackingParameterStripStorageKey,
      options.extensionSettings.stripKnownTrackingParameters
    ),
    trackingParameterFilters: options.buildTrackingParameterFilterSnapshotEntry(
      normalizedStoredSettings,
      options.trackingParameterFiltersStorageKey,
      options.extensionSettings.trackingParameterFilters
    ),
    replaceEmailBodyWithMirrorContent: options.buildStorageBooleanSnapshotEntry(
      normalizedStoredSettings,
      options.replaceEmailBodyWithMirrorContentStorageKey,
      options.extensionSettings.replaceEmailBodyWithMirrorContent
    ),
    allowHelperOpenWithoutDetectedEmailBody: options.buildStorageBooleanSnapshotEntry(
      normalizedStoredSettings,
      options.allowHelperOpenWithoutDetectedEmailBodyStorageKey,
      options.extensionSettings.allowHelperOpenWithoutDetectedEmailBody
    ),
    autoApplyMirrorForConfiguredSenders: options.buildStorageBooleanSnapshotEntry(
      normalizedStoredSettings,
      options.autoApplyMirrorForConfiguredSendersStorageKey,
      options.extensionSettings.autoApplyMirrorForConfiguredSenders
    ),
    autoApplyMirrorSenderEmailList: options.buildStorageEmailListSnapshotEntry(
      normalizedStoredSettings,
      options.autoApplyMirrorSenderEmailListStorageKey,
      options.extensionSettings.autoApplyMirrorSenderEmailList
    )
  };
}

function urlForensicsContentSettingsStorageSetExtensionStorageSnapshot(source, storedSettings, errorMessage, options) {
  const normalizedStoredSettings = urlForensicsContentSettingsStorageNormalizeStoredSettings(storedSettings, options);

  options.extensionStorageSnapshot.source = String(source || "defaults");
  options.extensionStorageSnapshot.loadedAt = options.getNow();
  options.extensionStorageSnapshot.loadError = errorMessage ? String(errorMessage) : "";
  options.extensionStorageSnapshot.values =
    urlForensicsContentSettingsStorageBuildSnapshotValues(normalizedStoredSettings, options);
}

function urlForensicsContentSettingsStorageApplyStoredPipelineSetting(nextValue, options) {
  options.extensionSettings.enableUrlNormalizationRepair = nextValue === true;
}

function urlForensicsContentSettingsStorageApplyStoredTrackingParameterStripSetting(nextValue, options) {
  if (nextValue === true || nextValue === false) {
    options.extensionSettings.stripKnownTrackingParameters = nextValue === true;
    return;
  }

  options.extensionSettings.stripKnownTrackingParameters = urlForensicsContentSettingsStorageGetDefaultSetting(
    options.storageModel,
    "stripKnownTrackingParameters",
    false
  ) === true;
}

function urlForensicsContentSettingsStorageApplyStoredTrackingParameterFiltersSetting(nextValue, options) {
  options.extensionSettings.trackingParameterFilters =
    options.storageModel && typeof options.storageModel.normalizeTrackingParameterFilters === "function"
      ? options.storageModel.normalizeTrackingParameterFilters(nextValue)
      : nextValue;
}

function urlForensicsContentSettingsStorageApplyStoredReplaceEmailBodySetting(nextValue, options) {
  options.extensionSettings.replaceEmailBodyWithMirrorContent = nextValue === true;
}

function urlForensicsContentSettingsStorageApplyStoredAllowHelperOpenWithoutDetectedEmailBodySetting(nextValue, options) {
  options.extensionSettings.allowHelperOpenWithoutDetectedEmailBody = nextValue === true;
}

function urlForensicsContentSettingsStorageGetBooleanStoredValue(storedSettings, storageKey, defaultValue, options) {
  return options.storageModel && typeof options.storageModel.getEffectiveBooleanSettingValue === "function"
    ? options.storageModel.getEffectiveBooleanSettingValue(storedSettings, storageKey, defaultValue)
    : storedSettings[storageKey];
}

function urlForensicsContentSettingsStorageGetTrackingFiltersStoredValue(storedSettings, defaultValue, options) {
  return options.storageModel && typeof options.storageModel.getEffectiveTrackingParameterFilters === "function"
    ? options.storageModel.getEffectiveTrackingParameterFilters(
      storedSettings,
      options.trackingParameterFiltersStorageKey,
      defaultValue
    )
    : storedSettings[options.trackingParameterFiltersStorageKey];
}

function urlForensicsContentSettingsStorageApplyLoadedSettings(storedSettings, options) {
  urlForensicsContentSettingsStorageApplyStoredPipelineSetting(
    urlForensicsContentSettingsStorageGetBooleanStoredValue(
      storedSettings,
      options.urlNormalizationRepairStorageKey,
      urlForensicsContentSettingsStorageGetDefaultSetting(options.storageModel, "enableUrlNormalizationRepair", false),
      options
    ),
    options
  );
  urlForensicsContentSettingsStorageApplyStoredTrackingParameterStripSetting(
    urlForensicsContentSettingsStorageGetBooleanStoredValue(
      storedSettings,
      options.trackingParameterStripStorageKey,
      urlForensicsContentSettingsStorageGetDefaultSetting(options.storageModel, "stripKnownTrackingParameters", false),
      options
    ),
    options
  );
  urlForensicsContentSettingsStorageApplyStoredTrackingParameterFiltersSetting(
    urlForensicsContentSettingsStorageGetTrackingFiltersStoredValue(
      storedSettings,
      urlForensicsContentSettingsStorageGetDefaultSetting(options.storageModel, "trackingParameterFilters", []),
      options
    ),
    options
  );
  urlForensicsContentSettingsStorageApplyStoredReplaceEmailBodySetting(
    storedSettings[options.replaceEmailBodyWithMirrorContentStorageKey],
    options
  );
  urlForensicsContentSettingsStorageApplyStoredAllowHelperOpenWithoutDetectedEmailBodySetting(
    urlForensicsContentSettingsStorageGetBooleanStoredValue(
      storedSettings,
      options.allowHelperOpenWithoutDetectedEmailBodyStorageKey,
      urlForensicsContentSettingsStorageGetDefaultSetting(
        options.storageModel,
        "allowHelperOpenWithoutDetectedEmailBody",
        false
      ),
      options
    ),
    options
  );
  options.applyStoredAutoApplyMirrorForConfiguredSendersSetting(
    options.resolveStoredAutoApplyConfiguredSendersValue(storedSettings)
  );
  options.applyStoredAutoApplyMirrorSenderEmailList(
    storedSettings[options.autoApplyMirrorSenderEmailListStorageKey],
    { useDefaultList: true }
  );
}

function urlForensicsContentSettingsStorageLogLoadedSettings(options) {
  urlForensicsContentSettingsStorageDebugCall(options.debugApi, "storage", "content settings loaded", {
    enableUrlNormalizationRepair: options.extensionSettings.enableUrlNormalizationRepair,
    stripKnownTrackingParameters: options.extensionSettings.stripKnownTrackingParameters,
    trackingParameterFilters: options.extensionSettings.trackingParameterFilters,
    replaceEmailBodyWithMirrorContent: options.extensionSettings.replaceEmailBodyWithMirrorContent,
    allowHelperOpenWithoutDetectedEmailBody: options.extensionSettings.allowHelperOpenWithoutDetectedEmailBody,
    autoApplyMirrorForConfiguredSenders: options.extensionSettings.autoApplyMirrorForConfiguredSenders,
    autoApplyMirrorSenderEmailCount:
      Array.isArray(options.extensionSettings.autoApplyMirrorSenderEmailList)
        ? options.extensionSettings.autoApplyMirrorSenderEmailList.length
        : 0
  });
}

function urlForensicsContentSettingsStorageBuildChangedStoredSettings(options) {
  return {
    [options.urlNormalizationRepairStorageKey]: options.extensionSettings.enableUrlNormalizationRepair,
    [options.trackingParameterStripStorageKey]: options.extensionSettings.stripKnownTrackingParameters,
    [options.trackingParameterFiltersStorageKey]: options.extensionSettings.trackingParameterFilters,
    [options.replaceEmailBodyWithMirrorContentStorageKey]: options.extensionSettings.replaceEmailBodyWithMirrorContent,
    [options.allowHelperOpenWithoutDetectedEmailBodyStorageKey]:
      options.extensionSettings.allowHelperOpenWithoutDetectedEmailBody,
    [options.autoApplyMirrorForConfiguredSendersStorageKey]: options.extensionSettings.autoApplyMirrorForConfiguredSenders,
    [options.autoApplyMirrorSenderEmailListStorageKey]:
      Array.isArray(options.extensionSettings.autoApplyMirrorSenderEmailList)
        ? options.extensionSettings.autoApplyMirrorSenderEmailList.slice()
        : []
  };
}

function urlForensicsContentSettingsStorageApplyStorageChangeEntry(changeEntry, applyValue) {
  if (!changeEntry) {
    return false;
  }

  applyValue(changeEntry.newValue);
  return true;
}

function urlForensicsContentSettingsStorageApplyPrimaryChangeEntries(changes, options) {
  let didUpdateSettings = false;

  [
    {
      key: options.urlNormalizationRepairStorageKey,
      applyValue: function applyPipelineValue(nextValue) {
        urlForensicsContentSettingsStorageApplyStoredPipelineSetting(nextValue, options);
      }
    },
    {
      key: options.trackingParameterStripStorageKey,
      applyValue: function applyTrackingStripValue(nextValue) {
        urlForensicsContentSettingsStorageApplyStoredTrackingParameterStripSetting(nextValue, options);
      }
    },
    {
      key: options.trackingParameterFiltersStorageKey,
      applyValue: function applyTrackingFiltersValue(nextValue) {
        urlForensicsContentSettingsStorageApplyStoredTrackingParameterFiltersSetting(nextValue, options);
      }
    },
    {
      key: options.replaceEmailBodyWithMirrorContentStorageKey,
      applyValue: function applyReplaceEmailBodyValue(nextValue) {
        urlForensicsContentSettingsStorageApplyStoredReplaceEmailBodySetting(nextValue, options);
      }
    },
    {
      key: options.allowHelperOpenWithoutDetectedEmailBodyStorageKey,
      applyValue: function applyAllowHelperOpenWithoutDetectedEmailBodyValue(nextValue) {
        urlForensicsContentSettingsStorageApplyStoredAllowHelperOpenWithoutDetectedEmailBodySetting(nextValue, options);
      }
    }
  ].forEach(function applyChangeHandler(changeHandler) {
    didUpdateSettings = urlForensicsContentSettingsStorageApplyStorageChangeEntry(
      changes[changeHandler.key],
      changeHandler.applyValue
    ) || didUpdateSettings;
  });

  return didUpdateSettings;
}

function urlForensicsContentSettingsStorageApplyConfiguredSenderChange(changes, options) {
  const configuredSenderChange =
    changes[options.autoApplyMirrorForConfiguredSendersStorageKey] ||
    changes[options.legacyAutoApplyMirrorForNamedSenderStorageKey];

  return urlForensicsContentSettingsStorageApplyStorageChangeEntry(
    configuredSenderChange,
    options.applyStoredAutoApplyMirrorForConfiguredSendersSetting
  );
}

function urlForensicsContentSettingsStorageApplySenderListChange(changes, options) {
  return urlForensicsContentSettingsStorageApplyStorageChangeEntry(
    changes[options.autoApplyMirrorSenderEmailListStorageKey],
    function applySenderListValue(nextValue) {
      options.applyStoredAutoApplyMirrorSenderEmailList(nextValue, { useDefaultList: true });
    }
  );
}

function urlForensicsContentSettingsStorageFinalizeStorageChange(changes, didUpdateSettings, options) {
  if (!didUpdateSettings) {
    urlForensicsContentSettingsStorageDebugCall(
      options.debugApi,
      "functionOut",
      "content.handlePipelineStorageChange",
      { updated: false }
    );
    return false;
  }

  urlForensicsContentSettingsStorageSetExtensionStorageSnapshot(
    "storage.onChanged",
    urlForensicsContentSettingsStorageBuildChangedStoredSettings(options),
    "",
    options
  );
  options.syncEmailSnapshot({ forcePublish: true });
  urlForensicsContentSettingsStorageDebugCall(
    options.debugApi,
    "storage",
    "content settings changed; snapshot sync forced",
    { changedKeyCount: Object.keys(changes).length }
  );
  urlForensicsContentSettingsStorageDebugCall(
    options.debugApi,
    "functionOut",
    "content.handlePipelineStorageChange",
    { updated: true }
  );
  return true;
}

function urlForensicsContentSettingsStorageHandlePipelineStorageChange(changes, areaName, options) {
  urlForensicsContentSettingsStorageDebugCall(
    options.debugApi,
    "functionIn",
    "content.handlePipelineStorageChange",
    {
      areaName: areaName || "",
      changedKeyCount: changes ? Object.keys(changes).length : 0
    }
  );

  if (areaName !== "local" || !changes) {
    urlForensicsContentSettingsStorageDebugCall(
      options.debugApi,
      "conditional",
      "content storage change ignored",
      { areaName: areaName || "" }
    );
    urlForensicsContentSettingsStorageDebugCall(
      options.debugApi,
      "functionOut",
      "content.handlePipelineStorageChange",
      { updated: false }
    );
    return false;
  }

  let didUpdateSettings = false;

  didUpdateSettings =
    urlForensicsContentSettingsStorageApplyPrimaryChangeEntries(changes, options) || didUpdateSettings;
  didUpdateSettings =
    urlForensicsContentSettingsStorageApplyConfiguredSenderChange(changes, options) || didUpdateSettings;
  didUpdateSettings =
    urlForensicsContentSettingsStorageApplySenderListChange(changes, options) || didUpdateSettings;

  return urlForensicsContentSettingsStorageFinalizeStorageChange(changes, didUpdateSettings, options);
}

function urlForensicsContentSettingsStorageCreate(options) {
  const resolvedOptions = urlForensicsContentSettingsStorageCreateDefaultOptions(options);

  async function loadPipelineSettings() {
    const storageReadKeys =
      resolvedOptions.storageModel && typeof resolvedOptions.storageModel.getStorageReadKeys === "function"
        ? resolvedOptions.storageModel.getStorageReadKeys()
        : [];

    urlForensicsContentSettingsStorageDebugCall(
      resolvedOptions.debugApi,
      "functionIn",
      "content.loadPipelineSettings"
    );

    if (
      !resolvedOptions.extensionApi ||
      !resolvedOptions.extensionApi.storage ||
      !resolvedOptions.extensionApi.storage.local ||
      typeof resolvedOptions.extensionApi.storage.local.get !== "function"
    ) {
      urlForensicsContentSettingsStorageSetExtensionStorageSnapshot(
        "storage-unavailable",
        null,
        "storage.local.get is unavailable in this page context.",
        resolvedOptions
      );
      urlForensicsContentSettingsStorageDebugCall(
        resolvedOptions.debugApi,
        "storage",
        "content storage unavailable"
      );
      urlForensicsContentSettingsStorageDebugCall(
        resolvedOptions.debugApi,
        "functionOut",
        "content.loadPipelineSettings",
        { source: "storage-unavailable" }
      );
      return resolvedOptions.getPipelineSettings();
    }

    try {
      const storedSettings = await resolvedOptions.extensionApi.storage.local.get(storageReadKeys);

      urlForensicsContentSettingsStorageApplyLoadedSettings(storedSettings, resolvedOptions);
      urlForensicsContentSettingsStorageSetExtensionStorageSnapshot(
        "storage.local",
        storedSettings,
        "",
        resolvedOptions
      );
      urlForensicsContentSettingsStorageLogLoadedSettings(resolvedOptions);
      urlForensicsContentSettingsStorageDebugCall(
        resolvedOptions.debugApi,
        "functionOut",
        "content.loadPipelineSettings",
        { source: "storage.local" }
      );
      return resolvedOptions.getPipelineSettings();
    } catch (error) {
      urlForensicsContentSettingsStorageSetExtensionStorageSnapshot(
        "storage-error",
        null,
        error && error.message ? error.message : "unknown error",
        resolvedOptions
      );
      urlForensicsContentSettingsStorageDebugCall(
        resolvedOptions.debugApi,
        "error",
        "content settings load failed",
        { message: error && error.message ? error.message : "unknown error" }
      );
      urlForensicsContentSettingsStorageDebugCall(
        resolvedOptions.debugApi,
        "functionOut",
        "content.loadPipelineSettings",
        { source: "storage-error" }
      );
      return resolvedOptions.getPipelineSettings();
    }
  }

  return Object.freeze({
    applyStoredPipelineSetting: function applyStoredPipelineSetting(nextValue) {
      urlForensicsContentSettingsStorageApplyStoredPipelineSetting(nextValue, resolvedOptions);
    },
    applyStoredReplaceEmailBodySetting: function applyStoredReplaceEmailBodySetting(nextValue) {
      urlForensicsContentSettingsStorageApplyStoredReplaceEmailBodySetting(nextValue, resolvedOptions);
    },
    applyStoredAllowHelperOpenWithoutDetectedEmailBodySetting:
      function applyStoredAllowHelperOpenWithoutDetectedEmailBodySetting(nextValue) {
        urlForensicsContentSettingsStorageApplyStoredAllowHelperOpenWithoutDetectedEmailBodySetting(
          nextValue,
          resolvedOptions
        );
      },
    applyStoredTrackingParameterFiltersSetting: function applyStoredTrackingParameterFiltersSetting(nextValue) {
      urlForensicsContentSettingsStorageApplyStoredTrackingParameterFiltersSetting(nextValue, resolvedOptions);
    },
    applyStoredTrackingParameterStripSetting: function applyStoredTrackingParameterStripSetting(nextValue) {
      urlForensicsContentSettingsStorageApplyStoredTrackingParameterStripSetting(nextValue, resolvedOptions);
    },
    handlePipelineStorageChange: function handlePipelineStorageChange(changes, areaName) {
      return urlForensicsContentSettingsStorageHandlePipelineStorageChange(changes, areaName, resolvedOptions);
    },
    loadPipelineSettings: loadPipelineSettings,
    setExtensionStorageSnapshot: function setExtensionStorageSnapshot(source, storedSettings, errorMessage) {
      urlForensicsContentSettingsStorageSetExtensionStorageSnapshot(
        source,
        storedSettings,
        errorMessage,
        resolvedOptions
      );
    }
  });
}

(function attachUrlForensicsContentSettingsStorage(globalScope) {
  const contentSettingsStorage = Object.freeze({
    create: urlForensicsContentSettingsStorageCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentSettingsStorage;
  }

  if (globalScope) {
    globalScope.urlForensicsContentSettingsStorage = contentSettingsStorage;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
