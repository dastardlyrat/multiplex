"use strict";

const trackingParameterModel = require("../lab/firefox-extension/tracking-parameter-model.js");

const wrapperDescriptors = Object.freeze([
  Object.freeze({
    id: "url",
    label: "url",
    template: "https://tracker.example.net/click?url={value}",
    encodeRounds: 1
  }),
  Object.freeze({
    id: "target",
    label: "target",
    template: "https://redirect.example.org/?target={value}",
    encodeRounds: 1
  }),
  Object.freeze({
    id: "redirect_url",
    label: "redirect_url",
    template: "https://mailer.example.net/exit?redirect_url={value}",
    encodeRounds: 1
  }),
  Object.freeze({
    id: "continue",
    label: "continue",
    template: "https://continue.example.com/?continue={value}",
    encodeRounds: 1
  })
]);

function normalizeParameterName(parameterName) {
  return String(parameterName || "").trim().toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildQueryString(entries) {
  return (entries || []).map(function mapQueryEntry(entry) {
    return encodeURIComponent(entry[0]) + "=" + encodeURIComponent(entry[1]);
  }).join("&");
}

function buildExampleUrl(pathname, entries) {
  const safePathname = String(pathname || "").trim();
  const queryString = buildQueryString(entries);
  return "https://example.com" + safePathname + (queryString ? "?" + queryString : "");
}

function wrapDestinationUrl(destinationUrl, wrapperDescriptor) {
  let encodedValue = String(destinationUrl || "");

  for (let encodeRoundIndex = 0; encodeRoundIndex < wrapperDescriptor.encodeRounds; encodeRoundIndex += 1) {
    encodedValue = encodeURIComponent(encodedValue);
  }

  return wrapperDescriptor.template.replace("{value}", encodedValue);
}

function buildRawText(label, urlValue) {
  return String(label || "").trim() + ": " + String(urlValue || "");
}

function cloneTrackingFilters(overrides) {
  return Object.assign({}, trackingParameterModel.defaultTrackingParameterFilters, overrides || {});
}

function buildKeptEntries(trackedEntries) {
  return (trackedEntries || []).concat([["keep", "yes"]]);
}

function collectRemovedParameterNames(entries) {
  return Array.from(new Set((entries || [])
    .map(function mapEntryToParameterName(entry) {
      return normalizeParameterName(entry[0]);
    })
    .filter(function keepKnownTrackingParameter(parameterName) {
      return trackingParameterModel.matchesTrackingParameterName(
        trackingParameterModel.defaultTrackingParameterFilters,
        parameterName
      );
    })
  )).sort();
}

function filterNonTrackerEntries(entries, trackingFilters) {
  return (entries || []).filter(function keepNonTrackerEntry(entry) {
    return !trackingParameterModel.matchesTrackingParameterName(trackingFilters, entry[0]);
  });
}

function formatCodeList(parameterNames) {
  return (parameterNames || []).map(function wrapParameterName(parameterName) {
    return "<code>" + String(parameterName || "") + "</code>";
  }).join(", ");
}

function createActiveCase(definition) {
  return Object.assign({ mode: "active", expectedStatus: "passed" }, definition);
}

function createExpectedFailCase(definition) {
  return Object.assign({ mode: "active", expectedStatus: "failed" }, definition);
}

function createRebuildTargetCase(definition) {
  return Object.assign({ mode: "rebuild-target", expectedStatus: "ready" }, definition);
}

function buildTrackerEntries(definition, variantName, familyIndex) {
  const sequenceLabel = String(familyIndex + 1);

  if (definition.matchMode === "prefix") {
    if (variantName === "cleaned") {
      return [
        ["utm_source", "newsletter_" + sequenceLabel],
        ["utm_medium", "email_" + sequenceLabel]
      ];
    }

    if (variantName === "retained") {
      return [
        ["utm_campaign", "campaign_" + sequenceLabel],
        ["utm_content", "hero_" + sequenceLabel]
      ];
    }

    if (variantName === "wrapped") {
      return [
        ["utm_term", "keyword_" + sequenceLabel],
        ["utm_id", "suite_" + sequenceLabel]
      ];
    }

    return [
      ["utm_source", "selective_" + sequenceLabel],
      ["utm_campaign", "bypass_" + sequenceLabel]
    ];
  }

  if (definition.key === "hsCtaTracking") {
    if (variantName === "wrapped") {
      return [["hsCtaTracking", "wrapped_" + sequenceLabel]];
    }

    if (variantName === "selective") {
      return [["hsCtaTracking", "selective_" + sequenceLabel]];
    }
  }

  return [[definition.parameterName, definition.key.toLowerCase() + "_" + variantName + "_" + sequenceLabel]];
}

function buildTrackerFamilySection(definition, familyIndex) {
  const familySlug = slugify(definition.label || definition.key);
  const sectionId = "tracker-" + familySlug;
  const wrapperDescriptor = wrapperDescriptors[familyIndex % wrapperDescriptors.length];
  const cleanedTrackerEntries = buildTrackerEntries(definition, "cleaned", familyIndex);
  const retainedTrackerEntries = buildTrackerEntries(definition, "retained", familyIndex);
  const wrappedTrackerEntries = buildTrackerEntries(definition, "wrapped", familyIndex);
  const selectiveTrackerEntries = buildTrackerEntries(definition, "selective", familyIndex);
  const cleanedEntries = buildKeptEntries(cleanedTrackerEntries);
  const retainedEntries = buildKeptEntries(retainedTrackerEntries);
  const wrappedEntries = buildKeptEntries(wrappedTrackerEntries);
  const selectiveEntries = buildKeptEntries(selectiveTrackerEntries);
  const cleanedRemovedNames = collectRemovedParameterNames(cleanedEntries);
  const retainedRemovedNames = collectRemovedParameterNames(retainedEntries);
  const wrappedRemovedNames = collectRemovedParameterNames(wrappedEntries);
  const selectiveRemovedNames = collectRemovedParameterNames(selectiveEntries);
  const cleanedUrl = buildExampleUrl("/trackers/" + familySlug + "/cleaned", cleanedEntries);
  const retainedUrl = buildExampleUrl("/trackers/" + familySlug + "/retained", retainedEntries);
  const wrappedTargetUrl = buildExampleUrl("/trackers/" + familySlug + "/wrapped", wrappedEntries);
  const wrappedUrl = wrapDestinationUrl(wrappedTargetUrl, wrapperDescriptor);
  const selectiveUrl = buildExampleUrl("/trackers/" + familySlug + "/selective-bypass", selectiveEntries);
  const cleanedExpectedUrl = buildExampleUrl(
    "/trackers/" + familySlug + "/cleaned",
    filterNonTrackerEntries(cleanedEntries, trackingParameterModel.defaultTrackingParameterFilters)
  );
  const wrappedExpectedUrl = buildExampleUrl(
    "/trackers/" + familySlug + "/wrapped",
    filterNonTrackerEntries(wrappedEntries, trackingParameterModel.defaultTrackingParameterFilters)
  );

  return {
    id: sectionId,
    title: "Tracker Family: " + definition.label,
    introLines: [
      definition.description,
      "Each family includes cleaned, wrapper, global bypass, and per-tracker bypass coverage."
    ],
    cases: [
      createActiveCase({
        id: sectionId + "-cleaned",
        title: definition.label + " direct cleaned",
        input: buildRawText(definition.label + " cleaned anchor", cleanedUrl),
        options: {},
        expected: {
          itemCount: 1,
          finalUrls: [cleanedExpectedUrl],
          displayType: "tracker cleaned",
          finalEntryType: "tracker cleaned",
          finalLinkTextIncludes: ["(tracker cleaned)"],
          removedParameterNames: cleanedRemovedNames,
          diagnosticsIncludes: [
            "KNOWN TRACKING PARAMETER STRIPPING: ON",
            "TRACKING STRIP STAGE: EXECUTED"
          ],
          errorsCount: 0
        },
        page: {
          caseLabel: "Direct cleaned",
          displayKind: "anchor",
          displayUrl: cleanedUrl,
          expectedLines: [
            "Tracker stripping on: final href label <code>tracker cleaned</code>.",
            "Final URL keeps only <code>keep=yes</code> after removing " + formatCodeList(cleanedRemovedNames) + "."
          ]
        }
      }),
      createActiveCase({
        id: sectionId + "-retained-global-bypass",
        title: definition.label + " global bypass retained",
        input: buildRawText(definition.label + " retained plain text", retainedUrl),
        options: {
          stripKnownTrackingParameters: false
        },
        expected: {
          itemCount: 1,
          finalUrls: [retainedUrl],
          displayType: "tracker",
          finalEntryType: "tracker",
          finalLinkTextIncludes: ["(tracker)"],
          removedParameterNames: [],
          diagnosticsIncludes: [
            "KNOWN TRACKING PARAMETER STRIPPING: OFF",
            "TRACKING STRIP STAGE: BYPASSED"
          ],
          notesIncludes: ["TRACKING_PARAMETER_STRIP_BYPASSED"],
          errorsCount: 0
        },
        page: {
          caseLabel: "Global bypass retained",
          displayKind: "plain-text",
          displayUrl: retainedUrl,
          expectedLines: [
            "Tracker stripping off: final href label <code>tracker</code>.",
            "The destination keeps " + formatCodeList(retainedRemovedNames) + " because the global strip stage is bypassed."
          ]
        }
      }),
      createActiveCase({
        id: sectionId + "-wrapped-cleaned",
        title: definition.label + " wrapped cleaned",
        input: buildRawText(definition.label + " wrapped anchor", wrappedUrl),
        options: {},
        expected: {
          itemCount: 1,
          finalUrls: [wrappedExpectedUrl],
          displayType: "tracker cleaned",
          finalEntryType: "tracker cleaned",
          finalLinkTextIncludes: ["(tracker cleaned)"],
          removedParameterNames: wrappedRemovedNames,
          diagnosticsIncludes: [
            "KNOWN TRACKING PARAMETER STRIPPING: ON",
            "TRACKING STRIP STAGE: EXECUTED"
          ],
          errorsCount: 0
        },
        page: {
          caseLabel: "Wrapped cleaned",
          displayKind: "anchor",
          displayUrl: wrappedUrl,
          expectedLines: [
            "Must unwrap the <code>" + wrapperDescriptor.label + "</code> destination before classification.",
            "Final href label should still become <code>tracker cleaned</code> after removing " + formatCodeList(wrappedRemovedNames) + "."
          ]
        }
      }),
      createActiveCase({
        id: sectionId + "-selective-bypass",
        title: definition.label + " selective bypass retained",
        input: buildRawText(definition.label + " selective bypass plain text", selectiveUrl),
        options: {
          trackingParameterFilters: cloneTrackingFilters({
            [definition.key]: false
          })
        },
        expected: {
          itemCount: 1,
          finalUrls: [selectiveUrl],
          displayType: "tracker",
          finalEntryType: "tracker",
          finalLinkTextIncludes: ["(tracker)"],
          removedParameterNames: [],
          diagnosticsIncludes: [
            "KNOWN TRACKING PARAMETER STRIPPING: ON",
            "TRACKING STRIP STAGE: EXECUTED"
          ],
          errorsCount: 0
        },
        page: {
          caseLabel: "Selective bypass retained",
          displayKind: "plain-text",
          displayUrl: selectiveUrl,
          expectedLines: [
            "With only <code>" + definition.label + "</code> disabled, final href label stays <code>tracker</code>.",
            "The destination keeps " + formatCodeList(selectiveRemovedNames) + " while every other tracker family remains enabled."
          ]
        }
      })
    ]
  };
}

function buildManualCoverageSections() {
  const nestedWrapperFinalUrl = buildExampleUrl("/wrappers/nested-cleaned", [["ttclid", "nested_chain"], ["keep", "yes"]]);
  const nestedWrapperUrl = wrapDestinationUrl(
    wrapDestinationUrl(nestedWrapperFinalUrl, wrapperDescriptors[0]),
    wrapperDescriptors[1]
  );
  const bareEmailAddress = "debugger@example.com";
  const mailtoEmailUrl = "mailto:" + bareEmailAddress;
  const doubleEncodedFinalUrl = buildExampleUrl("/wrappers/double-encoded", [["hsenc", "double_encoded"], ["keep", "yes"]]);
  const doubleEncodedWrappedUrl = "https://edge.example.org/click?url=" + encodeURIComponent(encodeURIComponent(doubleEncodedFinalUrl));
  const safeEmailUrl = buildExampleUrl("/safe/email", [["email", "debugger@example.com"], ["keep", "yes"]]);
  const safeCampaignUrl = buildExampleUrl("/safe/campaign", [["campaign", "april"], ["keep", "yes"]]);
  const safeReplyToUrl = buildExampleUrl("/safe/reply-to", [["reply_to", "debugger@example.com"], ["keep", "yes"]]);
  const punctuationOffUrl = "https://example.com/repair/off?keep=yes).";
  const punctuationOnUrl = "https://example.com/repair/on?keep=yes).";
  const trackedPunctuationOffUrl = "https://example.com/repair/tracked-off?gclid=111&keep=yes).";
  const trackedPunctuationOnUrl = "https://example.com/repair/tracked-on?gclid=111&keep=yes).";
  const wrappedRepairTargetUrl = "https://example.com/repair/wrapped?utm_source=repair&keep=yes).";
  const wrappedRepairUrl = wrapDestinationUrl(wrappedRepairTargetUrl, wrapperDescriptors[2]);
  const safeWrapperTargetUrl = buildExampleUrl("/wrappers/safe-email", [["email", "qa@example.com"], ["keep", "yes"]]);
  const safeWrapperUrl = wrapDestinationUrl(safeWrapperTargetUrl, wrapperDescriptors[0]);

  return [
    {
      id: "email-links",
      title: "Email Link Coverage",
      introLines: [
        "These cases verify that mailto links and standalone email addresses are recognized as email targets."
      ],
      cases: [
        createActiveCase({
          id: "mailto-link-classified-as-email",
          title: "Mailto link is classified as email",
          input: buildRawText("Contact mailbox", mailtoEmailUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [mailtoEmailUrl],
            displayType: "email",
            finalEntryType: "email",
            finalLinkTextIncludes: [bareEmailAddress, "(email)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Mailto link",
            displayKind: "anchor",
            displayUrl: mailtoEmailUrl,
            expectedLines: [
              "Mailto links should classify as <code>email</code> instead of <code>unknown</code>.",
              "The final link label should show the mailbox address rather than a synthetic scheme label."
            ]
          }
        }),
        createActiveCase({
          id: "bare-email-normalized-to-mailto",
          title: "Bare email address normalizes to mailto",
          input: buildRawText("Reply mailbox", bareEmailAddress),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [mailtoEmailUrl],
            displayType: "email",
            finalEntryType: "email",
            finalLinkTextIncludes: [bareEmailAddress, "(email)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Bare email",
            displayKind: "plain-text",
            displayUrl: bareEmailAddress,
            expectedLines: [
              "Standalone email addresses should be detected and promoted to a <code>mailto:</code> target.",
              "The displayed type should remain <code>email</code> throughout the pipeline."
            ]
          }
        }),
        createActiveCase({
          id: "mailto-anchor-html-classified-as-email",
          title: "Mailto anchor in HTML is classified as email",
          input: buildRawText("Contact mailbox", mailtoEmailUrl),
          sourceHtml: '<p>Contact <a href="mailto:debugger@example.com">debugger@example.com</a></p>',
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [mailtoEmailUrl],
            displayType: "email",
            finalEntryType: "email",
            finalLinkTextIncludes: [bareEmailAddress, "(email)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Mailto anchor HTML",
            displayKind: "anchor",
            displayUrl: mailtoEmailUrl,
            expectedLines: [
              "HTML <code>mailto:</code> anchors should survive HTML-path detection and classify as <code>email</code>.",
              "This guards the real mirror path instead of only the plain-text fallback."
            ]
          }
        }),
        createActiveCase({
          id: "bare-email-html-normalized-to-mailto",
          title: "Bare email inside HTML is detected and normalized",
          input: buildRawText("Reply mailbox", bareEmailAddress),
          sourceHtml: "<p>Reply mailbox debugger@example.com</p>",
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [mailtoEmailUrl],
            displayType: "email",
            finalEntryType: "email",
            finalLinkTextIncludes: [bareEmailAddress, "(email)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Bare email HTML",
            displayKind: "plain-text",
            displayUrl: bareEmailAddress,
            expectedLines: [
              "Bare email text inside HTML content should be detected, not only bare email in plain text mode.",
              "The resulting target should still become <code>mailto:</code> with <code>email</code> typing."
            ]
          }
        })
      ]
    },
    {
      id: "safe-non-trackers",
      title: "Safe Non-Tracker Coverage",
      introLines: [
        "These cases guard parameters that should stay visible even when tracker cleaning is enabled."
      ],
      cases: [
        createActiveCase({
          id: "safe-email-parameter",
          title: "Email parameter stays safe",
          input: buildRawText("Safe email parameter", safeEmailUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [safeEmailUrl],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Email parameter",
            displayKind: "anchor",
            displayUrl: safeEmailUrl,
            expectedLines: [
              "Final href label should remain <code>destination</code>.",
              "Email-like parameters must not be treated as tracking identifiers."
            ]
          }
        }),
        createActiveCase({
          id: "safe-campaign-parameter",
          title: "Campaign parameter stays safe",
          input: buildRawText("Safe campaign parameter", safeCampaignUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [safeCampaignUrl],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Campaign parameter",
            displayKind: "plain-text",
            displayUrl: safeCampaignUrl,
            expectedLines: [
              "Final href label should remain <code>destination</code>.",
              "The plain word <code>campaign</code> must not trigger tracker classification by itself."
            ]
          }
        }),
        createActiveCase({
          id: "safe-reply-to-parameter",
          title: "Reply-to parameter stays safe",
          input: buildRawText("Safe reply_to parameter", safeReplyToUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [safeReplyToUrl],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "reply_to parameter",
            displayKind: "plain-text",
            displayUrl: safeReplyToUrl,
            expectedLines: [
              "Final href label should remain <code>destination</code>.",
              "Contact-style parameters such as <code>reply_to</code> must stay in the destination URL."
            ]
          }
        })
      ]
    },
    {
      id: "wrapper-resolution",
      title: "Wrapper And Nested Resolution",
      introLines: [
        "These cases focus on multi-hop wrapper peeling beyond the per-tracker family coverage."
      ],
      cases: [
        createActiveCase({
          id: "nested-wrapper-cleaned",
          title: "Nested wrapper chain strips trackers after peeling",
          input: buildRawText("Nested wrapper chain", nestedWrapperUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [buildExampleUrl("/wrappers/nested-cleaned", [["keep", "yes"]])],
            displayType: "tracker cleaned",
            finalEntryType: "tracker cleaned",
            finalLinkTextIncludes: ["(tracker cleaned)"],
            removedParameterNames: ["ttclid"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Nested wrapper chain",
            displayKind: "anchor",
            displayUrl: nestedWrapperUrl,
            expectedLines: [
              "Must unwrap through more than one wrapper layer before classification.",
              "Final href label should become <code>tracker cleaned</code> after removing <code>ttclid</code>."
            ]
          }
        }),
        createActiveCase({
          id: "double-encoded-wrapper-cleaned",
          title: "Double-encoded wrapper strips trackers after repeated decoding",
          input: buildRawText("Double-encoded wrapper", doubleEncodedWrappedUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [buildExampleUrl("/wrappers/double-encoded", [["keep", "yes"]])],
            displayType: "tracker cleaned",
            finalEntryType: "tracker cleaned",
            finalLinkTextIncludes: ["(tracker cleaned)"],
            removedParameterNames: ["hsenc"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Double-encoded wrapper",
            displayKind: "anchor",
            displayUrl: doubleEncodedWrappedUrl,
            expectedLines: [
              "Must decode only as far as needed to recover a valid destination.",
              "Final href label should still be based on the peeled <code>example.com</code> destination."
            ]
          }
        }),
        createActiveCase({
          id: "safe-wrapper-destination-label",
          title: "Safe wrapper resolves to destination labeling",
          input: buildRawText("Safe wrapper final label target", safeWrapperUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [safeWrapperTargetUrl],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            errorsCount: 0
          },
          page: {
            caseLabel: "Safe wrapper final labeling",
            displayKind: "anchor",
            displayUrl: safeWrapperUrl,
            expectedLines: [
              "A wrapper that peels to a safe destination should finish as <code>destination</code>.",
              "The final href label must be based on the peeled <code>example.com</code> URL rather than the wrapper shell."
            ]
          }
        })
      ]
    },
    {
      id: "repair-sensitive",
      title: "Repair-Sensitive Coverage",
      introLines: [
        "Normalization repair is off by default, so these cases pin both the bypassed and enabled flows."
      ],
      cases: [
        createActiveCase({
          id: "repair-off-destination",
          title: "Trailing punctuation stays when repair is bypassed",
          input: buildRawText("Trailing punctuation destination", punctuationOffUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: [punctuationOffUrl],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: OFF",
              "NORMALIZATION STAGE: BYPASSED"
            ],
            notesIncludes: ["NORMALIZATION_REPAIR_BYPASSED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Trailing punctuation, repair off",
            displayKind: "plain-text",
            displayUrl: punctuationOffUrl,
            expectedLines: [
              "Normalization repair off: the damaged tail stays in the final URL.",
              "The href label should still read <code>destination</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-on-destination",
          title: "Trailing punctuation is repaired when repair is enabled",
          input: buildRawText("Trailing punctuation destination repaired", punctuationOnUrl),
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/repair/on?keep=yes"],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "NORMALIZATION STAGE: EXECUTED"
            ],
            notesIncludes: ["TRAILING_PUNCT_REMOVED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Trailing punctuation, repair on",
            displayKind: "plain-text",
            displayUrl: punctuationOnUrl,
            expectedLines: [
              "Normalization repair on: trim the trailing punctuation before pipeline classification.",
              "The final destination should become <code>https://example.com/repair/on?keep=yes</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-off-tracker-cleaned",
          title: "Tracker removal still runs while repair is bypassed",
          input: buildRawText("Tracked punctuation destination", trackedPunctuationOffUrl),
          options: {},
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/repair/tracked-off?keep=yes%29."],
            displayType: "tracker cleaned",
            finalEntryType: "tracker cleaned",
            finalLinkTextIncludes: ["(tracker cleaned)"],
            removedParameterNames: ["gclid"],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: OFF",
              "TRACKING STRIP STAGE: EXECUTED"
            ],
            notesIncludes: ["NORMALIZATION_REPAIR_BYPASSED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Tracked punctuation, repair off",
            displayKind: "plain-text",
            displayUrl: trackedPunctuationOffUrl,
            expectedLines: [
              "Normalization repair off: the tracker is removed but the damaged tail remains encoded in the kept value.",
              "The href label should still read <code>tracker cleaned</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-on-tracker-cleaned",
          title: "Repair and tracker stripping cooperate when both are enabled",
          input: buildRawText("Tracked punctuation repaired", trackedPunctuationOnUrl),
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/repair/tracked-on?keep=yes"],
            displayType: "tracker cleaned",
            finalEntryType: "tracker cleaned",
            finalLinkTextIncludes: ["(tracker cleaned)"],
            removedParameterNames: ["gclid"],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "TRACKING STRIP STAGE: EXECUTED"
            ],
            notesIncludes: ["TRAILING_PUNCT_REMOVED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Tracked punctuation, repair on",
            displayKind: "plain-text",
            displayUrl: trackedPunctuationOnUrl,
            expectedLines: [
              "Normalization repair on: remove the damaged tail before stripping <code>gclid</code>.",
              "The final destination should become <code>https://example.com/repair/tracked-on?keep=yes</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-on-wrapped-destination",
          title: "Wrapped punctuation repair applies after peeling",
          input: buildRawText("Wrapped repair case", wrappedRepairUrl),
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/repair/wrapped?keep=yes"],
            displayType: "tracker cleaned",
            finalEntryType: "tracker cleaned",
            finalLinkTextIncludes: ["(tracker cleaned)"],
            removedParameterNames: ["utm_source"],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "TRACKING STRIP STAGE: EXECUTED"
            ],
            notesIncludes: ["TRAILING_PUNCT_REMOVED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Wrapped punctuation, repair on",
            displayKind: "anchor",
            displayUrl: wrappedRepairUrl,
            expectedLines: [
              "Must unwrap the destination and then repair trailing punctuation before tracker stripping.",
              "The final destination should become <code>https://example.com/repair/wrapped?keep=yes</code>."
            ]
          }
        })
      ]
    },
    {
      id: "protocol-recovery",
      title: "Protocol Recovery Coverage",
      introLines: [
        "These cases were previously rebuild targets. They now verify malformed protocol recovery as supported behavior when normalization repair is enabled."
      ],
      cases: [
        createActiveCase({
          id: "repair-missing-second-slash",
          title: "Recover missing second slash",
          input: "https:/example.com/path?keep=yes",
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/path?keep=yes"],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "NORMALIZATION STAGE: EXECUTED"
            ],
            notesIncludes: ["PROTOCOL_REPAIRED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Missing second slash",
            displayKind: "plain-text",
            displayUrl: "https:/example.com/path?keep=yes",
            expectedLines: [
              "Normalization repair on: recover the missing slash and produce <code>https://example.com/path?keep=yes</code>.",
              "The final href label should remain <code>destination</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-missing-colon",
          title: "Recover missing colon after protocol",
          input: "https//example.com/path?keep=yes",
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/path?keep=yes"],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "NORMALIZATION STAGE: EXECUTED"
            ],
            notesIncludes: ["PROTOCOL_REPAIRED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Missing colon after protocol",
            displayKind: "plain-text",
            displayUrl: "https//example.com/path?keep=yes",
            expectedLines: [
              "Normalization repair on: reconstruct the missing colon and recover a valid absolute URL.",
              "The final href label should remain <code>destination</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-missing-leading-h",
          title: "Recover missing leading h in protocol",
          input: "ttps://example.com/path?keep=yes",
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/path?keep=yes"],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "NORMALIZATION STAGE: EXECUTED"
            ],
            notesIncludes: ["PROTOCOL_REPAIRED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Missing leading h",
            displayKind: "plain-text",
            displayUrl: "ttps://example.com/path?keep=yes",
            expectedLines: [
              "Normalization repair on: restore the missing leading character in the scheme.",
              "The final href label should remain <code>destination</code>."
            ]
          }
        }),
        createActiveCase({
          id: "repair-whitespace-damaged-protocol",
          title: "Recover whitespace-damaged protocol",
          input: "https:// example.com/path?keep=yes",
          options: {
            enableUrlNormalizationRepair: true
          },
          expected: {
            itemCount: 1,
            finalUrls: ["https://example.com/path?keep=yes"],
            displayType: "destination",
            finalEntryType: "destination",
            finalLinkTextIncludes: ["(destination)"],
            removedParameterNames: [],
            diagnosticsIncludes: [
              "URL NORMALIZATION + REPAIR: ON",
              "NORMALIZATION STAGE: EXECUTED"
            ],
            notesIncludes: ["PROTOCOL_REPAIRED"],
            errorsCount: 0
          },
          page: {
            caseLabel: "Whitespace-damaged protocol",
            displayKind: "plain-text",
            displayUrl: "https:// example.com/path?keep=yes",
            expectedLines: [
              "Normalization repair on: collapse the broken whitespace and recover one absolute URL token.",
              "The final href label should remain <code>destination</code>."
            ]
          }
        })
      ]
    }
  ];
}

function buildPipelineTestSuite() {
  return {
    title: "URL Forensics Workbench Test Suite",
    sections: trackingParameterModel.trackingParameterDefinitions.map(function mapTrackerDefinition(definition, familyIndex) {
      return buildTrackerFamilySection(definition, familyIndex);
    }).concat(buildManualCoverageSections())
  };
}

function flattenCases(suiteDefinition) {
  return (suiteDefinition && Array.isArray(suiteDefinition.sections) ? suiteDefinition.sections : []).flatMap(function flattenSection(section) {
    return (section.cases || []).map(function attachSectionMetadata(caseDefinition) {
      return Object.assign({
        sectionId: section.id,
        sectionTitle: section.title,
        sectionIntroLines: section.introLines || []
      }, caseDefinition);
    });
  });
}

function summarizeSuite(suiteDefinition) {
  const allCases = flattenCases(suiteDefinition);
  const activeCases = allCases.filter(function keepActiveCase(caseDefinition) {
    return caseDefinition.mode === "active";
  });
  const rebuildTargets = allCases.filter(function keepRebuildTargetCase(caseDefinition) {
    return caseDefinition.mode === "rebuild-target";
  });

  return {
    totalSections: suiteDefinition && Array.isArray(suiteDefinition.sections) ? suiteDefinition.sections.length : 0,
    totalCases: allCases.length,
    activeCaseCount: activeCases.length,
    rebuildTargetCount: rebuildTargets.length
  };
}

module.exports = {
  buildPipelineTestSuite: buildPipelineTestSuite,
  createExpectedFailCase: createExpectedFailCase,
  flattenCases: flattenCases,
  summarizeSuite: summarizeSuite
};
