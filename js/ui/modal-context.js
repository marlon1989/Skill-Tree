import { DomElement } from "./dom-element.js";
import { HtmlText } from "./html-text.js";
import { NodeIdentifier } from "./node-identifier.js";

const BOSS_MODAL_CONTENT = Object.freeze({
  options: ["14", "15", "16"],
  question: "Qual é o resultado de 7 + 8?",
  subtitle: "Responda corretamente para consolidar o domínio deste tópico.",
  title: "Prova de Mestre",
});

export class ApplicationDom {
  constructor(dependencies) {
    this.dependencies = dependencies;
  }

  static capture() {
    return new ApplicationDom({
      bossModal: new BossModalElement({
        modal: DomElement.require("boss-modal"),
        options: DomElement.require("boss-modal-options"),
        questionPanel: DomElement.require("boss-modal-question-panel"),
        question: DomElement.require("boss-modal-question"),
        subtitle: DomElement.require("boss-modal-subtitle"),
        title: DomElement.require("boss-modal-title"),
      }),
      canvas: DomElement.require("skill-tree-canvas"),
      connectionsLayer: DomElement.require("tree-connections"),
      contextMenu: new ContextMenuElement(DomElement.require("context-menu")),
      hoverModal: new HoverModalElement({
        modal: DomElement.require("node-hover-modal"),
        status: DomElement.require("node-hover-modal-status"),
        title: DomElement.require("node-hover-modal-title"),
      }),
      nodeLayer: DomElement.require("tree-node-layer"),
      stage: DomElement.require("tree-stage"),
    });
  }

  bossModal() {
    return this.dependencies.bossModal;
  }

  contextMenu() {
    return this.dependencies.contextMenu;
  }

  hoverModal() {
    return this.dependencies.hoverModal;
  }

  render(renderedTree) {
    this.dependencies.stage.sizeTo(renderedTree.stageSize());
    this.dependencies.connectionsLayer.setHtml("");
    this.dependencies.nodeLayer.setHtml("");
    this.dependencies.connectionsLayer.setViewBox(renderedTree.stageSize());
    this.dependencies.connectionsLayer.setHtml(renderedTree.connectionMarkup());
    this.dependencies.nodeLayer.setHtml(renderedTree.nodeMarkup());
    this.dependencies.canvas.setDataAttribute("renderedNodes", renderedTree.nodeCount());
  }
}

export class BossModalContent {
  constructor(attributes) {
    this.attributes = attributes;
  }

  static default() {
    return new BossModalContent(BOSS_MODAL_CONTENT);
  }

  static from(input) {
    if (!input) {
      return BossModalContent.default();
    }

    return new BossModalContent({
      ...BOSS_MODAL_CONTENT,
      ...input,
    });
  }

  forNode(nodeIdentifier) {
    if (nodeIdentifier.isEmpty()) {
      return this;
    }

    if (this.usesCustomTitle()) {
      return this;
    }

    return new BossModalContent({
      ...this.attributes,
      title: `${this.attributes.title} · ${nodeIdentifier.toString()}`,
    });
  }

  optionMarkup() {
    return this.attributes.options
      .map((option, index) => new BossOption(option, index).toMarkup())
      .join("");
  }

  hasOptions() {
    return this.attributes.options.length > 0;
  }

  question() {
    return this.attributes.question;
  }

  subtitle() {
    return this.attributes.subtitle;
  }

  title() {
    return this.attributes.title;
  }

  usesCustomTitle() {
    return this.attributes.title !== BOSS_MODAL_CONTENT.title;
  }
}

class BossModalElement {
  constructor(elements) {
    this.elements = elements;
  }

  hide() {
    this.elements.modal.addClass("hidden");
    this.elements.modal.removeClass("flex");
    this.elements.modal.setAriaHidden(true);
    this.clearSelection();
  }

  show(content, nodeIdentifier) {
    this.elements.title.setText(content.title());
    this.elements.subtitle.setText(content.subtitle());
    this.elements.question.setText(content.question());
    this.elements.options.setHtml(content.optionMarkup());
    this.toggleQuestionPanel(content.hasOptions());
    this.elements.modal.setDataAttribute("nodeId", nodeIdentifier.toString());
    this.elements.modal.setDataAttribute("selectedChoice", "");
    this.elements.modal.removeClass("hidden");
    this.elements.modal.addClass("flex");
    this.elements.modal.setAriaHidden(false);
  }

  clearSelection() {
    this.elements.modal.setDataAttribute("nodeId", "");
    this.elements.modal.setDataAttribute("selectedChoice", "");
  }

  toggleQuestionPanel(hasOptions) {
    this.elements.questionPanel.element.classList.toggle("hidden", !hasOptions);
  }
}

class BossOption {
  constructor(label, index) {
    this.label = label;
    this.index = index;
  }

  toMarkup() {
    return `
      <button
        type="button"
        class="boss-option rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
        data-choice="${this.index}"
      >
        ${this.safeLabel()}
      </button>
    `;
  }

  safeLabel() {
    return HtmlText.from(this.label).toMarkup();
  }
}

class ContextMenuElement {
  constructor(element) {
    this.element = element;
  }

  hide() {
    this.element.addClass("hidden");
    this.element.setAriaHidden(true);
    this.element.setDataAttribute("masteryHubId", "");
    this.element.setDataAttribute("nodeId", "");
  }

  showAt(menuPosition, nodeIdentifier, masteryHubId = "", isRootNode = false, canvasPoint = null) {
    const boundedPosition = menuPosition.boundTo(this.element.measure());
    const stagePoint = canvasPoint ?? { x: 0, y: 0 };
    const hasNodeSelection = !nodeIdentifier.isEmpty();
    const hasMasteryHubSelection = Boolean(masteryHubId);
    const hasSelection = hasNodeSelection || hasMasteryHubSelection;
    const hasSubtopicSelection = hasNodeSelection && !isRootNode;

    this.element.setLeft(boundedPosition.left());
    this.element.setTop(boundedPosition.top());
    this.element.setDataAttribute("masteryHubId", masteryHubId);
    this.element.setDataAttribute("nodeId", nodeIdentifier.toString());
    this.element.setDataAttribute("canvasX", stagePoint.x);
    this.element.setDataAttribute("canvasY", stagePoint.y);
    this.setRootMode(isRootNode);
    this.toggleEmptyCanvasOnlyActions(hasSelection);
    this.toggleMasteryHubOnlyActions(hasMasteryHubSelection);
    this.toggleNodeOnlyActions(hasNodeSelection);
    this.toggleSubtopicOnlyActions(hasSubtopicSelection);
    this.toggleRootOnlyActions(isRootNode);
    this.element.removeClass("hidden");
    this.element.setAriaHidden(false);
  }

  setRootMode(isRootNode) {
    this.element.setDataAttribute("isRootNode", isRootNode);
  }

  toggleRootOnlyActions(isRootNode) {
    this.element.element.querySelectorAll("[data-root-only-action]").forEach((actionButton) => {
      actionButton.classList.toggle("hidden", !isRootNode);
      actionButton.classList.toggle("flex", isRootNode);
    });
  }

  toggleEmptyCanvasOnlyActions(hasNodeSelection) {
    this.element.element.querySelectorAll("[data-empty-canvas-action]").forEach((actionButton) => {
      actionButton.classList.toggle("hidden", hasNodeSelection);
      actionButton.classList.toggle("flex", !hasNodeSelection);
    });
  }

  toggleMasteryHubOnlyActions(hasMasteryHubSelection) {
    this.element.element.querySelectorAll("[data-mastery-hub-only-action]").forEach((actionButton) => {
      actionButton.classList.toggle("hidden", !hasMasteryHubSelection);
      actionButton.classList.toggle("flex", hasMasteryHubSelection);
    });
  }

  toggleNodeOnlyActions(hasNodeSelection) {
    this.element.element.querySelectorAll("[data-node-only-action]").forEach((actionButton) => {
      actionButton.classList.toggle("hidden", !hasNodeSelection);
      actionButton.classList.toggle("flex", hasNodeSelection);
    });
  }

  toggleSubtopicOnlyActions(hasSubtopicSelection) {
    this.element.element.querySelectorAll("[data-subtopic-only-action]").forEach((actionButton) => {
      actionButton.classList.toggle("hidden", !hasSubtopicSelection);
      actionButton.classList.toggle("flex", hasSubtopicSelection);
    });
  }
}

class HoverModalElement {
  constructor(elements) {
    this.elements = elements;
  }

  hide() {
    this.elements.modal.addClass("hidden");
    this.elements.modal.setAriaHidden(true);
  }

  showAt(menuPosition, content) {
    this.elements.title.setText(content.title);
    this.elements.status.setText(content.status);
    this.elements.modal.removeClass("hidden");
    this.elements.modal.setAriaHidden(false);

    const boundedPosition = menuPosition.boundTo(this.elements.modal.measure());

    this.elements.modal.setLeft(boundedPosition.left());
    this.elements.modal.setTop(boundedPosition.top());
  }
}
