// Function: initialize shared URL Forensics page UI helpers.
(function initializeUrlForensicsPageUi() {
  "use strict";

  // Function: get readable error message.
  function getReadableErrorMessage(error) {
    return error && error.message ? error.message : "unknown error";
  }

  // Function: set status text.
  function setStatusText(statusElement, message, tone) {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = String(message || "");
    statusElement.classList.toggle("is-saved", tone === "saved");
    statusElement.classList.toggle("is-error", tone === "error");
  }

  // Function: set badge text.
  function setBadgeText(element, text, fallbackText) {
    if (!element) {
      return;
    }

    element.textContent = String(text || fallbackText || "Unavailable");
  }

  // Function: format timestamp.
  function formatTimestamp(timestampValue, options) {
    const formatOptions = options && typeof options === "object" ? options : {};

    if (!timestampValue) {
      return "Unavailable";
    }

    try {
      const timestampDate = new Date(timestampValue);

      if (formatOptions.timeOnly) {
        return timestampDate.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit"
        });
      }

      return timestampDate.toLocaleString();
    } catch {
      return "Unavailable";
    }
  }

  // Function: shorten value.
  function shortenValue(value, maximumLength) {
    const normalizedValue = String(value || "").trim();
    const safeMaximumLength = Number.isFinite(Number(maximumLength)) ? Number(maximumLength) : 96;

    if (!normalizedValue) {
      return "Unavailable";
    }

    if (normalizedValue.length <= safeMaximumLength) {
      return normalizedValue;
    }

    return normalizedValue.slice(0, Math.max(0, safeMaximumLength - 3)) + "...";
  }

  // Function: render definition rows.
  function renderDefinitionRows(listElement, rows, rowClassName) {
    if (!listElement) {
      return;
    }

    const listRows = Array.isArray(rows) ? rows : [];
    const fragment = document.createDocumentFragment();
    const safeRowClassName = String(rowClassName || "diagnostic-row");
    listElement.textContent = "";

    listRows.forEach(function appendDefinitionRow(row) {
      const nextRow = row && typeof row === "object" ? row : {};
      const rowContainer = document.createElement("div");
      const labelElement = document.createElement("dt");
      const valueElement = document.createElement("dd");

      rowContainer.className = safeRowClassName;
      labelElement.textContent = String(nextRow.label || "");
      valueElement.textContent = String(nextRow.value || "");
      rowContainer.appendChild(labelElement);
      rowContainer.appendChild(valueElement);
      fragment.appendChild(rowContainer);
    });

    listElement.appendChild(fragment);
  }

  // Function: open extension page.
  async function openExtensionPage(extensionApi, pageName, label, setStatus, options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const safeLabel = String(label || "Extension");
    const normalizedLabel = safeLabel.toLowerCase();
    const successMessage = optionBag.successMessage || ("Opened " + normalizedLabel + " page.");
    const unavailableMessage = optionBag.unavailableMessage || (safeLabel + " page is unavailable in this context.");
    const statusWriter = typeof setStatus === "function" ? setStatus : function ignoreStatusMessage() {};

    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== "function") {
      statusWriter(unavailableMessage, "error");
      return false;
    }

    try {
      const pageUrl = extensionApi.runtime.getURL(pageName);

      if (extensionApi.tabs && typeof extensionApi.tabs.create === "function") {
        await extensionApi.tabs.create({ url: pageUrl });
      } else {
        window.open(pageUrl, "_blank", "noopener");
      }

      statusWriter(successMessage, "saved");
      if (optionBag.closeOnSuccess && typeof window.close === "function") {
        window.close();
      }
      return true;
    } catch (error) {
      statusWriter(
        "Could not open " + normalizedLabel + " page: " + getReadableErrorMessage(error),
        "error"
      );
      return false;
    }
  }

  // Function: open settings page.
  async function openSettingsPage(extensionApi, setStatus, options) {
    const optionBag = options && typeof options === "object" ? options : {};
    const successMessage = optionBag.successMessage || "Opened settings page.";
    const unavailableMessage = optionBag.unavailableMessage || "Settings page is unavailable in this context.";
    const statusWriter = typeof setStatus === "function" ? setStatus : function ignoreStatusMessage() {};

    if (!extensionApi || !extensionApi.runtime) {
      statusWriter(unavailableMessage, "error");
      return false;
    }

    try {
      if (typeof extensionApi.runtime.openOptionsPage === "function") {
        await extensionApi.runtime.openOptionsPage();
        statusWriter(successMessage, "saved");
        if (optionBag.closeOnSuccess && typeof window.close === "function") {
          window.close();
        }
        return true;
      }
    } catch (error) {
      statusWriter("Could not open settings page: " + getReadableErrorMessage(error), "error");
      return false;
    }

    return openExtensionPage(extensionApi, "settings.html", "Settings", statusWriter, {
      successMessage: successMessage,
      unavailableMessage: unavailableMessage,
      closeOnSuccess: optionBag.closeOnSuccess
    });
  }

  globalThis.urlForensicsPageUi = Object.freeze({
    getReadableErrorMessage: getReadableErrorMessage,
    setStatusText: setStatusText,
    setBadgeText: setBadgeText,
    formatTimestamp: formatTimestamp,
    shortenValue: shortenValue,
    renderDefinitionRows: renderDefinitionRows,
    openExtensionPage: openExtensionPage,
    openSettingsPage: openSettingsPage
  });
}());
