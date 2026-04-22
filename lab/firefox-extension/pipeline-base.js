// Shared low-level helpers for the URL Forensics pipeline.
"use strict";

var urlForensicsPipelineBasePluginRegistry = (function resolvePipelinePluginRegistry(globalScope) {
  if (globalScope && globalScope.urlForensicsPipelinePluginRegistry) {
    return globalScope.urlForensicsPipelinePluginRegistry;
  }

  if (typeof require === "function") {
    try {
      return require("./pipeline-plugin-registry.js");
    } catch {
      return null;
    }
  }

  return null;
}(typeof globalThis !== "undefined" ? globalThis : this));

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

if (!urlForensicsPipelineBasePluginRegistry || typeof urlForensicsPipelineBasePluginRegistry.getResolvedConfig !== "function") {
  throw new Error("URL Forensics pipeline plugin registry is unavailable.");
}

if (!urlForensicsPipelineBaseTrackingParameterModel) {
  throw new Error("URL Forensics tracking parameter model is unavailable.");
}

function urlForensicsPipelineBaseCreateRegularExpression(patternDefinition, fallbackValue) {
  const safePatternDefinition = patternDefinition && typeof patternDefinition === "object" ? patternDefinition : null;

  if (!safePatternDefinition || !safePatternDefinition.source) {
    return fallbackValue;
  }

  return new RegExp(String(safePatternDefinition.source), String(safePatternDefinition.flags || ""));
}

const urlForensicsPipelineBaseRuleConfiguration = urlForensicsPipelineBasePluginRegistry.getResolvedConfig();
const urlForensicsPipelineBaseDetectionRules = urlForensicsPipelineBaseRuleConfiguration.detection || {};
const urlForensicsPipelineBaseTrackingRules = urlForensicsPipelineBaseRuleConfiguration.tracking || {};

var urlForensicsPipelineBaseRegularExpressions = Object.freeze({
  urlToken: urlForensicsPipelineBaseCreateRegularExpression(urlForensicsPipelineBaseDetectionRules.urlTokenPattern, /https?:\/\/[^\s<>"']+/gi),
  repairableUrlTokenPatterns: Object.freeze(
    (urlForensicsPipelineBaseDetectionRules.repairableUrlTokenPatterns || []).map(function mapRepairableUrlTokenPattern(definition) {
      return Object.freeze({
        id: String(definition && definition.id || "").trim(),
        expression: urlForensicsPipelineBaseCreateRegularExpression(definition && definition.pattern, /(?:^|[^a-z])(https?:\/\/[^\s<>"']+)/gi),
        tokenGroupIndex: typeof definition.tokenGroupIndex === "number" ? definition.tokenGroupIndex : null
      });
    })
  ),
  trailingUrlPunctuation: urlForensicsPipelineBaseCreateRegularExpression(
    urlForensicsPipelineBaseDetectionRules.trailingUrlPunctuationPattern,
    /[)\]\.,>]+$/
  ),
  wrappedNoise: urlForensicsPipelineBaseCreateRegularExpression(
    urlForensicsPipelineBaseDetectionRules.wrappedNoisePattern,
    /[<>]/g
  ),
  lightweightWhitespaceNoise: urlForensicsPipelineBaseCreateRegularExpression(
    urlForensicsPipelineBaseDetectionRules.lightweightWhitespaceNoisePattern,
    /[\u2000-\u200F\u2028-\u202F]/g
  ),
  heavyWhitespaceNoise: urlForensicsPipelineBaseCreateRegularExpression(
    urlForensicsPipelineBaseDetectionRules.heavyWhitespaceNoisePattern,
    /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u2000-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g
  ),
  protectedMarkupTag: urlForensicsPipelineBaseCreateRegularExpression(
    urlForensicsPipelineBaseDetectionRules.protectedMarkupTagPattern,
    /^(A|SCRIPT|STYLE|NOSCRIPT|TEXTAREA|PRE|CODE)$/i
  ),
  embeddedTrackingParameter: urlForensicsPipelineBaseCreateRegularExpression(
    urlForensicsPipelineBaseDetectionRules.embeddedTrackingParameterPattern,
    /[?&](?:url|u|target|redirect|redirect_url|dest|destination|next|forward|goto|continue|to|href|link|data)=([^&]+)/gi
  )
});

var urlForensicsPipelineBasePreferredTrackingParameterNames = Object.freeze(
  (urlForensicsPipelineBaseTrackingRules.preferredTrackingParameterNames || []).map(function normalizeTrackingParameterName(parameterName) {
    return String(parameterName || "").trim();
  }).filter(Boolean)
);

var urlForensicsPipelineBaseTrackingHostKeywords = Object.freeze(
  (urlForensicsPipelineBaseTrackingRules.trackerHostKeywords || []).map(function normalizeTrackingHostKeyword(keyword) {
    return String(keyword || "").trim();
  }).filter(Boolean)
);

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
function urlForensicsPipelineBaseCreateDetectedUrlRecord(originalUrl, recordId, metadata) {
  const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};
  const detectorIds = Array.isArray(safeMetadata.detectorIds)
    ? safeMetadata.detectorIds.map(function normalizeDetectorId(detectorId) {
      return String(detectorId || "").trim();
    }).filter(Boolean)
    : [];

  return {
    id: recordId,
    original: originalUrl,
    normalized: null,
    resolved: [],
    validResolved: [],
    replacementUrl: "",
    notes: [],
    detectorIds: detectorIds
  };
}

// Function: attach pipeline base helpers.
(function attachUrlForensicsPipelineBase(globalScope) {
  const pipelineBase = Object.freeze({
    ruleConfiguration: urlForensicsPipelineBaseRuleConfiguration,
    regularExpressions: urlForensicsPipelineBaseRegularExpressions,
    preferredTrackingParameterNames: urlForensicsPipelineBasePreferredTrackingParameterNames,
    trackingHostKeywords: urlForensicsPipelineBaseTrackingHostKeywords,
    trackingParameterModel: urlForensicsPipelineBaseTrackingParameterModel,
    pluginRegistry: urlForensicsPipelineBasePluginRegistry,
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
