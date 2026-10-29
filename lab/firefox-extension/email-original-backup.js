"use strict";

const urlForensicsEmailOriginalBackupPropertyName = "__urlForensicsOriginalEmailBackup";

function urlForensicsEmailOriginalBackupReadElement(element) {
  if (!element || typeof element !== "object") {
    return null;
  }

  try {
    return element[urlForensicsEmailOriginalBackupPropertyName] || null;
  } catch {
    return null;
  }
}

function urlForensicsEmailOriginalBackupWriteElement(element, backup) {
  if (!element || typeof element !== "object" || !backup) {
    return false;
  }

  try {
    Object.defineProperty(element, urlForensicsEmailOriginalBackupPropertyName, {
      configurable: true,
      enumerable: false,
      value: backup,
      writable: true
    });
    return true;
  } catch {
    try {
      element[urlForensicsEmailOriginalBackupPropertyName] = backup;
      return true;
    } catch {
      return false;
    }
  }
}

function urlForensicsEmailOriginalBackupRead(root, contentElement) {
  return urlForensicsEmailOriginalBackupReadElement(root) ||
    urlForensicsEmailOriginalBackupReadElement(contentElement);
}

function urlForensicsEmailOriginalBackupFreeze(value) {
  return Object.freeze({
    capturedAt: Number(value && value.capturedAt || 0) || Date.now(),
    sourceHtml: String(value && value.sourceHtml || ""),
    rawText: String(value && value.rawText || "")
  });
}

function urlForensicsEmailOriginalBackupCreateFromSnapshot(snapshot, getNow) {
  const safeSnapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
  const existingBackup = safeSnapshot.originalEmailBackup && typeof safeSnapshot.originalEmailBackup === "object"
    ? safeSnapshot.originalEmailBackup
    : null;

  if (existingBackup) {
    return urlForensicsEmailOriginalBackupFreeze(existingBackup);
  }

  return Object.freeze({
    capturedAt: Number(safeSnapshot.detectedAt || 0) ||
      (typeof getNow === "function" ? getNow() : Date.now()),
    sourceHtml: String(safeSnapshot.sourceHtml || ""),
    rawText: String(safeSnapshot.rawText || "")
  });
}

function urlForensicsEmailOriginalBackupWrite(root, contentElement, backup) {
  const wroteRoot = urlForensicsEmailOriginalBackupWriteElement(root, backup);
  const wroteContent = contentElement !== root
    ? urlForensicsEmailOriginalBackupWriteElement(contentElement, backup)
    : true;

  return wroteRoot || wroteContent;
}

function urlForensicsEmailOriginalBackupGetOrCreate(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const existingBackup = urlForensicsEmailOriginalBackupRead(optionBag.root, optionBag.contentElement);

  if (existingBackup && typeof existingBackup === "object") {
    return existingBackup;
  }

  const backup = Object.freeze({
    capturedAt: typeof optionBag.getNow === "function" ? optionBag.getNow() : Date.now(),
    sourceHtml: String(optionBag.sourceHtml || ""),
    rawText: String(optionBag.rawText || "")
  });

  urlForensicsEmailOriginalBackupWrite(optionBag.root, optionBag.contentElement, backup);
  return backup;
}

function urlForensicsEmailOriginalBackupPreserveFromSnapshot(root, contentElement, snapshot, getNow) {
  if (!snapshot) {
    return null;
  }

  const backup = urlForensicsEmailOriginalBackupCreateFromSnapshot(snapshot, getNow);
  urlForensicsEmailOriginalBackupWrite(root, contentElement, backup);
  return backup;
}

(function attachUrlForensicsEmailOriginalBackup(globalScope) {
  const emailOriginalBackup = Object.freeze({
    createFromSnapshot: urlForensicsEmailOriginalBackupCreateFromSnapshot,
    getOrCreate: urlForensicsEmailOriginalBackupGetOrCreate,
    preserveFromSnapshot: urlForensicsEmailOriginalBackupPreserveFromSnapshot,
    read: urlForensicsEmailOriginalBackupRead,
    readElement: urlForensicsEmailOriginalBackupReadElement,
    write: urlForensicsEmailOriginalBackupWrite,
    writeElement: urlForensicsEmailOriginalBackupWriteElement
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = emailOriginalBackup;
  }

  if (globalScope) {
    globalScope.urlForensicsEmailOriginalBackup = emailOriginalBackup;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
