# 短视频内容提取服务

基于 Spring Boot 的短视频平台内容提取服务，支持抖音等主流短视频平台的视频信息提取。

## 功能特性

- ✅ 统一的 RESTful API 接口
- ✅ 支持抖音短链和标准链接解析
- ✅ 提取视频标题、文案、作者、封面、视频地址等信息
- ✅ Redis 缓存支持（1小时 TTL）
- ✅ 完整的异常处理和错误码
- ✅ 可扩展的平台适配器架构

## 技术栈

- **Spring Boot**: 4.1.0
- **Java**: 25
- **Redis**: 缓存层
- **Jsoup**: HTML 解析
- **Lombok**: 简化代码

## 快速开始

### 前置要求

- JDK 25+
- Maven 3.6+
- Redis 服务器

### 启动 Redis

```bash
# 使用 Docker
docker run -d -p 6379:6379 redis:latest

# 或使用本地 Redis
redis-server
```

### 编译项目

```bash
./mvnw clean compile
```

### 运行项目

```bash
./mvnw spring-boot:run
```

服务默认运行在 `http://localhost:8080`

## API 使用

### 提取视频信息

**请求：**

```http
POST /api/videos/extract
Content-Type: application/json

{
  "url": "https://v.douyin.com/xxxx/",
  "forceRefresh": false
}
```

**响应示例：**

```json
{
  "platform": "DOUYIN",
  "videoId": "7348567890123456",
  "title": "这是一个很有趣的视频...",
  "description": "这是一个很有趣的视频，快来看看吧！#热门 #搞笑",
  "originalUrl": "https://v.douyin.com/xxxx/",
  "resolvedUrl": "https://www.douyin.com/video/7348567890123456",
  "author": {
    "id": "MS4wLjABAAAA...",
    "nickname": "用户昵称",
    "avatarUrl": "https://..."
  },
  "media": {
    "coverUrl": "https://...",
    "videoUrl": "https://...",
    "durationMs": 15000,
    "width": 1080,
    "height": 1920
  },
  "cached": false,
  "extractedAt": "2026-06-16T18:00:00"
}
```

### 支持的 URL 格式

**抖音：**
- 短链：`https://v.douyin.com/xxxx/`
- 标准链接：`https://www.douyin.com/video/{videoId}`
- 分享链接：`https://www.iesdouyin.com/share/video/{videoId}`
- 支持从分享文案中提取 URL

### 错误响应

```json
{
  "code": "UNSUPPORTED_PLATFORM",
  "message": "不支持的平台或链接格式",
  "detail": "不支持的平台或链接格式: https://example.com/video",
  "traceId": "abc-123-def"
}
```

### 错误码列表

| 错误码 | HTTP 状态 | 说明 |
|---|---:|---|
| `INVALID_URL` | 400 | URL 为空或格式非法 |
| `UNSUPPORTED_PLATFORM` | 400 | 不支持的平台 |
| `PLATFORM_FETCH_FAILED` | 502 | 请求平台失败 |
| `PLATFORM_PARSE_FAILED` | 502 | 页面解析失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 配置

### application.yaml

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379

video-extract:
  cache:
    enabled: true
    success-ttl: 1h
  http:
    connect-timeout: 3s
    read-timeout: 8s
    max-redirects: 5
    user-agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...)"
  douyin:
    enabled: true
    referer: "https://www.douyin.com/"
    cookie: "${DOUYIN_COOKIE:}"
```

### 环境变量

可以通过环境变量配置抖音 Cookie（可选）：

```bash
export DOUYIN_COOKIE="your_cookie_here"
./mvnw spring-boot:run
```

## 架构设计

### 核心组件

```
com.basic.videoextract
├── api                    # API 层：Controller + DTO
├── application           # 应用服务层：业务编排
├── domain                # 领域模型
├── extractor             # 平台适配器
│   ├── PlatformExtractor  # 平台适配器接口
│   ├── douyin            # 抖音实现
│   └── common            # 通用工具
├── infrastructure        # 基础设施
│   ├── http              # HTTP 客户端
│   ├── cache             # 缓存服务
│   └── config            # 配置
└── exception             # 异常处理
```

### 扩展新平台

添加新平台只需 3 步：

1. 创建新的 Extractor 实现 `PlatformExtractor` 接口
2. 添加 `@Component` 注解让 Spring 自动注入
3. 在 `application.yaml` 中添加平台配置

**示例（快手）：**

```java
@Component
public class KuaishouExtractor implements PlatformExtractor {
    @Override
    public Platform platform() {
        return Platform.KUAISHOU;
    }

    @Override
    public boolean supports(String url) {
        // 判断是否为快手链接
        return url.contains("kuaishou.com");
    }

    @Override
    public ExtractResult extract(ExtractContext context) {
        // 实现快手提取逻辑
        return null;
    }
}
```

## 缓存策略

- **成功结果**：缓存 1 小时
- **缓存键**：
  - `video-extract:{platform}:{videoId}`
  - `video-extract:url:{sha256(url)}`
- **多级缓存**：同时缓存 originalUrl 和 resolvedUrl

## 风险与限制

### 平台反爬

- 频繁请求可能被限流
- 部分内容可能需要登录
- 建议合理使用缓存减少请求

### 页面结构变化

- 平台页面结构可能随时变化
- 解析逻辑采用多策略兜底
- 失败时会返回详细错误信息

### 视频 URL 时效性

- 返回的视频地址可能有时效性
- 缓存时间设置为 1 小时
- 建议及时使用或定期刷新

## 开发指南

### 运行测试

```bash
./mvnw test
```

### 查看诊断信息

```bash
# 检查依赖
./mvnw dependency:tree

# 查看有效配置
./mvnw spring-boot:run -Dspring-boot.run.arguments=--debug
```

## 许可证

本项目仅用于学习和研究目的。使用者应遵守相关平台的使用条款和版权要求。

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意：** 本服务仅提取公开可访问内容的元数据和媒体链接，不绕过登录、权限、验证码或 DRM。
