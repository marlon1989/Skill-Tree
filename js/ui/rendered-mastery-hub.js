import { HtmlText } from "./html-text.js";
import { masteryHubCompletionPercentage } from "./mastery-hub-progress.js";

export class RenderedMasteryHub {
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
