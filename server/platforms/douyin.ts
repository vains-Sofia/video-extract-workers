import { platformParseFailed } from "../errors";
import type { Env, ExtractResult, VideoAuthor, VideoMedia } from "../types";
import {
  extractAssignedJson,
  fetchUpstream,
  findRecursive,
  findUrl,
  firstUrlFromArray,
  isObject,
  normalizeMediaUrl,
  numberValue,
  platformHeaders,
  supportsHost,
  textValue,
  truncateTitle,
  values,
} from "../utils";

const DOMAINS = ["v.douyin.com", "douyin.com", "iesdouyin.com"] as const;
const VIDEO_ID = /\/(?:video|note|share\/video|share\/note)\/(\d+)/i;

export function supportsDouyin(url: string): boolean {
  return supportsHost(url, DOMAINS);
}

export function extractDouyinVideoId(url: string): string | null {
  return VIDEO_ID.exec(url)?.[1] ?? null;
}

export function parseDouyinPage(html: string, url = ""): unknown {
  const data = extractAssignedJson(html, "_ROUTER_DATA");
  if (data === null) {
    throw platformParseFailed("无法解析抖音页面数据", "未找到有效的 _ROUTER_DATA 数据", "DOUYIN", url);
  }
  return data;
}

export function parseDouyinPayload(data: unknown, resolvedUrl: string): Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt"> {
  const detail = findAwemeDetail(data);
  if (!detail) {
    throw platformParseFailed("无法找到抖音作品详情", "未找到 aweme_detail 或 item_list[0]", "DOUYIN", resolvedUrl);
  }
  const description = textValue(detail, "desc");
  return {
    platform: "DOUYIN",
    videoId: textValue(detail, "aweme_id"),
    title: truncateTitle(description),
    description,
    resolvedUrl,
    author: parseAuthor(detail.author),
    media: parseMedia(detail),
  };
}

export async function extractDouyin(url: string, env: Env): Promise<Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt">> {
  const response = await fetchUpstream(
    url,
    { headers: platformHeaders("DOUYIN", env, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") },
    env,
    "DOUYIN",
  );
  const resolvedUrl = response.url || url;
  const result = parseDouyinPayload(parseDouyinPage(await response.text(), resolvedUrl), resolvedUrl);
  if (!extractDouyinVideoId(resolvedUrl) && result.videoId) {
    result.resolvedUrl = `https://www.douyin.com/video/${result.videoId}`;
  }
  return result;
}

function findAwemeDetail(root: unknown): Record<string, unknown> | null {
  if (isObject(root?.valueOf()) && isObject((root as Record<string, unknown>).loaderData)) {
    for (const pageData of Object.values((root as Record<string, unknown>).loaderData as Record<string, unknown>)) {
      if (!isObject(pageData) || !isObject(pageData.videoInfoRes)) continue;
      const items = pageData.videoInfoRes.item_list;
      if (Array.isArray(items) && isObject(items[0])) return items[0];
    }
  }
  if (isObject(root)) {
    if (isObject(root.detail) && isObject(root.detail.aweme_detail)) return root.detail.aweme_detail;
    if (isObject(root.aweme_detail)) return root.aweme_detail;
    if (isObject(root.aweme)) return root.aweme;
  }
  const found = findRecursive(root, (node) => isObject(node) && isObject(node.aweme_detail), 4);
  return isObject(found) && isObject(found.aweme_detail) ? found.aweme_detail : null;
}

function parseAuthor(node: unknown): VideoAuthor | null {
  if (!isObject(node)) return null;
  return {
    id: textValue(node, "sec_uid", "uid"),
    nickname: textValue(node, "nickname"),
    avatarUrl: firstResourceUrl(node, "avatar_thumb", "avatar_larger", "avatar_medium"),
  };
}

function parseMedia(detail: Record<string, unknown>): VideoMedia | null {
  const imageNodes = collectImageNodes(detail);
  const imageUrls = [...new Set(imageNodes.map((node) => findImageUrl(node)).filter((url): url is string => Boolean(url)))];
  if (imageUrls.length) {
    return {
      mediaType: "IMAGE",
      coverUrl: imageUrls[0] ?? null,
      videoUrl: null,
      imageUrls,
      durationMs: null,
      width: numberValue(imageNodes[0], "width"),
      height: numberValue(imageNodes[0], "height"),
    };
  }
  const video = detail.video;
  if (!isObject(video)) return null;
  const sourceUrl = firstResourceUrl(video, "play_addr", "download_addr");
  return {
    mediaType: "VIDEO",
    coverUrl: firstResourceUrl(video, "cover", "dynamic_cover", "origin_cover"),
    videoUrl: sourceUrl?.replace("playwm", "play") ?? "",
    durationMs: numberValue(video, "duration"),
    width: numberValue(video, "width"),
    height: numberValue(video, "height"),
  };
}

function collectImageNodes(detail: Record<string, unknown>): unknown[] {
  const result: unknown[] = [];
  for (const field of ["images", "image_infos"] as const) {
    if (Array.isArray(detail[field])) result.push(...detail[field]);
  }
  if (isObject(detail.image_post_info) && Array.isArray(detail.image_post_info.images)) {
    result.push(...detail.image_post_info.images);
  }
  return result;
}

function findImageUrl(node: unknown): string | null {
  return findUrl(node, ["display_image", "origin_cover", "cover", "image", "label_large", "large", "medium"], 6);
}

function firstResourceUrl(node: Record<string, unknown>, ...fields: string[]): string | null {
  for (const field of fields) {
    const resource = node[field];
    if (typeof resource === "string") return normalizeMediaUrl(resource);
    if (isObject(resource)) {
      const url = firstUrlFromArray(resource.url_list);
      if (url) return url;
    }
    for (const child of values(resource)) {
      if (typeof child === "string" && /^https?:\/\//.test(child)) return child;
    }
  }
  return null;
}
