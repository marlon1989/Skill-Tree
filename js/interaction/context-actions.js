import {
  addNode,
  deleteNode,
  getNode,
  moveNodeLayout,
  renameMasteryHub,
  renameNode,
  resetRootProgress,
  state,
  swapNodes,
} from "../state.js";
import { contextOriginParentId } from "./context-origin-parent-id.js";
import { confirmThemeAction, requestThemeText, showThemeAlert } from "../ui/theme-alert.js";

export function createContextActionRunner(renderApp) {
  const swapSelection = {
    sourceNodeId: "",
  };

  return {
    run: (action, contextInput) => runContextAction(action, contextInput, swapSelection, renderApp),
  };
}

async function runContextAction(action, contextInput, swapSelection, renderApp) {
  try {
    const context = actionContext(contextInput, swapSelection, renderApp);
    const selectedAction = actionEntry(action);

    if (!selectedAction.guard(context)) {
      return;
    }

    await selectedAction.run(context);
  } catch (error) {
    showThemeAlert(error.message);
  }
}

function askTitle(message, suggestedTitle) {
  return requestThemeText(message, suggestedTitle);
}

function defaultTitle(prefix) {
  return `${prefix} ${state.nextId}`;
}

function actionContext(contextInput, swapSelection, renderApp) {
  return {
    canvasX: Number(contextInput?.canvasX ?? 0),
    canvasY: Number(contextInput?.canvasY ?? 0),
    masteryHubId: String(contextInput?.masteryHubId ?? ""),
    nodeId: String(contextInput?.nodeId ?? ""),
    renderApp,
    swapSelection,
  };
}

function actionEntry(action) {
  return actionMap()[action] ?? missingAction();
}

function actionMap() {
  return {
    "add-child": {
      guard: requireNodeSelection,
      run: addChildNode,
    },
    "create-root": {
      guard: alwaysAllowed,
      run: createRootNode,
    },
    "rename-mastery-hub": {
      guard: requireMasteryHubSelection,
      run: renameMasteryHubNode,
    },
    delete: {
      guard: requireNodeSelection,
      run: deleteTreeNode,
    },
    "reset-root-progress": {
      guard: requireRootSelection,
      run: resetRootNodeProgress,
    },
    rename: {
      guard: requireNodeSelection,
      run: renameTreeNode,
    },
    swap: {
      guard: requireNodeSelection,
      run: swapTreeNodes,
    },
  };
}

async function addChildNode(context) {
  await persistTitleAction(
    "Título do subtópico:",
    defaultTitle("Subtópico"),
    (title) => addPositionedNode(context.nodeId, title, "subtopic", context, ""),
    context.renderApp,
  );
}

function alwaysAllowed() {
  return true;
}

async function createRootNode(context) {
  const originParentId = contextOriginParentId(state.nodesById, context.nodeId);
  const sourceMasteryHubId = originParentId === null ? context.masteryHubId : "";

  await persistTitleAction(
    "Título do novo nó de origem:",
    defaultTitle("Tópico"),
    (title) => addPositionedNode(originParentId, title, "origin", context, sourceMasteryHubId),
    context.renderApp,
  );
}

async function deleteTreeNode(context) {
  const currentNode = getNode(context.nodeId);

  if (await confirmedDeletionFor(currentNode)) {
    removeNode(context, currentNode);
  }
}

function missingAction() {
  return {
    guard: alwaysAllowed,
    run: () => undefined,
  };
}

async function persistTitleAction(message, suggestedTitle, persist, renderApp) {
  const title = await askTitle(message, suggestedTitle);

  hasValue(title) && applyMutation(persist, title, renderApp);
}

function applyMutation(persist, value, renderApp) {
  persist(value);
  renderApp();
}

function addPositionedNode(parentId, title, nodeKind, context, sourceMasteryHubId) {
  const createdNode = addNode(parentId, title, nodeKind, sourceMasteryHubId);

  context.renderApp();
  alignNodeToContextPoint(createdNode.id, context);

  return createdNode;
}

function alignNodeToContextPoint(nodeId, context) {
  const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);

  if (!nodeElement || !hasContextPoint(context)) {
    return;
  }

  moveNodeLayout(
    nodeId,
    context.canvasX - nodeElement.offsetLeft - nodeElement.offsetWidth / 2,
    context.canvasY - nodeElement.offsetTop - nodeElement.offsetHeight / 2,
  );
}

function confirmedDeletionFor(currentNode) {
  return confirmThemeAction(
    `Deseja deletar "${currentNode.title}"? Os filhos serão reencaixados na hierarquia.`,
    "Deletar",
  );
}

function removeNode(context) {
  deleteNode(context.nodeId);
  resetSwapSelectionIfNeeded(context.swapSelection, context.nodeId);
  context.renderApp();
}

async function resetRootNodeProgress(context) {
  const currentNode = getNode(context.nodeId);

  if (await confirmedRootResetFor(currentNode)) {
    applyRootReset(context);
  }
}

async function renameTreeNode(context) {
  const currentNode = getNode(context.nodeId);

  await persistTitleAction(
    "Novo título do nó:",
    currentNode.title,
    (title) => renameNode(context.nodeId, title),
    context.renderApp,
  );
}

async function renameMasteryHubNode(context) {
  const currentMasteryHub = masteryHubById(context.masteryHubId);

  await persistTitleAction(
    "Novo nome do círculo de maestria:",
    currentMasteryHub.title,
    (title) => renameMasteryHub(context.masteryHubId, title),
    context.renderApp,
  );
}

function requireRootSelection(context) {
  if (!requireNodeSelection(context)) {
    return false;
  }

  if (!isOriginNode(context.nodeId)) {
    showThemeAlert("Essa ação só está disponível para nós de origem.");
    return false;
  }

  return true;
}

function requireMasteryHubSelection(context) {
  if (hasValue(context.masteryHubId)) {
    return true;
  }

  showThemeAlert("Selecione um círculo de maestria antes de usar essa ação.");

  return false;
}

function requireNodeSelection(context) {
  if (hasValue(context.nodeId)) {
    return true;
  }

  showThemeAlert("Selecione um nó antes de usar essa ação.");

  return false;
}

function resetSwapSelectionIfNeeded(swapSelection, nodeId) {
  sameSwapNode(swapSelection, nodeId) && clearSwapSelection(swapSelection);
}

function sameSwapNode(swapSelection, nodeId) {
  return swapSelection.sourceNodeId === nodeId;
}

function clearSwapSelection(swapSelection) {
  swapSelection.sourceNodeId = "";
}

function hasValue(value) {
  return Boolean(value);
}

function hasContextPoint(context) {
  return Number.isFinite(context.canvasX) && Number.isFinite(context.canvasY);
}

function isOriginNode(nodeId) {
  return getNode(nodeId).nodeKind === "origin";
}

function masteryHubById(masteryHubId) {
  const targetMasteryHub = state.masteryHubs.find((masteryHub) => masteryHub.id === masteryHubId);

  if (!targetMasteryHub) {
    throw new Error(
      `Círculo de maestria inválido: "${masteryHubId}". ` +
      "Esperado círculo de maestria existente.",
    );
  }

  return targetMasteryHub;
}

function applyRootReset(context) {
  resetRootProgress(context.nodeId);
  context.renderApp();
}

function confirmedRootResetFor(currentNode) {
  return confirmThemeAction(
    `Deseja resetar o progresso de "${currentNode.title}" e dos subtópicos desta ramificação? Nós de origem filhos não serão alterados.`,
    "Resetar progresso",
  );
}

function swapTreeNodes(context) {
  swapStrategyFor(context).run();
}

function swapStrategyFor(context) {
  const strategies = [
    [() => noSwapSource(context.swapSelection), () => markSwapSource(context)],
    [() => sameSwapNode(context.swapSelection, context.nodeId), () => cancelSwap(context)],
  ];

  return strategies.find(([predicate]) => predicate())?.[1]() ?? completeSwap(context);
}

function cancelSwap(context) {
  return {
    run: () => {
      clearSwapSelection(context.swapSelection);
      showThemeAlert("Troca cancelada.");
    },
  };
}

function completeSwap(context) {
  return {
    run: () => {
      swapNodes(context.swapSelection.sourceNodeId, context.nodeId);
      clearSwapSelection(context.swapSelection);
      context.renderApp();
    },
  };
}

function markSwapSource(context) {
  return {
    run: () => {
      context.swapSelection.sourceNodeId = context.nodeId;
      showThemeAlert("Nó de origem marcado para troca. Agora escolha outro nó irmão e use 'Trocar Posição' novamente.");
    },
  };
}

function noSwapSource(swapSelection) {
  return !swapSelection.sourceNodeId;
}
