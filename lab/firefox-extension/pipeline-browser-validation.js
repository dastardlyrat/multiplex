"use strict";

function urlForensicsPipelineBrowserValidationArrayEquals(leftValue, rightValue) {
  return JSON.stringify(leftValue) === JSON.stringify(rightValue);
}

const urlForensicsPipelineBrowserValidationScenarioDefinitions = Object.freeze([
  Object.freeze({
    id: "protected-markup-isolation",
    title: "Browser DOM parsing skips protected markup text while fallback parsing cannot",
    html: [
      "<div>",
      "<a href=\"https://example.com/anchor?utm_source=browser\">Anchor</a>",
      "<p>Visible https://example.com/text?utm_source=browser</p>",
      "<script>https://example.com/script?utm_source=browser</script>",
      "<style>https://example.com/style?utm_source=browser</style>",
      "</div>"
    ].join(""),
    expectedDomOriginals: Object.freeze([
      "https://example.com/anchor?utm_source=browser",
      "https://example.com/text?utm_source=browser"
    ]),
    expectedFallbackOriginals: Object.freeze([
      "https://example.com/anchor?utm_source=browser",
      "https://example.com/text?utm_source=browser",
      "https://example.com/script?utm_source=browser",
      "https://example.com/style?utm_source=browser"
    ]),
    expectedDomDetectorIds: Object.freeze([
      "regex,tokenizer",
      "regex,tokenizer"
    ]),
    expectedFallbackDetectorIds: Object.freeze([
      "regex,tokenizer",
      "regex,tokenizer",
      "regex,tokenizer",
      "regex,tokenizer"
    ]),
    expectDomDistinctFromFallback: true
  }),
  Object.freeze({
    id: "mailto-and-visible-text",
    title: "Browser DOM parsing preserves ordinary anchor href and visible text detection",
    html: [
      "<div>",
      "<a href=\"mailto:debugger@example.com\">Contact support</a>",
      "<p>Reply to support@example.com or visit https://example.com/visible?utm_source=browser</p>",
      "</div>"
    ].join(""),
    expectedDomOriginals: Object.freeze([
      "mailto:debugger@example.com",
      "support@example.com",
      "https://example.com/visible?utm_source=browser"
    ]),
    expectedFallbackOriginals: Object.freeze([
      "mailto:debugger@example.com",
      "support@example.com",
      "https://example.com/visible?utm_source=browser"
    ]),
    expectedDomDetectorIds: Object.freeze([
      "regex,tokenizer",
      "regex,tokenizer",
      "regex,tokenizer"
    ]),
    expectedFallbackDetectorIds: Object.freeze([
      "regex,tokenizer",
      "regex,tokenizer",
      "regex,tokenizer"
    ]),
    expectDomDistinctFromFallback: false
  })
]);

function urlForensicsPipelineBrowserValidationCreateContext(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const pipelineDetection = optionBag.pipelineDetection || null;
  const pipelineDetectorRegistry = optionBag.pipelineDetectorRegistry || null;
  const globalScope = optionBag.globalScope || null;

  if (!pipelineBase || typeof pipelineBase.convertValueToString !== "function") {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  if (!pipelineDetection || typeof pipelineDetection.create !== "function") {
    throw new Error("URL Forensics pipeline detection helpers are unavailable.");
  }

  if (!pipelineDetectorRegistry || typeof pipelineDetectorRegistry.create !== "function") {
    throw new Error("URL Forensics pipeline detector registry is unavailable.");
  }

  const detectorRegistry = pipelineDetectorRegistry.create({
    pipelineBase: pipelineBase
  });

  return Object.freeze({
    globalScope: globalScope,
    domDetection: pipelineDetection.create({
      globalScope: globalScope,
      pipelineBase: pipelineBase,
      detectorRegistry: detectorRegistry,
      debugApi: null
    }),
    fallbackDetection: pipelineDetection.create({
      globalScope: null,
      pipelineBase: pipelineBase,
      detectorRegistry: detectorRegistry,
      debugApi: null
    })
  });
}

function urlForensicsPipelineBrowserValidationMapOriginals(items) {
  return items.map(function mapOriginal(item) {
    return item.original;
  });
}

function urlForensicsPipelineBrowserValidationMapDetectorIds(items) {
  return items.map(function mapDetectorIds(item) {
    return Array.isArray(item.detectorIds) ? item.detectorIds.join(",") : "";
  });
}

function urlForensicsPipelineBrowserValidationRunScenario(validationContext, scenarioDefinition) {
  const domItems = validationContext.domDetection.detectUrlsFromHtml(scenarioDefinition.html, {});
  const fallbackItems = validationContext.fallbackDetection.detectUrlsFromHtml(scenarioDefinition.html, {});
  const actual = {
    id: scenarioDefinition.id,
    title: scenarioDefinition.title,
    domOriginals: urlForensicsPipelineBrowserValidationMapOriginals(domItems),
    fallbackOriginals: urlForensicsPipelineBrowserValidationMapOriginals(fallbackItems),
    domDetectorIds: urlForensicsPipelineBrowserValidationMapDetectorIds(domItems),
    fallbackDetectorIds: urlForensicsPipelineBrowserValidationMapDetectorIds(fallbackItems)
  };
  const failures = [];

  if (!urlForensicsPipelineBrowserValidationArrayEquals(actual.domOriginals, scenarioDefinition.expectedDomOriginals)) {
    failures.push(
      "Expected browser DOM originals " +
      JSON.stringify(scenarioDefinition.expectedDomOriginals) +
      " but received " +
      JSON.stringify(actual.domOriginals) +
      " for scenario " +
      JSON.stringify(scenarioDefinition.id) +
      "."
    );
  }

  if (!urlForensicsPipelineBrowserValidationArrayEquals(actual.fallbackOriginals, scenarioDefinition.expectedFallbackOriginals)) {
    failures.push(
      "Expected fallback originals " +
      JSON.stringify(scenarioDefinition.expectedFallbackOriginals) +
      " but received " +
      JSON.stringify(actual.fallbackOriginals) +
      " for scenario " +
      JSON.stringify(scenarioDefinition.id) +
      "."
    );
  }

  if (!urlForensicsPipelineBrowserValidationArrayEquals(actual.domDetectorIds, scenarioDefinition.expectedDomDetectorIds)) {
    failures.push(
      "Expected browser DOM detector ids " +
      JSON.stringify(scenarioDefinition.expectedDomDetectorIds) +
      " but received " +
      JSON.stringify(actual.domDetectorIds) +
      " for scenario " +
      JSON.stringify(scenarioDefinition.id) +
      "."
    );
  }

  if (!urlForensicsPipelineBrowserValidationArrayEquals(actual.fallbackDetectorIds, scenarioDefinition.expectedFallbackDetectorIds)) {
    failures.push(
      "Expected fallback detector ids " +
      JSON.stringify(scenarioDefinition.expectedFallbackDetectorIds) +
      " but received " +
      JSON.stringify(actual.fallbackDetectorIds) +
      " for scenario " +
      JSON.stringify(scenarioDefinition.id) +
      "."
    );
  }

  if (
    scenarioDefinition.expectDomDistinctFromFallback &&
    urlForensicsPipelineBrowserValidationArrayEquals(actual.domOriginals, actual.fallbackOriginals)
  ) {
    failures.push(
      "Expected browser DOM parsing to stay distinct from fallback parsing for scenario " +
      JSON.stringify(scenarioDefinition.id) +
      "."
    );
  }

  return {
    id: scenarioDefinition.id,
    title: scenarioDefinition.title,
    status: failures.length ? "failed" : "passed",
    actual: actual,
    failures: failures
  };
}

function urlForensicsPipelineBrowserValidationBuildReport(validationContext) {
  const scenarioReports = urlForensicsPipelineBrowserValidationScenarioDefinitions.map(function mapScenarioDefinition(scenarioDefinition) {
    return urlForensicsPipelineBrowserValidationRunScenario(validationContext, scenarioDefinition);
  });
  const failures = [];

  if (!validationContext.globalScope || typeof validationContext.globalScope.DOMParser !== "function") {
    failures.push("Expected browser-path validation to receive a DOMParser-enabled browser global scope.");
  }

  scenarioReports.forEach(function collectScenarioFailures(scenarioReport) {
    if (scenarioReport.failures.length) {
      failures.push.apply(failures, scenarioReport.failures);
    }
  });

  return {
    expected: {
      scenarioIds: urlForensicsPipelineBrowserValidationScenarioDefinitions.map(function mapScenarioDefinition(scenarioDefinition) {
        return scenarioDefinition.id;
      }),
      failedScenarioIds: []
    },
    actual: {
      hasDomParser: !!(validationContext.globalScope && typeof validationContext.globalScope.DOMParser === "function"),
      scenarios: scenarioReports
    },
    failures: failures
  };
}

function urlForensicsPipelineBrowserValidationCreate(options) {
  const validationContext = urlForensicsPipelineBrowserValidationCreateContext(options);

  return Object.freeze({
    listScenarios: function listScenarios() {
      return urlForensicsPipelineBrowserValidationScenarioDefinitions.slice();
    },
    buildReport: function buildReport() {
      return urlForensicsPipelineBrowserValidationBuildReport(validationContext);
    }
  });
}

(function attachUrlForensicsPipelineBrowserValidation(globalScope) {
  const pipelineBrowserValidation = Object.freeze({
    create: urlForensicsPipelineBrowserValidationCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineBrowserValidation;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineBrowserValidation = pipelineBrowserValidation;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
