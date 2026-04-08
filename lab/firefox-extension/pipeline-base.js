// Shared low-level helpers for the URL Forensics pipeline.
"use strict";

var urlForensicsPipelineBaseTrackingParameterModel = (function resolvePipelineTrackingParameterModel(globalScope) {
  if (globalScope && globalScope.urlForensicsTrackingParameterModel) {
    return globalScope.urlForensicsTrackingParameterModel;
  }

  if (typeof require === "function") {
    try {
      return require("./tracking-parameter-model.js");
    } catch {
      return null;
    }
  }

  return null;
}(typeof globalThis !== "undefined" ? globalThis : this));

if (!urlForensicsPipelineBaseTrackingParameterModel) {
  throw new Error("URL Forensics tracking parameter model is unavailable.");
}

var urlForensicsPipelineBaseRegularExpressions = Object.freeze({
  urlToken: /https?:\/\/[^\s<>"']+/gi,
  trailingUrlPunctuation: /[)\]\.,>]+$/,
  wrappedNoise: /[<>]/g,
  lightweightWhitespaceNoise: /[\u2000-\u200F\u2028-\u202F]/g,
  heavyWhitespaceNoise: /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u2000-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g,
  protectedMarkupTag: /^(A|SCRIPT|STYLE|NOSCRIPT|TEXTAREA|PRE|CODE)$/i,
  embeddedTrackingParameter:
    /[?&](?:url|u|target|redirect|redirect_url|dest|destination|next|forward|goto|continue|to|href|link|data)=([^&]+)/gi
});

var urlForensicsPipelineBasePreferredTrackingParameterNames = Object.freeze([
  "url",
  "u",
  "target",
  "redirect",
  "redirect_url",
  "dest",
  "destination",
  "next",
  "forward",
  "goto",
  "continue",
  "to",
  "href",
  "link",
  "data"
]);

var urlForensicsPipelineBaseTrackingHostKeywords = Object.freeze([
  "list-manage",
  "rs6.net",
  "ccsend.com",
  "kajabimail",
  "mail",
  "tracking",
  "redirect",
  "click"
]);

var urlForensicsPipelineBaseDefaultSettings = Object.freeze({
  enableUrlNormalizationRepair: false,
  stripKnownTrackingParameters: true,
  trackingParameterFilters: urlForensicsPipelineBaseTrackingParameterModel.defaultTrackingParameterFilters
});

// Function: convert pipeline value to string.
function urlForensicsPipelineBaseConvertValueToString(value) {
  return String(value || "");
}

// Function: resolve pipeline settings.
function urlForensicsPipelineBaseResolveSettings(options) {
  const optionBag = options || {};
  const hasOwn = Object.prototype.hasOwnProperty;

  return {
    enableUrlNormalizationRepair: hasOwn.call(optionBag, "enableUrlNormalizationRepair")
      ? optionBag.enableUrlNormalizationRepair === true
      : urlForensicsPipelineBaseDefaultSettings.enableUrlNormalizationRepair,
    stripKnownTrackingParameters: hasOwn.call(optionBag, "stripKnownTrackingParameters")
      ? optionBag.stripKnownTrackingParameters === true
      : urlForensicsPipelineBaseDefaultSettings.stripKnownTrackingParameters,
    trackingParameterFilters: hasOwn.call(optionBag, "trackingParameterFilters")
      ? urlForensicsPipelineBaseTrackingParameterModel.normalizeTrackingParameterFilters(optionBag.trackingParameterFilters)
      : urlForensicsPipelineBaseTrackingParameterModel.defaultTrackingParameterFilters
  };
}

// Function: get node filter flag.
function urlForensicsPipelineBaseGetNodeFilterFlag(globalScope, flagName, fallbackValue) {
  return globalScope && globalScope.NodeFilter && typeof globalScope.NodeFilter[flagName] === "number"
    ? globalScope.NodeFilter[flagName]
    : fallbackValue;
}

// Function: get node type value.
function urlForensicsPipelineBaseGetNodeTypeValue(globalScope, typeName, fallbackValue) {
  return globalScope && globalScope.Node && typeof globalScope.Node[typeName] === "number"
    ? globalScope.Node[typeName]
    : fallbackValue;
}

// Function: create html parser document.
function urlForensicsPipelineBaseCreateHtmlParserDocument(globalScope, sourceMarkup) {
  if (!globalScope || typeof globalScope.DOMParser !== "function") {
    return null;
  }

  const htmlParser = new globalScope.DOMParser();
  return htmlParser.parseFromString(urlForensicsPipelineBaseConvertValueToString(sourceMarkup), "text/html");
}

// Function: escape html.
function urlForensicsPipelineBaseEscapeHtml(text) {
  return urlForensicsPipelineBaseConvertValueToString(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Function: clean input text.
function urlForensicsPipelineBaseCleanInputText(rawInput) {
  const normalizedText = urlForensicsPipelineBaseConvertValueToString(rawInput)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(urlForensicsPipelineBaseRegularExpressions.lightweightWhitespaceNoise, "");
  const normalizedLines = normalizedText
    .split("\n")
    .map(function collapseLineWhitespace(lineText) {
      return lineText.replace(/[ \t]+/g, " ").replace(/[ \t]+$/g, "");
    });

  return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Function: normalize line.
function urlForensicsPipelineBaseNormalizeLine(lineText) {
  return urlForensicsPipelineBaseConvertValueToString(lineText)
    .replace(urlForensicsPipelineBaseRegularExpressions.wrappedNoise, "")
    .replace(urlForensicsPipelineBaseRegularExpressions.lightweightWhitespaceNoise, "")
    .trim();
}

// Function: validate title.
function urlForensicsPipelineBaseValidateTitle(rawTitleText) {
  const normalizedTitle = urlForensicsPipelineBaseNormalizeLine(rawTitleText)
    .replace(/[*_`]/g, "")
    .replace(/^\|\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedTitle) return null;
  if (normalizedTitle.startsWith("[image")) return null;
  if (normalizedTitle.split(" ").length > 15) return null;
  if (/^[a-z].*\.$/.test(normalizedTitle)) return null;
  if (!/[A-Z0-9:!?]/.test(normalizedTitle)) return null;

  return normalizedTitle;
}

// Function: normalize title.
function urlForensicsPipelineBaseNormalizeTitle(titleText, fallbackHost) {
  if (!titleText) return fallbackHost;
  if (titleText.includes("http://") || titleText.includes("https://")) return fallbackHost;
  if (titleText.length > 120) return fallbackHost;
  return titleText;
}

// Function: create detected URL record.
function urlForensicsPipelineBaseCreateDetectedUrlRecord(originalUrl, recordId) {
  return {
    id: recordId,
    original: originalUrl,
    normalized: null,
    resolved: [],
    validResolved: [],
    replacementUrl: "",
    notes: []
  };
}

// Function: attach pipeline base helpers.
(function attachUrlForensicsPipelineBase(globalScope) {
  const pipelineBase = Object.freeze({
    regularExpressions: urlForensicsPipelineBaseRegularExpressions,
    preferredTrackingParameterNames: urlForensicsPipelineBasePreferredTrackingParameterNames,
    trackingHostKeywords: urlForensicsPipelineBaseTrackingHostKeywords,
    trackingParameterModel: urlForensicsPipelineBaseTrackingParameterModel,
    defaultPipelineSettings: urlForensicsPipelineBaseDefaultSettings,
    convertValueToString: urlForensicsPipelineBaseConvertValueToString,
    resolvePipelineSettings: urlForensicsPipelineBaseResolveSettings,
    getNodeFilterFlag: urlForensicsPipelineBaseGetNodeFilterFlag,
    getNodeTypeValue: urlForensicsPipelineBaseGetNodeTypeValue,
    createHtmlParserDocument: urlForensicsPipelineBaseCreateHtmlParserDocument,
    escapeHtml: urlForensicsPipelineBaseEscapeHtml,
    cleanInputText: urlForensicsPipelineBaseCleanInputText,
    normalizeLine: urlForensicsPipelineBaseNormalizeLine,
    validateTitle: urlForensicsPipelineBaseValidateTitle,
    normalizeTitle: urlForensicsPipelineBaseNormalizeTitle,
    createDetectedUrlRecord: urlForensicsPipelineBaseCreateDetectedUrlRecord
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineBase;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineBase = pipelineBase;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
