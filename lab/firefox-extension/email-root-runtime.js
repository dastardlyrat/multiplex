"use strict";

function urlForensicsEmailRootRuntimeResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsEmailRootRuntimeBuildEnvironmentOptions(optionBag) {
  return {
    mutationObserverClass:
      optionBag.mutationObserverClass ||
      (typeof MutationObserver === "function" ? MutationObserver : null),
    replaceElementMarkup: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.replaceElementMarkup,
      function replaceMissingElementMarkup() {}
    ),
    syncEmailSnapshot: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.syncEmailSnapshot,
      function syncMissingEmailSnapshot() {
        return false;
      }
    ),
    summarizeEmailRoot: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.summarizeEmailRoot,
      function summarizeMissingEmailRoot(root, detectionMode) {
        return {
          detectedAt: Date.now(),
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
    ),
    publishSnapshot: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.publishSnapshot,
      async function publishMissingSnapshot() {}
    ),
    scheduleSnapshotSync: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.scheduleSnapshotSync,
      function scheduleMissingSnapshotSync() {
        return 0;
      }
    ),
    shouldReplaceEmailBodyWithMirrorContent: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.shouldReplaceEmailBodyWithMirrorContent,
      function shouldNotReplaceEmailBodyWithMirrorContent() {
        return false;
      }
    )
  };
}

function urlForensicsEmailRootRuntimeBuildStateOptions(optionBag) {
  return {
    getLatestSnapshot: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getLatestSnapshot,
      function getMissingLatestSnapshot() {
        return null;
      }
    ),
    getLatestDetectedEmailRoot: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getLatestDetectedEmailRoot,
      function getMissingLatestDetectedEmailRoot() {
        return null;
      }
    ),
    setLatestDetectedEmailRoot: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.setLatestDetectedEmailRoot,
      function setMissingLatestDetectedEmailRoot() {}
    ),
    getLatestDetectedEmailMode: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getLatestDetectedEmailMode,
      function getMissingLatestDetectedEmailMode() {
        return "";
      }
    ),
    setLatestDetectedEmailMode: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.setLatestDetectedEmailMode,
      function setMissingLatestDetectedEmailMode() {}
    )
  };
}

function urlForensicsEmailRootRuntimeBuildDetectionOptions(optionBag) {
  return {
    choosePrimaryEmailCandidate: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.choosePrimaryEmailCandidate,
      function chooseMissingPrimaryEmailCandidate(candidates) {
        return Array.isArray(candidates) && candidates.length ? candidates[0] : null;
      }
    ),
    getInboxRootCandidates: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getInboxRootCandidates,
      function getMissingInboxRootCandidates() {
        return [];
      }
    ),
    getEmailRootHtmlMarkup: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getEmailRootHtmlMarkup,
      function getMissingEmailRootHtmlMarkup() {
        return "";
      }
    ),
    getEmailRootContentElement: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getEmailRootContentElement,
      function getMissingEmailRootContentElement(element) {
        return element || null;
      }
    ),
    getIframeEmailRootContentElement: urlForensicsEmailRootRuntimeResolveFunction(
      optionBag.getIframeEmailRootContentElement,
      function getMissingIframeEmailRootContentElement() {
        return null;
      }
    )
  };
}

function urlForensicsEmailRootRuntimeCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze(Object.assign(
    {},
    urlForensicsEmailRootRuntimeBuildEnvironmentOptions(optionBag),
    urlForensicsEmailRootRuntimeBuildStateOptions(optionBag),
    urlForensicsEmailRootRuntimeBuildDetectionOptions(optionBag)
  ));
}

function urlForensicsEmailRootRuntimeGetPrimaryCandidate(options) {
  return options.choosePrimaryEmailCandidate(options.getInboxRootCandidates());
}

function urlForensicsEmailRootRuntimeGetActiveEmailRoot(options) {
  const latestDetectedEmailRoot = options.getLatestDetectedEmailRoot();

  if (latestDetectedEmailRoot && latestDetectedEmailRoot.isConnected) {
    return latestDetectedEmailRoot;
  }

  const primaryCandidate = urlForensicsEmailRootRuntimeGetPrimaryCandidate(options);
  return primaryCandidate ? primaryCandidate.root : null;
}

function urlForensicsEmailRootRuntimeObserve(root, options, observedEmailRoots) {
  const MutationObserverClass = options.mutationObserverClass;

  if (!root || observedEmailRoots.has(root)) {
    return;
  }

  observedEmailRoots.add(root);

  if (typeof MutationObserverClass !== "function") {
    return;
  }

  const rootObserver = new MutationObserverClass(function scheduleAfterRootMutation() {
    options.scheduleSnapshotSync();
  });

  rootObserver.observe(root, {
    childList: true,
    characterData: true,
    subtree: true
  });

  if (String(root.tagName || "").toUpperCase() === "IFRAME") {
    const attachIframeContentObserver = function attachIframeContentObserver() {
      const iframeContentRoot = options.getIframeEmailRootContentElement(root);

      if (!iframeContentRoot) {
        return;
      }

      const iframeObserver = new MutationObserverClass(function scheduleAfterIframeMutation() {
        options.scheduleSnapshotSync();
      });

      iframeObserver.observe(iframeContentRoot, {
        childList: true,
        characterData: true,
        subtree: true
      });
    };

    if (typeof root.addEventListener === "function") {
      root.addEventListener("load", function scheduleAfterIframeLoad() {
        attachIframeContentObserver();
        options.scheduleSnapshotSync();
      }, true);
    }

    attachIframeContentObserver();
  }
}

async function urlForensicsEmailRootRuntimeApplyRewrite(options, observedEmailRoots) {
  if (!options.getLatestSnapshot()) {
    options.syncEmailSnapshot();
  }

  const latestSnapshot = options.getLatestSnapshot();
  const latestDetectedEmailRoot = options.getLatestDetectedEmailRoot();
  const fallbackEmailCandidate = urlForensicsEmailRootRuntimeGetPrimaryCandidate(options);
  const activeEmailRoot = latestDetectedEmailRoot && latestDetectedEmailRoot.isConnected
    ? latestDetectedEmailRoot
    : (fallbackEmailCandidate ? fallbackEmailCandidate.root : null);

  if ((!latestDetectedEmailRoot || !latestDetectedEmailRoot.isConnected) && fallbackEmailCandidate) {
    options.setLatestDetectedEmailRoot(fallbackEmailCandidate.root);
    options.setLatestDetectedEmailMode(fallbackEmailCandidate.detectionMode || options.getLatestDetectedEmailMode());
  }

  if (!activeEmailRoot || !latestSnapshot || !latestSnapshot.pipeline) {
    return { ok: false, applied: false };
  }

  const rewrittenHtml = latestSnapshot.pipeline.rewrittenHtml || "";
  if (!rewrittenHtml) {
    return { ok: false, applied: false, snapshot: latestSnapshot };
  }

  if (options.getEmailRootHtmlMarkup(activeEmailRoot) === rewrittenHtml) {
    const refreshedSnapshot = options.summarizeEmailRoot(activeEmailRoot, options.getLatestDetectedEmailMode());
    await options.publishSnapshot(refreshedSnapshot);
    return { ok: true, applied: false, snapshot: refreshedSnapshot };
  }

  options.replaceElementMarkup(options.getEmailRootContentElement(activeEmailRoot), rewrittenHtml);
  options.setLatestDetectedEmailRoot(activeEmailRoot);
  urlForensicsEmailRootRuntimeObserve(activeEmailRoot, options, observedEmailRoots);

  const refreshedSnapshot = options.summarizeEmailRoot(activeEmailRoot, options.getLatestDetectedEmailMode());
  await options.publishSnapshot(refreshedSnapshot);
  options.scheduleSnapshotSync();

  return { ok: true, applied: true, snapshot: refreshedSnapshot };
}

async function urlForensicsEmailRootRuntimeMaybeReplace(snapshot, options, observedEmailRoots) {
  const activeEmailRoot = urlForensicsEmailRootRuntimeGetActiveEmailRoot(options);
  const rewrittenHtml = snapshot && snapshot.pipeline ? String(snapshot.pipeline.rewrittenHtml || "") : "";

  if (!options.shouldReplaceEmailBodyWithMirrorContent(snapshot) || !activeEmailRoot || !rewrittenHtml) {
    return { ok: false, applied: false, snapshot: snapshot || null };
  }

  if (options.getEmailRootHtmlMarkup(activeEmailRoot) === rewrittenHtml) {
    return { ok: true, applied: false, snapshot: snapshot };
  }

  return urlForensicsEmailRootRuntimeApplyRewrite(options, observedEmailRoots);
}

function urlForensicsEmailRootRuntimeCreate(options) {
  const resolvedOptions = urlForensicsEmailRootRuntimeCreateDefaultOptions(options);
  const observedEmailRoots = new WeakSet();

  return Object.freeze({
    applyRewriteToEmailBody: function applyRewriteToEmailBody() {
      return urlForensicsEmailRootRuntimeApplyRewrite(resolvedOptions, observedEmailRoots);
    },
    getActiveEmailRoot: function getActiveEmailRoot() {
      return urlForensicsEmailRootRuntimeGetActiveEmailRoot(resolvedOptions);
    },
    maybeReplaceEmailBodyWithMirrorContent: function maybeReplaceEmailBodyWithMirrorContent(snapshot) {
      return urlForensicsEmailRootRuntimeMaybeReplace(snapshot, resolvedOptions, observedEmailRoots);
    },
    observeEmailRoot: function observeEmailRoot(root) {
      return urlForensicsEmailRootRuntimeObserve(root, resolvedOptions, observedEmailRoots);
    }
  });
}

(function attachUrlForensicsEmailRootRuntime(globalScope) {
  const emailRootRuntime = Object.freeze({
    create: urlForensicsEmailRootRuntimeCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailRootRuntime;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailRootRuntime = emailRootRuntime;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
