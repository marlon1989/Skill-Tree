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
