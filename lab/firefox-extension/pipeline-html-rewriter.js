// Shared HTML rewrite helpers for the URL Forensics pipeline.
"use strict";

// Function: create HTML rewriter context.
function urlForensicsPipelineHtmlCreateRewriterContext(options) {
  const optionBag = options || {};
  const pipelineBase = optionBag.pipelineBase;

  if (!pipelineBase || !pipelineBase.regularExpressions) {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  if (!optionBag.urlResolver) {
    throw new Error("URL Forensics pipeline URL resolver helpers are unavailable.");
  }

  return Object.freeze({
    globalScope: optionBag.globalScope,
    regularExpressions: pipelineBase.regularExpressions,
    convertValueToString: pipelineBase.convertValueToString,
    resolvePipelineSettings: pipelineBase.resolvePipelineSettings,
    cleanInputText: pipelineBase.cleanInputText,
    urlResolver: optionBag.urlResolver,
    detectTokenMatches: typeof optionBag.detectTokenMatches === "function"
      ? optionBag.detectTokenMatches
      : function detectNoTokenMatches() {
        return [];
      },
    getPreferredReplacementUrl: optionBag.getPreferredReplacementUrl,
    getItemDisplayType: optionBag.getItemDisplayType,
    analyzeInput: optionBag.analyzeInput,
    getNodeFilterFlag: function getNodeFilterFlag(flagName, fallbackValue) {
      return pipelineBase.getNodeFilterFlag(optionBag.globalScope, flagName, fallbackValue);
    },
    getNodeTypeValue: function getNodeTypeValue(typeName, fallbackValue) {
      return pipelineBase.getNodeTypeValue(optionBag.globalScope, typeName, fallbackValue);
    },
    createHtmlParserDocument: function createHtmlParserDocument(sourceMarkup) {
      return pipelineBase.createHtmlParserDocument(optionBag.globalScope, sourceMarkup);
    }
  });
}

// Function: detect token matches in text.
function urlForensicsPipelineHtmlDetectTokenMatches(context, textValue, options) {
  const rawMatches = context.detectTokenMatches(context.convertValueToString(textValue), options || {});

  return Array.isArray(rawMatches)
    ? rawMatches.map(function mapMatch(rawMatch) {
      return {
        index: Number.isFinite(rawMatch && rawMatch.index) ? rawMatch.index : -1,
        value: context.convertValueToString(rawMatch && rawMatch.value).trim()
      };
    }).filter(function keepMatch(matchRecord) {
      return matchRecord.index >= 0 && !!matchRecord.value;
    })
    : [];
}

// Function: check whether href is a directly detected token.
function urlForensicsPipelineHtmlIsDirectDetectedHref(context, hrefValue, options) {
  const trimmedHrefValue = context.convertValueToString(hrefValue).trim();
  const detectedMatches = urlForensicsPipelineHtmlDetectTokenMatches(context, trimmedHrefValue, options);

  return !!(
    detectedMatches.length &&
    detectedMatches[0].index === 0 &&
    detectedMatches[0].value === trimmedHrefValue
  );
}

// Function: normalize anchor text.
function urlForensicsPipelineHtmlNormalizeAnchorText(context, textValue) {
  return context.convertValueToString(textValue)
    .replace(/\u00A0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .trim();
}

// Function: normalize text value.
function urlForensicsPipelineHtmlNormalizeTextValue(context, textValue) {
  return context.convertValueToString(textValue)
    .replace(context.regularExpressions.heavyWhitespaceNoise, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

// Function: build type lookup.
function urlForensicsPipelineHtmlBuildTypeLookup(context, items) {
  const typeByOriginalUrl = new Map();
  const typeByNormalizedUrl = new Map();

  (items || []).forEach(function inspectTypedItem(item) {
    const detectedType = context.getItemDisplayType(item);
    const originalUrl = context.convertValueToString(item.original).trim();
    const normalizedUrl = context.convertValueToString(item.normalized).trim();

    if (originalUrl && !typeByOriginalUrl.has(originalUrl)) {
      typeByOriginalUrl.set(originalUrl, detectedType);
    }

    if (normalizedUrl && !typeByNormalizedUrl.has(normalizedUrl)) {
      typeByNormalizedUrl.set(normalizedUrl, detectedType);
    }
  });

  return {
    byOriginal: typeByOriginalUrl,
    byNormalized: typeByNormalizedUrl
  };
}

// Function: build replacement lookup.
function urlForensicsPipelineHtmlBuildReplacementLookup(context, items) {
  const replacementByOriginalUrl = new Map();
  const replacementByNormalizedUrl = new Map();

  (items || []).forEach(function inspectReplacementItem(item) {
    const replacementUrl = context.getPreferredReplacementUrl(item);
    const originalUrl = context.convertValueToString(item.original).trim();
    const normalizedUrl = context.convertValueToString(item.normalized).trim();

    if (!replacementUrl) {
      return;
    }

    if (originalUrl && !replacementByOriginalUrl.has(originalUrl)) {
      replacementByOriginalUrl.set(originalUrl, replacementUrl);
    }

    if (normalizedUrl && !replacementByNormalizedUrl.has(normalizedUrl)) {
      replacementByNormalizedUrl.set(normalizedUrl, replacementUrl);
    }
  });

  return {
    byOriginal: replacementByOriginalUrl,
    byNormalized: replacementByNormalizedUrl
  };
}

// Function: lookup detected type.
function urlForensicsPipelineHtmlLookupDetectedType(context, typeLookup, urlValue, options) {
  const trimmedUrlValue = context.convertValueToString(urlValue).trim();

  if (!trimmedUrlValue) {
    return "";
  }

  if (typeLookup.byOriginal.has(trimmedUrlValue)) {
    return typeLookup.byOriginal.get(trimmedUrlValue);
  }

  const normalizedUrlValue = context.urlResolver.peel(trimmedUrlValue, options).value;

  if (typeLookup.byNormalized.has(normalizedUrlValue)) {
    return typeLookup.byNormalized.get(normalizedUrlValue);
  }

  return context.urlResolver.classifyUrlValue(trimmedUrlValue);
}

// Function: lookup replacement URL.
function urlForensicsPipelineHtmlLookupReplacementUrl(context, replacementLookup, urlValue, options) {
  const trimmedUrlValue = context.convertValueToString(urlValue).trim();

  if (!trimmedUrlValue) {
    return "";
  }

  if (replacementLookup.byOriginal.has(trimmedUrlValue)) {
    return replacementLookup.byOriginal.get(trimmedUrlValue);
  }

  const normalizedUrlValue = context.urlResolver.peel(trimmedUrlValue, options).value;

  if (replacementLookup.byNormalized.has(normalizedUrlValue)) {
    return replacementLookup.byNormalized.get(normalizedUrlValue);
  }

  return "";
}

// Function: check whether text looks like a URL label.
function urlForensicsPipelineHtmlLooksLikeUrlText(context, textValue) {
  const normalizedAnchorText = urlForensicsPipelineHtmlNormalizeAnchorText(context, textValue);
  return !normalizedAnchorText || /^https?:\/\//i.test(normalizedAnchorText) || normalizedAnchorText === normalizedAnchorText.toLowerCase();
}

// Function: check whether a child node is a line break element.
function urlForensicsPipelineHtmlIsLineBreakElementNode(context, childNode) {
  return childNode.nodeType === context.getNodeTypeValue("ELEMENT_NODE", 1) && childNode.tagName === "BR";
}

// Function: check whether a text node should not reset a line break run.
function urlForensicsPipelineHtmlIsIgnorableLineBreakTextSeparator(context, childNode, shouldNormalizeTextSeparators) {
  if (childNode.nodeType !== context.getNodeTypeValue("TEXT_NODE", 3)) {
    return false;
  }

  const separatorText = shouldNormalizeTextSeparators
    ? urlForensicsPipelineHtmlNormalizeTextValue(context, childNode.nodeValue || "")
    : (childNode.nodeValue || "");

  return !separatorText.trim();
}

// Function: trim line break runs.
function urlForensicsPipelineHtmlTrimLineBreakRuns(context, rootNode, options) {
  const optionBag = options || {};
  const shouldNormalizeTextSeparators = optionBag.normalizeTextSeparators === true;

  Array.from(rootNode.querySelectorAll("*")).forEach(function trimLineBreakRunsForElement(elementNode) {
    let consecutiveBreakCount = 0;

    Array.from(elementNode.childNodes).forEach(function inspectLineBreakRunNode(childNode) {
      if (urlForensicsPipelineHtmlIsLineBreakElementNode(context, childNode)) {
        consecutiveBreakCount += 1;

        if (consecutiveBreakCount > 2) {
          childNode.remove();
        }
        return;
      }

      if (urlForensicsPipelineHtmlIsIgnorableLineBreakTextSeparator(context, childNode, shouldNormalizeTextSeparators)) {
        return;
      }

      consecutiveBreakCount = 0;
    });
  });
}

// Function: collect markup text nodes.
function urlForensicsPipelineHtmlCollectTextNodes(context, rootNode) {
  const textWalker = rootNode.ownerDocument.createTreeWalker(rootNode, context.getNodeFilterFlag("SHOW_TEXT", 4));
  const textNodes = [];
  let currentTextNode = textWalker.nextNode();

  while (currentTextNode) {
    textNodes.push(currentTextNode);
    currentTextNode = textWalker.nextNode();
  }

  return textNodes;
}

// Function: normalize markup text node.
function urlForensicsPipelineHtmlNormalizeTextNode(context, textNode) {
  const parentTagName = textNode.parentElement ? textNode.parentElement.tagName : "";

  if (context.regularExpressions.protectedMarkupTag.test(parentTagName)) {
    return;
  }

  const normalizedNodeValue = urlForensicsPipelineHtmlNormalizeTextValue(context, textNode.nodeValue || "");

  if (!normalizedNodeValue.trim()) {
    textNode.remove();
    return;
  }

  if (normalizedNodeValue !== (textNode.nodeValue || "")) {
    textNode.nodeValue = normalizedNodeValue;
  }
}

// Function: normalize markup anchor.
function urlForensicsPipelineHtmlNormalizeAnchor(context, anchorElement) {
  const trimmedHref = context.convertValueToString(anchorElement.getAttribute("href")).trim();
  anchorElement.setAttribute("href", trimmedHref);

  const normalizedAnchorLabel = urlForensicsPipelineHtmlNormalizeAnchorText(context, anchorElement.textContent || "");
  if (normalizedAnchorLabel) {
    anchorElement.textContent = normalizedAnchorLabel;
  }
}

// Function: cleanup markup.
function urlForensicsPipelineHtmlCleanupMarkup(context, rootNode) {
  if (!rootNode || !rootNode.ownerDocument) {
    return;
  }

  urlForensicsPipelineHtmlCollectTextNodes(context, rootNode).forEach(function normalizeTextNode(textNode) {
    urlForensicsPipelineHtmlNormalizeTextNode(context, textNode);
  });

  Array.from(rootNode.querySelectorAll("a[href]")).forEach(function normalizeAnchor(anchorElement) {
    urlForensicsPipelineHtmlNormalizeAnchor(context, anchorElement);
  });

  urlForensicsPipelineHtmlTrimLineBreakRuns(context, rootNode, { normalizeTextSeparators: true });
}

// Function: rewrite anchors.
function urlForensicsPipelineHtmlRewriteAnchors(context, rootNode, replacementLookup, typeLookup, options) {
  let rewrittenAnchorCount = 0;

  Array.from(rootNode.querySelectorAll("a[href]")).forEach(function rewriteAnchor(anchorElement) {
    const originalHref = context.convertValueToString(anchorElement.getAttribute("href")).trim();
    const replacementUrl = urlForensicsPipelineHtmlLookupReplacementUrl(context, replacementLookup, originalHref, options);

    if (!replacementUrl) {
      return;
    }

    const detectedType = urlForensicsPipelineHtmlLookupDetectedType(context, typeLookup, originalHref, options);
    const finalUrlEntry = context.urlResolver.buildFinalUrlEntry(replacementUrl, { detectedType: detectedType });

    anchorElement.setAttribute("href", replacementUrl);
    anchorElement.setAttribute("data-merged-link-lab", finalUrlEntry.type);

    if (urlForensicsPipelineHtmlLooksLikeUrlText(context, anchorElement.textContent || "")) {
      anchorElement.textContent = context.urlResolver.buildFinalUrlLinkText(finalUrlEntry);
    }

    rewrittenAnchorCount += 1;
  });

  return rewrittenAnchorCount;
}

// Function: collect text URL rewrite candidates.
function urlForensicsPipelineHtmlCollectUrlTextNodes(context, rootNode, options) {
  const textWalker = rootNode.ownerDocument.createTreeWalker(rootNode, context.getNodeFilterFlag("SHOW_TEXT", 4));
  const candidateTextNodes = [];
  let currentTextNode = textWalker.nextNode();

  while (currentTextNode) {
    if (
      currentTextNode.parentElement &&
      !context.regularExpressions.protectedMarkupTag.test(currentTextNode.parentElement.tagName) &&
      urlForensicsPipelineHtmlDetectTokenMatches(context, currentTextNode.nodeValue || "", options).length
    ) {
      candidateTextNodes.push(currentTextNode);
    }

    currentTextNode = textWalker.nextNode();
  }

  return candidateTextNodes;
}

// Function: build replacement text for URL token.
function urlForensicsPipelineHtmlBuildReplacementText(originalUrlToken, replacementUrl, trailingPunctuation) {
  return trailingPunctuation && replacementUrl !== originalUrlToken && !replacementUrl.endsWith(trailingPunctuation)
    ? replacementUrl + trailingPunctuation
    : replacementUrl;
}

// Function: append replacement fragment prefix.
function urlForensicsPipelineHtmlAppendFragmentPrefix(documentNode, replacementFragment, rawTextValue, nextSearchIndex, matchStartIndex) {
  if (matchStartIndex > nextSearchIndex) {
    replacementFragment.appendChild(documentNode.createTextNode(rawTextValue.slice(nextSearchIndex, matchStartIndex)));
  }
}

// Function: rewrite one text URL node.
function urlForensicsPipelineHtmlRewriteTextUrlNode(context, textNode, replacementLookup, typeLookup, options) {
  const rawTextValue = textNode.nodeValue || "";
  const replacementFragment = textNode.ownerDocument.createDocumentFragment();
  const detectedMatches = urlForensicsPipelineHtmlDetectTokenMatches(context, rawTextValue, options);
  let nextSearchIndex = 0;
  let nodeWasChanged = false;

  detectedMatches.forEach(function rewriteDetectedMatch(matchRecord) {
    const originalUrlToken = matchRecord.value;
    const matchStartIndex = matchRecord.index;
    const matchEndIndex = matchStartIndex + originalUrlToken.length;
    const peeledUrlToken = context.urlResolver.peel(originalUrlToken, options);
    const trailingPunctuationMatch = context.convertValueToString(originalUrlToken).match(context.regularExpressions.trailingUrlPunctuation);
    const trailingPunctuation = trailingPunctuationMatch ? trailingPunctuationMatch[0] : "";
    const replacementUrl =
      urlForensicsPipelineHtmlLookupReplacementUrl(context, replacementLookup, originalUrlToken, options) ||
      urlForensicsPipelineHtmlLookupReplacementUrl(context, replacementLookup, peeledUrlToken.value, options);

    if (!replacementUrl) {
      return;
    }

    const replacementText = urlForensicsPipelineHtmlBuildReplacementText(originalUrlToken, replacementUrl, trailingPunctuation);
    const detectedType =
      urlForensicsPipelineHtmlLookupDetectedType(context, typeLookup, originalUrlToken, options) ||
      urlForensicsPipelineHtmlLookupDetectedType(context, typeLookup, peeledUrlToken.value, options);
    const finalUrlEntry = context.urlResolver.buildFinalUrlEntry(replacementUrl, { detectedType: detectedType });

    urlForensicsPipelineHtmlAppendFragmentPrefix(textNode.ownerDocument, replacementFragment, rawTextValue, nextSearchIndex, matchStartIndex);
    replacementFragment.appendChild(textNode.ownerDocument.createTextNode(context.urlResolver.buildFinalUrlLinkText(finalUrlEntry)));
    nextSearchIndex = matchEndIndex;
    nodeWasChanged = nodeWasChanged || replacementText !== originalUrlToken;
  });

  if (!nodeWasChanged) {
    return false;
  }

  if (nextSearchIndex < rawTextValue.length) {
    replacementFragment.appendChild(textNode.ownerDocument.createTextNode(rawTextValue.slice(nextSearchIndex)));
  }

  if (textNode.parentNode) {
    textNode.parentNode.replaceChild(replacementFragment, textNode);
  }

  return true;
}

// Function: replace text URLs.
function urlForensicsPipelineHtmlReplaceTextUrls(context, rootNode, replacementLookup, typeLookup, options) {
  let rewrittenTextNodeCount = 0;

  urlForensicsPipelineHtmlCollectUrlTextNodes(context, rootNode, options).forEach(function rewriteTextNode(textNode) {
    if (urlForensicsPipelineHtmlRewriteTextUrlNode(context, textNode, replacementLookup, typeLookup, options)) {
      rewrittenTextNodeCount += 1;
    }
  });

  return rewrittenTextNodeCount;
}

// Function: rewrite HTML.
function urlForensicsPipelineHtmlRewriteHtml(context, sourceMarkup, items, options) {
  const parsedDocument = context.createHtmlParserDocument(sourceMarkup);

  if (!parsedDocument) {
    return {
      html: context.convertValueToString(sourceMarkup),
      count: 0
    };
  }

  const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
  const replacementLookup = urlForensicsPipelineHtmlBuildReplacementLookup(context, items || []);
  const typeLookup = urlForensicsPipelineHtmlBuildTypeLookup(context, items || []);
  const rewrittenAnchorCount = urlForensicsPipelineHtmlRewriteAnchors(context, rootNode, replacementLookup, typeLookup, options);
  const rewrittenTextNodeCount = urlForensicsPipelineHtmlReplaceTextUrls(context, rootNode, replacementLookup, typeLookup, options);

  urlForensicsPipelineHtmlCleanupMarkup(context, rootNode);

  return {
    html: parsedDocument.body && parsedDocument.body.innerHTML ? parsedDocument.body.innerHTML : context.convertValueToString(sourceMarkup),
    count: rewrittenAnchorCount + rewrittenTextNodeCount
  };
}

// Function: check human-readable anchor.
function urlForensicsPipelineHtmlIsHumanReadableAnchor(context, anchorElement) {
  const anchorText = urlForensicsPipelineHtmlNormalizeAnchorText(context, anchorElement && anchorElement.textContent);

  if (!anchorText) return false;
  if (/^https?:\/\//i.test(anchorText)) return false;
  if (anchorText.length > 140) return false;
  if (/^\[image/i.test(anchorText)) return true;
  if (/facebook|instagram|youtube|linkedin|tiktok/i.test(anchorText)) return true;
  return anchorText.split(/\s+/).length <= 10;
}

// Function: collect standalone preview text nodes.
function urlForensicsPipelineHtmlCollectStandalonePreviewTextNodes(context, documentRoot, parsedDocument) {
  const textWalker = parsedDocument.createTreeWalker(documentRoot, context.getNodeFilterFlag("SHOW_TEXT", 4));
  const textNodes = [];
  let currentTextNode = textWalker.nextNode();

  while (currentTextNode) {
    textNodes.push(currentTextNode);
    currentTextNode = textWalker.nextNode();
  }

  return textNodes;
}

// Function: normalize standalone preview text nodes.
function urlForensicsPipelineHtmlNormalizeStandalonePreviewTextNodes(context, textNodes) {
  textNodes.forEach(function normalizePreviewTextNode(textNode) {
    const parentTagName = textNode.parentElement ? textNode.parentElement.tagName : "";
    const shouldPreserveWhitespace = /^(PRE|TEXTAREA)$/i.test(parentTagName);
    const normalizedValue = shouldPreserveWhitespace
      ? context.convertValueToString(textNode.nodeValue)
      : urlForensicsPipelineHtmlNormalizeTextValue(context, textNode.nodeValue || "");

    if (!shouldPreserveWhitespace && !normalizedValue.trim()) {
      textNode.remove();
      return;
    }

    if (normalizedValue !== (textNode.nodeValue || "")) {
      textNode.nodeValue = normalizedValue;
    }
  });
}

// Function: normalize standalone preview anchors.
function urlForensicsPipelineHtmlNormalizeStandalonePreviewAnchors(context, parsedDocument) {
  Array.from(parsedDocument.querySelectorAll("a[href]")).forEach(function normalizePreviewAnchor(anchorElement) {
    const trimmedHref = context.convertValueToString(anchorElement.getAttribute("href")).trim();
    anchorElement.setAttribute("href", trimmedHref);

    const normalizedAnchorLabel = urlForensicsPipelineHtmlNormalizeTextValue(context, anchorElement.textContent || "").trim();
    if (normalizedAnchorLabel) {
      anchorElement.textContent = normalizedAnchorLabel;
    }
  });
}

// Function: build standalone preview anchor signature.
function urlForensicsPipelineHtmlBuildStandalonePreviewAnchorSignature(context, anchorElement) {
  if (!anchorElement || anchorElement.tagName !== "A" || !anchorElement.hasAttribute("href")) {
    return "";
  }

  const hrefValue = context.convertValueToString(anchorElement.getAttribute("href")).trim();
  const textValue = urlForensicsPipelineHtmlNormalizeTextValue(context, anchorElement.textContent || "").trim();
  return hrefValue + "||" + textValue;
}

// Function: check whether a node can sit between duplicate preview links.
function urlForensicsPipelineHtmlIsIgnorableStandalonePreviewLinkSeparator(context, node) {
  if (!node) {
    return true;
  }

  if (node.nodeType === context.getNodeTypeValue("TEXT_NODE", 3)) {
    return !urlForensicsPipelineHtmlNormalizeTextValue(context, node.nodeValue || "").trim();
  }

  return node.nodeType === context.getNodeTypeValue("ELEMENT_NODE", 1) && node.tagName === "BR";
}

// Function: remove immediate duplicate standalone preview anchors.
function urlForensicsPipelineHtmlRemoveImmediateDuplicateStandalonePreviewAnchors(context, documentRoot) {
  Array.from(documentRoot.querySelectorAll("*")).forEach(function removeImmediateDuplicateAnchors(parentElement) {
    let previousAnchorSignature = "";

    Array.from(parentElement.childNodes).forEach(function inspectChildNode(childNode) {
      if (urlForensicsPipelineHtmlIsIgnorableStandalonePreviewLinkSeparator(context, childNode)) {
        return;
      }

      if (childNode.nodeType === context.getNodeTypeValue("ELEMENT_NODE", 1) && childNode.tagName === "A" && childNode.hasAttribute("href")) {
        const currentAnchorSignature = urlForensicsPipelineHtmlBuildStandalonePreviewAnchorSignature(context, childNode);

        if (currentAnchorSignature && currentAnchorSignature === previousAnchorSignature) {
          childNode.remove();
          return;
        }

        previousAnchorSignature = currentAnchorSignature;
        return;
      }

      previousAnchorSignature = "";
    });
  });
}

// Function: build simple standalone preview link block signature.
function urlForensicsPipelineHtmlBuildSimpleStandalonePreviewLinkBlockSignature(context, blockElement) {
  if (!blockElement || blockElement.nodeType !== context.getNodeTypeValue("ELEMENT_NODE", 1)) {
    return "";
  }

  const directElementChildren = Array.from(blockElement.children);
  const directAnchorChildren = directElementChildren.filter(function keepAnchorChildren(childElement) {
    return childElement.tagName === "A" && childElement.hasAttribute("href");
  });
  const otherNonBreakChildren = directElementChildren.filter(function keepOtherChildren(childElement) {
    return childElement.tagName !== "A" && childElement.tagName !== "BR";
  });

  if (directAnchorChildren.length !== 1 || otherNonBreakChildren.length > 0) {
    return "";
  }

  const clonedBlockElement = blockElement.cloneNode(true);
  Array.from(clonedBlockElement.querySelectorAll("a,br")).forEach(function removeLinkArtifacts(node) {
    node.remove();
  });

  const remainingText = urlForensicsPipelineHtmlNormalizeTextValue(context, clonedBlockElement.textContent || "").replace(/\s+/g, "").trim();

  if (remainingText) {
    return "";
  }

  return urlForensicsPipelineHtmlBuildStandalonePreviewAnchorSignature(context, directAnchorChildren[0]);
}

// Function: remove duplicate single-link standalone preview blocks.
function urlForensicsPipelineHtmlRemoveDuplicateSingleLinkStandalonePreviewBlocks(context, documentRoot) {
  const blockCandidates = Array.from(documentRoot.querySelectorAll("p,div,li,td,th,span"));
  let previousBlockSignature = "";

  blockCandidates.forEach(function removeDuplicateSingleLinkBlocks(blockElement) {
    const currentBlockSignature = urlForensicsPipelineHtmlBuildSimpleStandalonePreviewLinkBlockSignature(context, blockElement);

    if (!currentBlockSignature) {
      previousBlockSignature = "";
      return;
    }

    if (currentBlockSignature === previousBlockSignature) {
      blockElement.remove();
      return;
    }

    previousBlockSignature = currentBlockSignature;
  });
}

// Function: remove empty standalone preview structural nodes.
function urlForensicsPipelineHtmlRemoveEmptyStandalonePreviewStructuralNodes(context, documentRoot) {
  const reverseCleanupCandidates = Array.from(documentRoot.querySelectorAll("p,div,span,td,th,li")).reverse();

  reverseCleanupCandidates.forEach(function removeEmptyStructuralNodes(elementNode) {
    if (elementNode.querySelector("img,svg,table,ul,ol,a,button,input,textarea,select,iframe")) {
      return;
    }

    const meaningfulText = urlForensicsPipelineHtmlNormalizeTextValue(context, elementNode.textContent || "").replace(/\s+/g, "");
    const hasNonBreakChildElement = Array.from(elementNode.children).some(function findNonBreakChild(childElement) {
      return childElement.tagName !== "BR";
    });

    if (!meaningfulText && !hasNonBreakChildElement) {
      elementNode.remove();
    }
  });
}

// Function: cleanup standalone preview markup.
function urlForensicsPipelineHtmlCleanupStandalonePreviewMarkup(context, documentRoot, parsedDocument) {
  const textNodes = urlForensicsPipelineHtmlCollectStandalonePreviewTextNodes(context, documentRoot, parsedDocument);

  urlForensicsPipelineHtmlNormalizeStandalonePreviewTextNodes(context, textNodes);
  urlForensicsPipelineHtmlNormalizeStandalonePreviewAnchors(context, parsedDocument);
  urlForensicsPipelineHtmlRemoveImmediateDuplicateStandalonePreviewAnchors(context, documentRoot);
  urlForensicsPipelineHtmlRemoveDuplicateSingleLinkStandalonePreviewBlocks(context, documentRoot);
  urlForensicsPipelineHtmlTrimLineBreakRuns(context, documentRoot, { normalizeTextSeparators: false });
  urlForensicsPipelineHtmlRemoveEmptyStandalonePreviewStructuralNodes(context, documentRoot);
}

// Function: convert HTML to text.
function urlForensicsPipelineHtmlToText(context, sourceMarkup) {
  const parsedDocument = context.createHtmlParserDocument(sourceMarkup);

  if (!parsedDocument) {
    return context.cleanInputText(context.convertValueToString(sourceMarkup).replace(/<[^>]+>/g, "\n"));
  }

  const bodyNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
  return context.cleanInputText(bodyNode.innerText || bodyNode.textContent || "");
}

// Function: resolve standalone preview items.
function urlForensicsPipelineHtmlResolveStandalonePreviewItems(context, sourceMarkup, providedItems, pipelineSettings) {
  if (providedItems) {
    return providedItems;
  }

  return context.analyzeInput({
    rawText: urlForensicsPipelineHtmlToText(context, sourceMarkup),
    sourceHtml: sourceMarkup,
    options: pipelineSettings
  }).items;
}

// Function: rewrite standalone preview anchors.
function urlForensicsPipelineHtmlRewriteStandalonePreviewAnchors(context, parsedDocument, replacementLookup, typeLookup, pipelineSettings) {
  let rewrittenNodeCount = 0;

  Array.from(parsedDocument.querySelectorAll("a[href]")).forEach(function rewritePreviewAnchor(anchorElement) {
    const originalHref = context.convertValueToString(anchorElement.getAttribute("href")).trim();

    if (!urlForensicsPipelineHtmlIsDirectDetectedHref(context, originalHref, pipelineSettings)) {
      return;
    }

    const resolvedHref = urlForensicsPipelineHtmlLookupReplacementUrl(context, replacementLookup, originalHref, pipelineSettings) || originalHref;
    const detectedType = urlForensicsPipelineHtmlLookupDetectedType(context, typeLookup, originalHref, pipelineSettings);
    const finalUrlEntry = context.urlResolver.buildFinalUrlEntry(resolvedHref, { detectedType: detectedType });

    anchorElement.setAttribute("href", resolvedHref);
    anchorElement.setAttribute("data-link-type", finalUrlEntry.type);
    anchorElement.setAttribute("data-base-url", finalUrlEntry.label);

    if (pipelineSettings.enableUrlNormalizationRepair && !urlForensicsPipelineHtmlIsHumanReadableAnchor(context, anchorElement)) {
      anchorElement.textContent = context.urlResolver.buildFinalUrlLinkText(finalUrlEntry);
    }

    rewrittenNodeCount += 1;
  });

  return rewrittenNodeCount;
}

// Function: collect standalone preview text nodes to rewrite.
function urlForensicsPipelineHtmlCollectStandalonePreviewTextNodesToRewrite(context, parsedDocument, rootNode) {
  const textWalker = parsedDocument.createTreeWalker(rootNode, context.getNodeFilterFlag("SHOW_TEXT", 4));
  const textNodesToRewrite = [];
  let currentTextNode = textWalker.nextNode();

  while (currentTextNode) {
    const parentTagName = currentTextNode.parentElement ? currentTextNode.parentElement.tagName : "";

    if (currentTextNode.parentElement && !/^(A|SCRIPT|STYLE)$/i.test(parentTagName)) {
      textNodesToRewrite.push(currentTextNode);
    }

    currentTextNode = textWalker.nextNode();
  }

  return textNodesToRewrite;
}

// Function: build standalone preview text anchor.
function urlForensicsPipelineHtmlBuildStandalonePreviewTextAnchor(context, parsedDocument, originalUrlToken, resolvedUrl, detectedType, pipelineSettings) {
  const finalUrlEntry = context.urlResolver.buildFinalUrlEntry(resolvedUrl, { detectedType: detectedType });
  const anchorElement = parsedDocument.createElement("a");

  anchorElement.setAttribute("href", resolvedUrl);
  anchorElement.setAttribute("target", "_blank");
  anchorElement.setAttribute("rel", "noopener noreferrer");
  anchorElement.setAttribute("data-link-type", finalUrlEntry.type);
  anchorElement.setAttribute("data-base-url", finalUrlEntry.label);
  anchorElement.textContent = pipelineSettings.enableUrlNormalizationRepair
    ? context.urlResolver.buildFinalUrlLinkText(finalUrlEntry)
    : originalUrlToken;

  return anchorElement;
}

// Function: append standalone preview text URL replacement.
function urlForensicsPipelineHtmlAppendStandalonePreviewTextUrl(context, rewriteContext, originalUrlToken, matchStartIndex, matchEndIndex) {
  if (matchStartIndex > rewriteContext.nextSearchIndex) {
    rewriteContext.replacementFragment.appendChild(
      rewriteContext.parsedDocument.createTextNode(rewriteContext.rawTextValue.slice(rewriteContext.nextSearchIndex, matchStartIndex))
    );
  }

  const peeledUrlToken = context.urlResolver.peel(originalUrlToken, rewriteContext.pipelineSettings);
  const resolvedUrl =
    urlForensicsPipelineHtmlLookupReplacementUrl(context, rewriteContext.replacementLookup, originalUrlToken, rewriteContext.pipelineSettings) ||
    urlForensicsPipelineHtmlLookupReplacementUrl(context, rewriteContext.replacementLookup, peeledUrlToken.value, rewriteContext.pipelineSettings) ||
    originalUrlToken;
  const detectedType =
    urlForensicsPipelineHtmlLookupDetectedType(context, rewriteContext.typeLookup, originalUrlToken, rewriteContext.pipelineSettings) ||
    urlForensicsPipelineHtmlLookupDetectedType(context, rewriteContext.typeLookup, peeledUrlToken.value, rewriteContext.pipelineSettings);
  const anchorElement = urlForensicsPipelineHtmlBuildStandalonePreviewTextAnchor(
    context,
    rewriteContext.parsedDocument,
    originalUrlToken,
    resolvedUrl,
    detectedType,
    rewriteContext.pipelineSettings
  );

  rewriteContext.replacementFragment.appendChild(anchorElement);
  rewriteContext.rewrittenNodeCount += 1;
  rewriteContext.nodeWasChanged = true;
  rewriteContext.nextSearchIndex = matchEndIndex;
}

// Function: rewrite one standalone preview text node.
function urlForensicsPipelineHtmlRewriteStandalonePreviewTextNode(context, rewriteContext, textNode) {
  rewriteContext.rawTextValue = textNode.nodeValue || "";

  if (!rewriteContext.rawTextValue) {
    return;
  }

  rewriteContext.detectedMatches = urlForensicsPipelineHtmlDetectTokenMatches(
    context,
    rewriteContext.rawTextValue,
    rewriteContext.pipelineSettings
  );

  if (!rewriteContext.detectedMatches.length) {
    return;
  }

  rewriteContext.replacementFragment = rewriteContext.parsedDocument.createDocumentFragment();
  rewriteContext.nextSearchIndex = 0;
  rewriteContext.nodeWasChanged = false;

  rewriteContext.detectedMatches.forEach(function rewriteDetectedMatch(matchRecord) {
    const originalUrlToken = matchRecord.value;
    const matchStartIndex = matchRecord.index;
    const matchEndIndex = matchStartIndex + originalUrlToken.length;

    urlForensicsPipelineHtmlAppendStandalonePreviewTextUrl(context, rewriteContext, originalUrlToken, matchStartIndex, matchEndIndex);
  });

  if (!rewriteContext.nodeWasChanged) {
    return;
  }

  if (rewriteContext.nextSearchIndex < rewriteContext.rawTextValue.length) {
    rewriteContext.replacementFragment.appendChild(
      rewriteContext.parsedDocument.createTextNode(rewriteContext.rawTextValue.slice(rewriteContext.nextSearchIndex))
    );
  }

  if (textNode.parentNode) {
    textNode.parentNode.replaceChild(rewriteContext.replacementFragment, textNode);
  }
}

// Function: rewrite standalone preview text nodes.
function urlForensicsPipelineHtmlRewriteStandalonePreviewTextNodes(context, parsedDocument, rootNode, replacementLookup, typeLookup, pipelineSettings) {
  const rewriteContext = {
    parsedDocument: parsedDocument,
    replacementLookup: replacementLookup,
    typeLookup: typeLookup,
    pipelineSettings: pipelineSettings,
    rewrittenNodeCount: 0
  };

  urlForensicsPipelineHtmlCollectStandalonePreviewTextNodesToRewrite(context, parsedDocument, rootNode).forEach(function rewritePreviewTextNode(textNode) {
    urlForensicsPipelineHtmlRewriteStandalonePreviewTextNode(context, rewriteContext, textNode);
  });

  return rewriteContext.rewrittenNodeCount;
}

// Function: rewrite HTML for standalone preview.
function urlForensicsPipelineHtmlRewriteHtmlForStandalonePreview(context, sourceMarkup, itemsOrOptions, maybeOptions) {
  const providedItems = Array.isArray(itemsOrOptions) ? itemsOrOptions : null;
  const pipelineSettings = context.resolvePipelineSettings(providedItems ? maybeOptions : itemsOrOptions);
  const parsedDocument = context.createHtmlParserDocument(sourceMarkup);

  if (!parsedDocument) {
    return {
      html: context.convertValueToString(sourceMarkup),
      count: 0
    };
  }

  const previewItems = urlForensicsPipelineHtmlResolveStandalonePreviewItems(context, sourceMarkup, providedItems, pipelineSettings);
  const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
  const replacementLookup = urlForensicsPipelineHtmlBuildReplacementLookup(context, previewItems || []);
  const typeLookup = urlForensicsPipelineHtmlBuildTypeLookup(context, previewItems || []);
  const rewrittenAnchorCount = urlForensicsPipelineHtmlRewriteStandalonePreviewAnchors(context, parsedDocument, replacementLookup, typeLookup, pipelineSettings);
  const rewrittenTextNodeCount = urlForensicsPipelineHtmlRewriteStandalonePreviewTextNodes(context, parsedDocument, rootNode, replacementLookup, typeLookup, pipelineSettings);

  urlForensicsPipelineHtmlCleanupStandalonePreviewMarkup(context, rootNode, parsedDocument);

  return {
    html: parsedDocument.body && parsedDocument.body.innerHTML ? parsedDocument.body.innerHTML : context.convertValueToString(sourceMarkup),
    count: rewrittenAnchorCount + rewrittenTextNodeCount
  };
}

// Function: create pipeline HTML rewriter helpers.
function urlForensicsPipelineHtmlRewriterCreate(options) {
  const context = urlForensicsPipelineHtmlCreateRewriterContext(options);

  return Object.freeze({
    htmlToText: function htmlToText(sourceMarkup) {
      return urlForensicsPipelineHtmlToText(context, sourceMarkup);
    },
    normalizeTextValue: function normalizeTextValue(textValue) {
      return urlForensicsPipelineHtmlNormalizeTextValue(context, textValue);
    },
    rewriteHtml: function rewriteHtml(sourceMarkup, items, options) {
      return urlForensicsPipelineHtmlRewriteHtml(context, sourceMarkup, items, options);
    },
    rewriteHtmlForStandalonePreview: function rewriteHtmlForStandalonePreview(sourceMarkup, itemsOrOptions, maybeOptions) {
      return urlForensicsPipelineHtmlRewriteHtmlForStandalonePreview(context, sourceMarkup, itemsOrOptions, maybeOptions);
    }
  });
}

// Function: attach pipeline HTML rewriter factory.
(function attachUrlForensicsPipelineHtmlRewriter(globalScope) {
  const pipelineHtmlRewriter = Object.freeze({
    create: urlForensicsPipelineHtmlRewriterCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineHtmlRewriter;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineHtmlRewriter = pipelineHtmlRewriter;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
