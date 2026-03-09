/* v8 ignore file */
export {
  CONTINUITY_FILE_BY_KIND,
  CONTINUITY_KIND_ORDER,
  DEFAULT_CONTINUITY_CONFIG,
  resolveContinuityConfig,
} from "./config.js";
export { ErrorCodes, errorShape } from "./errors.js";
export { extractContinuityMatches } from "./extractor.js";
export {
  ContinuityContextEngine,
  resetCompactDelegateForTesting,
  setCompactDelegateForTesting,
} from "./engine.js";
export { createContinuityRouteHandler, continuityRoutePath } from "./route.js";
export { classifyContinuitySource, isContinuityScopeAllowed } from "./scope.js";
export { ContinuityService, createContinuityService } from "./service.js";
export { registerContinuityCli } from "./cli.js";
export { defaultRuntime } from "./runtime.js";
export type {
  ContinuityAgentMessage,
  ContinuityCandidate,
  ContinuityCaptureConfig,
  ContinuityCaptureInput,
  ContinuityCaptureMode,
  ContinuityExplainResult,
  ContinuityExtractionMatch,
  ContinuityItem,
  ContinuityKind,
  ContinuityListFilters,
  ContinuityPatchAction,
  ContinuityPatchResult,
  ContinuityPending,
  ContinuityPluginConfig,
  ContinuityRecallConfig,
  ContinuityRecord,
  ContinuityRejected,
  ContinuityReviewConfig,
  ContinuityReviewState,
  ContinuitySource,
  ContinuitySourceClass,
  ContinuityStatus,
  ContinuityStoreFile,
  ResolvedContinuityConfig,
  SessionSendPolicyConfig,
  SessionSendPolicyRule,
} from "./types.js";
