// Function: wire extension page navigation buttons.
(function initializeExtensionPageNavigation() {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : null;
  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const mobileHiddenPageHrefs = Object.freeze({
    "test-suite.html": true,
    "sample-review.html": true,
    "debugging.html": true,
    "help.html": true
  });
  const mobileDeviceHelper = globalScope && globalScope.urlForensicsMobileDevice
    ? globalScope.urlForensicsMobileDevice
    : null;

  function normalizePageHref(pageHref) {
    return String(pageHref || "")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "")
      .split("#")[0]
      .split("?")[0];
  }

  function isMobileDeviceDetected(windowObject, navigatorObject) {
    return !!(
      mobileDeviceHelper &&
      typeof mobileDeviceHelper.isMobileDeviceDetected === "function" &&
      mobileDeviceHelper.isMobileDeviceDetected(windowObject, navigatorObject)
    );
  }

  function isMobileHiddenPageHref(pageHref) {
    return mobileHiddenPageHrefs[normalizePageHref(pageHref)] === true;
  }

  function setMobileHiddenState(element, shouldHide) {
    if (!element) {
      return;
    }

    element.hidden = shouldHide === true;
    element.setAttribute("aria-hidden", shouldHide === true ? "true" : "false");

    if ("disabled" in element) {
      element.disabled = shouldHide === true;
    }
  }

  function applyMobileNavigationVisibility(documentObject, isMobileDevice) {
    const safeDocument = documentObject || (typeof document !== "undefined" ? document : null);

    if (!safeDocument || typeof safeDocument.querySelectorAll !== "function") {
      return 0;
    }

    let hiddenCount = 0;
    Array.from(safeDocument.querySelectorAll("button[data-page-href]")).forEach(function updateNavigationButton(button) {
      const shouldHide = isMobileDevice === true && isMobileHiddenPageHref(button.getAttribute("data-page-href"));
      setMobileHiddenState(button, shouldHide);

      if (shouldHide) {
        hiddenCount += 1;
      }
    });

    return hiddenCount;
  }

  function resolvePageUrl(pageHref) {
    const safePageHref = normalizePageHref(pageHref);

    if (extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getURL === "function") {
      return extensionApi.runtime.getURL(safePageHref);
    }

    return pageHref;
  }

  function openPage(button) {
    const pageHref = button.getAttribute("data-page-href");
    const pageTarget = button.getAttribute("data-page-target");

    if (!pageHref || button.hidden || button.getAttribute("aria-hidden") === "true") {
      return;
    }

    const pageUrl = resolvePageUrl(pageHref);

    if (pageTarget === "_blank") {
      if (extensionApi && extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        extensionApi.tabs.create({ url: pageUrl });
        return;
      }

      window.open(pageUrl, "_blank", "noopener");
      return;
    }

    window.location.href = pageUrl;
  }

  document.addEventListener("click", function handlePageNavigationClick(event) {
    const button = event.target && typeof event.target.closest === "function"
      ? event.target.closest("button[data-page-href]")
      : null;

    if (!button) {
      return;
    }

    event.preventDefault();
    openPage(button);
  });

  applyMobileNavigationVisibility(document, isMobileDeviceDetected());

  if (globalScope) {
    globalScope.urlForensicsPageNavigation = Object.freeze({
      applyMobileNavigationVisibility: applyMobileNavigationVisibility,
      isMobileDeviceDetected: isMobileDeviceDetected,
      isMobileHiddenPageHref: isMobileHiddenPageHref,
      normalizePageHref: normalizePageHref
    });
  }
})();
