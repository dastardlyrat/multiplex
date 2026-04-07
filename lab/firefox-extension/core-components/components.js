// Function: attach component kit.
(function attachComponentKit(globalScope) {
  "use strict";

  function getComponentDebug() {
    return globalScope && globalScope.mergedLinkLabDebug ? globalScope.mergedLinkLabDebug : null;
  }

  // Function: resolve element target.
  function resolveElementTarget(target) {
    // Branch: follow this path only when the current condition passes.
    if (typeof target === "string") {
      return document.getElementById(target);
    }

    return target || null;
  }

  const componentKit = {
    byId(id) {
      return document.getElementById(id);
    },

    resolveElementTarget: resolveElementTarget,

    renderCount(target, label, count) {
      const targetElement = resolveElementTarget(target);
      // Branch: follow this path only when the current condition passes.
      const debugApi = getComponentDebug();
      if (!targetElement) {
        if (debugApi) {
          debugApi.conditional("component kit renderCount skipped: target missing", { label: label });
        }
        return;
      }
      targetElement.textContent = String(label) + ": " + String(count);
      if (debugApi) {
        debugApi.variable("component kit count rendered", { label: label, count: count });
      }
    },

    setVisible(target, shouldBeVisible) {
      const targetElement = resolveElementTarget(target);
      // Branch: follow this path only when the current condition passes.
      const debugApi = getComponentDebug();
      if (!targetElement) {
        if (debugApi) {
          debugApi.conditional("component kit setVisible skipped: target missing");
        }
        return;
      }
      targetElement.classList.toggle("is-hidden", !shouldBeVisible);
      if (debugApi) {
        debugApi.ui("component kit visibility changed", { shouldBeVisible: !!shouldBeVisible });
      }
    },

    toggle(target) {
      const targetElement = resolveElementTarget(target);
      // Branch: follow this path only when the current condition passes.
      const debugApi = getComponentDebug();
      if (!targetElement) {
        if (debugApi) {
          debugApi.conditional("component kit toggle skipped: target missing");
        }
        return;
      }
      targetElement.classList.toggle("is-hidden");
      if (debugApi) {
        debugApi.ui("component kit visibility toggled", { isHidden: targetElement.classList.contains("is-hidden") });
      }
    },

    bindLiveInput(target, handler) {
      const targetElement = resolveElementTarget(target);
      // Branch: follow this path only when the current condition passes.
      const debugApi = getComponentDebug();
      if (!targetElement || typeof handler !== "function") {
        if (debugApi) {
          debugApi.conditional("component kit bindLiveInput skipped", {
            hasTarget: !!targetElement,
            hasHandler: typeof handler === "function"
          });
        }
        return;
      }
      targetElement.addEventListener("input", handler);
      if (debugApi) {
        debugApi.ui("component kit live input bound");
      }
    },

    async copyFromElement(source) {
      const debugApi = getComponentDebug();
      if (debugApi) {
        debugApi.functionIn("componentKit.copyFromElement");
      }
      const sourceElement = resolveElementTarget(source);
      // Branch: follow this path only when the current condition passes.
      if (!sourceElement || !navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        if (debugApi) {
          debugApi.conditional("component kit plain copy skipped", {
            hasSource: !!sourceElement,
            hasClipboard: !!navigator.clipboard
          });
          debugApi.functionOut("componentKit.copyFromElement", { copied: false });
        }
        return false;
      }

      await navigator.clipboard.writeText(sourceElement.innerText || "");
      if (debugApi) {
        debugApi.variable("component kit plain copy text length assigned", {
          textLength: sourceElement.innerText ? sourceElement.innerText.length : 0
        });
        debugApi.functionOut("componentKit.copyFromElement", { copied: true });
      }
      return true;
    },

    async copyRichFromElement(source) {
      const debugApi = getComponentDebug();
      if (debugApi) {
        debugApi.functionIn("componentKit.copyRichFromElement");
      }
      const sourceElement = resolveElementTarget(source);

      // Branch: follow this path only when the current condition passes.
      if (
        !sourceElement ||
        !navigator.clipboard ||
        typeof navigator.clipboard.write !== "function" ||
        typeof ClipboardItem === "undefined"
      ) {
        if (debugApi) {
          debugApi.conditional("component kit rich copy skipped", {
            hasSource: !!sourceElement,
            hasClipboard: !!navigator.clipboard,
            hasClipboardItem: typeof ClipboardItem !== "undefined"
          });
          debugApi.functionOut("componentKit.copyRichFromElement", { copied: false });
        }
        return false;
      }

      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([sourceElement.innerHTML || ""], { type: "text/html" }),
        "text/plain": new Blob([sourceElement.innerText || ""], { type: "text/plain" })
      });

      await navigator.clipboard.write([clipboardItem]);
      if (debugApi) {
        debugApi.variable("component kit rich copy source lengths assigned", {
          htmlLength: sourceElement.innerHTML ? sourceElement.innerHTML.length : 0,
          textLength: sourceElement.innerText ? sourceElement.innerText.length : 0
        });
        debugApi.functionOut("componentKit.copyRichFromElement", { copied: true });
      }
      return true;
    },

    runPipeline(stages, inputValue, context) {
      const debugApi = getComponentDebug();
      if (debugApi) {
        debugApi.functionIn("componentKit.runPipeline", {
          stageCount: stages ? stages.length : 0,
          inputLength: typeof inputValue === "string" ? inputValue.length : null
        });
      }
      const pipelineContext = context || {};
      let currentValue = inputValue;

      // Loop: iterate through each item in the current collection.
      (stages || []).forEach(function runStage(stage, index) {
        // Branch: try the primary operation before handling failures.
        try {
          if (debugApi) {
            debugApi.loop("component kit running pipeline stage", {
              index: index,
              stageName: stage && stage.name ? stage.name : "anonymousStage"
            });
          }
          currentValue = stage(currentValue, pipelineContext);
        // Branch: handle errors from the guarded operation.
        } catch (error) {
          const stageName = stage.name || "anonymousStage";
          // Branch: follow this path only when the current condition passes.
          if (!pipelineContext.errors) pipelineContext.errors = [];
          pipelineContext.errors.push(stageName + ": " + error.message);
          if (debugApi) {
            debugApi.error("component kit pipeline stage failed", {
              stageName: stageName,
              message: error && error.message ? error.message : "unknown error"
            });
          }
        }
      });

      if (debugApi) {
        debugApi.functionOut("componentKit.runPipeline", {
          errorCount: pipelineContext.errors ? pipelineContext.errors.length : 0,
          outputLength: typeof currentValue === "string" ? currentValue.length : null
        });
      }
      return {
        value: currentValue,
        context: pipelineContext
      };
    }
  };

  globalScope.ComponentKit = componentKit;
})(window);
