import {
  almostEqual, bossModal, clickNode, configureBrowserSmokeHarness, confirmBossAdvice, frameDocument,
  installDialogStubs, masteryHubElementForRoot, masteryHubElements, masterySourceLinkElements,
  masterySourceLinkForNode, nodeByTitle, nodeIdOf, nodePointerPoint, numericStylePixel,
  openCanvasContextMenu, openMasteryHubContextMenu, openNodeContextMenu, parentIdOf,
  pointerLikeEvent, progressOf, requireElement, requireElementFromFrame, requireFrameWindow,
  requireNode, requireNodeDragHandle, requireVisibleContextAction, rootNodeCount, sleep,
  sourceMasteryHubIdOf, statusOf, storedNodeByTitle, submitThemeText, waitForFrameCondition,
  wheelEvent, writeSmokeResult,
} from "./browser-smoke/dom-harness.js";
import {
  completeBossFight, createSubtopicUnder, holdNodeFor, holdNodeUntilFilled, resetOriginProgressViaMenu,
} from "./browser-smoke/actions.js";

const APP_STATE_STORAGE_KEY = "skill-tree.state";
const LEGACY_VISUAL_CUSTOMIZATION_STORAGE_KEY = "skill-tree.visual-customization";
const GEOMETRY_DESCENDANT_TITLES = Object.freeze(["Ângulos", "Congruência", "Semelhança", "Área"]);
const NEW_CANVAS_ROOT_TITLE = "Geometria";
const NEW_CHILD_ORIGIN_TITLE = "Álgebra";
const NEW_MASTERY_ROOT_TITLE = "Lógica";
const NESTED_ORIGIN_CHILD_TITLE = "Variáveis";
const NEW_ROOT_FIRST_SUBTOPIC_TITLE = "Triângulos";
const NEW_ROOT_MASTERY_TITLE = "Trilha de Geometria";
const FRAME_READY_TIMEOUT_MS = 5_000;
const NODE_FILL_TIMEOUT_MS = 10_000;
const ROOT_HOLD_DURATION_MS = 800;
const ROOT_SYNC_TIMEOUT_MS = 5_000;

const resultsElement = requireElement("#results");
const appFrame = requireElement("#app-frame");

let hasBootstrappedCleanFrame = false;
let hasCompletedSmokeRun = false;

configureBrowserSmokeHarness({
  appFrameElement: appFrame,
  appStateStorageKey: APP_STATE_STORAGE_KEY,
  resultsElement,
});

appFrame.addEventListener("load", handleFrameLoad);

async function handleFrameLoad() {
  try {
    if (!hasBootstrappedCleanFrame) {
      bootstrapCleanFrameState();
      return;
    }

    if (hasCompletedSmokeRun) {
      return;
    }

    hasCompletedSmokeRun = true;
    await runBrowserSmoke();
  } catch (error) {
    writeSmokeResult({
      error: String(error?.stack ?? error),
      ok: false,
    });
  }
}

function bootstrapCleanFrameState() {
  const frameWindow = requireFrameWindow();

  frameWindow.localStorage.removeItem(APP_STATE_STORAGE_KEY);
  frameWindow.localStorage.removeItem(LEGACY_VISUAL_CUSTOMIZATION_STORAGE_KEY);
  hasBootstrappedCleanFrame = true;
  appFrame.src = `./index.html?browser-smoke-run=${Date.now()}`;
}

async function runBrowserSmoke() {
  focusFrameWindow();
  await waitForFrameNodes();
  installDialogStubs();

  const smokeResults = [];

  smokeResults.push(renderInitialResult());
  smokeResults.push(await canvasCameraNavigationResult());
  smokeResults.push(initialRootMasteryHubResult());
  smokeResults.push(await subtopicDragPersistenceResult());
  smokeResults.push(await subtopicContextOriginResult());
  smokeResults.push(await emptyCanvasRootResult());
  smokeResults.push(await newRootAutoMasteryHubResult());
  smokeResults.push(await newRootDescendantChainResult());
  smokeResults.push(await renameMasteryHubResult());
  smokeResults.push(await masteryHubRootCreationResult());
  smokeResults.push(await rootHoldResult());
  smokeResults.push(await childFillResult());
  smokeResults.push(await bossPromotionResult());
  smokeResults.push(await secondOriginProgressionResult());
  smokeResults.push(await nestedOriginProgressionAndResetResult());

  writeSmokeResult({
    ok: smokeResults.every((result) => result.passed),
    results: smokeResults,
  });
}

function focusFrameWindow() {
  appFrame.focus();
  requireFrameWindow().focus();
}

async function waitForFrameNodes() {
  await waitForFrameCondition(
    () => nodeByTitle("Matemática Básica"),
    FRAME_READY_TIMEOUT_MS,
    "Root 'Matemática Básica' não renderizou em até 5000ms.",
  );
  await waitForFrameCondition(
    () => nodeByTitle("Soma"),
    FRAME_READY_TIMEOUT_MS,
    "Filho 'Soma' não renderizou em até 5000ms.",
  );
}

function renderInitialResult() {
  return {
    detail: {
      masteryHubCount: masteryHubElements().length,
      nodeCount: frameDocument().querySelectorAll("[data-node-id]").length,
    },
    name: "render-inicial",
    passed: frameDocument().querySelectorAll("[data-node-id]").length >= 3,
  };
}

function initialRootMasteryHubResult() {
  return {
    detail: {
      masteryHubCount: masteryHubElements().length,
      placementMode: masteryHubElementForRoot("Matemática Básica")?.dataset.masteryPlacementMode ?? "",
      rootHubText: masteryHubElementForRoot("Matemática Básica")?.textContent.replace(/\s+/g, " ").trim() ?? "",
      rootHubTitle: masteryHubElementForRoot("Matemática Básica")?.dataset.masteryTitle ?? "",
      rootNodeId: nodeIdOf("Matemática Básica"),
    },
    name: "root-inicial-ganha-maestria-automatica",
    passed:
      masteryHubElements().length === 1 &&
      masteryHubElementForRoot("Matemática Básica")?.dataset.masteryRootId === nodeIdOf("Matemática Básica"),
  };
}

async function canvasCameraNavigationResult() {
  const canvasElement = requireElementFromFrame("#skill-tree-canvas");
  const initialZoom = Number(canvasElement.dataset.cameraZoom ?? 1);
  const initialOffsetX = Number(canvasElement.dataset.cameraOffsetX ?? 0);
  const initialOffsetY = Number(canvasElement.dataset.cameraOffsetY ?? 0);

  canvasElement.dispatchEvent(wheelEvent({ clientX: 420, clientY: 320, deltaY: -240 }));
  await sleep(80);
  canvasElement.dispatchEvent(pointerLikeEvent("pointerdown", { button: 1, clientX: 420, clientY: 320 }));
  frameDocument().dispatchEvent(pointerLikeEvent("pointermove", { button: 1, clientX: 468, clientY: 292 }));
  frameDocument().dispatchEvent(pointerLikeEvent("pointerup", { button: 1, clientX: 468, clientY: 292 }));
  await sleep(80);

  return {
    detail: {
      offsetX: Number(canvasElement.dataset.cameraOffsetX ?? 0),
      offsetY: Number(canvasElement.dataset.cameraOffsetY ?? 0),
      zoom: Number(canvasElement.dataset.cameraZoom ?? 1),
    },
    name: "canvas-camera-wheel-zoom-e-pan-meio",
    passed:
      Number(canvasElement.dataset.cameraZoom ?? 1) > initialZoom &&
      Number(canvasElement.dataset.cameraOffsetX ?? 0) !== initialOffsetX &&
      Number(canvasElement.dataset.cameraOffsetY ?? 0) !== initialOffsetY,
  };
}

async function subtopicDragPersistenceResult() {
  const nodeTitle = "Subtração";
  const nodeElement = requireNode(nodeTitle);
  const dragHandle = requireNodeDragHandle(nodeElement, nodeTitle);
  const initialLeft = numericStylePixel(nodeElement, "left");
  const initialTop = numericStylePixel(nodeElement, "top");
  const pointerPoint = nodePointerPoint(dragHandle);
  const viewportScale = Number(requireElementFromFrame("#skill-tree-canvas").dataset.cameraZoom || 1);
  const expectedOffsetX = 36 / viewportScale;
  const expectedOffsetY = 24 / viewportScale;

  dragHandle.dispatchEvent(pointerLikeEvent("pointerdown", pointerPoint));
  frameDocument().dispatchEvent(pointerLikeEvent("pointermove", {
    clientX: pointerPoint.clientX + 36,
    clientY: pointerPoint.clientY + 24,
  }));
  frameDocument().dispatchEvent(pointerLikeEvent("pointerup", {
    clientX: pointerPoint.clientX + 36,
    clientY: pointerPoint.clientY + 24,
  }));
  await sleep(120);

  const movedNodeElement = requireNode(nodeTitle);
  const storedNode = storedNodeByTitle(nodeTitle);

  return {
    detail: {
      layoutOffsetX: storedNode?.layoutOffsetX ?? null,
      layoutOffsetY: storedNode?.layoutOffsetY ?? null,
      movedLeft: numericStylePixel(movedNodeElement, "left"),
      movedTop: numericStylePixel(movedNodeElement, "top"),
      viewportScale,
    },
    name: "subtopico-arrasta-e-persiste-no-fim",
    passed:
      numericStylePixel(movedNodeElement, "left") !== initialLeft &&
      numericStylePixel(movedNodeElement, "top") !== initialTop &&
      almostEqual(storedNode?.layoutOffsetX, expectedOffsetX) &&
      almostEqual(storedNode?.layoutOffsetY, expectedOffsetY),
  };
}

async function rootHoldResult() {
  const rootProgressBeforeHold = progressOf("Matemática Básica");

  await holdNodeFor("Matemática Básica", ROOT_HOLD_DURATION_MS);

  const rootProgressAfterHold = progressOf("Matemática Básica");

  return {
    detail: {
      rootProgressAfterHold,
      rootProgressBeforeHold,
    },
    name: "root-nao-avanca-no-hold",
    passed: rootProgressBeforeHold === 0 && rootProgressAfterHold === 0,
  };
}

async function subtopicContextOriginResult() {
  await openNodeContextMenu("Soma");

  const createRootButton = requireVisibleContextAction("create-root");

  createRootButton.click();
  await submitThemeText(NEW_CHILD_ORIGIN_TITLE);
  await waitForFrameCondition(
    () => nodeByTitle(NEW_CHILD_ORIGIN_TITLE),
    FRAME_READY_TIMEOUT_MS,
    `Novo nó '${NEW_CHILD_ORIGIN_TITLE}' não renderizou em até 5000ms.`,
  );

  return {
    detail: {
      createdNodeParentId: parentIdOf(NEW_CHILD_ORIGIN_TITLE),
      createdNodeTitle: NEW_CHILD_ORIGIN_TITLE,
      nodeCountAfterCreateOrigin: frameDocument().querySelectorAll("[data-node-id]").length,
      somaNodeId: nodeIdOf("Soma"),
    },
    name: "submenu-subtopico-cria-filho",
    passed: parentIdOf(NEW_CHILD_ORIGIN_TITLE) === nodeIdOf("Soma"),
  };
}

async function emptyCanvasRootResult() {
  await openCanvasContextMenu({ clientX: 48, clientY: 48 });

  requireVisibleContextAction("create-root").click();
  await submitThemeText(NEW_CANVAS_ROOT_TITLE);
  await waitForFrameCondition(
    () => nodeByTitle(NEW_CANVAS_ROOT_TITLE),
    FRAME_READY_TIMEOUT_MS,
    `Novo root '${NEW_CANVAS_ROOT_TITLE}' não renderizou em até 5000ms.`,
  );

  return {
    detail: {
      createdRootParentId: parentIdOf(NEW_CANVAS_ROOT_TITLE),
      createdRootTitle: NEW_CANVAS_ROOT_TITLE,
      masteryHubCountAfterCreateRoot: masteryHubElements().length,
      rootCountAfterCreateRoot: rootNodeCount(),
    },
    name: "canvas-vazio-cria-root",
    passed:
      parentIdOf(NEW_CANVAS_ROOT_TITLE) === null &&
      masteryHubElements().length === 1,
  };
}

async function newRootAutoMasteryHubResult() {
  await openNodeContextMenu(NEW_CANVAS_ROOT_TITLE);

  requireVisibleContextAction("add-child").click();
  await submitThemeText(NEW_ROOT_FIRST_SUBTOPIC_TITLE);
  await waitForFrameCondition(
    () => nodeByTitle(NEW_ROOT_FIRST_SUBTOPIC_TITLE),
    FRAME_READY_TIMEOUT_MS,
    `Novo subtópico '${NEW_ROOT_FIRST_SUBTOPIC_TITLE}' não renderizou em até 5000ms.`,
  );
  await waitForFrameCondition(
    () => masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE),
    FRAME_READY_TIMEOUT_MS,
    `Círculo de maestria de '${NEW_CANVAS_ROOT_TITLE}' não renderizou em até 5000ms.`,
  );

  return {
    detail: {
      masteryHubCount: masteryHubElements().length,
      newRootHubPlacementMode: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryPlacementMode ?? "",
      newRootLinkedHubId: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryRootId ?? "",
      newRootMasteryTitle: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryTitle ?? "",
      newRootNodeId: nodeIdOf(NEW_CANVAS_ROOT_TITLE),
      newRootSubtopicParentId: parentIdOf(NEW_ROOT_FIRST_SUBTOPIC_TITLE),
    },
    name: "novo-root-ganha-maestria-ao-primeiro-subtopico",
    passed:
      masteryHubElements().length === 2 &&
      masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryRootId === nodeIdOf(NEW_CANVAS_ROOT_TITLE) &&
      masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryTitle === "" &&
      parentIdOf(NEW_ROOT_FIRST_SUBTOPIC_TITLE) === nodeIdOf(NEW_CANVAS_ROOT_TITLE),
  };
}

async function newRootDescendantChainResult() {
  let parentTitle = NEW_ROOT_FIRST_SUBTOPIC_TITLE;

  for (const descendantTitle of GEOMETRY_DESCENDANT_TITLES) {
    await openNodeContextMenu(parentTitle);
    requireVisibleContextAction("add-child").click();
    await submitThemeText(descendantTitle);
    await waitForFrameCondition(
      () => nodeByTitle(descendantTitle),
      FRAME_READY_TIMEOUT_MS,
      `Novo subtópico '${descendantTitle}' não renderizou em até 5000ms.`,
    );
    parentTitle = descendantTitle;
  }

  return {
    detail: {
      descendantCount: GEOMETRY_DESCENDANT_TITLES.length + 1,
      lastDescendantParentId: parentIdOf(GEOMETRY_DESCENDANT_TITLES.at(-1)),
    },
    name: "novo-root-ganha-cadeia-de-subtopicos",
    passed:
      parentIdOf(GEOMETRY_DESCENDANT_TITLES.at(-1)) ===
      nodeIdOf(GEOMETRY_DESCENDANT_TITLES.at(-2)),
  };
}

async function renameMasteryHubResult() {
  await openMasteryHubContextMenu(NEW_CANVAS_ROOT_TITLE);

  requireVisibleContextAction("rename-mastery-hub").click();
  await submitThemeText(NEW_ROOT_MASTERY_TITLE);
  await waitForFrameCondition(
    () => masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryTitle === NEW_ROOT_MASTERY_TITLE,
    FRAME_READY_TIMEOUT_MS,
    `Título da maestria '${NEW_ROOT_MASTERY_TITLE}' não apareceu em até 5000ms.`,
  );

  return {
    detail: {
      renamedHubText: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.textContent.replace(/\s+/g, " ").trim() ?? "",
      renamedHubTitle: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryTitle ?? "",
    },
    name: "maestria-pode-ser-renomeada",
    passed: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryTitle === NEW_ROOT_MASTERY_TITLE,
  };
}

async function masteryHubRootCreationResult() {
  await openMasteryHubContextMenu(NEW_CANVAS_ROOT_TITLE);

  requireVisibleContextAction("create-root").click();
  await submitThemeText(NEW_MASTERY_ROOT_TITLE);
  await waitForFrameCondition(
    () => nodeByTitle(NEW_MASTERY_ROOT_TITLE),
    FRAME_READY_TIMEOUT_MS,
    `Novo root '${NEW_MASTERY_ROOT_TITLE}' não renderizou em até 5000ms.`,
  );

  return {
    detail: {
      createdRootParentId: parentIdOf(NEW_MASTERY_ROOT_TITLE),
      createdRootSourceMasteryHubId: sourceMasteryHubIdOf(NEW_MASTERY_ROOT_TITLE),
      createdRootTitle: NEW_MASTERY_ROOT_TITLE,
      sourceLinkCount: masterySourceLinkElements().length,
      rootCountAfterMasteryCreate: rootNodeCount(),
      sourceMasteryRootId: masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryRootId ?? "",
    },
    name: "maestria-cria-root-independente",
    passed:
      parentIdOf(NEW_MASTERY_ROOT_TITLE) === null &&
      sourceMasteryHubIdOf(NEW_MASTERY_ROOT_TITLE) === masteryHubElementForRoot(NEW_CANVAS_ROOT_TITLE)?.dataset.masteryHubId &&
      masterySourceLinkForNode(NEW_MASTERY_ROOT_TITLE) !== null &&
      nodeIdOf(NEW_MASTERY_ROOT_TITLE) !== nodeIdOf(NEW_CANVAS_ROOT_TITLE) &&
      rootNodeCount() >= 3,
  };
}

async function childFillResult() {
  await holdNodeUntilFilled("Soma", NODE_FILL_TIMEOUT_MS);

  return {
    detail: {
      somaProgress: progressOf("Soma"),
      somaStatus: statusOf("Soma"),
    },
    name: "filho-avanca-no-hold",
    passed: progressOf("Soma") >= 100,
  };
}

async function bossPromotionResult() {
  clickNode("Soma");
  await waitForFrameCondition(
    () => bossModal().dataset.nodeId === nodeIdOf("Soma"),
    2_500,
    "Boss modal não abriu para nó 'Soma' em até 2500ms.",
  );
  confirmBossAdvice();
  requireElementFromFrame("#boss-modal-confirm").click();
  await waitForFrameCondition(
    () => progressOf("Matemática Básica") > 0,
    ROOT_SYNC_TIMEOUT_MS,
    "Root 'Matemática Básica' não subiu após boss em até 5000ms.",
  );

  return {
    detail: {
      rootProgress: progressOf("Matemática Básica"),
      rootStatus: statusOf("Matemática Básica"),
      somaStatus: statusOf("Soma"),
    },
    name: "root-sobe-apos-boss",
    passed: progressOf("Matemática Básica") === 33.33,
  };
}

async function secondOriginProgressionResult() {
  const originProgressBeforeHold = progressOf(NEW_CANVAS_ROOT_TITLE);

  await holdNodeFor(NEW_CANVAS_ROOT_TITLE, ROOT_HOLD_DURATION_MS);
  await holdNodeUntilFilled(NEW_ROOT_FIRST_SUBTOPIC_TITLE, NODE_FILL_TIMEOUT_MS);
  await completeBossFight(NEW_ROOT_FIRST_SUBTOPIC_TITLE, "4");
  await waitForFrameCondition(
    () => progressOf(NEW_CANVAS_ROOT_TITLE) > originProgressBeforeHold,
    ROOT_SYNC_TIMEOUT_MS,
    `Root '${NEW_CANVAS_ROOT_TITLE}' não subiu após boss em até 5000ms.`,
  );

  return {
    detail: {
      originProgressAfterBoss: progressOf(NEW_CANVAS_ROOT_TITLE),
      originProgressBeforeHold,
      originStatusAfterBoss: statusOf(NEW_CANVAS_ROOT_TITLE),
      subtopicStatusAfterBoss: statusOf(NEW_ROOT_FIRST_SUBTOPIC_TITLE),
    },
    name: "segundo-root-progride-pelos-filhos",
    passed:
      originProgressBeforeHold === 0 &&
      progressOf(NEW_CANVAS_ROOT_TITLE) === 20 &&
      statusOf(NEW_ROOT_FIRST_SUBTOPIC_TITLE) === "dominado",
  };
}

async function nestedOriginProgressionAndResetResult() {
  const originProgressBeforeHold = progressOf(NEW_CHILD_ORIGIN_TITLE);

  await holdNodeFor(NEW_CHILD_ORIGIN_TITLE, ROOT_HOLD_DURATION_MS);
  const originProgressAfterHold = progressOf(NEW_CHILD_ORIGIN_TITLE);
  await createSubtopicUnder(NEW_CHILD_ORIGIN_TITLE, NESTED_ORIGIN_CHILD_TITLE);
  await holdNodeUntilFilled(NESTED_ORIGIN_CHILD_TITLE, NODE_FILL_TIMEOUT_MS);
  await completeBossFight(NESTED_ORIGIN_CHILD_TITLE, "4");
  await waitForFrameCondition(
    () => progressOf(NEW_CHILD_ORIGIN_TITLE) > originProgressBeforeHold,
    ROOT_SYNC_TIMEOUT_MS,
    `Origem aninhada '${NEW_CHILD_ORIGIN_TITLE}' não progrediu pelos subtópicos.`,
  );

  const originProgressAfterChild = progressOf(NEW_CHILD_ORIGIN_TITLE);

  await resetOriginProgressViaMenu(NEW_CHILD_ORIGIN_TITLE);

  return {
    detail: {
      childProgressAfterReset: progressOf(NESTED_ORIGIN_CHILD_TITLE),
      originProgressAfterChild,
      originProgressAfterHold,
      originProgressAfterReset: progressOf(NEW_CHILD_ORIGIN_TITLE),
    },
    name: "origem-aninhada-progride-por-filhos-e-reseta",
    passed:
      originProgressBeforeHold === 0 &&
      originProgressAfterHold === originProgressBeforeHold &&
      originProgressAfterChild > 0 &&
      progressOf(NEW_CHILD_ORIGIN_TITLE) === 0 &&
      progressOf(NESTED_ORIGIN_CHILD_TITLE) === 0,
  };
}


