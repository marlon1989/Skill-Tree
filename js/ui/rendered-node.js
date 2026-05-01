import { NodeVisualState } from "./node-visual-state.js";
import { coreSizeFor } from "./tree-layout-sizing.js";

export class RenderedNode {
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
