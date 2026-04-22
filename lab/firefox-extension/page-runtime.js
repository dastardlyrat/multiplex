"use strict";

function urlForensicsPageRuntimeResolveExtensionApi(globalScope) {
  if (globalScope && globalScope.browser) {
    return globalScope.browser;
  }

  if (globalScope && globalScope.chrome) {
    return globalScope.chrome;
  }

  if (typeof browser !== "undefined") {
    return browser;
  }

  if (typeof chrome !== "undefined") {
    return chrome;
  }

  return null;
}

function urlForensicsPageRuntimeCreate(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const globalScope = Object.prototype.hasOwnProperty.call(optionBag, "globalScope")
    ? optionBag.globalScope
    : (typeof globalThis !== "undefined" ? globalThis : null);
  const pageUi = optionBag.pageUi || (globalScope ? globalScope.urlForensicsPageUi : null);

  if (optionBag.requirePageUi !== false && !pageUi) {
    throw new Error("URL Forensics page UI helpers are unavailable.");
  }

  return Object.freeze({
    extensionApi: optionBag.extensionApi || urlForensicsPageRuntimeResolveExtensionApi(globalScope),
    pageUi: pageUi,
    debugApi: optionBag.debugApi || (globalScope ? globalScope.mergedLinkLabDebug || null : null)
  });
}

(function attachUrlForensicsPageRuntime(globalScope) {
  const pageRuntime = Object.freeze({
    create: urlForensicsPageRuntimeCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pageRuntime;
  }

  if (globalScope) {
    globalScope.urlForensicsPageRuntime = pageRuntime;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
