import { DomElement } from "./dom-element.js";
import { HtmlText } from "./html-text.js";

const DEFAULT_ALERT_TITLE = "Aviso.";
let activeDialogResolver = null;

/**
 * Show themed feedback without the browser alert chrome.
 * Example:
 *   showThemeAlert("Selecione uma resposta.")
 */
export function showThemeAlert(message, title = DEFAULT_ALERT_TITLE) {
  const alertElement = captureThemeAlert();

  prepareThemeDialog(alertElement, { message, primaryLabel: "Entendi", title });
  alertElement.primary.element.onclick = () => hideThemeAlert();
}

/**
 * Hide themed feedback panel.
 * Example:
 *   hideThemeAlert()
 */
export function hideThemeAlert() {
  const alertElement = captureThemeAlert();

  resolveActiveDialog(null);
  alertElement.panel.addClass("hidden");
  alertElement.panel.removeClass("flex");
  alertElement.panel.setAriaHidden(true);
}

/**
 * Ask for a short text value using themed UI.
 * Example:
 *   await requestThemeText("Novo título:", "Tópico")
 */
export function requestThemeText(message, suggestedValue = "", title = "Editar") {
  return new Promise((resolve) => {
    const alertElement = captureThemeAlert();

    prepareThemeDialog(alertElement, { message, primaryLabel: "Confirmar", title });
    activeDialogResolver = resolve;
    showTextInput(alertElement, suggestedValue);
    alertElement.cancel.removeClass("hidden");
    alertElement.primary.element.onclick = () => resolveThemeDialog(alertElement.input.element.value);
    alertElement.cancel.element.onclick = () => resolveThemeDialog(null);
    alertElement.input.element.onkeydown = (event) => {
      if (event.key === "Enter") {
        resolveThemeDialog(alertElement.input.element.value);
      }
    };
    alertElement.input.element.focus();
    alertElement.input.element.select();
  });
}

/**
 * Ask for explicit confirmation using themed UI.
 * Example:
 *   await confirmThemeAction("Deletar item?")
 */
export function confirmThemeAction(message, title = "Confirmar") {
  return new Promise((resolve) => {
    const alertElement = captureThemeAlert();

    prepareThemeDialog(alertElement, { message, primaryLabel: "Confirmar", title });
    activeDialogResolver = resolve;
    alertElement.cancel.removeClass("hidden");
    alertElement.primary.element.onclick = () => resolveThemeDialog(true);
    alertElement.cancel.element.onclick = () => resolveThemeDialog(false);
  });
}

/**
 * Build safe alert markup for tests and future rendered messages.
 * Example:
 *   themeAlertText("<x>").toMarkup() === "&lt;x&gt;"
 */
export function themeAlertText(value) {
  return HtmlText.from(value);
}

function captureThemeAlert() {
  return {
    body: DomElement.require("theme-alert-body"),
    cancel: DomElement.require("theme-alert-cancel"),
    input: DomElement.require("theme-alert-input"),
    panel: DomElement.require("theme-alert"),
    primary: DomElement.require("theme-alert-close"),
    title: DomElement.require("theme-alert-title"),
  };
}

function prepareThemeDialog(alertElement, { message, primaryLabel, title }) {
  resolveActiveDialog(null);
  alertElement.title.setText(title);
  alertElement.body.setText(message);
  alertElement.primary.setText(primaryLabel);
  alertElement.cancel.addClass("hidden");
  alertElement.input.addClass("hidden");
  alertElement.input.element.value = "";
  alertElement.input.element.onkeydown = null;
  alertElement.cancel.element.onclick = null;
  alertElement.primary.element.onclick = null;
  alertElement.panel.removeClass("hidden");
  alertElement.panel.addClass("flex");
  alertElement.panel.setAriaHidden(false);
}

function showTextInput(alertElement, suggestedValue) {
  alertElement.input.removeClass("hidden");
  alertElement.input.element.value = String(suggestedValue ?? "");
}

function resolveThemeDialog(value) {
  resolveActiveDialog(value);
  const alertElement = captureThemeAlert();

  alertElement.panel.addClass("hidden");
  alertElement.panel.removeClass("flex");
  alertElement.panel.setAriaHidden(true);
}

function resolveActiveDialog(value) {
  if (!activeDialogResolver) {
    return;
  }

  const resolver = activeDialogResolver;

  activeDialogResolver = null;
  resolver(value);
}
