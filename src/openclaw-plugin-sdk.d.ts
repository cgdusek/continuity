declare module "openclaw/plugin-sdk" {
  import type { IncomingMessage, ServerResponse } from "node:http";
  import type { Command } from "commander";

  export type OpenClawConfig = {
    agents?: {
      defaults?: {
        workspace?: string;
      };
      list?: Array<{
        id?: string;
        default?: boolean;
        workspace?: string;
      }>;
    };
    plugins?: {
      slots?: {
        contextEngine?: string;
      };
      entries?: Record<
        string,
        {
          config?: Record<string, unknown>;
        }
      >;
    };
    [key: string]: unknown;
  };

  export type PluginLogger = {
    debug?: (message: string, meta?: Record<string, unknown>) => void;
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };

  export type PluginRuntime = {
    config: {
      loadConfig: () => OpenClawConfig;
      writeConfigFile: (config: OpenClawConfig) => Promise<void>;
    };
    state: {
      resolveStateDir: (env?: NodeJS.ProcessEnv) => string;
    };
  };

  export type GatewayRequestHandlerOptions = {
    params: Record<string, unknown>;
    respond: (ok: boolean, result?: unknown, error?: unknown) => void;
  };

  export type OpenClawPluginApi = {
    config: OpenClawConfig;
    pluginConfig?: Record<string, unknown>;
    runtime: PluginRuntime;
    logger: PluginLogger;
    registerContextEngine: (id: string, factory: () => unknown) => void;
    registerGatewayMethod: (
      method: string,
      handler: (options: GatewayRequestHandlerOptions) => Promise<void> | void,
    ) => void;
    registerCli: (
      registrar: (ctx: { program: Command }) => void,
      options?: { commands?: string[] },
    ) => void;
    registerHttpRoute: (params: {
      path: string;
      auth: "gateway" | "plugin";
      match?: "exact" | "prefix";
      handler: (
        req: IncomingMessage,
        res: ServerResponse,
      ) => Promise<boolean | void> | boolean | void;
    }) => void;
    on: (
      hookName: "before_prompt_build",
      handler: (
        event: { prompt: string; messages: unknown[] },
        ctx: { agentId?: string; sessionKey?: string },
      ) =>
        | Promise<
            | {
                prependSystemContext?: string;
              }
            | void
          >
        | {
            prependSystemContext?: string;
          }
        | void,
    ) => void;
  };
}
