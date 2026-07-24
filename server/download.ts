import { invalidUrl, platformFetchFailed } from "./errors";
import { detectPlatform } from "./extract";
import type { DownloadImagesRequest, DownloadVideoRequest, Env, Platform } from "./types";
import { assertPublicHttpUrl, boundedInt, DEFAULT_USER_AGENT, fetchUpstream, platformHeaders } from "./utils";
import { createStoredZip } from "./zip";

export async function downloadVideo(
  payload: DownloadVideoRequest,
  env: Env,
  range?: string | null,
): Promise<Response> {
  if (!payload || typeof payload.url !== "string" || !payload.url.trim()) throw invalidUrl("视频 URL 不能为空");
  const url = assertPublicHttpUrl(payload.url).toString();
  const platform = validPlatform(payload.platform) ? payload.platform : detectPlatform(url);
  const headers = downloadHeaders(platform, env, "video/*,*/*;q=0.8");
  if (range) headers.set("range", range);
  const upstream = await fetchUpstream(url, { headers }, env, platform ?? undefined);
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const responseHeaders = new Headers({
    "content-type": contentType,
    "content-disposition": contentDisposition(buildVideoFilename(new URL(url), contentType)),
    "cache-control": "private, no-store",
  });
  for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export async function downloadImages(payload: DownloadImagesRequest, env: Env): Promise<Response> {
  if (!payload || !Array.isArray(payload.imageUrls) || payload.imageUrls.length === 0) {
    throw invalidUrl("图片 URL 列表不能为空");
  }
  const maxCount = boundedInt(env.MAX_IMAGE_COUNT, 20, 1, 100);
  if (payload.imageUrls.length > maxCount) throw invalidUrl(`单次最多下载 ${maxCount} 张图片`);
  const maxBytes = boundedInt(env.MAX_IMAGE_BYTES, 25 * 1024 * 1024, 1024, 100 * 1024 * 1024);
  const usedNames = new Set<string>();
  const entries: Array<{ name: string; data: Uint8Array }> = [];
  let totalBytes = 0;

  for (let index = 0; index < payload.imageUrls.length; index++) {
    const rawUrl = payload.imageUrls[index];
    if (typeof rawUrl !== "string") throw invalidUrl("图片 URL 格式无效");
    const url = assertPublicHttpUrl(rawUrl);
    const platform = validPlatform(payload.platform) ? payload.platform : detectPlatform(url.toString());
    const upstream = await fetchUpstream(
      url.toString(),
      { headers: downloadHeaders(platform, env, "image/*,*/*;q=0.8") },
      env,
      platform ?? undefined,
    );
    const announced = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(announced) && totalBytes + announced > maxBytes) {
      await upstream.body?.cancel();
      throw invalidUrl(`图片总大小不能超过 ${maxBytes} 字节`);
    }
    const data = new Uint8Array(await upstream.arrayBuffer());
    totalBytes += data.length;
    if (totalBytes > maxBytes) throw invalidUrl(`图片总大小不能超过 ${maxBytes} 字节`);
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    entries.push({ name: uniqueImageName(url, contentType, index + 1, usedNames), data });
  }

  const filename = ensureExtension(sanitizeFilename(payload.filename || "images"), ".zip");
  return new Response(createStoredZip(entries) as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": contentDisposition(filename || "images.zip"),
      "cache-control": "private, no-store",
    },
  });
}

function downloadHeaders(platform: Platform | null, env: Env, accept: string): Headers {
  if (platform) return platformHeaders(platform, env, accept);
  return new Headers({ accept, "user-agent": env.USER_AGENT || DEFAULT_USER_AGENT });
}

function validPlatform(platform: unknown): platform is Platform {
  return platform === "DOUYIN" || platform === "XIAOHONGSHU" || platform === "BILIBILI";
}

function buildVideoFilename(url: URL, contentType: string): string {
  let name = decodeFilename(url.pathname.split("/").pop() || "");
  if (!name) name = `video${videoExtension(contentType)}`;
  name = sanitizeFilename(name).slice(0, 80).trim();
  if (!name) name = `video${videoExtension(contentType)}`;
  return hasExtension(name) ? name : `${name}${videoExtension(contentType)}`;
}

function uniqueImageName(url: URL, contentType: string, index: number, used: Set<string>): string {
  let name = sanitizeFilename(decodeFilename(url.pathname.split("/").pop() || ""));
  const fallback = `image-${String(index).padStart(3, "0")}${imageExtension(contentType)}`;
  if (!name) name = fallback;
  if (!hasExtension(name)) name += imageExtension(contentType);
  let unique = name;
  let duplicate = 2;
  while (used.has(unique)) unique = appendSuffix(name, `-${duplicate++}`);
  used.add(unique);
  return unique;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, "_").replace(/\s+/g, " ").trim();
}

function decodeFilename(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hasExtension(value: string): boolean {
  const dot = value.lastIndexOf(".");
  return dot > 0 && dot < value.length - 1;
}

function ensureExtension(value: string, extension: string): string {
  return value.toLowerCase().endsWith(extension) ? value : `${value}${extension}`;
}

function appendSuffix(value: string, suffix: string): string {
  const dot = value.lastIndexOf(".");
  return dot > 0 ? `${value.slice(0, dot)}${suffix}${value.slice(dot)}` : `${value}${suffix}`;
}

function videoExtension(contentType: string): string {
  const type = contentType.toLowerCase();
  if (type.includes("webm")) return ".webm";
  if (type.includes("quicktime")) return ".mov";
  if (type.includes("mpegurl") || type.includes("m3u8")) return ".m3u8";
  return ".mp4";
}

function imageExtension(contentType: string): string {
  const type = contentType.toLowerCase();
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("gif")) return ".gif";
  if (type.includes("bmp")) return ".bmp";
  if (type.includes("avif")) return ".avif";
  return ".jpg";
}

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

