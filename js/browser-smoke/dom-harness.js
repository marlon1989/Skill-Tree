let appFrameElement = null;
let resultsElement = null;
let appStateStorageKey = "";

export function configureBrowserSmokeHarness(configuration) {
  appFrameElement = configuration.appFrameElement;
  resultsElement = configuration.resultsElement;
  appStateStorageKey = configuration.appStateStorageKey;
}

export function confirmBossAdvice(optionLabel = "") {
  if (bossOptionButtons().length === 0) {
    return;
  }

  clickBossOption(optionLabel);
}

export async function submitThemeText(textValue) {
  await waitForFrameCondition(
    () => !themeAlertElement().classList.contains("hidden") &&
      !themeAlertInputElement().classList.contains("hidden"),
    1_500,
    "Painel de texto temático não abriu em até 1500ms.",
  );

  themeAlertInputElement().value = textValue;
  themeAlertPrimaryButton().click();
}

export async function submitThemeConfirm() {
  await waitForFrameCondition(
    () => !themeAlertElement().classList.contains("hidden"),
    1_500,
    "Painel de confirmação temático não abriu em até 1500ms.",
  );

  themeAlertPrimaryButton().click();
}

export function clickNode(nodeTitle) {
  requireNode(nodeTitle).dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: requireFrameWindow(),
  }));
}

export function contextMenuElement() {
  return requireElementFromFrame("#context-menu");
}

export function masteryHubElement() {
  return frameDocument().querySelector("[data-mastery-hub='true']");
}

export function masteryHubElements() {
  return [...frameDocument().querySelectorAll("[data-mastery-hub='true']")];
}

export function masterySourceLinkElements() {
  return [...frameDocument().querySelectorAll("[data-mastery-source-link]")];
}

export function masterySourceLinkForNode(nodeTitle) {
  return frameDocument().querySelector(`[data-mastery-source-link="${nodeIdOf(nodeTitle)}"]`);
}

export function masteryHubElementForRoot(rootTitle) {
  const linkedRootNodeId = nodeIdOf(rootTitle);

  return masteryHubElements().find((hubElement) => hubElement.dataset.masteryRootId === linkedRootNodeId);
}

export function masteryHubPointerPoint(masteryHubElementValue) {
  const masteryHubBounds = masteryHubElementValue.getBoundingClientRect();

  return {
    clientX: masteryHubBounds.left + masteryHubBounds.width / 2,
    clientY: masteryHubBounds.top + masteryHubBounds.height / 2,
  };
}

export async function openCanvasContextMenu(pointerPoint) {
  const canvasElement = requireElementFromFrame("#skill-tree-canvas");

  canvasElement.dispatchEvent(contextMenuEvent(pointerPoint));
  await waitForFrameCondition(
    () => !contextMenuElement().classList.contains("hidden") && contextMenuElement().dataset.nodeId === "",
    1_500,
    "Menu de contexto do canvas vazio não abriu em até 1500ms.",
  );
}

export async function openNodeContextMenu(nodeTitle) {
  const nodeElement = requireNode(nodeTitle);

  nodeElement.dispatchEvent(contextMenuEvent(nodePointerPoint(nodeElement)));
  await waitForFrameCondition(
    () => !contextMenuElement().classList.contains("hidden") && contextMenuElement().dataset.nodeId === nodeIdOf(nodeTitle),
    1_500,
    `Menu de contexto do nó '${nodeTitle}' não abriu em até 1500ms.`,
  );
}

export async function openMasteryHubContextMenu(rootTitle) {
  const masteryHub = requireMasteryHubForRoot(rootTitle);

  masteryHub.dispatchEvent(contextMenuEvent(masteryHubPointerPoint(masteryHub)));
  await waitForFrameCondition(
    () => !contextMenuElement().classList.contains("hidden") &&
      contextMenuElement().dataset.masteryHubId === masteryHub.dataset.masteryHubId,
    1_500,
    `Menu de contexto da maestria ligada a '${rootTitle}' não abriu em até 1500ms.`,
  );
}

export function requireVisibleContextAction(actionName) {
  const actionButton = [...frameDocument().querySelectorAll(`#context-menu [data-action="${actionName}"]`)]
    .find((buttonElement) => !buttonElement.classList.contains("hidden"));

  if (!actionButton) {
    throw new Error(`Ação visível '${actionName}' não encontrada em '#context-menu'.`);
  }

  return actionButton;
}

export function installDialogStubs() {
  const frameWindow = requireFrameWindow();

  if (frameWindow.__codexBrowserSmokePromptQueue) {
    return;
  }

  frameWindow.__codexBrowserSmokePromptQueue = [];
  frameWindow.__codexBrowserSmokeAlertLog = [];
  frameWindow.prompt = (message) => {
    const queuedResponses = frameWindow.__codexBrowserSmokePromptQueue;

    if (queuedResponses.length === 0) {
      throw new Error(`Prompt inesperado: "${message}". Esperado resposta previamente enfileirada.`);
    }

    return queuedResponses.shift();
  };
  frameWindow.alert = (message) => {
    frameWindow.__codexBrowserSmokeAlertLog.push(String(message ?? ""));
  };
}

export function bossModal() {
  return requireElementFromFrame("#boss-modal");
}

export function frameDocument() {
  const currentFrameDocument = appFrameElement.contentDocument;

  if (!currentFrameDocument) {
    throw new Error("Iframe do app não expôs 'contentDocument'. Esperado: documento HTML carregado.");
  }

  return currentFrameDocument;
}

export function requireFrameWindow() {
  const currentFrameWindow = appFrameElement.contentWindow;

  if (!currentFrameWindow) {
    throw new Error("Iframe do app não expôs 'contentWindow'. Esperado: janela do app carregada.");
  }

  return currentFrameWindow;
}

export function nodeByTitle(nodeTitle) {
  return [...frameDocument().querySelectorAll("[data-node-id]")]
    .find((nodeElement) => nodeElement.dataset.nodeTitle === nodeTitle);
}

export function nodeIdOf(nodeTitle) {
  return requireNode(nodeTitle).dataset.nodeId;
}

export function parentIdOf(nodeTitle) {
  const rawParentId = requireNode(nodeTitle).dataset.nodeParentId;

  return rawParentId === "" ? null : rawParentId;
}

export function requireNode(nodeTitle) {
  const targetNodeElement = nodeByTitle(nodeTitle);

  if (!targetNodeElement) {
    throw new Error(`Nó '${nodeTitle}' não encontrado em '[data-node-id]'.`);
  }

  return targetNodeElement;
}

export function requireNodeDragHandle(nodeElement, nodeTitle) {
  const dragHandle = nodeElement.querySelector("[data-node-drag-handle]");

  if (!dragHandle) {
    throw new Error(`Handle de drag do nó '${nodeTitle}' não encontrado.`);
  }

  return dragHandle;
}

export function requireMasteryHubForRoot(rootTitle) {
  const targetMasteryHub = masteryHubElementForRoot(rootTitle);

  if (!targetMasteryHub) {
    throw new Error(`Maestria ligada a '${rootTitle}' não encontrada em '[data-mastery-hub]'.`);
  }

  return targetMasteryHub;
}

export function progressOf(nodeTitle) {
  return Number(requireNode(nodeTitle).dataset.nodeProgress);
}

export function sourceMasteryHubIdOf(nodeTitle) {
  return requireNode(nodeTitle).dataset.nodeSourceMasteryHubId;
}

export function rootNodeCount() {
  return [...frameDocument().querySelectorAll("[data-node-id]")]
    .filter((nodeElement) => nodeElement.dataset.nodeParentId === "")
    .length;
}

export function statusOf(nodeTitle) {
  return requireNode(nodeTitle).dataset.nodeStatus;
}

export function nodePointerPoint(nodeElement) {
  const nodeBounds = nodeElement.getBoundingClientRect();

  return {
    clientX: nodeBounds.left + nodeBounds.width / 2,
    clientY: nodeBounds.top + nodeBounds.height / 2,
  };
}

export function numericStylePixel(element, propertyName) {
  return Number.parseFloat(element.style[propertyName] || "0") || 0;
}

export function storedNodeByTitle(nodeTitle) {
  const rawState = requireFrameWindow().localStorage.getItem(appStateStorageKey);
  const parsedState = JSON.parse(rawState || "{}");

  return Object.values(parsedState.nodesById ?? {})
    .find((node) => node.title === nodeTitle);
}

export function almostEqual(actualValue, expectedValue) {
  return Math.abs(Number(actualValue) - Number(expectedValue)) < 0.05;
}

export function pointerLikeEvent(eventName, pointerPoint = {}) {
  const frameWindow = requireFrameWindow();
  const eventButton = Number(pointerPoint.button ?? 0);
  const eventInit = {
    bubbles: true,
    button: eventButton,
    buttons: eventName === "pointerdown" || eventName === "pointermove" ? buttonMaskFor(eventButton) : 0,
    cancelable: true,
    clientX: Number(pointerPoint.clientX ?? 0),
    clientY: Number(pointerPoint.clientY ?? 0),
    composed: true,
    pointerId: 1,
    pointerType: "mouse",
    view: frameWindow,
  };

  if (typeof frameWindow.PointerEvent === "function") {
    return new frameWindow.PointerEvent(eventName, eventInit);
  }

  return new frameWindow.MouseEvent(eventName, eventInit);
}

export function wheelEvent(input) {
  return new (requireFrameWindow()).WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    clientX: input.clientX,
    clientY: input.clientY,
    deltaY: input.deltaY,
    view: requireFrameWindow(),
  });
}

export function requireElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Elemento '${selector}' não encontrado. Esperado: seletor CSS válido com um único match.`);
  }

  return element;
}

export function requireElementFromFrame(selector) {
  const element = frameDocument().querySelector(selector);

  if (!element) {
    throw new Error(`Elemento '${selector}' não encontrado dentro do iframe do app.`);
  }

  return element;
}

export async function waitForFrameCondition(predicate, timeoutMs, timeoutMessage) {
  const waitStartedAt = Date.now();

  while (Date.now() - waitStartedAt < timeoutMs) {
    if (predicate()) {
      return;
    }

    await sleep(100);
  }

  throw new Error(timeoutMessage);
}

export function writeSmokeResult(payload) {
  resultsElement.textContent = JSON.stringify(payload, null, 2);
  document.title = payload.ok ? "PASS" : "FAIL";
}

export function sleep(durationMs) {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

function buttonMaskFor(button) {
  return button === 1 ? 4 : 1;
}

function clickBossOption(optionLabel) {
  const bossOptionButton = bossOptionButtons()
    .find((optionElement) => optionElement.textContent.trim() === optionLabel);

  if (!bossOptionButton) {
    throw new Error(`Opção '${optionLabel}' não encontrada em '#boss-modal-options'.`);
  }

  bossOptionButton.click();
}

function bossOptionButtons() {
  return [...frameDocument().querySelectorAll("#boss-modal-options [data-choice]")];
}

function contextMenuEvent(pointerPoint) {
  return new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: pointerPoint.clientX,
    clientY: pointerPoint.clientY,
    button: 2,
    buttons: 2,
    composed: true,
    view: requireFrameWindow(),
  });
}

function themeAlertElement() {
  return requireElementFromFrame("#theme-alert");
}

function themeAlertInputElement() {
  return requireElementFromFrame("#theme-alert-input");
}

function themeAlertPrimaryButton() {
  return requireElementFromFrame("#theme-alert-close");
}
