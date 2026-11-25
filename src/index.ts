/**
 * @sudobility/raidr_types
 * TypeScript types for the raidr API - MCP manifests, skills and sites.
 *
 * The root export is plain types and tiny pure helpers. Zod schemas for the
 * same shapes live under `@sudobility/raidr_types/schemas` and need `zod`.
 */

// Generic response types and their constructors are the canonical ones from
// @sudobility/types — raidr_types does not define them, it re-exports them so
// raidr consumers can keep importing from one package while the shapes stay
// shared across every sudobility API.
export type {
  BaseResponse,
  PaginatedResponse,
  HealthResponse,
  HealthCheckData,
} from '@sudobility/types';
export {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '@sudobility/types';

export * from './mcp.js';
export * from './usefulness.js';
export * from './entities.js';
export * from './apidoc.js';
export * from './constants.js';
export * from './paths.js';
export * from './credential.js';
export * from './security.js';
export * from './upstream.js';
