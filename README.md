# Skill Tree

Skill Tree is an experimental web app for organizing study paths as a visual tree of origin nodes, subtopics, and mastery circles. It runs in the browser with JavaScript modules, stores state in `localStorage`, and uses a themed interface inspired by skill progression systems.

## Features

- Create origin nodes and subtopics through the context menu.
- Create origin nodes from the canvas action bar without opening the context menu.
- Link mastery circles to independent branches.
- Calculate origin progress from completed subtopics.
- Prevent origin nodes from progressing through direct mouse interaction.
- Reset progress by branch while preserving child origin branches.
- Move nodes, connection handles, and mastery circles visually.
- Use themed dark panels for alerts, confirmations, text input, and boss questions.
- Fit the initial tree into the viewport, including narrow mobile screens.
- Navigate the canvas with toolbar zoom controls, wheel zoom, and middle-button pan.
- Keep node labels visible and keyboard-focusable for better orientation.
- Respect reduced-motion preferences for progression effects.
- Keep drag interactions responsive with frame-scheduled rendering and deferred persistence.
- Run unit tests and browser smoke tests with Microsoft Edge.

## Requirements

- Node.js 20 or newer.
- Microsoft Edge installed in the default Windows path to run the browser smoke test.

The project currently does not require external dependencies through `npm install`. Tailwind and fonts are loaded from CDNs in `index.html`.

## Running Locally

Start the local static server:

```powershell
npm run serve:static
```

Then open:

```text
http://127.0.0.1:4173
```

Opening `index.html` directly in the browser can work, but the static server is the recommended flow because it matches the module and asset behavior used by the tests.

## Tests

Run the unit tests:

```powershell
npm test
```

The unit test suite also includes a large-tree performance smoke test that renders 500 nodes and fails if layout/render generation exceeds the configured budget.

Run the browser smoke test:

```powershell
npm run test:browser
```

Run the Edge DevTools Protocol smoke test:

```powershell
npm run test:smoke
```

Run the full configured test suite:

```powershell
npm run test:all
```

Note: `npm run test:smoke` uses Edge DevTools Protocol automation and expects Microsoft Edge at the default path:

```text
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

## Performance Notes

The tree renderer is optimized for interactive editing without introducing a build step or framework runtime:

- Drag updates are scheduled with `requestAnimationFrame` instead of rendering on every raw pointer event.
- Node, connection handle, and mastery circle movement update visible positions immediately.
- Drag persistence is deferred until the drag ends, avoiding repeated synchronous `localStorage` writes.
- Node layout updates synchronize only the changed node snapshot where possible.
- Tree layout caches subtree metrics and uses constant-time node lookup inside render snapshots.

For structural changes, such as creating or deleting nodes, the app still performs a full tree render. This keeps the data flow simple while reserving the lighter path for frequent pointer interactions.

## Project Structure

```text
assets/
  icons/              Visual icons and cursors.
  sfx/                Sound effects.
js/
  browser-smoke/      Shared helpers and flows for browser smoke tests.
  domain/             Tree business rules.
  interaction/        Mouse, camera, context menu, and progress controls.
  ui/                 Rendering, layout, modal, visual components, and SVG geometry.
tests/
  domain/             Domain rule tests.
  interaction/        Interaction and progression rule tests.
  ui/                 Layout, SVG geometry, and visual state tests.
```

## Rendering Modules

`js/ui/tree-layout.js` is a small compatibility facade. The radial layout work is split across focused modules:

- `tree-layout-engine.js` places roots, children, mastery hubs, and connections.
- `tree-layout-curves.js` renders SVG connection curves and drag handles.
- `rendered-node.js`, `rendered-mastery-hub.js`, and `rendered-tree.js` generate markup.
- `tree-layout-position.js` and `tree-layout-sizing.js` hold layout primitives.
- `svg-path-geometry.js` shares curve math between rendering and drag updates.

## Usage Flow

Use the bottom canvas toolbar to create an origin node at the current viewport center, recenter the tree, or adjust zoom. You can still use the canvas context menu to create an origin node at a specific point.

From a node, create subtopics or a new child origin when you want to start a separate branch. When subtopics are completed, origin progress is recalculated automatically.

A mastery circle appears when an origin has subtopics. It can create a new independent origin, producing a new branch that is visually connected to the mastery circle that created it.

Middle-click and drag to pan the canvas. Use the mouse wheel or toolbar controls to zoom. Node captions remain visible while hover previews provide status details on pointer devices.

## Interface Notes

The interface uses a dark skill-tree theme with branch-colored accents. Context menus, confirmation dialogs, and boss prompts share the same dark surface language so overlays stay visually connected to the canvas.

The first render fits the tree into the current viewport instead of assuming a desktop-sized canvas. This keeps the initial branch visible on mobile while preserving the full-size layout for desktop. Frequent hover motion is limited to precise pointer devices, and users with reduced-motion preferences skip progression animations.

## Scripts

| Command | Description |
| --- | --- |
| `npm run serve:static` | Serves the app at `http://127.0.0.1:4173`. |
| `npm test` | Runs unit tests with `node --test`. |
| `npm run test:browser` | Runs the main browser smoke test. |
| `npm run test:smoke` | Runs the Edge DevTools Protocol smoke test. |
| `npm run test:all` | Runs unit tests, browser smoke tests, and Edge smoke tests. |

## Persistence

The tree state is saved in browser `localStorage` with the key `skill-tree.state`. To clear local data, remove the site's storage in the browser or delete that key manually in the developer tools.
