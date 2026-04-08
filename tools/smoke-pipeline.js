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
