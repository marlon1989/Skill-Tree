import test from "node:test";
import assert from "node:assert/strict";

import { BossModalContent } from "../../js/ui/modal-context.js";

test("BossModalContent renders themed dark option buttons", () => {
  const markup = BossModalContent.from({
    options: ["A", "B"],
    question: "Escolha",
    subtitle: "Teste",
    title: "Prova",
  }).optionMarkup();

  assert.match(markup, /boss-option/);
  assert.match(markup, /bg-slate-950\/70/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.doesNotMatch(markup, /bg-white/);
  assert.doesNotMatch(markup, /hover:bg-blue-50/);
});
