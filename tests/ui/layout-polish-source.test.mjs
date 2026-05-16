import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const INDEX_HTML = readFileSync("index.html", "utf8");
const PROGRESS_ANIMATION_SOURCE = readFileSync("js/interaction/origin-progress-animation.js", "utf8");

test("layout includes discoverable canvas action bar controls", () => {
  assert.match(INDEX_HTML, /id="canvas-action-bar"/);
  assert.match(INDEX_HTML, /data-canvas-tool="create-root"/);
  assert.match(INDEX_HTML, /data-canvas-tool="fit-view"/);
  assert.match(INDEX_HTML, /data-canvas-tool="zoom-in"/);
  assert.match(INDEX_HTML, /data-canvas-tool="zoom-out"/);
});

test("layout gates hover motion and supports reduced motion", () => {
  assert.match(INDEX_HTML, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(INDEX_HTML, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(PROGRESS_ANIMATION_SOURCE, /prefers-reduced-motion: reduce/);
});

test("context and modal surfaces stay inside dark theme", () => {
  assert.doesNotMatch(INDEX_HTML, /id="context-menu"[\s\S]*?bg-white\/95/);
  assert.doesNotMatch(INDEX_HTML, /id="boss-modal"[\s\S]*?bg-white p-6/);
  assert.match(INDEX_HTML, /id="context-menu"[\s\S]*?bg-slate-950\/95/);
  assert.match(INDEX_HTML, /id="boss-modal"[\s\S]*?bg-slate-950\/95/);
});
