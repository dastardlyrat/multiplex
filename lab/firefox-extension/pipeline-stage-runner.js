// Shared stage-runner skeleton for the URL Forensics pipeline.
"use strict";

function urlForensicsPipelineStageRunnerNormalizeHooks(value) {
  return (Array.isArray(value) ? value : []).filter(function keepFunctionHook(hookValue) {
    return typeof hookValue === "function";
  });
}

function urlForensicsPipelineStageRunnerCreate(options) {
  const optionBag = options && typeof options === "object" ? options : {};
  const debugApi = optionBag.debugApi || null;
  const beforeStageHooks = urlForensicsPipelineStageRunnerNormalizeHooks(optionBag.beforeStageHooks);
  const afterStageHooks = urlForensicsPipelineStageRunnerNormalizeHooks(optionBag.afterStageHooks);
  const errorStageHooks = urlForensicsPipelineStageRunnerNormalizeHooks(optionBag.errorStageHooks);

  function notifyHooks(hooks, details) {
    hooks.forEach(function notifyHook(hook) {
      hook(details);
    });
  }

  function runStages(initialState, stages) {
    const stageState = initialState && typeof initialState === "object" ? initialState : {};
    const stageList = Array.isArray(stages) ? stages : [];
    const pipelineErrors = Array.isArray(stageState.pipelineErrors) ? stageState.pipelineErrors : [];

    stageState.pipelineErrors = pipelineErrors;

    stageList.forEach(function runStage(stageDefinition) {
      const safeStageDefinition = stageDefinition && typeof stageDefinition === "object" ? stageDefinition : {};
      const stageId = String(safeStageDefinition.id || "stage").trim() || "stage";
      const errorLabel = String(safeStageDefinition.errorLabel || stageId).trim() || stageId;

      if (typeof safeStageDefinition.run !== "function") {
        return;
      }

      notifyHooks(beforeStageHooks, {
        stageId: stageId,
        stage: safeStageDefinition,
        state: stageState
      });

      if (debugApi) {
        debugApi.functionIn("pipeline.stageRunner." + stageId, {
          itemCount: Array.isArray(stageState.detectedItems) ? stageState.detectedItems.length : 0
        });
      }

      try {
        const nextStageState = safeStageDefinition.run(stageState);

        if (nextStageState && nextStageState !== stageState && typeof nextStageState === "object") {
          Object.keys(nextStageState).forEach(function copyStageStateValue(propertyName) {
            stageState[propertyName] = nextStageState[propertyName];
          });
        }

        notifyHooks(afterStageHooks, {
          stageId: stageId,
          stage: safeStageDefinition,
          state: stageState
        });

        if (debugApi) {
          debugApi.functionOut("pipeline.stageRunner." + stageId, {
            errorCount: pipelineErrors.length,
            itemCount: Array.isArray(stageState.detectedItems) ? stageState.detectedItems.length : 0
          });
        }
      } catch (stageError) {
        pipelineErrors.push(errorLabel + ": " + String(stageError && stageError.message ? stageError.message : stageError));

        notifyHooks(errorStageHooks, {
          error: stageError,
          errorLabel: errorLabel,
          stageId: stageId,
          stage: safeStageDefinition,
          state: stageState
        });

        if (debugApi) {
          debugApi.error("pipeline stage failed", {
            stageId: stageId,
            message: stageError && stageError.message ? stageError.message : String(stageError)
          });
        }
      }
    });

    return {
      state: stageState,
      errors: pipelineErrors.slice()
    };
  }

  return Object.freeze({
    runStages: runStages
  });
}

(function attachUrlForensicsPipelineStageRunner(globalScope) {
  const pipelineStageRunner = Object.freeze({
    create: urlForensicsPipelineStageRunnerCreate
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pipelineStageRunner;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineStageRunner = pipelineStageRunner;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
