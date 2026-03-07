import { beforeEach, describe, expect, it } from "vitest";
import { service, state } from "../test/mocks/openclaw-plugin-sdk-continuity";
import plugin from "./index";

type ContinuityRecord = {
  id: string;
  kind: "fact" | "preference" | "decision" | "open_loop";
  reviewState: "pending" | "approved" | "rejected";
  sourceClass: "main_direct" | "paired_direct" | "group" | "channel";
  text: string;
};

describe("continuity plugin wrapper", () => {
  beforeEach(() => {
    state.reset();
  });

  function createApi() {
    const contextEngines = new Map<string, () => unknown>();
    const methods = new Map<
      string,
      (options: { params: Record<string, unknown>; respond: (...args: unknown[]) => void }) =>
        | Promise<void>
        | void
    >();
    const cli: Array<{
      registrar: (ctx: { program: unknown }) => void;
      opts?: { commands?: string[] };
    }> = [];
    return {
      api: {
        config: { plugins: { slots: { contextEngine: "continuity" } } },
        pluginConfig: { capture: { mainDirect: "auto" } },
        registerContextEngine: (id: string, factory: () => unknown) => contextEngines.set(id, factory),
        registerGatewayMethod: (
          method: string,
          handler: (options: { params: Record<string, unknown>; respond: (...args: unknown[]) => void }) => Promise<void> | void,
        ) => methods.set(method, handler),
        registerCli: (
          registrar: (ctx: { program: unknown }) => void,
          opts?: { commands?: string[] },
        ) => cli.push({ registrar, opts }),
      },
      contextEngines,
      methods,
      cli,
    };
  }

  async function callMethod(
    handler: (options: { params: Record<string, unknown>; respond: (...args: unknown[]) => void }) => Promise<void> | void,
    params: Record<string, unknown>,
  ) {
    const calls: unknown[][] = [];
    await handler({ params, respond: (...args: unknown[]) => calls.push(args) });
    return calls.at(-1);
  }

  it("registers the continuity slot, gateway methods, and cli registrar", () => {
    const { api, contextEngines, methods, cli } = createApi();

    plugin.register(api);

    expect(state.resolveContinuityConfigCalls).toEqual([{ capture: { mainDirect: "auto" } }]);
    expect(contextEngines.has("continuity")).toBe(true);
    expect(methods.size).toBe(4);
    expect([...methods.keys()].sort()).toEqual([
      "continuity.explain",
      "continuity.list",
      "continuity.patch",
      "continuity.status",
    ]);
    expect(cli).toHaveLength(1);
    expect(cli[0]?.opts).toEqual({ commands: ["continuity"] });
  });

  it("creates the service once and passes it into the context engine and cli", () => {
    const { api, contextEngines, cli } = createApi();

    plugin.register(api);

    const engineFactory = contextEngines.get("continuity");
    expect(engineFactory).toBeTypeOf("function");
    const engine = engineFactory?.() as { currentService: unknown };
    expect(state.createContinuityServiceCalls).toHaveLength(1);
    expect(engine.currentService).toBe(service);

    const fakeProgram = { name: "cli" };
    cli[0]?.registrar({ program: fakeProgram });
    expect(state.registerContinuityCliCalls).toEqual([
      { program: fakeProgram, ensureService: expect.any(Function) },
    ]);
    expect(state.createContinuityServiceCalls).toHaveLength(1);
  });

  it("handles continuity.status success and error flows", async () => {
    const { api, methods } = createApi();
    plugin.register(api);
    const handler = methods.get("continuity.status");
    service.status = async (agentId?: string) => ({ enabled: true, agentId });

    await expect(callMethod(handler!, { agentId: " alpha " })).resolves.toEqual([
      true,
      { enabled: true, agentId: "alpha" },
    ]);

    service.status = async () => {
      throw new Error("offline");
    };
    await expect(callMethod(handler!, {})).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: offline" },
    ]);
  });

  it("parses continuity.list filters and handles invalid values", async () => {
    const { api, methods } = createApi();
    plugin.register(api);
    const handler = methods.get("continuity.list");
    const records: ContinuityRecord[] = [
      {
        id: "cont_1",
        kind: "preference",
        reviewState: "approved",
        sourceClass: "main_direct",
        text: "I prefer terse replies.",
      },
    ];
    let seenParams: unknown;
    service.list = async (params) => {
      seenParams = params;
      return records;
    };

    await expect(
      callMethod(handler!, {
        agentId: "agent-1",
        state: "approved",
        kind: "preference",
        sourceClass: "main_direct",
        limit: "7",
      }),
    ).resolves.toEqual([true, records]);
    expect(seenParams).toEqual({
      agentId: "agent-1",
      filters: {
        state: "approved",
        kind: "preference",
        sourceClass: "main_direct",
        limit: 7,
      },
    });

    service.list = async (params) => {
      seenParams = params;
      return [];
    };
    await expect(
      callMethod(handler!, {
        agentId: "  ",
        state: "bogus",
        kind: "bogus",
        sourceClass: "bogus",
        limit: "0",
      }),
    ).resolves.toEqual([true, []]);
    expect(seenParams).toEqual({ filters: {} });

    service.list = async (params) => {
      seenParams = params;
      return [];
    };
    await expect(
      callMethod(handler!, {
        state: "pending",
        kind: "fact",
        sourceClass: "paired_direct",
        limit: 9,
      }),
    ).resolves.toEqual([true, []]);
    expect(seenParams).toEqual({
      filters: {
        state: "pending",
        kind: "fact",
        sourceClass: "paired_direct",
        limit: 9,
      },
    });

    service.list = async (params) => {
      seenParams = params;
      return [];
    };
    await expect(
      callMethod(handler!, {
        state: "rejected",
        kind: "decision",
        sourceClass: "group",
      }),
    ).resolves.toEqual([true, []]);
    expect(seenParams).toEqual({
      filters: {
        state: "rejected",
        kind: "decision",
        sourceClass: "group",
      },
    });

    service.list = async (params) => {
      seenParams = params;
      return [];
    };
    await expect(
      callMethod(handler!, {
        state: "all",
        kind: "open_loop",
        sourceClass: "channel",
      }),
    ).resolves.toEqual([true, []]);
    expect(seenParams).toEqual({
      filters: {
        state: "all",
        kind: "open_loop",
        sourceClass: "channel",
      },
    });

    service.list = async (params) => {
      seenParams = params;
      return [];
    };
    await expect(
      callMethod(handler!, {
        kind: "all",
        sourceClass: "all",
      }),
    ).resolves.toEqual([true, []]);
    expect(seenParams).toEqual({
      filters: {
        kind: "all",
        sourceClass: "all",
      },
    });

    service.list = async () => {
      throw new Error("list failed");
    };
    await expect(callMethod(handler!, {})).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: list failed" },
    ]);
  });

  it("validates continuity.patch params, forwards success, and reports unknown ids", async () => {
    const { api, methods } = createApi();
    plugin.register(api);
    const handler = methods.get("continuity.patch");

    await expect(callMethod(handler!, { id: " ", action: "approve" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "id and action required" },
    ]);
    await expect(callMethod(handler!, { id: "cont_1", action: "bogus" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "id and action required" },
    ]);

    service.patch = async () => ({ ok: false });
    await expect(callMethod(handler!, { id: "cont_1", action: "approve" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "unknown continuity id: cont_1" },
    ]);

    let seenParams: unknown;
    service.patch = async (params) => {
      seenParams = params;
      return { ok: true, removedId: "cont_2" };
    };
    await expect(callMethod(handler!, { id: "cont_2", action: "remove", agentId: "beta" })).resolves.toEqual([
      true,
      { ok: true, removedId: "cont_2" },
    ]);
    expect(seenParams).toEqual({ agentId: "beta", id: "cont_2", action: "remove" });

    service.patch = async () => {
      throw new Error("patch failed");
    };
    await expect(callMethod(handler!, { id: "cont_3", action: "reject" })).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: patch failed" },
    ]);
  });

  it("validates continuity.explain params and reports missing records", async () => {
    const { api, methods } = createApi();
    plugin.register(api);
    const handler = methods.get("continuity.explain");

    await expect(callMethod(handler!, {})).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "id required" },
    ]);

    service.explain = async () => null;
    await expect(callMethod(handler!, { id: "cont_1" })).resolves.toEqual([
      false,
      undefined,
      { code: "INVALID_REQUEST", message: "unknown continuity id: cont_1" },
    ]);

    let seenParams: unknown;
    service.explain = async (params) => {
      seenParams = params;
      return { id: "cont_2", markdownPath: "memory/continuity/preferences.md" };
    };
    await expect(callMethod(handler!, { id: "cont_2", agentId: "gamma" })).resolves.toEqual([
      true,
      { id: "cont_2", markdownPath: "memory/continuity/preferences.md" },
    ]);
    expect(seenParams).toEqual({ agentId: "gamma", id: "cont_2" });

    service.explain = async () => {
      throw new Error("explain failed");
    };
    await expect(callMethod(handler!, { id: "cont_9" })).resolves.toEqual([
      false,
      undefined,
      { code: "UNAVAILABLE", message: "Error: explain failed" },
    ]);
  });
});
