import {
  bossModal,
  clickNode,
  confirmBossAdvice,
  frameDocument,
  nodeByTitle,
  nodeIdOf,
  nodePointerPoint,
  openNodeContextMenu,
  pointerLikeEvent,
  progressOf,
  requireElementFromFrame,
  requireNode,
  requireVisibleContextAction,
  sleep,
  statusOf,
  submitThemeConfirm,
  submitThemeText,
  waitForFrameCondition,
} from "./dom-harness.js";

const FRAME_READY_TIMEOUT_MS = 5_000;
const HOLD_POLL_INTERVAL_MS = 120;
const HOLD_SETTLE_DELAY_MS = 250;
const ROOT_SYNC_TIMEOUT_MS = 5_000;

export async function createSubtopicUnder(parentTitle, childTitle) {
  await openNodeContextMenu(parentTitle);
  requireVisibleContextAction("add-child").click();
  await submitThemeText(childTitle);
  await waitForFrameCondition(
    () => nodeByTitle(childTitle),
    FRAME_READY_TIMEOUT_MS,
    `Novo subtópico '${childTitle}' não renderizou em até 5000ms.`,
  );
}

export async function resetOriginProgressViaMenu(originTitle) {
  await openNodeContextMenu(originTitle);
  requireVisibleContextAction("reset-root-progress").click();
  await submitThemeConfirm();
  await waitForFrameCondition(
    () => progressOf(originTitle) === 0,
    ROOT_SYNC_TIMEOUT_MS,
    `Origem '${originTitle}' não resetou em até 5000ms.`,
  );
}

export async function completeBossFight(nodeTitle, correctOptionLabel) {
  clickNode(nodeTitle);
  await waitForFrameCondition(
    () => bossModal().dataset.nodeId === nodeIdOf(nodeTitle),
    2_500,
    `Boss modal não abriu para nó '${nodeTitle}' em até 2500ms.`,
  );
  confirmBossAdvice(correctOptionLabel);
  requireElementFromFrame("#boss-modal-confirm").click();
  await waitForFrameCondition(
    () => statusOf(nodeTitle) === "dominado",
    ROOT_SYNC_TIMEOUT_MS,
    `Nó '${nodeTitle}' não dominou após boss em até 5000ms.`,
  );
}

export async function holdNodeFor(nodeTitle, durationMs) {
  const nodeElement = requireNode(nodeTitle);
  const pointerPoint = nodePointerPoint(nodeElement);

  nodeElement.dispatchEvent(pointerLikeEvent("pointerdown", pointerPoint));
  await sleep(durationMs);
  frameDocument().dispatchEvent(pointerLikeEvent("pointerup", pointerPoint));
  await sleep(HOLD_SETTLE_DELAY_MS);
}

export async function holdNodeUntilFilled(nodeTitle, timeoutMs) {
  const nodeElement = requireNode(nodeTitle);
  const pointerPoint = nodePointerPoint(nodeElement);
  const holdStartedAt = Date.now();
  let greatestObservedProgress = progressOf(nodeTitle);

  nodeElement.dispatchEvent(pointerLikeEvent("pointerdown", pointerPoint));

  while (Date.now() - holdStartedAt < timeoutMs) {
    greatestObservedProgress = Math.max(greatestObservedProgress, progressOf(nodeTitle));

    if (greatestObservedProgress >= 100) {
      break;
    }

    await sleep(HOLD_POLL_INTERVAL_MS);
  }

  frameDocument().dispatchEvent(pointerLikeEvent("pointerup", pointerPoint));
  await sleep(HOLD_SETTLE_DELAY_MS);

  if (progressOf(nodeTitle) >= 100) {
    return;
  }

  throw new Error(
    `Nó '${nodeTitle}' não chegou a 100 a tempo. ` +
    `Maior progresso observado: ${greatestObservedProgress}. ` +
    `Tempo limite esperado: ${timeoutMs}ms.`,
  );
}
