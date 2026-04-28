const { mkdirSync, mkdtempSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = 10000 + (process.pid % 20000);
const PROFILE_ROOT = resolve(".edge-cdp-profile");
const TARGET_URL = toFileUrl(resolve("index.html"));

mkdirSync(PROFILE_ROOT, { recursive: true });

const PROFILE_DIR = mkdtempSync(join(PROFILE_ROOT, "run-"));

async function main() {
  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    `--crash-dumps-dir=${PROFILE_DIR}`,
    "--headless=new",
    "--disable-gpu",
    "--disable-crash-reporter",
    "--allow-file-access-from-files",
    "--no-first-run",
    "--no-default-browser-check",
    TARGET_URL,
  ], {
    detached: false,
    stdio: "ignore",
  });

  try {
    const target = await waitForTarget();
    const client = await createCdpClient(target.webSocketDebuggerUrl);

    try {
      await client.send("Page.enable");
      await client.send("Runtime.enable");
      await client.send("Page.navigate", { url: TARGET_URL });
      await client.waitForEvent("Page.loadEventFired", 15000);

      const response = await client.send("Runtime.evaluate", {
        awaitPromise: true,
        expression: `(${browserSmokeTest.toString()})()`,
        returnByValue: true,
      });

      const smokeResult = response.result.value;

      await client.send("Page.reload");
      await client.waitForEvent("Page.loadEventFired", 15000);

      const persistenceResponse = await client.send("Runtime.evaluate", {
        awaitPromise: true,
        expression: `(${browserPersistenceCheck.toString()})(${JSON.stringify(smokeResult.persistence)})`,
        returnByValue: true,
      });

      console.log(JSON.stringify({
        ok: smokeResult.ok && persistenceResponse.result.value.ok,
        results: [...smokeResult.results, ...persistenceResponse.result.value.results],
      }, null, 2));
    } finally {
      client.close();
    }
  } finally {
    stopEdgeProcessTree(edgeProcess.pid, PROFILE_DIR);
  }
}

async function browserSmokeTest() {
  const results = [];

  await waitFor(() => nodeByTitle("Matemática Básica"), 5000, "Root não renderizou.");
  await waitFor(() => nodeByTitle("Soma"), 5000, "Filho 'Soma' não renderizou.");

  results.push({
    name: "render-inicial",
    passed: document.querySelectorAll("[data-node-id]").length >= 3,
    detail: { nodeCount: document.querySelectorAll("[data-node-id]").length },
  });

  hoverNode("Matemática Básica");
  await waitFor(() => hoverModalVisible(), 1500, "Hover modal não abriu.");

  results.push({
    name: "hover-modal",
    passed: hoverTitle() === "Matemática Básica" && hoverStatus() === "Inativo",
    detail: {
      hoverStatus: hoverStatus(),
      hoverTitle: hoverTitle(),
    },
  });

  clearHover();

  const rootNodeBeforeDrag = requireNode("Matemática Básica");
  const rootNodeStart = {
    left: rootNodeBeforeDrag.offsetLeft,
    top: rootNodeBeforeDrag.offsetTop,
  };

  await dragElement(rootNodeBeforeDrag.querySelector("[data-node-drag-handle]"), 36, -28);

  results.push({
    name: "node-layout-drag",
    passed:
      requireNode("Matemática Básica").offsetLeft !== rootNodeStart.left ||
      requireNode("Matemática Básica").offsetTop !== rootNodeStart.top,
    detail: {
      endLeft: requireNode("Matemática Básica").offsetLeft,
      endTop: requireNode("Matemática Básica").offsetTop,
      startLeft: rootNodeStart.left,
      startTop: rootNodeStart.top,
    },
  });

  const connectionHandleBeforeDrag = requireConnectionHandle("Soma");
  const connectionHandleStart = {
    left: numericStyleValue(connectionHandleBeforeDrag.style.left),
    top: numericStyleValue(connectionHandleBeforeDrag.style.top),
  };

  await dragElement(connectionHandleBeforeDrag, 28, -18);

  const connectionHandleAfterDrag = requireConnectionHandle("Soma");

  results.push({
    name: "connection-handle-drag",
    passed:
      numericStyleValue(connectionHandleAfterDrag.style.left) !== connectionHandleStart.left ||
      numericStyleValue(connectionHandleAfterDrag.style.top) !== connectionHandleStart.top,
    detail: {
      endLeft: numericStyleValue(connectionHandleAfterDrag.style.left),
      endTop: numericStyleValue(connectionHandleAfterDrag.style.top),
      startLeft: connectionHandleStart.left,
      startTop: connectionHandleStart.top,
    },
  });

  const rootBeforeHold = progressOf("Matemática Básica");
  await holdNode("Matemática Básica", 800);
  const rootAfterHold = progressOf("Matemática Básica");

  results.push({
    name: "root-nao-avanca-no-hold",
    passed: rootBeforeHold === 0 && rootAfterHold === 0,
    detail: { rootBeforeHold, rootAfterHold },
  });

  await holdUntilFilled("Soma", 4500);

  results.push({
    name: "filho-avanca-no-hold",
    passed: progressOf("Soma") >= 100,
    detail: {
      somaProgress: progressOf("Soma"),
      somaStatus: statusOf("Soma"),
    },
  });

  clickNode("Soma");
  await waitFor(() => document.getElementById("boss-modal").dataset.nodeId === nodeIdOf("Soma"), 2500, "Boss modal não abriu.");
  clickBossOption("4");
  document.getElementById("boss-modal-confirm").click();
  await waitFor(() => progressOf("Matemática Básica") > 0, 5000, "Root não subiu após boss.");

  results.push({
    name: "root-sobe-apos-boss",
    passed: progressOf("Matemática Básica") === 50,
    detail: {
      rootProgress: progressOf("Matemática Básica"),
      rootStatus: statusOf("Matemática Básica"),
      somaStatus: statusOf("Soma"),
    },
  });

  return {
    ok: results.every((result) => result.passed),
    persistence: {
      connectionHandleLeft: numericStyleValue(connectionHandleAfterDrag.style.left),
      connectionHandleTop: numericStyleValue(connectionHandleAfterDrag.style.top),
      rootProgress: progressOf("Matemática Básica"),
      rootStatus: statusOf("Matemática Básica"),
      rootLeft: requireNode("Matemática Básica").offsetLeft,
      rootTop: requireNode("Matemática Básica").offsetTop,
      somaStatus: statusOf("Soma"),
      storageKey: "skill-tree.state",
    },
    results,
  };

  function clickBossOption(label) {
    const button = [...document.querySelectorAll("#boss-modal-options [data-choice]")]
      .find((option) => option.textContent.trim() === label);

    if (!button) {
      throw new Error(`Opção '${label}' não encontrada.`);
    }

    button.click();
  }

  function clearHover(title = "Matemática Básica") {
    requireNode(title).dispatchEvent(pointerLikeEvent("pointerout"));
  }

  function clickNode(title) {
    requireNode(title).dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }));
  }

  async function dragElement(element, deltaX, deltaY) {
    if (!element) {
      throw new Error("Elemento de drag não encontrado.");
    }

    const bounds = element.getBoundingClientRect();
    const startX = bounds.left + bounds.width / 2;
    const startY = bounds.top + bounds.height / 2;

    element.dispatchEvent(pointerLikeEvent("pointerdown", startX, startY));
    document.dispatchEvent(pointerLikeEvent("pointermove", startX + deltaX, startY + deltaY));
    document.dispatchEvent(pointerLikeEvent("pointerup", startX + deltaX, startY + deltaY));
    await sleep(120);
  }

  function hoverNode(title) {
    requireNode(title).dispatchEvent(pointerLikeEvent("pointerover"));
    requireNode(title).dispatchEvent(pointerLikeEvent("pointermove"));
  }

  async function holdNode(title, durationMs) {
    requireNode(title).dispatchEvent(pointerLikeEvent("pointerdown"));
    await sleep(durationMs);
    document.dispatchEvent(pointerLikeEvent("pointerup"));
    await sleep(250);
  }

  async function holdUntilFilled(title, timeoutMs) {
    const startedAt = Date.now();

    requireNode(title).dispatchEvent(pointerLikeEvent("pointerdown"));

    while (Date.now() - startedAt < timeoutMs) {
      if (progressOf(title) >= 100) {
        break;
      }

      await sleep(120);
    }

    document.dispatchEvent(pointerLikeEvent("pointerup"));
    await sleep(250);

    if (progressOf(title) < 100) {
      throw new Error(`Nó '${title}' não chegou a 100 a tempo.`);
    }
  }

  function nodeByTitle(title) {
    return [...document.querySelectorAll("[data-node-id]")].find((node) => {
      return node.dataset.nodeTitle === title;
    });
  }

  function nodeIdOf(title) {
    return requireNode(title).dataset.nodeId;
  }

  function pointerLikeEvent(type, clientX = 0, clientY = 0) {
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      composed: true,
      button: 0,
      buttons: type === "pointerdown" ? 1 : 0,
      pointerId: 1,
      pointerType: "mouse",
      view: window,
    };

    if (typeof PointerEvent === "function") {
      return new PointerEvent(type, eventInit);
    }

    return new MouseEvent(type, eventInit);
  }

  function progressOf(title) {
    return Number(requireNode(title).dataset.nodeProgress);
  }

  function hoverModalVisible() {
    return !document.getElementById("node-hover-modal").classList.contains("hidden");
  }

  function numericStyleValue(value) {
    return Number.parseFloat(value || "0");
  }

  function requireConnectionHandle(title) {
    const nodeId = nodeIdOf(title);
    const handle = document.querySelector(`[data-connection-handle][data-connection-node-id="${nodeId}"]`);

    if (!handle) {
      throw new Error(`Alça da conexão de '${title}' não encontrada.`);
    }

    return handle;
  }

  function hoverStatus() {
    return document.getElementById("node-hover-modal-status").textContent.trim();
  }

  function hoverTitle() {
    return document.getElementById("node-hover-modal-title").textContent.trim();
  }

  function requireNode(title) {
    const node = nodeByTitle(title);

    if (!node) {
      throw new Error(`Nó '${title}' não encontrado.`);
    }

    return node;
  }

  function sleep(durationMs) {
    return new Promise((resolve) => window.setTimeout(resolve, durationMs));
  }

  function statusOf(title) {
    return requireNode(title).dataset.nodeStatus;
  }

  async function waitFor(predicate, timeoutMs, message) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (predicate()) {
        return;
      }

      await sleep(100);
    }

    throw new Error(message);
  }
}

async function browserPersistenceCheck(expected) {
  const results = [];

  await waitFor(() => nodeByTitle("Matemática Básica"), 5000, "Root não renderizou após reload.");
  await waitFor(() => nodeByTitle("Soma"), 5000, "Filho 'Soma' não renderizou após reload.");

  const rootNode = requireNode("Matemática Básica");
  const connectionHandle = requireConnectionHandle("Soma");
  const savedState = readState(expected.storageKey);
  const rootSnapshot = savedState.nodesById?.[rootNode.dataset.nodeId] ?? {};
  const somaSnapshot = savedState.nodesById?.[requireNode("Soma").dataset.nodeId] ?? {};

  results.push({
    name: "node-layout-persistido",
    passed: rootNode.offsetLeft === expected.rootLeft && rootNode.offsetTop === expected.rootTop,
    detail: {
      currentLeft: rootNode.offsetLeft,
      currentTop: rootNode.offsetTop,
      expectedLeft: expected.rootLeft,
      expectedTop: expected.rootTop,
      savedLayoutOffsetX: Number(rootSnapshot.layoutOffsetX ?? 0),
      savedLayoutOffsetY: Number(rootSnapshot.layoutOffsetY ?? 0),
    },
  });

  results.push({
    name: "connection-handle-persistido",
    passed:
      numericStyleValue(connectionHandle.style.left) === expected.connectionHandleLeft &&
      numericStyleValue(connectionHandle.style.top) === expected.connectionHandleTop,
    detail: {
      currentLeft: numericStyleValue(connectionHandle.style.left),
      currentTop: numericStyleValue(connectionHandle.style.top),
      expectedLeft: expected.connectionHandleLeft,
      expectedTop: expected.connectionHandleTop,
      savedConnectionOffsetX: Number(somaSnapshot.connectionControlOffsetX ?? 0),
      savedConnectionOffsetY: Number(somaSnapshot.connectionControlOffsetY ?? 0),
    },
  });

  results.push({
    name: "estado-da-arvore-persistido",
    passed:
      progressOf("Matemática Básica") === expected.rootProgress &&
      statusOf("Matemática Básica") === expected.rootStatus &&
      statusOf("Soma") === expected.somaStatus,
    detail: {
      currentRootProgress: progressOf("Matemática Básica"),
      currentRootStatus: statusOf("Matemática Básica"),
      currentSomaStatus: statusOf("Soma"),
      expectedRootProgress: expected.rootProgress,
      expectedRootStatus: expected.rootStatus,
      expectedSomaStatus: expected.somaStatus,
      savedRootProgress: Number(rootSnapshot.progress ?? 0),
      savedRootStatus: String(rootSnapshot.status ?? ""),
      savedSomaStatus: String(somaSnapshot.status ?? ""),
    },
  });

  return {
    ok: results.every((result) => result.passed),
    results,
  };

  function nodeByTitle(title) {
    return [...document.querySelectorAll("[data-node-id]")].find((node) => node.dataset.nodeTitle === title);
  }

  function numericStyleValue(value) {
    return Number.parseFloat(value || "0");
  }

  function progressOf(title) {
    return Number(requireNode(title).dataset.nodeProgress);
  }

  function readState(storageKey) {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    } catch (error) {
      void error;

      return {};
    }
  }

  function requireConnectionHandle(title) {
    const nodeId = requireNode(title).dataset.nodeId;
    const handle = document.querySelector(`[data-connection-handle][data-connection-node-id="${nodeId}"]`);

    if (!handle) {
      throw new Error(`Alça da conexão de '${title}' não encontrada após reload.`);
    }

    return handle;
  }

  function requireNode(title) {
    const node = nodeByTitle(title);

    if (!node) {
      throw new Error(`Nó '${title}' não encontrado após reload.`);
    }

    return node;
  }

  function sleep(durationMs) {
    return new Promise((resolve) => window.setTimeout(resolve, durationMs));
  }

  function statusOf(title) {
    return requireNode(title).dataset.nodeStatus;
  }

  async function waitFor(predicate, timeoutMs, message) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (predicate()) {
        return;
      }

      await sleep(100);
    }

    throw new Error(message);
  }
}

function createCdpClient(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    const pending = new Map();
    const eventListeners = new Map();
    let messageId = 0;

    socket.addEventListener("error", reject);
    socket.addEventListener("open", () => {
      resolve({
        close: () => socket.close(),
        send(method, params = {}) {
          const id = ++messageId;

          socket.send(JSON.stringify({ id, method, params }));

          return new Promise((sendResolve, sendReject) => {
            pending.set(id, { reject: sendReject, resolve: sendResolve });
          });
        },
        waitForEvent(method, timeoutMs) {
          return new Promise((eventResolve, eventReject) => {
            const timer = setTimeout(() => {
              removeListener(method, handler);
              eventReject(new Error(`Timed out waiting for ${method}.`));
            }, timeoutMs);

            const handler = (params) => {
              clearTimeout(timer);
              removeListener(method, handler);
              eventResolve(params);
            };

            addListener(method, handler);
          });
        },
      });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);

      if (payload.id) {
        const entry = pending.get(payload.id);

        if (!entry) {
          return;
        }

        pending.delete(payload.id);

        if (payload.error) {
          entry.reject(new Error(payload.error.message));
          return;
        }

        entry.resolve(payload.result);
        return;
      }

      const listeners = eventListeners.get(payload.method) ?? [];

      listeners.forEach((listener) => listener(payload.params));
    });

    function addListener(method, listener) {
      const listeners = eventListeners.get(method) ?? [];

      listeners.push(listener);
      eventListeners.set(method, listeners);
    }

    function removeListener(method, listener) {
      const listeners = eventListeners.get(method) ?? [];
      const nextListeners = listeners.filter((current) => current !== listener);

      if (nextListeners.length === 0) {
        eventListeners.delete(method);
        return;
      }

      eventListeners.set(method, nextListeners);
    }
  });
}

async function waitForTarget() {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      const pageTarget = targets.find((target) => target.type === "page");

      if (pageTarget?.webSocketDebuggerUrl) {
        return pageTarget;
      }
    } catch (error) {
      void error;
    }

    await sleep(250);
  }

  throw new Error("DevTools target not found.");
}

function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function stopEdgeProcessTree(processId, profileDir) {
  if (!processId) {
    return;
  }

  spawnSync("taskkill", ["/PID", String(processId), "/T", "/F"], {
    stdio: "ignore",
  });
  stopEdgeProfileProcesses(profileDir);
}

function stopEdgeProfileProcesses(profileDir) {
  const escapedProfileDir = String(profileDir).replace(/'/g, "''");
  const command = [
    `$profileDir='${escapedProfileDir}'; Get-CimInstance Win32_Process`,
    "Where-Object { $_.Name -like 'msedge*' -and $_.CommandLine -like \"*$profileDir*\" }",
    "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join(" | ");

  spawnSync("powershell", ["-NoProfile", "-Command", command], {
    stdio: "ignore",
  });
}

function toFileUrl(filePath) {
  return encodeURI(`file:///${filePath.replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
