/**
 * A coarse, deterministic signal for whether an MCP tool is likely useful to
 * an end user, or is site infrastructure. Set on every tool by the crawler's
 * manifest writer and backfilled onto existing manifests. It is a HEURISTIC
 * over the tool's name and request path only (not its prose description, which
 * is model-written and noisy), so it is a hint for ranking/filtering, never a
 * guarantee. When nothing matches it defaults to `useful` — a false `useful`
 * only fails to hide a tool, while a false `plumbing` would wrongly bury a real
 * one.
 *
 * - `useful`   — a real user-facing action or data (search, content, account,
 *                transactions, media, messaging, …). The default.
 * - `plumbing` — infrastructure with no direct end-user value: telemetry,
 *                analytics, logging, feature flags, remote config, consent /
 *                cookie, auth / session / CSRF / token, bot challenge, health /
 *                version / status, prefetch.
 * - `asset`    — a static file or data-file fetch (`.json`, `.js`, `.css`, …).
 * - `content`  — CMS / docs / help / localization content fetches (borderline).
 */
import { z } from 'zod';

export const USEFULNESS_VALUES = [
  'useful',
  'plumbing',
  'asset',
  'content',
] as const;
export type Usefulness = (typeof USEFULNESS_VALUES)[number];
export const usefulnessSchema = z.enum(USEFULNESS_VALUES);

/** A static file / data-file path: judged on the path's extension. */
const ASSET_RE =
  /\.(?:json|js|mjs|cjs|css|xml|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|map|pdf|txt|csv|tsv|mp3|mp4|webm|wav|ogg|wasm|zip|gz|rss|atom)$/i;

/** Infrastructure, by name or path token. Word boundaries use `_` (names) or `/` (paths). */
const PLUMBING_RE = new RegExp(
  [
    '(^|[_/])(?:track|tracking|collect|beacon|pixel|telemetry|rum|analytics|impressions?|heartbeat|prefetch|logging)([_/]|$)',
    '(?:sentry|datadog|segment|amplitude|mixpanel|newrelic|fullstory|hotjar|clarity|optimizely|launchdarkly)',
    '(?:feature[_-]?flags?|/flags?(?:/|$)|remote[_-]?config|/config(?:/|$)|experiments?|ab[_-]?tests?|variations?)',
    '(?:consent|cookie|gdpr|/privacy(?:/|$))',
    '(?:csrf|nonce|captcha|cdn-cgi|challenge[_-]?platform|/oauth(?:/|$)|/sso(?:/|$)|refresh[_-]?token|/token(?:/|$)|(^|[_/])session([_/]|$)|/\\.well-known|passkey)',
    '(?:/health(?:/|$)|healthz|/ping(?:/|$)|/status(?:/|$)|/version(?:/|$)|/ready(?:/|$)|/live(?:/|$)|readyz|livez|/_next/)',
    '(^|[_/])logs?([_/]|$)',
  ].join('|'),
  'i'
);

/** CMS / docs / localization content. */
const CONTENT_RE = new RegExp(
  [
    '(?:localization|/i18n(?:/|$)|translations?|/locale|/lang(?:/|$)|(^|[_/])lang([_/]|$))',
    '(?:/docs?(?:/|$)|/help(?:/|$)|troubleshooting|/faq(?:/|$)|(^|[_/])faq([_/]|$)|readme)',
  ].join('|'),
  'i'
);

/** The minimum of a tool needed to classify it. */
export interface ClassifiableTool {
  name?: string;
  request?: { pathTemplate?: string };
}

/**
 * Classify a tool. Order matters: a static asset is judged before plumbing (a
 * `.json` config file is an `asset`, not `plumbing`), and content is the last
 * non-default bucket.
 */
export function classifyToolUsefulness(tool: ClassifiableTool): Usefulness {
  const path = (tool.request?.pathTemplate ?? '').split('?')[0]!.toLowerCase();
  const hay = `${(tool.name ?? '').toLowerCase()} ${path}`;
  if (ASSET_RE.test(path)) return 'asset';
  if (PLUMBING_RE.test(hay)) return 'plumbing';
  if (CONTENT_RE.test(hay)) return 'content';
  return 'useful';
}
