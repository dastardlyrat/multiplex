"use strict";

const urlForensicsDebugConfigLevels = Object.freeze({
  off: 0,
  error: 1,
  info: 2,
  verbose: 3,
  trace: 4
});

const urlForensicsDebugConfigCategories = Object.freeze({
  error: true,
  runtime: true,
  storage: true,
  messaging: true,
  ui: true,
  pipeline: true,
  function: false,
  conditional: false,
  loop: false,
  variable: false
});

const urlForensicsDebugConfigStorageKeys = Object.freeze({
  programDebugConfig: "programDebugConfig",
  programDebugPageChoices: "programDebugPageChoices"
});

const urlForensicsDebugConfigDefaultConfig = Object.freeze({
  level: "off",
  categories: urlForensicsDebugConfigCategories
});

const urlForensicsDebugConfigDefaultPageChoices = Object.freeze({
  renderLimit: 750,
  autoRefresh: false,
  typeFilter: "all"
});

function urlForensicsDebugConfigCloneConfig(config) {
  const safeConfig = config && typeof config === "object" ? config : urlForensicsDebugConfigDefaultConfig;
  const safeCategories = safeConfig.categories && typeof safeConfig.categories === "object"
    ? safeConfig.categories
    : urlForensicsDebugConfigCategories;

  return {
    level: Object.prototype.hasOwnProperty.call(urlForensicsDebugConfigLevels, safeConfig.level)
      ? safeConfig.level
      : urlForensicsDebugConfigDefaultConfig.level,
    categories: Object.assign({}, urlForensicsDebugConfigCategories, safeCategories, { error: true })
  };
}

function urlForensicsDebugConfigNormalizeConfig(config, fallbackConfig) {
  const safeConfig = config && typeof config === "object" ? config : {};
  const fallback = urlForensicsDebugConfigCloneConfig(fallbackConfig || urlForensicsDebugConfigDefaultConfig);
  const candidateCategories = safeConfig.categories && typeof safeConfig.categories === "object"
    ? safeConfig.categories
    : {};
  const nextCategories = Object.assign({}, fallback.categories);

  Object.keys(urlForensicsDebugConfigCategories).forEach(function normalizeDebugCategory(categoryName) {
    if (Object.prototype.hasOwnProperty.call(candidateCategories, categoryName)) {
      nextCategories[categoryName] = candidateCategories[categoryName] === true;
    }
  });
  nextCategories.error = true;

  return {
    level: Object.prototype.hasOwnProperty.call(urlForensicsDebugConfigLevels, safeConfig.level)
      ? safeConfig.level
      : fallback.level,
    categories: nextCategories
  };
}

function urlForensicsDebugConfigNormalizePageChoices(value) {
  const safeValue = value && typeof value === "object" ? value : {};
  const parsedRenderLimit = Number(safeValue.renderLimit);
  const allowedTypeFilters = Object.assign({ all: true }, urlForensicsDebugConfigCategories);

  return {
    renderLimit: Number.isFinite(parsedRenderLimit) && parsedRenderLimit > 0
      ? Math.min(10000, Math.floor(parsedRenderLimit))
      : urlForensicsDebugConfigDefaultPageChoices.renderLimit,
    autoRefresh: safeValue.autoRefresh === true || safeValue.autoRefresh === false
      ? safeValue.autoRefresh
      : urlForensicsDebugConfigDefaultPageChoices.autoRefresh,
    typeFilter: allowedTypeFilters[safeValue.typeFilter]
      ? safeValue.typeFilter
      : urlForensicsDebugConfigDefaultPageChoices.typeFilter
  };
}

function urlForensicsDebugConfigMatchesDefault(config) {
  const normalizedConfig = urlForensicsDebugConfigNormalizeConfig(config, urlForensicsDebugConfigDefaultConfig);

  if (normalizedConfig.level !== urlForensicsDebugConfigDefaultConfig.level) {
    return false;
  }

  return Object.keys(urlForensicsDebugConfigCategories).every(function compareDebugCategory(categoryName) {
    return normalizedConfig.categories[categoryName] === urlForensicsDebugConfigCategories[categoryName];
  });
}

function urlForensicsDebugConfigPageChoicesMatchDefault(pageChoices) {
  const normalizedChoices = urlForensicsDebugConfigNormalizePageChoices(pageChoices);

  return (
    normalizedChoices.renderLimit === urlForensicsDebugConfigDefaultPageChoices.renderLimit &&
    normalizedChoices.autoRefresh === urlForensicsDebugConfigDefaultPageChoices.autoRefresh &&
    normalizedChoices.typeFilter === urlForensicsDebugConfigDefaultPageChoices.typeFilter
  );
}

(function attachUrlForensicsDebugConfig(globalScope) {
  const debugConfig = Object.freeze({
    categories: urlForensicsDebugConfigCategories,
    cloneConfig: urlForensicsDebugConfigCloneConfig,
    configMatchesDefault: urlForensicsDebugConfigMatchesDefault,
    defaultConfig: urlForensicsDebugConfigDefaultConfig,
    defaultPageChoices: urlForensicsDebugConfigDefaultPageChoices,
    levels: urlForensicsDebugConfigLevels,
    normalizeConfig: urlForensicsDebugConfigNormalizeConfig,
    normalizePageChoices: urlForensicsDebugConfigNormalizePageChoices,
    pageChoicesMatchDefault: urlForensicsDebugConfigPageChoicesMatchDefault,
    storageKeys: urlForensicsDebugConfigStorageKeys
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = debugConfig;
  }

  if (globalScope) {
    globalScope.urlForensicsDebugConfig = debugConfig;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
