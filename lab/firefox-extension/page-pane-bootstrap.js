"use strict";

function urlForensicsPagePaneBootstrapBindHoverInspector(elements, options) {
  if (!elements.hoverLinkInfo) {
    return;
  }

  elements.hoverLinkInfo.addEventListener("toggle", function handleHoverLinkInfoToggle() {
    options.onHoverLinkToggle(elements.hoverLinkInfo.open);
  });
  options.syncHoverLinkExpanded(options.hoverLinkPanelExpanded === true);
}

function urlForensicsPagePaneBootstrapBindMirrorFrame(elements, options) {
  if (!elements.convertedPane || String(elements.convertedPane.tagName || "").toUpperCase() !== "IFRAME") {
    return;
  }

  elements.convertedPane.addEventListener("load", function handleMirrorFrameLoad() {
    options.onMirrorFrameLoad();
  });
}

function urlForensicsPagePaneBootstrapBindLabFrame(elements, options) {
  if (!elements.labFrame) {
    return;
  }

  if (options.labFrameUrl) {
    elements.labFrame.src = options.labFrameUrl;
  }

  elements.labFrame.addEventListener("load", function handleLabFrameLoad() {
    options.onLabFrameLoad();
  });
}

function urlForensicsPagePaneBootstrapBindButtons(elements, options) {
  if (elements.railToggleButton) {
    elements.railToggleButton.addEventListener("click", function handleRailToggleClick() {
      options.onRailToggle();
    });
  }

  if (elements.collapseButton) {
    elements.collapseButton.addEventListener("click", function handleCollapseClick() {
      options.onCollapse();
    });
  }

  if (elements.settingsButton) {
    elements.settingsButton.addEventListener("click", function handleSettingsClick() {
      options.onOpenSettings();
    });
  }

  if (elements.refreshButton) {
    elements.refreshButton.addEventListener("click", function handleRefreshClick() {
      options.onRefresh();
    });
  }
}

function urlForensicsPagePaneBootstrapBindTabs(elements, options) {
  (Array.isArray(elements.tabButtons) ? elements.tabButtons : []).forEach(function bindTabButton(tabButton) {
    tabButton.addEventListener("click", function handleTabClick() {
      options.onTabSelect(tabButton.getAttribute("data-tab-button"));
    });
  });

  options.onTabSelect(options.initialActiveTabKey);
}

function urlForensicsPagePaneBootstrapCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    hoverLinkPanelExpanded: optionBag.hoverLinkPanelExpanded === true,
    labFrameUrl: String(optionBag.labFrameUrl || ""),
    syncHoverLinkExpanded: typeof optionBag.syncHoverLinkExpanded === "function"
      ? optionBag.syncHoverLinkExpanded
      : function ignoreHoverSync() {},
    onHoverLinkToggle: typeof optionBag.onHoverLinkToggle === "function"
      ? optionBag.onHoverLinkToggle
      : function ignoreHoverToggle() {},
    onMirrorFrameLoad: typeof optionBag.onMirrorFrameLoad === "function"
      ? optionBag.onMirrorFrameLoad
      : function ignoreMirrorFrameLoad() {},
    onLabFrameLoad: typeof optionBag.onLabFrameLoad === "function"
      ? optionBag.onLabFrameLoad
      : function ignoreLabFrameLoad() {},
    onRailToggle: typeof optionBag.onRailToggle === "function"
      ? optionBag.onRailToggle
      : function ignoreRailToggle() {},
    onCollapse: typeof optionBag.onCollapse === "function"
      ? optionBag.onCollapse
      : function ignoreCollapse() {},
    onOpenSettings: typeof optionBag.onOpenSettings === "function"
      ? optionBag.onOpenSettings
      : function ignoreOpenSettings() {},
    onRefresh: typeof optionBag.onRefresh === "function"
      ? optionBag.onRefresh
      : function ignoreRefresh() {},
    onTabSelect: typeof optionBag.onTabSelect === "function"
      ? optionBag.onTabSelect
      : function ignoreTabSelect() {},
    initialActiveTabKey: String(optionBag.initialActiveTabKey || "converted")
  });
}

function urlForensicsPagePaneBootstrapInitialize(elements, options) {
  const resolvedOptions = urlForensicsPagePaneBootstrapCreateDefaultOptions(options);
  const safeElements = elements && typeof elements === "object" ? elements : {};

  urlForensicsPagePaneBootstrapBindHoverInspector(safeElements, resolvedOptions);
  urlForensicsPagePaneBootstrapBindMirrorFrame(safeElements, resolvedOptions);
  urlForensicsPagePaneBootstrapBindLabFrame(safeElements, resolvedOptions);
  urlForensicsPagePaneBootstrapBindButtons(safeElements, resolvedOptions);
  urlForensicsPagePaneBootstrapBindTabs(safeElements, resolvedOptions);
}

(function attachUrlForensicsPagePaneBootstrap(globalScope) {
  const pagePaneBootstrap = Object.freeze({
    initialize: urlForensicsPagePaneBootstrapInitialize
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneBootstrap;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneBootstrap = pagePaneBootstrap;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
