// Shared opener for the extension Settings page.
(function initializeUrlForensicsSettingsOpener(globalScope) {
  "use strict";

  var openSettingsMessageType = "merged-link-lab:open-settings-page";

  // Function: open settings page.
  async function openSettingsPage(extensionApi) {
    if (!extensionApi || !extensionApi.runtime) {
      return { ok: false, error: "extension runtime is unavailable" };
    }

    if (typeof extensionApi.runtime.sendMessage === "function") {
      try {
        var response = await extensionApi.runtime.sendMessage({
          type: openSettingsMessageType
        });

        if (response && response.ok) {
          return response;
        }
      } catch {
        // Fall through to direct options-page opening below.
      }
    }

    if (typeof extensionApi.runtime.openOptionsPage === "function") {
      await extensionApi.runtime.openOptionsPage();
      return { ok: true };
    }

    if (typeof extensionApi.runtime.getURL === "function" && globalScope && typeof globalScope.open === "function") {
      globalScope.open(extensionApi.runtime.getURL("settings.html"), "_blank", "noopener");
      return { ok: true };
    }

    return { ok: false, error: "settings page opener is unavailable" };
  }

  var settingsOpenerApi = Object.freeze({
    openSettingsPage: openSettingsPage
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = settingsOpenerApi;
  }

  if (globalScope) {
    globalScope.urlForensicsSettingsOpener = settingsOpenerApi;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
