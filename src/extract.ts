import { unsupportedPlatform } from "./errors";
import { extractBilibili, supportsBilibili } from "./platforms/bilibili";
import { extractDouyin, supportsDouyin } from "./platforms/douyin";
import { extractXiaohongshu, supportsXiaohongshu } from "./platforms/xiaohongshu";
import type { Env, ExtractResult, Platform } from "./types";
import { boundedInt, normalizeInputUrl, sha256 } from "./utils";

type Extracted = Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt">;

const extractors: Array<{
  platform: Platform;
  supports: (url: string) => boolean;
  extract: (url: string, env: Env) => Promise<Extracted>;
}> = [
  { platform: "DOUYIN", supports: supportsDouyin, extract: extractDouyin },
  { platform: "XIAOHONGSHU", supports: supportsXiaohongshu, extract: extractXiaohongshu },
  { platform: "BILIBILI", supports: supportsBilibili, extract: extractBilibili },
];

export function detectPlatform(url: string): Platform | null {
  return extractors.find((extractor) => extractor.supports(url))?.platform ?? null;
}

export async function extractVideo(
  input: unknown,
  forceRefresh: boolean,
  env: Env,
  ctx?: ExecutionContext,
): Promise<ExtractResult> {
  const originalUrl = normalizeInputUrl(input);
  const extractor = extractors.find((candidate) => candidate.supports(originalUrl));
  if (!extractor) throw unsupportedPlatform(originalUrl);

  const cache = typeof caches === "undefined" ? null : await caches.open("default");
  const cacheKey = await buildCacheKey(extractor.platform, originalUrl);
  if (!forceRefresh && cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return { ...(await hit.json() as ExtractResult), cached: true };
  }

  const extracted = await extractor.extract(originalUrl, env);
  const result: ExtractResult = {
    ...extracted,
    originalUrl,
    cached: false,
    extractedAt: new Date().toISOString(),
  };

  if (cache) {
    const ttl = boundedInt(env.CACHE_TTL_SECONDS, 3600, 60, 86_400);
    const response = Response.json(result, { headers: { "cache-control": `public, max-age=${ttl}` } });
    const write = cache.put(cacheKey, response);
    if (ctx) ctx.waitUntil(write);
    else await write;
  }
  return result;
}

async function buildCacheKey(platform: Platform, url: string): Promise<Request> {
  const hash = await sha256(url);
  return new Request(`https://video-extract-cache.invalid/${platform.toLowerCase()}/${hash}`, { method: "GET" });
}
