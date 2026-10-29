"use strict";

function urlForensicsPipelineDetectionCreateContext(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const pipelineBase = optionBag.pipelineBase || null;
  const detectorRegistry = optionBag.detectorRegistry || null;

  if (!pipelineBase || !pipelineBase.regularExpressions) {
    throw new Error("URL Forensics pipeline base helpers are unavailable.");
  }

  if (!detectorRegistry || typeof detectorRegistry.detectText !== "function") {
    throw new Error("URL Forensics pipeline detector registry is unavailable.");
  }

  return Object.freeze({
    globalScope: optionBag.globalScope || null,
    debugApi: optionBag.debugApi || null,
    regularExpressions: pipelineBase.regularExpressions,
    convertValueToString: pipelineBase.convertValueToString,
    createDetectedUrlRecord: pipelineBase.createDetectedUrlRecord,
    cleanInputText: pipelineBase.cleanInputText,
    detectText: function detectText(textToScan, detectionOptions) {
      return detectorRegistry.detectText(textToScan, detectionOptions);
    },
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

function urlForensicsPipelineDetectionBuildDetectedRecords(detectionContext, textToScan, options) {
  const optionBag = options || {};
  const startingRecordId = optionBag.startId || 1;
  const detectedUrlMatches = detectionContext.detectText(textToScan, optionBag);

  if (detectionContext.debugApi) {
    detectionContext.debugApi.variable("pipeline detected url token count assigned", {
      detectedUrlTokenCount: detectedUrlMatches.length
    });
    detectionContext.debugApi.functionOut("pipeline.detectURLs", {
      detectedUrlTokenCount: detectedUrlMatches.length
    });
  }

  return detectedUrlMatches.map(function mapDetectedUrlToken(matchRecord, index) {
    if (detectionContext.debugApi && index < 3) {
      detectionContext.debugApi.loop("pipeline detectURLs mapping token", {
        index: index,
        recordId: startingRecordId + index
      });
    }

    return detectionContext.createDetectedUrlRecord(matchRecord.value, startingRecordId + index, {
      detectorIds: matchRecord.detectorIds
    });
  });
}

function urlForensicsPipelineDetectionDetectURLs(detectionContext, textToScan, options) {
  if (detectionContext.debugApi) {
    detectionContext.debugApi.functionIn("pipeline.detectURLs", {
      textLength: detectionContext.convertValueToString(textToScan).length,
      startId: options && options.startId ? options.startId : 1
    });
  }

  return urlForensicsPipelineDetectionBuildDetectedRecords(detectionContext, textToScan, options);
}

function urlForensicsPipelineDetectionDetectUrlsFromHtmlFallback(detectionContext, sourceMarkup, options) {
  const safeSourceMarkup = detectionContext.convertValueToString(sourceMarkup);
  const optionBag = options || {};
  const detectedItems = [];
  const anchorHrefPattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let nextRecordId = 1;
  let hrefMatch = null;

  if (detectionContext.debugApi) {
    detectionContext.debugApi.conditional("pipeline html parser unavailable; falling back to markup heuristics");
  }

  while ((hrefMatch = anchorHrefPattern.exec(safeSourceMarkup)) !== null) {
    const hrefValue = detectionContext.convertValueToString(hrefMatch[1] || hrefMatch[2] || hrefMatch[3]).trim();
    const detectableHrefMatches = detectionContext.detectText(hrefValue, {
      enableUrlNormalizationRepair: optionBag.enableUrlNormalizationRepair
    });

    if (detectableHrefMatches.length && detectableHrefMatches[0].index === 0) {
      detectedItems.push(detectionContext.createDetectedUrlRecord(detectableHrefMatches[0].value, nextRecordId, {
        detectorIds: detectableHrefMatches[0].detectorIds
      }));
      nextRecordId += 1;
    }
  }

  const sourceMarkupWithoutAnchors = safeSourceMarkup.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " ");
  const plainTextFallback = detectionContext.cleanInputText(sourceMarkupWithoutAnchors.replace(/<[^>]+>/g, " "));
  const matchedTextUrls = urlForensicsPipelineDetectionDetectURLs(detectionContext, plainTextFallback, {
    startId: nextRecordId,
    enableUrlNormalizationRepair: optionBag.enableUrlNormalizationRepair
  });

  if (matchedTextUrls.length) {
    detectedItems.push.apply(detectedItems, matchedTextUrls);
  }

  return detectedItems;
}

function urlForensicsPipelineDetectionDetectUrlsFromHtmlWithDom(detectionContext, parsedDocument, options) {
  const optionBag = options || {};
  const rootNode = parsedDocument.body || parsedDocument.documentElement || parsedDocument;
  const showElementNodes = detectionContext.getNodeFilterFlag("SHOW_ELEMENT", 1);
  const showTextNodes = detectionContext.getNodeFilterFlag("SHOW_TEXT", 4);
  const htmlWalker = rootNode.ownerDocument.createTreeWalker(rootNode, showElementNodes | showTextNodes);
  const detectedItems = [];
  let nextRecordId = 1;
  let currentNode = rootNode;

  while (currentNode) {
    const tagName = detectionContext.convertValueToString(currentNode.tagName).toUpperCase();

    if (currentNode.nodeType === detectionContext.getNodeTypeValue("ELEMENT_NODE", 1) && tagName === "A") {
      const hrefValue = detectionContext.convertValueToString(currentNode.getAttribute("href")).trim();
      const detectableHrefMatches = detectionContext.detectText(hrefValue, {
        enableUrlNormalizationRepair: optionBag.enableUrlNormalizationRepair
      });

      if (detectableHrefMatches.length && detectableHrefMatches[0].index === 0) {
        detectedItems.push(detectionContext.createDetectedUrlRecord(detectableHrefMatches[0].value, nextRecordId, {
          detectorIds: detectableHrefMatches[0].detectorIds
        }));
        nextRecordId += 1;
      }
    }

    if (currentNode.nodeType === detectionContext.getNodeTypeValue("TEXT_NODE", 3)) {
      const parentTagName = currentNode.parentElement ? currentNode.parentElement.tagName : "";

      if (!detectionContext.regularExpressions.protectedMarkupTag.test(parentTagName)) {
        const matchedTextUrls = urlForensicsPipelineDetectionDetectURLs(detectionContext, currentNode.nodeValue || "", {
          startId: nextRecordId,
          enableUrlNormalizationRepair: optionBag.enableUrlNormalizationRepair
        });

        if (matchedTextUrls.length) {
          detectedItems.push.apply(detectedItems, matchedTextUrls);
          nextRecordId += matchedTextUrls.length;
        }
      }
    }

    currentNode = htmlWalker.nextNode();
  }

  if (detectionContext.debugApi) {
    detectionContext.debugApi.functionOut("pipeline.detectUrlsFromHtml", {
      detectedItemCount: detectedItems.length
    });
  }

  return detectedItems;
}

function urlForensicsPipelineDetectionDetectUrlsFromHtml(detectionContext, sourceMarkup, options) {
  if (detectionContext.debugApi) {
    detectionContext.debugApi.functionIn("pipeline.detectUrlsFromHtml", {
      sourceMarkupLength: detectionContext.convertValueToString(sourceMarkup).length
    });
  }

  const parsedDocument = detectionContext.createHtmlParserDocument(sourceMarkup);

  if (!parsedDocument) {
    return urlForensicsPipelineDetectionDetectUrlsFromHtmlFallback(detectionContext, sourceMarkup, options);
  }

  return urlForensicsPipelineDetectionDetectUrlsFromHtmlWithDom(detectionContext, parsedDocument, options);
}

function urlForensicsPipelineDetectionCreate(options) {
  const detectionContext = urlForensicsPipelineDetectionCreateContext(options);

  return Object.freeze({
    detectURLs: function detectURLs(textToScan, detectionOptions) {
      return urlForensicsPipelineDetectionDetectURLs(detectionContext, textToScan, detectionOptions);
    },
    detectUrlsFromHtml: function detectUrlsFromHtml(sourceMarkup, detectionOptions) {
      return urlForensicsPipelineDetectionDetectUrlsFromHtml(detectionContext, sourceMarkup, detectionOptions);
    }
  });
}

(function attachUrlForensicsPipelineDetection(globalScope) {
  const pipelineDetection = Object.freeze({
    create: urlForensicsPipelineDetectionCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineDetection;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineDetection = pipelineDetection;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
