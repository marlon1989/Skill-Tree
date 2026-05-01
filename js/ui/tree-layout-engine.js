import { CartesianPoint, StageSize } from "./geometry.js";
import { BranchTheme } from "./branch-theme.js";
import { RenderedMasteryHub } from "./rendered-mastery-hub.js";
import { RenderedNode } from "./rendered-node.js";
import { ConnectionCurve, MasteryHubLinkCurve } from "./tree-layout-curves.js";
import { NodePosition, NodePositionMap } from "./tree-layout-position.js";
import { maxNodeSizeFor, nodeSizeFor, orbitRadiusFor } from "./tree-layout-sizing.js";
import { midpointControlPoint } from "./svg-path-geometry.js";
import { childSector, createRootSectors, pointOnOrbit } from "./radial-layout-math.js";

export class TreeLayoutEngine {
  constructor(treeSnapshot, layoutTokens) {
    this.treeSnapshot = treeSnapshot;
    this.layoutTokens = layoutTokens;
    this.rootIdentifiersValue = treeSnapshot.rootIdentifiers();
    this.connectionCurvesValue = null;
    this.subtreeMetricsByNodeId = new Map();
    this.resolvedMasteryHubEntriesValue = null;
    this.treeMetrics = this.buildTreeMetrics();
    this.stageSizeValue = this.buildStageSize();
    this.centerPointValue = centerPointFor(this.stageSizeValue);
    this.rootSectors = createRootSectors(this.rootIdentifiersValue.length);
    this.nodePositions = NodePositionMap.empty();
    this.branchThemesByNodeId = new Map();
    this.placeTree();
  }

  backdropMarkup() {
    return "";
  }

  buildStageSize() {
    if (this.treeSnapshot.nodeCount() === 0) {
      return StageSize.viewport();
    }

    const furthestNodeOrbitRadius =
      this.layoutTokens.rootOrbitRadius() +
      this.treeMetrics.maxDepth * this.layoutTokens.depthRingGap() +
      maxNodeSizeFor(this.layoutTokens);
    const furthestHubOrbitRadius =
      this.layoutTokens.rootOrbitRadius() +
      this.layoutTokens.rootNodeSize() / 2 +
      this.layoutTokens.hubOrbitGap() +
      this.layoutTokens.hubOuterSize() / 2;
    const requiredDiameter =
      Math.max(furthestNodeOrbitRadius, furthestHubOrbitRadius) * 2 +
      this.layoutTokens.stagePaddingX() * 2;

    return new StageSize(
      Math.max(window.innerWidth, requiredDiameter),
      Math.max(window.innerHeight, requiredDiameter),
    );
  }

  buildTreeMetrics() {
    const metrics = {
      masteredNodeCount: 0,
      maxDepth: 0,
      rootMetricsById: new Map(),
    };

    const visitNode = (nodeIdentifier, depthValue) => {
      const treeNode = this.treeSnapshot.nodes().require(nodeIdentifier);

      metrics.maxDepth = Math.max(metrics.maxDepth, depthValue);
      metrics.masteredNodeCount += Number(treeNode.status().isMastered());
      this.treeSnapshot.childIdentifiersOf(nodeIdentifier).forEach((childIdentifier) => {
        visitNode(childIdentifier, depthValue + 1);
      });
    };

    this.rootIdentifiersValue.forEach((rootIdentifier) => visitNode(rootIdentifier, 0));
    this.rootIdentifiersValue.forEach((rootIdentifier) => {
      metrics.rootMetricsById.set(rootIdentifier.toString(), this.subtreeMetricsOf(rootIdentifier));
    });

    return metrics;
  }

  connectionCurves() {
    if (this.connectionCurvesValue !== null) {
      return this.connectionCurvesValue;
    }

    const curves = [];

    this.treeSnapshot.nodes().each((treeNode) => {
      if (treeNode.isRoot()) {
        return;
      }

      const parentPosition = this.nodePositions.require(treeNode.parentId());
      const childPosition = this.nodePositions.require(treeNode.id());
      const startPoint = parentPosition.linkPointToward(childPosition.centerPoint());
      const endPoint = childPosition.linkPointToward(parentPosition.centerPoint());
      const controlPoint = controlPointFor(
        startPoint,
        endPoint,
        treeNode.connectionControlOffset(),
      );

      curves.push(
        new ConnectionCurve(
          treeNode.id().toString(),
          startPoint,
          endPoint,
          controlPoint,
          this.branchThemeOf(treeNode.id()),
        ),
      );
    });

    this.connectionCurvesValue = curves;

    return this.connectionCurvesValue;
  }

  masteryHubConnections() {
    return this.resolvedMasteryHubEntries().map((masteryHub) => {
      const linkedRootPosition = this.nodePositions.require(masteryHub.linkedRootNodeId);
      const branchTheme = this.branchThemeOf({ toString: () => masteryHub.linkedRootNodeId });
      const hubPoint = new CartesianPoint(masteryHub.x, masteryHub.y);
      const rootPoint = linkedRootPosition.centerPoint();

      return new MasteryHubLinkCurve(masteryHub.id, hubPoint, rootPoint, branchTheme);
    });
  }

  masteryHubSourceConnections() {
    const resolvedHubsById = masteryHubsById(this.resolvedMasteryHubEntries());
    const sourceConnections = [];

    this.treeSnapshot.nodes().each((treeNode) => {
      const sourceMasteryHub = resolvedHubsById.get(treeNode.sourceMasteryHubId());

      if (!sourceMasteryHub) {
        return;
      }

      sourceConnections.push(new MasteryHubLinkCurve(
        treeNode.id().toString(),
        new CartesianPoint(sourceMasteryHub.x, sourceMasteryHub.y),
        this.nodePositions.require(treeNode.id()).centerPoint(),
        this.branchThemeOf(treeNode.id()),
        "data-mastery-source-link",
      ));
    });

    return sourceConnections;
  }

  masteryHubMarkup() {
    return this.resolvedMasteryHubEntries().map((masteryHub) => {
      const linkedRootNode = this.treeSnapshot.nodes().require(masteryHub.linkedRootNodeId);
      const linkedRootMetrics = this.treeMetrics.rootMetricsById.get(masteryHub.linkedRootNodeId);

      return new RenderedMasteryHub(
        masteryHub,
        linkedRootNode,
        linkedRootMetrics,
        this.layoutTokens,
        this.branchThemeOf({ toString: () => masteryHub.linkedRootNodeId }),
      ).toMarkup();
    }).join("");
  }

  masteryHubEntries() {
    return this.treeSnapshot.masteryHubs().filter((masteryHub) => this.rootIdentifiersValue
      .some((rootIdentifier) => rootIdentifier.toString() === masteryHub.linkedRootNodeId));
  }

  resolvedMasteryHubEntries() {
    if (this.resolvedMasteryHubEntriesValue !== null) {
      return this.resolvedMasteryHubEntriesValue;
    }

    this.resolvedMasteryHubEntriesValue = this.masteryHubEntries().map((masteryHub) => {
      const hubPoint = this.masteryHubPointFor(masteryHub);

      return {
        ...masteryHub,
        x: hubPoint.x(),
        y: hubPoint.y(),
      };
    });

    return this.resolvedMasteryHubEntriesValue;
  }

  placeChildren(parentIdentifier, depthValue, parentSector, branchTheme) {
    const childIdentifiers = this.treeSnapshot.childIdentifiersOf(parentIdentifier);

    childIdentifiers.forEach((childIdentifier, childIndex) => {
      const subtreeSector = childSector(parentSector, childIdentifiers.length, childIndex);
      const childNode = this.treeSnapshot.nodes().require(childIdentifier);
      const childPosition = NodePosition.fromCenter(
        pointOnOrbit(
          centerSnapshotOf(this.centerPointValue),
          orbitRadiusFor(depthValue, this.layoutTokens),
          subtreeSector.centerAngle,
        ),
        nodeSizeFor(childNode, this.layoutTokens),
        childNode.layoutOffset(),
      );

      this.nodePositions.add(childIdentifier, childPosition);
      this.branchThemesByNodeId.set(childIdentifier.toString(), branchTheme);
      this.placeChildren(childIdentifier, depthValue + 1, subtreeSector, branchTheme);
    });
  }

  placeRoot(rootIdentifier, rootIndex) {
    const rootSector = this.rootSectors[rootIndex];
    const rootNode = this.treeSnapshot.nodes().require(rootIdentifier);
    const rootTheme = BranchTheme.fromPalette(rootIndex);
    const rootPosition = NodePosition.fromCenter(
      pointOnOrbit(
        centerSnapshotOf(this.centerPointValue),
        this.layoutTokens.rootOrbitRadius(),
        rootSector.centerAngle,
      ),
      nodeSizeFor(rootNode, this.layoutTokens),
      rootNode.layoutOffset(),
    );

    this.nodePositions.add(rootIdentifier, rootPosition);
    this.branchThemesByNodeId.set(rootIdentifier.toString(), rootTheme);
    this.placeChildren(rootIdentifier, 1, rootSector, rootTheme);
  }

  placeTree() {
    this.rootIdentifiersValue.forEach((rootIdentifier, rootIndex) => {
      this.placeRoot(rootIdentifier, rootIndex);
    });
  }

  branchThemeOf(nodeIdentifier) {
    const branchTheme = this.branchThemesByNodeId.get(nodeIdentifier.toString());

    if (!branchTheme) {
      throw new Error(
        `Tema do nó "${nodeIdentifier.toString()}" não foi calculado para o layout radial.`,
      );
    }

    return branchTheme;
  }

  masteryHubPointFor(masteryHub) {
    if (masteryHub.placementMode !== "auto") {
      return new CartesianPoint(masteryHub.x, masteryHub.y);
    }

    return autoPlacedMasteryHubPoint(
      this.centerPointValue,
      this.nodePositions.require(masteryHub.linkedRootNodeId),
      this.layoutTokens,
    );
  }

  renderedConnectionHandles() {
    return this.connectionCurves().map((curve) => curve.toHandleMarkup());
  }

  renderedNodes() {
    const renderedNodes = [];

    this.treeSnapshot.nodes().each((treeNode) => {
      const position = this.nodePositions.require(treeNode.id());

      renderedNodes.push(
        new RenderedNode(treeNode, position, this.layoutTokens, this.branchThemeOf(treeNode.id())),
      );
    });

    return renderedNodes;
  }

  stageSize() {
    return this.stageSizeValue;
  }

  subtreeMetricsOf(nodeIdentifier) {
    const nodeIdentifierKey = nodeIdentifier.toString();

    if (this.subtreeMetricsByNodeId.has(nodeIdentifierKey)) {
      return this.subtreeMetricsByNodeId.get(nodeIdentifierKey);
    }

    const treeNode = this.treeSnapshot.nodes().require(nodeIdentifier);
    const childIdentifiers = this.treeSnapshot.childIdentifiersOf(nodeIdentifier);
    const initialMetrics = {
      masteredNodeCount: Number(treeNode.status().isMastered()),
      nodeCount: 1,
    };

    const metrics = childIdentifiers.reduce((subtreeMetrics, childIdentifier) => {
      const childMetrics = this.subtreeMetricsOf(childIdentifier);

      return {
        masteredNodeCount: subtreeMetrics.masteredNodeCount + childMetrics.masteredNodeCount,
        nodeCount: subtreeMetrics.nodeCount + childMetrics.nodeCount,
      };
    }, initialMetrics);

    this.subtreeMetricsByNodeId.set(nodeIdentifierKey, metrics);

    return metrics;
  }
}

function autoPlacedMasteryHubPoint(stageCenterPoint, linkedRootPosition, layoutTokens) {
  const linkedRootCenter = linkedRootPosition.centerPoint();
  const outwardVector = outwardUnitVector(stageCenterPoint, linkedRootCenter);
  const orbitGap =
    linkedRootPosition.size() / 2 +
    layoutTokens.hubOrbitGap() +
    layoutTokens.hubOuterSize() / 2;

  return new CartesianPoint(
    linkedRootCenter.x() + outwardVector.x * orbitGap,
    linkedRootCenter.y() + outwardVector.y * orbitGap,
  );
}

function centerPointFor(stageSize) {
  return new CartesianPoint(stageSize.width() / 2, stageSize.height() / 2);
}

function centerSnapshotOf(point) {
  return { x: point.x(), y: point.y() };
}

function controlPointFor(startPoint, endPoint, connectionControlOffset) {
  const controlPoint = midpointControlPoint(startPoint, endPoint, connectionControlOffset);

  return new CartesianPoint(controlPoint.x, controlPoint.y);
}

function masteryHubsById(masteryHubs) {
  return new Map(masteryHubs.map((masteryHub) => [masteryHub.id, masteryHub]));
}

function outwardUnitVector(stageCenterPoint, targetPoint) {
  const deltaX = targetPoint.x() - stageCenterPoint.x();
  const deltaY = targetPoint.y() - stageCenterPoint.y();
  const vectorLength = Math.hypot(deltaX, deltaY);

  if (vectorLength === 0) {
    return { x: 0, y: 1 };
  }

  return {
    x: deltaX / vectorLength,
    y: deltaY / vectorLength,
  };
}
