import type { IncomingMessage, ServerResponse } from "node:http";
import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createContinuityServiceMock } = vi.hoisted(() => ({
  createContinuityServiceMock: vi.fn(),
}));
vi.mock("./continuity/service.js", () => ({
  createContinuityService: createContinuityServiceMock,
}));

import plugin from "./index.js";

type MockService = {
  status: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  subjects: ReturnType<typeof vi.fn>;
  recent: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  explain: ReturnType<typeof vi.fn>;
  buildSystemPromptAddition: ReturnType<typeof vi.fn>;
  captureTurn: ReturnType<typeof vi.fn>;
};

function makeService(): MockService {
  return {
    status: vi.fn(),
    list: vi.fn(),
    subjects: vi.fn(),
    recent: vi.fn(),
    patch: vi.fn(),
    explain: vi.fn(),
    buildSystemPromptAddition: vi.fn(),
    captureTurn: vi.fn(),
  };
}

function createApi(options?: { slotSelected?: boolean }) {
  const contextEngines = new Map<string, () => unknown>();
  const methods = new Map<
    string,
    (options: { params: Record<string, unknown>; respond: (...args: unknown[]) => void }) =>
      | Promise<void>
      | void
  >();
  const hooks = new Map<string, (event: unknown, ctx: unknown) => Promise<unknown> | unknown>();
  const routes: Array<{
    path: string;
    auth: "gateway" | "plugin";
    match?: "exact" | "prefix";
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void> | boolean | void;
  }> = [];
  const cli: Array<{
    registrar: (ctx: { program: unknown }) => void;
    opts?: { commands?: string[] };
  }> = [];

  let config = {
    plugins: options?.slotSelected
      ? {
          slots: {
            contextEngine: "continuity",
          },
        }
      : {},
  };

  return {
    api: {
      config,
      pluginConfig: { capture: { mainDirect: "auto" } },
      runtime: {
        config: {
          loadConfig: () => config,
          writeConfigFile: async (next: typeof config) => {
            config = next;
          },
        },
        state: {
          resolveStateDir: () => "/tmp/continuity-test-state",
        },
      },
      logger: {
        info() {},
        warn() {},
        error() {},
      },
      registerContextEngine: (id: string, factory: () => unknown) => contextEngines.set(id, factory),
      registerGatewayMethod: (
        method: string,
        handler: (options: { params: Record<string, unknown>; respond: (...args: unknown[]) => void }) => Promise<void> | void,
      ) => methods.set(method, handler),
      registerCli: (
        registrar: (ctx: { program: unknown }) => void,
        opts?: { commands?: string[] },
      ) => cli.push({ registrar, opts }),
      registerHttpRoute: (params: {
        path: string;
        auth: "gateway" | "plugin";
        match?: "exact" | "prefix";
        handler: (req: IncomingMessage, res: ServerResponse) => Promise<boolean | void> | boolean | void;
      }) => routes.push(params),
      on: (hookName: string, handler: (event: unknown, ctx: unknown) => Promise<unknown> | unknown) =>
        hooks.set(hookName, handler),
    },
    methods,
    contextEngines,
    hooks,
    routes,
    cli,
  };
}

async function callMethod(
  handler: (options: { params: Record<string, unknown>; respond: (...args: unknown[]) => void }) =>
    | Promise<void>
    | void,
  params: Record<string, unknown>,
) {
  const calls: unknown[][] = [];
  await handler({ params, respond: (...args: unknown[]) => calls.push(args) });
  return calls.at(-1);
}

describe("continuity plugin", () => {
  beforeEach(() => {
    createContinuityServiceMock.mockReset();
  });

  it("registers context-engine, gateway methods, cli, hook, and route", () => {
    const service = makeService();
    createContinuityServiceMock.mockReturnValue(service);
    const { api, methods, contextEngines, hooks, routes, cli } = createApi({ slotSelected: true });

    plugin.register(api as never);

    expect(contextEngines.has("continuity")).toBe(true);
    expect([...methods.keys()].sort()).toEqual([
      "continuity.explain",
      "continuity.list",
      "continuity.patch",
      "continuity.recent",
      "continuity.status",
      "continuity.subjects",
    ]);
    expect(cli).toHaveLength(1);
    expect(cli[0]?.opts).toEqual({ commands: ["continuity"] });

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/plugins/continuity");
    expect(routes[0]?.auth).toBe("gateway");
    expect(routes[0]?.match).toBe("exact");

    expect(hooks.has("before_prompt_build")).toBe(true);

    const fakeProgram = new Command();
    cli[0]?.registrar({ program: fakeProgram });
  });

  it("creates the service once across gateway and context-engine wiring", async () => {
    const service = makeService();
    service.status.mockResolvedValue({ enabled: true });
    createContinuityServiceMock.mockReturnValue(service);

    const { api, methods, contextEngines } = createApi({ slotSelected: true });
    plugin.register(api as never);

    const statusHandler = methods.get("continuity.status");
    if (!statusHandler) {
      throw new Error("missing status handler");
    }
    await callMethod(statusHandler, {});

    contextEngines.get("continuity")?.();

    expect(createContinuityServiceMock).toHaveBeenCalledTimes(1);
  });

  it("handles continuity.status success and errors", async () => {
    const service = makeService();
    service.status.mockResolvedValue({ enabled: true, agentId: "alpha" });
    createContinuityServiceMock.mockReturnValue(service);

    const { api, methods } = createApi({ slotSelected: true });
    plugin.register(api as never);

    const handler = methods.get("continuity.status");
    if (!handler) {
      throw new Error("missing handler");
    }

    await expect(callMethod(handler, { agentId: " alpha " })).resolves.toEqual([
      true,
      { enabled: true, agentId: "alpha" },
    ]);

    service.status.mockRejectedValueOnce(new Error("offline"));
    await expect(callMethod(handler, {})).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: offline" },
    ]);
  });

  it("parses continuity.list filters and handles invalid values", async () => {
    const service = makeService();
    service.list.mockResolvedValue([]);
    createContinuityServiceMock.mockReturnValue(service);

    const { api, methods } = createApi({ slotSelected: true });
    plugin.register(api as never);

    const handler = methods.get("continuity.list");
    if (!handler) {
      throw new Error("missing handler");
    }

    await callMethod(handler, {
      agentId: "agent-1",
      state: "approved",
      kind: "preference",
      sourceClass: "main_direct",
      limit: "7",
    });

    expect(service.list).toHaveBeenCalledWith({
      agentId: "agent-1",
      filters: {
        state: "approved",
        kind: "preference",
        sourceClass: "main_direct",
        scopeKind: undefined,
        subjectId: undefined,
        limit: 7,
      },
    });

    await callMethod(handler, {
      limit: 9,
    });
    expect(service.list).toHaveBeenLastCalledWith({
      agentId: undefined,
      filters: {
        state: undefined,
        kind: undefined,
        sourceClass: undefined,
        scopeKind: undefined,
        subjectId: undefined,
        limit: 9,
      },
    });

    await callMethod(handler, {
      scopeKind: "all",
    });
    expect(service.list).toHaveBeenLastCalledWith({
      agentId: undefined,
      filters: {
        state: undefined,
        kind: undefined,
        sourceClass: undefined,
        scopeKind: "all",
        subjectId: undefined,
        limit: undefined,
      },
    });

    await callMethod(handler, {
      agentId: "  ",
      state: "invalid",
      kind: "invalid",
      sourceClass: "invalid",
      limit: "0",
    });

    expect(service.list).toHaveBeenLastCalledWith({
      agentId: undefined,
      filters: {
        state: undefined,
        kind: undefined,
        sourceClass: undefined,
        scopeKind: undefined,
        subjectId: undefined,
        limit: undefined,
      },
    });

    service.list.mockRejectedValueOnce(new Error("list failed"));
    await expect(callMethod(handler, {})).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: list failed" },
    ]);
  });

  it("registers subject and recent read methods", async () => {
    const service = makeService();
    service.subjects.mockResolvedValue([{ subjectId: "owner" }]);
    service.recent.mockResolvedValue([{ id: "recent_1" }]);
    createContinuityServiceMock.mockReturnValue(service);

    const { api, methods } = createApi({ slotSelected: true });
    plugin.register(api as never);

    const subjectsHandler = methods.get("continuity.subjects");
    const recentHandler = methods.get("continuity.recent");
    if (!subjectsHandler || !recentHandler) {
      throw new Error("missing handlers");
    }

    await expect(callMethod(subjectsHandler, { agentId: "alpha", limit: "5" })).resolves.toEqual([
      true,
      [{ subjectId: "owner" }],
    ]);
    expect(service.subjects).toHaveBeenCalledWith({
      agentId: "alpha",
      limit: 5,
    });

    await expect(
      callMethod(recentHandler, {
        agentId: "alpha",
        subjectId: "owner",
        sessionKey: "discord:direct:owner",
        limit: "3",
      }),
    ).resolves.toEqual([true, [{ id: "recent_1" }]]);
    expect(service.recent).toHaveBeenCalledWith({
      agentId: "alpha",
      subjectId: "owner",
      sessionKey: "discord:direct:owner",
      limit: 3,
    });
  });

  it("handles continuity.subjects and continuity.recent errors", async () => {
    const service = makeService();
    service.subjects.mockRejectedValueOnce(new Error("subjects failed"));
    service.recent.mockRejectedValueOnce(new Error("recent failed"));
    createContinuityServiceMock.mockReturnValue(service);

    const { api, methods } = createApi({ slotSelected: true });
    plugin.register(api as never);

    const subjectsHandler = methods.get("continuity.subjects");
    const recentHandler = methods.get("continuity.recent");
    if (!subjectsHandler || !recentHandler) {
      throw new Error("missing handlers");
    }

    await expect(callMethod(subjectsHandler, {})).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: subjects failed" },
    ]);
    await expect(callMethod(recentHandler, {})).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: recent failed" },
    ]);
  });

  it("validates continuity.patch and continuity.explain payloads", async () => {
    const service = makeService();
    service.patch.mockResolvedValue({ ok: true, removedId: "cont_1" });
    service.explain.mockResolvedValue({
      record: {
        id: "cont_1",
      },
    });
    createContinuityServiceMock.mockReturnValue(service);

    const { api, methods } = createApi({ slotSelected: true });
    plugin.register(api as never);

    const patchHandler = methods.get("continuity.patch");
    const explainHandler = methods.get("continuity.explain");
    if (!patchHandler || !explainHandler) {
      throw new Error("missing handlers");
    }

    await expect(callMethod(patchHandler, { id: "", action: "approve" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "id and action required" },
    ]);
    await expect(callMethod(patchHandler, { id: "cont_1", action: "noop" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "id and action required" },
    ]);

    await expect(callMethod(patchHandler, { id: "cont_1", action: "approve" })).resolves.toEqual(
      [true, { ok: true, removedId: "cont_1" }],
    );

    await expect(callMethod(patchHandler, { id: "cont_1", action: "remove" })).resolves.toEqual(
      [true, { ok: true, removedId: "cont_1" }],
    );

    await expect(callMethod(patchHandler, { id: "cont_1", action: "reject" })).resolves.toEqual(
      [true, { ok: true, removedId: "cont_1" }],
    );

    service.patch.mockResolvedValueOnce({ ok: false });
    await expect(callMethod(patchHandler, { id: "cont_missing", action: "approve" })).resolves.toEqual(
      [
        false,
        undefined,
        { code: "INVALID_REQUEST", message: "unknown continuity id: cont_missing" },
      ],
    );

    await expect(callMethod(explainHandler, {})).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "id required" },
    ]);

    await expect(callMethod(explainHandler, { id: "cont_1" })).resolves.toEqual([
      true,
      { record: { id: "cont_1" } },
    ]);

    service.explain.mockResolvedValueOnce(null);
    await expect(callMethod(explainHandler, { id: "cont_missing" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "unknown continuity id: cont_missing" },
    ]);

    service.patch.mockRejectedValueOnce(new Error("patch failed"));
    await expect(callMethod(patchHandler, { id: "cont_1", action: "approve" })).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: patch failed" },
    ]);

    service.explain.mockRejectedValueOnce(new Error("explain failed"));
    await expect(callMethod(explainHandler, { id: "cont_1" })).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: explain failed" },
    ]);
  });

  it("injects prependSystemContext only when continuity slot is selected", async () => {
    const service = makeService();
    service.buildSystemPromptAddition.mockResolvedValue("<continuity>items</continuity>");
    createContinuityServiceMock.mockReturnValue(service);

    const selected = createApi({ slotSelected: true });
    plugin.register(selected.api as never);
    const selectedHook = selected.hooks.get("before_prompt_build");
    if (!selectedHook) {
      throw new Error("missing hook");
    }

    await expect(
      selectedHook(
        {
          prompt: "prompt",
          messages: [
            null,
            { role: 3 },
            { role: "user", content: "remember this", timestamp: 123 },
          ],
        },
        { agentId: "alpha", sessionKey: "main" },
      ),
    ).resolves.toEqual({
      prependSystemContext: "<continuity>items</continuity>",
    });

    expect(service.buildSystemPromptAddition).toHaveBeenCalledWith({
      agentId: "alpha",
      sessionKey: "main",
      messages: [{ role: "user", content: "remember this", timestamp: 123 }],
    });

    const notSelected = createApi({ slotSelected: false });
    plugin.register(notSelected.api as never);
    const notSelectedHook = notSelected.hooks.get("before_prompt_build");
    if (!notSelectedHook) {
      throw new Error("missing hook");
    }

    await expect(
      notSelectedHook(
        {
          prompt: "prompt",
          messages: [{ role: "user", content: "remember this" }],
        },
        { agentId: "alpha", sessionKey: "main" },
      ),
    ).resolves.toBeUndefined();

    service.buildSystemPromptAddition.mockResolvedValueOnce(undefined);
    await expect(
      selectedHook(
        {
          prompt: "prompt",
          messages: [{ role: "user", content: "remember this" }],
        },
        { agentId: "alpha", sessionKey: "main" },
      ),
    ).resolves.toBeUndefined();
  });
});
