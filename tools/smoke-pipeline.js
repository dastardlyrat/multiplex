"use strict";

const pipeline = require("../lab/firefox-extension/pipeline.js");
const redaction = require("../lab/firefox-extension/debug-redaction.js");
const settingsOpener = require("../lab/firefox-extension/settings-opener.js");

// Function: run pipeline smoke test.
function runPipelineSmokeTest() {
  const defaultResult = pipeline.analyzeInput({
    rawText: "Visit https://example.com/path?utm_source=newsletter&fbclid=123&hsCtaTracking=abc&keep=yes",
    options: {}
  });
  const bypassedResult = pipeline.analyzeInput({
    rawText: "Visit https://example.com/path?utm_source=newsletter&fbclid=123&keep=yes",
    options: {
      stripKnownTrackingParameters: false
    }
  });
  const selectiveBypassResult = pipeline.analyzeInput({
    rawText: "Visit https://example.com/path?fbclid=123&gclid=456&keep=yes",
    options: {
      trackingParameterFilters: {
        fbclid: false
      }
    }
  });
  const nestedWrapperInput =
    "Plain text nested wrapper case: https://wrap.example.net/?continue=https%3A%2F%2Fredirect.example.org%2F%3Ftarget%3Dhttps%253A%252F%252Fexample.com%252Fplain%252Fnested-wrapper%253Futm_campaign%253Dplain_suite%2526keep%253Dyes";
  const nestedWrapperResult = pipeline.analyzeInput({
    rawText: nestedWrapperInput,
    options: {}
  });
  const nestedWrapperBypassedStripResult = pipeline.analyzeInput({
    rawText: nestedWrapperInput,
    options: {
      stripKnownTrackingParameters: false
    }
  });

  if (
    !defaultResult ||
    defaultResult.items.length !== 1 ||
    defaultResult.finalUrls.length !== 1 ||
    defaultResult.finalUrls[0] !== "https://example.com/path?keep=yes"
  ) {
    throw new Error("pipeline analyzeInput smoke test failed");
  }

  if (
    !bypassedResult ||
    bypassedResult.finalUrls.length !== 1 ||
    bypassedResult.finalUrls[0] !== "https://example.com/path?utm_source=newsletter&fbclid=123&keep=yes"
  ) {
    throw new Error("pipeline tracking parameter bypass smoke test failed");
  }

  if (
    !selectiveBypassResult ||
    selectiveBypassResult.finalUrls.length !== 1 ||
    selectiveBypassResult.finalUrls[0] !== "https://example.com/path?fbclid=123&keep=yes"
  ) {
    throw new Error("pipeline per-tracker filter smoke test failed");
  }

  if (
    !nestedWrapperResult ||
    nestedWrapperResult.finalUrls.length !== 1 ||
    nestedWrapperResult.finalUrls[0] !== "https://example.com/plain/nested-wrapper?keep=yes"
  ) {
    throw new Error("pipeline nested wrapper resolution smoke test failed");
  }

  if (
    !nestedWrapperBypassedStripResult ||
    nestedWrapperBypassedStripResult.finalUrls.length !== 1 ||
    nestedWrapperBypassedStripResult.finalUrls[0] !== "https://example.com/plain/nested-wrapper?utm_campaign=plain_suite&keep=yes"
  ) {
    throw new Error("pipeline nested wrapper strip bypass smoke test failed");
  }

  if (pipeline.classifyUrlValue("https://example.com/path?gclid=456&keep=yes") !== "tracker") {
    throw new Error("pipeline tracker classification smoke test failed");
  }

  if (pipeline.classifyUrlValue("https://example.com/path?email=name@example.com&keep=yes") !== "destination") {
    throw new Error("pipeline email parameter classification smoke test failed");
  }

  const trackedFinalEntries = pipeline.buildFinalUrlEntries(bypassedResult.items);
  if (
    !trackedFinalEntries.length ||
    trackedFinalEntries[0].type !== "tracker" ||
    pipeline.buildFinalUrlLinkText(trackedFinalEntries[0]).indexOf("(tracker)") === -1
  ) {
    throw new Error("pipeline uncleaned tracker href label smoke test failed");
  }

  if (
    !defaultResult.items[0] ||
    defaultResult.items[0].trackerCleanupEntries.length !== 1 ||
    defaultResult.items[0].trackerCleanupEntries[0].removedParameterNames.indexOf("hsctatracking") === -1 ||
    pipeline.getItemDisplayType(defaultResult.items[0]) !== "tracker cleaned"
  ) {
    throw new Error("pipeline tracker cleanup labeling smoke test failed");
  }

  const cleanedFinalEntries = pipeline.buildFinalUrlEntries(defaultResult.items);
  if (
    !cleanedFinalEntries.length ||
    cleanedFinalEntries[0].type !== "tracker cleaned" ||
    pipeline.buildFinalUrlLinkText(cleanedFinalEntries[0]).indexOf("(tracker cleaned)") === -1
  ) {
    throw new Error("pipeline cleaned tracker href label smoke test failed");
  }

  const nestedWrapperFinalEntries = pipeline.buildFinalUrlEntries(nestedWrapperResult.items);
  if (
    !nestedWrapperFinalEntries.length ||
    nestedWrapperFinalEntries[0].type !== "tracker cleaned" ||
    pipeline.buildFinalUrlLinkText(nestedWrapperFinalEntries[0]).indexOf("(tracker cleaned)") === -1
  ) {
    throw new Error("pipeline nested wrapper cleaned label smoke test failed");
  }

  const nestedWrapperRetainedEntries = pipeline.buildFinalUrlEntries(nestedWrapperBypassedStripResult.items);
  if (
    !nestedWrapperRetainedEntries.length ||
    nestedWrapperRetainedEntries[0].type !== "tracker" ||
    pipeline.buildFinalUrlLinkText(nestedWrapperRetainedEntries[0]).indexOf("(tracker)") === -1
  ) {
    throw new Error("pipeline nested wrapper retained label smoke test failed");
  }
}

// Function: run debug redaction smoke test.
function runDebugRedactionSmokeTest() {
  const sanitized = redaction.sanitizeDetails({
    sourceHtml: "<p>secret</p>",
    safe: "ok",
    nested: {
      rawText: "secret",
      keep: "value"
    }
  }, 0);

  if (sanitized.sourceHtml !== "[redacted]" || sanitized.nested.rawText !== "[redacted]" || sanitized.safe !== "ok") {
    throw new Error("debug redaction smoke test failed");
  }
}

// Function: run settings opener smoke test.
async function runSettingsOpenerSmokeTest() {
  const calls = [];
  const response = await settingsOpener.openSettingsPage({
    runtime: {
      sendMessage: async function sendMessage(message) {
        calls.push(message.type);
        return { ok: true };
      },
      openOptionsPage: async function openOptionsPage() {
        calls.push("openOptionsPage");
      },
      getURL: function getURL() {
        return "settings.html";
      }
    }
  });

  if (!response.ok || calls[0] !== "merged-link-lab:open-settings-page" || calls.length !== 1) {
    throw new Error("settings opener smoke test failed");
  }
}

(async function runSmokeTests() {
  runPipelineSmokeTest();
  runDebugRedactionSmokeTest();
  await runSettingsOpenerSmokeTest();
  console.log("Smoke tests passed.");
}()).catch(function handleSmokeTestFailure(error) {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
});
