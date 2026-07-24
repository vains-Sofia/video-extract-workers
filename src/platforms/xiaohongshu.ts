import { platformParseFailed } from "../errors";
import type { Env, ExtractResult, VideoAuthor, VideoMedia } from "../types";
import {
  extractAssignedJson,
  fetchUpstream,
  findRecursive,
  findUrl,
  firstExisting,
  firstNotBlank,
  firstUrlFromArray,
  isObject,
  looksLikeUrl,
  normalizeMediaUrl,
  numberValue,
  platformHeaders,
  supportsHost,
  textValue,
  truncateTitle,
  values,
} from "../utils";

const DOMAINS = ["xiaohongshu.com", "xhslink.com", "xhslink.cn"] as const;
const NOTE_ID = /\/(?:explore|discovery\/item)\/([A-Za-z0-9]+)/;

export function supportsXiaohongshu(url: string): boolean {
  return supportsHost(url, DOMAINS);
}

export function extractXiaohongshuNoteId(url: string): string | null {
  return NOTE_ID.exec(url)?.[1] ?? null;
}

export function parseXiaohongshuPage(html: string, url = ""): unknown {
  const state = extractAssignedJson(html, "__INITIAL_STATE__", true)
    ?? extractAssignedJson(html, "__SETUP_SERVER_STATE__", true);
  if (state === null) {
    throw platformParseFailed(
      "无法解析小红书页面数据",
      "未找到有效的 __INITIAL_STATE__ 或 __SETUP_SERVER_STATE__ 数据",
      "XIAOHONGSHU",
      url,
    );
  }
  return state;
}

export function parseXiaohongshuPayload(data: unknown, resolvedUrl: string): Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt"> {
  const note = findNote(data);
  if (!note) {
    throw platformParseFailed("无法找到小红书笔记详情", "未找到 noteDetailMap 中的笔记数据", "XIAOHONGSHU", resolvedUrl);
  }
  const title = textValue(note, "title");
  const description = firstNotBlank(textValue(note, "desc", "description"), title);
  return {
    platform: "XIAOHONGSHU",
    videoId: textValue(note, "id", "noteId", "note_id"),
    title: truncateTitle(firstNotBlank(title, description)),
    description,
    resolvedUrl,
    author: parseAuthor(firstExisting(note, "user", "userInfo", "author")),
    media: parseMedia(note),
  };
}

export async function extractXiaohongshu(url: string, env: Env): Promise<Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt">> {
  const response = await fetchUpstream(
    url,
    { headers: platformHeaders("XIAOHONGSHU", env, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") },
    env,
    "XIAOHONGSHU",
  );
  const resolvedUrl = response.url || url;
  const result = parseXiaohongshuPayload(parseXiaohongshuPage(await response.text(), resolvedUrl), resolvedUrl);
  if (!extractXiaohongshuNoteId(resolvedUrl) && result.videoId) {
    result.resolvedUrl = `https://www.xiaohongshu.com/explore/${result.videoId}`;
  }
  return result;
}

function findNote(root: unknown): Record<string, unknown> | null {
  const mapContainer = findRecursive(root, (node) => isObject(node) && isObject(node.noteDetailMap), 7);
  if (isObject(mapContainer) && isObject(mapContainer.noteDetailMap)) {
    for (const value of Object.values(mapContainer.noteDetailMap)) {
      if (isObject(value)) return isObject(value.note) ? value.note : value;
    }
  }
  const candidates = [
    isObject(root) && isObject(root.noteData) && isObject(root.noteData.data) ? root.noteData.data.noteData : undefined,
    isObject(root) && isObject(root.LAUNCHER_SSR_STORE_PAGE_DATA) ? root.LAUNCHER_SSR_STORE_PAGE_DATA.noteData : undefined,
    isObject(root) ? root.note : undefined,
  ];
  for (const candidate of candidates) if (isNote(candidate)) return candidate;
  const found = findRecursive(root, isNote, 7);
  return isObject(found) ? found : null;
}

function isNote(node: unknown): node is Record<string, unknown> {
  if (!isObject(node) || !("id" in node || "noteId" in node || "note_id" in node)) return false;
  return ["title", "desc", "description", "imageList", "video", "videoInfo"].some((field) => field in node);
}

function parseAuthor(node: unknown): VideoAuthor | null {
  if (!isObject(node)) return null;
  return {
    id: textValue(node, "userId", "user_id", "id"),
    nickname: textValue(node, "nickname", "nickName", "name"),
    avatarUrl: normalizeMediaUrl(firstNotBlank(textValue(node, "avatar", "avatarUrl", "image"), findUrl(node.avatarInfo, ["url", "urlDefault"], 4))),
  };
}

function parseMedia(note: Record<string, unknown>): VideoMedia | null {
  const imageNodes = firstExisting(note, "imageList", "images", "image_list");
  const images = Array.isArray(imageNodes) ? imageNodes : [];
  const imageUrls = [...new Set(images.map(findImageUrl).filter((url): url is string => Boolean(url)))];
  let videoNode = firstExisting(note, "video", "videoInfo");
  if (!videoNode) videoNode = images.find((image) => findFirstVideoStream(image));
  const videoUrl = findVideoUrl(videoNode);
  if (videoUrl) {
    const stream = findFirstVideoStream(videoNode);
    return {
      mediaType: "VIDEO",
      coverUrl: imageUrls[0] ?? findUrl(videoNode, ["urlDefault", "urlPre", "url", "src", "originalUrl"], 5),
      videoUrl,
      imageUrls: imageUrls.length ? imageUrls : null,
      durationMs: numberValue(videoNode, "duration", "durationMs", "videoDuration") ?? numberValue(stream, "duration", "durationMs", "videoDuration"),
      width: numberValue(videoNode, "width") ?? numberValue(stream, "width"),
      height: numberValue(videoNode, "height") ?? numberValue(stream, "height"),
    };
  }
  if (!imageUrls.length) return null;
  return {
    mediaType: "IMAGE",
    coverUrl: imageUrls[0] ?? null,
    videoUrl: null,
    imageUrls,
    durationMs: null,
    width: numberValue(images[0], "width"),
    height: numberValue(images[0], "height"),
  };
}

function findImageUrl(node: unknown): string | null {
  return normalizeMediaUrl(firstNotBlank(textValue(node, "urlDefault", "urlPre", "url", "src", "originalUrl"), findUrl(node, ["urlDefault", "urlPre", "url", "src", "originalUrl"], 5)));
}

function findVideoUrl(node: unknown): string | null {
  if (!node) return null;
  const stream = findFirstVideoStream(node);
  const streamUrl = firstNotBlank(textValue(stream, "masterUrl", "url"), isObject(stream) ? firstUrlFromArray(stream.backupUrls) : null);
  if (looksLikeUrl(streamUrl)) return normalizeMediaUrl(streamUrl);
  return normalizeMediaUrl(firstNotBlank(textValue(node, "masterUrl", "videoUrl", "url"), findUrlByField(node, ["masterUrl", "videoUrl"], 6)));
}

function findFirstVideoStream(node: unknown): Record<string, unknown> | null {
  if (!isObject(node)) return null;
  const media = isObject(node.media) ? node.media : undefined;
  const stream = isObject(media?.stream) ? media.stream : isObject(node.stream) ? node.stream : undefined;
  if (!stream) return null;
  for (const codec of ["h264", "h265", "h266", "av1"]) {
    const entries = stream[codec];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (isObject(entry) && (looksLikeUrl(textValue(entry, "masterUrl", "url")) || firstUrlFromArray(entry.backupUrls))) return entry;
    }
  }
  return null;
}

function findUrlByField(node: unknown, fields: string[], maxDepth: number): string | null {
  if (maxDepth <= 0) return null;
  if (isObject(node)) {
    for (const field of fields) if (looksLikeUrl(node[field])) return node[field] as string;
  }
  for (const child of values(node)) {
    const found = findUrlByField(child, fields, maxDepth - 1);
    if (found) return found;
  }
  return null;
}
