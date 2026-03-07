declare module "openclaw/plugin-sdk/continuity" {
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

  export const ErrorCodes: {
    INVALID_REQUEST: "INVALID_REQUEST";
    UNAVAILABLE: "UNAVAILABLE";
  };

  export function errorShape(code: string, message: string): { code: string; message: string };

  export class ContinuityContextEngine {
    constructor(service: ContinuityService);
  }

  export function createContinuityService(
    config: Record<string, unknown>,
    pluginConfig?: Record<string, unknown>,
  ): ContinuityService;

  export function registerContinuityCli(params: {
    program: unknown;
    ensureService: () => Promise<ContinuityService> | ContinuityService;
  }): void;

  export function resolveContinuityConfig(config?: Record<string, unknown>): Record<string, unknown>;
}
