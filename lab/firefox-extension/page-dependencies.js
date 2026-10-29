"use strict";

function urlForensicsPageDependenciesGetDependencyLabel(dependencyName) {
  const dependencyLabels = {
    storageModel: "storage model",
    detectorCatalog: "detector catalog",
    diagnosticsCatalogRows: "diagnostics catalog row helpers",
    diagnosticsHealthData: "diagnostics health data",
    settingsOpener: "settings opener",
    debugRedaction: "debug redaction helpers",
    testSuiteData: "test suite data",
    inboxFixtureData: "inbox fixture data",
    sampleReviewData: "sample review data"
  };

  return dependencyLabels[dependencyName] || dependencyName;
}

function urlForensicsPageDependenciesResolveDependency(optionBag, globalScope, dependencyName, globalPropertyName) {
  if (optionBag[dependencyName]) {
    return optionBag[dependencyName];
  }

  return globalScope ? globalScope[globalPropertyName] || null : null;
}

function urlForensicsPageDependenciesBuildResolvedDependencies(optionBag, globalScope) {
  const dependencyMappings = [
    ["storageModel", "urlForensicsStorageModel"],
    ["detectorCatalog", "urlForensicsDetectorCatalog"],
    ["diagnosticsCatalogRows", "urlForensicsDiagnosticsCatalogRows"],
    ["diagnosticsHealthData", "urlForensicsDiagnosticsHealthData"],
    ["settingsOpener", "urlForensicsSettingsOpener"],
    ["debugRedaction", "urlForensicsDebugRedaction"],
    ["testSuiteData", "urlForensicsTestSuiteData"],
    ["inboxFixtureData", "urlForensicsInboxFixtureData"],
    ["sampleReviewData", "urlForensicsSampleReviewData"]
  ];
  const resolvedDependencies = dependencyMappings.reduce(function reduceDependencyMapping(result, dependencyMapping) {
    result[dependencyMapping[0]] = urlForensicsPageDependenciesResolveDependency(
      optionBag,
      globalScope,
      dependencyMapping[0],
      dependencyMapping[1]
    );
    return result;
  }, Object.create(null));

  return Object.freeze(resolvedDependencies);
}

function urlForensicsPageDependenciesCreate(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const globalScope = Object.prototype.hasOwnProperty.call(optionBag, "globalScope")
    ? optionBag.globalScope
    : (typeof globalThis !== "undefined" ? globalThis : null);
  const pageDependencies = urlForensicsPageDependenciesBuildResolvedDependencies(optionBag, globalScope);

  (Array.isArray(optionBag.required) ? optionBag.required : []).forEach(function ensureRequiredDependency(dependencyName) {
    if (!pageDependencies[dependencyName]) {
      throw new Error("URL Forensics " + urlForensicsPageDependenciesGetDependencyLabel(dependencyName) + " is unavailable.");
    }
  });

  return pageDependencies;
}

(function attachUrlForensicsPageDependencies(globalScope) {
  const pageDependencies = Object.freeze({
    create: urlForensicsPageDependenciesCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pageDependencies;
  }

  if (globalScope) {
    globalScope.urlForensicsPageDependencies = pageDependencies;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
