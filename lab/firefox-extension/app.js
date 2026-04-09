// Function: initialize merged link lab from base html.
(function initializeMergedLinkLabFromBaseHtml() {
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
    requirePageUi: false
  });
  const pageDependencies = pageDependenciesFactory.create({
    globalScope: globalScope
  });
  const componentKit = typeof ComponentKit !== "undefined" ? ComponentKit : null;
  const mergedLinkLabPipeline = typeof MergedLinkLabPipeline !== "undefined" ? MergedLinkLabPipeline : null;
  const extensionApi = pageRuntime.extensionApi;
  const storageModel = pageDependencies.storageModel;
  const settingsOpener = pageDependencies.settingsOpener;
  const debugApi = pageRuntime.debugApi;
  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "workbench", module: "app" });
    debugApi.runtime("workbench initialization started");
  }

  // Branch: follow this path only when the current condition passes.
  if (!componentKit || !mergedLinkLabPipeline) {
    if (debugApi) {
      debugApi.error("workbench initialization aborted: required modules unavailable", {
        hasComponentKit: !!componentKit,
        hasPipeline: !!mergedLinkLabPipeline
      });
    }
    return;
  }

  const DOM = {
    editor: document.getElementById("editor"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    runBtn: document.getElementById("runBtn"),
    useRewrittenBtn: document.getElementById("useRewrittenBtn"),
    copyFinalBtn: document.getElementById("copyFinalBtn"),
    copyDigestBtn: document.getElementById("copyDigestBtn"),
    toggleDebugBtn: document.getElementById("toggleDebugBtn"),
    closeRewrittenBtn: document.getElementById("closeRewrittenBtn"),
    detectedPane: document.getElementById("detectedPane"),
    resolvedPane: document.getElementById("resolvedPane"),
    trackerPane: document.getElementById("trackerPane"),
    finalPane: document.getElementById("finalPane"),
    digestPane: document.getElementById("digestPane"),
    rewrittenSidebar: document.getElementById("rewrittenSidebar"),
    rewrittenPane: document.getElementById("rewrittenPane"),
    diagnosticsPane: document.getElementById("diagnosticsPane"),
    debugPane: document.getElementById("debugPane"),
    inputSummary: document.getElementById("inputSummary"),
    detectSummary: document.getElementById("detectSummary"),
    resolveSummary: document.getElementById("resolveSummary"),
    trackerSummary: document.getElementById("trackerSummary"),
    finalSummary: document.getElementById("finalSummary"),
    digestSummary: document.getElementById("digestSummary"),
    rewrittenSummary: document.getElementById("rewrittenSummary"),
    diagnosticsSummary: document.getElementById("diagnosticsSummary"),
    columns: Array.from(document.querySelectorAll(".merged-workspace .column"))
  };

  const sampleInput = [
    "Weekly Reads",
    "A better way to debug malformed links",
    "https://tracker.example.com/?url=https%3A%2F%2Ftarget.example.com%2Farticle).",
    "",
    "Release Notes",
    "https://site.example.com/new-feature>",
    "",
    "Broken protocol sample",
    "https:/broken.example.com/path",
    "",
    "Stacked sample",
    "https://site.com/pagehttps://site.com/page2"
  ].join("\n");
  const pipelineStorageKeys = storageModel && storageModel.storageKeys
    ? storageModel.storageKeys
    : {
        enableUrlNormalizationRepair: "enableUrlNormalizationRepair",
        stripKnownTrackingParameters: "stripKnownTrackingParameters",
        trackingParameterFilters: "trackingParameterFilters"
      };
  const defaultPipelineSettings = storageModel && storageModel.defaultSettings
    ? storageModel.defaultSettings
    : {
        enableUrlNormalizationRepair: false,
        stripKnownTrackingParameters: true,
        trackingParameterFilters: {}
      };
  const getEffectiveBooleanSettingValue = storageModel && typeof storageModel.getEffectiveBooleanSettingValue === "function"
    ? storageModel.getEffectiveBooleanSettingValue
    : function getFallbackEffectiveBooleanSettingValue(storedSettings, key, defaultValue) {
        return storedSettings && Object.prototype.hasOwnProperty.call(storedSettings, key)
          ? storedSettings[key] === true
          : defaultValue === true;
      };
  const getEffectiveTrackingParameterFilters = storageModel && typeof storageModel.getEffectiveTrackingParameterFilters === "function"
    ? storageModel.getEffectiveTrackingParameterFilters
    : function getFallbackEffectiveTrackingParameterFilters(storedSettings, key, defaultValue) {
        return storedSettings && Object.prototype.hasOwnProperty.call(storedSettings, key)
          ? Object.assign({}, storedSettings[key])
          : Object.assign({}, defaultValue);
      };
  const pipelineState = {
    settings: mergedLinkLabPipeline.resolvePipelineSettings
      ? mergedLinkLabPipeline.resolvePipelineSettings(mergedLinkLabPipeline.defaultPipelineSettings)
      : {
          enableUrlNormalizationRepair: defaultPipelineSettings.enableUrlNormalizationRepair,
          stripKnownTrackingParameters: defaultPipelineSettings.stripKnownTrackingParameters,
          trackingParameterFilters: getEffectiveTrackingParameterFilters(
            null,
            pipelineStorageKeys.trackingParameterFilters,
            defaultPipelineSettings.trackingParameterFilters
          )
        }
  };

  // Function: get pipeline settings.
  function getPipelineSettings() {
    return {
      enableUrlNormalizationRepair: !!pipelineState.settings.enableUrlNormalizationRepair,
      stripKnownTrackingParameters: !!pipelineState.settings.stripKnownTrackingParameters,
      trackingParameterFilters: getEffectiveTrackingParameterFilters(
        pipelineState.settings,
        "trackingParameterFilters",
        defaultPipelineSettings.trackingParameterFilters
      )
    };
  }

  // Function: apply stored pipeline settings.
  function applyStoredPipelineSettings(storedSettings) {
    pipelineState.settings.enableUrlNormalizationRepair = getEffectiveBooleanSettingValue(
      storedSettings,
      pipelineStorageKeys.enableUrlNormalizationRepair,
      defaultPipelineSettings.enableUrlNormalizationRepair
    );
    pipelineState.settings.stripKnownTrackingParameters = getEffectiveBooleanSettingValue(
      storedSettings,
      pipelineStorageKeys.stripKnownTrackingParameters,
      defaultPipelineSettings.stripKnownTrackingParameters
    );
    pipelineState.settings.trackingParameterFilters = getEffectiveTrackingParameterFilters(
      storedSettings,
      pipelineStorageKeys.trackingParameterFilters,
      defaultPipelineSettings.trackingParameterFilters
    );
  }

  // Function: load pipeline settings.
  async function loadPipelineSettings() {
    if (debugApi) {
      debugApi.functionIn("workbench.loadPipelineSettings");
    }

    // Branch: follow this path only when the current condition passes.
    if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local || typeof extensionApi.storage.local.get !== "function") {
      if (debugApi) {
        debugApi.conditional("workbench pipeline settings using defaults: storage unavailable");
        debugApi.functionOut("workbench.loadPipelineSettings", { source: "default" });
      }
      return getPipelineSettings();
    }

    // Branch: try the primary operation before handling failures.
    try {
      const storedSettings = await extensionApi.storage.local.get([
        pipelineStorageKeys.enableUrlNormalizationRepair,
        pipelineStorageKeys.stripKnownTrackingParameters,
        pipelineStorageKeys.trackingParameterFilters
      ]);
      applyStoredPipelineSettings(storedSettings);
      if (debugApi) {
        debugApi.storage("workbench pipeline settings loaded", getPipelineSettings());
      }
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      if (debugApi) {
        debugApi.error("workbench pipeline settings load failed", { message: error && error.message ? error.message : "unknown error" });
        debugApi.functionOut("workbench.loadPipelineSettings", { source: "storage-error" });
      }
      return getPipelineSettings();
    }

    if (debugApi) {
      debugApi.functionOut("workbench.loadPipelineSettings", { source: "storage.local" });
    }
    return getPipelineSettings();
  }

  // Function: handle pipeline storage change.
  function handlePipelineStorageChange(changes, areaName) {
    // Branch: follow this path only when the current condition passes.
    if (
      areaName !== "local" ||
      !changes ||
      (
        !changes[pipelineStorageKeys.enableUrlNormalizationRepair] &&
        !changes[pipelineStorageKeys.stripKnownTrackingParameters] &&
        !changes[pipelineStorageKeys.trackingParameterFilters]
      )
    ) {
      return;
    }

    applyStoredPipelineSettings({
      [pipelineStorageKeys.enableUrlNormalizationRepair]: changes[pipelineStorageKeys.enableUrlNormalizationRepair]
        ? (
            changes[pipelineStorageKeys.enableUrlNormalizationRepair].newValue === undefined
              ? defaultPipelineSettings.enableUrlNormalizationRepair
              : changes[pipelineStorageKeys.enableUrlNormalizationRepair].newValue
          )
        : pipelineState.settings.enableUrlNormalizationRepair,
      [pipelineStorageKeys.stripKnownTrackingParameters]: changes[pipelineStorageKeys.stripKnownTrackingParameters]
        ? (
            changes[pipelineStorageKeys.stripKnownTrackingParameters].newValue === undefined
              ? defaultPipelineSettings.stripKnownTrackingParameters
              : changes[pipelineStorageKeys.stripKnownTrackingParameters].newValue
          )
        : pipelineState.settings.stripKnownTrackingParameters,
      [pipelineStorageKeys.trackingParameterFilters]: changes[pipelineStorageKeys.trackingParameterFilters]
        ? (
            changes[pipelineStorageKeys.trackingParameterFilters].newValue === undefined
              ? defaultPipelineSettings.trackingParameterFilters
              : changes[pipelineStorageKeys.trackingParameterFilters].newValue
          )
        : pipelineState.settings.trackingParameterFilters
    });

    // Branch: follow this path only when the current condition passes.
    if (DOM.editor) {
      runPipeline({ writeCleanedInput: false });
    }
  }

  // Function: bind pipeline settings.
  function bindPipelineSettings() {
    // Branch: follow this path only when the current condition passes.
    if (extensionApi && extensionApi.storage && extensionApi.storage.onChanged) {
      extensionApi.storage.onChanged.addListener(handlePipelineStorageChange);
    }
  }

  // Function: open settings page.
  async function openSettingsPage() {
    if (settingsOpener && typeof settingsOpener.openSettingsPage === "function") {
      await settingsOpener.openSettingsPage(extensionApi);
    }
  }

  // Function: is editor rich mode.
  function isEditorRichMode() {
    return !!(DOM.editor && DOM.editor.dataset && DOM.editor.dataset.inputMode === "rich-html");
  }

  // Function: set editor mode.
  function setEditorMode(mode) {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor || !DOM.editor.dataset) {
      return;
    }

    DOM.editor.dataset.inputMode = mode;
  }

  // Function: replace element with line-break text.
  function replaceElementWithLineBreakText(targetElement, textValue) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement) {
      return;
    }

    const fragment = document.createDocumentFragment();

    // Loop: iterate through each item in the current collection.
    String(textValue || "").split("\n").forEach(function appendLine(lineText, lineIndex) {
      // Branch: follow this path only when the current condition passes.
      if (lineIndex > 0) {
        fragment.appendChild(document.createElement("br"));
      }

      fragment.appendChild(document.createTextNode(lineText));
    });

    targetElement.replaceChildren(fragment);
  }

  // Function: create html document.
  function createHtmlDocument(htmlMarkup) {
    // Branch: follow this path only when the current condition passes.
    if (typeof DOMParser === "undefined") {
      return null;
    }

    // Branch: try the primary operation before handling failures.
    try {
      return new DOMParser().parseFromString(String(htmlMarkup || ""), "text/html");
    // Branch: handle errors from the guarded operation.
    } catch {
      return null;
    }
  }

  // Function: sanitize html document.
  function sanitizeHtmlDocument(parsedDocument) {
    // Branch: follow this path only when the current condition passes.
    if (!parsedDocument || !parsedDocument.querySelectorAll) {
      return;
    }

    // Loop: iterate through each item in the current collection.
    parsedDocument.querySelectorAll("script, style, link, meta, base, iframe, object, embed, form").forEach(function removeUnsafeNode(node) {
      node.remove();
    });

    // Loop: iterate through each item in the current collection.
    parsedDocument.querySelectorAll("*").forEach(function sanitizeElement(element) {
      // Loop: iterate through each item in the current collection.
      Array.from(element.attributes).forEach(function sanitizeAttribute(attribute) {
        const attributeName = String(attribute.name || "").toLowerCase();
        const attributeValue = String(attribute.value || "");

        // Branch: follow this path only when the current condition passes.
        if (attributeName.indexOf("on") === 0) {
          element.removeAttribute(attribute.name);
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (/^(href|src|action|poster|xlink:href)$/i.test(attribute.name)) {
          const normalizedValue = attributeValue.trim().toLowerCase();
          // Branch: follow this path only when the current condition passes.
          if (/^javascript:/i.test(normalizedValue)) {
            element.removeAttribute(attribute.name);
          }
        }
      });
    });
  }

  // Function: create sanitized html fragment.
  function createSanitizedHtmlFragment(htmlMarkup) {
    const fragment = document.createDocumentFragment();
    const parsedDocument = createHtmlDocument(htmlMarkup);
    const sourceContainer = parsedDocument ? (parsedDocument.body || parsedDocument.documentElement || parsedDocument) : null;

    // Branch: follow this path only when the current condition passes.
    if (!sourceContainer) {
      return fragment;
    }

    sanitizeHtmlDocument(parsedDocument);

    // Loop: iterate through each item in the current collection.
    Array.from(sourceContainer.childNodes).forEach(function appendSanitizedNode(node) {
      fragment.appendChild(document.importNode(node, true));
    });

    return fragment;
  }

  // Function: replace element with sanitized html.
  function replaceElementWithSanitizedHtml(targetElement, htmlMarkup) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement) {
      return false;
    }

    const fragment = createSanitizedHtmlFragment(htmlMarkup);
    const hasContent = fragment.childNodes.length > 0;
    targetElement.replaceChildren(fragment);
    return hasContent;
  }

  // Function: set editor plain text.
  function setEditorPlainText(text) {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor) {
      return;
    }

    DOM.editor.textContent = text || "";
    setEditorMode("plain-text");

    // Branch: follow this path only when the current condition passes.
    if (DOM.editor.dataset) {
      DOM.editor.dataset.sourceHtml = "";
    }
  }

  // Function: set editor rich html.
  function setEditorRichHtml(htmlMarkup, fallbackText) {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor) {
      return;
    }

    const hasSanitizedContent = replaceElementWithSanitizedHtml(DOM.editor, htmlMarkup);

    // Branch: follow this path only when the current condition passes.
    if (hasSanitizedContent) {
      setEditorMode("rich-html");

      // Branch: follow this path only when the current condition passes.
      if (DOM.editor.dataset) {
        DOM.editor.dataset.sourceHtml = DOM.editor.innerHTML || "";
      }

      return;
    }

    setEditorPlainText(fallbackText || "");
  }

  // Function: insert html at selection.
  function insertHtmlAtSelection(htmlMarkup) {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor || !htmlMarkup) {
      return;
    }

    DOM.editor.focus();
    const fragment = createSanitizedHtmlFragment(htmlMarkup);
    const insertedNodes = Array.from(fragment.childNodes);
    const lastNode = insertedNodes.length ? insertedNodes[insertedNodes.length - 1] : null;

    // Branch: follow this path only when the current condition passes.
    if (!lastNode) {
      return;
    }

    const selection = window.getSelection();
    // Branch: follow this path only when the current condition passes.
    if (!selection || !selection.rangeCount) {
      DOM.editor.appendChild(fragment);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(fragment);

    // Branch: follow this path only when the current condition passes.
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // Function: is embedded extension lab.
  function isEmbeddedExtensionLab() {
    return window.self !== window.top;
  }

  // Function: get default expanded pane ids.
  function getDefaultExpandedPaneIds() {
    const defaultExpandedColumn =
      // Loop: stop once the first matching item is found.
      DOM.columns.find(function findExpandedColumn(column) {
        return column && column.hasAttribute("data-default-expanded");
      }) ||
      DOM.columns.find(Boolean);
    const paneId = getColumnPaneId(defaultExpandedColumn);

    return paneId ? new Set([paneId]) : new Set();
  }

  const UIState = {
    expandedPaneIds: getDefaultExpandedPaneIds()
  };

  // Function: set rich text.
  function setRichText(targetElement, text) {
    // Branch: follow this path only when the current condition passes.
    if (!targetElement) {
      return;
    }

    replaceElementWithLineBreakText(targetElement, text || "");
  }

  // Function: get input payload.
  function getInputPayload() {
    const rawText = DOM.editor ? DOM.editor.innerText || "" : "";
    const rawHtml = DOM.editor ? DOM.editor.innerHTML || "" : "";
    const preservedSourceHtml = DOM.editor && DOM.editor.dataset ? DOM.editor.dataset.sourceHtml || "" : "";
    const looksLikeHtmlSource =
      /<\s*html[\s>]/i.test(rawText) ||
      /<\s*body[\s>]/i.test(rawText) ||
      (/<[a-z][^>]*>/i.test(rawText) && /<\/[a-z][^>]*>/i.test(rawText));
    const richSourceHtml = isEditorRichMode() ? rawHtml : "";

    // Branch: follow this path only when the current condition passes.
    if (DOM.editor && DOM.editor.dataset && richSourceHtml) {
      DOM.editor.dataset.sourceHtml = richSourceHtml;
    }

    return {
      rawText: rawText,
      cleanedText: mergedLinkLabPipeline.cleanInputText(rawText),
      sourceHtml: looksLikeHtmlSource ? rawText : (richSourceHtml || preservedSourceHtml || "")
    };
  }

  // Function: render detected.
  function renderDetected(items) {
    // Loop: transform each item in the current collection.
    const lines = items.map(function mapItem(item) {
      return String(item.id) + ". " + item.original;
    });

    setRichText(DOM.detectedPane, lines.join("\n"));
    componentKit.renderCount(DOM.detectSummary, "DETECTED", items.length);
  }

  // Function: render resolved.
  function renderResolved(items, pipelineOptions) {
    const lines = [];
    const shouldBypassNormalizationRepair = !(pipelineOptions && pipelineOptions.enableUrlNormalizationRepair);
    const shouldBypassTrackingParameterStripping = !(pipelineOptions && pipelineOptions.stripKnownTrackingParameters);

    // Branch: follow this path only when the current condition passes.
    if (shouldBypassNormalizationRepair) {
      lines.push("NORMALIZATION + REPAIR STAGE BYPASSED");
      lines.push(
        shouldBypassTrackingParameterStripping
          ? "Setting is OFF, so detected URLs are passed through unchanged."
          : "Setting is OFF, so redirect repair is skipped while known tracking parameters can still be stripped."
      );
      lines.push("");
    }

    // Branch: follow this path only when the current condition passes.
    if (shouldBypassTrackingParameterStripping) {
      lines.push("KNOWN TRACKING PARAMETER STRIP STAGE BYPASSED");
      lines.push("Setting is OFF, so UTM and other known click IDs are retained.");
      lines.push("");
    }

    // Loop: iterate through each item in the current collection.
    items.forEach(function addItemLines(item) {
      lines.push("SOURCE " + item.id + ": " + item.original);
      lines.push("NORMALIZED: " + item.normalized);
      lines.push("RESOLVED: " + (item.resolved.length ? item.resolved.join(" | ") : "(none)"));
      lines.push("VALID: " + (item.validResolved.length ? item.validResolved.join(" | ") : "(none)"));
      lines.push("NOTES: " + (item.notes.length ? item.notes.join(", ") : "(none)"));
      lines.push("");
    });

    setRichText(DOM.resolvedPane, lines.join("\n").trim());

    // Loop: accumulate the current collection into one result.
    const resolvedCount = items.reduce(function addResolvedCount(total, item) {
      return total + item.resolved.length;
    }, 0);

    componentKit.renderCount(
      DOM.resolveSummary,
      shouldBypassNormalizationRepair && shouldBypassTrackingParameterStripping
        ? "BYPASSED"
        : (shouldBypassNormalizationRepair ? "CLEANED" : "RESOLVED"),
      resolvedCount
    );
  }

  // Function: render tracker cleanup.
  function renderTrackerCleanup(items, pipelineOptions) {
    const lines = [];
    const shouldBypassTrackingParameterStripping = !(pipelineOptions && pipelineOptions.stripKnownTrackingParameters);
    let cleanedEntryCount = 0;

    if (shouldBypassTrackingParameterStripping) {
      lines.push("TRACKER REMOVAL STAGE BYPASSED");
      lines.push("Tracker stripping is off, so tracker parameters are retained.");
      lines.push("");
    }

    items.forEach(function addTrackerCleanupLines(item) {
      const cleanupEntries = item && Array.isArray(item.trackerCleanupEntries) ? item.trackerCleanupEntries : [];

      lines.push("SOURCE " + item.id + ": " + item.original);

      if (!cleanupEntries.length) {
        lines.push(
          shouldBypassTrackingParameterStripping
            ? "RETAINED: no tracker cleanup attempted"
            : "CLEANUP: no matching tracker parameters removed"
        );
        lines.push("");
        return;
      }

      cleanupEntries.forEach(function addTrackerCleanupEntry(cleanupEntry) {
        cleanedEntryCount += 1;
        lines.push("TRACKER CLEANED HREF: " + cleanupEntry.cleanedUrl);
        lines.push("FROM: " + cleanupEntry.originalUrl);
        lines.push("REMOVED TRACKERS: " + cleanupEntry.removedParameterNames.join(", "));
      });
      lines.push("");
    });

    setRichText(DOM.trackerPane, lines.join("\n").trim() || "No tracker cleanup details available.");
    componentKit.renderCount(
      DOM.trackerSummary,
      shouldBypassTrackingParameterStripping ? "TRACKERS BYPASSED" : "TRACKERS CLEANED",
      cleanedEntryCount
    );
  }

  // Function: render final.
  function renderFinal(items) {
    const finalUrlEntries = mergedLinkLabPipeline.buildFinalUrlEntries(items);
    const finalUrls = finalUrlEntries.map(function mapFinalUrlEntryToUrl(finalUrlEntry) {
      return finalUrlEntry.url;
    });

    // Branch: follow this path only when the current condition passes.
    if (DOM.finalPane) {
      const fragment = document.createDocumentFragment();

      // Loop: iterate through each item in the current collection.
      finalUrlEntries.forEach(function appendFinalUrl(finalUrlEntry, finalUrlIndex) {
        const finalUrlLabel = mergedLinkLabPipeline.buildFinalUrlLinkText(finalUrlEntry);
        const anchorElement = document.createElement("a");

        // Branch: follow this path only when the current condition passes.
        if (finalUrlIndex > 0) {
          fragment.appendChild(document.createElement("br"));
        }

        anchorElement.setAttribute("href", finalUrlEntry.url);
        anchorElement.setAttribute("target", "_blank");
        anchorElement.setAttribute("rel", "noopener noreferrer");
        anchorElement.textContent = finalUrlLabel;
        fragment.appendChild(anchorElement);
      });

      DOM.finalPane.replaceChildren(fragment);
    }

    componentKit.renderCount(DOM.finalSummary, "FINAL URLS", finalUrlEntries.length);
    return finalUrls;
  }

  // Function: render digest.
  function renderDigest(entries) {
    // Branch: follow this path only when the current condition passes.
    if (DOM.digestPane) {
      const fragment = document.createDocumentFragment();

      // Loop: iterate through each item in the current collection.
      entries.forEach(function appendDigestEntry(entry, entryIndex) {
        const anchorElement = document.createElement("a");

        // Branch: follow this path only when the current condition passes.
        if (entryIndex > 0) {
          fragment.appendChild(document.createElement("br"));
          fragment.appendChild(document.createElement("br"));
        }

        fragment.appendChild(document.createTextNode(String(entry.title || "")));
        fragment.appendChild(document.createTextNode(" ("));
        anchorElement.setAttribute("href", String(entry.url || ""));
        anchorElement.setAttribute("target", "_blank");
        anchorElement.setAttribute("rel", "noopener noreferrer");
        anchorElement.textContent = String(entry.host || "unknown-host");
        fragment.appendChild(anchorElement);
        fragment.appendChild(document.createTextNode(" -> " + String(entry.type || "destination") + ")"));
      });

      DOM.digestPane.replaceChildren(fragment);
    }

    componentKit.renderCount(DOM.digestSummary, "DIGEST ITEMS", entries.length);
  }

  // Function: render rewritten html.
  function renderRewrittenHtml(sourceMarkup, items, pipelineOptions) {
    const rewrittenResult = mergedLinkLabPipeline.rewriteHtmlForStandalonePreview(sourceMarkup, items, pipelineOptions);

    // Branch: follow this path only when the current condition passes.
    if (DOM.rewrittenPane) {
      replaceElementWithSanitizedHtml(DOM.rewrittenPane, rewrittenResult.html);
    }

    componentKit.renderCount(DOM.rewrittenSummary, "REWRITTEN URLS", rewrittenResult.count || 0);
  }

  // Function: render diagnostics.
  function renderDiagnostics(items, finalUrls, digestEntries, errors, rawText, pipelineOptions) {
    const diagnostics = mergedLinkLabPipeline.buildDiagnostics(items, finalUrls, digestEntries, errors, rawText, pipelineOptions);

    setRichText(DOM.diagnosticsPane, diagnostics.lines.join("\n"));
    componentKit.renderCount(DOM.diagnosticsSummary, "DIAGNOSTICS", diagnostics.lines.length);

    const debugLines = [];
    // Loop: iterate through each item in the current collection.
    items.forEach(function addDebugLines(item) {
      debugLines.push("ITEM " + item.id);
      debugLines.push("  ORIGINAL: " + item.original);
      debugLines.push("  NORMALIZED: " + item.normalized);
      debugLines.push("  RESOLVED: " + item.resolved.join(" | "));
      debugLines.push("  VALID: " + item.validResolved.join(" | "));
      debugLines.push("  NOTES: " + (item.notes.join(", ") || "(none)"));
    });

    setRichText(DOM.debugPane, debugLines.join("\n"));
  }

  // Function: run pipeline.
  function runPipeline(options) {
    if (debugApi) {
      debugApi.functionIn("workbench.runPipeline", {
        writeCleanedInput: !!(options && options.writeCleanedInput)
      });
    }

    const optionBag = options || {};
    const shouldWriteCleanedInput = !!optionBag.writeCleanedInput;
    const pipelineSettings = getPipelineSettings();
    const payload = getInputPayload();
    const errors = [];
    let items = [];

    // Branch: follow this path only when the current condition passes.
    if (shouldWriteCleanedInput && DOM.editor && payload.cleanedText !== payload.rawText && !isEditorRichMode()) {
      setEditorPlainText(payload.cleanedText);
      if (debugApi) {
        debugApi.conditional("workbench cleaned input written back to editor", {
          cleanedLength: payload.cleanedText.length
        });
      }
    }

    componentKit.renderCount(
      DOM.inputSummary,
      "INPUT LINES",
      payload.cleanedText ? payload.cleanedText.split("\n").length : 0
    );

    // Branch: try the primary operation before handling failures.
    try {
      items = payload.sourceHtml
        ? mergedLinkLabPipeline.detectUrlsFromHtml(payload.sourceHtml)
        : mergedLinkLabPipeline.detectURLs(payload.cleanedText);
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      errors.push("stageDetect: " + error.message);
      if (debugApi) {
        debugApi.error("workbench detect stage failed", { message: error.message });
      }
    }

    // Branch: try the primary operation before handling failures.
    try {
      mergedLinkLabPipeline.populateResolvedDataForItems(items, pipelineSettings);
    // Branch: handle errors from the guarded operation.
    } catch (error) {
      errors.push("stageResolve: " + error.message);
      if (debugApi) {
        debugApi.error("workbench resolve stage failed", { message: error.message });
      }
    }

    renderDetected(items);
    renderResolved(items, pipelineSettings);
    renderTrackerCleanup(items, pipelineSettings);

    const finalUrls = renderFinal(items);
    const digestEntries = mergedLinkLabPipeline.buildDigestEntries(payload.cleanedText, items);

    renderDigest(digestEntries);
    renderRewrittenHtml(payload.sourceHtml || payload.cleanedText, items, pipelineSettings);
    renderDiagnostics(items, finalUrls, digestEntries, errors, payload.rawText, pipelineSettings);
    if (debugApi) {
      debugApi.pipeline("workbench pipeline rendered", {
        itemCount: items.length,
        finalUrlCount: finalUrls.length,
        digestEntryCount: digestEntries.length,
        errorCount: errors.length,
        hasSourceHtml: !!payload.sourceHtml
      });
      debugApi.functionOut("workbench.runPipeline", {
        itemCount: items.length,
        errorCount: errors.length
      });
    }
  }

  // Function: get column pane id.
  function getColumnPaneId(column) {
    const pane = column ? column.querySelector(".pane-edit, .pane-output, .pane-console") : null;
    return pane ? pane.id : "";
  }

  // Function: apply column expansion state.
  function applyColumnExpansionState() {
    // Loop: iterate through each item in the current collection.
    DOM.columns.forEach(function updateColumnState(column) {
      const paneId = getColumnPaneId(column);
      const isExpanded = !!paneId && UIState.expandedPaneIds.has(paneId);

      column.classList.toggle("is-expanded", isExpanded);
      column.classList.toggle("is-collapsed-horizontal", !isExpanded);
      column.classList.toggle("is-active", isExpanded);
    });
  }

  // Function: is rewritten sidebar open.
  function isRewrittenSidebarOpen() {
    return !!(DOM.rewrittenSidebar && DOM.rewrittenSidebar.classList.contains("is-open"));
  }

  // Function: set rewritten sidebar open.
  function setRewrittenSidebarOpen(isOpen) {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.rewrittenSidebar || !DOM.useRewrittenBtn) {
      return;
    }

    DOM.rewrittenSidebar.classList.toggle("is-open", isOpen);
    DOM.rewrittenSidebar.setAttribute("aria-hidden", String(!isOpen));
    DOM.useRewrittenBtn.textContent = isOpen ? "Hide Converted Panel" : "Show Converted Panel";
  }

  // Function: close rewritten sidebar.
  function closeRewrittenSidebar() {
    setRewrittenSidebarOpen(false);
  }

  // Function: bind pane collapse.
  function bindPaneCollapse() {
    // Loop: iterate through each item in the current collection.
    DOM.columns.forEach(function bindColumn(column) {
      const title = column.querySelector(".pane-title");

      // Branch: follow this path only when the current condition passes.
      if (!title) {
        return;
      }

      // Function: handle title click.
      title.addEventListener("click", function handleTitleClick(event) {
        // Branch: follow this path only when the current condition passes.
        if (event.target && event.target.closest("button")) {
          return;
        }

        const paneId = getColumnPaneId(column);
        // Branch: follow this path only when the current condition passes.
        if (!paneId) {
          return;
        }

        // Branch: follow this path only when the current condition passes.
        if (UIState.expandedPaneIds.has(paneId) && UIState.expandedPaneIds.size === 1) {
          return;
        }

        UIState.expandedPaneIds.clear();
        UIState.expandedPaneIds.add(paneId);
        applyColumnExpansionState();
      });
    });
  }

  // Function: copy element rich then plain.
  async function copyElementRichThenPlain(target) {
    const copiedRich = await componentKit.copyRichFromElement(target);

    // Branch: follow this path only when the current condition passes.
    if (!copiedRich) {
      await componentKit.copyFromElement(target);
    }
  }

  // Function: bind events.
  function bindEvents() {
    // Branch: follow this path only when the current condition passes.
    if (DOM.openSettingsBtn) {
      // Branch: follow this path only when the current condition passes.
      if (extensionApi && extensionApi.runtime) {
        DOM.openSettingsBtn.addEventListener("click", openSettingsPage);
      } else {
        DOM.openSettingsBtn.hidden = true;
      }
    }

    // Branch: follow this path only when the current condition passes.
    if (DOM.runBtn) {
      // Function: handle run click.
      DOM.runBtn.addEventListener("click", function handleRunClick() {
        if (debugApi) {
          debugApi.ui("workbench run pipeline clicked");
        }
        runPipeline({ writeCleanedInput: true });
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (DOM.useRewrittenBtn) {
      // Function: handle sidebar toggle.
      DOM.useRewrittenBtn.addEventListener("click", function handleSidebarToggle() {
        const willOpen = !isRewrittenSidebarOpen();
        if (debugApi) {
          debugApi.ui("workbench converted panel toggled", { willOpen: willOpen });
        }

        // Branch: follow this path only when the current condition passes.
        if (willOpen) {
          runPipeline({ writeCleanedInput: false });
        }

        setRewrittenSidebarOpen(willOpen);
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (DOM.closeRewrittenBtn) {
      DOM.closeRewrittenBtn.addEventListener("click", closeRewrittenSidebar);
    }

    // Branch: follow this path only when the current condition passes.
    if (DOM.copyFinalBtn) {
      // Function: handle copy final click.
      DOM.copyFinalBtn.addEventListener("click", function handleCopyFinalClick() {
        copyElementRichThenPlain(DOM.finalPane);
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (DOM.copyDigestBtn) {
      // Function: handle copy digest click.
      DOM.copyDigestBtn.addEventListener("click", function handleCopyDigestClick() {
        copyElementRichThenPlain(DOM.digestPane);
      });
    }

    // Branch: follow this path only when the current condition passes.
    if (DOM.toggleDebugBtn) {
      // Function: handle debug toggle click.
      DOM.toggleDebugBtn.addEventListener("click", function handleDebugToggleClick() {
        if (debugApi) {
          debugApi.ui("workbench legacy debug pane toggled");
        }
        componentKit.toggle(DOM.debugPane);
      });
    }

    // Loop: iterate through each item in the current collection.
    document.querySelectorAll("[data-copy]").forEach(function bindCopyButton(button) {
      // Function: handle copy click.
      button.addEventListener("click", function handleCopyClick() {
        const targetId = button.getAttribute("data-copy");
        copyElementRichThenPlain(targetId);
      });
    });

    // Function: handle live input.
    componentKit.bindLiveInput(DOM.editor, function handleLiveInput() {
      if (debugApi) {
        debugApi.ui("workbench live input changed", {
          isRichMode: isEditorRichMode()
        });
      }
      // Branch: follow this path only when the current condition passes.
      if (isEditorRichMode() && DOM.editor && DOM.editor.dataset) {
        DOM.editor.dataset.sourceHtml = DOM.editor.innerHTML || "";
        if (debugApi) {
          debugApi.variable("workbench source html snapshot length assigned", {
            sourceHtmlLength: DOM.editor.dataset.sourceHtml.length
          });
        }
      }

      runPipeline({ writeCleanedInput: false });
    });

    // Branch: follow this path only when the current condition passes.
    if (DOM.editor) {
      // Function: handle editor paste.
      DOM.editor.addEventListener("paste", function handleEditorPaste(event) {
        const clipboardData = event.clipboardData;
        const htmlMarkup = clipboardData ? clipboardData.getData("text/html") : "";

        // Branch: follow this path only when the current condition passes.
        if (!htmlMarkup) {
          return;
        }

        event.preventDefault();
        setEditorMode("rich-html");
        insertHtmlAtSelection(htmlMarkup);

        // Branch: follow this path only when the current condition passes.
        if (DOM.editor.dataset) {
          DOM.editor.dataset.sourceHtml = DOM.editor.innerHTML || "";
        }

        runPipeline({ writeCleanedInput: false });
      });
    }

    // Function: handle escape.
    document.addEventListener("keydown", function handleEscape(event) {
      // Branch: follow this path only when the current condition passes.
      if (event.key === "Escape") {
        closeRewrittenSidebar();
      }
    });
  }

  // Function: apply snapshot.
  function applySnapshot(snapshot) {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor) {
      return;
    }

    const pipeline = snapshot && snapshot.pipeline ? snapshot.pipeline : null;
    const rawText = snapshot && snapshot.rawText
      ? snapshot.rawText
      : (pipeline && pipeline.rawText ? pipeline.rawText : "");
    const sourceHtml = snapshot && snapshot.sourceHtml ? snapshot.sourceHtml : "";

    // Branch: follow this path only when the current condition passes.
    if (sourceHtml) {
      setEditorRichHtml(sourceHtml, rawText);
    } else {
      setEditorPlainText(rawText || "No opened inbox email body is active on this tab yet.");
    }

    runPipeline({ writeCleanedInput: false });
  }

  // Function: clear embedded snapshot.
  function clearEmbeddedSnapshot() {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor) {
      return;
    }

    setEditorPlainText("Waiting for a detected email body from the Firefox extension...");

    runPipeline({ writeCleanedInput: false });
  }

  // Function: bind window messages.
  function bindWindowMessages() {
    // Function: handle window message.
    window.addEventListener("message", function handleWindowMessage(event) {
      const message = event && event.data ? event.data : null;
      // Branch: follow this path only when the current condition passes.
      if (!message || typeof message !== "object") {
        return;
      }

      // Branch: follow this path only when the current condition passes.
      if (message.type === "merged-link-lab:set-snapshot") {
        applySnapshot(message.snapshot || null);
      }

      // Branch: follow this path only when the current condition passes.
      if (message.type === "merged-link-lab:clear-snapshot") {
        clearEmbeddedSnapshot();
      }
    });
  }

  // Function: bootstrap.
  async function bootstrap() {
    // Branch: follow this path only when the current condition passes.
    if (!DOM.editor) {
      return;
    }

    const embeddedExtensionLab = isEmbeddedExtensionLab();

    // Branch: follow this path only when the current condition passes.
    if (document.documentElement) {
      document.documentElement.classList.toggle("embedded-extension-lab", embeddedExtensionLab);
    }

    // Branch: follow this path only when the current condition passes.
    if (document.body) {
      document.body.classList.toggle("embedded-extension-lab", embeddedExtensionLab);
    }

    // Branch: follow this path only when the current condition passes.
    if (embeddedExtensionLab) {
      clearEmbeddedSnapshot();
    } else {
      setEditorPlainText(sampleInput);
    }

    bindEvents();
    bindPipelineSettings();
    bindWindowMessages();
    bindPaneCollapse();
    setRewrittenSidebarOpen(
      !embeddedExtensionLab && !!(DOM.rewrittenSidebar && DOM.rewrittenSidebar.hasAttribute("data-default-open"))
    );
    applyColumnExpansionState();
    await loadPipelineSettings();

    runPipeline({ writeCleanedInput: !embeddedExtensionLab });
  }

  bootstrap();
})();
