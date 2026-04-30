import { CartesianPoint, StageSize } from "./geometry.js";
import { BranchTheme } from "./branch-theme.js";
import { HtmlText } from "./html-text.js";
import { LayoutTokens } from "./layout-tokens.js";
import { masteryHubCompletionPercentage } from "./mastery-hub-progress.js";
import { NodeVisualState } from "./node-visual-state.js";
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

      return new MasteryHubLinkCurve(
        masteryHub.id,
        hubPoint,
        rootPoint,
        branchTheme,
      );
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

export class RenderedTree {
  constructor(attributes) {
    this.attributes = attributes;
  }

  static from(treeSnapshot, layoutEngine) {
    return new RenderedTree({
      backdropMarkup: layoutEngine.backdropMarkup(),
      connectionHandles: layoutEngine.renderedConnectionHandles(),
      connections: layoutEngine.connectionCurves(),
      masteryHubConnections: layoutEngine.masteryHubConnections(),
      masteryHubSourceConnections: layoutEngine.masteryHubSourceConnections(),
      masteryHubMarkup: layoutEngine.masteryHubMarkup(),
      nodes: layoutEngine.renderedNodes(),
      stageSize: layoutEngine.stageSize(),
      treeSnapshot,
    });
  }

  connectionMarkup() {
    return this.attributes.backdropMarkup +
      this.attributes.masteryHubConnections.map((curve) => curve.toMarkup()).join("") +
      this.attributes.masteryHubSourceConnections.map((curve) => curve.toMarkup()).join("") +
      this.attributes.connections.map((curve) => curve.toMarkup()).join("");
  }

  nodeCount() {
    return this.attributes.treeSnapshot.nodeCount();
  }

  nodeMarkup() {
    return [
      this.attributes.masteryHubMarkup,
      ...this.attributes.connectionHandles,
      ...this.attributes.nodes.map((node) => node.toMarkup()),
    ].join("");
  }

  stageSize() {
    return this.attributes.stageSize;
  }
}

class ConnectionCurve {
  constructor(childNodeId, startPoint, endPoint, controlPoint, branchTheme) {
    this.childNodeId = childNodeId;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.controlPoint = controlPoint;
    this.branchTheme = branchTheme;
  }

  path() {
    return `M ${this.startPoint.x()} ${this.startPoint.y()} Q ${this.controlPoint.x()} ${this.controlPoint.y()}, ${this.endPoint.x()} ${this.endPoint.y()}`;
  }

  toHandleMarkup() {
    return `
      <button
        type="button"
        class="absolute z-[3] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border transition hover:scale-110"
        data-connection-handle="true"
        data-connection-node-id="${this.childNodeId}"
        aria-label="Curvar conexão"
        style="background:rgba(5,9,20,0.9); border-color:var(--branch-plaque-border); box-shadow:0 0 18px ${this.branchTheme.connectionGlow()}; color:${this.branchTheme.connectionStroke()}; left:${this.controlPoint.x()}px; top:${this.controlPoint.y()}px;"
      ></button>
    `;
  }

  toMarkup() {
    return `
      <path
        d="${this.path()}"
        fill="none"
        stroke="${this.branchTheme.connectionStroke()}"
        stroke-width="10"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
        opacity="0.18"
      />
      <path
        d="${this.path()}"
        fill="none"
        stroke="${this.branchTheme.connectionStroke()}"
        stroke-width="3.25"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
        opacity="0.94"
      />
    `;
  }
}

class MasteryHubLinkCurve {
  constructor(masteryHubId, startPoint, endPoint, branchTheme, dataAttribute = "data-mastery-hub-link") {
    this.masteryHubId = masteryHubId;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.branchTheme = branchTheme;
    this.dataAttribute = dataAttribute;
  }

  controlPoint() {
    return new CartesianPoint(
      (this.startPoint.x() + this.endPoint.x()) / 2,
      Math.min(this.startPoint.y(), this.endPoint.y()) - 36,
    );
  }

  path() {
    const controlPoint = this.controlPoint();

    return `M ${this.startPoint.x()} ${this.startPoint.y()} Q ${controlPoint.x()} ${controlPoint.y()}, ${this.endPoint.x()} ${this.endPoint.y()}`;
  }

  toMarkup() {
    return `
      <path
        d="${this.path()}"
        fill="none"
        stroke="${this.branchTheme.connectionStroke()}"
        stroke-width="8"
        stroke-linecap="round"
        stroke-dasharray="8 9"
        vector-effect="non-scaling-stroke"
        opacity="0.16"
      />
      <path
        d="${this.path()}"
        ${this.dataAttribute}="${this.masteryHubId}"
        fill="none"
        stroke="${this.branchTheme.connectionStroke()}"
        stroke-width="2.75"
        stroke-linecap="round"
        stroke-dasharray="8 9"
        vector-effect="non-scaling-stroke"
        opacity="0.78"
      />
    `;
  }
}

class NodePosition {
  constructor(left, top, nodeSize) {
    this.coordinates = { left, top };
    this.nodeSizeValue = nodeSize;
  }

  static fromCenter(centerSnapshot, nodeSize, layoutOffset = { x: 0, y: 0 }) {
    return new NodePosition(
      centerSnapshot.x - nodeSize / 2 + layoutOffset.x,
      centerSnapshot.y - nodeSize / 2 + layoutOffset.y,
      nodeSize,
    );
  }

  centerPoint() {
    return new CartesianPoint(this.left() + this.size() / 2, this.top() + this.size() / 2);
  }

  left() {
    return this.coordinates.left;
  }

  linkPointToward(targetPoint) {
    const centerPoint = this.centerPoint();
    const angleInRadians = Math.atan2(
      targetPoint.y() - centerPoint.y(),
      targetPoint.x() - centerPoint.x(),
    );

    return new CartesianPoint(
      centerPoint.x() + Math.cos(angleInRadians) * this.size() / 2,
      centerPoint.y() + Math.sin(angleInRadians) * this.size() / 2,
    );
  }

  size() {
    return this.nodeSizeValue;
  }

  top() {
    return this.coordinates.top;
  }
}

class NodePositionMap {
  constructor(entries) {
    this.entries = entries;
  }

  static empty() {
    return new NodePositionMap(new Map());
  }

  add(nodeIdentifier, nodePosition) {
    this.entries.set(nodeIdentifier.toString(), nodePosition);
  }

  require(nodeIdentifier) {
    const position = this.entries.get(nodeIdentifier.toString());

    if (!position) {
      throw new Error(`Posição do nó "${nodeIdentifier.toString()}" não encontrada.`);
    }

    return position;
  }
}

function masteryHubsById(masteryHubs) {
  return new Map(masteryHubs.map((masteryHub) => [masteryHub.id, masteryHub]));
}

class RenderedNode {
  constructor(treeNode, position, layoutTokens, branchTheme) {
    this.treeNode = treeNode;
    this.position = position;
    this.layoutTokens = layoutTokens;
    this.branchTheme = branchTheme;
  }

  rootBannerMarkup() {
    if (!this.treeNode.isOrigin()) {
      return "";
    }

    return `
      <div
        class="pointer-events-none absolute left-1/2 top-[-56px] -translate-x-1/2 rounded-full border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-slate-100"
        style="background:var(--branch-plaque-background); border-color:var(--branch-plaque-border); box-shadow:0 0 26px ${this.branchTheme.bannerGlow()};"
      >
        ${this.treeNode.title().toMarkup()}
      </div>
    `;
  }

  toMarkup() {
    const visualState = NodeVisualState.resolve(this.treeNode);
    const nodeSize = this.position.size();
    const coreSize = coreSizeFor(this.treeNode, this.layoutTokens);
    const statusMarkup = visualState.label().toMarkup();
    const titleMarkup = this.treeNode.title().toMarkup();
    const ariaLabel = `${this.treeNode.title().toString()} · ${visualState.label().toString()}`;

    return `
      <article
        class="group absolute z-[4] flex cursor-pointer flex-col items-center text-center text-slate-100 transition-transform duration-300 hover:-translate-y-1"
        aria-label="${ariaLabel}"
        data-node-id="${this.treeNode.id().toMarkup()}"
        data-node-kind="${this.treeNode.isOrigin() ? "origin" : "subtopic"}"
        data-node-parent-id="${this.treeNode.parentId().optionalMarkup()}"
        data-node-progress="${this.treeNode.progress().raw()}"
        data-node-source-mastery-hub-id="${this.treeNode.sourceMasteryHubId()}"
        data-node-order="${this.treeNode.orderIndexLabel()}"
        data-node-status="${this.treeNode.status().raw().toMarkup()}"
        data-node-status-label="${statusMarkup}"
        data-node-title="${titleMarkup}"
        data-node-visual-status="${visualState.key().toMarkup()}"
        data-decay-multiplier="${this.treeNode.decayMultiplierLabel()}"
        style="left:${this.position.left()}px; top:${this.position.top()}px; width:${nodeSize}px; ${this.branchTheme.cssVariables()}"
      >
        ${this.rootBannerMarkup()}
        <div
          class="relative mx-auto flex items-center justify-center"
          data-node-orb
          style="height:${nodeSize}px; width:${nodeSize}px;"
        >
          ${visualState.ringMarkup(this.treeNode.progress())}
          <div
            class="${visualState.coreClasses()}"
            style="height:${coreSize}px; width:${coreSize}px; ${visualState.coreStyle()}"
          >
            ${visualState.badgeMarkup(this.treeNode)}
          </div>
        </div>
        <button
          type="button"
          class="absolute left-1/2 top-full z-[5] mt-3 h-4 w-12 -translate-x-1/2 rounded-full border opacity-55 transition hover:scale-105 hover:opacity-100 group-hover:opacity-100"
          data-node-drag-handle="true"
          data-drag-node-id="${this.treeNode.id().toMarkup()}"
          aria-label="Mover nó"
          style="background:rgba(5,9,20,0.85); border-color:var(--branch-plaque-border); box-shadow:0 0 16px var(--branch-shadow);"
        ></button>
      </article>
    `;
  }
}

class RenderedMasteryHub {
  constructor(masteryHub, linkedRootNode, linkedRootMetrics, layoutTokens, branchTheme) {
    this.masteryHub = masteryHub;
    this.linkedRootNode = linkedRootNode;
    this.linkedRootMetrics = linkedRootMetrics;
    this.layoutTokens = layoutTokens;
    this.branchTheme = branchTheme;
  }

  completionPercentage() {
    return masteryHubCompletionPercentage(this.linkedRootMetrics);
  }

  completionRingAngle() {
    return this.completionPercentage() * 3.6;
  }

  linkedRootTitleMarkup() {
    return this.linkedRootNode.title().toMarkup();
  }

  masteryTitleMarkup() {
    return HtmlText.from(this.masteryHub.title ?? "").toMarkup();
  }

  progressRingMarkup() {
    const completionRingAngle = this.completionRingAngle();
    const isComplete = completionRingAngle >= 360;
    const ringStroke = isComplete
      ? "rgba(245,220,164,0.82)"
      : "var(--branch-accent-strong)";
    const ringShadow = isComplete
      ? "rgba(221,172,98,0.32)"
      : "var(--branch-shadow-strong)";

    return `
      <div
        class="absolute inset-[-16px] rounded-full blur-2xl"
        style="background:radial-gradient(circle, var(--branch-glow-strong) 0%, transparent 68%);"
      ></div>
      <div
        class="absolute inset-0 rounded-full"
        style="background:conic-gradient(${ringStroke} ${completionRingAngle}deg, rgba(255,255,255,0.08) ${completionRingAngle}deg 360deg); box-shadow:0 0 38px ${ringShadow};"
      ></div>
      <div
        class="absolute inset-[6px] rounded-full"
        style="background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(6,14,26,0.98) 70%);"
      ></div>
    `;
  }

  ringCaptionMarkup() {
    return `
      <p class="mt-2 font-serif text-[11px] uppercase tracking-[0.42em] text-[#d7b377]">
        Maestria
      </p>
    `;
  }

  titleCaptionMarkup() {
    if (!this.masteryHub.title) {
      return "";
    }

    return `
      <p
        class="mt-2 max-w-[8.8rem] text-center text-[12px] font-medium leading-5 tracking-[0.03em]"
        style="color:${this.branchTheme.connectionStroke()}; text-shadow:0 0 12px rgba(6,10,18,0.95);"
      >
        ${this.masteryTitleMarkup()}
      </p>
    `;
  }

  hubBadgeMarkup() {
    return `
      <div
        class="relative z-10 flex items-center justify-center rounded-full border"
        style="height:${this.layoutTokens.hubRingSize()}px; width:${this.layoutTokens.hubRingSize()}px; border-color:var(--branch-accent-strong); box-shadow:0 22px 44px var(--branch-shadow-strong); background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.24), rgba(8,16,30,0.98) 54%, rgba(3,8,18,1) 100%);"
      >
        <div class="flex flex-col items-center justify-center px-8 text-center">
          <div class="text-lg leading-none text-[#d2a85d]">✦</div>
          ${this.ringCaptionMarkup()}
          ${this.titleCaptionMarkup()}
        </div>
      </div>
    `;
  }

  toMarkup() {
    const ariaLabel = HtmlText.from(
      `Círculo de maestria de ${this.linkedRootNode.title().toString()} com ${Math.round(this.completionPercentage())}%`,
    ).toMarkup();

    return `
      <div
        class="absolute z-[2] -translate-x-1/2 -translate-y-1/2"
        aria-label="${ariaLabel}"
        data-mastery-hub="true"
        data-mastery-hub-id="${this.masteryHub.id}"
        data-mastery-placement-mode="${this.masteryHub.placementMode}"
        data-mastery-root-id="${this.masteryHub.linkedRootNodeId}"
        data-mastery-progress="${this.completionPercentage()}"
        data-mastery-title="${this.masteryTitleMarkup()}"
        style="left:${this.masteryHub.x}px; top:${this.masteryHub.y}px; ${this.branchTheme.cssVariables()}"
      >
        <div
          class="relative flex items-center justify-center"
          style="height:${this.layoutTokens.hubOuterSize()}px; width:${this.layoutTokens.hubOuterSize()}px;"
        >
          ${this.progressRingMarkup()}
          ${this.hubBadgeMarkup()}
        </div>
      </div>
    `;
  }
}

function centerPointFor(stageSize) {
  return new CartesianPoint(stageSize.width() / 2, stageSize.height() / 2);
}

function centerSnapshotOf(point) {
  return { x: point.x(), y: point.y() };
}

function controlPointFor(startPoint, endPoint, connectionControlOffset) {
  return new CartesianPoint(
    (startPoint.x() + endPoint.x()) / 2 + connectionControlOffset.x,
    (startPoint.y() + endPoint.y()) / 2 + connectionControlOffset.y,
  );
}

function coreSizeFor(treeNode, layoutTokens) {
  return treeNode.isOrigin() ? layoutTokens.rootCoreSize() : layoutTokens.coreSize();
}

function maxNodeSizeFor(layoutTokens) {
  return Math.max(layoutTokens.nodeSize(), layoutTokens.rootNodeSize());
}

function nodeSizeFor(treeNode, layoutTokens) {
  return treeNode.isOrigin() ? layoutTokens.rootNodeSize() : layoutTokens.nodeSize();
}

function orbitRadiusFor(depthValue, layoutTokens) {
  return layoutTokens.rootOrbitRadius() + depthValue * layoutTokens.depthRingGap();
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
