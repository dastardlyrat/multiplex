"use strict";

function urlForensicsMobileDeviceSafelyMatchesMediaQuery(windowObject, mediaQuery) {
  if (!windowObject || typeof windowObject.matchMedia !== "function") {
    return false;
  }

  try {
    return !!windowObject.matchMedia(mediaQuery).matches;
  } catch {
    return false;
  }
}

function urlForensicsMobileDeviceHasNavigatorSignal(navigatorObject) {
  const safeNavigator = navigatorObject && typeof navigatorObject === "object" ? navigatorObject : {};
  const userAgentData = safeNavigator.userAgentData && typeof safeNavigator.userAgentData === "object"
    ? safeNavigator.userAgentData
    : null;

  if (userAgentData && userAgentData.mobile === true) {
    return true;
  }

  const userAgent = String(safeNavigator.userAgent || "");
  const platform = String(safeNavigator.platform || "");
  const maxTouchPoints = Number(safeNavigator.maxTouchPoints || 0);

  return /\b(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Windows Phone|Mobile|Opera Mini)\b/i.test(userAgent) ||
    (/MacIntel/i.test(platform) && maxTouchPoints > 1);
}

function urlForensicsMobileDeviceGetNarrowestViewportSide(windowObject) {
  const safeWindow = windowObject && typeof windowObject === "object" ? windowObject : {};
  const screenObject = safeWindow.screen && typeof safeWindow.screen === "object" ? safeWindow.screen : {};
  const viewportSides = [
    Number(safeWindow.innerWidth || 0),
    Number(safeWindow.innerHeight || 0),
    Number(screenObject.width || 0),
    Number(screenObject.height || 0),
    Number(screenObject.availWidth || 0),
    Number(screenObject.availHeight || 0)
  ].filter(function keepFiniteViewportSide(sideValue) {
    return Number.isFinite(sideValue) && sideValue > 0;
  });

  return viewportSides.length ? Math.min.apply(null, viewportSides) : Infinity;
}

function urlForensicsMobileDeviceIsDetected(windowObject, navigatorObject) {
  const safeWindow = windowObject && typeof windowObject === "object"
    ? windowObject
    : (typeof window !== "undefined" ? window : null);
  const safeNavigator = navigatorObject && typeof navigatorObject === "object"
    ? navigatorObject
    : (typeof navigator !== "undefined" ? navigator : null);

  if (urlForensicsMobileDeviceHasNavigatorSignal(safeNavigator)) {
    return true;
  }

  const hasCoarsePointer =
    urlForensicsMobileDeviceSafelyMatchesMediaQuery(safeWindow, "(hover: none) and (pointer: coarse)") ||
    urlForensicsMobileDeviceSafelyMatchesMediaQuery(safeWindow, "(pointer: coarse)");
  const maxTouchPoints = Number(safeNavigator && safeNavigator.maxTouchPoints || 0);
  const narrowestViewportSide = urlForensicsMobileDeviceGetNarrowestViewportSide(safeWindow);

  return hasCoarsePointer && maxTouchPoints > 0 && narrowestViewportSide <= 932;
}

(function attachUrlForensicsMobileDevice(globalScope) {
  const mobileDevice = Object.freeze({
    getNarrowestViewportSide: urlForensicsMobileDeviceGetNarrowestViewportSide,
    hasNavigatorSignal: urlForensicsMobileDeviceHasNavigatorSignal,
    isMobileDeviceDetected: urlForensicsMobileDeviceIsDetected,
    safelyMatchesMediaQuery: urlForensicsMobileDeviceSafelyMatchesMediaQuery
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = mobileDevice;
  }

  if (globalScope) {
    globalScope.urlForensicsMobileDevice = mobileDevice;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
