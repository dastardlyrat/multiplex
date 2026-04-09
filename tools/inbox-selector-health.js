"use strict";

const fs = require("node:fs");

const inboxDetectorRegistry = require("../lab/firefox-extension/inbox-detector-registry.js");
const fixtureDefinitions = require("./inbox-fixture-definitions.js").fixtureDefinitions;

const voidElementNames = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function parseAttributes(attributeSource) {
  const attributes = Object.create(null);
  const attributePattern = /([A-Za-z_:][A-Za-z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let attributeMatch = null;

  while ((attributeMatch = attributePattern.exec(String(attributeSource || ""))) !== null) {
    const attributeName = String(attributeMatch[1] || "").trim();

    if (!attributeName) {
      continue;
    }

    attributes[attributeName] = attributeMatch[2] || attributeMatch[3] || attributeMatch[4] || "";
  }

  return attributes;
}

function createElementNode(tagName, attributes, parentNode) {
  return {
    tagName: String(tagName || "").toLowerCase(),
    attributes: attributes || Object.create(null),
    children: [],
    parent: parentNode || null
  };
}

function parseHtmlFixture(sourceMarkup) {
  const rootNode = createElementNode("#document", Object.create(null), null);
  const openNodeStack = [rootNode];
  const tagPattern = /<\/?([A-Za-z][A-Za-z0-9:-]*)\b([^>]*?)>/g;
  let tagMatch = null;

  while ((tagMatch = tagPattern.exec(String(sourceMarkup || ""))) !== null) {
    const tagName = String(tagMatch[1] || "").toLowerCase();
    const rawTagText = tagMatch[0] || "";
    const isClosingTag = rawTagText.startsWith("</");

    if (isClosingTag) {
      for (let stackIndex = openNodeStack.length - 1; stackIndex > 0; stackIndex -= 1) {
        if (openNodeStack[stackIndex].tagName === tagName) {
          openNodeStack.length = stackIndex;
          break;
        }
      }
      continue;
    }

    const nextNode = createElementNode(tagName, parseAttributes(tagMatch[2]), openNodeStack[openNodeStack.length - 1]);
    openNodeStack[openNodeStack.length - 1].children.push(nextNode);

    if (!/\/\s*>$/.test(rawTagText) && !voidElementNames.has(tagName)) {
      openNodeStack.push(nextNode);
    }
  }

  return rootNode;
}

function splitSelectorParts(selectorText) {
  const selectorParts = [];
  let currentPart = "";
  let bracketDepth = 0;
  let activeQuote = "";

  String(selectorText || "").split("").forEach(function consumeSelectorCharacter(character) {
    if (activeQuote) {
      currentPart += character;
      if (character === activeQuote) {
        activeQuote = "";
      }
      return;
    }

    if (character === "\"" || character === "'") {
      activeQuote = character;
      currentPart += character;
      return;
    }

    if (character === "[") {
      bracketDepth += 1;
      currentPart += character;
      return;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      currentPart += character;
      return;
    }

    if (/\s/.test(character) && bracketDepth === 0) {
      if (currentPart.trim()) {
        selectorParts.push(currentPart.trim());
        currentPart = "";
      }
      return;
    }

    currentPart += character;
  });

  if (currentPart.trim()) {
    selectorParts.push(currentPart.trim());
  }

  return selectorParts;
}

function parseSimpleSelector(selectorPart) {
  const parsedSelector = {
    tagName: "",
    id: "",
    classNames: [],
    attributes: []
  };
  let cursor = 0;
  const safeSelectorPart = String(selectorPart || "").trim();
  const tagMatch = /^[A-Za-z][A-Za-z0-9-]*/.exec(safeSelectorPart);

  if (tagMatch) {
    parsedSelector.tagName = String(tagMatch[0] || "").toLowerCase();
    cursor = parsedSelector.tagName.length;
  }

  while (cursor < safeSelectorPart.length) {
    const currentCharacter = safeSelectorPart[cursor];

    if (currentCharacter === ".") {
      const classMatch = /^\.([A-Za-z0-9_-]+)/.exec(safeSelectorPart.slice(cursor));
      if (!classMatch) {
        throw new Error("Unsupported selector segment: " + selectorPart);
      }

      parsedSelector.classNames.push(classMatch[1]);
      cursor += classMatch[0].length;
      continue;
    }

    if (currentCharacter === "#") {
      const idMatch = /^#([A-Za-z0-9_-]+)/.exec(safeSelectorPart.slice(cursor));
      if (!idMatch) {
        throw new Error("Unsupported selector segment: " + selectorPart);
      }

      parsedSelector.id = idMatch[1];
      cursor += idMatch[0].length;
      continue;
    }

    if (currentCharacter === "[") {
      const attributeEndIndex = safeSelectorPart.indexOf("]", cursor);
      if (attributeEndIndex < 0) {
        throw new Error("Unsupported selector segment: " + selectorPart);
      }

      const attributeExpression = safeSelectorPart.slice(cursor + 1, attributeEndIndex).trim();
      const operatorMatch = /^([A-Za-z_:][A-Za-z0-9:._-]*)(?:([\*\^]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?$/.exec(attributeExpression);

      if (!operatorMatch) {
        throw new Error("Unsupported selector segment: " + selectorPart);
      }

      parsedSelector.attributes.push({
        name: operatorMatch[1],
        operator: operatorMatch[2] || "exists",
        value: operatorMatch[3] || operatorMatch[4] || (operatorMatch[5] ? operatorMatch[5].trim() : "")
      });
      cursor = attributeEndIndex + 1;
      continue;
    }

    throw new Error("Unsupported selector segment: " + selectorPart);
  }

  return parsedSelector;
}

function getAttributeValue(node, attributeName) {
  return node && node.attributes && Object.prototype.hasOwnProperty.call(node.attributes, attributeName)
    ? String(node.attributes[attributeName] || "")
    : "";
}

function nodeHasClassName(node, className) {
  return getAttributeValue(node, "class").split(/\s+/).filter(Boolean).indexOf(className) !== -1;
}

function matchesSimpleSelector(node, parsedSelector) {
  if (!node || !parsedSelector) {
    return false;
  }

  if (parsedSelector.tagName && node.tagName !== parsedSelector.tagName) {
    return false;
  }

  if (parsedSelector.id && getAttributeValue(node, "id") !== parsedSelector.id) {
    return false;
  }

  if (parsedSelector.classNames.some(function hasMissingClassName(className) {
    return !nodeHasClassName(node, className);
  })) {
    return false;
  }

  return !parsedSelector.attributes.some(function hasMissingAttribute(attributeDefinition) {
    const actualAttributeValue = getAttributeValue(node, attributeDefinition.name);

    if (attributeDefinition.operator === "exists") {
      return !Object.prototype.hasOwnProperty.call(node.attributes, attributeDefinition.name);
    }

    if (attributeDefinition.operator === "=") {
      return actualAttributeValue !== attributeDefinition.value;
    }

    if (attributeDefinition.operator === "*=") {
      return actualAttributeValue.indexOf(attributeDefinition.value) === -1;
    }

    if (attributeDefinition.operator === "^=") {
      return actualAttributeValue.indexOf(attributeDefinition.value) !== 0;
    }

    return true;
  });
}

function collectElementNodes(rootNode) {
  const collectedNodes = [];

  function traverse(node) {
    (node && Array.isArray(node.children) ? node.children : []).forEach(function visitChildNode(childNode) {
      collectedNodes.push(childNode);
      traverse(childNode);
    });
  }

  traverse(rootNode);
  return collectedNodes;
}

function matchesSelector(node, parsedSelectorParts) {
  let currentNode = node;

  for (let selectorIndex = parsedSelectorParts.length - 1; selectorIndex >= 0; selectorIndex -= 1) {
    const parsedSelector = parsedSelectorParts[selectorIndex];

    while (currentNode && !matchesSimpleSelector(currentNode, parsedSelector)) {
      currentNode = selectorIndex === parsedSelectorParts.length - 1
        ? null
        : currentNode.parent;
    }

    if (!currentNode) {
      return false;
    }

    if (selectorIndex > 0) {
      currentNode = currentNode.parent;
    }
  }

  return true;
}

function querySelectorAll(rootNode, selectorText) {
  const parsedSelectorParts = splitSelectorParts(selectorText).map(parseSimpleSelector);
  return collectElementNodes(rootNode).filter(function keepMatchingNode(node) {
    return matchesSelector(node, parsedSelectorParts);
  });
}

function buildSelectorHealthReport() {
  const providerDefinitions = inboxDetectorRegistry.listProviderDefinitions();
  const providerDefinitionsById = new Map(providerDefinitions.map(function mapProviderDefinition(providerDefinition) {
    return [providerDefinition.id, providerDefinition];
  }));
  const actual = fixtureDefinitions.map(function inspectFixture(fixtureDefinition) {
    const providerDefinition = providerDefinitionsById.get(fixtureDefinition.providerId) || null;
    const sourceMarkup = fs.readFileSync(fixtureDefinition.fixturePath, "utf8");
    const parsedFixture = parseHtmlFixture(sourceMarkup);
    const fixtureUrl = new URL(fixtureDefinition.fixtureUrl);
    const selectorMatchCounts = providerDefinition
      ? providerDefinition.primaryInboxBodySelectors.map(function mapSelectorToMatchCount(selectorText) {
        return {
          selector: selectorText,
          count: querySelectorAll(parsedFixture, selectorText).length
        };
      })
      : [];

    return {
      providerId: fixtureDefinition.providerId,
      title: fixtureDefinition.title,
      fixturePath: fixtureDefinition.fixturePath,
      fixtureUrl: fixtureDefinition.fixtureUrl,
      hostMatches: !!(providerDefinition && providerDefinition.hostPattern && providerDefinition.hostPattern.test(fixtureUrl.hostname)),
      pathMatches: !providerDefinition || !providerDefinition.pathPattern || providerDefinition.pathPattern.test(fixtureUrl.pathname),
      selectorMatchCounts: selectorMatchCounts,
      expectedSelectors: fixtureDefinition.expectedSelectors.slice(),
      missingExpectedSelectors: fixtureDefinition.expectedSelectors.filter(function keepMissingExpectedSelector(selectorText) {
        const selectorMatchRecord = selectorMatchCounts.find(function findSelectorMatchRecord(matchRecord) {
          return matchRecord.selector === selectorText;
        });

        return !selectorMatchRecord || selectorMatchRecord.count < 1;
      })
    };
  });
  const failures = [];

  actual.forEach(function inspectProviderHealth(providerHealth) {
    if (!providerHealth.hostMatches) {
      failures.push("Expected provider " + JSON.stringify(providerHealth.providerId) + " host pattern to match fixture URL " + JSON.stringify(providerHealth.fixtureUrl) + ".");
    }

    if (!providerHealth.pathMatches) {
      failures.push("Expected provider " + JSON.stringify(providerHealth.providerId) + " path pattern to match fixture URL " + JSON.stringify(providerHealth.fixtureUrl) + ".");
    }

    if (providerHealth.missingExpectedSelectors.length) {
      failures.push(
        "Expected provider " +
        JSON.stringify(providerHealth.providerId) +
        " to match selectors " +
        JSON.stringify(providerHealth.expectedSelectors) +
        " against " +
        JSON.stringify(providerHealth.fixturePath) +
        ", but missing " +
        JSON.stringify(providerHealth.missingExpectedSelectors) +
        "."
      );
    }
  });

  return {
    expected: {
      providerIds: fixtureDefinitions.map(function mapFixtureDefinitionToProviderId(fixtureDefinition) {
        return fixtureDefinition.providerId;
      }),
      missingExpectedSelectors: []
    },
    actual: actual,
    failures: failures
  };
}

module.exports = Object.freeze({
  buildSelectorHealthReport: buildSelectorHealthReport
});
