// Function: wire extension page navigation buttons.
(function initializeExtensionPageNavigation() {
  "use strict";

  const extensionApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);

  function resolvePageUrl(pageHref) {
    const safePageHref = String(pageHref || "").replace(/^\.\//, "");

    if (extensionApi && extensionApi.runtime && typeof extensionApi.runtime.getURL === "function") {
      return extensionApi.runtime.getURL(safePageHref);
    }

    return pageHref;
  }

  function openPage(button) {
    const pageHref = button.getAttribute("data-page-href");
    const pageTarget = button.getAttribute("data-page-target");

    if (!pageHref) {
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
})();
