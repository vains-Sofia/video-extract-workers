# video-extract-worker

基于 Cloudflare Workers 的短视频内容解析与下载代理服务。项目使用 TypeScript 编写，支持解析抖音、小红书、Bilibili 页面中的作品信息，并提供视频直链代理下载、图片批量打包下载和短链重定向解析接口。

## 功能

- 解析抖音、小红书、Bilibili 的公开作品链接
- 返回标题、描述、作者、封面、视频流、图片列表等元数据
- 支持短链或分享文案中的 URL 标准化与平台识别
- 使用 Cloudflare Workers KV 缓存解析结果
- 提供视频代理下载接口，支持 `Range` 请求
- 提供图片列表打包为 ZIP 的下载接口
- 统一 JSON 错误响应和 CORS 响应头

## 技术栈

- Cloudflare Workers
- TypeScript
- Wrangler
- Vitest

## 项目结构

```text
src/
  index.ts                 # Worker 入口与路由
  extract.ts               # 平台识别、缓存与解析调度
  download.ts              # 视频代理下载和图片 ZIP 下载
  errors.ts                # 应用错误类型
  types.ts                 # 请求、响应和环境变量类型
  utils.ts                 # URL、HTTP、JSON 提取等通用工具
  zip.ts                   # 无压缩 ZIP 生成
  platforms/
    douyin.ts              # 抖音解析
    xiaohongshu.ts         # 小红书解析
    bilibili.ts            # Bilibili 解析
```

## 快速开始

### 安装依赖

```bash
npm install
```

项目仓库中同时存在 `package-lock.json` 和 `pnpm-lock.yaml`。如果团队统一使用 pnpm，也可以改用：

```bash
pnpm install
```

### 本地开发

```bash
npm run dev
```

Wrangler 默认会启动本地 Worker 服务，通常地址为 `http://localhost:8787`。

### 类型检查与测试

```bash
npm run typecheck
npm test
```

### 部署

```bash
npm run deploy
```

## 配置

基础配置在 `wrangler.toml` 中：

```toml
name = "video-extract"
main = "src/index.ts"
compatibility_date = "2026-07-13"
workers_dev = true

[[kv_namespaces]]
binding = "EXTRACT_VIDEO"
id = "2efda71c4d9b413e96293937a860d43e"

[vars]
CACHE_TTL_SECONDS = "3600"
FETCH_TIMEOUT_MS = "10000"
MAX_IMAGE_COUNT = "20"
MAX_IMAGE_BYTES = "26214400"
```

解析结果存储在名为 `extract-video` 的 Workers KV namespace 中，Worker 内通过 `EXTRACT_VIDEO` 绑定访问。

可用环境变量：

| 变量 | 说明 | 默认值 |
|---|---|---:|
| `CACHE_TTL_SECONDS` | 解析结果缓存秒数 | `3600` |
| `FETCH_TIMEOUT_MS` | 上游平台请求超时时间，毫秒 | `10000` |
| `MAX_IMAGE_COUNT` | 单次图片打包最大数量 | `20` |
| `MAX_IMAGE_BYTES` | 单次图片打包总大小上限，字节 | `26214400` |
| `USER_AGENT` | 自定义上游请求 User-Agent | 内置移动端 UA |
| `DOUYIN_COOKIE` | 抖音请求 Cookie | 空 |
| `XIAOHONGSHU_COOKIE` | 小红书请求 Cookie | 空 |
| `BILIBILI_COOKIE` | Bilibili 请求 Cookie | 空 |

Cookie 不应写入 `wrangler.toml`，请使用 Wrangler secret：

```bash
npx wrangler secret put DOUYIN_COOKIE
npx wrangler secret put XIAOHONGSHU_COOKIE
npx wrangler secret put BILIBILI_COOKIE
```

## API

所有接口前缀为 `/api/videos`。

### 解析作品信息

```http
POST /api/videos/extract
Content-Type: application/json

{
  "url": "https://v.douyin.com/xxxx/",
  "forceRefresh": false
}
```

响应示例：

```json
{
  "platform": "DOUYIN",
  "videoId": "7348567890123456",
  "title": "作品标题",
  "description": "作品描述",
  "originalUrl": "https://v.douyin.com/xxxx/",
  "resolvedUrl": "https://www.douyin.com/video/7348567890123456",
  "author": {
    "id": "MS4wLjABAAAA...",
    "nickname": "作者昵称",
    "avatarUrl": "https://..."
  },
  "media": {
    "mediaType": "VIDEO",
    "coverUrl": "https://...",
    "videoUrl": "https://...",
    "durationMs": 15000,
    "width": 1080,
    "height": 1920
  },
  "cached": false,
  "extractedAt": "2026-07-13T06:00:00.000Z"
}
```

### 解析重定向地址

```http
GET /api/videos/redirect?url=https%3A%2F%2Fv.douyin.com%2Fxxxx%2F
```

响应示例：

```json
{
  "url": "https://www.douyin.com/video/7348567890123456"
}
```

### 下载视频

GET 方式：

```http
GET /api/videos/download?url=https%3A%2F%2Fexample.com%2Fvideo.mp4&platform=DOUYIN
```

POST 方式：

```http
POST /api/videos/download
Content-Type: application/json

{
  "url": "https://example.com/video.mp4",
  "platform": "DOUYIN"
}
```

`platform` 可选，取值为 `DOUYIN`、`XIAOHONGSHU`、`BILIBILI`。接口会透传上游响应体，并设置下载文件名、内容类型和常用断点续传响应头。

### 下载图片 ZIP

```http
POST /api/videos/images/download
Content-Type: application/json

{
  "imageUrls": [
    "https://example.com/image-1.jpg",
    "https://example.com/image-2.jpg"
  ],
  "filename": "images.zip",
  "platform": "XIAOHONGSHU"
}
```

响应内容类型为 `application/zip`。

## 支持的链接

- 抖音：`douyin.com`、`v.douyin.com`、`iesdouyin.com`
- 小红书：`xiaohongshu.com`、`xhslink.com`
- Bilibili：`bilibili.com`、`b23.tv`

服务会拒绝本地地址、私有网段地址和非 HTTP/HTTPS URL，避免被用作内网请求代理。

## 错误响应

```json
{
  "code": "UNSUPPORTED_PLATFORM",
  "message": "不支持的平台或链接格式",
  "detail": "不支持的平台或链接格式: https://example.com/video",
  "platform": null,
  "url": null,
  "traceId": "abc-123-def",
  "timestamp": "2026-07-13T06:00:00.000Z"
}
```

常见错误码：

| 错误码 | HTTP 状态码 | 说明 |
|---|---:|---|
| `INVALID_URL` | 400 | URL 为空、格式无效或指向不允许访问的地址 |
| `UNSUPPORTED_PLATFORM` | 400 | 链接不属于当前支持的平台 |
| `METHOD_NOT_ALLOWED` | 405 | 请求方法不匹配 |
| `PLATFORM_FETCH_FAILED` | 502 | 请求上游平台失败 |
| `PLATFORM_PARSE_FAILED` | 502 | 上游页面结构无法解析 |
| `NOT_FOUND` | 404 | 接口不存在 |
| `INTERNAL_ERROR` | 500 | 未处理的服务端错误 |

## 限制

- Worker 环境不能运行 ffmpeg，因此 Bilibili 音视频分离流不会在服务端合并。
- 平台页面结构、反爬策略和登录要求可能变化，解析结果依赖公开页面可访问性。
- 返回的媒体 URL 可能有时效，建议尽快使用。
- 本项目仅用于学习和研究公开可访问内容的元数据提取，请遵守目标平台条款和版权要求。
