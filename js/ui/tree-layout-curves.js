import { masteryHubControlPoint, quadraticSvgPath } from "./svg-path-geometry.js";

export class ConnectionCurve {
  constructor(childNodeId, startPoint, endPoint, controlPoint, branchTheme) {
    this.childNodeId = childNodeId;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.controlPoint = controlPoint;
    this.branchTheme = branchTheme;
  }

  path() {
    return quadraticSvgPath(this.startPoint, this.controlPoint, this.endPoint);
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
        data-connection-shadow-node-id="${this.childNodeId}"
        d="${this.path()}"
        fill="none"
        stroke="${this.branchTheme.connectionStroke()}"
        stroke-width="10"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
        opacity="0.18"
      />
      <path
        data-connection-node-id="${this.childNodeId}"
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

export class MasteryHubLinkCurve {
  constructor(masteryHubId, startPoint, endPoint, branchTheme, dataAttribute = "data-mastery-hub-link") {
    this.masteryHubId = masteryHubId;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.branchTheme = branchTheme;
    this.dataAttribute = dataAttribute;
  }

  controlPoint() {
    return masteryHubControlPoint(this.startPoint, this.endPoint);
  }

  path() {
    return quadraticSvgPath(this.startPoint, this.controlPoint(), this.endPoint);
  }

  toMarkup() {
    return `
      <path
        ${this.dataAttribute}-shadow="${this.masteryHubId}"
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
