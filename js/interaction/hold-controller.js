import { getLinearDecayMultiplier, state, updateProgress } from "../state.js";
import { canAdvanceNode } from "./node-rules.js";

const HOLD_DELAY_MS = 220;
const HOLD_INTERVAL_MS = 140;

export function createHoldController(renderApp) {
  const holdState = {
    didAdvance: false,
    intervalId: null,
    suppressClickUntil: 0,
    timeoutId: null,
  };

  return {
    begin: (event, nodeId) => beginHold(event, nodeId, holdState, renderApp),
    end: () => endHold(holdState),
    suppressesClick: () => holdState.suppressClickUntil > Date.now(),
  };
}

function beginHold(event, nodeId, holdState, renderApp) {
  endHold(holdState);

  holdState.timeoutId = window.setTimeout(() => {
    holdState.intervalId = window.setInterval(() => {
      const currentNode = state.nodesById[nodeId];

      if (!canAdvanceNode(currentNode)) {
        endHold(holdState);
        return;
      }

      updateProgress(nodeId, progressStepFor(nodeId));
      holdState.didAdvance = true;
      renderApp();

      if (state.nodesById[nodeId]?.progress >= 100) {
        endHold(holdState);
      }
    }, HOLD_INTERVAL_MS);
  }, HOLD_DELAY_MS);
}

function endHold(holdState) {
  clearTimer(holdState.timeoutId, window.clearTimeout);
  clearTimer(holdState.intervalId, window.clearInterval);

  if (holdState.didAdvance) {
    holdState.suppressClickUntil = Date.now() + 250;
  }

  holdState.didAdvance = false;
  holdState.intervalId = null;
  holdState.timeoutId = null;
}

function clearTimer(timerId, clearCallback) {
  if (timerId === null) {
    return;
  }

  clearCallback(timerId);
}

function progressStepFor(nodeId) {
  return Math.max(0.1, getLinearDecayMultiplier(nodeId));
}
