"use strict";

function urlForensicsContentUiHelpersResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsContentUiHelpersBuildDefaultEscapeHtml() {
  return function escapeHtml(textValue) {
    return String(textValue || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
}

function urlForensicsContentUiHelpersBuildDefaultIconFallbacks() {
  return Object.freeze({
    account_tree: "\u251c",
    analytics: "\u25f7",
    close_fullscreen: "\u2199",
    content_copy: "\u25a3",
    find_replace: "\u21c4",
    link: "\u26d3",
    mail: "\u2709",
    refresh: "\u21bb",
    settings: "\u2699",
    travel_explore: "\u2316"
  });
}

function urlForensicsContentUiHelpersCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    navigatorObject: optionBag.navigatorObject || (typeof navigator !== "undefined" ? navigator : null),
    performanceObject: optionBag.performanceObject || (typeof performance !== "undefined" ? performance : null),
    extensionApi: optionBag.extensionApi && typeof optionBag.extensionApi === "object" ? optionBag.extensionApi : null,
    domParserClass: typeof optionBag.domParserClass === "function"
      ? optionBag.domParserClass
      : (typeof DOMParser === "function" ? DOMParser : null),
    clipboardItemClass: typeof optionBag.clipboardItemClass === "function"
      ? optionBag.clipboardItemClass
      : (typeof ClipboardItem === "function" ? ClipboardItem : null),
    blobClass: typeof optionBag.blobClass === "function"
      ? optionBag.blobClass
      : (typeof Blob === "function" ? Blob : null),
    fontFaceClass: typeof optionBag.fontFaceClass === "function"
      ? optionBag.fontFaceClass
      : (typeof FontFace === "function" ? FontFace : null),
    escapeHtml: urlForensicsContentUiHelpersResolveFunction(
      optionBag.escapeHtml,
      urlForensicsContentUiHelpersBuildDefaultEscapeHtml()
    ),
    sidePanelIconFallbacks: optionBag.sidePanelIconFallbacks && typeof optionBag.sidePanelIconFallbacks === "object"
      ? optionBag.sidePanelIconFallbacks
      : urlForensicsContentUiHelpersBuildDefaultIconFallbacks()
  });
}

function urlForensicsContentUiHelpersMarkSidePanelIconFontReady(options) {
  const documentObject = options.documentObject;

  if (documentObject && documentObject.documentElement && documentObject.documentElement.classList) {
    documentObject.documentElement.classList.add("merged-link-lab-page-pane-icon-font-ready");
  }
}

function urlForensicsContentUiHelpersApplySidePanelIconFallbacks(rootElement, options) {
  if (!rootElement || typeof rootElement.querySelectorAll !== "function") {
    return;
  }

  rootElement.querySelectorAll(".merged-link-lab-page-pane__icon[data-icon]").forEach(function applyIconFallback(iconElement) {
    const iconName = iconElement.getAttribute("data-icon") || "";
    const fallbackIcon = options.sidePanelIconFallbacks[iconName] || "\u25cf";

    iconElement.setAttribute("data-fallback-icon", fallbackIcon);
  });
}

function urlForensicsContentUiHelpersInstallSidePanelIconFontFace(options) {
  const documentObject = options.documentObject;
  const extensionApi = options.extensionApi;

  if (
    !documentObject ||
    !extensionApi ||
    !extensionApi.runtime ||
    typeof extensionApi.runtime.getURL !== "function"
  ) {
    return false;
  }

  const styleElementId = "merged-link-lab-page-pane-icon-font";
  const existingStyleElement = typeof documentObject.getElementById === "function"
    ? documentObject.getElementById(styleElementId)
    : null;
  const styleMount = documentObject.head || documentObject.documentElement;

  if (existingStyleElement || !styleMount || typeof documentObject.createElement !== "function") {
    return false;
  }

  const fontUrl = extensionApi.runtime.getURL("resources/fonts/material-symbols-outlined.woff2");
  const fontFaceSource = 'url("' + fontUrl.replace(/"/g, "%22") + '") format("woff2")';
  const styleElement = documentObject.createElement("style");
  styleElement.id = styleElementId;
  styleElement.textContent =
    '@font-face{font-family:"Material Symbols Outlined";font-style:normal;font-weight:400;font-display:block;src:url("' +
    fontUrl.replace(/"/g, "%22") +
    '") format("woff2");}';
  styleMount.appendChild(styleElement);

  if (
    options.fontFaceClass &&
    documentObject.fonts &&
    typeof documentObject.fonts.add === "function"
  ) {
    try {
      const iconFontFace = new options.fontFaceClass("Material Symbols Outlined", fontFaceSource, {
        style: "normal",
        weight: "400",
        display: "block"
      });
      documentObject.fonts.add(iconFontFace);
      iconFontFace.load()
        .then(function handleLoadedIconFontFace() {
          urlForensicsContentUiHelpersMarkSidePanelIconFontReady(options);
        })
        .catch(function ignoreIconFontLoadError() {});
      return true;
    } catch {
      // The @font-face rule above remains the fallback path.
    }
  }

  if (documentObject.fonts && typeof documentObject.fonts.load === "function") {
    documentObject.fonts
      .load('16px "Material Symbols Outlined"', "settings")
      .then(function handleLoadedFontFaces(fontFaces) {
        if (fontFaces && fontFaces.length) {
          urlForensicsContentUiHelpersMarkSidePanelIconFontReady(options);
        }
      })
      .catch(function ignoreDocumentFontsLoadError() {});
  }

  return true;
}

function urlForensicsContentUiHelpersAppendTextNode(fragment, targetDocument, textValue) {
  if (fragment && typeof fragment.appendChild === "function" && targetDocument && typeof targetDocument.createTextNode === "function") {
    fragment.appendChild(targetDocument.createTextNode(textValue));
    return fragment;
  }

  return textValue;
}

function urlForensicsContentUiHelpersCreateMarkupFragment(targetElement, htmlMarkup, options) {
  const targetDocument = targetElement && targetElement.ownerDocument ? targetElement.ownerDocument : options.documentObject;
  const safeHtmlMarkup = String(htmlMarkup || "");
  const fragment = targetDocument && typeof targetDocument.createDocumentFragment === "function"
    ? targetDocument.createDocumentFragment()
    : null;

  if (!safeHtmlMarkup) {
    return fragment || "";
  }

  if (!options.domParserClass || !targetDocument) {
    return urlForensicsContentUiHelpersAppendTextNode(fragment, targetDocument, safeHtmlMarkup);
  }

  try {
    const parsedDocument = new options.domParserClass().parseFromString(safeHtmlMarkup, "text/html");
    const parsedRoot = parsedDocument.body || parsedDocument.documentElement;

    if (!parsedRoot) {
      return urlForensicsContentUiHelpersAppendTextNode(fragment, targetDocument, safeHtmlMarkup);
    }

    while (parsedRoot.firstChild) {
      const nextChild =
        typeof targetDocument.importNode === "function"
          ? targetDocument.importNode(parsedRoot.firstChild, true)
          : parsedRoot.firstChild;

      if (fragment && typeof fragment.appendChild === "function") {
        fragment.appendChild(nextChild);
      }
      if (typeof parsedRoot.removeChild === "function") {
        parsedRoot.removeChild(parsedRoot.firstChild);
      } else {
        break;
      }
    }

    return fragment || safeHtmlMarkup;
  } catch {
    return urlForensicsContentUiHelpersAppendTextNode(fragment, targetDocument, safeHtmlMarkup);
  }
}

function urlForensicsContentUiHelpersReplaceElementMarkup(targetElement, htmlMarkup, options) {
  if (!targetElement) {
    return;
  }

  if (typeof targetElement.replaceChildren === "function") {
    targetElement.replaceChildren(
      urlForensicsContentUiHelpersCreateMarkupFragment(targetElement, htmlMarkup, options)
    );
  } else if (Object.prototype.hasOwnProperty.call(targetElement, "innerHTML")) {
    targetElement.innerHTML = String(htmlMarkup || "");
  }

  urlForensicsContentUiHelpersApplySidePanelIconFallbacks(targetElement, options);
}

function urlForensicsContentUiHelpersFormatDetectionTime(timestamp) {
  if (!timestamp) {
    return "Not detected";
  }

  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return "Detected";
  }
}

function urlForensicsContentUiHelpersRenderEmptyState(message, options) {
  return '<div class="merged-link-lab-page-pane__empty">' + options.escapeHtml(message) + "</div>";
}

function urlForensicsContentUiHelpersFormatMetricCount(count, singularLabel, pluralLabel) {
  const safeCount = Number.isFinite(count) ? count : 0;
  return safeCount + " " + (safeCount === 1 ? singularLabel : pluralLabel);
}

function urlForensicsContentUiHelpersFormatRailBadgeCount(count) {
  const safeCount = Math.max(0, Math.round(Number(count) || 0));
  return safeCount > 99 ? "99+" : String(safeCount);
}

async function urlForensicsContentUiHelpersCopyPlainText(value, options) {
  if (
    !options.navigatorObject ||
    !options.navigatorObject.clipboard ||
    typeof options.navigatorObject.clipboard.writeText !== "function"
  ) {
    return false;
  }

  try {
    await options.navigatorObject.clipboard.writeText(String(value || ""));
    return true;
  } catch {
    return false;
  }
}

async function urlForensicsContentUiHelpersCopyPaneText(element, options) {
  return urlForensicsContentUiHelpersCopyPlainText(
    element ? (element.innerText || element.textContent || "") : "",
    options
  );
}

function urlForensicsContentUiHelpersRenderStat(targetElement, value) {
  if (!targetElement) {
    return;
  }

  targetElement.textContent = String(value || 0);
}

function urlForensicsContentUiHelpersFormatTimestamp(timestamp) {
  if (!timestamp) {
    return "Not detected";
  }

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Detected";
  }
}

function urlForensicsContentUiHelpersRenderSummaryCount(targetElement, label, count) {
  if (!targetElement) {
    return;
  }

  targetElement.textContent = label + ": " + String(count || 0);
}

function urlForensicsContentUiHelpersEscapeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function urlForensicsContentUiHelpersCopyPaneRichOrPlain(element, options) {
  if (
    element &&
    options.navigatorObject &&
    options.navigatorObject.clipboard &&
    typeof options.navigatorObject.clipboard.write === "function" &&
    options.clipboardItemClass &&
    options.blobClass
  ) {
    try {
      const clipboardItem = new options.clipboardItemClass({
        "text/html": new options.blobClass([element.innerHTML || ""], { type: "text/html" }),
        "text/plain": new options.blobClass([element.innerText || element.textContent || ""], { type: "text/plain" })
      });

      await options.navigatorObject.clipboard.write([clipboardItem]);
      return true;
    } catch {}
  }

  return urlForensicsContentUiHelpersCopyPaneText(element, options);
}

function urlForensicsContentUiHelpersCountSectionLines(sections) {
  return (sections || []).reduce(function addSectionLines(totalCount, section) {
    return totalCount + ((section && section.lines) ? section.lines.length : 0);
  }, 0);
}

function urlForensicsContentUiHelpersFormatTimingValue(value) {
  return Number.isFinite(value) && value >= 0 ? value.toFixed(1) + " ms" : "unavailable";
}

function urlForensicsContentUiHelpersFormatByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "unavailable";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1) + " " + units[unitIndex];
}

function urlForensicsContentUiHelpersGetNavigationPerformanceEntry(options) {
  if (
    !options.performanceObject ||
    typeof options.performanceObject.getEntriesByType !== "function"
  ) {
    return null;
  }

  return options.performanceObject.getEntriesByType("navigation")[0] || null;
}

function urlForensicsContentUiHelpersCreate(options) {
  const resolvedOptions = urlForensicsContentUiHelpersCreateDefaultOptions(options);

  return Object.freeze({
    applySidePanelIconFallbacks: function applySidePanelIconFallbacks(rootElement) {
      return urlForensicsContentUiHelpersApplySidePanelIconFallbacks(rootElement, resolvedOptions);
    },
    copyPaneRichOrPlain: function copyPaneRichOrPlain(element) {
      return urlForensicsContentUiHelpersCopyPaneRichOrPlain(element, resolvedOptions);
    },
    copyPaneText: function copyPaneText(element) {
      return urlForensicsContentUiHelpersCopyPaneText(element, resolvedOptions);
    },
    copyPlainText: function copyPlainText(value) {
      return urlForensicsContentUiHelpersCopyPlainText(value, resolvedOptions);
    },
    countSectionLines: urlForensicsContentUiHelpersCountSectionLines,
    createMarkupFragment: function createMarkupFragment(targetElement, htmlMarkup) {
      return urlForensicsContentUiHelpersCreateMarkupFragment(targetElement, htmlMarkup, resolvedOptions);
    },
    escapeHtmlAttribute: urlForensicsContentUiHelpersEscapeHtmlAttribute,
    formatByteSize: urlForensicsContentUiHelpersFormatByteSize,
    formatDetectionTime: urlForensicsContentUiHelpersFormatDetectionTime,
    formatMetricCount: urlForensicsContentUiHelpersFormatMetricCount,
    formatRailBadgeCount: urlForensicsContentUiHelpersFormatRailBadgeCount,
    formatTimingValue: urlForensicsContentUiHelpersFormatTimingValue,
    formatTimestamp: urlForensicsContentUiHelpersFormatTimestamp,
    getNavigationPerformanceEntry: function getNavigationPerformanceEntry() {
      return urlForensicsContentUiHelpersGetNavigationPerformanceEntry(resolvedOptions);
    },
    installSidePanelIconFontFace: function installSidePanelIconFontFace() {
      return urlForensicsContentUiHelpersInstallSidePanelIconFontFace(resolvedOptions);
    },
    renderEmptyState: function renderEmptyState(message) {
      return urlForensicsContentUiHelpersRenderEmptyState(message, resolvedOptions);
    },
    renderStat: urlForensicsContentUiHelpersRenderStat,
    renderSummaryCount: urlForensicsContentUiHelpersRenderSummaryCount,
    replaceElementMarkup: function replaceElementMarkup(targetElement, htmlMarkup) {
      return urlForensicsContentUiHelpersReplaceElementMarkup(targetElement, htmlMarkup, resolvedOptions);
    }
  });
}

(function attachUrlForensicsContentUiHelpers(globalScope) {
  const contentUiHelpers = Object.freeze({
    create: urlForensicsContentUiHelpersCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentUiHelpers;
  }

  if (globalScope) {
    globalScope.urlForensicsContentUiHelpers = contentUiHelpers;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
