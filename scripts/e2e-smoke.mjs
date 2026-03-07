import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const packageDir = process.argv[2];
if (!packageDir) {
  throw new Error("expected extracted package path");
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), "continuity-e2e-"));
const hostPluginRoot = path.join(root, "node_modules", "@cgdusek", "continuity");
const sdkRoot = path.join(root, "node_modules", "openclaw", "plugin-sdk");
await fs.mkdir(path.dirname(hostPluginRoot), { recursive: true });
await fs.mkdir(sdkRoot, { recursive: true });
await fs.cp(packageDir, hostPluginRoot, { recursive: true });

await fs.writeFile(
  path.join(root, "node_modules", "openclaw", "package.json"),
  JSON.stringify(
    {
      name: "openclaw",
      type: "module",
      exports: {
        "./plugin-sdk/continuity": "./plugin-sdk/continuity.js"
      }
    },
    null,
    2,
  ),
);

await fs.writeFile(
  path.join(sdkRoot, "continuity.js"),
  `export const ErrorCodes = { INVALID_REQUEST: "INVALID_REQUEST", UNAVAILABLE: "UNAVAILABLE" };
export const errorShape = (code, message) => ({ code, message });
export const resolveContinuityConfig = (config) => ({ normalized: config ?? {} });
export const createContinuityService = () => ({
  async status(agentId) { return { enabled: true, agentId }; },
  async list(params) { return [{ id: "cont_1", kind: "preference", reviewState: "approved", sourceClass: "main_direct", text: JSON.stringify(params) }]; },
  async patch(params) { return params.id === "cont_404" ? { ok: false } : { ok: true, removedId: params.id }; },
  async explain(params) { return params.id === "cont_404" ? null : { id: params.id, markdownPath: "memory/continuity/preferences.md" }; },
});
export class ContinuityContextEngine { constructor(service) { this.service = service; } }
export const registerContinuityCli = ({ program }) => { program.registered = true; };
`,
);

const packageJson = JSON.parse(await fs.readFile(path.join(hostPluginRoot, "package.json"), "utf8"));
const entry = packageJson.openclaw.extensions[0].replace(/^\.\//, "");
const pluginUrl = pathToFileURL(path.join(hostPluginRoot, entry)).href;
const plugin = (await import(pluginUrl)).default;
const methods = new Map();
const engines = new Map();
const cli = [];

plugin.register({
  config: { plugins: { slots: { contextEngine: "continuity" } } },
  pluginConfig: { capture: { mainDirect: "auto" } },
  registerContextEngine: (id, factory) => engines.set(id, factory),
  registerGatewayMethod: (method, handler) => methods.set(method, handler),
  registerCli: (registrar, opts) => cli.push({ registrar, opts })
});

assert.equal(engines.has("continuity"), true);
assert.equal(methods.size, 4);
assert.deepEqual(cli[0].opts, { commands: ["continuity"] });
const engine = engines.get("continuity")();
assert.ok(engine.service);

const callMethod = async (name, params) => {
  const calls = [];
  await methods.get(name)({ params, respond: (...args) => calls.push(args) });
  return calls.at(-1);
};

assert.deepEqual(await callMethod("continuity.status", { agentId: "alpha" }), [
  true,
  { enabled: true, agentId: "alpha" }
]);
assert.equal((await callMethod("continuity.list", { kind: "preference", limit: "5" }))[0], true);
assert.deepEqual(await callMethod("continuity.patch", { id: "cont_9", action: "remove" }), [
  true,
  { ok: true, removedId: "cont_9" }
]);
assert.deepEqual(await callMethod("continuity.patch", { id: "cont_404", action: "approve" }), [
  false,
  undefined,
  { code: "INVALID_REQUEST", message: "unknown continuity id: cont_404" }
]);
assert.deepEqual(await callMethod("continuity.explain", { id: "cont_10" }), [
  true,
  { id: "cont_10", markdownPath: "memory/continuity/preferences.md" }
]);
assert.deepEqual(await callMethod("continuity.explain", { id: "cont_404" }), [
  false,
  undefined,
  { code: "INVALID_REQUEST", message: "unknown continuity id: cont_404" }
]);

await fs.rm(root, { recursive: true, force: true });
