<template>
  <div class="video-result">
    <div class="result-card">
      <!-- 关闭按钮 -->
      <button class="close-result-btn" @click="$emit('close')" title="关闭">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <!-- 成功标识与清晰度切换 -->
      <div class="result-toolbar">
        <div class="success-badge">
          <svg class="success-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>提取成功</span>
        </div>

<!--        <div v-if="isVideoMedia" class="quality-switcher" aria-label="娓呮櫚搴﹀垏鎹?>-->
<!--          <span class="quality-label">娓呮櫚搴?/span>-->
<!--          <button-->
<!--            v-for="quality in qualityOptions"-->
<!--            :key="quality"-->
<!--            type="button"-->
<!--            :class="['quality-btn', { active: selectedQuality === quality }]"-->
<!--            @click="selectedQuality = quality"-->
<!--          >-->
<!--            {{ quality }}-->
<!--          </button>-->
<!--        </div>-->
      </div>

      <!-- 濯掍綋棰勮 -->
      <div v-if="isVideoMedia" class="video-preview" @click="playVideo">
        <!-- 浼樺厛鍔犺浇瑙嗛锛屽姞杞藉け璐ュ垯鍥為€€鍒板皝闈?-->
        <video
          v-if="!videoLoadFailed && currentVideoUrl"
          :src="currentVideoUrl"
          :poster="coverImageUrl"
          class="preview-platform-video"
          muted
          controls
          playsinline
          preload="metadata"
          @error="videoLoadFailed = true"
        ></video>
        <img v-else :src="coverImageUrl" :alt="videoData.title" class="cover-image" loading="lazy" />
        <div v-if="videoLoadFailed && !currentVideoUrl" class="video-overlay">
          <button class="play-btn" @click.stop="playVideo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div v-if="videoLoadFailed && !currentVideoUrl" class="video-duration">{{ formattedDuration }}</div>
<!--        <video :src="currentVideoUrl" controls />-->
      </div>

      <div v-if="isImageMedia" class="image-carousel">
        <button
          v-if="imageUrls.length > 1"
          type="button"
          class="carousel-nav prev"
          aria-label="上一张图片"
          @click="scrollCarousel(-1)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div ref="carouselRef" class="image-carousel-track" aria-label="图片走马灯">
          <button
            v-for="(imageUrl, index) in imageUrls"
            :key="imageUrl"
            type="button"
            class="image-slide"
            :aria-label="`查看第 ${index + 1} 张图片`"
            @click="openImagePreview(index)"
          >
            <img :src="imageUrl" :alt="`${videoData.title} - 第 ${index + 1} 张`" loading="lazy" />
            <span class="image-count-badge">{{ index + 1 }} / {{ imageUrls.length }}</span>
          </button>
        </div>
        <button
          v-if="imageUrls.length > 1"
          type="button"
          class="carousel-nav next"
          aria-label="下一张图片"
          @click="scrollCarousel(1)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div v-if="isImageMedia && imageUrls.length > 1" class="image-gallery" aria-label="鍥剧墖鍒楄〃">
        <button
          v-for="(imageUrl, index) in imageUrls"
          :key="imageUrl"
          type="button"
          class="image-thumb"
          :aria-label="`查看第 ${index + 1} 张图片`"
          @click="openImagePreview(index)"
        >
          <img :src="imageUrl" :alt="`${videoData.title} - 第 ${index + 1} 张`" loading="lazy" />
          <span class="image-index">{{ index + 1 }}</span>
        </button>
      </div>

      <Teleport to="body">
        <div
          v-if="isImagePreviewOpen"
          class="image-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="图片全屏预览"
          @wheel.prevent="handlePreviewWheel"
        >
          <div class="image-preview-toolbar">
            <span class="image-preview-counter">{{ currentPreviewPosition }} / {{ imageUrls.length }}</span>
            <button type="button" class="image-preview-close" aria-label="关闭图片预览" @click="closeImagePreview">
<!--              <span>关闭</span>-->
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <button
            v-if="imageUrls.length > 1"
            type="button"
            class="image-preview-nav image-preview-prev"
            aria-label="上一张图片"
            @click="showPreviousImage"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div
            class="image-preview-stage"
            @pointerdown="handlePreviewPointerDown"
            @pointerup="handlePreviewPointerUp"
            @pointercancel="resetPreviewPointer"
            @pointerleave="resetPreviewPointer"
          >
            <img
              class="image-preview-full"
              :src="activePreviewImageUrl"
              :alt="`${videoData.title} - 第 ${currentPreviewPosition} 张`"
              draggable="false"
            />
          </div>

          <button
            v-if="imageUrls.length > 1"
            type="button"
            class="image-preview-nav image-preview-next"
            aria-label="下一张图片"
            @click="showNextImage"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </Teleport>
      <!-- 视频信息 -->
      <div class="video-info">
        <h2 class="video-title">{{ videoData.title }}</h2>

        <!-- 作者信息 -->
        <div class="author-info">
          <img v-if="showAuthorAvatar" :src="videoData.author.avatarUrl" :alt="videoData.author.nickname" class="author-avatar" />
          <div class="author-details">
            <span class="author-name">{{ videoData.author.nickname }}</span>
            <span class="video-id">ID: {{ videoData.videoId }}</span>
          </div>
        </div>

        <!-- 视频元数据 -->
        <div class="video-meta">
          <div class="meta-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>{{ videoData.media.width }} × {{ videoData.media.height }}</span>
          </div>
          <div v-if="isVideoMedia" class="meta-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>{{ formattedDuration }}</span>
          </div>
          <div v-if="isImageMedia" class="meta-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M8 13l2.5-2.5L14 14l2-2 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="8" cy="9" r="1.2" fill="currentColor"/>
            </svg>
            <span>{{ imageUrls.length }} 张图片</span>
          </div>
          <div class="meta-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>{{ platformName }}</span>
          </div>
          <div v-if="videoData.cached" class="meta-item cached">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>缓存</span>
          </div>
        </div>

        <!-- 提取时间 -->
        <div class="extract-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>提取于 {{ formattedExtractTime }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button
            v-if="isMixedMedia"
            type="button"
            class="action-btn primary"
            :class="{ loading: isDownloadingPackage }"
            :disabled="isDownloadingPackage || !currentVideoUrl || imageUrls.length === 0"
            @click="downloadMediaPackage"
          >
            <span v-if="isDownloadingPackage" class="button-spinner" aria-hidden="true"></span>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ isDownloadingPackage ? '打包中...' : '下载媒体包' }}</span>
          </button>
          <button
            v-else-if="isVideoMedia"
            type="button"
            class="action-btn primary"
            :class="{ loading: isDownloading }"
            :disabled="isDownloading || !currentVideoUrl"
            @click="downloadVideo"
          >
            <span v-if="isDownloading" class="button-spinner" aria-hidden="true"></span>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ isDownloading ? '下载中...' : '下载视频' }}</span>
          </button>
          <button
            v-else-if="isImageMedia"
            type="button"
            class="action-btn primary"
            :class="{ loading: isDownloadingImages }"
            :disabled="isDownloadingImages || imageUrls.length === 0"
            @click="downloadImages"
          >
            <span v-if="isDownloadingImages" class="button-spinner" aria-hidden="true"></span>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ isDownloadingImages ? '打包中...' : '下载图片包' }}</span>
          </button>
          <button class="action-btn secondary" :disabled="!currentMediaUrl" @click="copyMediaUrl">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>{{ copyButtonText }}</span>
          </button>
          <a :href="videoData.originalUrl" class="action-btn secondary" target="_blank" rel="noopener noreferrer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>原始链接</span>
          </a>
        </div>
        <p v-if="downloadError" class="download-error">{{ downloadError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDuration, formatDateTime } from '../utils/api'
import { getPlatformById } from '../utils/platformConfig'

const props = defineProps({
  videoData: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const qualityOptions = ['720p', '1080p', '4k']
const copyButtonText = ref('复制链接')
const carouselRef = ref(null)
const isDownloading = ref(false)
const isDownloadingImages = ref(false)
const isDownloadingPackage = ref(false)
const downloadError = ref('')
const videoLoadFailed = ref(false)
const previewImageIndex = ref(-1)
const previousBodyOverflow = ref('')
const previewPointerStartX = ref(null)
const lastPreviewWheelAt = ref(0)
const PREVIEW_SWIPE_THRESHOLD = 48

const media = computed(() => props.videoData.media || {})

const mediaType = computed(() => {
  return String(media.value.mediaType || '').toUpperCase()
})

const imageUrls = computed(() => {
  const explicitImageUrls = Array.isArray(media.value.imageUrls) ? media.value.imageUrls : []
  const shouldUseCoverAsImage = mediaType.value === 'IMAGE' || !media.value.videoUrl
  const urls = explicitImageUrls.length > 0 || !shouldUseCoverAsImage
    ? explicitImageUrls
    : [media.value.coverUrl]
  return [...new Set(urls.filter(Boolean))]
})

const isImageMedia = computed(() => {
  return imageUrls.value.length > 0
})

const isVideoMedia = computed(() => {
  return Boolean(media.value.videoUrl)
})

const isMixedMedia = computed(() => {
  return isVideoMedia.value && isImageMedia.value
})

const coverImageUrl = computed(() => {
  return media.value.coverUrl || imageUrls.value[0] || ''
})

const firstImageUrl = computed(() => {
  return imageUrls.value[0] || coverImageUrl.value
})

const isImagePreviewOpen = computed(() => {
  return previewImageIndex.value >= 0 && previewImageIndex.value < imageUrls.value.length
})

const activePreviewImageUrl = computed(() => {
  return isImagePreviewOpen.value ? imageUrls.value[previewImageIndex.value] : ''
})

const currentPreviewPosition = computed(() => {
  return isImagePreviewOpen.value ? previewImageIndex.value + 1 : 0
})

const getRatioFromUrl = (url) => {
  if (!url) return '720p'

  try {
    const parsedUrl = new URL(url)
    const ratio = parsedUrl.searchParams.get('ratio')
    return qualityOptions.includes(ratio) ? ratio : '720p'
  } catch (error) {
    const ratioMatch = url.match(/[?&]ratio=([^&]+)/)
    const ratio = ratioMatch ? decodeURIComponent(ratioMatch[1]) : null
    return qualityOptions.includes(ratio) ? ratio : '720p'
  }
}

const selectedQuality = ref(getRatioFromUrl(media.value.videoUrl))

watch(
  () => props.videoData.media?.videoUrl,
  (videoUrl) => {
    selectedQuality.value = getRatioFromUrl(videoUrl)
  }
)

const formattedDuration = computed(() => {
  return formatDuration(media.value.durationMs)
})

const formattedExtractTime = computed(() => {
  return formatDateTime(props.videoData.extractedAt)
})

const platformName = computed(() => {
  const platform = getPlatformById(props.videoData.platform)
  return platform ? platform.name : props.videoData.platform
})

const showAuthorAvatar = computed(() => {
  return String(props.videoData.platform || '').toUpperCase() !== 'BILIBILI'
})

const currentVideoUrl = computed(() => {
  const videoUrl = media.value.videoUrl

  if (!videoUrl) return ''

  try {
    const parsedUrl = new URL(videoUrl)
    parsedUrl.searchParams.set('ratio', selectedQuality.value)
    return parsedUrl.toString()
  } catch (error) {
    if (/[?&]ratio=/.test(videoUrl)) {
      return videoUrl.replace(/([?&]ratio=)[^&]*/, `$1${encodeURIComponent(selectedQuality.value)}`)
    }

    const separator = videoUrl.includes('?') ? '&' : '?'
    return `${videoUrl}${separator}ratio=${encodeURIComponent(selectedQuality.value)}`
  }
})

watch(
    () => currentVideoUrl.value,
    () => {
      videoLoadFailed.value = false
    }
)

const currentMediaUrl = computed(() => {
  return currentVideoUrl.value || firstImageUrl.value
})

const getSafeTitle = () => {
  const title = props.videoData.title || props.videoData.videoId || 'media'
  return title
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'media'
}

const getVideoDownloadFilename = () => {
  return `${getSafeTitle()}.mp4`
}

const getImageZipFilename = () => {
  return `${getSafeTitle()}-images.zip`
}

const getMediaZipFilename = () => {
  return `${getSafeTitle()}-media.zip`
}

const normalizeDownloadUrls = (urls) => {
  return [...new Set(
    urls
      .flat(Infinity)
      .map((url) => String(url || '').trim())
      .filter(Boolean)
  )]
}

const collectDownloadUrls = (value, urls = []) => {
  if (!value) return urls

  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) {
      urls.push(value)
    }
    return urls
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDownloadUrls(item, urls))
    return urls
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (/url|urls/i.test(key)) {
        collectDownloadUrls(nestedValue, urls)
      }
    })
  }

  return urls
}

const getDirectVideoUrls = () => {
  return normalizeDownloadUrls([
    currentVideoUrl.value,
    collectDownloadUrls(media.value.videoUrls),
    collectDownloadUrls(media.value.videos)
  ])
}

const getDirectImageUrls = () => {
  return normalizeDownloadUrls([
    imageUrls.value,
    collectDownloadUrls(media.value.imageUrls),
    collectDownloadUrls(media.value.images)
  ])
}

const getDirectMediaUrls = () => {
  return normalizeDownloadUrls([
    ...getDirectVideoUrls(),
    ...getDirectImageUrls(),
    collectDownloadUrls(media.value.downloadUrls),
    collectDownloadUrls(media.value.mediaUrls)
  ])
}

const triggerBrowserDownload = (href, filename) => {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const triggerBlobDownload = (blob, filename) => {
  const blobUrl = window.URL.createObjectURL(blob)
  triggerBrowserDownload(blobUrl, filename)
  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 0)
}

const extensionByContentType = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif'
}

const crcTable = (() => {
  const table = new Uint32Array(256)

  for (let i = 0; i < 256; i += 1) {
    let value = i
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[i] = value >>> 0
  }

  return table
})()

const getCrc32 = (bytes) => {
  let crc = 0xffffffff

  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

const getDosDateTime = (date = new Date()) => {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()

  return { dosDate, dosTime }
}

const getFileExtension = (filename) => {
  const match = String(filename || '').match(/\.([a-z0-9]{1,10})$/i)
  return match ? match[1].toLowerCase() : ''
}

const getExtensionFromUrl = (url) => {
  try {
    const parsedUrl = new URL(url)
    return getFileExtension(decodeURIComponent(parsedUrl.pathname.split('/').pop() || ''))
  } catch (error) {
    return getFileExtension(String(url || '').split(/[?#]/)[0])
  }
}

const getExtensionFromContentType = (contentType) => {
  const cleanContentType = String(contentType || '').split(';')[0].trim().toLowerCase()
  return extensionByContentType[cleanContentType] || ''
}

const ensureFilenameExtension = (filename, extension) => {
  if (!extension || getFileExtension(filename)) return filename
  return `${filename}.${extension}`
}

const getUniqueFilename = (filename, usedFilenames) => {
  if (!usedFilenames.has(filename)) {
    usedFilenames.add(filename)
    return filename
  }

  const extension = getFileExtension(filename)
  const stem = extension ? filename.slice(0, -(extension.length + 1)) : filename
  let index = 2
  let candidate = extension ? `${stem}-${index}.${extension}` : `${stem}-${index}`

  while (usedFilenames.has(candidate)) {
    index += 1
    candidate = extension ? `${stem}-${index}.${extension}` : `${stem}-${index}`
  }

  usedFilenames.add(candidate)
  return candidate
}

const fetchDownloadResponse = (url) => {
  return fetch(url, {
    method: 'GET',
    headers: {
      Accept: '*/*'
    },
    referrerPolicy: 'no-referrer'
  })
}

const fetchDirectDownloadFile = async (url) => {
  let response

  try {
    response = await fetchDownloadResponse(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (directDownloadError) {
    const redirectParams = new URLSearchParams({ url })
    const redirectResponse = await fetch(`/api/videos/redirect?${redirectParams.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!redirectResponse.ok) {
      throw new Error(`获取重定向地址失败: HTTP ${redirectResponse.status}`, {
        cause: directDownloadError
      })
    }

    const redirectData = await redirectResponse.json()
    const redirectUrl = String(redirectData?.url || '').trim()

    if (!redirectUrl) {
      throw new Error('获取重定向地址失败: 响应中缺少 url', {
        cause: directDownloadError
      })
    }

    response = await fetchDownloadResponse(redirectUrl)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const blob = await response.blob()
  if (!blob || blob.size === 0) {
    throw new Error('Empty download response')
  }

  const contentType = response.headers.get('content-type')
    || blob.type
    || ''

  return {
    blob,
    contentType
  }
}

const createZipBlob = async (files) => {
  const encoder = new TextEncoder()
  const { dosDate, dosTime } = getDosDateTime()
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const file of files) {
    const bytes = new Uint8Array(await file.blob.arrayBuffer())
    const filenameBytes = encoder.encode(file.filename)
    const crc = getCrc32(bytes)
    const localOffset = offset
    const localHeader = new ArrayBuffer(30 + filenameBytes.length)
    const localView = new DataView(localHeader)

    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, bytes.length, true)
    localView.setUint32(22, bytes.length, true)
    localView.setUint16(26, filenameBytes.length, true)
    localView.setUint16(28, 0, true)
    new Uint8Array(localHeader, 30).set(filenameBytes)

    localParts.push(localHeader, bytes)
    offset += localHeader.byteLength + bytes.length

    const centralHeader = new ArrayBuffer(46 + filenameBytes.length)
    const centralView = new DataView(centralHeader)

    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dosTime, true)
    centralView.setUint16(14, dosDate, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, bytes.length, true)
    centralView.setUint32(24, bytes.length, true)
    centralView.setUint16(28, filenameBytes.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, localOffset, true)
    new Uint8Array(centralHeader, 46).set(filenameBytes)

    centralParts.push(centralHeader)
  }

  const centralDirectorySize = centralParts.reduce((size, part) => size + part.byteLength, 0)
  const endRecord = new ArrayBuffer(22)
  const endView = new DataView(endRecord)

  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralDirectorySize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  return new Blob([...localParts, ...centralParts, endRecord], { type: 'application/zip' })
}

const downloadDirectUrls = async ({ urls, singleFilename, zipFilename, entryPrefix }) => {
  const downloadUrls = normalizeDownloadUrls(urls)

  if (downloadUrls.length === 0) {
    throw new Error('没有可下载的媒体 URL')
  }

  const usedFilenames = new Set()
  const files = []

  for (const [index, url] of downloadUrls.entries()) {
    const { blob, contentType } = await fetchDirectDownloadFile(url)
    const extension = getExtensionFromContentType(contentType) || getExtensionFromUrl(url) || 'bin'
    const filename = downloadUrls.length === 1
        ? ensureFilenameExtension(singleFilename, extension)
        : `${entryPrefix}-${String(index + 1).padStart(2, '0')}.${extension}`

    files.push({
      blob,
      filename: getUniqueFilename(filename, usedFilenames)
    })
  }

  if (files.length === 1) {
    triggerBlobDownload(files[0].blob, files[0].filename)
    return
  }

  const zipBlob = await createZipBlob(files)
  if (!zipBlob || zipBlob.size === 0) {
    throw new Error('Empty download response')
  }

  triggerBlobDownload(zipBlob, zipFilename)
}

const downloadMediaPackage = async () => {
  if (!currentVideoUrl.value || imageUrls.value.length === 0) return

  isDownloadingPackage.value = true
  downloadError.value = ''

  try {
    await downloadDirectUrls({
      urls: getDirectMediaUrls(),
      singleFilename: getVideoDownloadFilename(),
      zipFilename: getMediaZipFilename(),
      entryPrefix: 'media'
    })
  } catch (error) {
    console.error('Media package download failed:', error)
    downloadError.value = error.message || '媒体包下载失败，请稍后重试'
  } finally {
    isDownloadingPackage.value = false
  }
}

const downloadVideo = async () => {
  if (!currentVideoUrl.value) return

  isDownloading.value = true
  downloadError.value = ''

  try {
    await downloadDirectUrls({
      urls: getDirectVideoUrls(),
      singleFilename: getVideoDownloadFilename(),
      zipFilename: getMediaZipFilename(),
      entryPrefix: 'video'
    })
  } catch (error) {
    console.error('Video download failed:', error)
    downloadError.value = error.message || '下载失败，请稍后重试'
  } finally {
    isDownloading.value = false
  }
}

const downloadImages = async () => {
  if (imageUrls.value.length === 0) return

  isDownloadingImages.value = true
  downloadError.value = ''

  try {
    const filename = getImageZipFilename()

    await downloadDirectUrls({
      urls: getDirectImageUrls(),
      singleFilename: `${getSafeTitle()}-image`,
      zipFilename: filename,
      entryPrefix: 'image'
    })
  } catch (error) {
    console.error('Image zip download failed:', error)
    downloadError.value = error.message || '图片包下载失败，请稍后重试'
  } finally {
    isDownloadingImages.value = false
  }
}

const scrollCarousel = (direction) => {
  const carousel = carouselRef.value
  if (!carousel) return

  carousel.scrollBy({
    left: direction * carousel.clientWidth,
    behavior: 'smooth'
  })
}

const normalizePreviewIndex = (index) => {
  const total = imageUrls.value.length
  if (total === 0) return -1
  return ((index % total) + total) % total
}

const openImagePreview = (index) => {
  const normalizedIndex = normalizePreviewIndex(index)
  if (normalizedIndex === -1) return
  previewImageIndex.value = normalizedIndex
}

const closeImagePreview = () => {
  previewImageIndex.value = -1
}

const showPreviousImage = () => {
  openImagePreview(previewImageIndex.value - 1)
}

const showNextImage = () => {
  openImagePreview(previewImageIndex.value + 1)
}

const resetPreviewPointer = () => {
  previewPointerStartX.value = null
}

const switchPreviewFromDrag = (deltaX) => {
  if (imageUrls.value.length <= 1 || Math.abs(deltaX) < PREVIEW_SWIPE_THRESHOLD) return

  if (deltaX > 0) {
    showPreviousImage()
  } else {
    showNextImage()
  }
}

const handlePreviewPointerDown = (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  previewPointerStartX.value = event.clientX
}

const handlePreviewPointerUp = (event) => {
  if (previewPointerStartX.value === null) return
  switchPreviewFromDrag(event.clientX - previewPointerStartX.value)
  resetPreviewPointer()
}

const handlePreviewWheel = (event) => {
  if (imageUrls.value.length <= 1) return

  const now = Date.now()
  if (now - lastPreviewWheelAt.value < 360) return

  const dominantDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (Math.abs(dominantDelta) < 24) return

  lastPreviewWheelAt.value = now
  if (dominantDelta > 0) {
    showNextImage()
  } else {
    showPreviousImage()
  }
}
const handlePreviewKeydown = (event) => {
  if (!isImagePreviewOpen.value) return

  if (event.key === 'Escape') {
    closeImagePreview()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    showPreviousImage()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    showNextImage()
  }
}

watch(isImagePreviewOpen, (isOpen) => {
  if (typeof document === 'undefined') return

  if (isOpen) {
    previousBodyOverflow.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = previousBodyOverflow.value
})

watch(imageUrls, (urls) => {
  if (!isImagePreviewOpen.value) return

  if (urls.length === 0) {
    closeImagePreview()
    return
  }

  if (previewImageIndex.value >= urls.length) {
    previewImageIndex.value = urls.length - 1
  }
})

onMounted(() => {
  window.addEventListener('keydown', handlePreviewKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handlePreviewKeydown)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow.value
  }
})

const playVideo = () => {
  if (!currentVideoUrl.value) return

  // 创建一个临时的 a 标签来实现无 referrer 跳转
  const link = document.createElement('a')
  link.href = currentVideoUrl.value
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const copyMediaUrl = async () => {
  if (!currentMediaUrl.value) return

  try {
    await navigator.clipboard.writeText(currentMediaUrl.value)
    copyButtonText.value = '宸插鍒?'
    setTimeout(() => {
      copyButtonText.value = '澶嶅埗閾炬帴'
    }, 2000)
  } catch (error) {
    console.error('澶嶅埗澶辫触:', error)
    copyButtonText.value = '澶嶅埗澶辫触'
    setTimeout(() => {
      copyButtonText.value = '澶嶅埗閾炬帴'
    }, 2000)
  }
}
</script>

<style scoped>
.video-result {
  margin-top: 2rem;
  animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.result-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dbe7f5;
  border-radius: 18px;
  padding: 2rem;
  position: relative;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.09);
  overflow: hidden;
  backdrop-filter: blur(14px);
}

.result-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--gradient-start), var(--gradient-end));
}

.close-result-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s;
  z-index: 10;
}

.close-result-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
  transform: rotate(90deg);
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-right: 2.75rem;
  flex-wrap: wrap;
}

.success-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.32);
  border-radius: 999px;
  color: var(--success-color);
  font-size: 0.875rem;
  font-weight: 700;
  animation: pulse 2s ease-in-out infinite;
}

.quality-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem;
  background: #f8fafc;
  border: 1px solid #dbe7f5;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.quality-label {
  padding: 0 0.45rem 0 0.55rem;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.quality-btn {
  min-width: 54px;
  min-height: 32px;
  padding: 0.35rem 0.65rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 800;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.quality-btn:hover {
  color: #2563eb;
  background: #eff6ff;
}

.quality-btn.active {
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
}

.quality-btn.active:hover {
  color: #ffffff;
  transform: translateY(-1px);
}

.success-icon {
  animation: checkmark 0.5s ease-out;
}

@keyframes checkmark {
  0% {
    transform: scale(0) rotate(-45deg);
  }
  50% {
    transform: scale(1.2) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

.video-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.image-carousel {
  position: relative;
  width: 100%;
  margin-bottom: 1.25rem;
}

.image-carousel-track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  padding-bottom: 0.35rem;
}

.image-slide {
  position: relative;
  flex: 0 0 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #0f172a;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
  scroll-snap-align: start;
  display: block;
  text-decoration: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.image-slide:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 3px;
}

.image-slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0f172a;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.74);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: translateY(-50%);
  transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  z-index: 2;
}

.carousel-nav:hover {
  background: rgba(37, 99, 235, 0.86);
  transform: translateY(-50%) scale(1.04);
}

.carousel-nav.prev {
  left: 0.75rem;
}

.carousel-nav.next {
  right: 0.75rem;
}

.image-count-badge {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  padding: 0.28rem 0.72rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.image-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid #dbe7f5;
  background: #f8fafc;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  font: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.image-thumb:hover {
  border-color: #93c5fd;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.13);
  transform: translateY(-2px);
}

.image-thumb:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 3px;
}

.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-index {
  position: absolute;
  left: 0.45rem;
  top: 0.45rem;
  min-width: 24px;
  height: 24px;
  padding: 0 0.35rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 800;
}

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: rgba(2, 6, 23, 0.96);
  backdrop-filter: blur(8px);
  overscroll-behavior: contain;
}

.image-preview-stage {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}

.image-preview-stage:active {
  cursor: grabbing;
}

.image-preview-toolbar {
  position: fixed;
  top: max(1rem, env(safe-area-inset-top));
  left: max(1rem, env(safe-area-inset-left));
  right: max(1rem, env(safe-area-inset-right));
  z-index: 52;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  pointer-events: none;
}

.image-preview-counter {
  min-height: 40px;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.84);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
}

.image-preview-close,
.image-preview-nav {
  border: 1px solid rgba(255, 255, 255, 0.32);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.image-preview-close {
  height: 48px;
  gap: 0.45rem;
  padding: 0 1rem;
  background: rgba(15, 23, 42, 0.84);
  border-color: rgba(255, 255, 255, 0.68);
  border-radius: 999px;
  color: #FFFFFF;
  font-size: 0.95rem;
  font-weight: 900;
  pointer-events: auto;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
}

.image-preview-nav {
  position: fixed;
  top: 50%;
  z-index: 52;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.76);
  transform: translateY(-50%);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.3);
}

.image-preview-prev {
  left: max(1.25rem, env(safe-area-inset-left));
}

.image-preview-next {
  right: max(1.25rem, env(safe-area-inset-right));
}

.image-preview-close:hover,
.image-preview-nav:hover {
  background: rgba(15, 23, 42, 0.84);
  border-color: #ffffff;
  color: #FFFFFF;
}

.image-preview-close:hover {
  transform: translateY(-1px);
}

.image-preview-nav:hover {
  transform: translateY(-50%) scale(1.04);
}

.image-preview-close:focus-visible,
.image-preview-nav:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 3px;
}

.image-preview-full {
  display: block;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  object-fit: contain;
  object-position: center center;
  border-radius: 0;
  box-shadow: none;
}
.preview-platform-video {
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.video-preview:hover .cover-image {
  transform: scale(1.05);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-preview:hover .video-overlay {
  opacity: 1;
}

.play-btn {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  color: var(--primary-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.play-btn:hover {
  transform: scale(1.1);
  background: white;
}

.video-duration {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.video-info {
  animation: slideIn 0.6s ease-out 0.2s both;
}

.video-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.4;
  color: var(--text-primary);
}

.author-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  transition: background 0.3s;
}

.author-info:hover {
  background: #f1f5f9;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--primary-color);
  object-fit: cover;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.author-name {
  font-weight: 600;
  color: var(--text-primary);
}

.video-id {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.video-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.meta-item svg {
  color: var(--primary-color);
}

.meta-item.cached {
  color: var(--success-color);
}

.meta-item.cached svg {
  color: var(--success-color);
}

.extract-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border: none;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  color: white;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--shadow-color);
}

.action-btn.primary:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  transform: none;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.action-btn.secondary:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
}

.action-btn.secondary:disabled:hover {
  background: #ffffff;
  border-color: #dbe7f5;
  transform: none;
}

.action-btn.primary.loading {
  pointer-events: none;
}

.action-btn.secondary {
  background: #ffffff;
  color: var(--text-primary);
  border: 1px solid #dbe7f5;
}

.action-btn.secondary:hover {
  background: #f8fafc;
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.button-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.download-error {
  margin: 0.75rem 0 0;
  color: var(--error-color);
  font-size: 0.875rem;
  line-height: 1.5;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

/* 鍝嶅簲寮?*/
@media (max-width: 768px) {
  .result-card {
    padding: 1.5rem;
  }

  .result-toolbar {
    align-items: flex-start;
    padding-right: 2.5rem;
  }

  .quality-switcher {
    width: 100%;
    justify-content: space-between;
  }

  .quality-btn {
    flex: 1;
    min-width: 0;
  }

  .video-title {
    font-size: 1.25rem;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .image-slide {
    aspect-ratio: 4 / 3;
  }

  .carousel-nav {
    width: 40px;
    height: 40px;
  }

  .image-gallery {
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 0.6rem;
  }

  .play-btn {
    width: 48px;
    height: 48px;
  }

  .play-btn svg {
    width: 24px;
    height: 24px;
  }

  .image-preview-toolbar {
    top: max(0.75rem, env(safe-area-inset-top));
    left: max(0.75rem, env(safe-area-inset-left));
    right: max(0.75rem, env(safe-area-inset-right));
  }

  .image-preview-counter {
    min-height: 36px;
    padding: 0.42rem 0.72rem;
    font-size: 0.82rem;
  }

  .image-preview-close {
    height: 44px;
    padding: 0 0.85rem;
    font-size: 0.88rem;
  }

  .image-preview-nav {
    top: auto;
    bottom: max(1rem, env(safe-area-inset-bottom));
    width: 50px;
    height: 50px;
    transform: none;
  }

  .image-preview-nav:hover {
    transform: none;
  }

  .image-preview-prev {
    left: calc(50% - 3.75rem);
  }

  .image-preview-next {
    right: calc(50% - 3.75rem);
  }
}
</style>
