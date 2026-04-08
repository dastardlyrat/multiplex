// Function: initialize shared tracking-parameter model.
(function initializeUrlForensicsTrackingParameterModel(globalScope) {
  "use strict";

  const trackingParameterDefinitions = Object.freeze([
    Object.freeze({
      key: "utmPrefix",
      label: "utm_*",
      parameterName: "utm_",
      matchMode: "prefix",
      description: "Remove any UTM campaign parameter whose name starts with utm_."
    }),
    Object.freeze({
      key: "gclid",
      label: "gclid",
      parameterName: "gclid",
      matchMode: "exact",
      description: "Google Ads click identifier."
    }),
    Object.freeze({
      key: "dclid",
      label: "dclid",
      parameterName: "dclid",
      matchMode: "exact",
      description: "Google display click identifier."
    }),
    Object.freeze({
      key: "gbraid",
      label: "gbraid",
      parameterName: "gbraid",
      matchMode: "exact",
      description: "Google app-to-web attribution parameter."
    }),
    Object.freeze({
      key: "wbraid",
      label: "wbraid",
      parameterName: "wbraid",
      matchMode: "exact",
      description: "Google web-to-app attribution parameter."
    }),
    Object.freeze({
      key: "msclkid",
      label: "msclkid",
      parameterName: "msclkid",
      matchMode: "exact",
      description: "Microsoft Ads click identifier."
    }),
    Object.freeze({
      key: "ttclid",
      label: "ttclid",
      parameterName: "ttclid",
      matchMode: "exact",
      description: "TikTok click identifier."
    }),
    Object.freeze({
      key: "liFatId",
      label: "li_fat_id",
      parameterName: "li_fat_id",
      matchMode: "exact",
      description: "LinkedIn ad attribution identifier."
    }),
    Object.freeze({
      key: "fbclid",
      label: "fbclid",
      parameterName: "fbclid",
      matchMode: "exact",
      description: "Facebook click identifier."
    }),
    Object.freeze({
      key: "mcCid",
      label: "mc_cid",
      parameterName: "mc_cid",
      matchMode: "exact",
      description: "Mailchimp campaign identifier."
    }),
    Object.freeze({
      key: "mcEid",
      label: "mc_eid",
      parameterName: "mc_eid",
      matchMode: "exact",
      description: "Mailchimp email identifier."
    }),
    Object.freeze({
      key: "mcTc",
      label: "mc_tc",
      parameterName: "mc_tc",
      matchMode: "exact",
      description: "Mailchimp tracking code parameter."
    }),
    Object.freeze({
      key: "hsenc",
      label: "hsenc",
      parameterName: "hsenc",
      matchMode: "exact",
      description: "HubSpot email hash parameter."
    }),
    Object.freeze({
      key: "hsmi",
      label: "_hsmi",
      parameterName: "_hsmi",
      matchMode: "exact",
      description: "HubSpot message identifier."
    }),
    Object.freeze({
      key: "hsCtaTracking",
      label: "hsCtaTracking",
      parameterName: "hsctatracking",
      matchMode: "exact",
      description: "HubSpot CTA tracking parameter."
    })
  ]);

  const defaultTrackingParameterFilters = Object.freeze(
    trackingParameterDefinitions.reduce(function buildDefaultTrackingFilters(result, definition) {
      result[definition.key] = true;
      return result;
    }, {})
  );

  // Function: normalize tracking-parameter filters.
  function normalizeTrackingParameterFilters(value) {
    const safeValue = value && typeof value === "object" && !Array.isArray(value) ? value : {};

    return trackingParameterDefinitions.reduce(function normalizeTrackingFilter(result, definition) {
      result[definition.key] = Object.prototype.hasOwnProperty.call(safeValue, definition.key)
        ? safeValue[definition.key] === true
        : defaultTrackingParameterFilters[definition.key];
      return result;
    }, {});
  }

  // Function: compare filters against defaults.
  function trackingParameterFiltersMatchDefault(value) {
    const normalizedFilters = normalizeTrackingParameterFilters(value);

    return trackingParameterDefinitions.every(function compareTrackingFilter(definition) {
      return normalizedFilters[definition.key] === defaultTrackingParameterFilters[definition.key];
    });
  }

  // Function: get enabled tracker definitions.
  function getEnabledTrackingParameterDefinitions(value) {
    const normalizedFilters = normalizeTrackingParameterFilters(value);

    return trackingParameterDefinitions.filter(function keepEnabledTrackingDefinition(definition) {
      return normalizedFilters[definition.key] === true;
    });
  }

  // Function: get tracking-filter summary.
  function getTrackingParameterFilterSummary(value) {
    const enabledDefinitions = getEnabledTrackingParameterDefinitions(value);

    return {
      totalCount: trackingParameterDefinitions.length,
      enabledCount: enabledDefinitions.length,
      enabledLabels: enabledDefinitions.map(function getEnabledLabel(definition) {
        return definition.label;
      })
    };
  }

  // Function: format tracking-filter summary.
  function formatTrackingParameterFilterSummary(value, options) {
    const summaryOptions = options && typeof options === "object" ? options : {};
    const maxVisibleLabels = Number.isFinite(summaryOptions.maxVisibleLabels) ? Math.max(1, Math.floor(summaryOptions.maxVisibleLabels)) : 5;
    const summary = getTrackingParameterFilterSummary(value);
    const sourceLabel = summaryOptions.sourceLabel ? String(summaryOptions.sourceLabel) + "; " : "";

    if (summary.enabledCount === summary.totalCount) {
      return sourceLabel + "all " + String(summary.totalCount) + " enabled";
    }

    if (summary.enabledCount === 0) {
      return sourceLabel + "all disabled";
    }

    return (
      sourceLabel +
      String(summary.enabledCount) +
      "/" +
      String(summary.totalCount) +
      " enabled: " +
      summary.enabledLabels.slice(0, maxVisibleLabels).join(", ") +
      (summary.enabledLabels.length > maxVisibleLabels ? ", +" + String(summary.enabledLabels.length - maxVisibleLabels) + " more" : "")
    );
  }

  // Function: check whether a parameter name should be stripped.
  function matchesTrackingParameterName(filterValue, parameterName) {
    const normalizedParameterName = String(parameterName || "").trim().toLowerCase();

    if (!normalizedParameterName) {
      return false;
    }

    const normalizedFilters = normalizeTrackingParameterFilters(filterValue);

    return trackingParameterDefinitions.some(function doesTrackingDefinitionMatch(definition) {
      if (normalizedFilters[definition.key] !== true) {
        return false;
      }

      if (definition.matchMode === "prefix") {
        return normalizedParameterName.indexOf(definition.parameterName) === 0;
      }

      return normalizedParameterName === definition.parameterName;
    });
  }

  const trackingParameterModel = Object.freeze({
    trackingParameterDefinitions: trackingParameterDefinitions,
    defaultTrackingParameterFilters: defaultTrackingParameterFilters,
    normalizeTrackingParameterFilters: normalizeTrackingParameterFilters,
    trackingParameterFiltersMatchDefault: trackingParameterFiltersMatchDefault,
    getEnabledTrackingParameterDefinitions: getEnabledTrackingParameterDefinitions,
    getTrackingParameterFilterSummary: getTrackingParameterFilterSummary,
    formatTrackingParameterFilterSummary: formatTrackingParameterFilterSummary,
    matchesTrackingParameterName: matchesTrackingParameterName
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = trackingParameterModel;
  }

  if (globalScope) {
    globalScope.urlForensicsTrackingParameterModel = trackingParameterModel;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
