"use strict";

function urlForensicsCatalogDriftArrayEquals(leftValue, rightValue) {
  return JSON.stringify(leftValue) === JSON.stringify(rightValue);
}

function urlForensicsCatalogDriftFormatPattern(patternDefinition) {
  if (!patternDefinition) {
    return "";
  }

  if (patternDefinition instanceof RegExp) {
    return "/" + patternDefinition.source + "/" + patternDefinition.flags;
  }

  if (patternDefinition && typeof patternDefinition === "object" && patternDefinition.source) {
    return "/" + String(patternDefinition.source) + "/" + String(patternDefinition.flags || "");
  }

  return "";
}

function urlForensicsCatalogDriftResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsCatalogDriftDefaultFormatInlineList(values, options) {
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

function urlForensicsCatalogDriftDefaultFormatKeyValueSummary(items, formatter) {
  const safeItems = Array.isArray(items) ? items : [];

  if (!safeItems.length) {
    return "None";
  }

  return safeItems.map(function mapSummaryItem(item) {
    return formatter(item && typeof item === "object" ? item : {});
  }).filter(Boolean).join("; ");
}

function urlForensicsCatalogDriftCreateContext(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const pipelineDetectorRegistry = optionBag.pipelineDetectorRegistry || null;
  const pipelinePluginRegistry = optionBag.pipelinePluginRegistry || null;
  const inboxDetectorRegistry = optionBag.inboxDetectorRegistry || null;
  const detectorCatalog = optionBag.detectorCatalog || null;
  const diagnosticsCatalogRows = optionBag.diagnosticsCatalogRows || null;

  if (!pipelineBase) {
    throw new Error("URL Forensics pipeline base is unavailable.");
  }

  if (!pipelineDetectorRegistry || typeof pipelineDetectorRegistry.create !== "function") {
    throw new Error("URL Forensics pipeline detector registry is unavailable.");
  }

  if (!pipelinePluginRegistry || typeof pipelinePluginRegistry.getResolvedConfig !== "function" || typeof pipelinePluginRegistry.listPluginPacks !== "function") {
    throw new Error("URL Forensics pipeline plugin registry is unavailable.");
  }

  if (!inboxDetectorRegistry || typeof inboxDetectorRegistry.listProviderDefinitions !== "function") {
    throw new Error("URL Forensics inbox detector registry is unavailable.");
  }

  if (!detectorCatalog || typeof detectorCatalog.buildCatalog !== "function") {
    throw new Error("URL Forensics detector catalog is unavailable.");
  }

  if (!diagnosticsCatalogRows || typeof diagnosticsCatalogRows.create !== "function") {
    throw new Error("URL Forensics diagnostics catalog rows helper is unavailable.");
  }

  return Object.freeze({
    pipelineBase: pipelineBase,
    pipelineDetectorRegistry: pipelineDetectorRegistry,
    pipelinePluginRegistry: pipelinePluginRegistry,
    inboxDetectorRegistry: inboxDetectorRegistry,
    detectorCatalog: detectorCatalog,
    diagnosticsCatalogRows: diagnosticsCatalogRows
  });
}

function urlForensicsCatalogDriftBuildLiveSnapshot(context) {
  const detectorRegistry = context.pipelineDetectorRegistry.create({
    pipelineBase: context.pipelineBase
  });
  const resolvedConfig = context.pipelinePluginRegistry.getResolvedConfig();
  const pluginPacks = context.pipelinePluginRegistry.listPluginPacks();
  const urlDetectors = detectorRegistry.listDetectors();
  const inboxProviders = context.inboxDetectorRegistry.listProviderDefinitions();

  return Object.freeze({
    urlDetectorIds: urlDetectors.map(function mapUrlDetectorId(detector) {
      return detector.id;
    }),
    inboxProviderIds: inboxProviders.map(function mapInboxProviderId(providerDefinition) {
      return providerDefinition.id;
    }),
    pluginPackIds: pluginPacks.map(function mapPluginPackId(pluginPack) {
      return pluginPack.id;
    }),
    urlTokenPattern: urlForensicsCatalogDriftFormatPattern((resolvedConfig.detection || {}).urlTokenPattern),
    repairableUrlTokenPatternIds: ((resolvedConfig.detection || {}).repairableUrlTokenPatterns || []).map(function mapRepairablePatternId(definition) {
      return definition.id;
    }),
    trackingParameterDefinitionKeys: ((resolvedConfig.tracking || {}).trackingParameterDefinitions || []).map(function mapTrackingDefinitionKey(definition) {
      return definition.key;
    }),
    classificationRuleIds: ((resolvedConfig.classification || {}).hostRules || []).map(function mapClassificationRuleId(ruleDefinition) {
      return ruleDefinition.id;
    }),
    repairTransformIds: ((resolvedConfig.repair || {}).peelTransforms || []).map(function mapRepairTransformId(transformDefinition) {
      return transformDefinition.id;
    }),
    summary: Object.freeze({
      urlDetectorCount: urlDetectors.length,
      inboxProviderCount: inboxProviders.length,
      pluginPackCount: pluginPacks.length,
      trackingParameterDefinitionCount: ((resolvedConfig.tracking || {}).trackingParameterDefinitions || []).length,
      classificationRuleCount: ((resolvedConfig.classification || {}).hostRules || []).length,
      repairTransformCount: ((resolvedConfig.repair || {}).peelTransforms || []).length
    })
  });
}

function urlForensicsCatalogDriftBuildCatalogSnapshot(catalog) {
  return Object.freeze({
    urlDetectorIds: (catalog.urlDetectors || []).map(function mapUrlDetectorId(detector) {
      return detector.id;
    }),
    inboxProviderIds: (catalog.inboxProviders || []).map(function mapInboxProviderId(providerDefinition) {
      return providerDefinition.id;
    }),
    pluginPackIds: (catalog.pluginPacks || []).map(function mapPluginPackId(pluginPack) {
      return pluginPack.id;
    }),
    urlTokenPattern: catalog.detectionRules ? catalog.detectionRules.urlTokenPattern : "",
    repairableUrlTokenPatternIds: (catalog.detectionRules && Array.isArray(catalog.detectionRules.repairableUrlTokenPatterns)
      ? catalog.detectionRules.repairableUrlTokenPatterns
      : []).map(function mapRepairablePatternId(definition) {
      return definition.id;
    }),
    trackingParameterDefinitionKeys: (catalog.trackingRules && Array.isArray(catalog.trackingRules.trackingParameterDefinitions)
      ? catalog.trackingRules.trackingParameterDefinitions
      : []).map(function mapTrackingDefinitionKey(definition) {
      return definition.key;
    }),
    classificationRuleIds: (catalog.classificationRules || []).map(function mapClassificationRuleId(ruleDefinition) {
      return ruleDefinition.id;
    }),
    repairTransformIds: (catalog.repairTransforms || []).map(function mapRepairTransformId(transformDefinition) {
      return transformDefinition.id;
    }),
    summary: Object.freeze(catalog.summary || {})
  });
}

function urlForensicsCatalogDriftBuildDiagnosticsSnapshot(context, catalog) {
  const diagnosticsRows = context.diagnosticsCatalogRows.create({
    formatInlineList: urlForensicsCatalogDriftResolveFunction(
      context.formatInlineList,
      urlForensicsCatalogDriftDefaultFormatInlineList
    ),
    formatKeyValueSummary: urlForensicsCatalogDriftResolveFunction(
      context.formatKeyValueSummary,
      urlForensicsCatalogDriftDefaultFormatKeyValueSummary
    )
  });
  const urlRows = diagnosticsRows.buildUrlDetectorCatalogRows(catalog, "");
  const inboxRows = diagnosticsRows.buildInboxDetectorCatalogRows(catalog, "");
  const pipelineRows = diagnosticsRows.buildPipelineRuleCatalogRows(catalog, "");

  return Object.freeze({
    urlRowLabels: urlRows.map(function mapRowLabel(row) {
      return row.label;
    }),
    inboxRowLabels: inboxRows.map(function mapRowLabel(row) {
      return row.label;
    }),
    pipelineRowLabels: pipelineRows.map(function mapRowLabel(row) {
      return row.label;
    })
  });
}

function urlForensicsCatalogDriftBuildExpectedDiagnosticsLabels(catalog) {
  return Object.freeze({
    urlRowLabels: [
      "Detector Count",
      "Resolved URL Token Pattern",
      "Repairable URL Token Patterns",
      "Trailing Punctuation Pattern",
      "Embedded Tracking Pattern"
    ].concat((catalog.urlDetectors || []).map(function mapDetector(detector) {
      return detector.id + " (" + detector.kind + ")";
    })),
    inboxRowLabels: ["Provider Count"].concat((catalog.inboxProviders || []).map(function mapProvider(providerDefinition) {
      return providerDefinition.id;
    })),
    pipelineRowLabels: [
      "Summary",
      "Plugin Packs",
      "Tracking Parameter Names",
      "Tracker Host Keywords"
    ]
      .concat((catalog.trackingRules && Array.isArray(catalog.trackingRules.trackingParameterDefinitions)
        ? catalog.trackingRules.trackingParameterDefinitions
        : []).map(function mapTrackingDefinition(definition) {
        return "Tracking " + definition.key;
      }))
      .concat((catalog.classificationRules || []).map(function mapClassificationRule(ruleDefinition) {
        return "Classify " + ruleDefinition.id;
      }))
      .concat((catalog.repairTransforms || []).map(function mapRepairTransform(transformDefinition) {
        return "Repair " + transformDefinition.id;
      }))
  });
}

function urlForensicsCatalogDriftBuildReport(context) {
  const liveSnapshot = urlForensicsCatalogDriftBuildLiveSnapshot(context);
  const catalog = context.detectorCatalog.buildCatalog();
  const catalogSnapshot = urlForensicsCatalogDriftBuildCatalogSnapshot(catalog);
  const diagnosticsSnapshot = urlForensicsCatalogDriftBuildDiagnosticsSnapshot(context, catalog);
  const expectedDiagnosticsLabels = urlForensicsCatalogDriftBuildExpectedDiagnosticsLabels(catalog);
  const actual = Object.freeze({
    live: liveSnapshot,
    catalog: catalogSnapshot,
    diagnostics: diagnosticsSnapshot
  });
  const failures = [];

  [
    ["urlDetectorIds", liveSnapshot.urlDetectorIds, catalogSnapshot.urlDetectorIds],
    ["inboxProviderIds", liveSnapshot.inboxProviderIds, catalogSnapshot.inboxProviderIds],
    ["pluginPackIds", liveSnapshot.pluginPackIds, catalogSnapshot.pluginPackIds],
    ["repairableUrlTokenPatternIds", liveSnapshot.repairableUrlTokenPatternIds, catalogSnapshot.repairableUrlTokenPatternIds],
    ["trackingParameterDefinitionKeys", liveSnapshot.trackingParameterDefinitionKeys, catalogSnapshot.trackingParameterDefinitionKeys],
    ["classificationRuleIds", liveSnapshot.classificationRuleIds, catalogSnapshot.classificationRuleIds],
    ["repairTransformIds", liveSnapshot.repairTransformIds, catalogSnapshot.repairTransformIds]
  ].forEach(function compareCatalogArray(entry) {
    const label = entry[0];
    const expected = entry[1];
    const received = entry[2];

    if (!urlForensicsCatalogDriftArrayEquals(expected, received)) {
      failures.push(
        "Expected detector catalog " +
        label +
        " to match live registry/config values " +
        JSON.stringify(expected) +
        " but received " +
        JSON.stringify(received) +
        "."
      );
    }
  });

  if (liveSnapshot.urlTokenPattern !== catalogSnapshot.urlTokenPattern) {
    failures.push(
      "Expected detector catalog urlTokenPattern " +
      JSON.stringify(catalogSnapshot.urlTokenPattern) +
      " to match resolved plugin config " +
      JSON.stringify(liveSnapshot.urlTokenPattern) +
      "."
    );
  }

  [
    "urlDetectorCount",
    "inboxProviderCount",
    "pluginPackCount",
    "trackingParameterDefinitionCount",
    "classificationRuleCount",
    "repairTransformCount"
  ].forEach(function compareSummaryCount(summaryKey) {
    if ((catalogSnapshot.summary || {})[summaryKey] !== (liveSnapshot.summary || {})[summaryKey]) {
      failures.push(
        "Expected detector catalog summary " +
        JSON.stringify(summaryKey) +
        " to match live value " +
        JSON.stringify((liveSnapshot.summary || {})[summaryKey]) +
        " but received " +
        JSON.stringify((catalogSnapshot.summary || {})[summaryKey]) +
        "."
      );
    }
  });

  [
    ["urlRowLabels", expectedDiagnosticsLabels.urlRowLabels, diagnosticsSnapshot.urlRowLabels],
    ["inboxRowLabels", expectedDiagnosticsLabels.inboxRowLabels, diagnosticsSnapshot.inboxRowLabels],
    ["pipelineRowLabels", expectedDiagnosticsLabels.pipelineRowLabels, diagnosticsSnapshot.pipelineRowLabels]
  ].forEach(function compareDiagnosticsLabels(entry) {
    const label = entry[0];
    const expected = entry[1];
    const received = entry[2];

    if (!urlForensicsCatalogDriftArrayEquals(expected, received)) {
      failures.push(
        "Expected diagnostics catalog " +
        label +
        " to match detector catalog content " +
        JSON.stringify(expected) +
        " but received " +
        JSON.stringify(received) +
        "."
      );
    }
  });

  return Object.freeze({
    expected: Object.freeze({
      summary: liveSnapshot.summary,
      urlDetectorIds: liveSnapshot.urlDetectorIds,
      inboxProviderIds: liveSnapshot.inboxProviderIds,
      pluginPackIds: liveSnapshot.pluginPackIds,
      repairableUrlTokenPatternIds: liveSnapshot.repairableUrlTokenPatternIds,
      trackingParameterDefinitionKeys: liveSnapshot.trackingParameterDefinitionKeys,
      classificationRuleIds: liveSnapshot.classificationRuleIds,
      repairTransformIds: liveSnapshot.repairTransformIds,
      urlRowLabels: expectedDiagnosticsLabels.urlRowLabels,
      inboxRowLabels: expectedDiagnosticsLabels.inboxRowLabels,
      pipelineRowLabels: expectedDiagnosticsLabels.pipelineRowLabels
    }),
    actual: actual,
    failures: failures
  });
}

function urlForensicsCatalogDriftCreate(options) {
  const driftContext = urlForensicsCatalogDriftCreateContext(options);

  return Object.freeze({
    buildReport: function buildReport() {
      return urlForensicsCatalogDriftBuildReport(driftContext);
    }
  });
}

(function attachUrlForensicsCatalogDrift(
  globalScope,
  pipelineBase,
  pipelineDetectorRegistry,
  pipelinePluginRegistry,
  inboxDetectorRegistry,
  detectorCatalog,
  diagnosticsCatalogRows
) {
  const catalogDrift = Object.freeze({
    create: urlForensicsCatalogDriftCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = catalogDrift;
  }

  if (globalScope) {
    globalScope.urlForensicsCatalogDrift = catalogDrift;
  }
}(
  typeof globalThis !== "undefined" ? globalThis : this,
  (function resolvePipelineBase(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineBase) {
      return globalScope.urlForensicsPipelineBase;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-base.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  (function resolvePipelineDetectorRegistry(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineDetectorRegistry) {
      return globalScope.urlForensicsPipelineDetectorRegistry;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-detector-registry.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  (function resolvePipelinePluginRegistry(globalScope) {
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
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  (function resolveInboxDetectorRegistry(globalScope) {
    if (globalScope && globalScope.urlForensicsInboxDetectorRegistry) {
      return globalScope.urlForensicsInboxDetectorRegistry;
    }

    if (typeof require === "function") {
      try {
        return require("./inbox-detector-registry.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  (function resolveDetectorCatalog(globalScope) {
    if (globalScope && globalScope.urlForensicsDetectorCatalog) {
      return globalScope.urlForensicsDetectorCatalog;
    }

    if (typeof require === "function") {
      try {
        return require("./detector-catalog.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  (function resolveDiagnosticsCatalogRows(globalScope) {
    if (globalScope && globalScope.urlForensicsDiagnosticsCatalogRows) {
      return globalScope.urlForensicsDiagnosticsCatalogRows;
    }

    if (typeof require === "function") {
      try {
        return require("./diagnostics-catalog-rows.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this))
));
