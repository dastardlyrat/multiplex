"use strict";

function urlForensicsPagePaneMirrorEscapeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function urlForensicsPagePaneMirrorFallbackEscapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function urlForensicsPagePaneMirrorCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    elements: optionBag.elements && typeof optionBag.elements === "object" ? optionBag.elements : {},
    DOMParserClass: optionBag.DOMParserClass || (typeof DOMParser !== "undefined" ? DOMParser : null),
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    defaultHoverMessage: String(optionBag.defaultHoverMessage || "Hover over a link to reveal URL components"),
    unavailableHoverMessage: String(
      optionBag.unavailableHoverMessage || "Mirror hover inspection is unavailable for this email body."
    ),
    escapeHtml: typeof optionBag.escapeHtml === "function"
      ? optionBag.escapeHtml
      : urlForensicsPagePaneMirrorFallbackEscapeHtml,
    replaceElementMarkup: typeof optionBag.replaceElementMarkup === "function"
      ? optionBag.replaceElementMarkup
      : function replaceMissingElementMarkup(targetElement, htmlMarkup) {
        if (targetElement && typeof targetElement.innerHTML === "string") {
          targetElement.innerHTML = String(htmlMarkup || "");
        }
      },
    classifyUrlValue: typeof optionBag.classifyUrlValue === "function"
      ? optionBag.classifyUrlValue
      : function classifyMissingUrlValue() {
        return "";
      },
    extractKnownTrackingParameterNames: typeof optionBag.extractKnownTrackingParameterNames === "function"
      ? optionBag.extractKnownTrackingParameterNames
      : function extractMissingTrackingParameterNames() {
        return [];
      }
  });
}

function urlForensicsPagePaneMirrorRemoveHash(urlValue) {
  return String(urlValue || "").replace(/#.*$/, "");
}

function urlForensicsPagePaneMirrorIsSameDocumentLink(hrefValue, baseUrl) {
  const trimmedHrefValue = String(hrefValue || "").trim();
  const trimmedBaseUrl = String(baseUrl || "").trim();

  if (!trimmedHrefValue || !trimmedBaseUrl) {
    return false;
  }

  if (trimmedHrefValue.charAt(0) === "#") {
    return true;
  }

  try {
    const resolvedLinkUrl = new URL(trimmedHrefValue, trimmedBaseUrl);
    const resolvedBaseUrl = new URL(trimmedBaseUrl);

    return (
      urlForensicsPagePaneMirrorRemoveHash(resolvedLinkUrl.toString()) ===
      urlForensicsPagePaneMirrorRemoveHash(resolvedBaseUrl.toString())
    );
  } catch {
    return false;
  }
}

function urlForensicsPagePaneMirrorDisableSameDocumentLinksInMarkup(htmlMarkup, baseUrl, DOMParserClass) {
  const safeHtmlMarkup = String(htmlMarkup || "");

  if (!safeHtmlMarkup || typeof DOMParserClass !== "function") {
    return safeHtmlMarkup;
  }

  try {
    const parsedDocument = new DOMParserClass().parseFromString(safeHtmlMarkup, "text/html");
    const mirrorRoot = parsedDocument.body || parsedDocument.documentElement;

    if (!mirrorRoot || typeof mirrorRoot.querySelectorAll !== "function") {
      return safeHtmlMarkup;
    }

    Array.from(mirrorRoot.querySelectorAll("a[href]")).forEach(function disableMirrorAnchor(anchorElement) {
      const hrefValue = typeof anchorElement.getAttribute === "function" ? anchorElement.getAttribute("href") : "";

      if (!urlForensicsPagePaneMirrorIsSameDocumentLink(hrefValue, baseUrl)) {
        return;
      }

      if (typeof anchorElement.setAttribute === "function") {
        anchorElement.setAttribute("data-merged-link-lab-disabled-link", "true");
        anchorElement.setAttribute("aria-disabled", "true");
        anchorElement.setAttribute("tabindex", "-1");
      }

      if (typeof anchorElement.removeAttribute === "function") {
        anchorElement.removeAttribute("href");
        anchorElement.removeAttribute("target");
        anchorElement.removeAttribute("rel");
      }
    });

    return parsedDocument.body && typeof parsedDocument.body.innerHTML === "string"
      ? parsedDocument.body.innerHTML
      : safeHtmlMarkup;
  } catch {
    return safeHtmlMarkup;
  }
}

function urlForensicsPagePaneMirrorBuildFrameDocument(htmlMarkup, options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const shouldDisableSameDocumentLinks = optionBag.disableSameDocumentLinks === true;
  const mirrorBaseUrl = String(
    optionBag.baseUrl ||
    (optionBag.windowObject && optionBag.windowObject.location && optionBag.windowObject.location.href) ||
    ""
  );
  const mirrorMarkup = htmlMarkup
    ? (
      shouldDisableSameDocumentLinks
        ? urlForensicsPagePaneMirrorDisableSameDocumentLinksInMarkup(
          htmlMarkup,
          mirrorBaseUrl,
          optionBag.DOMParserClass
        )
        : htmlMarkup
    )
    : '<div class="merged-link-lab-mirror-empty">Open an inbox email to mirror its formatted body here.</div>';

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '  <meta charset="utf-8">',
    '  <base href="' + urlForensicsPagePaneMirrorEscapeHtmlAttribute(mirrorBaseUrl) + '" target="_blank">',
    "  <style>",
    "    html, body { margin: 0; padding: 0; background: #ffffff; color: #1f1f1f; }",
    "    body { padding: 18px; }",
    "    img, table, iframe { max-width: 100%; }",
    "    img { height: auto; }",
    "    a { color: #0f766e; }",
    shouldDisableSameDocumentLinks
      ? "    a[data-merged-link-lab-disabled-link='true'] { color: #4a4a4a; text-decoration: none; cursor: default; }"
      : "",
    "    .merged-link-lab-mirror-empty {",
    "      padding: 18px;",
    "      border: 1px dashed #cfcfcf;",
    "      border-radius: 10px;",
    "      background: #f6f6f6;",
    "      font: 13px/1.5 Arial, sans-serif;",
    "      color: #4a4a4a;",
    "    }",
    "  </style>",
    "</head>",
    "<body>",
    mirrorMarkup,
    "</body>",
    "</html>"
  ].join("");
}

function urlForensicsPagePaneMirrorGetNearestAnchor(eventTarget) {
  const startElement = eventTarget && eventTarget.nodeType === 1
    ? eventTarget
    : (eventTarget && eventTarget.parentElement ? eventTarget.parentElement : null);

  if (!startElement || typeof startElement.closest !== "function") {
    return null;
  }

  return startElement.closest("a[href]");
}

function urlForensicsPagePaneMirrorDecodeSegment(segmentValue) {
  const safeSegmentValue = String(segmentValue || "");

  if (!safeSegmentValue) {
    return "";
  }

  try {
    return decodeURIComponent(safeSegmentValue);
  } catch {
    return safeSegmentValue;
  }
}

function urlForensicsPagePaneMirrorGetDetectionType(anchorElement, urlValue, classifyUrlValue) {
  const attributeType = String(
    (anchorElement && typeof anchorElement.getAttribute === "function" && (
      anchorElement.getAttribute("data-link-type") ||
      anchorElement.getAttribute("data-merged-link-lab")
    )) ||
    ""
  ).trim();

  if (attributeType) {
    return attributeType;
  }

  const classifiedType = String(classifyUrlValue(urlValue || "") || "").trim();
  return classifiedType || "unknown";
}

function urlForensicsPagePaneMirrorParseUrlComponents(urlValue, baseUrl, extractKnownTrackingParameterNames) {
  const safeUrlValue = String(urlValue || "").trim();
  const safeBaseUrl = String(baseUrl || "").trim();
  const emptyValue = "(none)";
  const componentValues = {
    protocol: "unknown",
    domain: "unknown-host",
    subfolder: emptyValue,
    slug: emptyValue,
    parameters: emptyValue,
    trackerParameters: emptyValue,
    anchor: emptyValue
  };

  if (!safeUrlValue) {
    return componentValues;
  }

  let parsedUrl = null;
  try {
    parsedUrl = safeBaseUrl ? new URL(safeUrlValue, safeBaseUrl) : new URL(safeUrlValue);
  } catch {
    const protocolMatch = safeUrlValue.match(/^([a-z0-9+.-]+):/i);
    if (protocolMatch && protocolMatch[1]) {
      componentValues.protocol = String(protocolMatch[1]).toLowerCase();
    }
    return componentValues;
  }

  const protocolValue = String(parsedUrl.protocol || "").replace(/:$/, "").trim();
  componentValues.protocol = protocolValue || componentValues.protocol;
  componentValues.domain = parsedUrl.host || parsedUrl.hostname || componentValues.domain;

  const pathValue = String(parsedUrl.pathname || "");
  const hasTrailingSlash = pathValue.length > 1 && /\/$/.test(pathValue);
  const pathSegments = pathValue
    .split("/")
    .filter(Boolean)
    .map(function mapPathSegment(segment) {
      return urlForensicsPagePaneMirrorDecodeSegment(segment);
    });

  if (pathSegments.length) {
    if (hasTrailingSlash) {
      componentValues.subfolder = "/" + pathSegments.join("/");
    } else if (pathSegments.length > 1) {
      componentValues.subfolder = "/" + pathSegments.slice(0, pathSegments.length - 1).join("/");
      componentValues.slug = pathSegments[pathSegments.length - 1] || emptyValue;
    } else {
      componentValues.slug = pathSegments[0] || emptyValue;
    }
  }

  const anchorValue = String(parsedUrl.hash || "").replace(/^#/, "");
  const trackerParameterNames = extractKnownTrackingParameterNames(parsedUrl.toString());
  const trackerParameterNameSet = new Set(trackerParameterNames.map(function normalizeTrackerName(parameterName) {
    return String(parameterName || "").trim().toLowerCase();
  }));
  const trackerParameterEntries = [];
  const otherParameterEntries = [];

  Array.from(parsedUrl.searchParams.entries()).forEach(function classifySearchParameter(entry) {
    const parameterName = urlForensicsPagePaneMirrorDecodeSegment(entry[0] || "");
    const parameterValue = urlForensicsPagePaneMirrorDecodeSegment(entry[1] || "");
    const formattedParameter = parameterValue ? parameterName + "=" + parameterValue : parameterName;

    if (trackerParameterNameSet.has(String(entry[0] || "").trim().toLowerCase())) {
      trackerParameterEntries.push(formattedParameter);
      return;
    }

    otherParameterEntries.push(formattedParameter);
  });

  componentValues.trackerParameters = trackerParameterEntries.length ? trackerParameterEntries.join("&") : emptyValue;
  componentValues.parameters = otherParameterEntries.length ? otherParameterEntries.join("&") : emptyValue;
  componentValues.anchor = urlForensicsPagePaneMirrorDecodeSegment(anchorValue) || emptyValue;

  return componentValues;
}

function urlForensicsPagePaneMirrorFormatHrefDetails(anchorElement, mirrorDocument, options) {
  const rawHrefValue = String(
    (anchorElement && typeof anchorElement.getAttribute === "function" && anchorElement.getAttribute("href")) || ""
  ).trim();
  let resolvedHrefValue = String((anchorElement && anchorElement.href) || "").trim();
  const baseUrl = String(
    (mirrorDocument && mirrorDocument.baseURI) ||
    (options.windowObject && options.windowObject.location && options.windowObject.location.href) ||
    ""
  ).trim();

  if (!resolvedHrefValue && rawHrefValue) {
    try {
      resolvedHrefValue = new URL(rawHrefValue, baseUrl).toString();
    } catch {
      resolvedHrefValue = rawHrefValue;
    }
  }

  const formattedUrlValue = resolvedHrefValue || rawHrefValue || "";
  const urlComponents = urlForensicsPagePaneMirrorParseUrlComponents(
    formattedUrlValue,
    baseUrl,
    options.extractKnownTrackingParameterNames
  );

  return [
    "Detection Type: " + urlForensicsPagePaneMirrorGetDetectionType(
      anchorElement,
      formattedUrlValue,
      options.classifyUrlValue
    ),
    "Protocol: " + urlComponents.protocol,
    "Domain: " + urlComponents.domain,
    "Subfolder: " + urlComponents.subfolder,
    "Slug: " + urlComponents.slug,
    "Tracker Parameters: " + urlComponents.trackerParameters,
    "Other Parameters: " + urlComponents.parameters,
    "Anchor: " + urlComponents.anchor
  ].join("\n");
}

function urlForensicsPagePaneMirrorBuildSnapshotMarkup(snapshot, escapeHtml) {
  if (!snapshot) {
    return "";
  }

  const pipelineResult = snapshot.pipeline || null;
  if (pipelineResult && pipelineResult.rewrittenHtml) {
    return pipelineResult.rewrittenHtml;
  }

  if (snapshot.sourceHtml) {
    return snapshot.sourceHtml;
  }

  if (snapshot.rawText) {
    return "<pre>" + escapeHtml(snapshot.rawText) + "</pre>";
  }

  return "";
}

function urlForensicsPagePaneMirrorBuildHoverSummaryText(textValue, defaultHoverMessage) {
  const safeTextValue = String(textValue || "").trim();

  if (!safeTextValue) {
    return defaultHoverMessage;
  }

  return safeTextValue.split(/\r?\n/, 1)[0] || defaultHoverMessage;
}

function urlForensicsPagePaneMirrorClearHoverListener(state) {
  if (state.hoverListenerCleanup) {
    state.hoverListenerCleanup();
    state.hoverListenerCleanup = null;
  }
}

function urlForensicsPagePaneMirrorSetHoverInfoText(state, elements, resolvedOptions, textValue, options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const safeTextValue = String(textValue || "").trim();

  if (!elements.hoverLinkInfoValue) {
    return;
  }

  if (
    optionBag.persistDetectedValue !== false &&
    safeTextValue &&
    safeTextValue !== resolvedOptions.defaultHoverMessage &&
    safeTextValue !== resolvedOptions.unavailableHoverMessage
  ) {
    state.latestDetectedHoverInfoText = safeTextValue;
  }

  let outputTextValue = safeTextValue;
  const shouldPreserveDetectedValue = optionBag.preserveDetectedValue !== false;

  if (
    shouldPreserveDetectedValue &&
    state.latestDetectedHoverInfoText &&
    (!outputTextValue || outputTextValue === resolvedOptions.defaultHoverMessage)
  ) {
    outputTextValue = state.latestDetectedHoverInfoText;
  }

  const finalTextValue = outputTextValue || state.latestDetectedHoverInfoText || resolvedOptions.defaultHoverMessage;

  elements.hoverLinkInfoValue.textContent = finalTextValue;

  if (elements.hoverLinkInfoSummary) {
    elements.hoverLinkInfoSummary.textContent = urlForensicsPagePaneMirrorBuildHoverSummaryText(
      finalTextValue,
      resolvedOptions.defaultHoverMessage
    );
  }
}

function urlForensicsPagePaneMirrorSetHoverLinkPanelExpanded(elements, isExpanded) {
  elements.hoverLinkPanelExpanded = !!isExpanded;

  if (
    elements.hoverLinkInfo &&
    String(elements.hoverLinkInfo.tagName || "").toUpperCase() === "DETAILS"
  ) {
    elements.hoverLinkInfo.open = elements.hoverLinkPanelExpanded;
  }
}

function urlForensicsPagePaneMirrorRenderMarkup(state, elements, resolvedOptions, htmlMarkup, options) {
  const optionBag = options && typeof options === "object" ? options : {};
  urlForensicsPagePaneMirrorClearHoverListener(state);

  if (!elements.convertedPane) {
    return;
  }

  if (String(elements.convertedPane.tagName || "").toUpperCase() === "IFRAME") {
    elements.convertedPane.srcdoc = urlForensicsPagePaneMirrorBuildFrameDocument(htmlMarkup, {
      disableSameDocumentLinks: optionBag.disableSameDocumentLinks === true,
      baseUrl: optionBag.baseUrl,
      DOMParserClass: resolvedOptions.DOMParserClass,
      windowObject: resolvedOptions.windowObject
    });
    return;
  }

  resolvedOptions.replaceElementMarkup(
    elements.convertedPane,
    htmlMarkup || '<div class="merged-link-lab-empty-state">The formatted email mirror will appear here when a snapshot is available.</div>'
  );
}

function urlForensicsPagePaneMirrorBindHoverInspector(state, elements, resolvedOptions) {
  urlForensicsPagePaneMirrorClearHoverListener(state);

  if (!elements.convertedPane || String(elements.convertedPane.tagName || "").toUpperCase() !== "IFRAME") {
    urlForensicsPagePaneMirrorSetHoverInfoText(state, elements, resolvedOptions, resolvedOptions.defaultHoverMessage);
    return;
  }

  let mirrorDocument = null;
  try {
    mirrorDocument = elements.convertedPane.contentDocument || null;
  } catch {
    urlForensicsPagePaneMirrorSetHoverInfoText(state, elements, resolvedOptions, resolvedOptions.unavailableHoverMessage);
    return;
  }

  if (!mirrorDocument) {
    urlForensicsPagePaneMirrorSetHoverInfoText(state, elements, resolvedOptions, resolvedOptions.defaultHoverMessage);
    return;
  }

  if (typeof mirrorDocument.querySelectorAll === "function") {
    Array.from(mirrorDocument.querySelectorAll("a[title]")).forEach(function clearAnchorTitle(anchorElement) {
      if (anchorElement && typeof anchorElement.removeAttribute === "function") {
        anchorElement.removeAttribute("title");
      }
    });
  }

  const handleMirrorHover = function handleMirrorHover(event) {
    const hoveredAnchor = urlForensicsPagePaneMirrorGetNearestAnchor(event && event.target);
    if (!hoveredAnchor) {
      return;
    }

    urlForensicsPagePaneMirrorSetHoverInfoText(
      state,
      elements,
      resolvedOptions,
      urlForensicsPagePaneMirrorFormatHrefDetails(hoveredAnchor, mirrorDocument, resolvedOptions)
    );
  };

  if (typeof mirrorDocument.addEventListener === "function") {
    mirrorDocument.addEventListener("mouseover", handleMirrorHover, true);
    mirrorDocument.addEventListener("focusin", handleMirrorHover, true);
  }

  state.hoverListenerCleanup = function cleanupMirrorHoverListeners() {
    if (typeof mirrorDocument.removeEventListener === "function") {
      mirrorDocument.removeEventListener("mouseover", handleMirrorHover, true);
      mirrorDocument.removeEventListener("focusin", handleMirrorHover, true);
    }
  };

  urlForensicsPagePaneMirrorSetHoverInfoText(state, elements, resolvedOptions, resolvedOptions.defaultHoverMessage);
}

function urlForensicsPagePaneMirrorCreate(options) {
  const resolvedOptions = urlForensicsPagePaneMirrorCreateDefaultOptions(options);
  const elements = resolvedOptions.elements;
  const state = {
    hoverListenerCleanup: null,
    latestDetectedHoverInfoText: ""
  };

  function setHoverInfoText(textValue, options) {
    return urlForensicsPagePaneMirrorSetHoverInfoText(state, elements, resolvedOptions, textValue, options);
  }

  function setHoverLinkPanelExpanded(isExpanded) {
    return urlForensicsPagePaneMirrorSetHoverLinkPanelExpanded(elements, isExpanded);
  }

  function renderMarkup(htmlMarkup, options) {
    return urlForensicsPagePaneMirrorRenderMarkup(state, elements, resolvedOptions, htmlMarkup, options);
  }

  function renderSnapshot(snapshot, options) {
    return renderMarkup(
      urlForensicsPagePaneMirrorBuildSnapshotMarkup(snapshot, resolvedOptions.escapeHtml),
      options
    );
  }

  function clearRenderedPane() {
    state.latestDetectedHoverInfoText = "";
    setHoverInfoText(resolvedOptions.defaultHoverMessage, {
      preserveDetectedValue: false,
      persistDetectedValue: false
    });
    renderMarkup("");
  }

  function bindHoverInspector() {
    return urlForensicsPagePaneMirrorBindHoverInspector(state, elements, resolvedOptions);
  }

  return Object.freeze({
    bindHoverInspector: bindHoverInspector,
    clearRenderedPane: clearRenderedPane,
    renderMarkup: renderMarkup,
    renderSnapshot: renderSnapshot,
    setHoverInfoText: setHoverInfoText,
    setHoverLinkPanelExpanded: setHoverLinkPanelExpanded
  });
}

(function attachUrlForensicsPagePaneMirror(globalScope) {
  const pagePaneMirror = Object.freeze({
    create: urlForensicsPagePaneMirrorCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneMirror;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneMirror = pagePaneMirror;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
