"use strict";

function urlForensicsDiagnosticsCatalogRowsResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsDiagnosticsCatalogRowsDefaultFormatInlineList(values, options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const separator = typeof optionBag.separator === "string" ? optionBag.separator : ", ";
  const emptyValue = typeof optionBag.emptyValue === "string" ? optionBag.emptyValue : "None";
  const maxVisibleItems = Number.isFinite(optionBag.maxVisibleItems) && optionBag.maxVisibleItems > 0
    ? Math.floor(optionBag.maxVisibleItems)
    : 6;
  const safeValues = (Array.isArray(values) ? values : []).map(function normalizeListValue(value) {
    return String(value || "").trim();
  }).filter(Boolean);

  if (!safeValues.length) {
    return emptyValue;
  }

  if (safeValues.length <= maxVisibleItems) {
    return safeValues.join(separator);
  }

  return safeValues.slice(0, maxVisibleItems).join(separator) + separator + "+" + String(safeValues.length - maxVisibleItems) + " more";
}

function urlForensicsDiagnosticsCatalogRowsDefaultFormatKeyValueSummary(items, formatter) {
  const safeItems = Array.isArray(items) ? items : [];

  if (!safeItems.length) {
    return "None";
  }

  return safeItems.map(function mapSummaryItem(item) {
    return formatter(item && typeof item === "object" ? item : {});
  }).filter(Boolean).join("; ");
}

// eslint-disable-next-line max-lines-per-function -- Factory keeps the three shared diagnostics catalog row builders together for diagnostics and smoke callers.
function urlForensicsDiagnosticsCatalogRowsCreate(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const formatInlineList = urlForensicsDiagnosticsCatalogRowsResolveFunction(
    optionBag.formatInlineList,
    urlForensicsDiagnosticsCatalogRowsDefaultFormatInlineList
  );
  const formatKeyValueSummary = urlForensicsDiagnosticsCatalogRowsResolveFunction(
    optionBag.formatKeyValueSummary,
    urlForensicsDiagnosticsCatalogRowsDefaultFormatKeyValueSummary
  );

  function buildUrlDetectorCatalogRows(catalog, errorMessage) {
    if (!catalog) {
      return [
        { label: "Status", value: String(errorMessage || "").trim() || "Loading URL detector definitions..." }
      ];
    }

    const rows = [
      { label: "Detector Count", value: String((catalog.summary || {}).urlDetectorCount || 0) },
      { label: "Resolved URL Token Pattern", value: catalog.detectionRules ? catalog.detectionRules.urlTokenPattern : "Unavailable" },
      {
        label: "Repairable URL Token Patterns",
        value: formatKeyValueSummary(
          catalog.detectionRules ? catalog.detectionRules.repairableUrlTokenPatterns : [],
          function formatRepairablePattern(definition) {
            return definition.id + " [group " + String(definition.tokenGroupIndex) + "]: " + definition.pattern;
          }
        )
      },
      {
        label: "Trailing Punctuation Pattern",
        value: catalog.detectionRules ? catalog.detectionRules.trailingUrlPunctuationPattern : "Unavailable"
      },
      {
        label: "Embedded Tracking Pattern",
        value: catalog.detectionRules ? catalog.detectionRules.embeddedTrackingParameterPattern : "Unavailable"
      }
    ];

    (catalog.urlDetectors || []).forEach(function appendUrlDetectorRow(detector) {
      rows.push({
        label: detector.id + " (" + detector.kind + ")",
        value: detector.title +
          ". Priority " +
          String(detector.priority) +
          ". " +
          (detector.summary || "No summary.") +
          " Tokens: " +
          formatInlineList(detector.supportedTokens, { maxVisibleItems: 8 }) +
          ". Repairs: " +
          formatInlineList(detector.supportedRepairs, { maxVisibleItems: 8 })
      });
    });

    if (errorMessage) {
      rows.push({ label: "Catalog Error", value: String(errorMessage || "").trim() });
    }

    return rows;
  }

  function buildInboxDetectorCatalogRows(catalog, errorMessage) {
    if (!catalog) {
      return [
        { label: "Status", value: String(errorMessage || "").trim() || "Loading inbox detector definitions..." }
      ];
    }

    const rows = [
      { label: "Provider Count", value: String((catalog.summary || {}).inboxProviderCount || 0) }
    ];

    (catalog.inboxProviders || []).forEach(function appendInboxProviderRow(providerDefinition) {
      rows.push({
        label: providerDefinition.id,
        value: providerDefinition.title +
          ". Host " +
          (providerDefinition.hostPattern || "Any") +
          ". Path " +
          (providerDefinition.pathPattern || "Any") +
          ". Selectors: " +
          formatInlineList(providerDefinition.primaryInboxBodySelectors, {
            separator: " | ",
            maxVisibleItems: 12
          })
      });
    });

    if (errorMessage) {
      rows.push({ label: "Catalog Error", value: String(errorMessage || "").trim() });
    }

    return rows;
  }

  function buildPipelineRuleCatalogRows(catalog, errorMessage) {
    if (!catalog) {
      return [
        { label: "Status", value: String(errorMessage || "").trim() || "Loading pipeline rule definitions..." }
      ];
    }

    const rows = [
      {
        label: "Summary",
        value:
          String((catalog.summary || {}).pluginPackCount || 0) + " plugin pack(s), " +
          String((catalog.summary || {}).trackingParameterDefinitionCount || 0) + " tracking definition(s), " +
          String((catalog.summary || {}).classificationRuleCount || 0) + " classification rule(s), " +
          String((catalog.summary || {}).repairTransformCount || 0) + " repair transform(s)."
      },
      {
        label: "Plugin Packs",
        value: formatKeyValueSummary(catalog.pluginPacks, function formatPluginPack(pluginPack) {
          return pluginPack.id +
            " (" +
            pluginPack.title +
            ", detection=" +
            String(pluginPack.detectionRuleCount) +
            ", tracking=" +
            String(pluginPack.trackingDefinitionCount) +
            ", classify=" +
            String(pluginPack.classificationRuleCount) +
            ", repair=" +
            String(pluginPack.repairTransformCount) +
            ")";
        })
      },
      {
        label: "Tracking Parameter Names",
        value: formatInlineList(
          catalog.trackingRules ? catalog.trackingRules.preferredTrackingParameterNames : [],
          { maxVisibleItems: 16 }
        )
      },
      {
        label: "Tracker Host Keywords",
        value: formatInlineList(
          catalog.trackingRules ? catalog.trackingRules.trackerHostKeywords : [],
          { maxVisibleItems: 16 }
        )
      }
    ];

    (catalog.trackingRules && Array.isArray(catalog.trackingRules.trackingParameterDefinitions)
      ? catalog.trackingRules.trackingParameterDefinitions
      : []).forEach(function appendTrackingDefinitionRow(definition) {
      rows.push({
        label: "Tracking " + definition.key,
        value: definition.label +
          " [" +
          definition.bucket +
          "] " +
          definition.matchMode +
          " " +
          definition.parameterName +
          ". " +
          definition.description
      });
    });

    (catalog.classificationRules || []).forEach(function appendClassificationRuleRow(ruleDefinition) {
      rows.push({
        label: "Classify " + ruleDefinition.id,
        value:
          ruleDefinition.type +
          " via " +
          ruleDefinition.matchType +
          ". Value: " +
          (ruleDefinition.value || "n/a") +
          ". Values: " +
          formatInlineList(ruleDefinition.values, { maxVisibleItems: 8 }) +
          ". Pattern: " +
          (ruleDefinition.pattern || "n/a")
      });
    });

    (catalog.repairTransforms || []).forEach(function appendRepairTransformRow(transformDefinition) {
      rows.push({
        label: "Repair " + transformDefinition.id,
        value:
          transformDefinition.note +
          ". Match " +
          transformDefinition.match +
          ". Replace with " +
          JSON.stringify(transformDefinition.replaceWith)
      });
    });

    if (errorMessage) {
      rows.push({ label: "Catalog Error", value: String(errorMessage || "").trim() });
    }

    return rows;
  }

  return Object.freeze({
    buildUrlDetectorCatalogRows: buildUrlDetectorCatalogRows,
    buildInboxDetectorCatalogRows: buildInboxDetectorCatalogRows,
    buildPipelineRuleCatalogRows: buildPipelineRuleCatalogRows
  });
}

(function attachUrlForensicsDiagnosticsCatalogRows(globalScope) {
  const diagnosticsCatalogRows = Object.freeze({
    create: urlForensicsDiagnosticsCatalogRowsCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = diagnosticsCatalogRows;
  }

  if (globalScope) {
    globalScope.urlForensicsDiagnosticsCatalogRows = diagnosticsCatalogRows;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
