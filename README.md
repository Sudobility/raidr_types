# raidr_types

Shared TypeScript types for the raidr platform: MCP manifests, skills, sites,
and the request/response shapes of `raidr_api`.

```bash
bun add @sudobility/raidr_types
```

## Exports

| Import | Contents | Needs |
| --- | --- | --- |
| `@sudobility/raidr_types` | plain types, `successResponse`, `errorResponse`, `paginatedResponse`, path helpers, constants | `@sudobility/types` |
| `@sudobility/raidr_types/schemas` | zod schemas for every wire type, bound to the interfaces with `satisfies` | `zod` v4 |

Only `raidr_api` and `raidr_crawler` import `./schemas`. Front-end packages use
the root export and never pull zod.

## Manifest shape

One `McpManifest` per API host. Each `McpTool` carries a JSON Schema input and
an `McpToolRequest` that maps input fields onto path, query, header and body.
The hosted MCP server in `raidr_api` proxies tool calls from that mapping and
forwards the caller's `X-Raidr-Token` per `McpAuth`. This connection header can
carry a site session token or a user-supplied provider API key; `McpAuth`
describes its header, cookie, bearer or query placement upstream.

## API docs

One `ApiDoc` per API host lists its endpoints with typed parameters (text,
number, enum, boolean, JSON, with formats and validation hints), the credential
each needs (`none`, `user` or `api_key`), and `EndpointLink`s between
endpoints (an auth token or an id that one response supplies to a later
request), which `ApiFlow` serves as a flow map. `ApiExecuteRequest` /
`ApiExecuteResult` are the body and reply of `raidr_api`'s execute proxy.

## Site credentials

`extractCredential(headers, auth)` pulls a signed-in user's token off a
request the site itself sent: the bearer token without its prefix, a named
header without its `tokenPrefix`, or one cookie's value. It never returns
placeholders or anonymous values. The same module defines the message protocol
between raidr.app and the raidr extension (`BridgeRequest` / `BridgeResponse`,
`TokenRequest`, `CapturedCredential`), and `RaidrSettings.siteTokens` holds
tokens saved by `raidr token`.

## Development

Bun only. Clone, then:

```bash
bun install          # installs @sudobility/types (peer) and zod from GitHub Packages
bun run verify       # typecheck + lint + test:unit + build (the full gate)
```

Individual scripts:

| Command | Does |
| --- | --- |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `eslint src --ext .ts` (prettier runs as a lint rule) |
| `bun run test:unit` | `vitest run` (76 tests, 7 files) |
| `bun run test:watch` | `vitest` in watch mode |
| `bun run build` | `tsc -p tsconfig.esm.json` → `dist/` ESM with `.d.ts` + maps |
| `bun run format` | `prettier --write` on `src` |
| `bun run clean` | `rimraf dist` |

`@sudobility/*` packages resolve from GitHub Packages (`.npmrc`); auth lives in
`~/.npmrc`. There is no runtime to start — this is a types-only library; `dist/`
is what gets published. CI (`johnqh/workflows` unified CI/CD) publishes to npm on
push to `main`/`develop` when `NPM_TOKEN` is set; `prepublishOnly` runs
`clean` then `verify`.

## Related projects

- `raidr_api` — CRUD for manifests, skills, sites and API docs plus the hosted MCP server
- `raidr_crawler` — crawls a site, analyses the bundle, publishes manifests
- `raidr_client` / `raidr_lib` / `raidr_app` — front-end stack
