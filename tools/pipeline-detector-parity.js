"use strict";

const pipelineBase = require("../lab/firefox-extension/pipeline-base.js");
const pipelineDetectorRegistry = require("../lab/firefox-extension/pipeline-detector-registry.js");
const testCases = require("./pipeline-test-cases.js");

const expectedDetectorIds = Object.freeze(["regex", "tokenizer"]);
const paritySamples = Object.freeze([
  Object.freeze({
    id: "clean-url",
    input: "https://example.com/path?keep=yes",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "single-slash",
    input: "https:/example.com/path?keep=yes",
    options: Object.freeze({
      enableUrlNormalizationRepair: true
    })
  }),
  Object.freeze({
    id: "missing-colon",
    input: "https//example.com/path?keep=yes",
    options: Object.freeze({
      enableUrlNormalizationRepair: true
    })
  }),
  Object.freeze({
    id: "missing-leading-h",
    input: "ttps://example.com/path?keep=yes",
    options: Object.freeze({
      enableUrlNormalizationRepair: true
    })
  }),
  Object.freeze({
    id: "whitespace-damaged-protocol",
    input: "https:// example.com/path?keep=yes",
    options: Object.freeze({
      enableUrlNormalizationRepair: true
    })
  }),
  Object.freeze({
    id: "embedded-tag",
    input: "<https://example.com/path?keep=yes>",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "trailing-punctuation",
    input: "https://example.com/path?keep=yes).",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "mailto-link",
    input: "mailto:debugger@example.com",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "bare-email",
    input: "debugger@example.com",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "two-urls",
    input: "A https://a.test/x and https://b.test/y",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "prefix-boundary",
    input: "foohttps://example.com/path",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "no-host",
    input: "http://",
    options: Object.freeze({})
  }),
  Object.freeze({
    id: "repair-no-boundary",
    input: "xhttps:/example.com/path",
    options: Object.freeze({
      enableUrlNormalizationRepair: true
    })
  })
]);

function arrayEquals(leftValue, rightValue) {
  return JSON.stringify(leftValue) === JSON.stringify(rightValue);
}

function collectParityMismatches(detectorRegistry, caseDefinition) {
  return detectorRegistry.detectText(caseDefinition.input, caseDefinition.options || {})
    .filter(function keepParityMismatch(matchRecord) {
      return !arrayEquals(matchRecord.detectorIds, expectedDetectorIds);
    })
    .map(function mapMismatch(matchRecord) {
      return {
        id: caseDefinition.id,
        input: caseDefinition.input,
        detectorIds: matchRecord.detectorIds.slice(),
        index: matchRecord.index,
        value: matchRecord.value
      };
    });
}

function buildDetectorParityReport() {
  const detectorRegistry = pipelineDetectorRegistry.create({
    pipelineBase: pipelineBase
  });
  const detectors = detectorRegistry.listDetectors();
  const suiteDefinition = testCases.buildPipelineTestSuite();
  const suiteCases = testCases.flattenCases(suiteDefinition);
  const suiteParityMismatches = suiteCases.flatMap(function collectSuiteCaseMismatches(caseDefinition) {
    return collectParityMismatches(detectorRegistry, caseDefinition);
  });
  const sampleParityMismatches = paritySamples.flatMap(function collectSampleMismatches(caseDefinition) {
    return collectParityMismatches(detectorRegistry, caseDefinition);
  });
  const actual = {
    detectorIds: detectors.map(function mapDetectorId(detector) {
      return detector.id;
    }),
    detectorTitles: detectors.map(function mapDetectorTitle(detector) {
      return detector.title;
    }),
    suiteCaseCount: suiteCases.length,
    paritySampleCount: paritySamples.length,
    suiteParityMismatchCount: suiteParityMismatches.length,
    sampleParityMismatchCount: sampleParityMismatches.length,
    suiteParityMismatchPreview: suiteParityMismatches.slice(0, 5),
    sampleParityMismatchPreview: sampleParityMismatches.slice(0, 5)
  };
  const failures = [];

  if (!arrayEquals(actual.detectorIds, expectedDetectorIds)) {
    failures.push(
      "Expected detector registry ids [\"regex\", \"tokenizer\"] but received " +
      JSON.stringify(actual.detectorIds) +
      "."
    );
  }

  if (!arrayEquals(actual.detectorTitles, ["Regex", "Tokenizer"])) {
    failures.push(
      "Expected detector registry titles [\"Regex\", \"Tokenizer\"] but received " +
      JSON.stringify(actual.detectorTitles) +
      "."
    );
  }

  if (actual.suiteParityMismatchCount !== 0) {
    failures.push(
      "Expected detector parity across pipeline suite cases but found mismatches: " +
      JSON.stringify(actual.suiteParityMismatchPreview) +
      "."
    );
  }

  if (actual.sampleParityMismatchCount !== 0) {
    failures.push(
      "Expected detector parity across curated edge samples but found mismatches: " +
      JSON.stringify(actual.sampleParityMismatchPreview) +
      "."
    );
  }

  return {
    expected: {
      detectorIds: expectedDetectorIds.slice(),
      suiteParityMismatchCount: 0,
      sampleParityMismatchCount: 0
    },
    actual: actual,
    failures: failures
  };
}

module.exports = {
  buildDetectorParityReport: buildDetectorParityReport,
  expectedDetectorIds: expectedDetectorIds,
  paritySamples: paritySamples
};
