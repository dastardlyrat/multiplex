"use strict";

function urlForensicsPagePaneLayoutCreateDefaultOptions(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return Object.freeze({
    elements: optionBag.elements && typeof optionBag.elements === "object" ? optionBag.elements : {},
    ensurePane: typeof optionBag.ensurePane === "function"
      ? optionBag.ensurePane
      : function ensureMissingPane() {
        return null;
      },
    getLatestSnapshot: typeof optionBag.getLatestSnapshot === "function"
      ? optionBag.getLatestSnapshot
      : function getMissingLatestSnapshot() {
        return null;
      },
    getActiveEmailRoot: typeof optionBag.getActiveEmailRoot === "function"
      ? optionBag.getActiveEmailRoot
      : function getMissingActiveEmailRoot() {
        return null;
      },
    shouldAllowOpenWithoutSnapshot: typeof optionBag.shouldAllowOpenWithoutSnapshot === "function"
      ? optionBag.shouldAllowOpenWithoutSnapshot
      : function shouldDisallowOpenWithoutSnapshot() {
        return false;
      },
    shouldSuppressPaneVisibility: typeof optionBag.shouldSuppressPaneVisibility === "function"
      ? optionBag.shouldSuppressPaneVisibility
      : function shouldNotSuppressPaneVisibility() {
        return false;
      },
    debugApi: optionBag.debugApi && typeof optionBag.debugApi === "object" ? optionBag.debugApi : null,
    getVisiblePaneReservedWidth: typeof optionBag.getVisiblePaneReservedWidth === "function"
      ? optionBag.getVisiblePaneReservedWidth
      : function getDefaultReservedWidth() {
        return 0;
      },
    windowObject: optionBag.windowObject || (typeof window !== "undefined" ? window : null),
    documentObject: optionBag.documentObject || (typeof document !== "undefined" ? document : null)
  });
}

function urlForensicsPagePaneLayoutDebugCall(debugApi, methodName, message, payload) {
  if (debugApi && typeof debugApi.isMethodEnabled === "function" && debugApi.isMethodEnabled(methodName) !== true) {
    return;
  }

  if (debugApi && typeof debugApi[methodName] === "function") {
    debugApi[methodName](message, payload || {});
  }
}

function urlForensicsPagePaneLayoutGetElementAttribute(element, attributeName) {
  return element && typeof element.getAttribute === "function"
    ? String(element.getAttribute(attributeName) || "")
    : "";
}

function urlForensicsPagePaneLayoutGetElementBounds(element) {
  return element && typeof element.getBoundingClientRect === "function"
    ? element.getBoundingClientRect()
    : { width: 0, height: 0 };
}

function urlForensicsPagePaneLayoutGetSnapshotFinalUrlCount(snapshot) {
  return snapshot && snapshot.pipeline && Array.isArray(snapshot.pipeline.finalUrls)
    ? snapshot.pipeline.finalUrls.length
    : 0;
}

function urlForensicsPagePaneLayoutGetLocationHref(windowObject) {
  return windowObject && windowObject.location && windowObject.location.href
    ? String(windowObject.location.href)
    : "";
}

function urlForensicsPagePaneLayoutGetViewportWidth(windowObject, documentObject) {
  return Math.max(
    windowObject && windowObject.innerWidth ? windowObject.innerWidth : 0,
    documentObject && documentObject.documentElement && documentObject.documentElement.clientWidth
      ? documentObject.documentElement.clientWidth
      : 0
  );
}

function urlForensicsPagePaneLayoutGetViewportHeight(windowObject, documentObject) {
  return Math.max(
    windowObject && windowObject.innerHeight ? windowObject.innerHeight : 0,
    documentObject && documentObject.documentElement && documentObject.documentElement.clientHeight
      ? documentObject.documentElement.clientHeight
      : 0
  );
}

function urlForensicsPagePaneLayoutGetDisplayedEmailBodyWidth(activeEmailRoot) {
  if (!activeEmailRoot || typeof activeEmailRoot.getBoundingClientRect !== "function") {
    return 0;
  }

  const emailBounds = activeEmailRoot.getBoundingClientRect();
  const widthCandidates = [emailBounds.width];

  if (Number.isFinite(activeEmailRoot.scrollWidth) && activeEmailRoot.scrollWidth > 0) {
    widthCandidates.push(activeEmailRoot.scrollWidth);
  }

  Array.from(activeEmailRoot.children || []).slice(0, 24).forEach(function collectChildWidth(childElement) {
    if (!childElement || typeof childElement.getBoundingClientRect !== "function") {
      return;
    }

    const childBounds = childElement.getBoundingClientRect();
    if (Number.isFinite(childBounds.width) && childBounds.width > 0) {
      widthCandidates.push(childBounds.width);
    }
  });

  const measurableWidths = widthCandidates.filter(function filterWidth(widthValue) {
    return Number.isFinite(widthValue) && widthValue > 0;
  });

  return measurableWidths.length ? Math.max.apply(null, measurableWidths) : 0;
}

function urlForensicsPagePaneLayoutGetExpandedPaneWidth(activeTabKey, displayedBodyWidth, viewportWidth) {
  const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
  const isCompactViewport = safeViewportWidth <= 900;
  const isWorkflowTab = activeTabKey === "lab";
  const isMirrorTab = activeTabKey === "converted";
  const layoutOverhead = isWorkflowTab
    ? (safeViewportWidth <= 1100 ? 300 : 340)
    : (isMirrorTab ? (safeViewportWidth <= 1100 ? 180 : 240) : 80);
  const preferredWidth = displayedBodyWidth
    ? Math.round(displayedBodyWidth + layoutOverhead)
    : Math.round(safeViewportWidth * (isCompactViewport ? 0.46 : 0.42));
  const minimumWidth = isWorkflowTab
    ? (isCompactViewport ? 520 : 760)
    : (isMirrorTab ? (isCompactViewport ? 480 : 720) : (isCompactViewport ? 360 : 520));
  const maximumWidth = Math.max(minimumWidth, safeViewportWidth - (isCompactViewport ? 16 : 24));
  const viewportInset = isCompactViewport ? 16 : 24;

  return Math.max(
    56,
    Math.min(
      Math.max(56, safeViewportWidth - viewportInset),
      Math.max(minimumWidth, Math.min(maximumWidth, preferredWidth))
    )
  );
}

function urlForensicsPagePaneLayoutRestoreReservedTargets(reservedLayoutEntries) {
  while (reservedLayoutEntries.length) {
    const entry = reservedLayoutEntries.pop();
    if (!entry || !entry.element) {
      continue;
    }

    entry.element.style.boxSizing = entry.inlineStyles.boxSizing;
    entry.element.style.paddingRight = entry.inlineStyles.paddingRight;
    entry.element.style.maxWidth = entry.inlineStyles.maxWidth;
    entry.element.style.width = entry.inlineStyles.width;
    entry.element.style.marginRight = entry.inlineStyles.marginRight;
    entry.element.style.transform = entry.inlineStyles.transform;
    entry.element.style.transformOrigin = entry.inlineStyles.transformOrigin;
    entry.element.style.minWidth = entry.inlineStyles.minWidth;
    entry.element.style.transition = entry.inlineStyles.transition;
  }
}

function urlForensicsPagePaneLayoutRememberReservedTarget(reservedLayoutEntries, element) {
  if (!element || reservedLayoutEntries.some(function hasMatchingElement(entry) {
    return entry.element === element;
  })) {
    return false;
  }

  reservedLayoutEntries.push({
    element: element,
    inlineStyles: {
      boxSizing: element.style.boxSizing,
      paddingRight: element.style.paddingRight,
      maxWidth: element.style.maxWidth,
      width: element.style.width,
      marginRight: element.style.marginRight,
      transform: element.style.transform,
      transformOrigin: element.style.transformOrigin,
      minWidth: element.style.minWidth,
      transition: element.style.transition
    }
  });

  return true;
}

function urlForensicsPagePaneLayoutBuildReservationTransition(existingTransition) {
  const reservationTransition = "max-width 180ms ease, width 180ms ease, margin-right 180ms ease, padding-right 180ms ease";
  return existingTransition ? existingTransition + ", " + reservationTransition : reservationTransition;
}

function urlForensicsPagePaneLayoutApplyReservationToTarget(targetElement, reserveValue, reservedLayoutEntries, windowObject, documentObject) {
  if (!targetElement || !urlForensicsPagePaneLayoutRememberReservedTarget(reservedLayoutEntries, targetElement)) {
    return false;
  }

  const requestedReserveWidth = parseFloat(String(reserveValue || "").replace(/px$/i, ""));
  const targetBounds = typeof targetElement.getBoundingClientRect === "function"
    ? targetElement.getBoundingClientRect()
    : { width: 0 };
  const viewportWidth = urlForensicsPagePaneLayoutGetViewportWidth(windowObject, documentObject);
  const minimumRemainingWidth = viewportWidth <= 900 ? 280 : 420;
  const maximumReserveWidth = Math.max(0, (Number(targetBounds.width) || 0) - minimumRemainingWidth);
  const effectiveReserveWidth = Number.isFinite(requestedReserveWidth)
    ? Math.max(0, Math.min(requestedReserveWidth, maximumReserveWidth))
    : 0;

  if (effectiveReserveWidth < 48) {
    return false;
  }

  const effectiveReserveValue = effectiveReserveWidth + "px";

  targetElement.style.boxSizing = "border-box";
  targetElement.style.maxWidth = "calc(100% - " + effectiveReserveValue + ")";
  targetElement.style.width = "calc(100% - " + effectiveReserveValue + ")";
  targetElement.style.marginRight = effectiveReserveValue;
  targetElement.style.minWidth = "0";
  targetElement.style.transition = urlForensicsPagePaneLayoutBuildReservationTransition(targetElement.style.transition);
  return true;
}

function urlForensicsPagePaneLayoutIsInsidePane(element) {
  return !!(element && (element.id === "merged-link-lab-page-pane" || (typeof element.closest === "function" && element.closest("#merged-link-lab-page-pane"))));
}

function urlForensicsPagePaneLayoutHasReservableDisplayMode(element, windowObject) {
  const computedStyle = windowObject && typeof windowObject.getComputedStyle === "function"
    ? windowObject.getComputedStyle(element)
    : { display: "block" };
  return computedStyle.display !== "inline" && computedStyle.display !== "contents";
}

function urlForensicsPagePaneLayoutIsLargeEnoughForReservation(element, viewportWidth, viewportHeight) {
  const rect = element.getBoundingClientRect();
  return (
    rect.width >= Math.max(360, viewportWidth * 0.58) &&
    rect.height >= Math.max(220, viewportHeight * 0.42)
  );
}

function urlForensicsPagePaneLayoutFindStructuredContainer(root) {
  const structuredContainer = typeof root.closest === "function"
    ? root.closest("main, [role='main'], [data-app-section], #app, #app-root, #root, #content")
    : null;

  if (structuredContainer && !urlForensicsPagePaneLayoutIsInsidePane(structuredContainer)) {
    return structuredContainer;
  }

  return null;
}

function urlForensicsPagePaneLayoutFindViewportContainer(root, windowObject, documentObject) {
  if (!root || !root.isConnected) {
    return null;
  }

  const viewportWidth = urlForensicsPagePaneLayoutGetViewportWidth(windowObject, documentObject);
  const viewportHeight = urlForensicsPagePaneLayoutGetViewportHeight(windowObject, documentObject);
  let currentElement = root;
  let bestContainer = null;
  let depth = 0;

  while (
    currentElement &&
    currentElement !== (documentObject ? documentObject.body : null) &&
    currentElement !== (documentObject ? documentObject.documentElement : null) &&
    depth < 14
  ) {
    if (urlForensicsPagePaneLayoutIsInsidePane(currentElement)) {
      break;
    }

    if (
      urlForensicsPagePaneLayoutHasReservableDisplayMode(currentElement, windowObject) &&
      urlForensicsPagePaneLayoutIsLargeEnoughForReservation(currentElement, viewportWidth, viewportHeight)
    ) {
      bestContainer = currentElement;
    }

    currentElement = currentElement.parentElement;
    depth += 1;
  }

  if (bestContainer) {
    return bestContainer;
  }

  return urlForensicsPagePaneLayoutFindStructuredContainer(root) || root.parentElement || root;
}

function urlForensicsPagePaneLayoutApplyReservationToViewport(reservedWidth, reservedLayoutEntries, options) {
  urlForensicsPagePaneLayoutRestoreReservedTargets(reservedLayoutEntries);

  if (!reservedWidth) {
    return false;
  }

  const activeEmailRoot = options.getActiveEmailRoot();
  if (!activeEmailRoot) {
    return false;
  }

  const reserveValue = reservedWidth + "px";
  const containerElement = urlForensicsPagePaneLayoutFindViewportContainer(
    activeEmailRoot,
    options.windowObject,
    options.documentObject
  );

  if (containerElement) {
    return urlForensicsPagePaneLayoutApplyReservationToTarget(
      containerElement,
      reserveValue,
      reservedLayoutEntries,
      options.windowObject,
      options.documentObject
    );
  }

  return false;
}

function urlForensicsPagePaneLayoutSync(elements, reservedLayoutEntries, options) {
  const reservedWidth = options.getVisiblePaneReservedWidth();
  const reservedValue = reservedWidth + "px";
  const rootElement = options.documentObject ? options.documentObject.documentElement : null;
  const bodyElement = options.documentObject ? options.documentObject.body : null;
  const viewportWidth = urlForensicsPagePaneLayoutGetViewportWidth(options.windowObject, options.documentObject);
  const activeEmailRoot = options.getActiveEmailRoot();
  const displayedBodyWidth = urlForensicsPagePaneLayoutGetDisplayedEmailBodyWidth(activeEmailRoot);
  const layoutReservationApplied = urlForensicsPagePaneLayoutApplyReservationToViewport(
    reservedWidth,
    reservedLayoutEntries,
    options
  );

  if (rootElement && rootElement.classList && rootElement.style && typeof rootElement.style.setProperty === "function") {
    rootElement.classList.toggle("merged-link-lab-page-pane-reserved", reservedWidth > 0 && !layoutReservationApplied);
    rootElement.style.setProperty(
      "--merged-link-lab-page-pane-reserved-space",
      layoutReservationApplied ? "0px" : reservedValue
    );
  }

  if (bodyElement && bodyElement.classList && bodyElement.style && typeof bodyElement.style.setProperty === "function") {
    bodyElement.classList.toggle("merged-link-lab-page-pane-reserved", reservedWidth > 0 && !layoutReservationApplied);
    bodyElement.style.setProperty(
      "--merged-link-lab-page-pane-reserved-space",
      layoutReservationApplied ? "0px" : reservedValue
    );
  }

  if (elements.root && elements.root.style && typeof elements.root.style.setProperty === "function") {
    elements.root.style.setProperty(
      "--merged-link-lab-page-pane-expanded-width",
      urlForensicsPagePaneLayoutGetExpandedPaneWidth(elements.activeTabKey, displayedBodyWidth, viewportWidth) + "px"
    );
  }
}

function urlForensicsPagePaneLayoutShouldSuppressPaneVisibility(options) {
  return options.shouldSuppressPaneVisibility() === true;
}

function urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, shouldSuppressPaneVisibility, options) {
  const latestSnapshot = options.getLatestSnapshot();
  const activeEmailRoot = options.getActiveEmailRoot();
  const rootElement = elements.root || null;
  const rootBounds = urlForensicsPagePaneLayoutGetElementBounds(rootElement);
  const activeRootBounds = urlForensicsPagePaneLayoutGetElementBounds(activeEmailRoot);

  return {
    suppressed: shouldSuppressPaneVisibility === true,
    hasSnapshot: !!latestSnapshot,
    detectionMode: latestSnapshot && latestSnapshot.detectionMode ? latestSnapshot.detectionMode : "",
    finalUrlCount: urlForensicsPagePaneLayoutGetSnapshotFinalUrlCount(latestSnapshot),
    allowWithoutSnapshot:
      !latestSnapshot &&
      shouldSuppressPaneVisibility !== true &&
      options.shouldAllowOpenWithoutSnapshot() === true,
    hasPaneRoot: !!rootElement,
    paneClassName: urlForensicsPagePaneLayoutGetElementAttribute(rootElement, "class"),
    paneAriaHidden: urlForensicsPagePaneLayoutGetElementAttribute(rootElement, "aria-hidden"),
    paneWidth: Number(rootBounds.width) || 0,
    paneHeight: Number(rootBounds.height) || 0,
    expanded: elements.isExpanded === true,
    hasActiveEmailRoot: !!activeEmailRoot,
    activeEmailRootId: activeEmailRoot && activeEmailRoot.id ? String(activeEmailRoot.id) : "",
    activeEmailRootClassName: urlForensicsPagePaneLayoutGetElementAttribute(activeEmailRoot, "class"),
    activeEmailRootWidth: Number(activeRootBounds.width) || 0,
    activeEmailRootHeight: Number(activeRootBounds.height) || 0,
    href: urlForensicsPagePaneLayoutGetLocationHref(options.windowObject)
  };
}

function urlForensicsPagePaneLayoutSetExpanded(elements, reservedLayoutEntries, isExpanded, options) {
  const shouldSuppressPaneVisibility = urlForensicsPagePaneLayoutShouldSuppressPaneVisibility(options);
  const hasSnapshot = !shouldSuppressPaneVisibility && !!options.getLatestSnapshot();
  const allowWithoutSnapshot =
    !hasSnapshot &&
    !shouldSuppressPaneVisibility &&
    options.shouldAllowOpenWithoutSnapshot() === true;
  elements.isExpanded = shouldSuppressPaneVisibility ? false : !!isExpanded;
  urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout set expanded evaluated", {
    requestedExpanded: !!isExpanded,
    suppressed: shouldSuppressPaneVisibility,
    hasSnapshot: hasSnapshot,
    allowWithoutSnapshot: allowWithoutSnapshot
  });

  if (!elements.root) {
    urlForensicsPagePaneLayoutDebugCall(
      options.debugApi,
      "conditional",
      "content pane layout set expanded skipped: no pane root",
      urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, shouldSuppressPaneVisibility, options)
    );
    urlForensicsPagePaneLayoutSync(elements, reservedLayoutEntries, options);
    return;
  }

  elements.root.classList.toggle("has-snapshot", hasSnapshot);
  elements.root.classList.toggle("is-pre-detection-visible", allowWithoutSnapshot);
  elements.root.classList.toggle("is-expanded", elements.isExpanded);
  elements.root.setAttribute(
    "aria-hidden",
    hasSnapshot || elements.isExpanded || allowWithoutSnapshot ? "false" : "true"
  );

  if (elements.railToggleButton) {
    elements.railToggleButton.setAttribute("aria-expanded", String(elements.isExpanded));
    elements.railToggleButton.setAttribute(
      "aria-label",
      elements.isExpanded
        ? "Collapse URL Forensics Workbench"
        : "Open URL Forensics Workbench"
    );
  }

  urlForensicsPagePaneLayoutSync(elements, reservedLayoutEntries, options);
  urlForensicsPagePaneLayoutDebugCall(
    options.debugApi,
    "variable",
    "content pane layout state applied",
    urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, shouldSuppressPaneVisibility, options)
  );
}

function urlForensicsPagePaneLayoutShow(elements, reservedLayoutEntries, options) {
  const paneRoot = options.ensurePane();

  if (!paneRoot) {
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout show skipped: no pane root", {
      href:
        options.windowObject && options.windowObject.location && options.windowObject.location.href
          ? String(options.windowObject.location.href)
          : ""
    });
    return;
  }

  urlForensicsPagePaneLayoutDebugCall(options.debugApi, "functionIn", "content.paneLayout.showPane", {
    hasPaneRoot: true
  });
  urlForensicsPagePaneLayoutSetExpanded(elements, reservedLayoutEntries, elements.isExpanded, options);
  urlForensicsPagePaneLayoutDebugCall(options.debugApi, "functionOut", "content.paneLayout.showPane", {
    expanded: elements.isExpanded === true
  });
}

function urlForensicsPagePaneLayoutHide(elements, reservedLayoutEntries, options) {
  const shouldSuppressPaneVisibility = urlForensicsPagePaneLayoutShouldSuppressPaneVisibility(options);
  const allowWithoutSnapshot =
    !shouldSuppressPaneVisibility &&
    options.shouldAllowOpenWithoutSnapshot() === true;
  elements.isExpanded = false;
  urlForensicsPagePaneLayoutDebugCall(options.debugApi, "functionIn", "content.paneLayout.hidePane", {
    suppressed: shouldSuppressPaneVisibility,
    allowWithoutSnapshot: allowWithoutSnapshot
  });

  if (!elements.root) {
    urlForensicsPagePaneLayoutDebugCall(
      options.debugApi,
      "conditional",
      "content pane layout hide skipped: no pane root",
      urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, shouldSuppressPaneVisibility, options)
    );
    urlForensicsPagePaneLayoutSync(elements, reservedLayoutEntries, options);
    return;
  }

  elements.root.classList.remove("has-snapshot", "is-expanded");
  elements.root.classList.toggle("is-pre-detection-visible", allowWithoutSnapshot);
  elements.root.setAttribute("aria-hidden", allowWithoutSnapshot ? "false" : "true");

  if (elements.railToggleButton) {
    elements.railToggleButton.setAttribute("aria-expanded", "false");
  }

  urlForensicsPagePaneLayoutSync(elements, reservedLayoutEntries, options);
  urlForensicsPagePaneLayoutDebugCall(
    options.debugApi,
    "functionOut",
    "content.paneLayout.hidePane",
    urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, shouldSuppressPaneVisibility, options)
  );
}

function urlForensicsPagePaneLayoutToggle(elements, reservedLayoutEntries, options) {
  if (!options.ensurePane()) {
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout toggle blocked: no pane root");
    return {
      ok: false,
      hasSnapshot: false,
      visible: false,
      expanded: false
    };
  }

  if (urlForensicsPagePaneLayoutShouldSuppressPaneVisibility(options)) {
    urlForensicsPagePaneLayoutHide(elements, reservedLayoutEntries, options);
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout toggle blocked: suppressed");
    return {
      ok: false,
      hasSnapshot: false,
      visible: false,
      expanded: false
    };
  }

  if (!options.getLatestSnapshot() && options.shouldAllowOpenWithoutSnapshot() !== true) {
    urlForensicsPagePaneLayoutHide(elements, reservedLayoutEntries, options);
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout toggle blocked: missing snapshot");
    return {
      ok: false,
      hasSnapshot: false,
      visible: false,
      expanded: false
    };
  }

  urlForensicsPagePaneLayoutSetExpanded(elements, reservedLayoutEntries, !elements.isExpanded, options);
  urlForensicsPagePaneLayoutDebugCall(
    options.debugApi,
    "functionOut",
    "content.paneLayout.togglePaneVisibility",
    urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, false, options)
  );
  return {
    ok: true,
    hasSnapshot: !!options.getLatestSnapshot(),
    visible: !!options.getLatestSnapshot() || elements.isExpanded || options.shouldAllowOpenWithoutSnapshot() === true,
    expanded: elements.isExpanded
  };
}

function urlForensicsPagePaneLayoutOpen(elements, reservedLayoutEntries, options) {
  if (!options.ensurePane()) {
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout open blocked: no pane root");
    return {
      ok: false,
      hasSnapshot: false,
      visible: false,
      expanded: false
    };
  }

  if (urlForensicsPagePaneLayoutShouldSuppressPaneVisibility(options)) {
    urlForensicsPagePaneLayoutHide(elements, reservedLayoutEntries, options);
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout open blocked: suppressed");
    return {
      ok: false,
      hasSnapshot: false,
      visible: false,
      expanded: false
    };
  }

  if (!options.getLatestSnapshot() && options.shouldAllowOpenWithoutSnapshot() !== true) {
    urlForensicsPagePaneLayoutHide(elements, reservedLayoutEntries, options);
    urlForensicsPagePaneLayoutDebugCall(options.debugApi, "conditional", "content pane layout open blocked: missing snapshot");
    return {
      ok: false,
      hasSnapshot: false,
      visible: false,
      expanded: false
    };
  }

  urlForensicsPagePaneLayoutSetExpanded(elements, reservedLayoutEntries, true, options);
  urlForensicsPagePaneLayoutDebugCall(
    options.debugApi,
    "functionOut",
    "content.paneLayout.openPane",
    urlForensicsPagePaneLayoutBuildVisibilityDebugDetails(elements, false, options)
  );
  return {
    ok: true,
    hasSnapshot: !!options.getLatestSnapshot(),
    visible: true,
    expanded: true
  };
}

function urlForensicsPagePaneLayoutCreate(options) {
  const resolvedOptions = urlForensicsPagePaneLayoutCreateDefaultOptions(options);
  const reservedLayoutEntries = [];
  const elements = resolvedOptions.elements;

  return Object.freeze({
    hidePane: function hidePane() {
      return urlForensicsPagePaneLayoutHide(elements, reservedLayoutEntries, resolvedOptions);
    },
    openPane: function openPane() {
      return urlForensicsPagePaneLayoutOpen(elements, reservedLayoutEntries, resolvedOptions);
    },
    setPaneExpanded: function setPaneExpanded(isExpanded) {
      return urlForensicsPagePaneLayoutSetExpanded(elements, reservedLayoutEntries, isExpanded, resolvedOptions);
    },
    showPane: function showPane() {
      return urlForensicsPagePaneLayoutShow(elements, reservedLayoutEntries, resolvedOptions);
    },
    syncPageViewportReservation: function syncPageViewportReservation() {
      return urlForensicsPagePaneLayoutSync(elements, reservedLayoutEntries, resolvedOptions);
    },
    togglePaneVisibility: function togglePaneVisibility() {
      return urlForensicsPagePaneLayoutToggle(elements, reservedLayoutEntries, resolvedOptions);
    }
  });
}

(function attachUrlForensicsPagePaneLayout(globalScope) {
  const pagePaneLayout = Object.freeze({
    create: urlForensicsPagePaneLayoutCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneLayout;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneLayout = pagePaneLayout;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
