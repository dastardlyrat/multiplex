// Function: initialize shared program debugging helper.
(function initializeMergedLinkLabDebugHelper(globalScope) {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const localEvents = [];
  const maxLocalEvents = 500;
  const debugRedaction = globalScope.urlForensicsDebugRedaction || {
    sanitizeDetails: function sanitizeDebugDetailsFailClosed() {
      return "[debug redaction helper unavailable]";
    }
  };
  const debugConfigModel = globalScope.urlForensicsDebugConfig || {
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
    },
    levels: {
      off: 0,
      error: 1,
      info: 2,
      verbose: 3,
      trace: 4
    },
    normalizeConfig: null,
    storageKeys: {
      programDebugConfig: "programDebugConfig"
    }
  };
  const debugLevels = debugConfigModel.levels;
  const defaultCategories = debugConfigModel.categories;
  const debugStorageKey = debugConfigModel.storageKeys.programDebugConfig;
  const helperState = {
    context: "unknown",
    module: "unknown",
    config: {
      level: "off",
      categories: Object.assign({}, defaultCategories)
    }
  };

  // Function: remember bounded local fallback events.
  function rememberLocalEvent(event) {
    localEvents.push(event);

    if (localEvents.length > maxLocalEvents) {
      localEvents.splice(0, localEvents.length - maxLocalEvents);
    }
  }

  // Function: normalize debug config choices.
  function normalizeDebugConfig(config) {
    if (typeof debugConfigModel.normalizeConfig === "function") {
      return debugConfigModel.normalizeConfig(config, helperState.config);
    }

    const safeConfig = config && typeof config === "object" ? config : {};
    const candidateCategories = safeConfig.categories && typeof safeConfig.categories === "object"
      ? safeConfig.categories
      : {};
    const nextCategories = Object.assign({}, helperState.config.categories);

    Object.keys(defaultCategories).forEach(function normalizeDebugCategory(categoryName) {
      if (Object.prototype.hasOwnProperty.call(candidateCategories, categoryName)) {
        nextCategories[categoryName] = candidateCategories[categoryName] === true;
      }
    });
    nextCategories.error = true;

    return {
      level: Object.prototype.hasOwnProperty.call(debugLevels, safeConfig.level)
        ? safeConfig.level
        : helperState.config.level,
      categories: nextCategories
    };
  }

  // Function: apply debug config choices.
  function applyDebugConfig(config) {
    helperState.config = normalizeDebugConfig(config);
    return getConfig();
  }

  // Function: get debug config copy.
  function getConfig() {
    return {
      level: helperState.config.level,
      categories: Object.assign({}, helperState.config.categories)
    };
  }

  // Function: check whether a debug event should be emitted.
  function isEnabled(category, level) {
    const normalizedCategory = Object.prototype.hasOwnProperty.call(defaultCategories, category) ? category : "runtime";
    const normalizedLevel = Object.prototype.hasOwnProperty.call(debugLevels, level) ? level : "info";

    if (helperState.config.level === "off") {
      return false;
    }

    if (debugLevels[normalizedLevel] > debugLevels[helperState.config.level]) {
      return false;
    }

    return normalizedCategory === "error" || helperState.config.categories[normalizedCategory] === true;
  }

  // Function: check whether a debug API method should emit.
  function isMethodEnabled(methodName) {
    const methodConfig = {
      error: ["error", "error"],
      runtime: ["runtime", "info"],
      storage: ["storage", "info"],
      messaging: ["messaging", "info"],
      ui: ["ui", "info"],
      pipeline: ["pipeline", "info"],
      functionIn: ["function", "verbose"],
      functionOut: ["function", "verbose"],
      conditional: ["conditional", "verbose"],
      loop: ["loop", "trace"],
      variable: ["variable", "trace"]
    };
    const resolvedMethodConfig = methodConfig[methodName] || ["runtime", "info"];

    return isEnabled(resolvedMethodConfig[0], resolvedMethodConfig[1]);
  }

  // Function: load persisted debug choices.
  function loadPersistedDebugConfig() {
    if (
      !extensionApi ||
      !extensionApi.storage ||
      !extensionApi.storage.local ||
      typeof extensionApi.storage.local.get !== "function"
    ) {
      return;
    }

    try {
      const maybePromise = extensionApi.storage.local.get(debugStorageKey);

      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise
          .then(function applyStoredDebugConfig(storedDebugConfig) {
            const storedConfig = storedDebugConfig ? storedDebugConfig[debugStorageKey] : null;
            if (storedConfig && typeof storedConfig === "object") {
              applyDebugConfig(storedConfig);
            }
          })
          .catch(function ignoreStoredDebugConfigFailure() {});
      }
    } catch {
      return;
    }
  }

  // Function: listen for debug-choice changes.
  function installDebugConfigStorageListener() {
    if (
      !extensionApi ||
      !extensionApi.storage ||
      !extensionApi.storage.onChanged ||
      typeof extensionApi.storage.onChanged.addListener !== "function"
    ) {
      return;
    }

    try {
      extensionApi.storage.onChanged.addListener(function handleDebugStorageChange(changes, areaName) {
        const safeChanges = changes && typeof changes === "object" ? changes : {};
        const debugConfigChange = safeChanges[debugStorageKey];

        if (areaName !== "local" || !debugConfigChange || !debugConfigChange.newValue) {
          return;
        }

        applyDebugConfig(debugConfigChange.newValue);
      });
    } catch {
      return;
    }
  }

  // Function: emit debug event.
  function emit(category, level, message, details) {
    const normalizedCategory = Object.prototype.hasOwnProperty.call(defaultCategories, category) ? category : "runtime";
    const normalizedLevel = Object.prototype.hasOwnProperty.call(debugLevels, level) ? level : "info";

    if (!isEnabled(normalizedCategory, normalizedLevel)) {
      return null;
    }

    const event = {
      timestamp: Date.now(),
      category: normalizedCategory,
      level: normalizedLevel,
      context: helperState.context,
      module: helperState.module,
      message: String(message || ""),
      details: debugRedaction.sanitizeDetails(details || {}, 0)
    };

    if (extensionApi && extensionApi.runtime && typeof extensionApi.runtime.sendMessage === "function") {
      try {
        const maybePromise = extensionApi.runtime.sendMessage({
          type: "merged-link-lab:debug-event",
          event: event
        });

        if (maybePromise && typeof maybePromise.catch === "function") {
          maybePromise.catch(function ignoreDebugSendFailure() {
            rememberLocalEvent(event);
          });
        }

        return event;
      } catch {
        rememberLocalEvent(event);
        return event;
      }
    }

    rememberLocalEvent(event);
    return event;
  }

  // Function: configure debug helper context.
  function configure(options) {
    const optionBag = options && typeof options === "object" ? options : {};

    if (optionBag.context) {
      helperState.context = String(optionBag.context);
    }

    if (optionBag.module) {
      helperState.module = String(optionBag.module);
    }

    return Object.assign({}, helperState);
  }

  loadPersistedDebugConfig();
  installDebugConfigStorageListener();

  globalScope.mergedLinkLabDebug = {
    levels: Object.assign({}, debugLevels),
    categories: Object.assign({}, defaultCategories),
    getConfig: getConfig,
    applyConfig: applyDebugConfig,
    isEnabled: isEnabled,
    isMethodEnabled: isMethodEnabled,
    configure: configure,
    emit: emit,
    error: function emitError(message, details) {
      return emit("error", "error", message, details);
    },
    runtime: function emitRuntime(message, details) {
      return emit("runtime", "info", message, details);
    },
    storage: function emitStorage(message, details) {
      return emit("storage", "info", message, details);
    },
    messaging: function emitMessaging(message, details) {
      return emit("messaging", "info", message, details);
    },
    ui: function emitUi(message, details) {
      return emit("ui", "info", message, details);
    },
    pipeline: function emitPipeline(message, details) {
      return emit("pipeline", "info", message, details);
    },
    functionIn: function emitFunctionIn(name, details) {
      return emit("function", "verbose", "in: " + String(name || "unknown"), details);
    },
    functionOut: function emitFunctionOut(name, details) {
      return emit("function", "verbose", "out: " + String(name || "unknown"), details);
    },
    conditional: function emitConditional(message, details) {
      return emit("conditional", "verbose", message, details);
    },
    loop: function emitLoop(message, details) {
      return emit("loop", "trace", message, details);
    },
    variable: function emitVariable(message, details) {
      return emit("variable", "trace", message, details);
    },
    getLocalEvents: function getLocalEvents() {
      return localEvents.slice();
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
