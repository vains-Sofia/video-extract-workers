export type Platform = "DOUYIN" | "XIAOHONGSHU" | "BILIBILI";

export interface Env {
  EXTRACT_VIDEO: KVNamespace;
  DOUYIN_COOKIE?: string;
  XIAOHONGSHU_COOKIE?: string;
  BILIBILI_COOKIE?: string;
  USER_AGENT?: string;
  CACHE_TTL_SECONDS?: string;
  FETCH_TIMEOUT_MS?: string;
  MAX_IMAGE_COUNT?: string;
  MAX_IMAGE_BYTES?: string;
}

export interface VideoAuthor {
  id: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface MediaStream {
  streamType: "video" | "audio";
  qualityId?: number | null;
  qualityLabel?: string | null;
  codecId?: number | null;
  codecs?: string | null;
  width?: number | null;
  height?: number | null;
  frameRate?: number | null;
  bandwidth?: number | null;
  mimeType?: string | null;
  url: string;
  backupUrls?: string[];
}

export interface VideoMedia {
  mediaType: "VIDEO" | "IMAGE";
  coverUrl: string | null;
  videoUrl: string | null;
  videoUrls?: string[] | null;
  streams?: MediaStream[] | null;
  imageUrls?: string[] | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
}

export interface ExtractResult {
  platform: Platform;
  videoId: string | null;
  title: string | null;
  description: string | null;
  originalUrl: string;
  resolvedUrl: string;
  author: VideoAuthor | null;
  media: VideoMedia | null;
  cached: boolean;
  extractedAt: string;
}

export interface ExtractRequest {
  url: string;
  forceRefresh?: boolean;
}

export interface DownloadVideoRequest {
  url: string;
  platform?: Platform;
}

export interface DownloadImagesRequest {
  imageUrls: string[];
  filename?: string;
  platform?: Platform;
}
