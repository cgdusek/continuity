import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { Command } from "commander";

const packageDir = process.argv[2];
if (!packageDir) {
  throw new Error("expected extracted package path");
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), "continuity-e2e-"));
const hostPluginRoot = path.join(root, "node_modules", "@cgdusek", "continuity");
await fs.mkdir(path.dirname(hostPluginRoot), { recursive: true });
await fs.cp(packageDir, hostPluginRoot, { recursive: true });

const packageJson = JSON.parse(await fs.readFile(path.join(hostPluginRoot, "package.json"), "utf8"));
const pluginManifest = JSON.parse(
  await fs.readFile(path.join(hostPluginRoot, "openclaw.plugin.json"), "utf8"),
);
assert.equal(pluginManifest.id, "continuity");
assert.equal(pluginManifest.kind, "context-engine");
assert.ok(packageJson.files.includes("dist/"));
assert.ok(packageJson.files.includes("openclaw.plugin.json"));
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
assert.equal(methods.size, 6);
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

const runCli = async (argv) => {
  const program = new Command();
  program.exitOverride();
  cli[0].registrar({ program });

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    await program.parseAsync(argv, { from: "user" });
  } finally {
    console.log = originalLog;
  }

  return logs;
};

assert.equal((await callMethod("continuity.status", { agentId: "alpha" }))[0], true);
assert.equal((await callMethod("continuity.list", { kind: "preference", limit: "5" }))[0], true);
assert.equal((await callMethod("continuity.subjects", { limit: "5" }))[0], true);
assert.equal((await callMethod("continuity.recent", { subjectId: "owner", limit: "5" }))[0], true);
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

await engine.afterTurn({
  sessionId: "session-2",
  sessionFile: path.join(stateDir, "sessions", "session-2.jsonl"),
  messages: [
    { role: "user", content: "Remember this: my timezone is America/Chicago." },
    { role: "assistant", content: "I will remember that." },
  ],
  prePromptMessageCount: 0,
  runtimeContext: {
    sessionKey: "telegram:direct:alice",
  },
});

const pendingList = await callMethod("continuity.list", {
  state: "pending",
  kind: "fact",
  sourceClass: "paired_direct",
});
assert.equal(pendingList[0], true);
assert.equal(pendingList[1].length, 1);
const pendingRecord = pendingList[1][0];

const cliStatusOutput = await runCli(["continuity", "status", "--json"]);
assert.equal(JSON.parse(cliStatusOutput.at(-1)).enabled, true);

const cliReviewOutput = await runCli(["continuity", "review", "--state", "pending", "--json"]);
assert.ok(JSON.parse(cliReviewOutput.at(-1)).some((record) => record.id === pendingRecord.id));

let hookResult = await hooks.get("before_prompt_build")(
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
assert.ok(hookResult?.prependSystemContext?.includes("Preference: I prefer concise status updates."));
assert.ok(!hookResult?.prependSystemContext?.includes("America/Chicago"));

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
assert.ok(routeRes.body.includes(pendingRecord.id));

const saveConfigReq = makeRequest({
  method: "POST",
  url: "/plugins/continuity",
  body: new URLSearchParams({
    action: "save-config",
    captureMainDirect: "review",
    capturePairedDirect: "auto",
    captureGroup: "off",
    captureChannel: "off",
    captureMinConfidence: "0.61",
    reviewAutoApproveMain: "false",
    reviewRequireSource: "false",
    recallMaxItems: "6",
    recallIncludeOpenLoops: "false",
  }).toString(),
});
const saveConfigRes = makeResponse();
await routes[0].handler(saveConfigReq, saveConfigRes);
assert.equal(saveConfigRes.statusCode, 303);
assert.deepEqual(config.plugins?.entries?.continuity?.config, {
  capture: {
    mainDirect: "review",
    pairedDirect: "auto",
    group: "off",
    channel: "off",
    minConfidence: 0.61,
  },
  review: {
    autoApproveMain: false,
    requireSource: false,
  },
  identity: {
    mode: "off",
    defaultDirectSubjectId: "owner",
    bindings: [],
  },
  recent: {
    enabled: false,
    maxExcerpts: 6,
    maxChars: 1200,
    ttlHours: 24,
  },
  recall: {
    maxItems: 6,
    includeOpenLoops: false,
    scope: {
      default: "deny",
      rules: [{ action: "allow", match: { chatType: "direct" } }],
    },
  },
});

const approveReq = makeRequest({
  method: "POST",
  url: "/plugins/continuity",
  body: new URLSearchParams({ action: "approve", id: pendingRecord.id }).toString(),
});
const approveRes = makeResponse();
await routes[0].handler(approveReq, approveRes);
assert.equal(approveRes.statusCode, 303);

const explainApproved = await callMethod("continuity.explain", { id: pendingRecord.id });
assert.equal(explainApproved[0], true);
assert.equal(explainApproved[1].markdownPath, "memory/continuity/facts.md");

const factsPath = path.join(workspaceDir, "memory", "continuity", "facts.md");
const factsMarkdown = await fs.readFile(factsPath, "utf8");
assert.ok(factsMarkdown.includes("America/Chicago"));

hookResult = await hooks.get("before_prompt_build")(
  {
    prompt: "What is my timezone again?",
    messages: [{ role: "user", content: "What is my timezone again?" }],
  },
  {
    agentId: "main",
    sessionKey: "discord:direct:owner",
  },
);
assert.ok(hookResult?.prependSystemContext?.includes("America/Chicago"));

const removeResult = await callMethod("continuity.patch", {
  id: pendingRecord.id,
  action: "remove",
});
assert.deepEqual(removeResult, [true, { ok: true, removedId: pendingRecord.id }]);
assert.ok(!(await fs.readFile(factsPath, "utf8")).includes("America/Chicago"));

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
