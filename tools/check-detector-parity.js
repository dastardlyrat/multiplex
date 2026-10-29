"use strict";

const detectorParity = require("./pipeline-detector-parity.js");

function main() {
  const parityReport = detectorParity.buildDetectorParityReport();
  const actual = parityReport.actual || {};
  const failures = Array.isArray(parityReport.failures) ? parityReport.failures : [];

  console.log(
    "Detector parity check complete. " +
    "detectors=" + JSON.stringify(actual.detectorIds || []) + ", " +
    "suiteCases=" + String(actual.suiteCaseCount || 0) + ", " +
    "edgeSamples=" + String(actual.paritySampleCount || 0) + ", " +
    "suiteMismatches=" + String(actual.suiteParityMismatchCount || 0) + ", " +
    "sampleMismatches=" + String(actual.sampleParityMismatchCount || 0) + "."
  );

  if (failures.length) {
    failures.forEach(function printFailure(failureMessage) {
      console.error("- " + failureMessage);
    });
    process.exit(1);
  }
}

main();
