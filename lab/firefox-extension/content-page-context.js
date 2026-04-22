"use strict";

function urlForensicsContentPageContextResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsContentPageContextCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    setLatestDetectedEmailRoot: urlForensicsContentPageContextResolveFunction(
      optionBag.setLatestDetectedEmailRoot,
      function setMissingLatestDetectedEmailRoot() {}
    ),
    setLatestDetectedEmailMode: urlForensicsContentPageContextResolveFunction(
      optionBag.setLatestDetectedEmailMode,
      function setMissingLatestDetectedEmailMode() {}
    ),
    setLatestInboxCandidateSeenAt: urlForensicsContentPageContextResolveFunction(
      optionBag.setLatestInboxCandidateSeenAt,
      function setMissingLatestInboxCandidateSeenAt() {}
    ),
    setInboxCandidateMissingSince: urlForensicsContentPageContextResolveFunction(
      optionBag.setInboxCandidateMissingSince,
      function setMissingInboxCandidateMissingSince() {}
    )
  });
}

function urlForensicsContentPageContextIsBuiltInTestSuitePage(options) {
  return !!(
    options.documentObject &&
    options.documentObject.body &&
    typeof options.documentObject.body.getAttribute === "function" &&
    options.documentObject.body.getAttribute("data-url-forensics-test-page") === "true"
  );
}

function urlForensicsContentPageContextIsPageCurrentlyVisible(options) {
  return !options.documentObject || options.documentObject.visibilityState !== "hidden";
}

function urlForensicsContentPageContextGetCurrentLocationHref(options) {
  return String(
    options.windowObject &&
    options.windowObject.location &&
    options.windowObject.location.href
      ? options.windowObject.location.href
      : ""
  );
}

function urlForensicsContentPageContextResetLatestEmailDetectionState(options) {
  options.setLatestDetectedEmailRoot(null);
  options.setLatestDetectedEmailMode("");
  options.setLatestInboxCandidateSeenAt(0);
  options.setInboxCandidateMissingSince(0);
}

function urlForensicsContentPageContextCreateSnapshotSignature(snapshot) {
  if (!snapshot) {
    return "";
  }

  return [
    snapshot.detectionMode || "",
    snapshot.sectionLabel || "",
    snapshot.sourceHtml || "",
    snapshot.isTopicDigest ? "topic-digest" : "standard"
  ].join("::");
}

function urlForensicsContentPageContextCreateSnapshotPaneKey(snapshot) {
  if (!snapshot) {
    return "";
  }

  return [
    snapshot.detectionMode || "",
    snapshot.sectionLabel || "",
    String(snapshot.rawText || "").slice(0, 240)
  ].join("::");
}

function urlForensicsContentPageContextCreate(options) {
  const resolvedOptions = urlForensicsContentPageContextCreateDefaultOptions(options);

  return Object.freeze({
    createSnapshotPaneKey: urlForensicsContentPageContextCreateSnapshotPaneKey,
    createSnapshotSignature: urlForensicsContentPageContextCreateSnapshotSignature,
    getCurrentLocationHref: function getCurrentLocationHref() {
      return urlForensicsContentPageContextGetCurrentLocationHref(resolvedOptions);
    },
    isBuiltInTestSuitePage: function isBuiltInTestSuitePage() {
      return urlForensicsContentPageContextIsBuiltInTestSuitePage(resolvedOptions);
    },
    isPageCurrentlyVisible: function isPageCurrentlyVisible() {
      return urlForensicsContentPageContextIsPageCurrentlyVisible(resolvedOptions);
    },
    resetLatestEmailDetectionState: function resetLatestEmailDetectionState() {
      return urlForensicsContentPageContextResetLatestEmailDetectionState(resolvedOptions);
    }
  });
}

(function attachUrlForensicsContentPageContext(globalScope) {
  const contentPageContext = Object.freeze({
    create: urlForensicsContentPageContextCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = contentPageContext;
  }

  if (globalScope) {
    globalScope.urlForensicsContentPageContext = contentPageContext;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
