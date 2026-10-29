"use strict";

function urlForensicsSidepanelBrowserValidationResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsSidepanelBrowserValidationResolveGlobalDependency(optionBag, optionKey, globalScope, globalKey) {
  if (optionBag[optionKey]) {
    return optionBag[optionKey];
  }

  return globalScope ? globalScope[globalKey] || null : null;
}

function urlForensicsSidepanelBrowserValidationCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const globalScope = optionBag.globalScope || (typeof globalThis !== "undefined" ? globalThis : null);

  return Object.freeze({
    globalScope: globalScope,
    documentObject: optionBag.documentObject || (globalScope ? globalScope.document || null : null),
    pageUi: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pageUi",
      globalScope,
      "urlForensicsPageUi"
    ),
    mergedLinkLabPipeline: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "mergedLinkLabPipeline",
      globalScope,
      "MergedLinkLabPipeline"
    ),
    pagePaneShell: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneShell",
      globalScope,
      "urlForensicsPagePaneShell"
    ),
    pagePaneBootstrap: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneBootstrap",
      globalScope,
      "urlForensicsPagePaneBootstrap"
    ),
    pagePaneAssembly: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneAssembly",
      globalScope,
      "urlForensicsPagePaneAssembly"
    ),
    pagePaneLayout: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneLayout",
      globalScope,
      "urlForensicsPagePaneLayout"
    ),
    pagePaneMirror: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneMirror",
      globalScope,
      "urlForensicsPagePaneMirror"
    ),
    pagePaneDiagnostics: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneDiagnostics",
      globalScope,
      "urlForensicsPagePaneDiagnostics"
    ),
    pagePaneSnapshot: urlForensicsSidepanelBrowserValidationResolveGlobalDependency(
      optionBag,
      "pagePaneSnapshot",
      globalScope,
      "urlForensicsPagePaneSnapshot"
    ),
    getNow: urlForensicsSidepanelBrowserValidationResolveFunction(
      optionBag.getNow,
      function getDefaultNow() {
        return Date.now();
      }
    )
  });
}

function urlForensicsSidepanelBrowserValidationAssertDependencies(options) {
  if (!options.documentObject || typeof options.documentObject.createElement !== "function") {
    throw new Error("URL Forensics sidepanel browser validation requires a browser document.");
  }

  if (!options.mergedLinkLabPipeline || typeof options.mergedLinkLabPipeline.analyzeInput !== "function") {
    throw new Error("URL Forensics pipeline is unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneShell || typeof options.pagePaneShell.buildPaneMarkup !== "function") {
    throw new Error("URL Forensics page pane shell helpers are unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneBootstrap || typeof options.pagePaneBootstrap.initialize !== "function") {
    throw new Error("URL Forensics page pane bootstrap helpers are unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneAssembly || typeof options.pagePaneAssembly.create !== "function") {
    throw new Error("URL Forensics page pane assembly helpers are unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneLayout || typeof options.pagePaneLayout.create !== "function") {
    throw new Error("URL Forensics page pane layout helpers are unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneMirror || typeof options.pagePaneMirror.create !== "function") {
    throw new Error("URL Forensics page pane mirror helpers are unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneDiagnostics || typeof options.pagePaneDiagnostics.create !== "function") {
    throw new Error("URL Forensics page pane diagnostics helpers are unavailable for sidepanel browser validation.");
  }

  if (!options.pagePaneSnapshot || typeof options.pagePaneSnapshot.create !== "function") {
    throw new Error("URL Forensics page pane snapshot helpers are unavailable for sidepanel browser validation.");
  }
}

function urlForensicsSidepanelBrowserValidationCreateHostFrame(documentObject) {
  const frameElement = documentObject.createElement("iframe");

  frameElement.setAttribute("aria-hidden", "true");
  frameElement.tabIndex = -1;
  frameElement.style.position = "fixed";
  frameElement.style.left = "-20000px";
  frameElement.style.top = "0";
  frameElement.style.width = "1440px";
  frameElement.style.height = "960px";
  frameElement.style.opacity = "0";
  frameElement.style.pointerEvents = "none";
  frameElement.style.border = "0";

  return frameElement;
}

function urlForensicsSidepanelBrowserValidationWaitForFrameLoad(frameElement, timeoutMs) {
  const safeTimeoutMs = Number(timeoutMs) || 4000;

  return new Promise(function waitForFrameResolve(resolve, reject) {
    const timeoutId = setTimeout(function rejectFrameLoad() {
      cleanup();
      reject(new Error("Timed out waiting for sidepanel validation frame load."));
    }, safeTimeoutMs);

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
      reject(new Error("Sidepanel validation frame failed to load."));
    }

    frameElement.addEventListener("load", handleLoad, true);
    frameElement.addEventListener("error", handleError, true);
  });
}

async function urlForensicsSidepanelBrowserValidationLoadFrameMarkup(frameElement, markup) {
  const loadPromise = urlForensicsSidepanelBrowserValidationWaitForFrameLoad(frameElement, 4000);
  frameElement.srcdoc = String(markup || "");
  await loadPromise;
  return frameElement;
}

function urlForensicsSidepanelBrowserValidationWaitForCondition(checkCondition, failureMessage) {
  return new Promise(function waitForConditionResolve(resolve, reject) {
    const startedAt = Date.now();

    function poll() {
      if (checkCondition()) {
        resolve(true);
        return;
      }

      if ((Date.now() - startedAt) >= 4000) {
        reject(new Error(failureMessage));
        return;
      }

      setTimeout(poll, 20);
    }

    poll();
  });
}

function urlForensicsSidepanelBrowserValidationReplaceElementMarkup(targetElement, htmlMarkup) {
  if (targetElement && typeof targetElement.innerHTML === "string") {
    targetElement.innerHTML = String(htmlMarkup || "");
  }
}

function urlForensicsSidepanelBrowserValidationFormatTimingValue(timingValue) {
  const safeTimingValue = Number(timingValue);
  return Number.isFinite(safeTimingValue) ? String(Math.round(safeTimingValue)) + " ms" : "Unavailable";
}

function urlForensicsSidepanelBrowserValidationFormatTrackingFilters() {
  return "Built-in defaults";
}

function urlForensicsSidepanelBrowserValidationBuildSnapshot(options) {
  const sourceHtml = [
    "<article class=\"fixture-message\">",
    "  <p>Read the release notes at <a href=\"https://example.com/path/article?utm_source=newsletter&ref=qa#section\">release notes</a>.</p>",
    "</article>"
  ].join("");
  const rawText = "Read the release notes at https://example.com/path/article?utm_source=newsletter&ref=qa#section.";
  const pipelineResult = options.mergedLinkLabPipeline.analyzeInput({
    rawText: rawText,
    sourceHtml: sourceHtml,
    options: {}
  });

  return {
    id: "browser-sidepanel-fixture",
    detectedAt: new Date(options.getNow()).toISOString(),
    detectionMode: "inbox-read",
    sectionLabel: "Browser validation message",
    rawText: pipelineResult.rawText,
    sourceHtml: sourceHtml,
    pipeline: pipelineResult,
    pipelineSettings: pipelineResult.options || {},
    isTopicDigest: false
  };
}

async function urlForensicsSidepanelBrowserValidationCreateEnvironment(options) {
  const hostFrame = urlForensicsSidepanelBrowserValidationCreateHostFrame(options.documentObject);

  options.documentObject.body.appendChild(hostFrame);
  try {
    await urlForensicsSidepanelBrowserValidationLoadFrameMarkup(
      hostFrame,
      [
        "<!doctype html>",
        "<html>",
        "<head>",
        "  <meta charset=\"utf-8\">",
        "  <style>",
        "    html, body { margin: 0; padding: 0; min-height: 100%; background: #ffffff; color: #111111; }",
        "    body { width: 1360px; min-height: 920px; box-sizing: border-box; padding: 24px; font: 16px/1.6 Arial, sans-serif; }",
        "    #active-email-root { display: block; box-sizing: border-box; width: 760px; min-height: 280px; padding: 18px; border: 1px solid #d0d7de; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <main id=\"fixture-root\">",
        "    <article id=\"active-email-root\">Fixture host email body</article>",
        "  </main>",
        "</body>",
        "</html>"
      ].join("")
    );

    if (!hostFrame.contentDocument || !hostFrame.contentWindow) {
      throw new Error("Sidepanel validation host frame is unavailable.");
    }

    return {
      cleanup: function cleanup() {
        hostFrame.remove();
      },
      documentObject: hostFrame.contentDocument,
      windowObject: hostFrame.contentWindow,
      activeEmailRoot: hostFrame.contentDocument.getElementById("active-email-root")
    };
  } catch (error) {
    hostFrame.remove();
    throw error;
  }
}

function urlForensicsSidepanelBrowserValidationFindTabButton(elements, tabKey) {
  return (Array.isArray(elements.tabButtons) ? elements.tabButtons : []).find(function findMatchingTabButton(tabButton) {
    return tabButton && typeof tabButton.getAttribute === "function" && tabButton.getAttribute("data-tab-button") === tabKey;
  }) || null;
}

function urlForensicsSidepanelBrowserValidationFindTabPanel(elements, tabKey) {
  return (Array.isArray(elements.tabPanels) ? elements.tabPanels : []).find(function findMatchingTabPanel(tabPanel) {
    return tabPanel && typeof tabPanel.getAttribute === "function" && tabPanel.getAttribute("data-tab-panel") === tabKey;
  }) || null;
}

function urlForensicsSidepanelBrowserValidationCreateState() {
  return {
    latestSnapshot: null,
    lastPublishedSnapshotSignature: "",
    didAutoExpandBuiltInTestPagePane: false,
    runtimeMessages: [],
    replaceCalls: [],
    paneElements: {
      root: null,
      activeTabKey: "converted",
      hoverLinkPanelExpanded: false,
      isExpanded: false,
      currentPaneKey: "",
      labFrameLoaded: false
    },
    controllerRefs: {
      clearPane: function clearPane() {},
      forceRefreshCurrentSnapshot: function forceRefreshCurrentSnapshot() {},
      syncLabFrameWithSnapshot: function syncLabFrameWithSnapshot() {
        return false;
      },
      bindHoverInspector: function bindHoverInspector() {},
      syncHoverLinkExpanded: function syncHoverLinkExpanded() {},
      setPaneExpanded: function setPaneExpanded() {},
      syncPageViewportReservation: function syncPageViewportReservation() {}
    }
  };
}

function urlForensicsSidepanelBrowserValidationCreatePaneAssembly(state, environment, options) {
  return options.pagePaneAssembly.create({
    documentObject: environment.documentObject,
    elements: state.paneElements,
    labFrameUrl: "about:blank",
    buildPaneMarkup: options.pagePaneShell.buildPaneMarkup,
    collectPaneElements: options.pagePaneShell.collectElements,
    initializePaneBootstrap: options.pagePaneBootstrap.initialize,
    replaceElementMarkup: urlForensicsSidepanelBrowserValidationReplaceElementMarkup,
    syncHoverLinkExpanded: function syncHoverLinkExpanded(isExpanded) {
      state.controllerRefs.syncHoverLinkExpanded(isExpanded);
    },
    bindHoverInspector: function bindHoverInspector() {
      state.controllerRefs.bindHoverInspector();
    },
    syncLabFrameWithSnapshot: function syncLabFrameWithSnapshot(activeSnapshot) {
      return state.controllerRefs.syncLabFrameWithSnapshot(activeSnapshot);
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return state.latestSnapshot;
    },
    setPaneExpanded: function setPaneExpanded(isExpanded) {
      state.controllerRefs.setPaneExpanded(isExpanded);
    },
    syncPageViewportReservation: function syncPageViewportReservation() {
      state.controllerRefs.syncPageViewportReservation();
    },
    openSettingsPage: async function openSettingsPage() {},
    forceRefreshCurrentSnapshot: function forceRefreshCurrentSnapshot() {
      state.controllerRefs.forceRefreshCurrentSnapshot();
    },
    clearPane: function clearPane() {
      state.controllerRefs.clearPane();
    }
  });
}

function urlForensicsSidepanelBrowserValidationCreatePaneDiagnostics(snapshot, options) {
  return options.pagePaneDiagnostics.create({
    extensionManifest: {
      name: "URL Forensics Workbench",
      version: "0.3.0"
    },
    extensionSettings: {
      replaceEmailBodyWithMirrorContent: true,
      autoApplyMirrorForConfiguredSenders: false,
      autoApplyMirrorSenderEmailList: []
    },
    extensionStorageSnapshot: {
      values: {
        trackingParameterFilters: {}
      }
    },
    getPipelineSettings: function getPipelineSettings() {
      return snapshot.pipelineSettings;
    },
    formatTrackingParameterFilterSnapshotEntry: urlForensicsSidepanelBrowserValidationFormatTrackingFilters,
    formatTimingValue: urlForensicsSidepanelBrowserValidationFormatTimingValue,
    formatTimestamp:
      options.pageUi && typeof options.pageUi.formatTimestamp === "function"
        ? options.pageUi.formatTimestamp
        : function formatTimestampFallback(timestampValue) {
          return String(timestampValue || "Unavailable");
        },
    getNavigationPerformanceEntry: function getNavigationPerformanceEntry() {
      return null;
    },
    getInboxDetectionFailure: function getInboxDetectionFailure() {
      return null;
    },
    replaceElementMarkup: urlForensicsSidepanelBrowserValidationReplaceElementMarkup
  });
}

function urlForensicsSidepanelBrowserValidationCreatePaneControllers(state, environment, options, snapshot, paneAssembly) {
  const paneMirror = options.pagePaneMirror.create({
    elements: state.paneElements,
    windowObject: environment.windowObject,
    DOMParserClass: environment.windowObject.DOMParser,
    escapeHtml: options.mergedLinkLabPipeline.escapeHtml,
    replaceElementMarkup: urlForensicsSidepanelBrowserValidationReplaceElementMarkup,
    classifyUrlValue: options.mergedLinkLabPipeline.classifyUrlValue,
    extractKnownTrackingParameterNames: options.mergedLinkLabPipeline.extractKnownTrackingParameterNames
  });
  const paneDiagnostics = urlForensicsSidepanelBrowserValidationCreatePaneDiagnostics(snapshot, options);
  const paneLayout = options.pagePaneLayout.create({
    elements: state.paneElements,
    ensurePane: function ensurePane() {
      return paneAssembly.ensurePane();
    },
    getLatestSnapshot: function getLatestSnapshot() {
      return state.latestSnapshot;
    },
    getActiveEmailRoot: function getActiveEmailRoot() {
      return environment.activeEmailRoot;
    },
    windowObject: environment.windowObject,
    documentObject: environment.documentObject,
    getVisiblePaneReservedWidth: function getVisiblePaneReservedWidth() {
      return 0;
    }
  });
  const paneSnapshot = options.pagePaneSnapshot.create({
    elements: state.paneElements,
    ensurePane: function ensurePane() {
      return paneAssembly.ensurePane();
    },
    paneMirror: paneMirror,
    diagnostics: paneDiagnostics,
    paneLayout: paneLayout,
    formatMetricCount: function formatMetricCount(countValue) {
      return String(Number(countValue) || 0) + " URLs";
    },
    formatRailBadgeCount: function formatRailBadgeCount(countValue) {
      return String(Number(countValue) || 0);
    },
    getBaseUrl: function getBaseUrl() {
      return environment.windowObject.location.href;
    },
    syncEmailSnapshot: function syncEmailSnapshot() {},
    maybeReplaceEmailBodyWithMirrorContent: async function maybeReplaceEmailBodyWithMirrorContent(activeSnapshot) {
      state.replaceCalls.push(activeSnapshot ? activeSnapshot.id : "");
    },
    isBuiltInTestSuitePage: function isBuiltInTestSuitePage() {
      return false;
    },
    createSnapshotSignature: function createSnapshotSignature(activeSnapshot) {
      return JSON.stringify([
        activeSnapshot ? activeSnapshot.id : "",
        activeSnapshot && activeSnapshot.pipeline && Array.isArray(activeSnapshot.pipeline.finalUrls)
          ? activeSnapshot.pipeline.finalUrls
          : []
      ]);
    },
    createSnapshotPaneKey: function createSnapshotPaneKey(activeSnapshot) {
      return activeSnapshot ? String(activeSnapshot.id || "") : "";
    },
    resetLatestEmailDetectionState: function resetLatestEmailDetectionState() {},
    getLatestSnapshot: function getLatestSnapshot() {
      return state.latestSnapshot;
    },
    setLatestSnapshot: function setLatestSnapshot(nextSnapshot) {
      state.latestSnapshot = nextSnapshot;
    },
    setLastPublishedSnapshotSignature: function setLastPublishedSnapshotSignature(signatureValue) {
      state.lastPublishedSnapshotSignature = signatureValue;
    },
    getDidAutoExpandBuiltInTestPagePane: function getDidAutoExpandBuiltInTestPagePane() {
      return state.didAutoExpandBuiltInTestPagePane;
    },
    setDidAutoExpandBuiltInTestPagePane: function setDidAutoExpandBuiltInTestPagePane(nextValue) {
      state.didAutoExpandBuiltInTestPagePane = !!nextValue;
    },
    sendRuntimeMessage: async function sendRuntimeMessage(message) {
      state.runtimeMessages.push(message && message.type ? message.type : "");
    }
  });

  return {
    paneDiagnostics: paneDiagnostics,
    paneLayout: paneLayout,
    paneMirror: paneMirror,
    paneSnapshot: paneSnapshot
  };
}

function urlForensicsSidepanelBrowserValidationWireControllerRefs(state, controllers) {
  state.controllerRefs.clearPane = function clearPane() {
    controllers.paneSnapshot.clearPane();
  };
  state.controllerRefs.forceRefreshCurrentSnapshot = function forceRefreshCurrentSnapshot() {
    controllers.paneSnapshot.forceRefreshCurrentSnapshot();
  };
  state.controllerRefs.syncLabFrameWithSnapshot = function syncLabFrameWithSnapshot(activeSnapshot) {
    return controllers.paneSnapshot.syncLabFrameWithSnapshot(activeSnapshot);
  };
  state.controllerRefs.bindHoverInspector = function bindHoverInspector() {
    controllers.paneMirror.bindHoverInspector();
  };
  state.controllerRefs.syncHoverLinkExpanded = function syncHoverLinkExpanded(isExpanded) {
    controllers.paneMirror.setHoverLinkPanelExpanded(isExpanded);
  };
  state.controllerRefs.setPaneExpanded = function setPaneExpanded(isExpanded) {
    controllers.paneLayout.setPaneExpanded(isExpanded);
  };
  state.controllerRefs.syncPageViewportReservation = function syncPageViewportReservation() {
    controllers.paneLayout.syncPageViewportReservation();
  };
}

async function urlForensicsSidepanelBrowserValidationDrivePane(state, controllers, snapshot) {
  await controllers.paneSnapshot.publishSnapshot(snapshot);
  await urlForensicsSidepanelBrowserValidationWaitForCondition(
    function hasConvertedFrameDocument() {
      return !!(
        state.paneElements.convertedPane &&
        state.paneElements.convertedPane.contentDocument &&
        state.paneElements.convertedPane.contentDocument.body &&
        state.paneElements.convertedPane.contentDocument.body.querySelector("a[href]")
      );
    },
    "Timed out waiting for sidepanel mirror iframe content."
  );
  await urlForensicsSidepanelBrowserValidationWaitForCondition(
    function hasSeededHoverCopy() {
      return !!(
        state.paneElements.hoverLinkInfoValue &&
        state.paneElements.hoverLinkInfoValue.textContent &&
        state.paneElements.hoverLinkInfoValue.textContent.indexOf("Hover over a link to reveal URL components") !== -1
      );
    },
    "Timed out waiting for sidepanel hover inspector binding."
  );

  if (state.paneElements.railToggleButton && typeof state.paneElements.railToggleButton.click === "function") {
    state.paneElements.railToggleButton.click();
  }

  const mirrorDocument = state.paneElements.convertedPane.contentDocument;
  const mirrorAnchor = mirrorDocument.querySelector("a[href]");
  const mirrorWindow = state.paneElements.convertedPane.contentWindow;

  mirrorAnchor.dispatchEvent(new mirrorWindow.MouseEvent("mouseover", {
    bubbles: true,
    cancelable: true,
    view: mirrorWindow
  }));

  await urlForensicsSidepanelBrowserValidationWaitForCondition(
    function hasHoverDetails() {
      return !!(
        state.paneElements.hoverLinkInfoValue &&
        state.paneElements.hoverLinkInfoValue.textContent &&
        state.paneElements.hoverLinkInfoValue.textContent.indexOf("Protocol: https") !== -1
      );
    },
    "Timed out waiting for sidepanel hover details."
  );

  const diagnosticsButton = urlForensicsSidepanelBrowserValidationFindTabButton(state.paneElements, "diagnostics");
  if (diagnosticsButton && typeof diagnosticsButton.click === "function") {
    diagnosticsButton.click();
  }

  await urlForensicsSidepanelBrowserValidationWaitForCondition(
    function diagnosticsTabIsVisible() {
      const diagnosticsPanel = urlForensicsSidepanelBrowserValidationFindTabPanel(state.paneElements, "diagnostics");
      return !!(
        diagnosticsPanel &&
        diagnosticsPanel.getAttribute("aria-hidden") === "false" &&
        state.paneElements.diagnosticsPane &&
        state.paneElements.diagnosticsPane.textContent &&
        state.paneElements.diagnosticsPane.textContent.indexOf("URL Detection") !== -1
      );
    },
    "Timed out waiting for sidepanel diagnostics output."
  );

  return {
    mirrorAnchor: mirrorAnchor,
    mirrorDocument: mirrorDocument
  };
}

function urlForensicsSidepanelBrowserValidationBuildActualResult(details) {
  const diagnosticsText = details.elements.diagnosticsPane ? details.elements.diagnosticsPane.textContent || "" : "";
  const diagnosticsButton = urlForensicsSidepanelBrowserValidationFindTabButton(details.elements, "diagnostics");
  const diagnosticsPanel = urlForensicsSidepanelBrowserValidationFindTabPanel(details.elements, "diagnostics");
  const pipelineLines = details.snapshot.pipeline && details.snapshot.pipeline.diagnostics &&
    Array.isArray(details.snapshot.pipeline.diagnostics.lines)
      ? details.snapshot.pipeline.diagnostics.lines
      : [];
  const firstPipelineLine = pipelineLines[0] || "";

  return {
    paneMounted: !!(details.elements.root && details.elements.root.isConnected),
    railStatus: details.elements.railStatus ? details.elements.railStatus.textContent : "",
    railCount: details.elements.railCount ? details.elements.railCount.textContent : "",
    railExpanded: details.elements.railToggleButton
      ? details.elements.railToggleButton.getAttribute("aria-expanded")
      : "",
    mirrorAnchorHref: details.mirrorAnchor ? details.mirrorAnchor.href : "",
    expectedMirrorAnchorHref: details.snapshot.pipeline.finalUrls[0] || "",
    mirrorTextIncludesReleaseNotes: !!(
      details.mirrorDocument &&
      details.mirrorDocument.body &&
      details.mirrorDocument.body.textContent &&
      details.mirrorDocument.body.textContent.indexOf("release notes") !== -1
    ),
    hoverSummary: details.elements.hoverLinkInfoSummary ? details.elements.hoverLinkInfoSummary.textContent : "",
    hoverValue: details.elements.hoverLinkInfoValue ? details.elements.hoverLinkInfoValue.textContent : "",
    hoverHiddenOnDiagnostics: !!(details.elements.hoverLinkInfo && details.elements.hoverLinkInfo.hidden),
    diagnosticsTabSelected: diagnosticsButton ? diagnosticsButton.getAttribute("aria-selected") : "",
    diagnosticsPanelHidden: diagnosticsPanel ? diagnosticsPanel.getAttribute("aria-hidden") : "",
    diagnosticsTextIncludes: {
      title: diagnosticsText.indexOf("URL Detection") !== -1,
      detectionMode: diagnosticsText.indexOf("Detection Mode: inbox-read") !== -1,
      finalUrlCount: diagnosticsText.indexOf("Final URL Count: 1") !== -1,
      pipelineLine: firstPipelineLine ? diagnosticsText.indexOf(firstPipelineLine) !== -1 : false
    },
    runtimeMessages: details.runtimeMessages.slice(),
    replaceCallCount: details.replaceCalls.length
  };
}

function urlForensicsSidepanelBrowserValidationCollectFailures(actual) {
  const failures = [];

  if (!actual.paneMounted) {
    failures.push("Expected browser sidepanel validation to mount the actual pane shell.");
  }

  if (actual.railStatus !== "Email ready" || actual.railCount !== "1 URLs") {
    failures.push("Expected sidepanel rail metrics to reflect the published snapshot.");
  }

  if (actual.railExpanded !== "true") {
    failures.push("Expected the sidepanel rail toggle to expand the pane after click.");
  }

  if (!actual.mirrorTextIncludesReleaseNotes) {
    failures.push("Expected the mirror iframe to render the formatted email body content.");
  }

  if (actual.mirrorAnchorHref !== actual.expectedMirrorAnchorHref) {
    failures.push(
      "Expected the mirror iframe anchor href " +
      JSON.stringify(actual.expectedMirrorAnchorHref) +
      " but received " +
      JSON.stringify(actual.mirrorAnchorHref) +
      "."
    );
  }

  if (actual.hoverSummary.indexOf("Detection Type:") !== 0) {
    failures.push("Expected hover inspection to summarize the hovered link details.");
  }

  if (
    actual.hoverValue.indexOf("Protocol: https") === -1 ||
    actual.hoverValue.indexOf("Domain: example.com") === -1 ||
    actual.hoverValue.indexOf("Subfolder: /path") === -1 ||
    actual.hoverValue.indexOf("Slug: article") === -1 ||
    actual.hoverValue.indexOf("Other Parameters: ref=qa") === -1 ||
    actual.hoverValue.indexOf("Anchor: section") === -1
  ) {
    failures.push("Expected hover inspection details to expose protocol, domain, path, parameters, and anchor fields.");
  }

  if (actual.diagnosticsTabSelected !== "true" || actual.diagnosticsPanelHidden !== "false") {
    failures.push("Expected diagnostics tab activation to expose the diagnostics panel.");
  }

  if (!actual.hoverHiddenOnDiagnostics) {
    failures.push("Expected hover inspector details to hide while the diagnostics tab is active.");
  }

  Object.keys(actual.diagnosticsTextIncludes).forEach(function ensureDiagnosticsText(flagKey) {
    if (!actual.diagnosticsTextIncludes[flagKey]) {
      failures.push("Expected diagnostics output to include the " + flagKey + " field.");
    }
  });

  if (JSON.stringify(actual.runtimeMessages) !== JSON.stringify(["merged-link-lab:email-snapshot"])) {
    failures.push(
      "Expected sidepanel snapshot publish to emit one email-snapshot runtime message but received " +
      JSON.stringify(actual.runtimeMessages) +
      "."
    );
  }

  if (actual.replaceCallCount !== 1) {
    failures.push("Expected sidepanel snapshot publish to invoke mirror replacement exactly once.");
  }

  return failures;
}

async function urlForensicsSidepanelBrowserValidationRun(options) {
  urlForensicsSidepanelBrowserValidationAssertDependencies(options);
  const environment = await urlForensicsSidepanelBrowserValidationCreateEnvironment(options);

  try {
    const snapshot = urlForensicsSidepanelBrowserValidationBuildSnapshot(options);
    const state = urlForensicsSidepanelBrowserValidationCreateState();
    environment.activeEmailRoot.innerHTML = snapshot.sourceHtml;

    const paneAssembly = urlForensicsSidepanelBrowserValidationCreatePaneAssembly(state, environment, options);
    paneAssembly.ensurePane();

    const controllers = urlForensicsSidepanelBrowserValidationCreatePaneControllers(
      state,
      environment,
      options,
      snapshot,
      paneAssembly
    );
    urlForensicsSidepanelBrowserValidationWireControllerRefs(state, controllers);

    const drivenPane = await urlForensicsSidepanelBrowserValidationDrivePane(state, controllers, snapshot);
    const actual = urlForensicsSidepanelBrowserValidationBuildActualResult({
      elements: state.paneElements,
      mirrorAnchor: drivenPane.mirrorAnchor,
      mirrorDocument: drivenPane.mirrorDocument,
      runtimeMessages: state.runtimeMessages,
      replaceCalls: state.replaceCalls,
      snapshot: snapshot
    });
    const failures = urlForensicsSidepanelBrowserValidationCollectFailures(actual);

    return {
      expected: {
        paneMounted: true,
        railStatus: "Email ready",
        railCount: "1 URLs",
        railExpanded: "true",
        runtimeMessages: ["merged-link-lab:email-snapshot"],
        replaceCallCount: 1,
        diagnosticsTextIncludes: {
          title: true,
          detectionMode: true,
          finalUrlCount: true,
          pipelineLine: true
        }
      },
      actual: actual,
      failures: failures
    };
  } finally {
    environment.cleanup();
  }
}

function urlForensicsSidepanelBrowserValidationCreate(options) {
  const resolvedOptions = urlForensicsSidepanelBrowserValidationCreateDefaultOptions(options);

  return Object.freeze({
    buildReport: async function buildReport() {
      return urlForensicsSidepanelBrowserValidationRun(resolvedOptions);
    }
  });
}

(function attachUrlForensicsSidepanelBrowserValidation(globalScope) {
  const sidepanelBrowserValidation = Object.freeze({
    create: urlForensicsSidepanelBrowserValidationCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = sidepanelBrowserValidation;
  }

  if (globalScope) {
    globalScope.urlForensicsSidepanelBrowserValidation = sidepanelBrowserValidation;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
