import { HtmlText } from "./html-text.js";

const DORMANT_NODE_TONES = Object.freeze({
  accent: "rgba(148,163,184,0.86)",
  border: "rgba(148,163,184,0.48)",
  glow: "rgba(148,163,184,0.18)",
  progressTrack: "rgba(255,255,255,0.08)",
  shadow: "rgba(15,23,42,0.34)",
});

export class NodeVisualState {
  constructor(attributes) {
    this.attributes = attributes;
  }

  static inactive() {
    return new NodeVisualState({
      badgeMarkup: (treeNode) => nodeOrderMarkup(treeNode.orderIndexLabel(), DORMANT_NODE_TONES.accent),
      coreClasses:
        "relative z-10 flex items-center justify-center rounded-full border",
      coreStyle: dormantCoreStyle(),
      key: "inactive",
      label: "Inativo",
      ringMarkup: () => dormantRingMarkup(),
    });
  }

  static inProgress() {
    return new NodeVisualState({
      badgeMarkup: (treeNode) => nodeOrderMarkup(treeNode.orderIndexLabel(), "rgba(226,232,240,0.96)"),
      coreClasses:
        "relative z-10 flex items-center justify-center rounded-full border",
      coreStyle: dormantCoreStyle(),
      key: "in-progress",
      label: "Em Progresso",
      ringMarkup: (progressValue) => `
        <div
          class="absolute inset-[-16px] rounded-full blur-2xl"
          style="background:radial-gradient(circle, var(--branch-glow-strong) 0%, transparent 68%);"
        ></div>
        <div
          class="absolute inset-0 rounded-full"
          style="background:conic-gradient(var(--branch-accent-strong) ${progressValue.ringAngle()}deg, rgba(255,255,255,0.08) ${progressValue.ringAngle()}deg 360deg);"
        ></div>
        <div
          class="absolute inset-[4px] rounded-full"
          style="background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(6,14,26,0.98) 70%);"
        ></div>
      `,
    });
  }

  static mastered() {
    return new NodeVisualState({
      badgeMarkup: () => '<span class="text-base font-bold text-white">✓</span>',
      coreClasses:
        "relative z-10 flex items-center justify-center rounded-full border",
      coreStyle:
        "border-color:var(--branch-accent-strong); box-shadow:0 22px 48px var(--branch-shadow-strong); background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.28), rgba(8,16,30,0.98) 54%, rgba(3,8,18,1) 100%);",
      key: "mastered",
      label: "Dominado",
      ringMarkup: () => `
        <div
          class="absolute inset-[-16px] rounded-full blur-2xl"
          style="background:radial-gradient(circle, var(--branch-glow-strong) 0%, transparent 68%);"
        ></div>
        <div
          class="absolute inset-0 rounded-full border-[1.5px]"
          style="border-color:var(--branch-accent-strong); background:linear-gradient(180deg, rgba(255,255,255,0.16), rgba(5,10,20,0.12));"
        ></div>
        <div
          class="absolute inset-[4px] rounded-full"
          style="background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), var(--branch-glow) 70%);"
        ></div>
      `,
    });
  }

  static pendingMastery() {
    return new NodeVisualState({
      badgeMarkup: () => `
        <div class="flex items-center justify-center text-base font-black leading-none text-white">
          !
        </div>
      `,
      coreClasses:
        "relative z-10 flex items-center justify-center rounded-full border",
      coreStyle: dormantCoreStyle(),
      key: "pending-mastery",
      label: "Mestria Pendente",
      ringMarkup: () => `
        <div
          class="absolute inset-[-16px] rounded-full blur-2xl"
          style="background:radial-gradient(circle, rgba(255,191,90,0.34) 0%, transparent 68%);"
        ></div>
        <div
          class="absolute inset-0 rounded-full border-[1.5px]"
          style="border-color:rgba(255,216,151,0.82); background:linear-gradient(180deg, rgba(255,240,198,0.12), rgba(158,92,20,0.12));"
        ></div>
        <div
          class="absolute inset-[4px] rounded-full"
          style="background:radial-gradient(circle at 30% 30%, rgba(255,242,213,0.12), rgba(118,70,23,0.16) 70%);"
        ></div>
      `,
    });
  }

  static resolve(treeNode) {
    if (treeNode.status().isMastered()) {
      return NodeVisualState.mastered();
    }

    if (treeNode.progress().isComplete()) {
      return NodeVisualState.pendingMastery();
    }

    if (treeNode.progress().isStarted()) {
      return NodeVisualState.inProgress();
    }

    return NodeVisualState.inactive();
  }

  badgeMarkup(treeNode) {
    return this.attributes.badgeMarkup(treeNode);
  }

  coreClasses() {
    return this.attributes.coreClasses;
  }

  coreStyle() {
    return this.attributes.coreStyle;
  }

  key() {
    return HtmlText.from(this.attributes.key);
  }

  label() {
    return HtmlText.from(this.attributes.label);
  }

  ringMarkup(progressValue) {
    return this.attributes.ringMarkup(progressValue);
  }
}

function dormantCoreStyle() {
  return [
    `border-color:${DORMANT_NODE_TONES.border}`,
    `box-shadow:0 18px 40px ${DORMANT_NODE_TONES.shadow}`,
    "background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), rgba(31,41,55,0.96) 58%, rgba(15,23,42,1) 100%)",
  ].join("; ");
}

function dormantRingMarkup() {
  return `
    <div
      class="absolute inset-[-12px] rounded-full blur-2xl"
      style="background:radial-gradient(circle, ${DORMANT_NODE_TONES.glow} 0%, transparent 68%);"
    ></div>
    <div
      class="absolute inset-0 rounded-full border-[1.5px]"
      style="border-color:${DORMANT_NODE_TONES.border}; background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(15,23,42,0.22));"
    ></div>
    <div
      class="absolute inset-[4px] rounded-full"
      style="background:radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(15,23,42,0.94) 72%);"
    ></div>
  `;
}

function nodeOrderMarkup(orderLabel, textColor) {
  const safeOrderLabel = HtmlText.from(orderLabel).toMarkup();

  return `
    <div class="flex items-center justify-center">
      <div
        class="text-sm font-bold tracking-[0.08em]"
        style="color:${textColor}; text-shadow:0 0 12px rgba(255,255,255,0.16);"
      >
        ${safeOrderLabel}
      </div>
    </div>
  `;
}
