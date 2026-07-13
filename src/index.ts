import { AppError, invalidUrl } from "./errors";
import { downloadImages, downloadVideo } from "./download";
import { extractVideo } from "./extract";
import type { DownloadImagesRequest, DownloadVideoRequest, Env, ExtractRequest } from "./types";

const API_PREFIX = "/api/videos";
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type,Range",
  "access-control-expose-headers": "Content-Disposition,Content-Length,Content-Range,Accept-Ranges",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const traceId = crypto.randomUUID();
    try {
      if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
      const url = new URL(request.url);

      if (url.pathname === `${API_PREFIX}/extract`) {
        requireMethod(request, "POST");
        const body = await readJson<ExtractRequest>(request);
        return json(await extractVideo(body.url, body.forceRefresh === true, env, ctx));
      }

      if (url.pathname === `${API_PREFIX}/download`) {
        if (request.method === "GET") {
          const platform = url.searchParams.get("platform")?.toUpperCase();
          return withCors(await downloadVideo({ url: url.searchParams.get("url") || "", platform } as DownloadVideoRequest, env, request.headers.get("range")));
        }
        requireMethod(request, "POST");
        return withCors(await downloadVideo(await readJson<DownloadVideoRequest>(request), env, request.headers.get("range")));
      }

      if (url.pathname === `${API_PREFIX}/images/download`) {
        requireMethod(request, "POST");
        return withCors(await downloadImages(await readJson<DownloadImagesRequest>(request), env));
      }

      // /api/videos/bilibili/download is intentionally not migrated: Workers cannot run ffmpeg.
      throw new AppError("NOT_FOUND", "接口不存在", 404, url.pathname);
    } catch (error) {
      return errorResponse(error, traceId);
    }
  },
} satisfies ExportedHandler<Env>;

function requireMethod(request: Request, expected: string): void {
  if (request.method !== expected) throw new AppError("METHOD_NOT_ALLOWED", "请求方法不支持", 405, `请使用 ${expected}`);
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw invalidUrl("请求体必须是有效的 JSON");
  }
}

function json(value: unknown, status = 200): Response {
  return withCors(Response.json(value, { status }));
}

function withCors(response: Response): Response {
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(CORS_HEADERS)) result.headers.set(name, value);
  return result;
}

function errorResponse(error: unknown, traceId: string): Response {
  const appError = error instanceof AppError
    ? error
    : new AppError("INTERNAL_ERROR", "服务器内部错误", 500, error instanceof Error ? error.message : String(error));
  return json({
    code: appError.code,
    message: appError.message,
    detail: appError.detail,
    platform: appError.platform ?? null,
    url: appError.url ?? null,
    traceId,
    timestamp: new Date().toISOString(),
  }, appError.status);
}

