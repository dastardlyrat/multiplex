"use strict";

function urlForensicsContentWorkflowAccessorsResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsContentWorkflowAccessorsCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    storageModel: optionBag.storageModel && typeof optionBag.storageModel === "object" ? optionBag.storageModel : null,
    extensionSettings: optionBag.extensionSettings && typeof optionBag.extensionSettings === "object"
      ? optionBag.extensionSettings
      : {},
    getWorkflowEmailCandidateDiscovery: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getWorkflowEmailCandidateDiscovery,
      function getMissingWorkflowEmailCandidateDiscovery() {
        return null;
      }
    ),
    getWorkflowContentSettingsStorage: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getWorkflowContentSettingsStorage,
      function getMissingWorkflowContentSettingsStorage() {
        return null;
      }
    ),
    getWorkflowEmailAutoReplaceState: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getWorkflowEmailAutoReplaceState,
      function getMissingWorkflowEmailAutoReplaceState() {
        return null;
      }
    ),
    getWorkflowEmailAutoReplace: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getWorkflowEmailAutoReplace,
      function getMissingWorkflowEmailAutoReplace() {
        return null;
      }
    ),
    getWorkflowEmailRootSummary: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getWorkflowEmailRootSummary,
      function getMissingWorkflowEmailRootSummary() {
        return null;
      }
    ),
    getWorkflowEmailRootRuntime: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getWorkflowEmailRootRuntime,
      function getMissingWorkflowEmailRootRuntime() {
        return null;
      }
    ),
    getNow: urlForensicsContentWorkflowAccessorsResolveFunction(
      optionBag.getNow,
      function getDefaultNow() {
        return Date.now();
      }
    )
  });
}

function urlForensicsContentWorkflowAccessorsCall(getWorkflow, methodName, args, fallbackValue) {
  const workflow = getWorkflow();

  if (workflow && typeof workflow[methodName] === "function") {
    return workflow[methodName].apply(workflow, args);
  }

  return typeof fallbackValue === "function" ? fallbackValue.apply(null, args) : fallbackValue;
}

function urlForensicsContentWorkflowAccessorsGetTrackingParameterFilters(options) {
  const rawTrackingParameterFilters = options.extensionSettings.trackingParameterFilters;

  if (options.storageModel && typeof options.storageModel.normalizeTrackingParameterFilters === "function") {
    return options.storageModel.normalizeTrackingParameterFilters(rawTrackingParameterFilters);
  }

  return Array.isArray(rawTrackingParameterFilters)
    ? rawTrackingParameterFilters.slice()
    : rawTrackingParameterFilters;
}

function urlForensicsContentWorkflowAccessorsGetPipelineSettings(options) {
  return {
    enableUrlNormalizationRepair: !!options.extensionSettings.enableUrlNormalizationRepair,
    stripKnownTrackingParameters: !!options.extensionSettings.stripKnownTrackingParameters,
    trackingParameterFilters: urlForensicsContentWorkflowAccessorsGetTrackingParameterFilters(options)
  };
}

function urlForensicsContentWorkflowAccessorsBuildMissingMeasureElementText() {
  return {
    text: "",
    lines: 0,
    words: 0
  };
}

function urlForensicsContentWorkflowAccessorsBuildMissingSummary(detectionMode, options) {
  return {
    detectedAt: options.getNow(),
    detectionMode: detectionMode || "",
    sectionLabel: "",
    sourceHtml: "",
    rawText: "",
    pipelineSettings: {},
    pipeline: {
      finalUrls: [],
      digestEntries: [],
      errors: []
    },
    isTopicDigest: false
  };
}

function urlForensicsContentWorkflowAccessorsBuildCandidateAccessors(options) {
  return {
    getCandidateMissingGraceWindow: function getCandidateMissingGraceWindow() {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailCandidateDiscovery,
        "getCandidateMissingGraceWindow",
        arguments,
        0
      );
    },
    getInboxRootCandidates: function getInboxRootCandidates() {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailCandidateDiscovery,
        "getInboxRootCandidates",
        arguments,
        []
      );
    },
    choosePrimaryEmailCandidate: function choosePrimaryEmailCandidate(candidates) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailCandidateDiscovery,
        "choosePrimaryEmailCandidate",
        arguments,
        function chooseMissingPrimaryEmailCandidate(nextCandidates) {
          return Array.isArray(nextCandidates) && nextCandidates.length ? nextCandidates[0] : null;
        }
      );
    },
    choosePrimaryInboxRoot: function choosePrimaryInboxRoot(candidates) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailCandidateDiscovery,
        "choosePrimaryInboxRoot",
        arguments,
        function chooseMissingPrimaryInboxRoot(nextCandidates) {
          const primaryCandidate = Array.isArray(nextCandidates) && nextCandidates.length ? nextCandidates[0] : null;
          return primaryCandidate && primaryCandidate.root ? primaryCandidate.root : null;
        }
      );
    },
    getInboxDetectionFailure: function getInboxDetectionFailure(candidates) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailCandidateDiscovery,
        "getInboxDetectionFailure",
        arguments,
        null
      );
    }
  };
}

function urlForensicsContentWorkflowAccessorsBuildPipelineAccessors(options) {
  return {
    getPipelineSettings: function getPipelineSettings() {
      return urlForensicsContentWorkflowAccessorsGetPipelineSettings(options);
    },
    refreshAutoApplyConfiguredSenderDetectionState: function refreshAutoApplyConfiguredSenderDetectionState() {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplaceState,
        "refreshConfiguredSenderDetectionState",
        arguments
      );
    },
    setExtensionStorageSnapshot: function setExtensionStorageSnapshot(source, storedSettings, errorMessage) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "setExtensionStorageSnapshot",
        arguments
      );
    },
    applyStoredPipelineSetting: function applyStoredPipelineSetting(nextValue) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "applyStoredPipelineSetting",
        arguments
      );
    },
    applyStoredTrackingParameterStripSetting: function applyStoredTrackingParameterStripSetting(nextValue) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "applyStoredTrackingParameterStripSetting",
        arguments
      );
    },
    applyStoredTrackingParameterFiltersSetting: function applyStoredTrackingParameterFiltersSetting(nextValue) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "applyStoredTrackingParameterFiltersSetting",
        arguments
      );
    },
    applyStoredReplaceEmailBodySetting: function applyStoredReplaceEmailBodySetting(nextValue) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "applyStoredReplaceEmailBodySetting",
        arguments
      );
    },
    applyStoredAutoApplyMirrorForConfiguredSendersSetting: function applyStoredAutoApplyMirrorForConfiguredSendersSetting(
      nextValue
    ) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplaceState,
        "applyStoredAutoApplyMirrorForConfiguredSendersSetting",
        arguments
      );
    },
    applyStoredAutoApplyMirrorSenderEmailList: function applyStoredAutoApplyMirrorSenderEmailList(nextValue, applyOptions) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplaceState,
        "applyStoredAutoApplyMirrorSenderEmailList",
        arguments
      );
    },
    loadPipelineSettings: async function loadPipelineSettings() {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "loadPipelineSettings",
        arguments,
        function loadMissingPipelineSettings() {
          return urlForensicsContentWorkflowAccessorsGetPipelineSettings(options);
        }
      );
    },
    handlePipelineStorageChange: function handlePipelineStorageChange(changes, areaName) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowContentSettingsStorage,
        "handlePipelineStorageChange",
        arguments,
        false
      );
    }
  };
}

function urlForensicsContentWorkflowAccessorsBuildAutoReplaceAccessors(options) {
  return {
    hasConfiguredSenderText: function hasConfiguredSenderText(value) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplace,
        "hasConfiguredSenderText",
        arguments,
        false
      );
    },
    hasConfiguredSenderElement: function hasConfiguredSenderElement() {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplace,
        "hasConfiguredSenderElement",
        arguments,
        false
      );
    },
    isConfiguredSenderDetected: function isConfiguredSenderDetected(snapshot) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplace,
        "isConfiguredSenderDetected",
        arguments,
        false
      );
    },
    hasNativeEmailExpansionControl: function hasNativeEmailExpansionControl(root) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplace,
        "hasNativeEmailExpansionControl",
        arguments,
        false
      );
    },
    shouldAutoReplaceEmailBodyWithMirrorContent: function shouldAutoReplaceEmailBodyWithMirrorContent(snapshot) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplace,
        "shouldAutoReplaceEmailBodyWithMirrorContent",
        arguments,
        false
      );
    },
    shouldReplaceEmailBodyWithMirrorContent: function shouldReplaceEmailBodyWithMirrorContent(snapshot) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailAutoReplace,
        "shouldReplaceEmailBodyWithMirrorContent",
        arguments,
        false
      );
    }
  };
}

function urlForensicsContentWorkflowAccessorsBuildSummaryAccessors(options) {
  return {
    getIframeEmailRootContentElement: function getIframeEmailRootContentElement(iframeElement) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootSummary,
        "getIframeEmailRootContentElement",
        arguments,
        null
      );
    },
    getEmailRootContentElement: function getEmailRootContentElement(element) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootSummary,
        "getEmailRootContentElement",
        arguments,
        function getMissingEmailRootContentElement(nextElement) {
          return nextElement || null;
        }
      );
    },
    getEmailRootHtmlMarkup: function getEmailRootHtmlMarkup(element) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootSummary,
        "getEmailRootHtmlMarkup",
        arguments,
        ""
      );
    },
    measureElementText: function measureElementText(element) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootSummary,
        "measureElementText",
        arguments,
        urlForensicsContentWorkflowAccessorsBuildMissingMeasureElementText
      );
    },
    summarizeEmailRoot: function summarizeEmailRoot(root, detectionMode) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootSummary,
        "summarizeEmailRoot",
        arguments,
        function summarizeMissingEmailRoot(ignoredRoot, nextDetectionMode) {
          return urlForensicsContentWorkflowAccessorsBuildMissingSummary(nextDetectionMode, options);
        }
      );
    }
  };
}

function urlForensicsContentWorkflowAccessorsBuildRuntimeAccessors(options) {
  return {
    applyRewriteToEmailBody: async function applyRewriteToEmailBody() {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootRuntime,
        "applyRewriteToEmailBody",
        arguments,
        function applyMissingRewriteToEmailBody() {
          return { ok: false, applied: false };
        }
      );
    },
    getActiveEmailRoot: function getActiveEmailRoot() {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootRuntime,
        "getActiveEmailRoot",
        arguments,
        null
      );
    },
    maybeReplaceEmailBodyWithMirrorContent: async function maybeReplaceEmailBodyWithMirrorContent(snapshot) {
      return urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootRuntime,
        "maybeReplaceEmailBodyWithMirrorContent",
        arguments,
        function maybeReplaceMissingEmailBodyWithMirrorContent(nextSnapshot) {
          return { ok: false, applied: false, snapshot: nextSnapshot || null };
        }
      );
    },
    observeEmailRoot: function observeEmailRoot(root) {
      urlForensicsContentWorkflowAccessorsCall(
        options.getWorkflowEmailRootRuntime,
        "observeEmailRoot",
        arguments
      );
    }
  };
}

function urlForensicsContentWorkflowAccessorsCreate(options) {
  const resolvedOptions = urlForensicsContentWorkflowAccessorsCreateDefaultOptions(options);

  return Object.freeze(Object.assign(
    {},
    urlForensicsContentWorkflowAccessorsBuildCandidateAccessors(resolvedOptions),
    urlForensicsContentWorkflowAccessorsBuildPipelineAccessors(resolvedOptions),
    urlForensicsContentWorkflowAccessorsBuildAutoReplaceAccessors(resolvedOptions),
    urlForensicsContentWorkflowAccessorsBuildSummaryAccessors(resolvedOptions),
    urlForensicsContentWorkflowAccessorsBuildRuntimeAccessors(resolvedOptions)
  ));
}

(function attachUrlForensicsContentWorkflowAccessors(globalScope) {
  const contentWorkflowAccessors = Object.freeze({
    create: urlForensicsContentWorkflowAccessorsCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentWorkflowAccessors;
  }

  if (globalScope) {
    globalScope.urlForensicsContentWorkflowAccessors = contentWorkflowAccessors;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
