/**
 * API 调用工具
 */

const API_BASE_URL = '/api'

export const getVideoDownloadUrl = (url, filename) => {
  const params = new URLSearchParams({ url })

  if (filename) {
    params.set('filename', filename)
  }

  return `${API_BASE_URL}/videos/download?${params.toString()}`
}

/**
 * Bilibili 专属下载地址：后端取最高清晰度视频与最佳音频，
 * ffmpeg 合流为带声音的 mp4 后返回。
 */
export const getBilibiliDownloadUrl = (bvid) => {
  const params = new URLSearchParams({ bvid })
  return `${API_BASE_URL}/videos/bilibili/download?${params.toString()}`
}

export const downloadImagesZip = async (imageUrls, filename) => {
  const response = await fetch(`${API_BASE_URL}/videos/images/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/zip,application/octet-stream,*/*'
    },
    body: JSON.stringify({ imageUrls, filename })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `请求失败: ${response.status}`)
  }

  return response.blob()
}

export const downloadMediaZip = async ({ videoUrl, imageUrls, filename }) => {
  const mediaUrls = [
    videoUrl,
    ...(Array.isArray(imageUrls) ? imageUrls : [])
  ].filter(Boolean)

  return downloadImagesZip([...new Set(mediaUrls)], filename)
}

/**
 * 提取视频信息
 */
export const extractVideo = async (url) => {
  try {
    const response = await fetch(`${API_BASE_URL}/videos/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `请求失败: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('视频提取失败:', error)
    throw error
  }
}

/**
 * 格式化时长（毫秒转分:秒）
 */
export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '0:00'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 格式化日期时间
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }

    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`
    }

    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`
    }

    // 返回完整日期
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateString
  }
}
