const LAYOUT_TOKENS = Object.freeze({
  columnGap: 236,
  controlOffset: 72,
  coreSize: 34,
  depthRingGap: 146,
  fallbackMenuHeight: 232,
  fallbackMenuWidth: 220,
  hubOuterSize: 248,
  hubOrbitGap: 96,
  hubRingSize: 188,
  menuMargin: 12,
  nodeSize: 68,
  rootCoreSize: 42,
  rootNodeSize: 84,
  rootOrbitRadius: 212,
  rowGap: 180,
  stagePaddingX: 168,
  stagePaddingY: 168,
});

export class LayoutTokens {
  constructor(values) {
    this.values = values;
  }

  static default() {
    return new LayoutTokens(LAYOUT_TOKENS);
  }

  columnGap() {
    return this.values.columnGap;
  }

  controlOffset() {
    return this.values.controlOffset;
  }

  coreSize() {
    return this.values.coreSize;
  }

  depthRingGap() {
    return this.values.depthRingGap;
  }

  fallbackMenuHeight() {
    return this.values.fallbackMenuHeight;
  }

  fallbackMenuWidth() {
    return this.values.fallbackMenuWidth;
  }

  hubOuterSize() {
    return this.values.hubOuterSize;
  }

  hubOrbitGap() {
    return this.values.hubOrbitGap;
  }

  hubRingSize() {
    return this.values.hubRingSize;
  }

  menuMargin() {
    return this.values.menuMargin;
  }

  nodeSize() {
    return this.values.nodeSize;
  }

  rootCoreSize() {
    return this.values.rootCoreSize;
  }

  rootNodeSize() {
    return this.values.rootNodeSize;
  }

  rootOrbitRadius() {
    return this.values.rootOrbitRadius;
  }

  rowGap() {
    return this.values.rowGap;
  }

  stagePaddingX() {
    return this.values.stagePaddingX;
  }

  stagePaddingY() {
    return this.values.stagePaddingY;
  }
}
