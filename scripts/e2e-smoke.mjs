import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const packageDir = process.argv[2];
if (!packageDir) {
  throw new Error("expected extracted package path");
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), "continuity-e2e-"));
const hostPluginRoot = path.join(root, "node_modules", "@cgdusek", "continuity");
await fs.mkdir(path.dirname(hostPluginRoot), { recursive: true });
await fs.cp(packageDir, hostPluginRoot, { recursive: true });

const packageJson = JSON.parse(await fs.readFile(path.join(hostPluginRoot, "package.json"), "utf8"));
const entry = packageJson.openclaw.extensions[0].replace(/^\.\//, "");
const pluginUrl = pathToFileURL(path.join(hostPluginRoot, entry)).href;
const plugin = (await import(pluginUrl)).default;

const methods = new Map();
const engines = new Map();
const hooks = new Map();
const routes = [];
const cli = [];

const stateDir = path.join(root, "state");
const workspaceDir = path.join(root, "workspace");
let config = {
  agents: {
    defaults: {
      workspace: workspaceDir,
    },
  },
  plugins: {
    slots: {
      contextEngine: "continuity",
    },
  },
};

plugin.register({
  config,
  pluginConfig: { capture: { mainDirect: "auto" } },
  runtime: {
    config: {
      loadConfig: () => config,
      writeConfigFile: async (next) => {
        config = next;
      },
    },
    state: {
      resolveStateDir: () => stateDir,
    },
  },
  logger: {
    info() {},
    warn() {},
    error() {},
  },
  registerContextEngine: (id, factory) => engines.set(id, factory),
  registerGatewayMethod: (method, handler) => methods.set(method, handler),
  registerCli: (registrar, opts) => cli.push({ registrar, opts }),
  registerHttpRoute: (params) => routes.push(params),
  on: (hookName, handler) => hooks.set(hookName, handler),
});

assert.equal(engines.has("continuity"), true);
assert.equal(methods.size, 4);
assert.equal(routes.length, 1);
assert.equal(routes[0].path, "/plugins/continuity");
assert.equal(routes[0].auth, "gateway");
assert.equal(routes[0].match, "exact");
assert.deepEqual(cli[0].opts, { commands: ["continuity"] });
assert.equal(hooks.has("before_prompt_build"), true);

const callMethod = async (name, params) => {
  const calls = [];
  await methods.get(name)({ params, respond: (...args) => calls.push(args) });
  return calls.at(-1);
};

assert.equal((await callMethod("continuity.status", { agentId: "alpha" }))[0], true);
assert.equal((await callMethod("continuity.list", { kind: "preference", limit: "5" }))[0], true);
assert.deepEqual(await callMethod("continuity.patch", { id: "cont_missing", action: "approve" }), [
  false,
  undefined,
  { code: "INVALID_REQUEST", message: "unknown continuity id: cont_missing" },
]);
assert.deepEqual(await callMethod("continuity.explain", { id: "cont_missing" }), [
  false,
  undefined,
  { code: "INVALID_REQUEST", message: "unknown continuity id: cont_missing" },
]);

const engine = engines.get("continuity")();
await engine.afterTurn({
  sessionId: "session-1",
  sessionFile: path.join(stateDir, "sessions", "session-1.jsonl"),
  messages: [
    { role: "user", content: "I prefer concise status updates." },
    { role: "assistant", content: "Understood." },
  ],
  prePromptMessageCount: 0,
  runtimeContext: {
    sessionKey: "main",
  },
});

const hookResult = await hooks.get("before_prompt_build")(
  {
    prompt: "How do I like updates?",
    messages: [{ role: "user", content: "How do I like updates?" }],
  },
  {
    agentId: "main",
    sessionKey: "discord:direct:owner",
  },
);
assert.ok(hookResult?.prependSystemContext?.includes("<continuity>"));

function makeRequest({ method, url, body }) {
  const stream = Readable.from(body ? [body] : []);
  stream.method = method;
  stream.url = url;
  stream.headers = {};
  return stream;
}

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = String(value);
    },
    end(chunk) {
      if (chunk != null) {
        this.body += String(chunk);
      }
    },
  };
}

const routeReq = makeRequest({ method: "GET", url: "/plugins/continuity" });
const routeRes = makeResponse();
const handled = await routes[0].handler(routeReq, routeRes);
assert.equal(handled, true);
assert.equal(routeRes.statusCode, 200);
assert.ok(routeRes.body.includes("Continuity Dashboard"));

const routePostReq = makeRequest({
  method: "POST",
  url: "/plugins/continuity",
  body: new URLSearchParams({ action: "slot-disable" }).toString(),
});
const routePostRes = makeResponse();
await routes[0].handler(routePostReq, routePostRes);
assert.equal(routePostRes.statusCode, 303);
assert.equal(config.plugins?.slots?.contextEngine, undefined);

await fs.rm(root, { recursive: true, force: true });
