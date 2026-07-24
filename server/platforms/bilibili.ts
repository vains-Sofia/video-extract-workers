import { platformParseFailed } from "../errors";
import type { Env, ExtractResult, MediaStream, VideoAuthor, VideoMedia } from "../types";
import {
  atPath,
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
  numberAtPath,
  numberValue,
  platformHeaders,
  supportsHost,
  textValue,
  truncateTitle,
  values,
} from "../utils";

const DOMAINS = ["bilibili.com", "b23.tv"] as const;
const BVID = /\/video\/(BV[0-9A-Za-z]+)/;
const AVID = /\/video\/av(\d+)/i;

export function supportsBilibili(url: string): boolean {
  return supportsHost(url, DOMAINS);
}

export function extractBilibiliVideoId(url: string): string | null {
  const bv = BVID.exec(url)?.[1];
  if (bv) return bv;
  const av = AVID.exec(url)?.[1];
  return av ? `av${av}` : null;
}

export function parseBilibiliPage(html: string, url = ""): Record<string, unknown> {
  const initialState = extractAssignedJson(html, "__INITIAL_STATE__");
  const playInfo = extractAssignedJson(html, "__playinfo__");
  if (initialState === null && playInfo === null) {
    throw platformParseFailed(
      "无法解析 Bilibili 页面数据",
      "未找到有效的 __INITIAL_STATE__ 或 __playinfo__ 数据",
      "BILIBILI",
      url,
    );
  }
  return {
    ...(initialState !== null ? { initialState } : {}),
    ...(playInfo !== null ? { playInfo } : {}),
  };
}

export function parseBilibiliPayload(data: unknown, resolvedUrl: string): Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt"> {
  const initialState = firstExisting(data, "initialState", "__INITIAL_STATE__");
  const playInfo = firstExisting(data, "playInfo", "__playinfo__");
  const videoData = findVideoData(initialState);
  if (!videoData && !playInfo) {
    throw platformParseFailed("无法找到 Bilibili 视频详情", "未找到 videoData 或 playInfo", "BILIBILI", resolvedUrl);
  }
  let videoId = firstNotBlank(textValue(videoData, "bvid", "aid"), textValue(initialState, "bvid", "aid"));
  if (videoId && !/^BV|^av/i.test(videoId)) videoId = `av${videoId}`;
  const title = firstNotBlank(textValue(videoData, "title"), textValue(initialState, "title"));
  return {
    platform: "BILIBILI",
    videoId,
    title: truncateTitle(title),
    description: firstNotBlank(textValue(videoData, "desc", "description"), title),
    resolvedUrl,
    author: parseAuthor(videoData),
    media: parseMedia(videoData, playInfo, initialState),
  };
}

export async function extractBilibili(url: string, env: Env): Promise<Omit<ExtractResult, "originalUrl" | "cached" | "extractedAt">> {
  const response = await fetchUpstream(
    url,
    { headers: platformHeaders("BILIBILI", env, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") },
    env,
    "BILIBILI",
  );
  const resolvedUrl = response.url || url;
  const result = parseBilibiliPayload(parseBilibiliPage(await response.text(), resolvedUrl), resolvedUrl);
  if (!extractBilibiliVideoId(resolvedUrl) && result.videoId) {
    result.resolvedUrl = `https://www.bilibili.com/video/${result.videoId.toLowerCase().startsWith("av") ? result.videoId.toLowerCase() : result.videoId}`;
  }
  return result;
}

function findVideoData(initialState: unknown): Record<string, unknown> | null {
  if (!isObject(initialState)) return null;
  for (const candidate of [initialState.videoData, initialState.result]) if (isVideoData(candidate)) return candidate;
  const found = findRecursive(initialState, isVideoData, 6);
  return isObject(found) ? found : null;
}

function isVideoData(node: unknown): node is Record<string, unknown> {
  return isObject(node)
    && ("bvid" in node || "aid" in node)
    && ("title" in node || "owner" in node || "pages" in node);
}

function parseAuthor(videoData: unknown): VideoAuthor | null {
  const owner = firstExisting(videoData, "owner", "author");
  if (!isObject(owner)) return null;
  return {
    id: textValue(owner, "mid", "id"),
    nickname: textValue(owner, "name", "nickname"),
    avatarUrl: normalizeMediaUrl(textValue(owner, "face", "avatar", "avatarUrl")),
  };
}

function parseMedia(videoData: unknown, playInfo: unknown, initialState: unknown): VideoMedia {
  const pages = isObject(videoData) && Array.isArray(videoData.pages) ? videoData.pages : [];
  const firstPage = pages[0];
  const data = isObject(playInfo) && isObject(playInfo.data) ? playInfo.data : playInfo;
  const streams = parseStreams(data);
  const videoUrls = selectBestUrls(data);
  const pageFallback = findPlayUrlInfo(initialState);
  const videoUrl = firstNotBlank(videoUrls[0], findLegacyVideoUrl(data), pageFallback);
  let durationMs = numberValue(videoData, "duration");
  durationMs = durationMs === null
    ? numberValue(playInfo, "timelength", "duration") ?? numberAtPath(playInfo, "data", "timelength") ?? numberAtPath(playInfo, "data", "duration")
    : durationMs * 1000;
  return {
    mediaType: "VIDEO",
    coverUrl: normalizeMediaUrl(firstNotBlank(textValue(videoData, "pic", "cover"), findUrl(playInfo, ["cover", "pic"], 4))),
    videoUrl,
    videoUrls: videoUrls.length ? videoUrls : null,
    streams: streams.length ? streams : null,
    durationMs,
    width: numberAtPath(firstPage, "dimension", "width") ?? numberAtPath(playInfo, "data", "dimension", "width"),
    height: numberAtPath(firstPage, "dimension", "height") ?? numberAtPath(playInfo, "data", "dimension", "height"),
  };
}

function parseStreams(data: unknown): MediaStream[] {
  if (!isObject(data)) return [];
  const result: MediaStream[] = [];
  if (isObject(data.dash)) {
    const dash = data.dash;
    if (Array.isArray(dash.video)) {
      for (const item of dash.video) {
        const stream = toStream(item, "video");
        if (stream) result.push(stream);
      }
    }
    const audioGroups = [dash.audio, isObject(dash.dolby) ? dash.dolby.audio : undefined];
    for (const group of audioGroups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        const stream = toStream(item, "audio");
        if (stream) result.push(stream);
      }
    }
    const flac = isObject(dash.flac) ? dash.flac.audio : undefined;
    const flacStream = toStream(flac, "audio");
    if (flacStream) result.push(flacStream);
  }
  if (Array.isArray(data.durl)) {
    for (const item of data.durl) {
      const stream = toStream(item, "video");
      if (stream) result.push(stream);
    }
  }
  return result;
}

function toStream(node: unknown, streamType: "video" | "audio"): MediaStream | null {
  if (!isObject(node)) return null;
  const url = normalizeMediaUrl(firstNotBlank(textValue(node, "baseUrl", "base_url", "url"), firstUrlFromArray(firstExisting(node, "backupUrl", "backup_url"))));
  if (!url) return null;
  const qualityId = numberValue(node, "id");
  return {
    streamType,
    qualityId,
    qualityLabel: streamType === "video" ? videoQualityLabel(qualityId) : audioQualityLabel(qualityId),
    codecId: numberValue(node, "codecid"),
    codecs: textValue(node, "codecs"),
    width: numberValue(node, "width"),
    height: numberValue(node, "height"),
    frameRate: parseFrameRate(textValue(node, "frameRate", "frame_rate")),
    bandwidth: numberValue(node, "bandwidth"),
    mimeType: textValue(node, "mimeType", "mime_type"),
    url,
    backupUrls: backupUrls(node),
  };
}

function selectBestUrls(data: unknown): string[] {
  if (!isObject(data)) return [];
  if (Array.isArray(data.durl)) return unique(data.durl.map((item) => mediaUrl(item)));
  if (!isObject(data.dash)) return [];
  const videos = Array.isArray(data.dash.video) ? data.dash.video.filter(isObject) : [];
  videos.sort((a, b) => (numberValue(b, "id") ?? 0) - (numberValue(a, "id") ?? 0) || codecRank(numberValue(a, "codecid")) - codecRank(numberValue(b, "codecid")));
  const audios = [
    ...(Array.isArray(data.dash.audio) ? data.dash.audio : []),
    ...(isObject(data.dash.dolby) && Array.isArray(data.dash.dolby.audio) ? data.dash.dolby.audio : []),
    ...(isObject(data.dash.flac) && isObject(data.dash.flac.audio) ? [data.dash.flac.audio] : []),
  ].filter(isObject);
  audios.sort((a, b) => audioRank(numberValue(a, "id")) - audioRank(numberValue(b, "id")));
  return unique([mediaUrl(videos[0]), mediaUrl(audios[0])]);
}

function findLegacyVideoUrl(data: unknown): string | null {
  if (!isObject(data)) return null;
  if (Array.isArray(data.durl)) {
    for (const item of data.durl) {
      const url = mediaUrl(item);
      if (url) return url;
    }
  }
  return findUrl(data, ["baseUrl", "base_url", "url"], 5);
}

function findPlayUrlInfo(initialState: unknown): string | null {
  const items = atPath(initialState, "video", "playUrlInfo");
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    const url = firstNotBlank(textValue(item, "url"), isObject(item) ? firstUrlFromArray(item.backup_url) : null);
    if (looksLikeUrl(url)) return normalizeMediaUrl(url);
  }
  return null;
}

function mediaUrl(node: unknown): string | null {
  return normalizeMediaUrl(firstNotBlank(textValue(node, "baseUrl", "base_url", "url"), isObject(node) ? firstUrlFromArray(firstExisting(node, "backupUrl", "backup_url")) : null));
}

function backupUrls(node: Record<string, unknown>): string[] {
  const items = firstExisting(node, "backupUrl", "backup_url");
  return Array.isArray(items) ? items.filter(looksLikeUrl).map((url) => normalizeMediaUrl(url) as string) : [];
}

function unique(items: Array<string | null>): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item)))];
}

function codecRank(codecId: number | null): number {
  const index = [7, 12, 13].indexOf(codecId ?? -1);
  return index < 0 ? 99 : index;
}

function audioRank(qualityId: number | null): number {
  const index = [30280, 30232, 30216, 30251, 30250].indexOf(qualityId ?? -1);
  return index < 0 ? 3 : index;
}

function parseFrameRate(value: string | null): number | null {
  if (!value) return null;
  if (value.includes("/")) {
    const [top, bottom] = value.split("/").map(Number);
    return top !== undefined && bottom ? Math.round(top / bottom) : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function videoQualityLabel(id: number | null): string | null {
  const labels: Record<number, string> = { 127: "8K 超高清", 126: "杜比视界", 125: "HDR 真彩", 120: "4K 超清", 116: "1080P60", 112: "1080P+", 80: "1080P", 74: "720P60", 64: "720P", 32: "480P", 16: "360P" };
  return id === null ? null : labels[id] ?? String(id);
}

function audioQualityLabel(id: number | null): string | null {
  const labels: Record<number, string> = { 30280: "192K", 30232: "132K", 30216: "64K", 30251: "Hi-Res 无损", 30250: "杜比全景声" };
  return id === null ? null : labels[id] ?? String(id);
}
