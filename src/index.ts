import type { GatewayRequestHandlerOptions, OpenClawPluginApi } from "openclaw/plugin-sdk";
import { ErrorCodes, errorShape } from "./continuity/errors.js";
import { ContinuityContextEngine } from "./continuity/engine.js";
import { createContinuityRouteHandler, continuityRoutePath } from "./continuity/route.js";
import { createContinuityService } from "./continuity/service.js";
import {
  registerContinuityCli,
  resolveContinuityConfig,
  type ContinuityAgentMessage,
  type ContinuityKind,
  type ContinuityPatchAction,
  type ContinuityReviewState,
  type ContinuityScopeKind,
  type ContinuitySourceClass,
} from "./continuity/index.js";

function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readOptionalPositiveInt(params: Record<string, unknown>, key: string): number | undefined {
  const value = params[key];
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function readStateFilter(
  params: Record<string, unknown>,
): ContinuityReviewState | "all" | undefined {
  const value = readOptionalString(params, "state");
  return value === "pending" || value === "approved" || value === "rejected" || value === "all"
    ? value
    : undefined;
}

function readKindFilter(params: Record<string, unknown>): ContinuityKind | "all" | undefined {
  const value = readOptionalString(params, "kind");
  return value === "fact" ||
    value === "preference" ||
    value === "decision" ||
    value === "open_loop" ||
    value === "all"
    ? value
    : undefined;
}

function readSourceFilter(
  params: Record<string, unknown>,
): ContinuitySourceClass | "all" | undefined {
  const value = readOptionalString(params, "sourceClass");
  return value === "main_direct" ||
    value === "paired_direct" ||
    value === "group" ||
    value === "channel" ||
    value === "all"
    ? value
    : undefined;
}

function readPatchAction(params: Record<string, unknown>): ContinuityPatchAction | undefined {
  const value = readOptionalString(params, "action");
  return value === "approve" || value === "reject" || value === "remove" ? value : undefined;
}

function readScopeFilter(
  params: Record<string, unknown>,
): ContinuityScopeKind | "all" | undefined {
  const value = readOptionalString(params, "scopeKind");
  return value === "agent" || value === "subject" || value === "session" || value === "all"
    ? value
    : undefined;
}

function sendInvalid(respond: GatewayRequestHandlerOptions["respond"], message: string) {
  respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, message));
}

function toContinuityMessages(messages: unknown[]): ContinuityAgentMessage[] {
  const normalized: ContinuityAgentMessage[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      continue;
    }
    const role = (message as { role?: unknown }).role;
    if (typeof role !== "string") {
      continue;
    }
    normalized.push({
      role,
      content: (message as { content?: unknown }).content,
      timestamp:
        typeof (message as { timestamp?: unknown }).timestamp === "number"
          ? (message as { timestamp: number }).timestamp
          : undefined,
    });
  }
  return normalized;
}

const plugin = {
  id: "continuity",
  name: "Continuity",
  description: "Cross-channel continuity capture, review, and recall for direct chats.",
  kind: "context-engine",
  register(api: OpenClawPluginApi) {
    resolveContinuityConfig(api.pluginConfig);
    let service: ReturnType<typeof createContinuityService> | null = null;

    const ensureService = () => {
      service ??= createContinuityService({
        config: api.config,
        runtime: api.runtime,
        pluginConfig: api.pluginConfig,
        logger: api.logger,
      });
      return service;
    };

    api.registerContextEngine(
      "continuity",
      () =>
        new ContinuityContextEngine({
          service: ensureService(),
          logger: api.logger,
        }),
    );

    api.registerGatewayMethod(
      "continuity.status",
      async ({ params, respond }: GatewayRequestHandlerOptions) => {
        try {
          const status = await ensureService().status(readOptionalString(params, "agentId"));
          respond(true, status);
        } catch (error) {
          respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
        }
      },
    );

    api.registerGatewayMethod(
      "continuity.list",
      async ({ params, respond }: GatewayRequestHandlerOptions) => {
        try {
          const records = await ensureService().list({
            agentId: readOptionalString(params, "agentId"),
            filters: {
              state: readStateFilter(params),
              kind: readKindFilter(params),
              sourceClass: readSourceFilter(params),
              scopeKind: readScopeFilter(params),
              subjectId: readOptionalString(params, "subjectId"),
              limit: readOptionalPositiveInt(params, "limit"),
            },
          });
          respond(true, records);
        } catch (error) {
          respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
        }
      },
    );

    api.registerGatewayMethod(
      "continuity.patch",
      async ({ params, respond }: GatewayRequestHandlerOptions) => {
        const id = readOptionalString(params, "id");
        const action = readPatchAction(params);
        if (!id || !action) {
          sendInvalid(respond, "id and action required");
          return;
        }
        try {
          const result = await ensureService().patch({
            agentId: readOptionalString(params, "agentId"),
            id,
            action,
          });
          if (!result.ok) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, `unknown continuity id: ${id}`),
            );
            return;
          }
          respond(true, result);
        } catch (error) {
          respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
        }
      },
    );

    api.registerGatewayMethod(
      "continuity.explain",
      async ({ params, respond }: GatewayRequestHandlerOptions) => {
        const id = readOptionalString(params, "id");
        if (!id) {
          sendInvalid(respond, "id required");
          return;
        }
        try {
          const result = await ensureService().explain({
            agentId: readOptionalString(params, "agentId"),
            id,
          });
          if (!result) {
            respond(
              false,
              undefined,
              errorShape(ErrorCodes.INVALID_REQUEST, `unknown continuity id: ${id}`),
            );
            return;
          }
          respond(true, result);
        } catch (error) {
          respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
        }
      },
    );

    api.registerGatewayMethod(
      "continuity.subjects",
      async ({ params, respond }: GatewayRequestHandlerOptions) => {
        try {
          const result = await ensureService().subjects({
            agentId: readOptionalString(params, "agentId"),
            limit: readOptionalPositiveInt(params, "limit"),
          });
          respond(true, result);
        } catch (error) {
          respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
        }
      },
    );

    api.registerGatewayMethod(
      "continuity.recent",
      async ({ params, respond }: GatewayRequestHandlerOptions) => {
        try {
          const result = await ensureService().recent({
            agentId: readOptionalString(params, "agentId"),
            subjectId: readOptionalString(params, "subjectId"),
            sessionKey: readOptionalString(params, "sessionKey"),
            limit: readOptionalPositiveInt(params, "limit"),
          });
          respond(true, result);
        } catch (error) {
          respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(error)));
        }
      },
    );

    api.registerCli(
      ({ program }) => {
        registerContinuityCli({
          program,
          ensureService,
        });
      },
      { commands: ["continuity"] },
    );

    api.registerHttpRoute({
      path: continuityRoutePath,
      auth: "gateway",
      match: "exact",
      handler: createContinuityRouteHandler({
        runtime: api.runtime,
        service: ensureService(),
        logger: api.logger,
      }),
    });

    api.on("before_prompt_build", async (event, ctx) => {
      const config = api.runtime.config.loadConfig();
      if (config.plugins?.slots?.contextEngine !== "continuity") {
        return;
      }
      const addition = await ensureService().buildSystemPromptAddition({
        agentId: ctx.agentId,
        sessionKey: ctx.sessionKey,
        messages: toContinuityMessages(event.messages),
      });
      if (!addition) {
        return;
      }
      return {
        prependSystemContext: addition,
      };
    });
  },
} as const;

export default plugin;
