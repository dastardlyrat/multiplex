"use strict";

function urlForensicsPagePaneAssemblyResolveFunction(candidateValue, fallbackValue) {
  return typeof candidateValue === "function" ? candidateValue : fallbackValue;
}

function urlForensicsPagePaneAssemblyCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null),
    elements: optionBag.elements && typeof optionBag.elements === "object" ? optionBag.elements : {},
    labFrameUrl: String(optionBag.labFrameUrl || ""),
    buildPaneMarkup: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.buildPaneMarkup,
      function buildMissingPaneMarkup() {
        return "";
      }
    ),
    collectPaneElements: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.collectPaneElements,
      function collectMissingPaneElements() {
        return {};
      }
    ),
    initializePaneBootstrap: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.initializePaneBootstrap,
      function initializeMissingPaneBootstrap() {}
    ),
    replaceElementMarkup: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.replaceElementMarkup,
      function replaceMissingPaneMarkup() {}
    ),
    syncHoverLinkExpanded: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.syncHoverLinkExpanded,
      function syncMissingHoverLinkExpanded() {}
    ),
    bindHoverInspector: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.bindHoverInspector,
      function bindMissingHoverInspector() {}
    ),
    syncLabFrameWithSnapshot: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.syncLabFrameWithSnapshot,
      function syncMissingLabFrameWithSnapshot() {}
    ),
    getLatestSnapshot: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.getLatestSnapshot,
      function getMissingLatestSnapshot() {
        return null;
      }
    ),
    setPaneExpanded: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.setPaneExpanded,
      function setMissingPaneExpanded() {}
    ),
    syncPageViewportReservation: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.syncPageViewportReservation,
      function syncMissingPageViewportReservation() {}
    ),
    openSettingsPage: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.openSettingsPage,
      async function openMissingSettingsPage() {}
    ),
    forceRefreshCurrentSnapshot: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.forceRefreshCurrentSnapshot,
      function forceRefreshMissingSnapshot() {}
    ),
    clearPane: urlForensicsPagePaneAssemblyResolveFunction(
      optionBag.clearPane,
      function clearMissingPane() {}
    )
  });
}

function urlForensicsPagePaneAssemblyNormalizeTabKey(tabKey) {
  return /^(converted|lab|diagnostics)$/.test(String(tabKey || "")) ? tabKey : "lab";
}

function urlForensicsPagePaneAssemblyUpdateTabButtons(elements, nextTabKey) {
  (Array.isArray(elements.tabButtons) ? elements.tabButtons : []).forEach(function updateTabButton(tabButton) {
    const buttonTabKey = tabButton && typeof tabButton.getAttribute === "function"
      ? tabButton.getAttribute("data-tab-button")
      : null;
    const isActive = buttonTabKey === nextTabKey;

    if (tabButton && tabButton.classList && typeof tabButton.classList.toggle === "function") {
      tabButton.classList.toggle("is-active", isActive);
    }
    if (tabButton && typeof tabButton.setAttribute === "function") {
      tabButton.setAttribute("aria-selected", String(isActive));
    }
  });
}

function urlForensicsPagePaneAssemblyUpdateTabPanels(elements, nextTabKey) {
  (Array.isArray(elements.tabPanels) ? elements.tabPanels : []).forEach(function updateTabPanel(tabPanel) {
    const panelTabKey = tabPanel && typeof tabPanel.getAttribute === "function"
      ? tabPanel.getAttribute("data-tab-panel")
      : null;
    const isActive = panelTabKey === nextTabKey;

    if (tabPanel && tabPanel.classList && typeof tabPanel.classList.toggle === "function") {
      tabPanel.classList.toggle("is-active", isActive);
      tabPanel.classList.toggle("is-hidden", !isActive);
    }
    if (tabPanel && typeof tabPanel.setAttribute === "function") {
      tabPanel.setAttribute("aria-hidden", String(!isActive));
    }
  });
}

function urlForensicsPagePaneAssemblyUpdateHoverInfoVisibility(elements, nextTabKey) {
  if (!elements.hoverLinkInfo) {
    return;
  }

  const shouldShowHoverInfo = nextTabKey === "converted";
  elements.hoverLinkInfo.hidden = !shouldShowHoverInfo;
  if (typeof elements.hoverLinkInfo.setAttribute === "function") {
    elements.hoverLinkInfo.setAttribute("aria-hidden", String(!shouldShowHoverInfo));
  }
}

function urlForensicsPagePaneAssemblySetActiveTab(tabKey, options) {
  const nextTabKey = urlForensicsPagePaneAssemblyNormalizeTabKey(tabKey);

  options.elements.activeTabKey = nextTabKey;

  if (!options.elements.root) {
    return nextTabKey;
  }

  urlForensicsPagePaneAssemblyUpdateTabButtons(options.elements, nextTabKey);
  urlForensicsPagePaneAssemblyUpdateTabPanels(options.elements, nextTabKey);
  urlForensicsPagePaneAssemblyUpdateHoverInfoVisibility(options.elements, nextTabKey);

  if (options.elements.isExpanded) {
    options.syncPageViewportReservation();
  }

  return nextTabKey;
}

function urlForensicsPagePaneAssemblyBuildBootstrapOptions(setActiveTab, options) {
  return {
    hoverLinkPanelExpanded: options.elements.hoverLinkPanelExpanded === true,
    labFrameUrl: options.labFrameUrl,
    syncHoverLinkExpanded: options.syncHoverLinkExpanded,
    onHoverLinkToggle: function onHoverLinkToggle(isExpanded) {
      options.elements.hoverLinkPanelExpanded = !!isExpanded;
    },
    onMirrorFrameLoad: function onMirrorFrameLoad() {
      options.bindHoverInspector();
    },
    onLabFrameLoad: function onLabFrameLoad() {
      options.elements.labFrameLoaded = true;
      options.syncLabFrameWithSnapshot(options.getLatestSnapshot());
    },
    onRailToggle: function onRailToggle() {
      options.setPaneExpanded(!options.elements.isExpanded);
    },
    onCollapse: function onCollapse() {
      options.setPaneExpanded(false);
    },
    onOpenSettings: function onOpenSettings() {
      options.openSettingsPage();
    },
    onRefresh: function onRefresh() {
      options.forceRefreshCurrentSnapshot();
    },
    onTabSelect: setActiveTab,
    initialActiveTabKey: options.elements.activeTabKey
  };
}

function urlForensicsPagePaneAssemblyCreatePaneRoot(options) {
  if (!options.documentObject || typeof options.documentObject.createElement !== "function") {
    return null;
  }

  const paneRoot = options.documentObject.createElement("aside");

  paneRoot.id = "merged-link-lab-page-pane";
  if (typeof paneRoot.setAttribute === "function") {
    paneRoot.setAttribute("aria-hidden", "true");
  }
  options.replaceElementMarkup(paneRoot, options.buildPaneMarkup({
    hoverLinkPanelExpanded: options.elements.hoverLinkPanelExpanded
  }));
  return paneRoot;
}

function urlForensicsPagePaneAssemblyMountPaneRoot(paneRoot, options) {
  const mountTarget = options.documentObject
    ? (options.documentObject.body || options.documentObject.documentElement)
    : null;

  if (!mountTarget || typeof mountTarget.appendChild !== "function") {
    return false;
  }

  mountTarget.appendChild(paneRoot);
  return true;
}

function urlForensicsPagePaneAssemblyEnsurePane(setActiveTab, options) {
  if (options.elements.root && options.elements.root.isConnected) {
    return options.elements.root;
  }

  const paneRoot = urlForensicsPagePaneAssemblyCreatePaneRoot(options);

  if (!paneRoot || !urlForensicsPagePaneAssemblyMountPaneRoot(paneRoot, options)) {
    return null;
  }

  options.elements.root = paneRoot;
  Object.assign(options.elements, options.collectPaneElements(paneRoot));
  options.initializePaneBootstrap(
    options.elements,
    urlForensicsPagePaneAssemblyBuildBootstrapOptions(setActiveTab, options)
  );
  options.clearPane();
  return paneRoot;
}

function urlForensicsPagePaneAssemblyCreate(options) {
  const resolvedOptions = urlForensicsPagePaneAssemblyCreateDefaultOptions(options);

  function setActiveTab(tabKey) {
    return urlForensicsPagePaneAssemblySetActiveTab(tabKey, resolvedOptions);
  }

  return Object.freeze({
    ensurePane: function ensurePane() {
      return urlForensicsPagePaneAssemblyEnsurePane(setActiveTab, resolvedOptions);
    },
    setActiveTab: setActiveTab
  });
}

(function attachUrlForensicsPagePaneAssembly(globalScope) {
  const pagePaneAssembly = Object.freeze({
    create: urlForensicsPagePaneAssemblyCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneAssembly;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneAssembly = pagePaneAssembly;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
