import { MenuPosition } from "./ui/geometry.js";
import { LayoutTokens } from "./ui/layout-tokens.js";
import { ApplicationDom, BossModalContent } from "./ui/modal-context.js";
import { NodeIdentifier } from "./ui/node-identifier.js";
import { RenderedTree, TreeLayoutEngine } from "./ui/tree-layout.js";
import { TreeSnapshot } from "./ui/tree-snapshot.js";

export function hideBossModal() {
  ApplicationDom.capture().bossModal().hide();
}

export function hideContextMenu() {
  ApplicationDom.capture().contextMenu().hide();
}

export function hideHoverModal() {
  ApplicationDom.capture().hoverModal().hide();
}

export function renderTree(nodesInput) {
  const renderedTree = buildRenderedTree(nodesInput);

  ApplicationDom.capture().render(renderedTree);
}

export function showBossModal(nodeId = "", contentInput = null) {
  const nodeIdentifier = NodeIdentifier.optional(nodeId);
  const content = BossModalContent.from(contentInput).forNode(nodeIdentifier);

  ApplicationDom.capture().bossModal().show(content, nodeIdentifier);
}

export function showContextMenu(x, y, nodeId = "", masteryHubId = "", isRootNode = false, canvasPoint = null) {
  const menuPosition = MenuPosition.from(x, y);
  const nodeIdentifier = NodeIdentifier.optional(nodeId);

  ApplicationDom.capture().contextMenu().showAt(
    menuPosition,
    nodeIdentifier,
    masteryHubId,
    isRootNode,
    canvasPoint,
  );
}

export function showHoverModal(x, y, content) {
  const menuPosition = MenuPosition.from(x, y);

  ApplicationDom.capture().hoverModal().showAt(menuPosition, content);
}

function buildRenderedTree(nodesInput) {
  const treeSnapshot = TreeSnapshot.from(nodesInput);
  const layoutEngine = new TreeLayoutEngine(treeSnapshot, LayoutTokens.default());

  return RenderedTree.from(treeSnapshot, layoutEngine);
}
