"use strict";

function urlForensicsInboxBrowserFixtureValidationArrayEquals(leftValue, rightValue) {
  return JSON.stringify(leftValue) === JSON.stringify(rightValue);
}

function urlForensicsInboxBrowserFixtureValidationResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsInboxBrowserFixtureValidationCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const globalScope = optionBag.globalScope || (typeof globalThis !== "undefined" ? globalThis : null);

  return Object.freeze({
    globalScope: globalScope,
    documentObject: optionBag.documentObject || (globalScope ? globalScope.document || null : null),
    mergedLinkLabPipeline: optionBag.mergedLinkLabPipeline || (globalScope ? globalScope.MergedLinkLabPipeline || null : null),
    inboxDetectors: optionBag.inboxDetectors || (globalScope ? globalScope.urlForensicsInboxDetectors || null : null),
    emailCandidateDiscovery: optionBag.emailCandidateDiscovery || (globalScope ? globalScope.urlForensicsEmailCandidateDiscovery || null : null),
    emailRootSummary: optionBag.emailRootSummary || (globalScope ? globalScope.urlForensicsEmailRootSummary || null : null),
    fixtureData: Array.isArray(optionBag.fixtureData)
      ? optionBag.fixtureData
      : (globalScope && Array.isArray(globalScope.urlForensicsInboxFixtureData) ? globalScope.urlForensicsInboxFixtureData : []),
    getNow: urlForensicsInboxBrowserFixtureValidationResolveFunction(
      optionBag.getNow,
      function getDefaultNow() {
        return Date.now();
      }
    )
  });
}

function urlForensicsInboxBrowserFixtureValidationAssertDependencies(options) {
  if (!options.documentObject || typeof options.documentObject.createElement !== "function") {
    throw new Error("URL Forensics inbox browser fixture validation requires a browser document.");
  }

  if (!options.mergedLinkLabPipeline || typeof options.mergedLinkLabPipeline.analyzeInput !== "function") {
    throw new Error("URL Forensics pipeline is unavailable for inbox browser fixture validation.");
  }

  if (!options.inboxDetectors || typeof options.inboxDetectors.getInboxProviderKey !== "function") {
    throw new Error("URL Forensics inbox detectors are unavailable for inbox browser fixture validation.");
  }

  if (!options.emailCandidateDiscovery || typeof options.emailCandidateDiscovery.create !== "function") {
    throw new Error("URL Forensics email candidate discovery is unavailable for inbox browser fixture validation.");
  }

  if (!options.emailRootSummary || typeof options.emailRootSummary.create !== "function") {
    throw new Error("URL Forensics email root summary is unavailable for inbox browser fixture validation.");
  }
}

function urlForensicsInboxBrowserFixtureValidationBuildSyntheticLocation(fixtureUrl) {
  const parsedUrl = new URL(String(fixtureUrl || "about:blank"));

  return Object.freeze({
    href: parsedUrl.toString(),
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    hash: parsedUrl.hash
  });
}

function urlForensicsInboxBrowserFixtureValidationWaitForFrameLoad(frameElement) {
  return new Promise(function resolveFrameLoad(resolve, reject) {
    const timeoutId = setTimeout(function rejectFrameLoad() {
      reject(new Error("Timed out waiting for fixture frame load."));
    }, 4000);

    function cleanup() {
      clearTimeout(timeoutId);
      frameElement.removeEventListener("load", handleLoad, true);
      frameElement.removeEventListener("error", handleError, true);
    }

    function handleLoad() {
      cleanup();
      resolve(frameElement);
    }

    function handleError() {
      cleanup();
      reject(new Error("Fixture frame failed to load."));
    }

    frameElement.addEventListener("load", handleLoad, true);
    frameElement.addEventListener("error", handleError, true);
  });
}

function urlForensicsInboxBrowserFixtureValidationInstallDocumentStyles(documentObject, selectors) {
  const safeSelectors = (Array.isArray(selectors) ? selectors : []).filter(Boolean);
  const styleElement = documentObject.createElement("style");
  const selectorRule = safeSelectors.length
    ? safeSelectors.join(",\n") + " {\n      display: block;\n      box-sizing: border-box;\n      width: 760px;\n      min-height: 220px;\n      padding: 20px;\n      border: 1px solid transparent;\n    }"
    : "";

  styleElement.textContent = [
    "html, body { margin: 0; padding: 0; min-height: 100%; background: #fff; color: #111; font: 16px/1.6 Arial, sans-serif; }",
    "body { box-sizing: border-box; width: 1240px; padding: 24px; }",
    "p { margin: 0 0 14px; }",
    "a { color: #0f766e; }",
    "iframe { display: block; width: 760px; height: 260px; border: 0; }",
    selectorRule
  ].filter(Boolean).join("\n");

  (documentObject.head || documentObject.documentElement || documentObject.body).appendChild(styleElement);
}

function urlForensicsInboxBrowserFixtureValidationCreateHostFrame(documentObject) {
  const frameElement = documentObject.createElement("iframe");

  frameElement.setAttribute("aria-hidden", "true");
  frameElement.tabIndex = -1;
  frameElement.style.position = "fixed";
  frameElement.style.left = "-20000px";
  frameElement.style.top = "0";
  frameElement.style.width = "1280px";
  frameElement.style.height = "900px";
  frameElement.style.opacity = "0";
  frameElement.style.pointerEvents = "none";
  frameElement.style.border = "0";

  return frameElement;
}

async function urlForensicsInboxBrowserFixtureValidationLoadFrameMarkup(frameElement, markup) {
  const loadPromise = urlForensicsInboxBrowserFixtureValidationWaitForFrameLoad(frameElement);

  frameElement.srcdoc = String(markup || "");
  await loadPromise;
  return frameElement;
}

async function urlForensicsInboxBrowserFixtureValidationApplyNestedFrames(fixtureDefinition, documentObject) {
  const nestedFrames = Array.isArray(fixtureDefinition.nestedFrames) ? fixtureDefinition.nestedFrames : [];

  for (const nestedFrameDefinition of nestedFrames) {
    const matchedFrames = Array.from(documentObject.querySelectorAll(String(nestedFrameDefinition.selector || "")));

    for (const frameElement of matchedFrames) {
      await urlForensicsInboxBrowserFixtureValidationLoadFrameMarkup(frameElement, nestedFrameDefinition.sourceHtml);
      if (frameElement.contentDocument) {
        urlForensicsInboxBrowserFixtureValidationInstallDocumentStyles(frameElement.contentDocument, []);
      }
    }
  }
}

async function urlForensicsInboxBrowserFixtureValidationCreateFixtureEnvironment(fixtureDefinition, options) {
  const hostFrame = urlForensicsInboxBrowserFixtureValidationCreateHostFrame(options.documentObject);

  options.documentObject.body.appendChild(hostFrame);
  try {
    await urlForensicsInboxBrowserFixtureValidationLoadFrameMarkup(hostFrame, fixtureDefinition.sourceHtml);
    if (!hostFrame.contentDocument) {
      throw new Error("Fixture frame document is unavailable.");
    }

    hostFrame.contentDocument.title = String(fixtureDefinition.title || fixtureDefinition.providerId || "Fixture");
    urlForensicsInboxBrowserFixtureValidationInstallDocumentStyles(
      hostFrame.contentDocument,
      fixtureDefinition.expectedSelectors
    );
    await urlForensicsInboxBrowserFixtureValidationApplyNestedFrames(fixtureDefinition, hostFrame.contentDocument);

    return {
      cleanup: function cleanup() {
        hostFrame.remove();
      },
      documentObject: hostFrame.contentDocument,
      windowObject: Object.freeze({
        innerHeight: hostFrame.clientHeight || 900,
        location: urlForensicsInboxBrowserFixtureValidationBuildSyntheticLocation(fixtureDefinition.fixtureUrl)
      })
    };
  } catch (error) {
    hostFrame.remove();
    throw error;
  }
}

function urlForensicsInboxBrowserFixtureValidationCreateSummaryController(fixtureEnvironment, options) {
  return options.emailRootSummary.create({
    windowObject: fixtureEnvironment.windowObject,
    documentObject: fixtureEnvironment.documentObject,
    cleanInputText: options.mergedLinkLabPipeline.cleanInputText,
    analyzeInput: function analyzeInput(input) {
      return options.mergedLinkLabPipeline.analyzeInput(input);
    },
    getPipelineSettings: function getPipelineSettings() {
      return {};
    },
    getNow: options.getNow,
    inboxHostPattern: options.inboxDetectors.patterns.inboxHost,
    topicDigestLabelPattern: options.inboxDetectors.patterns.topicDigestLabel,
    topicDigestActionPattern: options.inboxDetectors.patterns.topicDigestAction
  });
}

function urlForensicsInboxBrowserFixtureValidationBuildActualFixtureResult(
  fixtureDefinition,
  options,
  fixtureEnvironment,
  candidates,
  primaryCandidate,
  detectionFailure,
  snapshot
) {
  return {
    providerId: fixtureDefinition.providerId,
    providerKey: options.inboxDetectors.getInboxProviderKey(fixtureEnvironment.windowObject.location),
    candidateCount: candidates.length,
    failureKind: detectionFailure && detectionFailure.kind ? detectionFailure.kind : "",
    primaryTagName:
      primaryCandidate && primaryCandidate.root && primaryCandidate.root.tagName
        ? String(primaryCandidate.root.tagName).toUpperCase()
        : "",
    detectionMode: snapshot && snapshot.detectionMode ? snapshot.detectionMode : "",
    finalUrls: snapshot && snapshot.pipeline && Array.isArray(snapshot.pipeline.finalUrls)
      ? snapshot.pipeline.finalUrls.slice()
      : [],
    matchedRawTextFragments: (fixtureDefinition.expectedRawTextIncludes || []).filter(function keepMatchedFragment(fragment) {
      return !!(snapshot && snapshot.rawText && snapshot.rawText.indexOf(fragment) !== -1);
    })
  };
}

function urlForensicsInboxBrowserFixtureValidationCollectFixtureFailures(fixtureDefinition, actual) {
  const failures = [];

  if (actual.providerKey !== fixtureDefinition.providerId) {
    failures.push(
      "Expected fixture provider key " +
      JSON.stringify(fixtureDefinition.providerId) +
      " but received " +
      JSON.stringify(actual.providerKey) +
      "."
    );
  }

  if (actual.failureKind) {
    failures.push(
      "Expected no inbox detection failure for fixture " +
      JSON.stringify(fixtureDefinition.providerId) +
      " but received " +
      JSON.stringify(actual.failureKind) +
      "."
    );
  }

  if (actual.candidateCount < 1) {
    failures.push("Expected at least one inbox candidate for fixture " + JSON.stringify(fixtureDefinition.providerId) + ".");
  }

  if (actual.primaryTagName !== fixtureDefinition.expectedPrimaryTagName) {
    failures.push(
      "Expected primary candidate tag " +
      JSON.stringify(fixtureDefinition.expectedPrimaryTagName) +
      " but received " +
      JSON.stringify(actual.primaryTagName) +
      " for fixture " +
      JSON.stringify(fixtureDefinition.providerId) +
      "."
    );
  }

  if (actual.detectionMode !== fixtureDefinition.expectedDetectionMode) {
    failures.push(
      "Expected detection mode " +
      JSON.stringify(fixtureDefinition.expectedDetectionMode) +
      " but received " +
      JSON.stringify(actual.detectionMode) +
      " for fixture " +
      JSON.stringify(fixtureDefinition.providerId) +
      "."
    );
  }

  if (!urlForensicsInboxBrowserFixtureValidationArrayEquals(actual.finalUrls, fixtureDefinition.expectedFinalUrls || [])) {
    failures.push(
      "Expected final URLs " +
      JSON.stringify(fixtureDefinition.expectedFinalUrls || []) +
      " but received " +
      JSON.stringify(actual.finalUrls) +
      " for fixture " +
      JSON.stringify(fixtureDefinition.providerId) +
      "."
    );
  }

  if (!urlForensicsInboxBrowserFixtureValidationArrayEquals(
    actual.matchedRawTextFragments,
    fixtureDefinition.expectedRawTextIncludes || []
  )) {
    failures.push(
      "Expected snapshot raw text to include " +
      JSON.stringify(fixtureDefinition.expectedRawTextIncludes || []) +
      " but received " +
      JSON.stringify(actual.matchedRawTextFragments) +
      " for fixture " +
      JSON.stringify(fixtureDefinition.providerId) +
      "."
    );
  }

  return failures;
}

function urlForensicsInboxBrowserFixtureValidationCreateCandidateDiscoveryController(
  fixtureEnvironment,
  summaryController,
  options
) {
  const syntheticLocation = fixtureEnvironment.windowObject.location;

  return options.emailCandidateDiscovery.create({
    windowObject: fixtureEnvironment.windowObject,
    documentObject: fixtureEnvironment.documentObject,
    cleanInputText: options.mergedLinkLabPipeline.cleanInputText,
    getDetectionSearchRoots: function getDetectionSearchRoots(root) {
      return options.inboxDetectors.getDetectionSearchRoots(root || fixtureEnvironment.documentObject);
    },
    getEmailRootContentElement: summaryController.getEmailRootContentElement,
    measureElementText: summaryController.measureElementText,
    inboxHostPattern: options.inboxDetectors.patterns.inboxHost,
    readViewHintPattern: options.inboxDetectors.patterns.readViewHint,
    composeContextHintPattern: options.inboxDetectors.patterns.composeContextHint,
    standaloneEmailHintPattern: options.inboxDetectors.patterns.standaloneEmailHint,
    outlookMailBodySelector: options.inboxDetectors.selectors.outlookMailBody,
    inboxBodySelectors: options.inboxDetectors.selectors.inboxBody,
    standaloneEmailBodySelectors: options.inboxDetectors.selectors.standaloneEmailBody,
    genericInboxContainerSelectors: options.inboxDetectors.selectors.genericInboxContainer,
    explicitInboxBodySelectors: options.inboxDetectors.selectors.explicitInboxBody,
    getPrimaryInboxBodySelectors: function getPrimaryInboxBodySelectors() {
      return options.inboxDetectors.getPrimaryInboxBodySelectors(syntheticLocation);
    },
    getInboxProviderKey: function getInboxProviderKey() {
      return options.inboxDetectors.getInboxProviderKey(syntheticLocation);
    },
    listProviderDefinitions: options.inboxDetectors.listProviderDefinitions,
    isOutlookHost: function isOutlookHost() {
      return options.inboxDetectors.isOutlookHost(syntheticLocation);
    },
    isProtonHost: function isProtonHost() {
      return options.inboxDetectors.isProtonHost(syntheticLocation);
    },
    inboxCandidateMissingGraceMs: 4000,
    outlookCandidateMissingGraceMs: 12000,
    protonCandidateMissingGraceMs: 12000
  });
}

async function urlForensicsInboxBrowserFixtureValidationRunFixture(fixtureDefinition, options) {
  const fixtureEnvironment = await urlForensicsInboxBrowserFixtureValidationCreateFixtureEnvironment(
    fixtureDefinition,
    options
  );

  try {
    const summaryController = urlForensicsInboxBrowserFixtureValidationCreateSummaryController(
      fixtureEnvironment,
      options
    );
    const candidateDiscovery = urlForensicsInboxBrowserFixtureValidationCreateCandidateDiscoveryController(
      fixtureEnvironment,
      summaryController,
      options
    );
    const candidates = candidateDiscovery.getInboxRootCandidates();
    const primaryCandidate = candidateDiscovery.choosePrimaryEmailCandidate(candidates);
    const detectionFailure = candidateDiscovery.getInboxDetectionFailure(candidates);
    const snapshot = primaryCandidate && primaryCandidate.root
      ? summaryController.summarizeEmailRoot(primaryCandidate.root, primaryCandidate.detectionMode)
      : null;
    const actual = urlForensicsInboxBrowserFixtureValidationBuildActualFixtureResult(
      fixtureDefinition,
      options,
      fixtureEnvironment,
      candidates,
      primaryCandidate,
      detectionFailure,
      snapshot
    );
    const failures = urlForensicsInboxBrowserFixtureValidationCollectFixtureFailures(
      fixtureDefinition,
      actual
    );

    return {
      id: fixtureDefinition.providerId,
      title: fixtureDefinition.title,
      status: failures.length ? "failed" : "passed",
      actual: actual,
      failures: failures
    };
  } finally {
    fixtureEnvironment.cleanup();
  }
}

async function urlForensicsInboxBrowserFixtureValidationBuildReport(options) {
  urlForensicsInboxBrowserFixtureValidationAssertDependencies(options);

  const fixtureReports = [];
  const failures = [];

  for (const fixtureDefinition of options.fixtureData) {
    const fixtureReport = await urlForensicsInboxBrowserFixtureValidationRunFixture(fixtureDefinition, options);
    fixtureReports.push(fixtureReport);
    if (fixtureReport.failures.length) {
      failures.push.apply(failures, fixtureReport.failures);
    }
  }

  return {
    expected: {
      providerIds: options.fixtureData.map(function mapFixtureDefinition(fixtureDefinition) {
        return fixtureDefinition.providerId;
      }),
      failedProviderIds: []
    },
    actual: {
      fixtureCount: options.fixtureData.length,
      providers: fixtureReports
    },
    failures: failures
  };
}

function urlForensicsInboxBrowserFixtureValidationCreate(options) {
  const resolvedOptions = urlForensicsInboxBrowserFixtureValidationCreateDefaultOptions(options);

  return Object.freeze({
    buildReport: async function buildReport() {
      return urlForensicsInboxBrowserFixtureValidationBuildReport(resolvedOptions);
    }
  });
}

(function attachUrlForensicsInboxBrowserFixtureValidation(globalScope) {
  const inboxBrowserFixtureValidation = Object.freeze({
    create: urlForensicsInboxBrowserFixtureValidationCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = inboxBrowserFixtureValidation;
  }

  if (globalScope) {
    globalScope.urlForensicsInboxBrowserFixtureValidation = inboxBrowserFixtureValidation;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
