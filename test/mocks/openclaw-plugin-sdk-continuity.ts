export type ContinuityKind = "fact" | "preference" | "decision" | "open_loop";
export type ContinuityReviewState = "pending" | "approved" | "rejected";
export type ContinuitySourceClass = "main_direct" | "paired_direct" | "group" | "channel";
export type ContinuityPatchAction = "approve" | "reject" | "remove";

export type ContinuityRecord = {
  id: string;
  kind: ContinuityKind;
  reviewState: ContinuityReviewState;
  sourceClass: ContinuitySourceClass;
  text: string;
};

export type ContinuityService = {
  status: (agentId?: string) => Promise<unknown>;
  list: (params?: {
    agentId?: string;
    filters?: {
      state?: ContinuityReviewState | "all";
      kind?: ContinuityKind | "all";
      sourceClass?: ContinuitySourceClass | "all";
      limit?: number;
    };
  }) => Promise<ContinuityRecord[]>;
  patch: (params: {
    agentId?: string;
    id: string;
    action: ContinuityPatchAction;
  }) => Promise<{ ok: boolean; removedId?: string; record?: ContinuityRecord }>;
  explain: (params: { agentId?: string; id: string }) => Promise<unknown>;
};

export type GatewayRequestHandlerOptions = {
  params: Record<string, unknown>;
  respond: (ok: boolean, result?: unknown, error?: unknown) => void;
};

export type OpenClawPluginApi = {
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  registerContextEngine: (id: string, factory: () => unknown) => void;
  registerGatewayMethod: (
    method: string,
    handler: (options: GatewayRequestHandlerOptions) => Promise<void> | void,
  ) => void;
  registerCli: (
    registrar: (ctx: { program: unknown }) => void,
    options?: { commands?: string[] },
  ) => void;
};

export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export const service: ContinuityService = {
  status: async () => undefined,
  list: async () => [],
  patch: async () => ({ ok: false }),
  explain: async () => undefined,
};

export const state = {
  createContinuityServiceCalls: [] as Array<{ config: Record<string, unknown>; pluginConfig?: Record<string, unknown> }>,
  resolveContinuityConfigCalls: [] as Array<Record<string, unknown> | undefined>,
  registerContinuityCliCalls: [] as Array<{ program: unknown; ensureService: () => Promise<ContinuityService> | ContinuityService }>,
  errorShapeCalls: [] as Array<{ code: string; message: string }>,
  engineInstances: [] as unknown[],
  reset() {
    this.createContinuityServiceCalls.length = 0;
    this.resolveContinuityConfigCalls.length = 0;
    this.registerContinuityCliCalls.length = 0;
    this.errorShapeCalls.length = 0;
    this.engineInstances.length = 0;
    service.status = async () => undefined;
    service.list = async () => [];
    service.patch = async () => ({ ok: false });
    service.explain = async () => undefined;
  },
};

export function errorShape(code: string, message: string) {
  state.errorShapeCalls.push({ code, message });
  return { code, message };
}

export class ContinuityContextEngine {
  constructor(public readonly currentService: ContinuityService) {
    state.engineInstances.push(this);
  }
}

export function createContinuityService(
  config: Record<string, unknown>,
  pluginConfig?: Record<string, unknown>,
): ContinuityService {
  state.createContinuityServiceCalls.push({ config, pluginConfig });
  return service;
}

export function registerContinuityCli(params: {
  program: unknown;
  ensureService: () => Promise<ContinuityService> | ContinuityService;
}) {
  state.registerContinuityCliCalls.push(params);
}

export function resolveContinuityConfig(config?: Record<string, unknown>) {
  state.resolveContinuityConfigCalls.push(config);
  return { normalized: config ?? {} };
}
