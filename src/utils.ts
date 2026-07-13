import { invalidUrl, platformFetchFailed } from "./errors";
import type { Env, Platform } from "./types";

export type JsonObject = Record<string, unknown>;

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function values(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return isObject(value) ? Object.values(value) : [];
}

export function firstExisting(node: unknown, ...fields: string[]): unknown {
  if (!isObject(node)) return undefined;
  for (const field of fields) {
    const value = node[field];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

export function atPath(node: unknown, ...path: string[]): unknown {
  let current = node;
  for (const field of path) {
    if (!isObject(current)) return undefined;
    current = current[field];
  }
  return current;
}

export function textValue(node: unknown, ...fields: string[]): string | null {
  if (!isObject(node)) return null;
  for (const field of fields) {
    const value = node[field];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function numberValue(node: unknown, ...fields: string[]): number | null {
  if (!isObject(node)) return null;
  for (const field of fields) {
    const value = node[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

export function numberAtPath(node: unknown, ...path: string[]): number | null {
  const value = atPath(node, ...path);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function firstNotBlank(...items: Array<string | null | undefined>): string | null {
  return items.find((item): item is string => typeof item === "string" && item.trim().length > 0) ?? null;
}

export function looksLikeUrl(value: unknown): value is string {
  return typeof value === "string" && /^(?:https?:)?\/\//i.test(value);
}

export function normalizeMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("//") ? `https:${value}` : value;
}

export function firstUrlFromArray(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  return normalizeMediaUrl(value.find(looksLikeUrl) as string | undefined);
}

export function findRecursive(
  node: unknown,
  predicate: (candidate: unknown) => boolean,
  maxDepth: number,
): unknown {
  if (maxDepth <= 0 || node === null || node === undefined) return undefined;
  if (predicate(node)) return node;
  for (const child of values(node)) {
    const found = findRecursive(child, predicate, maxDepth - 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function findUrl(node: unknown, fieldNames: string[], maxDepth: number): string | null {
  if (maxDepth <= 0 || node === null || node === undefined) return null;
  if (looksLikeUrl(node)) return normalizeMediaUrl(node);
  if (isObject(node)) {
    const listUrl = firstUrlFromArray(node.url_list);
    if (listUrl) return listUrl;
    for (const field of fieldNames) {
      if (looksLikeUrl(node[field])) return normalizeMediaUrl(node[field] as string);
    }
  }
  for (const child of values(node)) {
    const found = findUrl(child, fieldNames, maxDepth - 1);
    if (found) return found;
  }
  return null;
}

export function truncateTitle(value: string | null): string | null {
  if (!value?.trim()) return null;
  return Array.from(value).length <= 50 ? value : `${Array.from(value).slice(0, 50).join("")}...`;
}

export function normalizeInputUrl(input: unknown): string {
  if (typeof input !== "string" || !input.trim()) throw invalidUrl("URL不能为空");
  const trimmed = input.trim();
  try {
    return assertPublicHttpUrl(trimmed).toString();
  } catch {
    const match = input.match(/https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/i);
    if (!match) throw invalidUrl("无法解析URL", `无法解析URL: ${input}`);
    return assertPublicHttpUrl(match[0]).toString();
  }
}

export function assertPublicHttpUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalidUrl("URL格式无效", input);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw invalidUrl("仅支持 HTTP/HTTPS URL", input);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || isPrivateIp(host)) {
    throw invalidUrl("不允许访问本地或私有网络地址", input);
  }
  return url;
}

function isPrivateIp(host: string): boolean {
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

export function supportsHost(url: string, domains: readonly string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function platformHeaders(platform: Platform, env: Env, accept: string): Headers {
  const headers = new Headers({
    accept,
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "user-agent": env.USER_AGENT || DEFAULT_USER_AGENT,
  });
  const settings: Record<Platform, [string, string | undefined]> = {
    DOUYIN: ["https://www.douyin.com/", env.DOUYIN_COOKIE],
    XIAOHONGSHU: ["https://www.xiaohongshu.com/", env.XIAOHONGSHU_COOKIE],
    BILIBILI: ["https://www.bilibili.com/", env.BILIBILI_COOKIE],
  };
  const [referer, cookie] = settings[platform];
  headers.set("referer", referer);
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

export async function fetchUpstream(
  url: string,
  init: RequestInit,
  env: Env,
  platform?: Platform,
): Promise<Response> {
  assertPublicHttpUrl(url);
  const timeout = boundedInt(env.FETCH_TIMEOUT_MS, 10_000, 1_000, 60_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...init, redirect: "follow", signal: controller.signal });
    if (!response.ok) {
      await response.body?.cancel();
      throw platformFetchFailed(`上游请求失败，HTTP 状态码: ${response.status}`, platform, url);
    }
    assertPublicHttpUrl(response.url || url);
    return response;
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw platformFetchFailed(`请求上游平台失败: ${message}`, platform, url);
  } finally {
    clearTimeout(timer);
  }
}

export function boundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function extractAssignedJson(html: string, variableName: string, normalizeUndefined = false): unknown | null {
  let searchFrom = 0;
  while (searchFrom < html.length) {
    const keyIndex = html.indexOf(variableName, searchFrom);
    if (keyIndex < 0) return null;
    const equalsIndex = html.indexOf("=", keyIndex + variableName.length);
    if (equalsIndex < 0 || equalsIndex - keyIndex > 80) return null;
    const objectStart = html.slice(equalsIndex + 1).search(/[\[{]/);
    if (objectStart < 0) return null;
    const start = equalsIndex + 1 + objectStart;
    const json = balancedJson(html, start);
    if (json) {
      try {
        const normalized = normalizeUndefined ? json.replace(/:\s*undefined\s*([,}])/g, ":null$1") : json;
        return JSON.parse(normalized);
      } catch {
        // Another occurrence may contain the actual assignment.
      }
    }
    searchFrom = keyIndex + variableName.length;
  }
  return null;
}

function balancedJson(source: string, start: number): string | null {
  const opening = source[start];
  if (opening !== "{" && opening !== "[") return null;
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === opening) depth++;
    if (char === closing && --depth === 0) return source.slice(start, index + 1);
  }
  return null;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
