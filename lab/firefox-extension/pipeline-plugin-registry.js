// Declarative rule-pack registry for the URL Forensics pipeline.
"use strict";

var urlForensicsPipelineDefaultPluginPack = (function resolveUrlForensicsPipelineDefaultPluginPack(globalScope) {
  if (globalScope && globalScope.urlForensicsPipelineDefaultPluginPack) {
    return globalScope.urlForensicsPipelineDefaultPluginPack;
  }

  if (typeof require === "function") {
    try {
      return require("./pipeline-default-plugin.js");
    } catch {
      return null;
    }
  }

  return null;
}(typeof globalThis !== "undefined" ? globalThis : this));

if (!urlForensicsPipelineDefaultPluginPack) {
  throw new Error("URL Forensics default pipeline plugin pack is unavailable.");
}

function urlForensicsPipelineRegistryFreezeArray(value) {
  return Object.freeze((Array.isArray(value) ? value : []).slice());
}

function urlForensicsPipelineRegistryClonePatternDefinition(patternDefinition) {
  if (!patternDefinition || typeof patternDefinition !== "object") {
    return null;
  }

  return Object.freeze({
    source: String(patternDefinition.source || ""),
    flags: String(patternDefinition.flags || "")
  });
}

function urlForensicsPipelineRegistryCloneArrayOfObjects(items, cloneValue) {
  return Object.freeze((Array.isArray(items) ? items : []).map(cloneValue));
}

function urlForensicsPipelineRegistryClonePluginPack(pluginPack) {
  const pack = pluginPack && typeof pluginPack === "object" ? pluginPack : {};
  const detection = pack.detection && typeof pack.detection === "object" ? pack.detection : {};
  const tracking = pack.tracking && typeof pack.tracking === "object" ? pack.tracking : {};
  const classification = pack.classification && typeof pack.classification === "object" ? pack.classification : {};
  const repair = pack.repair && typeof pack.repair === "object" ? pack.repair : {};

  return Object.freeze({
    id: String(pack.id || "").trim(),
    title: String(pack.title || "").trim(),
    priority: Number.isFinite(pack.priority) ? pack.priority : 0,
    detection: Object.freeze({
      urlTokenPattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.urlTokenPattern),
      repairableUrlTokenPatterns: urlForensicsPipelineRegistryCloneArrayOfObjects(
        detection.repairableUrlTokenPatterns,
        function cloneRepairableTokenPattern(definition) {
          const normalizedDefinition = definition && typeof definition === "object" ? definition : {};
          return Object.freeze({
            id: String(normalizedDefinition.id || "").trim(),
            pattern: urlForensicsPipelineRegistryClonePatternDefinition(normalizedDefinition.pattern),
            tokenGroupIndex: typeof normalizedDefinition.tokenGroupIndex === "number"
              ? normalizedDefinition.tokenGroupIndex
              : null
          });
        }
      ),
      trailingUrlPunctuationPattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.trailingUrlPunctuationPattern),
      wrappedNoisePattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.wrappedNoisePattern),
      lightweightWhitespaceNoisePattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.lightweightWhitespaceNoisePattern),
      heavyWhitespaceNoisePattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.heavyWhitespaceNoisePattern),
      protectedMarkupTagPattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.protectedMarkupTagPattern),
      embeddedTrackingParameterPattern: urlForensicsPipelineRegistryClonePatternDefinition(detection.embeddedTrackingParameterPattern)
    }),
    tracking: Object.freeze({
      preferredTrackingParameterNames: urlForensicsPipelineRegistryFreezeArray(tracking.preferredTrackingParameterNames),
      trackerHostKeywords: urlForensicsPipelineRegistryFreezeArray(tracking.trackerHostKeywords),
      trackingParameterDefinitions: urlForensicsPipelineRegistryCloneArrayOfObjects(
        tracking.trackingParameterDefinitions,
        function cloneTrackingParameterDefinition(definition) {
          const normalizedDefinition = definition && typeof definition === "object" ? definition : {};
          return Object.freeze({
            key: String(normalizedDefinition.key || "").trim(),
            bucket: String(normalizedDefinition.bucket || "").trim(),
            label: String(normalizedDefinition.label || "").trim(),
            parameterName: String(normalizedDefinition.parameterName || "").trim(),
            matchMode: String(normalizedDefinition.matchMode || "").trim(),
            description: String(normalizedDefinition.description || "").trim()
          });
        }
      )
    }),
    classification: Object.freeze({
      hostRules: urlForensicsPipelineRegistryCloneArrayOfObjects(
        classification.hostRules,
        function cloneHostRule(ruleDefinition) {
          const normalizedRule = ruleDefinition && typeof ruleDefinition === "object" ? ruleDefinition : {};
          return Object.freeze({
            id: String(normalizedRule.id || "").trim(),
            type: String(normalizedRule.type || "").trim(),
            matchType: String(normalizedRule.matchType || "").trim(),
            value: String(normalizedRule.value || "").trim(),
            values: urlForensicsPipelineRegistryFreezeArray(normalizedRule.values),
            pattern: urlForensicsPipelineRegistryClonePatternDefinition(normalizedRule.pattern)
          });
        }
      )
    }),
    repair: Object.freeze({
      peelTransforms: urlForensicsPipelineRegistryCloneArrayOfObjects(
        repair.peelTransforms,
        function clonePeelTransform(transformDefinition) {
          const normalizedTransform = transformDefinition && typeof transformDefinition === "object" ? transformDefinition : {};
          return Object.freeze({
            id: String(normalizedTransform.id || "").trim(),
            note: String(normalizedTransform.note || "").trim(),
            match: urlForensicsPipelineRegistryClonePatternDefinition(normalizedTransform.match),
            replaceWith: String(normalizedTransform.replaceWith || "")
          });
        }
      )
    })
  });
}

function urlForensicsPipelineRegistryBuildKeyedList(items, keySelector) {
  const keyedValues = new Map();

  (Array.isArray(items) ? items : []).forEach(function rememberItem(item) {
    const resolvedKey = String(keySelector(item) || "").trim();
    const safeKey = resolvedKey || "anonymous-" + String(keyedValues.size + 1);
    keyedValues.set(safeKey, item);
  });

  return Array.from(keyedValues.values());
}

function urlForensicsPipelineRegistryMergePluginPacks(pluginPacks) {
  const detection = {};
  const preferredTrackingParameterNames = new Map();
  const trackerHostKeywords = new Map();
  const trackingParameterDefinitions = [];
  const hostRules = [];
  const peelTransforms = [];
  const repairableUrlTokenPatterns = [];

  (Array.isArray(pluginPacks) ? pluginPacks : []).forEach(function mergePluginPack(pluginPack) {
    const pack = pluginPack && typeof pluginPack === "object" ? pluginPack : {};
    const packDetection = pack.detection && typeof pack.detection === "object" ? pack.detection : {};
    const packTracking = pack.tracking && typeof pack.tracking === "object" ? pack.tracking : {};
    const packClassification = pack.classification && typeof pack.classification === "object" ? pack.classification : {};
    const packRepair = pack.repair && typeof pack.repair === "object" ? pack.repair : {};

    [
      "urlTokenPattern",
      "trailingUrlPunctuationPattern",
      "wrappedNoisePattern",
      "lightweightWhitespaceNoisePattern",
      "heavyWhitespaceNoisePattern",
      "protectedMarkupTagPattern",
      "embeddedTrackingParameterPattern"
    ].forEach(function rememberSingularDetectionField(fieldName) {
      if (packDetection[fieldName]) {
        detection[fieldName] = packDetection[fieldName];
      }
    });

    repairableUrlTokenPatterns.push.apply(repairableUrlTokenPatterns, packDetection.repairableUrlTokenPatterns || []);
    trackingParameterDefinitions.push.apply(trackingParameterDefinitions, packTracking.trackingParameterDefinitions || []);
    hostRules.push.apply(hostRules, packClassification.hostRules || []);
    peelTransforms.push.apply(peelTransforms, packRepair.peelTransforms || []);

    (packTracking.preferredTrackingParameterNames || []).forEach(function rememberPreferredTrackingParameterName(parameterName) {
      preferredTrackingParameterNames.set(String(parameterName || "").trim().toLowerCase(), String(parameterName || "").trim());
    });

    (packTracking.trackerHostKeywords || []).forEach(function rememberTrackerHostKeyword(keyword) {
      trackerHostKeywords.set(String(keyword || "").trim().toLowerCase(), String(keyword || "").trim());
    });
  });

  return Object.freeze({
    detection: Object.freeze({
      urlTokenPattern: detection.urlTokenPattern || null,
      repairableUrlTokenPatterns: Object.freeze(urlForensicsPipelineRegistryBuildKeyedList(
        repairableUrlTokenPatterns,
        function selectRepairableTokenKey(definition) {
          return definition && definition.id
            ? definition.id
            : (definition && definition.pattern ? definition.pattern.source : "");
        }
      )),
      trailingUrlPunctuationPattern: detection.trailingUrlPunctuationPattern || null,
      wrappedNoisePattern: detection.wrappedNoisePattern || null,
      lightweightWhitespaceNoisePattern: detection.lightweightWhitespaceNoisePattern || null,
      heavyWhitespaceNoisePattern: detection.heavyWhitespaceNoisePattern || null,
      protectedMarkupTagPattern: detection.protectedMarkupTagPattern || null,
      embeddedTrackingParameterPattern: detection.embeddedTrackingParameterPattern || null
    }),
    tracking: Object.freeze({
      preferredTrackingParameterNames: Object.freeze(Array.from(preferredTrackingParameterNames.values()).filter(Boolean)),
      trackerHostKeywords: Object.freeze(Array.from(trackerHostKeywords.values()).filter(Boolean)),
      trackingParameterDefinitions: Object.freeze(urlForensicsPipelineRegistryBuildKeyedList(
        trackingParameterDefinitions,
        function selectTrackingParameterKey(definition) {
          return definition && definition.key ? definition.key : "";
        }
      ))
    }),
    classification: Object.freeze({
      hostRules: Object.freeze(urlForensicsPipelineRegistryBuildKeyedList(
        hostRules,
        function selectHostRuleKey(definition) {
          return definition && definition.id ? definition.id : "";
        }
      ))
    }),
    repair: Object.freeze({
      peelTransforms: Object.freeze(urlForensicsPipelineRegistryBuildKeyedList(
        peelTransforms,
        function selectPeelTransformKey(definition) {
          return definition && definition.id ? definition.id : "";
        }
      ))
    })
  });
}

(function attachUrlForensicsPipelinePluginRegistry(globalScope) {
  const registeredPluginPacks = new Map();
  let pluginPackSequence = 0;
  let cachedResolvedConfiguration = null;

  function invalidateResolvedConfigurationCache() {
    cachedResolvedConfiguration = null;
  }

  function rememberPluginPack(pluginPack) {
    const normalizedPluginPack = urlForensicsPipelineRegistryClonePluginPack(pluginPack);

    if (!normalizedPluginPack.id) {
      throw new Error("URL Forensics plugin pack id is required.");
    }

    registeredPluginPacks.set(normalizedPluginPack.id, Object.freeze({
      pluginPack: normalizedPluginPack,
      sequence: pluginPackSequence
    }));
    pluginPackSequence += 1;
    invalidateResolvedConfigurationCache();
    return normalizedPluginPack;
  }

  function listPluginPacks() {
    return Array.from(registeredPluginPacks.values())
      .sort(function comparePluginPackEntry(leftEntry, rightEntry) {
        const priorityDelta = (leftEntry.pluginPack.priority || 0) - (rightEntry.pluginPack.priority || 0);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return leftEntry.sequence - rightEntry.sequence;
      })
      .map(function mapPluginPackEntry(entry) {
        return entry.pluginPack;
      });
  }

  function registerPluginPack(pluginPack) {
    return rememberPluginPack(pluginPack);
  }

  function getResolvedConfig() {
    if (!cachedResolvedConfiguration) {
      cachedResolvedConfiguration = urlForensicsPipelineRegistryMergePluginPacks(listPluginPacks());
    }

    return cachedResolvedConfiguration;
  }

  rememberPluginPack(urlForensicsPipelineDefaultPluginPack);

  if (globalScope && Array.isArray(globalScope.urlForensicsPipelinePluginPacks)) {
    globalScope.urlForensicsPipelinePluginPacks.forEach(function registerPreloadedPluginPack(pluginPack) {
      registerPluginPack(pluginPack);
    });
  }

  const pipelinePluginRegistry = Object.freeze({
    getResolvedConfig: getResolvedConfig,
    listPluginPacks: listPluginPacks,
    registerPluginPack: registerPluginPack
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelinePluginRegistry;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelinePluginRegistry = pipelinePluginRegistry;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
