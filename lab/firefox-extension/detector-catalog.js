"use strict";

function urlForensicsDetectorCatalogFormatPattern(patternDefinition) {
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

function urlForensicsDetectorCatalogFreezeArray(items, mapper) {
  return Object.freeze((Array.isArray(items) ? items : []).map(function mapCatalogItem(item, index) {
    return mapper ? mapper(item, index) : item;
  }));
}

function urlForensicsDetectorCatalogBuildSummary(urlDetectors, inboxProviders, pluginPacks, resolvedConfig) {
  return Object.freeze({
    urlDetectorCount: urlDetectors.length,
    inboxProviderCount: inboxProviders.length,
    pluginPackCount: pluginPacks.length,
    trackingParameterDefinitionCount: ((resolvedConfig.tracking || {}).trackingParameterDefinitions || []).length,
    classificationRuleCount: ((resolvedConfig.classification || {}).hostRules || []).length,
    repairTransformCount: ((resolvedConfig.repair || {}).peelTransforms || []).length
  });
}

function urlForensicsDetectorCatalogBuildUrlDetectors(urlDetectors) {
  return urlForensicsDetectorCatalogFreezeArray(urlDetectors, function mapUrlDetector(detector) {
    const safeDetector = detector && typeof detector === "object" ? detector : {};
    return Object.freeze({
      id: String(safeDetector.id || "").trim(),
      title: String(safeDetector.title || "").trim(),
      kind: String(safeDetector.kind || "").trim(),
      priority: Number.isFinite(safeDetector.priority) ? safeDetector.priority : 0,
      summary: String(safeDetector.summary || "").trim(),
      supportedTokens: urlForensicsDetectorCatalogFreezeArray(safeDetector.supportedTokens, function cloneSupportedToken(tokenValue) {
        return String(tokenValue || "").trim();
      }),
      supportedRepairs: urlForensicsDetectorCatalogFreezeArray(safeDetector.supportedRepairs, function cloneSupportedRepair(repairValue) {
        return String(repairValue || "").trim();
      })
    });
  });
}

function urlForensicsDetectorCatalogBuildDetectionRules(resolvedConfig) {
  return Object.freeze({
    urlTokenPattern: urlForensicsDetectorCatalogFormatPattern((resolvedConfig.detection || {}).urlTokenPattern),
    repairableUrlTokenPatterns: urlForensicsDetectorCatalogFreezeArray(
      (resolvedConfig.detection || {}).repairableUrlTokenPatterns,
      function mapRepairableTokenPattern(definition) {
        const safeDefinition = definition && typeof definition === "object" ? definition : {};
        return Object.freeze({
          id: String(safeDefinition.id || "").trim(),
          pattern: urlForensicsDetectorCatalogFormatPattern(safeDefinition.pattern),
          tokenGroupIndex: typeof safeDefinition.tokenGroupIndex === "number" ? safeDefinition.tokenGroupIndex : null
        });
      }
    ),
    trailingUrlPunctuationPattern: urlForensicsDetectorCatalogFormatPattern((resolvedConfig.detection || {}).trailingUrlPunctuationPattern),
    embeddedTrackingParameterPattern: urlForensicsDetectorCatalogFormatPattern((resolvedConfig.detection || {}).embeddedTrackingParameterPattern)
  });
}

function urlForensicsDetectorCatalogBuildInboxProviders(inboxProviders) {
  return urlForensicsDetectorCatalogFreezeArray(inboxProviders, function mapInboxProvider(providerDefinition) {
    const safeProviderDefinition = providerDefinition && typeof providerDefinition === "object" ? providerDefinition : {};
    return Object.freeze({
      id: String(safeProviderDefinition.id || "").trim(),
      title: String(safeProviderDefinition.title || "").trim(),
      priority: Number.isFinite(safeProviderDefinition.priority) ? safeProviderDefinition.priority : 0,
      hostPattern: urlForensicsDetectorCatalogFormatPattern(safeProviderDefinition.hostPattern),
      pathPattern: urlForensicsDetectorCatalogFormatPattern(safeProviderDefinition.pathPattern),
      primaryInboxBodySelectors: urlForensicsDetectorCatalogFreezeArray(
        safeProviderDefinition.primaryInboxBodySelectors,
        function clonePrimarySelector(selectorValue) {
          return String(selectorValue || "").trim();
        }
      )
    });
  });
}

function urlForensicsDetectorCatalogBuildPluginPacks(pluginPacks) {
  return urlForensicsDetectorCatalogFreezeArray(pluginPacks, function mapPluginPack(pluginPack) {
    const safePluginPack = pluginPack && typeof pluginPack === "object" ? pluginPack : {};
    const packDetection = safePluginPack.detection && typeof safePluginPack.detection === "object" ? safePluginPack.detection : {};
    const packTracking = safePluginPack.tracking && typeof safePluginPack.tracking === "object" ? safePluginPack.tracking : {};
    const packClassification = safePluginPack.classification && typeof safePluginPack.classification === "object" ? safePluginPack.classification : {};
    const packRepair = safePluginPack.repair && typeof safePluginPack.repair === "object" ? safePluginPack.repair : {};

    return Object.freeze({
      id: String(safePluginPack.id || "").trim(),
      title: String(safePluginPack.title || "").trim(),
      priority: Number.isFinite(safePluginPack.priority) ? safePluginPack.priority : 0,
      detectionRuleCount: (packDetection.repairableUrlTokenPatterns || []).length + (packDetection.urlTokenPattern ? 1 : 0),
      trackingDefinitionCount: (packTracking.trackingParameterDefinitions || []).length,
      classificationRuleCount: (packClassification.hostRules || []).length,
      repairTransformCount: (packRepair.peelTransforms || []).length
    });
  });
}

function urlForensicsDetectorCatalogBuildTrackingRules(resolvedConfig) {
  return Object.freeze({
    preferredTrackingParameterNames: urlForensicsDetectorCatalogFreezeArray(
      (resolvedConfig.tracking || {}).preferredTrackingParameterNames,
      function clonePreferredTrackingParameterName(parameterName) {
        return String(parameterName || "").trim();
      }
    ),
    trackerHostKeywords: urlForensicsDetectorCatalogFreezeArray(
      (resolvedConfig.tracking || {}).trackerHostKeywords,
      function cloneTrackingHostKeyword(keyword) {
        return String(keyword || "").trim();
      }
    ),
    trackingParameterDefinitions: urlForensicsDetectorCatalogFreezeArray(
      (resolvedConfig.tracking || {}).trackingParameterDefinitions,
      function mapTrackingParameterDefinition(definition) {
        const safeDefinition = definition && typeof definition === "object" ? definition : {};
        return Object.freeze({
          key: String(safeDefinition.key || "").trim(),
          bucket: String(safeDefinition.bucket || "").trim(),
          label: String(safeDefinition.label || "").trim(),
          parameterName: String(safeDefinition.parameterName || "").trim(),
          matchMode: String(safeDefinition.matchMode || "").trim(),
          description: String(safeDefinition.description || "").trim()
        });
      }
    )
  });
}

function urlForensicsDetectorCatalogBuildClassificationRules(resolvedConfig) {
  return urlForensicsDetectorCatalogFreezeArray(
    (resolvedConfig.classification || {}).hostRules,
    function mapClassificationRule(ruleDefinition) {
      const safeRuleDefinition = ruleDefinition && typeof ruleDefinition === "object" ? ruleDefinition : {};
      return Object.freeze({
        id: String(safeRuleDefinition.id || "").trim(),
        type: String(safeRuleDefinition.type || "").trim(),
        matchType: String(safeRuleDefinition.matchType || "").trim(),
        value: String(safeRuleDefinition.value || "").trim(),
        values: urlForensicsDetectorCatalogFreezeArray(safeRuleDefinition.values, function cloneRuleValue(ruleValue) {
          return String(ruleValue || "").trim();
        }),
        pattern: urlForensicsDetectorCatalogFormatPattern(safeRuleDefinition.pattern)
      });
    }
  );
}

function urlForensicsDetectorCatalogBuildRepairTransforms(resolvedConfig) {
  return urlForensicsDetectorCatalogFreezeArray(
    (resolvedConfig.repair || {}).peelTransforms,
    function mapRepairTransform(transformDefinition) {
      const safeTransformDefinition = transformDefinition && typeof transformDefinition === "object" ? transformDefinition : {};
      return Object.freeze({
        id: String(safeTransformDefinition.id || "").trim(),
        note: String(safeTransformDefinition.note || "").trim(),
        match: urlForensicsDetectorCatalogFormatPattern(safeTransformDefinition.match),
        replaceWith: String(safeTransformDefinition.replaceWith || "")
      });
    }
  );
}

(function attachUrlForensicsDetectorCatalog(
  globalScope,
  pipelineBase,
  pipelineDetectorRegistry,
  pipelinePluginRegistry,
  inboxDetectorRegistry
) {
  function buildDetectorCatalog() {
    if (!pipelineBase) {
      throw new Error("URL Forensics pipeline base is unavailable.");
    }

    if (!pipelineDetectorRegistry || typeof pipelineDetectorRegistry.create !== "function") {
      throw new Error("URL Forensics detector registry is unavailable.");
    }

    if (!pipelinePluginRegistry || typeof pipelinePluginRegistry.getResolvedConfig !== "function") {
      throw new Error("URL Forensics plugin registry is unavailable.");
    }

    if (!inboxDetectorRegistry || typeof inboxDetectorRegistry.listProviderDefinitions !== "function") {
      throw new Error("URL Forensics inbox detector registry is unavailable.");
    }

    const detectorRegistry = pipelineDetectorRegistry.create({ pipelineBase: pipelineBase });
    const resolvedConfig = pipelinePluginRegistry.getResolvedConfig();
    const pluginPacks = pipelinePluginRegistry.listPluginPacks();
    const urlDetectors = detectorRegistry.listDetectors();
    const inboxProviders = inboxDetectorRegistry.listProviderDefinitions();

    return Object.freeze({
      summary: urlForensicsDetectorCatalogBuildSummary(urlDetectors, inboxProviders, pluginPacks, resolvedConfig),
      urlDetectors: urlForensicsDetectorCatalogBuildUrlDetectors(urlDetectors),
      detectionRules: urlForensicsDetectorCatalogBuildDetectionRules(resolvedConfig),
      inboxProviders: urlForensicsDetectorCatalogBuildInboxProviders(inboxProviders),
      pluginPacks: urlForensicsDetectorCatalogBuildPluginPacks(pluginPacks),
      trackingRules: urlForensicsDetectorCatalogBuildTrackingRules(resolvedConfig),
      classificationRules: urlForensicsDetectorCatalogBuildClassificationRules(resolvedConfig),
      repairTransforms: urlForensicsDetectorCatalogBuildRepairTransforms(resolvedConfig)
    });
  }

  const detectorCatalogApi = Object.freeze({
    buildCatalog: buildDetectorCatalog
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = detectorCatalogApi;
  }

  if (globalScope) {
    globalScope.urlForensicsDetectorCatalog = detectorCatalogApi;
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
  }(typeof globalThis !== "undefined" ? globalThis : this))
));
