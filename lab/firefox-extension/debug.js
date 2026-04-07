// Function: initialize shared program debugging helper.
(function initializeMergedLinkLabDebugHelper(globalScope) {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const localEvents = [];
  const maxLocalEvents = 500;
  const debugLevels = {
    off: 0,
    error: 1,
    info: 2,
    verbose: 3,
    trace: 4
  };
  const defaultCategories = {
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
  };
  const redactedKeyPattern = /^(rawtext|sourcehtml|sourcemarkup|htmlmarkup|rewrittenhtml|emailbody|bodytext|innertext|textcontent|clipboard|payload|snapshot|messagebody)$/i;
  const helperState = {
    context: "unknown",
    module: "unknown"
  };

  // Function: remember bounded local fallback events.
  function rememberLocalEvent(event) {
    localEvents.push(event);

    if (localEvents.length > maxLocalEvents) {
      localEvents.splice(0, localEvents.length - maxLocalEvents);
    }
  }

  // Function: sanitize debug details.
  function sanitizeDetails(value, depth) {
    const safeDepth = Number.isFinite(depth) ? depth : 0;

    if (value === null || typeof value === "undefined") {
      return value;
    }

    if (typeof value === "string") {
      return value.length > 240 ? value.slice(0, 237) + "..." : value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (safeDepth >= 4) {
      return "[depth limit]";
    }

    if (Array.isArray(value)) {
      return value.slice(0, 16).map(function sanitizeArrayItem(item) {
        return sanitizeDetails(item, safeDepth + 1);
      });
    }

    if (typeof value === "object") {
      const output = {};

      Object.keys(value).slice(0, 40).forEach(function sanitizeObjectEntry(key) {
        if (redactedKeyPattern.test(key)) {
          output[key] = "[redacted]";
          return;
        }

        output[key] = sanitizeDetails(value[key], safeDepth + 1);
      });

      return output;
    }

    return String(value);
  }

  // Function: emit debug event.
  function emit(category, level, message, details) {
    const normalizedCategory = Object.prototype.hasOwnProperty.call(defaultCategories, category) ? category : "runtime";
    const normalizedLevel = Object.prototype.hasOwnProperty.call(debugLevels, level) ? level : "info";
    const event = {
      timestamp: Date.now(),
      category: normalizedCategory,
      level: normalizedLevel,
      context: helperState.context,
      module: helperState.module,
      message: String(message || ""),
      details: sanitizeDetails(details || {}, 0)
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

  globalScope.mergedLinkLabDebug = {
    levels: Object.assign({}, debugLevels),
    categories: Object.assign({}, defaultCategories),
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
