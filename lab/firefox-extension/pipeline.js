// Function: attach merged link lab pipeline.
(function attachMergedLinkLabPipeline(
  globalScope,
  pipelineBase,
  pipelineUrlResolverFactory,
  pipelineHtmlRewriterFactory,
  pipelineDetectorRegistryFactory,
  pipelineDetectionFactory,
  pipelineResolutionFactory,
  pipelineAssemblyFactory,
  pipelineDiagnosticsFactory,
  pipelineStageRunnerFactory,
  createPipelineApi
) {
  "use strict";

  const pipelineApi = createPipelineApi(
    globalScope,
    pipelineBase,
    pipelineUrlResolverFactory,
    pipelineHtmlRewriterFactory,
    pipelineDetectorRegistryFactory,
    pipelineDetectionFactory,
    pipelineResolutionFactory,
    pipelineAssemblyFactory,
    pipelineDiagnosticsFactory,
    pipelineStageRunnerFactory
  );

  // Branch: follow this path only when the current condition passes.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineApi;
  }

  // Branch: follow this path only when the current condition passes.
  if (globalScope) {
    globalScope.MergedLinkLabPipeline = pipelineApi;
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  // Function: resolve shared pipeline base helpers.
  (function resolveMergedLinkLabPipelineBase(globalScope) {
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
  // Function: resolve shared pipeline URL resolver helpers.
  (function resolveMergedLinkLabPipelineUrlResolver(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineUrlResolver) {
      return globalScope.urlForensicsPipelineUrlResolver;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-url-resolver.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline HTML rewriter helpers.
  (function resolveMergedLinkLabPipelineHtmlRewriter(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineHtmlRewriter) {
      return globalScope.urlForensicsPipelineHtmlRewriter;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-html-rewriter.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline detector registry.
  (function resolveMergedLinkLabPipelineDetectorRegistry(globalScope) {
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
  // Function: resolve shared pipeline detection helpers.
  (function resolveMergedLinkLabPipelineDetection(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineDetection) {
      return globalScope.urlForensicsPipelineDetection;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-detection.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline resolution helpers.
  (function resolveMergedLinkLabPipelineResolution(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineResolution) {
      return globalScope.urlForensicsPipelineResolution;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-resolution.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline assembly helpers.
  (function resolveMergedLinkLabPipelineAssembly(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineAssembly) {
      return globalScope.urlForensicsPipelineAssembly;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-assembly.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline diagnostics helpers.
  (function resolveMergedLinkLabPipelineDiagnostics(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineDiagnostics) {
      return globalScope.urlForensicsPipelineDiagnostics;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-diagnostics.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: resolve shared pipeline stage runner helpers.
  (function resolveMergedLinkLabPipelineStageRunner(globalScope) {
    if (globalScope && globalScope.urlForensicsPipelineStageRunner) {
      return globalScope.urlForensicsPipelineStageRunner;
    }

    if (typeof require === "function") {
      try {
        return require("./pipeline-stage-runner.js");
      } catch {
        return null;
      }
    }

    return null;
  }(typeof globalThis !== "undefined" ? globalThis : this)),
  // Function: create merged link lab pipeline api.
  // eslint-disable-next-line max-lines-per-function -- Compatibility wrapper while pipeline helper groups move into focused modules.
  function createMergedLinkLabPipelineApi(
    globalScope,
    pipelineBase,
    pipelineUrlResolverFactory,
    pipelineHtmlRewriterFactory,
    pipelineDetectorRegistryFactory,
    pipelineDetectionFactory,
    pipelineResolutionFactory,
    pipelineAssemblyFactory,
    pipelineDiagnosticsFactory,
    pipelineStageRunnerFactory
  ) {
    "use strict";

    const debugApi = globalScope && globalScope.mergedLinkLabDebug ? globalScope.mergedLinkLabDebug : null;
    if (debugApi && typeof debugApi.configure === "function") {
      debugApi.configure({ context: "pipeline", module: "pipeline" });
    }

    if (!pipelineBase || !pipelineBase.regularExpressions) {
      throw new Error("URL Forensics pipeline base helpers are unavailable.");
    }

    if (!pipelineUrlResolverFactory || typeof pipelineUrlResolverFactory.create !== "function") {
      throw new Error("URL Forensics pipeline URL resolver helpers are unavailable.");
    }

    if (!pipelineHtmlRewriterFactory || typeof pipelineHtmlRewriterFactory.create !== "function") {
      throw new Error("URL Forensics pipeline HTML rewriter helpers are unavailable.");
    }

    if (!pipelineDetectorRegistryFactory || typeof pipelineDetectorRegistryFactory.create !== "function") {
      throw new Error("URL Forensics pipeline detector registry is unavailable.");
    }

    if (!pipelineDetectionFactory || typeof pipelineDetectionFactory.create !== "function") {
      throw new Error("URL Forensics pipeline detection helpers are unavailable.");
    }

    if (!pipelineResolutionFactory || typeof pipelineResolutionFactory.create !== "function") {
      throw new Error("URL Forensics pipeline resolution helpers are unavailable.");
    }

    if (!pipelineAssemblyFactory || typeof pipelineAssemblyFactory.create !== "function") {
      throw new Error("URL Forensics pipeline assembly helpers are unavailable.");
    }

    if (!pipelineDiagnosticsFactory || typeof pipelineDiagnosticsFactory.create !== "function") {
      throw new Error("URL Forensics pipeline diagnostics helpers are unavailable.");
    }

    if (!pipelineStageRunnerFactory || typeof pipelineStageRunnerFactory.create !== "function") {
      throw new Error("URL Forensics pipeline stage runner is unavailable.");
    }

    const defaultPipelineSettings = pipelineBase.defaultPipelineSettings;
    const convertValueToString = pipelineBase.convertValueToString;
    const resolvePipelineSettings = pipelineBase.resolvePipelineSettings;
    const escapeHtml = pipelineBase.escapeHtml;
    const cleanInputText = pipelineBase.cleanInputText;
    const normalizeLine = pipelineBase.normalizeLine;
    const validateTitle = pipelineBase.validateTitle;
    const normalizeTitle = pipelineBase.normalizeTitle;
    const createDetectedUrlRecord = pipelineBase.createDetectedUrlRecord;
    const trackingParameterModel = pipelineBase.trackingParameterModel || null;
    const urlResolver = pipelineUrlResolverFactory.create(pipelineBase);
    const peel = urlResolver.peel;
    const decodeValue = urlResolver.decodeValue;
    const decodeRepeated = urlResolver.decodeRepeated;
    const extractFirstAbsoluteUrl = urlResolver.extractFirstAbsoluteUrl;
    const firstUrlCandidate = urlResolver.firstUrlCandidate;
    const isLikelyTrackerHost = urlResolver.isLikelyTrackerHost;
    const extractTrackingCandidates = urlResolver.extractTrackingCandidates;
    const extractTracking = urlResolver.extractTracking;
    const splitMerged = urlResolver.splitMerged;
    const stripKnownTrackingParameters = urlResolver.stripKnownTrackingParameters;
    const resolveURL = urlResolver.resolveURL;
    const resolveURLMinimalRecursive = urlResolver.resolveURLMinimalRecursive;
    const isValidURL = urlResolver.isValidURL;
    const extractHost = urlResolver.extractHost;
    const extractBaseUrl = urlResolver.extractBaseUrl;
    const extractOriginUrl = urlResolver.extractOriginUrl;
    const extractKnownTrackingParameterNames = urlResolver.extractKnownTrackingParameterNames;
    const buildFinalUrlDisplayName = urlResolver.buildFinalUrlDisplayName;
    const buildFinalUrlLinkText = urlResolver.buildFinalUrlLinkText;
    const buildFinalUrlEntry = urlResolver.buildFinalUrlEntry;
    const classify = urlResolver.classify;
    const classifyUrlValue = urlResolver.classifyUrlValue;
    const detectorRegistry = pipelineDetectorRegistryFactory.create({
      pipelineBase: pipelineBase
    });
    const pipelineDetection = pipelineDetectionFactory.create({
      globalScope: globalScope,
      debugApi: debugApi,
      pipelineBase: pipelineBase,
      detectorRegistry: detectorRegistry
    });
    const pipelineAssembly = pipelineAssemblyFactory.create({
      pipelineBase: pipelineBase,
      urlResolver: urlResolver
    });
    const pipelineResolution = pipelineResolutionFactory.create({
      debugApi: debugApi,
      pipelineBase: pipelineBase,
      urlResolver: urlResolver,
      pipelineAssembly: pipelineAssembly
    });
    const pipelineDiagnostics = pipelineDiagnosticsFactory.create({
      pipelineBase: pipelineBase,
      detectorRegistry: detectorRegistry,
      trackingParameterModel: trackingParameterModel
    });
    const locateLineForOriginal = pipelineAssembly.locateLineForOriginal;
    const findNearbyTitle = pipelineAssembly.findNearbyTitle;
    const getItemFinalUrls = pipelineAssembly.getItemFinalUrls;
    const buildStandaloneFinalUrls = pipelineAssembly.buildStandaloneFinalUrls;
    const buildDigestEntries = pipelineAssembly.buildDigestEntries;
    const buildChangedUrls = pipelineAssembly.buildChangedUrls;
    const getItemTrackerCleanupEntries = pipelineAssembly.getItemTrackerCleanupEntries;
    const didItemStripTrackingParameters = pipelineAssembly.didItemStripTrackingParameters;
    const getPreferredReplacementUrl = pipelineAssembly.getPreferredReplacementUrl;
    const getItemDisplayType = pipelineAssembly.getItemDisplayType;
    const buildFinalUrlEntries = pipelineAssembly.buildFinalUrlEntries;
    const buildDiagnostics = pipelineDiagnostics.buildDiagnostics;
    const detectURLs = pipelineDetection.detectURLs;
    const detectUrlsFromHtml = pipelineDetection.detectUrlsFromHtml;
    const populateBypassedDataForItems = pipelineResolution.populateBypassedDataForItems;
    const populateResolvedDataForItems = pipelineResolution.populateResolvedDataForItems;
    const collectDetectedUrlTokenMatches = function collectDetectedUrlTokenMatches(textToScan, options) {
      return detectorRegistry.detectText(textToScan, options);
    };
    const htmlRewriter = pipelineHtmlRewriterFactory.create({
      pipelineBase: pipelineBase,
      urlResolver: urlResolver,
      globalScope: globalScope,
      analyzeInput: analyzeInput,
      detectTokenMatches: collectDetectedUrlTokenMatches,
      getPreferredReplacementUrl: getPreferredReplacementUrl,
      getItemDisplayType: getItemDisplayType
    });
    const normalizeTextValue = htmlRewriter.normalizeTextValue;
    const rewriteHtml = htmlRewriter.rewriteHtml;
    const rewriteHtmlForStandalonePreview = htmlRewriter.rewriteHtmlForStandalonePreview;
    const htmlToText = htmlRewriter.htmlToText;
    const stageRunner = pipelineStageRunnerFactory.create({
      debugApi: debugApi
    });

    // Function: choose rewritten markup result for mirror/page replacement.
    function chooseRewrittenMarkupResult(sourceMarkup, detectedItems, changedUrls, pipelineSettings) {
      const rewrittenMarkupResult = rewriteHtml(sourceMarkup, detectedItems, pipelineSettings);

      if (rewrittenMarkupResult.count || !changedUrls.length) {
        return rewrittenMarkupResult;
      }

      const standalonePreviewResult = rewriteHtmlForStandalonePreview(sourceMarkup, detectedItems, pipelineSettings);

      return standalonePreviewResult.count ? standalonePreviewResult : rewrittenMarkupResult;
    }

    // Function: analyze input.
    function analyzeInput(input) {
      if (debugApi) {
        debugApi.functionIn("pipeline.analyzeInput");
      }

      const payload = input || {};
      const normalizedRawText = cleanInputText(payload.rawText || payload.text || "");
      const sourceMarkup = convertValueToString(payload.sourceHtml || payload.html || "");
      const pipelineSettings = resolvePipelineSettings(payload.options || payload.settings);
      const executionState = {
        normalizedRawText: normalizedRawText,
        sourceMarkup: sourceMarkup,
        pipelineSettings: pipelineSettings,
        pipelineErrors: [],
        detectedItems: [],
        finalUrls: [],
        changedUrls: [],
        digestEntries: [],
        rewrittenMarkupResult: {
          html: sourceMarkup || normalizedRawText,
          count: 0
        },
        rewrittenText: "",
        diagnostics: null
      };

      if (debugApi) {
        debugApi.variable("pipeline analyze input summary assigned", {
          rawTextLength: normalizedRawText.length,
          sourceMarkupLength: sourceMarkup.length,
          hasSourceMarkup: !!sourceMarkup,
          enableUrlNormalizationRepair: pipelineSettings.enableUrlNormalizationRepair,
          stripKnownTrackingParameters: pipelineSettings.stripKnownTrackingParameters
        });
      }

      stageRunner.runStages(executionState, [
        {
          id: "detect",
          errorLabel: "stageDetect",
          run: function runDetectStage(stageState) {
            stageState.detectedItems = stageState.sourceMarkup
              ? detectUrlsFromHtml(stageState.sourceMarkup, stageState.pipelineSettings)
              : detectURLs(stageState.normalizedRawText, stageState.pipelineSettings);
            return stageState;
          }
        },
        {
          id: "resolve",
          errorLabel: "stageResolve",
          run: function runResolveStage(stageState) {
            populateResolvedDataForItems(stageState.detectedItems, stageState.pipelineSettings);
            return stageState;
          }
        },
        {
          id: "assemble",
          errorLabel: "stageAssemble",
          run: function runAssembleStage(stageState) {
            stageState.finalUrls = stageState.detectedItems
              .map(function mapItemToReplacementUrl(item) {
                return convertValueToString(item.replacementUrl).trim();
              })
              .filter(Boolean);
            stageState.changedUrls = buildChangedUrls(stageState.detectedItems);
            stageState.digestEntries = buildDigestEntries(stageState.normalizedRawText, stageState.detectedItems, { useReplacementUrlOnly: true });
            stageState.rewrittenMarkupResult = chooseRewrittenMarkupResult(
              stageState.sourceMarkup || stageState.normalizedRawText,
              stageState.detectedItems,
              stageState.changedUrls,
              stageState.pipelineSettings
            );
            stageState.rewrittenText = htmlToText(stageState.rewrittenMarkupResult.html);
            stageState.diagnostics = buildDiagnostics(
              stageState.detectedItems,
              stageState.finalUrls,
              stageState.digestEntries,
              stageState.pipelineErrors,
              stageState.normalizedRawText,
              stageState.pipelineSettings
            );
            return stageState;
          }
        }
      ]);

      if (debugApi) {
        debugApi.pipeline("pipeline analysis complete", {
          detectedItemCount: executionState.detectedItems.length,
          finalUrlCount: executionState.finalUrls.length,
          changedUrlCount: executionState.changedUrls.length,
          digestEntryCount: executionState.digestEntries.length,
          rewrittenCount: executionState.rewrittenMarkupResult.count,
          errorCount: executionState.pipelineErrors.length
        });
        debugApi.functionOut("pipeline.analyzeInput", {
          detectedItemCount: executionState.detectedItems.length,
          errorCount: executionState.pipelineErrors.length
        });
      }

      return {
        rawText: normalizedRawText,
        sourceHtml: sourceMarkup,
        options: pipelineSettings,
        items: executionState.detectedItems,
        finalUrls: executionState.finalUrls,
        changedUrls: executionState.changedUrls,
        digestEntries: executionState.digestEntries,
        rewrittenHtml: executionState.rewrittenMarkupResult.html,
        rewrittenText: executionState.rewrittenText,
        rewrittenCount: executionState.rewrittenMarkupResult.count,
        diagnostics: executionState.diagnostics,
        errors: executionState.pipelineErrors
      };
    }

    return {
      analyzeInput: analyzeInput,
      buildChangedUrls: buildChangedUrls,
      buildDiagnostics: buildDiagnostics,
      buildDigestEntries: buildDigestEntries,
      buildFinalUrlEntries: buildFinalUrlEntries,
      buildFinalUrlLinkText: buildFinalUrlLinkText,
      buildStandaloneFinalUrls: buildStandaloneFinalUrls,
      cleanInputText: cleanInputText,
      classify: classify,
      classifyUrlValue: classifyUrlValue,
      defaultPipelineSettings: defaultPipelineSettings,
      detectorRegistry: detectorRegistry,
      decodeRepeated: decodeRepeated,
      decodeValue: decodeValue,
      detectURLs: detectURLs,
      detectUrlsFromHtml: detectUrlsFromHtml,
      escapeHtml: escapeHtml,
      extractBaseUrl: extractBaseUrl,
      extractFirstAbsoluteUrl: extractFirstAbsoluteUrl,
      extractHost: extractHost,
      extractOriginUrl: extractOriginUrl,
      buildFinalUrlDisplayName: buildFinalUrlDisplayName,
      buildFinalUrlEntry: buildFinalUrlEntry,
      extractKnownTrackingParameterNames: extractKnownTrackingParameterNames,
      extractTracking: extractTracking,
      extractTrackingCandidates: extractTrackingCandidates,
      findNearbyTitle: findNearbyTitle,
      firstUrlCandidate: firstUrlCandidate,
      getItemFinalUrls: getItemFinalUrls,
      getItemDisplayType: getItemDisplayType,
      getPreferredReplacementUrl: getPreferredReplacementUrl,
      htmlToText: htmlToText,
      isLikelyTrackerHost: isLikelyTrackerHost,
      isValidURL: isValidURL,
      listDetectors: detectorRegistry.listDetectors,
      locateLineForOriginal: locateLineForOriginal,
      normalizeLine: normalizeLine,
      normalizeTextValue: normalizeTextValue,
      normalizeTitle: normalizeTitle,
      peel: peel,
      populateBypassedDataForItems: populateBypassedDataForItems,
      populateResolvedDataForItems: populateResolvedDataForItems,
      resolvePipelineSettings: resolvePipelineSettings,
      resolveURL: resolveURL,
      resolveURLMinimalRecursive: resolveURLMinimalRecursive,
      rewriteHtml: rewriteHtml,
      rewriteHtmlForStandalonePreview: rewriteHtmlForStandalonePreview,
      stageRunner: stageRunner,
      splitMerged: splitMerged,
      stripKnownTrackingParameters: stripKnownTrackingParameters,
      validateTitle: validateTitle
    };
  }
);
