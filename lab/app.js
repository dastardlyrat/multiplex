(function initializeMergedLinkLabFromBaseHtml() {
  "use strict";

  const componentKit = typeof ComponentKit !== "undefined" ? ComponentKit : null;
  const mergedLinkLabPipeline = typeof MergedLinkLabPipeline !== "undefined" ? MergedLinkLabPipeline : null;
  const debugApi = typeof globalThis !== "undefined" ? globalThis.mergedLinkLabDebug : null;
  if (debugApi && typeof debugApi.configure === "function") {
    debugApi.configure({ context: "standalone-lab", module: "app" });
    debugApi.runtime("standalone lab initialization started");
  }

  if (!componentKit || !mergedLinkLabPipeline) {
    if (debugApi) {
      debugApi.error("standalone lab initialization aborted: required modules unavailable", {
        hasComponentKit: !!componentKit,
        hasPipeline: !!mergedLinkLabPipeline
      });
    }
    return;
  }

  const DOM = {
    editor: document.getElementById("editor"),
    runBtn: document.getElementById("runBtn"),
    useRewrittenBtn: document.getElementById("useRewrittenBtn"),
    copyFinalBtn: document.getElementById("copyFinalBtn"),
    copyDigestBtn: document.getElementById("copyDigestBtn"),
    toggleDebugBtn: document.getElementById("toggleDebugBtn"),
    closeRewrittenBtn: document.getElementById("closeRewrittenBtn"),
    detectedPane: document.getElementById("detectedPane"),
    resolvedPane: document.getElementById("resolvedPane"),
    finalPane: document.getElementById("finalPane"),
    digestPane: document.getElementById("digestPane"),
    rewrittenSidebar: document.getElementById("rewrittenSidebar"),
    rewrittenPane: document.getElementById("rewrittenPane"),
    diagnosticsPane: document.getElementById("diagnosticsPane"),
    debugPane: document.getElementById("debugPane"),
    inputSummary: document.getElementById("inputSummary"),
    detectSummary: document.getElementById("detectSummary"),
    resolveSummary: document.getElementById("resolveSummary"),
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

  function isEditorRichMode() {
    return !!(DOM.editor && DOM.editor.dataset && DOM.editor.dataset.inputMode === "rich-html");
  }

  function setEditorMode(mode) {
    if (!DOM.editor || !DOM.editor.dataset) {
      return;
    }

    DOM.editor.dataset.inputMode = mode;
  }

  function replaceElementWithLineBreakText(targetElement, textValue) {
    if (!targetElement) {
      return;
    }

    const fragment = document.createDocumentFragment();

    String(textValue || "").split("\n").forEach(function appendLine(lineText, lineIndex) {
      if (lineIndex > 0) {
        fragment.appendChild(document.createElement("br"));
      }

      fragment.appendChild(document.createTextNode(lineText));
    });

    targetElement.replaceChildren(fragment);
  }

  function createHtmlDocument(htmlMarkup) {
    if (typeof DOMParser === "undefined") {
      return null;
    }

    try {
      return new DOMParser().parseFromString(String(htmlMarkup || ""), "text/html");
    } catch {
      return null;
    }
  }

  function sanitizeHtmlDocument(parsedDocument) {
    if (!parsedDocument || !parsedDocument.querySelectorAll) {
      return;
    }

    parsedDocument.querySelectorAll("script, style, link, meta, base, iframe, object, embed, form").forEach(function removeUnsafeNode(node) {
      node.remove();
    });

    parsedDocument.querySelectorAll("*").forEach(function sanitizeElement(element) {
      Array.from(element.attributes).forEach(function sanitizeAttribute(attribute) {
        const attributeName = String(attribute.name || "").toLowerCase();
        const attributeValue = String(attribute.value || "");

        if (attributeName.indexOf("on") === 0) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (/^(href|src|action|poster|xlink:href)$/i.test(attribute.name)) {
          const normalizedValue = attributeValue.trim().toLowerCase();
          if (/^javascript:/i.test(normalizedValue)) {
            element.removeAttribute(attribute.name);
          }
        }
      });
    });
  }

  function createSanitizedHtmlFragment(htmlMarkup) {
    const fragment = document.createDocumentFragment();
    const parsedDocument = createHtmlDocument(htmlMarkup);
    const sourceContainer = parsedDocument ? (parsedDocument.body || parsedDocument.documentElement || parsedDocument) : null;

    if (!sourceContainer) {
      return fragment;
    }

    sanitizeHtmlDocument(parsedDocument);

    Array.from(sourceContainer.childNodes).forEach(function appendSanitizedNode(node) {
      fragment.appendChild(document.importNode(node, true));
    });

    return fragment;
  }

  function replaceElementWithSanitizedHtml(targetElement, htmlMarkup) {
    if (!targetElement) {
      return false;
    }

    const fragment = createSanitizedHtmlFragment(htmlMarkup);
    const hasContent = fragment.childNodes.length > 0;
    targetElement.replaceChildren(fragment);
    return hasContent;
  }

  function setEditorPlainText(text) {
    if (!DOM.editor) {
      return;
    }

    DOM.editor.textContent = text || "";
    setEditorMode("plain-text");

    if (DOM.editor.dataset) {
      DOM.editor.dataset.sourceHtml = "";
    }
  }

  function setEditorRichHtml(htmlMarkup, fallbackText) {
    if (!DOM.editor) {
      return;
    }

    const hasSanitizedContent = replaceElementWithSanitizedHtml(DOM.editor, htmlMarkup);

    if (hasSanitizedContent) {
      setEditorMode("rich-html");

      if (DOM.editor.dataset) {
        DOM.editor.dataset.sourceHtml = DOM.editor.innerHTML || "";
      }

      return;
    }

    setEditorPlainText(fallbackText || "");
  }

  function insertHtmlAtSelection(htmlMarkup) {
    if (!DOM.editor || !htmlMarkup) {
      return;
    }

    DOM.editor.focus();

    const fragment = createSanitizedHtmlFragment(htmlMarkup);
    const insertedNodes = Array.from(fragment.childNodes);
    const lastNode = insertedNodes.length ? insertedNodes[insertedNodes.length - 1] : null;

    if (!lastNode) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      DOM.editor.appendChild(fragment);
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(fragment);

    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function getDefaultExpandedPaneIds() {
    const defaultExpandedColumn =
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

  function setRichText(targetElement, text) {
    if (!targetElement) {
      return;
    }

    replaceElementWithLineBreakText(targetElement, text || "");
  }

  function getInputPayload() {
    const rawText = DOM.editor ? DOM.editor.innerText || "" : "";
    const rawHtml = DOM.editor ? DOM.editor.innerHTML || "" : "";
    const preservedSourceHtml = DOM.editor && DOM.editor.dataset ? DOM.editor.dataset.sourceHtml || "" : "";
    const looksLikeHtmlSource =
      /<\s*html[\s>]/i.test(rawText) ||
      /<\s*body[\s>]/i.test(rawText) ||
      (/<[a-z][^>]*>/i.test(rawText) && /<\/[a-z][^>]*>/i.test(rawText));
    const richSourceHtml = isEditorRichMode() ? rawHtml : "";

    if (DOM.editor && DOM.editor.dataset && richSourceHtml) {
      DOM.editor.dataset.sourceHtml = richSourceHtml;
    }

    return {
      rawText: rawText,
      cleanedText: mergedLinkLabPipeline.cleanInputText(rawText),
      sourceHtml: looksLikeHtmlSource ? rawText : (richSourceHtml || preservedSourceHtml || "")
    };
  }

  function renderDetected(items) {
    const lines = items.map(function mapItem(item) {
      return String(item.id) + ". " + item.original;
    });

    setRichText(DOM.detectedPane, lines.join("\n"));
    componentKit.renderCount(DOM.detectSummary, "DETECTED", items.length);
  }

  function renderResolved(items) {
    const lines = [];

    items.forEach(function addItemLines(item) {
      lines.push("SOURCE " + item.id + ": " + item.original);
      lines.push("NORMALIZED: " + item.normalized);
      lines.push("RESOLVED: " + (item.resolved.length ? item.resolved.join(" | ") : "(none)"));
      lines.push("VALID: " + (item.validResolved.length ? item.validResolved.join(" | ") : "(none)"));
      lines.push("NOTES: " + (item.notes.length ? item.notes.join(", ") : "(none)"));
      lines.push("");
    });

    setRichText(DOM.resolvedPane, lines.join("\n").trim());

    const resolvedCount = items.reduce(function addResolvedCount(total, item) {
      return total + item.resolved.length;
    }, 0);

    componentKit.renderCount(DOM.resolveSummary, "RESOLVED", resolvedCount);
  }

  function renderFinal(items) {
    const finalUrls = mergedLinkLabPipeline.buildStandaloneFinalUrls(items);

    if (DOM.finalPane) {
      const fragment = document.createDocumentFragment();

      finalUrls.forEach(function appendFinalUrl(url, urlIndex) {
        const host = mergedLinkLabPipeline.extractHost(url);
        const linkType = mergedLinkLabPipeline.classify(host);
        const originUrl = mergedLinkLabPipeline.extractOriginUrl(url);
        const linkLabel = originUrl + " (" + linkType + ")";
        const anchorElement = document.createElement("a");

        if (urlIndex > 0) {
          fragment.appendChild(document.createElement("br"));
        }

        anchorElement.setAttribute("href", url);
        anchorElement.setAttribute("target", "_blank");
        anchorElement.setAttribute("rel", "noopener noreferrer");
        anchorElement.textContent = linkLabel;
        fragment.appendChild(anchorElement);
      });

      DOM.finalPane.replaceChildren(fragment);
    }

    componentKit.renderCount(DOM.finalSummary, "FINAL URLS", finalUrls.length);
    return finalUrls;
  }

  function renderDigest(entries) {
    if (DOM.digestPane) {
      const fragment = document.createDocumentFragment();

      entries.forEach(function appendDigestEntry(entry, entryIndex) {
        const anchorElement = document.createElement("a");

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

  function renderRewrittenHtml(sourceMarkup) {
    const rewrittenResult = mergedLinkLabPipeline.rewriteHtmlForStandalonePreview(sourceMarkup);

    if (DOM.rewrittenPane) {
      replaceElementWithSanitizedHtml(DOM.rewrittenPane, rewrittenResult.html);
    }

    componentKit.renderCount(DOM.rewrittenSummary, "REWRITTEN URLS", rewrittenResult.count || 0);
  }

  function renderDiagnostics(items, finalUrls, digestEntries, errors, rawText) {
    const diagnostics = mergedLinkLabPipeline.buildDiagnostics(items, finalUrls, digestEntries, errors, rawText);

    setRichText(DOM.diagnosticsPane, diagnostics.lines.join("\n"));
    componentKit.renderCount(DOM.diagnosticsSummary, "DIAGNOSTICS", diagnostics.lines.length);

    const debugLines = [];
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

  function runPipeline(options) {
    if (debugApi) {
      debugApi.functionIn("standalone-lab.runPipeline", {
        writeCleanedInput: !!(options && options.writeCleanedInput)
      });
    }

    const optionBag = options || {};
    const shouldWriteCleanedInput = !!optionBag.writeCleanedInput;
    const payload = getInputPayload();
    const errors = [];
    let items = [];

    if (shouldWriteCleanedInput && DOM.editor && payload.cleanedText !== payload.rawText && !isEditorRichMode()) {
      setEditorPlainText(payload.cleanedText);
      if (debugApi) {
        debugApi.conditional("standalone lab cleaned input written back to editor", {
          cleanedLength: payload.cleanedText.length
        });
      }
    }

    componentKit.renderCount(
      DOM.inputSummary,
      "INPUT LINES",
      payload.cleanedText ? payload.cleanedText.split("\n").length : 0
    );

    try {
      items = payload.sourceHtml
        ? mergedLinkLabPipeline.detectUrlsFromHtml(payload.sourceHtml)
        : mergedLinkLabPipeline.detectURLs(payload.cleanedText);
    } catch (error) {
      errors.push("stageDetect: " + error.message);
      if (debugApi) {
        debugApi.error("standalone lab detect stage failed", { message: error.message });
      }
    }

    try {
      mergedLinkLabPipeline.populateResolvedDataForItems(items);
    } catch (error) {
      errors.push("stageResolve: " + error.message);
      if (debugApi) {
        debugApi.error("standalone lab resolve stage failed", { message: error.message });
      }
    }

    renderDetected(items);
    renderResolved(items);

    const finalUrls = renderFinal(items);
    const digestEntries = mergedLinkLabPipeline.buildDigestEntries(payload.cleanedText, items);

    renderDigest(digestEntries);
    renderRewrittenHtml(payload.sourceHtml || payload.cleanedText);
    renderDiagnostics(items, finalUrls, digestEntries, errors, payload.rawText);
    if (debugApi) {
      debugApi.pipeline("standalone lab pipeline rendered", {
        itemCount: items.length,
        finalUrlCount: finalUrls.length,
        digestEntryCount: digestEntries.length,
        errorCount: errors.length,
        hasSourceHtml: !!payload.sourceHtml
      });
      debugApi.functionOut("standalone-lab.runPipeline", {
        itemCount: items.length,
        errorCount: errors.length
      });
    }
  }

  function getColumnPaneId(column) {
    const pane = column ? column.querySelector(".pane-edit, .pane-output, .pane-console") : null;
    return pane ? pane.id : "";
  }

  function applyColumnExpansionState() {
    DOM.columns.forEach(function updateColumnState(column) {
      const paneId = getColumnPaneId(column);
      const isExpanded = !!paneId && UIState.expandedPaneIds.has(paneId);

      column.classList.toggle("is-expanded", isExpanded);
      column.classList.toggle("is-collapsed-horizontal", !isExpanded);
      column.classList.toggle("is-active", isExpanded);
    });
  }

  function isRewrittenSidebarOpen() {
    return !!(DOM.rewrittenSidebar && DOM.rewrittenSidebar.classList.contains("is-open"));
  }

  function setRewrittenSidebarOpen(isOpen) {
    if (!DOM.rewrittenSidebar || !DOM.useRewrittenBtn) {
      return;
    }

    DOM.rewrittenSidebar.classList.toggle("is-open", isOpen);
    DOM.rewrittenSidebar.setAttribute("aria-hidden", String(!isOpen));
    DOM.useRewrittenBtn.textContent = isOpen ? "Hide Converted Panel" : "Show Converted Panel";
  }

  function closeRewrittenSidebar() {
    setRewrittenSidebarOpen(false);
  }

  function bindPaneCollapse() {
    DOM.columns.forEach(function bindColumn(column) {
      const title = column.querySelector(".pane-title");

      if (!title) {
        return;
      }

      title.addEventListener("click", function handleTitleClick(event) {
        if (event.target && event.target.closest("button")) {
          return;
        }

        const paneId = getColumnPaneId(column);
        if (!paneId) {
          return;
        }

        if (UIState.expandedPaneIds.has(paneId) && UIState.expandedPaneIds.size === 1) {
          return;
        }

        UIState.expandedPaneIds.clear();
        UIState.expandedPaneIds.add(paneId);
        applyColumnExpansionState();
      });
    });
  }

  async function copyElementRichThenPlain(target) {
    const copiedRich = await componentKit.copyRichFromElement(target);

    if (!copiedRich) {
      await componentKit.copyFromElement(target);
    }
  }

  function bindEvents() {
    if (DOM.runBtn) {
      DOM.runBtn.addEventListener("click", function handleRunClick() {
        if (debugApi) {
          debugApi.ui("standalone lab run pipeline clicked");
        }
        runPipeline({ writeCleanedInput: true });
      });
    }

    if (DOM.useRewrittenBtn) {
      DOM.useRewrittenBtn.addEventListener("click", function handleSidebarToggle() {
        const willOpen = !isRewrittenSidebarOpen();
        if (debugApi) {
          debugApi.ui("standalone lab converted panel toggled", { willOpen: willOpen });
        }

        if (willOpen) {
          runPipeline({ writeCleanedInput: false });
        }

        setRewrittenSidebarOpen(willOpen);
      });
    }

    if (DOM.closeRewrittenBtn) {
      DOM.closeRewrittenBtn.addEventListener("click", closeRewrittenSidebar);
    }

    if (DOM.copyFinalBtn) {
      DOM.copyFinalBtn.addEventListener("click", function handleCopyFinalClick() {
        copyElementRichThenPlain(DOM.finalPane);
      });
    }

    if (DOM.copyDigestBtn) {
      DOM.copyDigestBtn.addEventListener("click", function handleCopyDigestClick() {
        copyElementRichThenPlain(DOM.digestPane);
      });
    }

    if (DOM.toggleDebugBtn) {
      DOM.toggleDebugBtn.addEventListener("click", function handleDebugToggleClick() {
        if (debugApi) {
          debugApi.ui("standalone lab legacy debug pane toggled");
        }
        componentKit.toggle(DOM.debugPane);
      });
    }

    document.querySelectorAll("[data-copy]").forEach(function bindCopyButton(button) {
      button.addEventListener("click", function handleCopyClick() {
        const targetId = button.getAttribute("data-copy");
        copyElementRichThenPlain(targetId);
      });
    });

    componentKit.bindLiveInput(DOM.editor, function handleLiveInput() {
      if (debugApi) {
        debugApi.ui("standalone lab live input changed", {
          isRichMode: isEditorRichMode()
        });
      }

      if (isEditorRichMode() && DOM.editor && DOM.editor.dataset) {
        DOM.editor.dataset.sourceHtml = DOM.editor.innerHTML || "";
        if (debugApi) {
          debugApi.variable("standalone lab source html snapshot length assigned", {
            sourceHtmlLength: DOM.editor.dataset.sourceHtml.length
          });
        }
      }

      runPipeline({ writeCleanedInput: false });
    });

    if (DOM.editor) {
      DOM.editor.addEventListener("paste", function handleEditorPaste(event) {
        const clipboardData = event.clipboardData;
        const htmlMarkup = clipboardData ? clipboardData.getData("text/html") : "";

        if (!htmlMarkup) {
          return;
        }

        event.preventDefault();
        setEditorMode("rich-html");
        insertHtmlAtSelection(htmlMarkup);

        if (DOM.editor.dataset) {
          DOM.editor.dataset.sourceHtml = DOM.editor.innerHTML || "";
        }

        runPipeline({ writeCleanedInput: false });
      });
    }

    document.addEventListener("keydown", function handleEscape(event) {
      if (event.key === "Escape") {
        closeRewrittenSidebar();
      }
    });
  }

  function bootstrap() {
    if (!DOM.editor) {
      return;
    }

    setEditorPlainText(sampleInput);
    bindEvents();
    bindPaneCollapse();
    setRewrittenSidebarOpen(!!(DOM.rewrittenSidebar && DOM.rewrittenSidebar.hasAttribute("data-default-open")));
    applyColumnExpansionState();
    runPipeline({ writeCleanedInput: true });
  }

  bootstrap();
})();
