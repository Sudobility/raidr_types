# CLAUDE.md — raidr_types

> **Git policy — never auto-commit or auto-push.** Leave work in the working tree.
> Run `git commit`, `git push`, `gh pr create`, or `push_all.sh` **only when the user
> asks in that turn**. Approval for an earlier change does not carry forward.

Shared TypeScript type contract for the raidr family (`raidr_api`,
`raidr_crawler`, `raidr_client`, `raidr_lib`, `raidr_app`, `raidr_extension`,
`raidr_cli`). Types-only library — no runtime, no app to start. Published to npm
as `@sudobility/raidr_types` (public). **Bun only.**

One package owns every shape that crosses a process boundary in raidr: the MCP
manifest the crawler produces and the API serves, the DB rows the API returns,
the request bodies it accepts, API-doc descriptions, security/crawl records, and
the zod rules that validate them. Crawler `publish --dry-run` and api write
routes import the same schemas, so a manifest that passes locally passes on the
server.

## Stack

TypeScript 5.9 (ESM, `tsc` build), vitest 4, eslint 9 (flat config, prettier as
a lint rule, **single quotes**), zod 4. Peer deps: `@sudobility/types`
(required) and `zod` (optional). `@sudobility/*` resolve from GitHub Packages
(`.npmrc`; auth in `~/.npmrc`).

## Commands (all pass; 76 tests in 7 files)

| Command | Does |
| --- | --- |
| `bun install` | required before anything; installs peers incl. optional zod |
| `bun run verify` | typecheck + lint + test:unit + build (the gate) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint src --ext .ts` |
| `bun run test:unit` | `vitest run` |
| `bun run build` | `tsc -p tsconfig.esm.json` → `dist/` with `.d.ts` + maps |
| `bun run clean` | `rimraf dist` |

`prepublishOnly` runs `clean` then `verify`. Do not run `bunx vitest` directly —
it may fetch a different vitest and fail on the optional zod peer; always go
through `bun run`.

## The two exports — the core invariant

| Import | Contents | Needs |
| --- | --- | --- |
| `@sudobility/raidr_types` | plain types, response/path helpers, constants | `@sudobility/types` |
| `@sudobility/raidr_types/schemas` | zod schemas bound to the interfaces with `satisfies` | `zod` v4 (optional) |

- **The root export must never import zod.** `zod` is optional in
  `peerDependenciesMeta` so front ends that import only the root never install
  it. Check: `grep -n "from 'zod'" src/*.ts` prints nothing.
- Only `raidr_api` and `raidr_crawler` import `./schemas` (they validate every
  write). Everyone else uses the root only.
- `./schemas` imports its types plus `TOOL_NAME_RE` / `extractPathParams` from
  `../index.js`, so rules and helpers cannot diverge.
- `tsconfig.json` excludes `*.test.ts`, so tests never reach `dist`.

## Layout

```
src/index.ts       root export: re-exports from @sudobility/types + response helpers (no zod)
src/mcp.ts         McpManifest, McpTool, McpAuth, McpToolRequest, JsonSchemaObject
src/entities.ts    DB rows on the wire, request bodies, query params, crawl-queue types
src/apidoc.ts      ApiDoc, ApiEndpoint, ApiParam, EndpointLink, ApiFlow, endpointRef
src/security.ts    CrawlRecord, SecurityIssue*, CrawlRecordRequest, list query params
src/credential.ts  extractCredential, cookieValue, matchesPathTemplate, raidr.app ⇄ extension bridge
src/upstream.ts    buildUpstreamRequest / applyAuth / assertSafeUpstream (RN-safe, no URL/Headers/DNS)
src/paths.ts       extractPathParams, fillPathTemplate, mcpProxyUrl, resolveUpstreamUrl
src/constants.ts   header names, proxy path, regexes, label helpers (toLabel/mergeLabels), RaidrSettings
src/schemas/index.ts   zod schemas, exported as ./schemas
```

Detailed per-type docs live in the source (every interface is JSDoc'd) — read
the files, do not re-document them here.

## Conventions

- **snake_case rows, camelCase manifest.** Entity DB rows use snake_case
  (`api_host`, `created_at`); the MCP manifest and API doc use camelCase because
  each is a document stored whole in a JSONB column, not a row. Request bodies
  follow the row they write. Row timestamps are typed `Date | null` but arrive
  as ISO strings over HTTP.
- **Every schema ends with `satisfies z.ZodType<Interface>`.** Change an
  interface and the build tells you which schema to update. (Intentionally
  unbound: `apiHostSchema`, `originSchema`, `httpMethodSchema`, and the two
  query schemas whose output adds defaults — so their inferred type differs
  from the interface.)
- **Bump `version` on every change** (consumers pin `^0.1.x`) — but that is a
  release step: only when the user asks.
- Prefer optional fields. Stored manifests are **not** re-validated when
  raidr_api reads them, so a new required field only binds on the next write;
  readers must tolerate the old shape.

## Manifest safety (why the rules exist)

The manifest decides where a user's token is sent, so every rule keeps requests
on `apiHost`. `auth.style` is `bearer | header | cookie | query | none`
(`query` carries provider API keys via `?queryName=`; `credentialType:'api_key'`
marks user-supplied keys). Auth is applied **last**, overwriting any mapped or
static header of the same name; with no token, no auth header is set.

- `baseUrl` must be http(s), no credentials/query/hash, host == `apiHost`.
- `pathTemplate` must start with `/` and must not start with `//`, contain
  `://`, or contain `\` — any of those could move the request off `apiHost`.
- `resolveUpstreamUrl` re-checks host/origin on every call, independent of
  write-time validation.
- `McpToolRequest` maps input fields onto path/query/headers/body; `bodyArg`
  sends one field as the whole body (replaces `bodyFields`); every name used
  must be a key of `inputSchema.properties` (`mcpToolSchema.superRefine`).
- Tool names match `TOOL_NAME_RE` (`^[a-z][a-z0-9_]{1,63}$`), unique per
  manifest.

## Cross-repo "keep in step"

These are duplicated by design — change one, change the other:

- `src/upstream.ts` (RN-safe, used by raidr_agent_lib's `DirectSiteConnector`)
  mirrors raidr_api's `src/mcp/upstream.ts` + `guard.ts`. Same mapping and
  safety rules, by hand.
- `extractCredential` is shared by raidr_extension and raidr_cli's
  `raidr token`; changing what it accepts changes both and what raidr_api
  forwards upstream. It returns null for empty/`null`/`undefined`/`anonymous`/
  `guest`/redaction placeholders (`<KIND:…>`) — never a placeholder.
- `security.ts` `SecurityIssueInput` mirrors raidr_processor's `AuditIssue`.

## Gotchas

- `McpToolRequest.body` absent means no body **except** raidr_api still sends a
  JSON body when `bodyFields` is non-empty on a non-GET tool.
- `listQuerySchema` output always has `limit`/`offset`, so its inferred type
  differs from `ListQueryParams`.
- `mcpProxyUrl` URL-encodes the host: `localhost:8080` → `localhost%3A8080`.
- `ApiEndpoint.id` is `METHOD path` (relative to the doc); an `endpointRef` is
  `METHOD https://host/path` (what raidr_app puts in `?endpoint=`). Do not mix.
- Prettier here uses single quotes; raidr_api uses double quotes.
- `ApiDoc.links` holds only links that end on this host (raidr_api stores them
  separately so a flow reads from either end).

## Changing a type safely

1. Edit the interface (`src/mcp.ts`, `src/entities.ts`, `src/apidoc.ts`, …).
2. Update its schema in `src/schemas/index.ts`; `typecheck` fails on the
   `satisfies` line until they agree.
3. Add accept/reject cases to the relevant `*.test.ts`.
4. `bun run verify`.
5. Bump `version` (release step — only when asked), then update `raidr_api`
   and `raidr_crawler` (they validate), then the front ends.
