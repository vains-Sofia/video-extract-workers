import type { Platform } from "./types";

export type ErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PLATFORM"
  | "PLATFORM_FETCH_FAILED"
  | "PLATFORM_PARSE_FAILED"
  | "METHOD_NOT_ALLOWED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly detail: string = message,
    public readonly platform?: Platform,
    public readonly url?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const invalidUrl = (message: string, detail = message): AppError =>
  new AppError("INVALID_URL", message, 400, detail);

export const unsupportedPlatform = (url: string): AppError =>
  new AppError("UNSUPPORTED_PLATFORM", "不支持的平台或链接格式", 400, `不支持的平台或链接格式: ${url}`);

export const platformFetchFailed = (message: string, platform?: Platform, url?: string): AppError =>
  new AppError("PLATFORM_FETCH_FAILED", message, 502, message, platform, url);

export const platformParseFailed = (message: string, detail: string, platform?: Platform, url?: string): AppError =>
  new AppError("PLATFORM_PARSE_FAILED", message, 502, detail, platform, url);
