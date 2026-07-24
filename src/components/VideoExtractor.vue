<template>
  <div class="video-extractor">
    <!-- 头部标题 -->
    <header class="header">
      <h1 class="title">
        <span class="title-icon" aria-hidden="true">
          <img width="100%" height="100%" src="/logo.png"/>
          <!--          <svg width="42" height="42" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">-->
          <!--            <rect x="8" y="12" width="32" height="24" rx="9" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="2.5"/>-->
          <!--            <path d="M20 19.5L29 24L20 28.5V19.5Z" fill="#2563EB"/>-->
          <!--            <path d="M14 11L18 6M34 11L30 6" stroke="#1D4ED8" stroke-width="2.5" stroke-linecap="round"/>-->
          <!--            <circle cx="17" cy="38" r="2" fill="#60A5FA"/>-->
          <!--            <circle cx="31" cy="38" r="2" fill="#60A5FA"/>-->
          <!--          </svg>-->
        </span>
        <span class="title-text">视频提取工具</span>
      </h1>
      <p class="subtitle">免费在线短视频提取工具，当前支持{{ supportedPlatformNames }}平台，无需登录，一键获取高清内容。</p>

      <div class="feature-row" aria-label="产品特点">
        <span class="feature-item">
          <span class="check-icon">✓</span>
          免费使用
        </span>
        <span class="feature-item">
          <span class="check-icon">✓</span>
          无需登录
        </span>
        <span class="feature-item">
          <span class="check-icon">✓</span>
          高清解析
        </span>
        <span class="feature-item">
          <span class="check-icon">✓</span>
          可扩展多平台
        </span>
      </div>
    </header>

    <!-- 输入区域 -->
    <div class="input-section">
      <label class="input-label" for="video-url">
        <span class="required-mark">*</span>
        请输入短视频分享链接
      </label>
      <div class="input-wrapper" :class="{ focused: isFocused, error: inputError }">
        <div class="input-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <input
            id="video-url"
            v-model="videoUrl"
            type="text"
            class="video-input"
            :placeholder="currentPlaceholder"
            autocomplete="off"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @input="handleInput"
            @keydown.enter="handleExtract"
        />
        <button
            v-if="videoUrl"
            class="clear-btn"
            @click="clearInput"
            title="清空"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button
            v-if="!videoUrl"
            class="paste-btn"
            @click="pasteFromClipboard"
            title="从剪切板粘贴"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor"
                  stroke-width="2"/>
          </svg>
        </button>
      </div>

      <p v-if="inputError" class="error-message">{{ inputError }}</p>

      <!-- 平台选择器 -->
      <div class="platform-section">
        <p class="platform-title">支持平台列表如下：</p>
        <div class="platform-selector">
          <div
              v-for="platform in platforms"
              :key="platform.id"
              :class="['platform-badge', { active: selectedPlatform?.id === platform.id }]"
              @click="selectPlatform(platform)"
          >
            <span class="platform-icon" v-html="platform.logo"></span>
            <span class="platform-name">{{ platform.name }}</span>
          </div>
        </div>
      </div>

      <!-- 提取按钮 -->
      <button
          class="extract-btn"
          :class="{ loading: isLoading, disabled: !canExtract }"
          :disabled="!canExtract || isLoading"
          @click="handleExtract"
      >
        <span v-if="!isLoading" class="btn-content">
          <span>开始解析</span>
        </span>
        <span v-else class="btn-loading">
          <span class="spinner"></span>
          <span>提取中...</span>
        </span>
      </button>

      <nav class="footer-links" aria-label="辅助链接">
        <button type="button" class="footer-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
            <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          关于作者
        </button>
        <span class="footer-divider"></span>
        <button type="button" class="footer-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor"
                  stroke-width="2"/>
            <path d="M14 2v6h6M8 13h8M8 17h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          使用说明
        </button>
        <span class="footer-divider"></span>
        <button type="button" class="footer-link share-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="2"/>
            <circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            <circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="2"/>
            <path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          分享工具
        </button>
      </nav>
    </div>

    <!-- 错误提示 -->
    <transition name="fade">
      <div v-if="extractError" class="error-alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>{{ extractError }}</span>
        <button class="close-btn" @click="extractError = null">×</button>
      </div>
    </transition>

    <!-- 视频结果展示 -->
    <transition name="slide-up">
      <VideoResult
          v-if="videoData"
          :video-data="videoData"
          @close="videoData = null"
      />
    </transition>
  </div>
</template>

<script setup>
import {computed, ref} from 'vue'
import {extractVideo} from '../utils/api'
import {detectPlatform, getActivePlatforms, getSupportedPlatformNames} from '../utils/platformConfig'
import VideoResult from './VideoResult.vue'

// 响应式数据
const platforms = ref(getActivePlatforms())
const selectedPlatform = ref(platforms.value[0]) // 默认选择第一个平台
const videoUrl = ref('')
const isFocused = ref(false)
const isLoading = ref(false)
const inputError = ref(null)
const extractError = ref(null)
const videoData = ref(null)
const supportedPlatformNames = getSupportedPlatformNames()

// 计算属性
const currentPlaceholder = computed(() => {
  return selectedPlatform.value?.placeholder || '请输入视频分享链接'
})

const canExtract = computed(() => {
  return videoUrl.value.trim().length > 0 && !inputError.value
})

// 方法
const selectPlatform = (platform) => {
  selectedPlatform.value = platform
  inputError.value = null
  extractError.value = null
}

const handleInput = () => {
  inputError.value = null
  extractError.value = null

  const url = videoUrl.value.trim()
  if (!url) return

  // 自动检测平台
  const detected = detectPlatform(url)
  if (detected && detected.id !== selectedPlatform.value.id) {
    selectedPlatform.value = detected
  }
}

const clearInput = () => {
  videoUrl.value = ''
  inputError.value = null
  extractError.value = null
  videoData.value = null
}

const extractUrlFromText = (text) => {
  if (!text) return null

  // 匹配 http:// 或 https:// 开头的 URL
  const urlRegex = /(https?:\/\/[^\s]+)/i
  const match = text.match(urlRegex)

  return match ? match[1] : null
}

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      videoUrl.value = text
      handleInput()
    }
  } catch (error) {
    console.error('读取剪切板失败:', error)
    inputError.value = '无法读取剪切板，请手动粘贴'
  }
}

const handleExtract = async () => {
  let url = videoUrl.value.trim()

  // 验证输入
  if (!url) {
    inputError.value = '请输入视频链接'
    return
  }

  // 从文本中提取 URL（支持粘贴完整分享文案）
  const extractedUrl = extractUrlFromText(url)
  if (extractedUrl) {
    url = extractedUrl
  }

  // 检测平台
  const detected = detectPlatform(url)
  if (!detected) {
    inputError.value = `暂不支持该平台，当前支持${supportedPlatformNames}`
    return
  }

  // 开始提取
  isLoading.value = true
  extractError.value = null
  videoData.value = null

  try {
    videoData.value = await extractVideo(url)

    // 成功提示动画
    setTimeout(() => {
      inputError.value = null
    }, 300)
  } catch (error) {
    extractError.value = error.message || '提取失败，请检查链接是否正确'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.video-extractor {
  width: min(100%, 760px);
  margin: 0 auto;
  animation: fadeIn 0.55s ease-out;
}

/* 头部 */
.header {
  text-align: center;
  margin-bottom: 2.75rem;
}

.title {
  font-size: clamp(2.15rem, 4vw, 3rem);
  font-weight: 800;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  letter-spacing: -0.04em;
  color: #0f172a;
}
.title img {
  position: relative;
  top: 10%;
}

.title-text {
  color: #0f172a;
}

.title-icon {
  width: 90px;
  height: 90px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: float 3s ease-in-out infinite;
  /* filter: drop-shadow(0 8px 18px rgba(37, 99, 235, 0.16)); */
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

.subtitle {
  max-width: 620px;
  margin: 0 auto;
  color: #475569;
  font-size: 1.0625rem;
  line-height: 1.75;
  animation: slideIn 0.8s ease-out 0.2s both;
  font-weight: 400;
}

.feature-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.35rem;
  color: #64748b;
  font-size: 0.9375rem;
  animation: slideIn 0.8s ease-out 0.3s both;
}

.feature-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}

.check-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #22c55e;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

/* 平台选择器 */
.platform-section {
  margin-top: 1.7rem;
  animation: slideIn 0.8s ease-out 0.45s both;
}

.platform-title {
  margin-bottom: 0.875rem;
  color: #334155;
  font-size: 0.9375rem;
  font-weight: 600;
}

.platform-selector {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.platform-badge {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.58rem 0.95rem;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 13px;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease;
  font-size: 0.9375rem;
  color: #1e293b;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.platform-badge:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.1);
  background: #fff;
}

.platform-badge.active {
  border-color: rgba(37, 99, 235, 0.34);
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.14);
}

.platform-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.platform-icon :deep(svg) {
  display: block;
}

.platform-name {
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* 输入区域 */
.input-section {
  animation: slideIn 0.8s ease-out 0.4s both;
}

.input-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.8rem;
  color: #1e293b;
  font-size: 0.9375rem;
  font-weight: 700;
}

.required-mark {
  color: #ef4444;
  font-weight: 800;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1.5px solid #dbe7f5;
  border-radius: 18px;
  padding: 1rem 1.15rem;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  min-height: 62px;
  max-height: 62px;
}

.input-wrapper:hover {
  border-color: #bfdbfe;
  box-shadow: 0 16px 38px rgba(37, 99, 235, 0.1);
}

.input-wrapper.focused {
  border-color: #93c5fd;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 16px 38px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.input-wrapper.error {
  border-color: var(--error-color);
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}

.input-icon {
  color: #94a3b8;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-right: 0.875rem;
  transition: color 0.22s ease;
}

.input-wrapper.focused .input-icon {
  color: var(--primary-color);
}

.video-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #0f172a;
  font-size: 1rem;
  padding: 0;
  line-height: 1.5;
  min-height: 24px;
  max-height: 24px;
}

.video-input::placeholder {
  color: #9aa8ba;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  transition: all 0.3s;
  margin-left: 0.5rem;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
  transform: scale(1.1);
}

.paste-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 6px;
  transition: all 0.3s;
  margin-left: 0.5rem;
}

.paste-btn:hover {
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-color);
  transform: scale(1.1);
}

.error-message {
  color: var(--error-color);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  margin-left: 1rem;
  animation: slideIn 0.3s;
}

/* 提取按钮 */
.extract-btn {
  width: 100%;
  margin-top: 2rem;
  padding: 1.05rem 2rem;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  border-radius: 15px;
  color: white;
  font-size: 1.0625rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease;
  box-shadow: 0 13px 28px rgba(37, 99, 235, 0.28);
  position: relative;
  overflow: hidden;
}

.extract-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.extract-btn:hover::before {
  width: 300px;
  height: 300px;
}

.extract-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(37, 99, 235, 0.34);
}

.extract-btn:active {
  transform: translateY(0);
}

.extract-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.extract-btn.loading {
  pointer-events: none;
}

.btn-content,
.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  position: relative;
  z-index: 1;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.55rem;
  color: #64748b;
  font-size: 0.9375rem;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 36px;
  padding: 0.25rem 0.35rem;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  transition: color 0.2s ease, transform 0.2s ease;
}

.footer-link:hover {
  color: #2563eb;
  transform: translateY(-1px);
}

.footer-divider {
  width: 1px;
  height: 18px;
  background: #dbe7f5;
}

.share-link::after {
  content: 'NEW';
  margin-left: 0.1rem;
  padding: 0.1rem 0.42rem;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1.35;
}

/* 错误提示 */
.error-alert {
  margin-top: 1.25rem;
  padding: 0.875rem 1.25rem;
  background: #fff1f2;
  border: 1px solid rgba(239, 68, 68, 0.22);
  border-radius: 12px;
  color: var(--error-color);
  display: flex;
  align-items: center;
  gap: 0.875rem;
  animation: slideIn 0.3s;
  font-size: 0.9375rem;
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.08);
}

.error-alert svg {
  flex-shrink: 0;
}

.error-alert .close-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--error-color);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.3s;
  line-height: 1;
}

.error-alert .close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-up-enter-active {
  animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .video-extractor {
    width: 100%;
  }

  .header {
    margin-bottom: 2rem;
  }

  .title {
    font-size: 2rem;
  }

  .title-icon {
    width: 75px;
    height: 75px;
  }

  .title-icon svg {
    width: 36px;
    height: 36px;
  }

  .subtitle {
    font-size: 0.9375rem;
  }

  .feature-row {
    gap: 0.65rem;
    font-size: 0.85rem;
  }

  .platform-badge {
    padding: 0.5rem 0.82rem;
    font-size: 0.875rem;
  }

  .input-wrapper {
    padding: 0.875rem 1rem;
    min-height: 56px;
    max-height: 56px;
  }

  .video-input {
    font-size: 0.9375rem;
  }

  .extract-btn {
    font-size: 1rem;
    padding: 0.925rem 1.5rem;
  }

  .footer-links {
    gap: 0.55rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
  }

  .footer-divider {
    display: none;
  }
}
</style>
