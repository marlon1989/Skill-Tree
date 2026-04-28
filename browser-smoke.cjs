const { spawn } = require("node:child_process");
const { existsSync, mkdirSync, mkdtempSync } = require("node:fs");
const { createServer } = require("node:net");
const { join, resolve } = require("node:path");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFILE_ROOT = resolve(".edge-test-profile");
const SERVER_URL = "http://127.0.0.1:4173";
const TARGET_URL = `${SERVER_URL}/browser-smoke-test.html`;

async function main() {
  ensureEdgeBinaryExists();
  mkdirSync(PROFILE_ROOT, { recursive: true });

  const edgeDebugPort = await findAvailableTcpPort();
  const profileDirectory = mkdtempSync(join(PROFILE_ROOT, "run-"));
  const staticServerProcess = spawn(process.execPath, ["tmp-static-server.cjs"], {
    stdio: "ignore",
  });
  const edgeProcess = spawn(EDGE_PATH, [
    `--remote-debugging-port=${edgeDebugPort}`,
    `--user-data-dir=${profileDirectory}`,
    `--crash-dumps-dir=${profileDirectory}`,
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--no-first-run",
    "--no-default-browser-check",
    TARGET_URL,
  ], {
    stdio: "ignore",
  });

  let exitCode = 0;

  try {
    await waitForHttpPage();

    const devtoolsTarget = await waitForTarget(edgeDebugPort);
    const cdpClient = await createCdpClient(devtoolsTarget.webSocketDebuggerUrl);

    await cdpClient.send("Page.enable");
    await cdpClient.send("Runtime.enable");
    await cdpClient.send("Page.navigate", { url: TARGET_URL });
    await cdpClient.waitForEvent("Page.loadEventFired", 15_000);

    const smokeResult = await waitForSmokeResult(cdpClient, 30_000);

    exitCode = smokeResult.ok ? 0 : 1;
    process.stdout.write(`${JSON.stringify(smokeResult, null, 2)}\n`);
  } catch (error) {
    exitCode = 1;
    process.stdout.write(`${JSON.stringify({
      ok: false,
      error: String(error?.stack ?? error),
      url: TARGET_URL,
    }, null, 2)}\n`);
  }

  requestChildTermination(edgeProcess);
  requestChildTermination(staticServerProcess);
  setTimeout(() => process.exit(exitCode), 50);
}

function ensureEdgeBinaryExists() {
  if (existsSync(EDGE_PATH)) {
    return;
  }

  throw new Error(
    `Microsoft Edge não encontrado em '${EDGE_PATH}'. ` +
    "Esperado: executável padrão instalado na máquina.",
  );
}

async function waitForHttpPage() {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(TARGET_URL);

      if (response.ok) {
        return;
      }
    } catch (error) {
      void error;
    }

    await sleep(250);
  }

  throw new Error(
    `Página '${TARGET_URL}' não respondeu após 15000ms. ` +
    "Esperado: servidor HTTP local acessível.",
  );
}

async function waitForSmokeResult(cdpClient, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await cdpClient.send("Runtime.evaluate", {
      expression: `(() => ({
        title: document.title,
        text: document.getElementById("results")?.textContent ?? ""
      }))()`,
      returnByValue: true,
    });
    const currentPageState = response.result.value;

    if (currentPageState.title === "PASS" || currentPageState.title === "FAIL") {
      return {
        ok: currentPageState.title === "PASS",
        payload: safeJsonParse(currentPageState.text),
        title: currentPageState.title,
        url: TARGET_URL,
      };
    }

    await sleep(250);
  }

  throw new Error(
    `Browser smoke page não finalizou em '${TARGET_URL}' após ${timeoutMs}ms. ` +
    "Esperado: título PASS ou FAIL.",
  );
}

function safeJsonParse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    return {
      ok: false,
      parseError: String(error),
      rawText,
    };
  }
}

function createCdpClient(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    const pendingCommands = new Map();
    const listenersByMethod = new Map();
    let messageId = 0;

    socket.addEventListener("error", reject);
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const currentMessageId = ++messageId;

          socket.send(JSON.stringify({ id: currentMessageId, method, params }));

          return new Promise((sendResolve, sendReject) => {
            pendingCommands.set(currentMessageId, {
              reject: sendReject,
              resolve: sendResolve,
            });
          });
        },
        waitForEvent(method, timeoutMs) {
          return new Promise((eventResolve, eventReject) => {
            const timeoutId = setTimeout(() => {
              removeListener(method, handleEvent);
              eventReject(new Error(`Timed out waiting for '${method}' after ${timeoutMs}ms.`));
            }, timeoutMs);

            const handleEvent = (params) => {
              clearTimeout(timeoutId);
              removeListener(method, handleEvent);
              eventResolve(params);
            };

            addListener(method, handleEvent);
          });
        },
      });
    });

    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);

      if (payload.id) {
        resolvePendingCommand(payload);
        return;
      }

      notifyListeners(payload);
    });

    function resolvePendingCommand(payload) {
      const pendingCommand = pendingCommands.get(payload.id);

      if (!pendingCommand) {
        return;
      }

      pendingCommands.delete(payload.id);

      if (payload.error) {
        pendingCommand.reject(new Error(payload.error.message));
        return;
      }

      pendingCommand.resolve(payload.result);
    }

    function notifyListeners(payload) {
      const listeners = listenersByMethod.get(payload.method) ?? [];

      listeners.forEach((listener) => listener(payload.params));
    }

    function addListener(method, listener) {
      const listeners = listenersByMethod.get(method) ?? [];

      listeners.push(listener);
      listenersByMethod.set(method, listeners);
    }

    function removeListener(method, listener) {
      const listeners = listenersByMethod.get(method) ?? [];
      const nextListeners = listeners.filter((currentListener) => currentListener !== listener);

      if (nextListeners.length === 0) {
        listenersByMethod.delete(method);
        return;
      }

      listenersByMethod.set(method, nextListeners);
    }
  });
}

async function waitForTarget(edgeDebugPort) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${edgeDebugPort}/json/list`);
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

  throw new Error(
    `DevTools target não encontrado na porta ${edgeDebugPort} após 15000ms. ` +
    "Esperado: Edge exposto via CDP.",
  );
}

function requestChildTermination(childProcess) {
  if (!childProcess?.pid || childProcess.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    const taskkillProcess = spawn("taskkill", ["/PID", String(childProcess.pid), "/T", "/F"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    taskkillProcess.unref();
    return;
  }

  childProcess.kill("SIGTERM");
}

function findAvailableTcpPort() {
  return new Promise((resolve, reject) => {
    const probeServer = createServer();

    probeServer.listen(0, "127.0.0.1", () => {
      const probeAddress = probeServer.address();

      if (!probeAddress || typeof probeAddress === "string") {
        probeServer.close(() => {
          reject(new Error("Falha ao reservar porta TCP temporária. Esperado: porta numérica livre."));
        });
        return;
      }

      probeServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(probeAddress.port);
      });
    });

    probeServer.once("error", reject);
  });
}

function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

main();
