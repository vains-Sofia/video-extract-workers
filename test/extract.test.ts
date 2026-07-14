import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractDouyin } from "../src/platforms/douyin";
import { extractVideo } from "../src/extract";
import type { Env, ExtractResult } from "../src/types";

vi.mock("../src/platforms/douyin", () => ({
  supportsDouyin: (url: string) => url.includes("douyin.com"),
  extractDouyin: vi.fn(),
}));

const url = "https://www.douyin.com/video/123";
const extracted = {
  platform: "DOUYIN" as const,
  videoId: "123",
  title: "title",
  description: "description",
  resolvedUrl: url,
  author: null,
  media: null,
};

function createEnv(getResult: ExtractResult | null = null): {
  env: Env;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  const get = vi.fn().mockResolvedValue(getResult);
  const put = vi.fn().mockResolvedValue(undefined);
  return {
    env: {
      EXTRACT_VIDEO: { get, put } as unknown as KVNamespace,
      CACHE_TTL_SECONDS: "600",
    },
    get,
    put,
  };
}

describe("extractVideo KV cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractDouyin).mockResolvedValue(extracted);
  });

  it("returns a cached KV value without calling the extractor", async () => {
    const cached: ExtractResult = {
      ...extracted,
      originalUrl: url,
      cached: false,
      extractedAt: "2026-07-14T00:00:00.000Z",
    };
    const { env, get, put } = createEnv(cached);

    const result = await extractVideo(url, false, env);

    expect(result).toEqual({ ...cached, cached: true });
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/^extract:douyin:[a-f0-9]{64}$/), "json");
    expect(extractDouyin).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("writes fresh results to KV with the configured TTL", async () => {
    const { env, get, put } = createEnv();

    const result = await extractVideo(url, false, env);

    expect(get).toHaveBeenCalledOnce();
    expect(extractDouyin).toHaveBeenCalledWith(url, env);
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^extract:douyin:[a-f0-9]{64}$/),
      JSON.stringify(result),
      { expirationTtl: 600 },
    );
  });

  it("skips the KV read when force refresh is requested", async () => {
    const { env, get } = createEnv();

    await extractVideo(url, true, env);

    expect(get).not.toHaveBeenCalled();
    expect(extractDouyin).toHaveBeenCalledOnce();
  });
});
