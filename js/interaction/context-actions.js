import {
  addNode,
  deleteNode,
  getNode,
  renameMasteryHub,
  renameNode,
  resetRootProgress,
  state,
  swapNodes,
} from "../state.js";
import { contextOriginParentId } from "./context-origin-parent-id.js";

export function createContextActionRunner(renderApp) {
  const swapSelection = {
    sourceNodeId: "",
  };

  return {
    run: (action, contextInput) => runContextAction(action, contextInput, swapSelection, renderApp),
  };
}

function runContextAction(action, contextInput, swapSelection, renderApp) {
  try {
    const context = actionContext(contextInput, swapSelection, renderApp);
    const selectedAction = actionEntry(action);

    selectedAction.guard(context) && selectedAction.run(context);
  } catch (error) {
    window.alert(error.message);
  }
}

function askTitle(message, suggestedTitle) {
  return window.prompt(message, suggestedTitle);
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

function addChildNode(context) {
  persistTitleAction(
    "Título do subtópico:",
    defaultTitle("Subtópico"),
    (title) => addNode(context.nodeId, title),
    context.renderApp,
  );
}

function alwaysAllowed() {
  return true;
}

function createRootNode(context) {
  const originParentId = contextOriginParentId(state.nodesById, context.nodeId);

  persistTitleAction(
    "Título do novo nó de origem:",
    defaultTitle("Tópico"),
    (title) => addNode(originParentId, title),
    context.renderApp,
  );
}

function deleteTreeNode(context) {
  const currentNode = getNode(context.nodeId);

  confirmedDeletionFor(currentNode) && removeNode(context, currentNode);
}

function missingAction() {
  return {
    guard: alwaysAllowed,
    run: () => undefined,
  };
}

function persistTitleAction(message, suggestedTitle, persist, renderApp) {
  const title = askTitle(message, suggestedTitle);

  hasValue(title) && applyMutation(persist, title, renderApp);
}

function applyMutation(persist, value, renderApp) {
  persist(value);
  renderApp();
}

function confirmedDeletionFor(currentNode) {
  return window.confirm(
    `Deseja deletar "${currentNode.title}"? Os filhos serão reencaixados na hierarquia.`,
  );
}

function removeNode(context) {
  deleteNode(context.nodeId);
  resetSwapSelectionIfNeeded(context.swapSelection, context.nodeId);
  context.renderApp();
}

function resetRootNodeProgress(context) {
  const currentNode = getNode(context.nodeId);

  confirmedRootResetFor(currentNode) && applyRootReset(context);
}

function renameTreeNode(context) {
  const currentNode = getNode(context.nodeId);

  persistTitleAction(
    "Novo título do nó:",
    currentNode.title,
    (title) => renameNode(context.nodeId, title),
    context.renderApp,
  );
}

function renameMasteryHubNode(context) {
  const currentMasteryHub = masteryHubById(context.masteryHubId);

  persistTitleAction(
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

  if (!isRootNode(context.nodeId)) {
    window.alert("Essa ação só está disponível para nós de origem.");
    return false;
  }

  return true;
}

function requireMasteryHubSelection(context) {
  if (hasValue(context.masteryHubId)) {
    return true;
  }

  window.alert("Selecione um círculo de maestria antes de usar essa ação.");

  return false;
}

function requireNodeSelection(context) {
  if (hasValue(context.nodeId)) {
    return true;
  }

  window.alert("Selecione um nó antes de usar essa ação.");

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

function isRootNode(nodeId) {
  return getNode(nodeId).parentId === null;
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
  return window.confirm(
    `Deseja resetar o progresso de "${currentNode.title}" e de todos os subtópicos desta árvore?`,
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
      window.alert("Troca cancelada.");
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
      window.alert("Nó de origem marcado para troca. Agora escolha outro nó irmão e use 'Trocar Posição' novamente.");
    },
  };
}

function noSwapSource(swapSelection) {
  return !swapSelection.sourceNodeId;
}
