// Shared debug redaction helpers for program-debugging output.
(function initializeUrlForensicsDebugRedaction(globalScope) {
  "use strict";

  var redactedKeyPattern =
    /^(rawtext|sourcehtml|sourcemarkup|htmlmarkup|rewrittenhtml|emailbody|bodytext|innertext|textcontent|clipboard|payload|snapshot|messagebody)$/i;

  // Function: sanitize debug details.
  function sanitizeDetails(value, depth) {
    var safeDepth = Number.isFinite(depth) ? depth : 0;

    if (value === null || typeof value === "undefined") {
      return value;
    }

    if (typeof value === "string") {
      return value.length > 240 ? value.slice(0, 237) + "..." : value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (safeDepth >= 4) {
      return "[depth limit]";
    }

    if (Array.isArray(value)) {
      return value.slice(0, 16).map(function sanitizeArrayItem(item) {
        return sanitizeDetails(item, safeDepth + 1);
      });
    }

    if (typeof value === "object") {
      var output = {};

      Object.keys(value).slice(0, 40).forEach(function sanitizeObjectEntry(key) {
        if (redactedKeyPattern.test(key)) {
          output[key] = "[redacted]";
          return;
        }

        output[key] = sanitizeDetails(value[key], safeDepth + 1);
      });

      return output;
    }

    return String(value);
  }

  var redactionApi = Object.freeze({
    sanitizeDetails: sanitizeDetails
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = redactionApi;
  }

  if (globalScope) {
    globalScope.urlForensicsDebugRedaction = redactionApi;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
