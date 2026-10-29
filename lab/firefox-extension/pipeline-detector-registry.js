// Shared detector registry for URL token discovery.
"use strict";

function urlForensicsPipelineDetectorRegistryNormalizeDetector(detectorDefinition) {
  const safeDetectorDefinition = detectorDefinition && typeof detectorDefinition === "object" ? detectorDefinition : {};

  return Object.freeze({
    id: String(safeDetectorDefinition.id || "").trim(),
    title: String(safeDetectorDefinition.title || "").trim(),
    kind: String(safeDetectorDefinition.kind || "").trim(),
    priority: Number.isFinite(safeDetectorDefinition.priority) ? safeDetectorDefinition.priority : 0,
    summary: String(safeDetectorDefinition.summary || "").trim(),
    supportedTokens: Object.freeze((Array.isArray(safeDetectorDefinition.supportedTokens) ? safeDetectorDefinition.supportedTokens : [])
      .map(function normalizeSupportedToken(tokenValue) {
        return String(tokenValue || "").trim();
      })
      .filter(Boolean)),
    supportedRepairs: Object.freeze((Array.isArray(safeDetectorDefinition.supportedRepairs) ? safeDetectorDefinition.supportedRepairs : [])
      .map(function normalizeSupportedRepair(repairValue) {
        return String(repairValue || "").trim();
      })
      .filter(Boolean)),
    detectMatches: typeof safeDetectorDefinition.detectMatches === "function"
      ? safeDetectorDefinition.detectMatches
      : null
  });
}

function urlForensicsPipelineDetectorRegistryCreateRegexMatcher(pattern) {
  if (pattern instanceof RegExp) {
    return new RegExp(pattern.source, pattern.flags);
  }

  if (pattern && pattern.expression instanceof RegExp) {
    return new RegExp(pattern.expression.source, pattern.expression.flags);
  }

  return null;
}

function urlForensicsPipelineDetectorRegistryIsDelimiter(character) {
  return !character || /\s/.test(character) || character === "<" || character === ">" || character === "\"" || character === "'";
}

function urlForensicsPipelineDetectorRegistryHasRepairBoundary(textValue, startIndex) {
  if (startIndex <= 0) {
    return true;
  }

  return !/[a-z]/.test(textValue.charAt(startIndex - 1));
}

function urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, startIndex, prefix) {
  return textValue.slice(startIndex, startIndex + prefix.length).toLowerCase() === prefix;
}

function urlForensicsPipelineDetectorRegistryConsumeToken(textValue, startIndex, prefixLength) {
  let nextIndex = startIndex + prefixLength;

  if (nextIndex >= textValue.length || urlForensicsPipelineDetectorRegistryIsDelimiter(textValue.charAt(nextIndex))) {
    return null;
  }

  while (nextIndex < textValue.length && !urlForensicsPipelineDetectorRegistryIsDelimiter(textValue.charAt(nextIndex))) {
    nextIndex += 1;
  }

  return Object.freeze({
    endIndex: nextIndex,
    value: textValue.slice(startIndex, nextIndex).trim()
  });
}

function urlForensicsPipelineDetectorRegistryConsumeWhitespaceRepairToken(textValue, startIndex, prefixLength) {
  let nextIndex = startIndex + prefixLength;
  const whitespaceStartIndex = nextIndex;

  while (nextIndex < textValue.length && /\s/.test(textValue.charAt(nextIndex))) {
    nextIndex += 1;
  }

  if (
    nextIndex === whitespaceStartIndex ||
    nextIndex >= textValue.length ||
    urlForensicsPipelineDetectorRegistryIsDelimiter(textValue.charAt(nextIndex))
  ) {
    return null;
  }

  while (nextIndex < textValue.length && !urlForensicsPipelineDetectorRegistryIsDelimiter(textValue.charAt(nextIndex))) {
    nextIndex += 1;
  }

  return Object.freeze({
    endIndex: nextIndex,
    value: textValue.slice(startIndex, nextIndex).trim()
  });
}

function urlForensicsPipelineDetectorRegistryIsEmailLeftBoundary(character) {
  return !character || /\s/.test(character) || character === "<" || character === ">" || character === "(" || character === "[" || character === "{" || character === "\"" || character === "'" || character === "," || character === ";";
}

function urlForensicsPipelineDetectorRegistryIsEmailRightBoundary(character) {
  return !character || /\s/.test(character) || character === "<" || character === ">" || character === ")" || character === "]" || character === "}" || character === "\"" || character === "'" || character === "." || character === "," || character === ";" || character === ":" || character === "!" || character === "?";
}

function urlForensicsPipelineDetectorRegistryConsumeMailtoToken(textValue, startIndex) {
  const candidateText = textValue.slice(startIndex);
  const matchedToken = candidateText.match(/^mailto:[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\?[^\s<>"']*)?/i);
  const nextCharacter = matchedToken ? textValue.charAt(startIndex + matchedToken[0].length) : "";

  if (!matchedToken || !urlForensicsPipelineDetectorRegistryIsEmailRightBoundary(nextCharacter)) {
    return null;
  }

  return Object.freeze({
    endIndex: startIndex + matchedToken[0].length,
    value: matchedToken[0]
  });
}

function urlForensicsPipelineDetectorRegistryConsumeEmailToken(textValue, startIndex) {
  const candidateText = textValue.slice(startIndex);
  const matchedToken = candidateText.match(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i);
  const nextCharacter = matchedToken ? textValue.charAt(startIndex + matchedToken[0].length) : "";

  if (!matchedToken || !urlForensicsPipelineDetectorRegistryIsEmailRightBoundary(nextCharacter)) {
    return null;
  }

  return Object.freeze({
    endIndex: startIndex + matchedToken[0].length,
    value: matchedToken[0]
  });
}

function urlForensicsPipelineDetectorRegistryDetectDirectToken(textValue, characterIndex) {
  const previousCharacter = characterIndex > 0 ? textValue.charAt(characterIndex - 1) : "";

  if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "https://")) {
    return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 8);
  }

  if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "http://")) {
    return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 7);
  }

  if (
    urlForensicsPipelineDetectorRegistryIsEmailLeftBoundary(previousCharacter) &&
    urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "mailto:")
  ) {
    return urlForensicsPipelineDetectorRegistryConsumeMailtoToken(textValue, characterIndex);
  }

  if (urlForensicsPipelineDetectorRegistryIsEmailLeftBoundary(previousCharacter)) {
    return urlForensicsPipelineDetectorRegistryConsumeEmailToken(textValue, characterIndex);
  }

  return null;
}

function urlForensicsPipelineDetectorRegistryDetectRepairToken(textValue, characterIndex) {
  if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "https://")) {
    return urlForensicsPipelineDetectorRegistryConsumeWhitespaceRepairToken(textValue, characterIndex, 8);
  }

  if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "http://")) {
    return urlForensicsPipelineDetectorRegistryConsumeWhitespaceRepairToken(textValue, characterIndex, 7);
  }

  if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "https:/")) {
    const nextCharacter = textValue.charAt(characterIndex + 7);
    if (nextCharacter && nextCharacter !== "/" && !urlForensicsPipelineDetectorRegistryIsDelimiter(nextCharacter)) {
      return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 7);
    }
  } else if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "http:/")) {
    const nextCharacter = textValue.charAt(characterIndex + 6);
    if (nextCharacter && nextCharacter !== "/" && !urlForensicsPipelineDetectorRegistryIsDelimiter(nextCharacter)) {
      return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 6);
    }
  } else if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "https//")) {
    return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 7);
  } else if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "http//")) {
    return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 6);
  } else if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "ttps://")) {
    return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 7);
  } else if (urlForensicsPipelineDetectorRegistryStartsWithIgnoreCase(textValue, characterIndex, "ttp://")) {
    return urlForensicsPipelineDetectorRegistryConsumeToken(textValue, characterIndex, 6);
  }

  return null;
}

function urlForensicsPipelineDetectorRegistryCollectRegexMatches(textValue, options, helpers) {
  const optionBag = options || {};
  const convertValueToString = helpers.convertValueToString;
  const regularExpressions = helpers.regularExpressions;
  const detectedMatches = [];
  const seenKeys = new Set();

  function appendMatches(pattern, tokenGroupIndex) {
    const matchPattern = urlForensicsPipelineDetectorRegistryCreateRegexMatcher(pattern);
    let currentMatch = null;

    if (!matchPattern) {
      return;
    }

    while ((currentMatch = matchPattern.exec(textValue)) !== null) {
      const matchedToken = convertValueToString(
        typeof tokenGroupIndex === "number" ? currentMatch[tokenGroupIndex] : currentMatch[0]
      ).trim();
      const fullMatchedText = convertValueToString(currentMatch[0]);

      if (!matchedToken) {
        continue;
      }

      const tokenStartIndex = (currentMatch.index || 0) + Math.max(0, fullMatchedText.indexOf(matchedToken));
      const tokenKey = String(tokenStartIndex) + "|" + matchedToken;

      if (seenKeys.has(tokenKey)) {
        continue;
      }

      seenKeys.add(tokenKey);
      detectedMatches.push(Object.freeze({
        index: tokenStartIndex,
        value: matchedToken
      }));
    }
  }

  appendMatches(regularExpressions.urlToken);

  appendMatches(
    /(^|[\s<>(\[{"',;])(mailto:[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\?[^\s<>"']*)?)(?=$|[\s<>)\]}"'.,;:!?])/gi,
    2
  );
  appendMatches(
    /(^|[\s<>(\[{"',;])([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=$|[\s<>)\]}"'.,;:!?])/gi,
    2
  );

  if (optionBag.enableUrlNormalizationRepair && Array.isArray(regularExpressions.repairableUrlTokenPatterns)) {
    regularExpressions.repairableUrlTokenPatterns.forEach(function appendRepairablePattern(patternDefinition) {
      appendMatches(
        patternDefinition,
        patternDefinition && typeof patternDefinition.tokenGroupIndex === "number"
          ? patternDefinition.tokenGroupIndex
          : 1
      );
    });
  }

  detectedMatches.sort(function compareMatches(leftMatch, rightMatch) {
    return leftMatch.index - rightMatch.index;
  });

  return detectedMatches;
}

function urlForensicsPipelineDetectorRegistryCollectDeterministicMatches(textValue, options) {
  const optionBag = options || {};
  const detectedMatches = [];
  const seenKeys = new Set();

  function rememberToken(startIndex, tokenResult) {
    if (!tokenResult || !tokenResult.value) {
      return false;
    }

    const tokenKey = String(startIndex) + "|" + tokenResult.value;
    if (seenKeys.has(tokenKey)) {
      return false;
    }

    seenKeys.add(tokenKey);
    detectedMatches.push(Object.freeze({
      index: startIndex,
      value: tokenResult.value
    }));
    return true;
  }

  for (let characterIndex = 0; characterIndex < textValue.length; characterIndex += 1) {
    let detectedToken = urlForensicsPipelineDetectorRegistryDetectDirectToken(textValue, characterIndex);

    if (rememberToken(characterIndex, detectedToken)) {
      characterIndex = detectedToken.endIndex - 1;
      continue;
    }

    if (!optionBag.enableUrlNormalizationRepair || !urlForensicsPipelineDetectorRegistryHasRepairBoundary(textValue, characterIndex)) {
      continue;
    }

    detectedToken = urlForensicsPipelineDetectorRegistryDetectRepairToken(textValue, characterIndex);

    if (rememberToken(characterIndex, detectedToken)) {
      characterIndex = detectedToken.endIndex - 1;
    }
  }

  detectedMatches.sort(function compareMatches(leftMatch, rightMatch) {
    return leftMatch.index - rightMatch.index;
  });

  return detectedMatches;
}

// eslint-disable-next-line max-lines-per-function -- Registry creation keeps built-in detector setup and merge logic together for both Node and browser callers.
function urlForensicsPipelineDetectorRegistryCreate(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const convertValueToString = pipelineBase && typeof pipelineBase.convertValueToString === "function"
    ? pipelineBase.convertValueToString
    : function fallbackConvertValueToString(value) {
      return String(value || "");
    };
  const regularExpressions = pipelineBase && pipelineBase.regularExpressions ? pipelineBase.regularExpressions : null;
  const registeredDetectors = new Map();
  let detectorSequence = 0;

  if (!regularExpressions) {
    throw new Error("URL Forensics pipeline base regular expressions are unavailable.");
  }

  function listDetectorEntries() {
    return Array.from(registeredDetectors.values())
      .sort(function compareDetectorEntries(leftEntry, rightEntry) {
        const priorityDelta = (leftEntry.detector.priority || 0) - (rightEntry.detector.priority || 0);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return leftEntry.sequence - rightEntry.sequence;
      });
  }

  function rememberDetector(detectorDefinition) {
    const normalizedDetector = urlForensicsPipelineDetectorRegistryNormalizeDetector(detectorDefinition);

    if (!normalizedDetector.id) {
      throw new Error("URL Forensics detector id is required.");
    }

    if (!normalizedDetector.detectMatches) {
      throw new Error("URL Forensics detector detectMatches handler is required for " + normalizedDetector.id + ".");
    }

    registeredDetectors.set(normalizedDetector.id, Object.freeze({
      detector: normalizedDetector,
      sequence: detectorSequence
    }));
    detectorSequence += 1;
    return normalizedDetector;
  }

  function registerDetector(detectorDefinition) {
    return rememberDetector(detectorDefinition);
  }

  function listDetectors() {
    return listDetectorEntries().map(function mapEntryToDetector(entry) {
      return Object.freeze({
        id: entry.detector.id,
        title: entry.detector.title,
        kind: entry.detector.kind,
        priority: entry.detector.priority,
        summary: entry.detector.summary,
        supportedTokens: entry.detector.supportedTokens.slice(),
        supportedRepairs: entry.detector.supportedRepairs.slice()
      });
    });
  }

  function getDetector(detectorId) {
    const detectorEntry = registeredDetectors.get(String(detectorId || "").trim());

    if (!detectorEntry) {
      return null;
    }

    return Object.freeze({
      id: detectorEntry.detector.id,
      title: detectorEntry.detector.title,
      kind: detectorEntry.detector.kind,
      priority: detectorEntry.detector.priority,
      summary: detectorEntry.detector.summary,
      supportedTokens: detectorEntry.detector.supportedTokens.slice(),
      supportedRepairs: detectorEntry.detector.supportedRepairs.slice()
    });
  }

  function detectText(textToScan, options) {
    const safeTextToScan = convertValueToString(textToScan);
    const mergedMatches = new Map();
    let nextOrder = 0;

    listDetectorEntries().forEach(function detectWithRegisteredDetector(entry) {
      const rawMatches = entry.detector.detectMatches(safeTextToScan, options || {}, {
        convertValueToString: convertValueToString,
        regularExpressions: regularExpressions
      });

      (Array.isArray(rawMatches) ? rawMatches : []).forEach(function rememberMatch(rawMatch) {
        const safeMatch = rawMatch && typeof rawMatch === "object" ? rawMatch : {};
        const matchIndex = Number.isFinite(safeMatch.index) ? safeMatch.index : -1;
        const matchValue = convertValueToString(safeMatch.value).trim();

        if (matchIndex < 0 || !matchValue) {
          return;
        }

        const matchKey = String(matchIndex) + "|" + matchValue;
        const existingMatch = mergedMatches.get(matchKey);

        if (existingMatch) {
          if (existingMatch.detectorIds.indexOf(entry.detector.id) === -1) {
            existingMatch.detectorIds.push(entry.detector.id);
          }
          return;
        }

        mergedMatches.set(matchKey, {
          detectorIds: [entry.detector.id],
          index: matchIndex,
          order: nextOrder,
          value: matchValue
        });
        nextOrder += 1;
      });
    });

    return Array.from(mergedMatches.values())
      .sort(function compareDetectedMatches(leftMatch, rightMatch) {
        if (leftMatch.index !== rightMatch.index) {
          return leftMatch.index - rightMatch.index;
        }

        return leftMatch.order - rightMatch.order;
      })
      .map(function freezeDetectedMatch(matchRecord) {
        return Object.freeze({
          detectorIds: Object.freeze(matchRecord.detectorIds.slice()),
          index: matchRecord.index,
          value: matchRecord.value
        });
      });
  }

  rememberDetector({
    id: "regex",
    title: "Regex",
    kind: "regex",
    priority: 0,
    summary: "Pattern-driven discovery using the resolved URL token rules plus explicit email patterns.",
    supportedTokens: [
      "https://",
      "http://",
      "mailto:",
      "bare email"
    ],
    supportedRepairs: [
      "protocol whitespace",
      "single slash",
      "missing colon",
      "missing leading h"
    ],
    detectMatches: function detectWithRegex(textValue, detectionOptions, helpers) {
      return urlForensicsPipelineDetectorRegistryCollectRegexMatches(textValue, detectionOptions, helpers);
    }
  });

  rememberDetector({
    id: "tokenizer",
    title: "Tokenizer",
    kind: "tokenizer",
    priority: 1,
    summary: "Deterministic character scanner with explicit token boundaries for links, repairs, and emails.",
    supportedTokens: [
      "https://",
      "http://",
      "mailto:",
      "bare email"
    ],
    supportedRepairs: [
      "protocol whitespace",
      "single slash",
      "missing colon",
      "missing leading h"
    ],
    detectMatches: function detectWithDeterministicTokenizer(textValue, detectionOptions) {
      return urlForensicsPipelineDetectorRegistryCollectDeterministicMatches(textValue, detectionOptions);
    }
  });

  return Object.freeze({
    detectText: detectText,
    getDetector: getDetector,
    listDetectors: listDetectors,
    registerDetector: registerDetector
  });
}

(function attachUrlForensicsPipelineDetectorRegistry(globalScope) {
  const pipelineDetectorRegistry = Object.freeze({
    create: urlForensicsPipelineDetectorRegistryCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineDetectorRegistry;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineDetectorRegistry = pipelineDetectorRegistry;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
