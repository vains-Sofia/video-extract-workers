/**
 * 平台配置 - 支持多平台扩展
 */
export const PLATFORMS = {
  DOUYIN: {
    id: 'DOUYIN',
    name: '抖音',
    icon: 'douyin',
    logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="7" fill="#0F172A"/><path d="M14.5 5.5c.35 2.2 1.6 3.52 3.5 3.86v2.32c-1.32-.04-2.5-.43-3.5-1.16v4.64c0 2.4-1.84 4.34-4.26 4.34A4.2 4.2 0 0 1 6 15.28c0-2.43 1.9-4.28 4.34-4.28.33 0 .64.03.94.1v2.56a2.15 2.15 0 0 0-.94-.2 1.82 1.82 0 1 0 1.82 1.82V5.5h2.34Z" fill="#fff"/><path d="M15.08 7.28c.6.9 1.42 1.5 2.46 1.8v1.12c-1.1-.12-2-.48-2.7-1.08l.24-1.84Z" fill="#25F4EE"/><path d="M10.65 13.62a1.8 1.8 0 0 0-1.98 1.8 1.78 1.78 0 0 0 2.8 1.46 1.82 1.82 0 0 1-3.46-.78c0-1 .8-1.82 1.82-1.82.29 0 .56.06.82.18v-.84Z" fill="#FE2C55"/></svg>',
    urlPattern: /douyin\.com/i,
    placeholder: '请输入平台对应的 URL 地址 ~',
    color: '#0f172a',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
  },
  XIAOHONGSHU: {
    id: 'XIAOHONGSHU',
    aliases: ['XHS', 'REDNOTE', 'RED_BOOK', 'XIAO_HONG_SHU'],
    name: '小红书',
    icon: 'xiaohongshu',
    logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="7" fill="#FF2442"/><path d="M7 6.8h10M8.5 10h7M6.8 13.2h10.4M9.2 16.4h5.6" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M6.8 17.2 17.2 6.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    urlPattern: /xiaohongshu\.com|xhslink\.com|xhslink\.cn|xhscdn\.com/i,
    placeholder: '粘贴小红书笔记或分享链接',
    color: '#FF2442',
    gradient: 'linear-gradient(135deg, #FF2442 0%, #FF5A6F 100%)'
  },
  BILIBILI: {
    id: 'BILIBILI',
    aliases: ['BILI', 'B站', 'BILI_BILI'],
    name: '哔哩哔哩',
    icon: 'bilibili',
    logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="7" fill="#00A1D6"/><path d="M8.2 5.4 10.1 7M15.8 5.4 13.9 7" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><rect x="4.5" y="7.5" width="15" height="11" rx="3" fill="#fff"/><path d="M8.2 12.2v1.6M15.8 12.2v1.6" stroke="#00A1D6" stroke-width="1.8" stroke-linecap="round"/><path d="M10.2 15.1c.9.7 2.7.7 3.6 0" stroke="#00A1D6" stroke-width="1.4" stroke-linecap="round"/><path d="M6.5 11.2h-1M18.5 11.2h-1" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    urlPattern: /bilibili\.com|b23\.tv|bili2233\.cn/i,
    placeholder: '粘贴哔哩哔哩视频或分享链接',
    color: '#00A1D6',
    gradient: 'linear-gradient(135deg, #00A1D6 0%, #23ADE5 100%)'
  },
  // 预留其他平台扩展
  // KUAISHOU: {
  //   id: 'KUAISHOU',
  //   name: '快手',
  //   icon: '⚡',
  //   urlPattern: /kuaishou\.com|ksurl\.cn/i,
  //   placeholder: '粘贴快手分享链接',
  //   color: '#FF4906',
  //   gradient: 'linear-gradient(135deg, #FF4906 0%, #FF8C42 100%)'
  // },

  // WEISHI: {
  //   id: 'WEISHI',
  //   name: '微视',
  //   icon: '📱',
  //   urlPattern: /weishi\.qq\.com/i,
  //   placeholder: '粘贴微视分享链接',
  //   color: '#FF6C00',
  //   gradient: 'linear-gradient(135deg, #FF6C00 0%, #FFA500 100%)'
  // }
}

/**
 * 检测URL属于哪个平台
 */
export const detectPlatform = (url) => {
  if (!url || typeof url !== 'string') {
    return null
  }

  for (const platform of Object.values(PLATFORMS)) {
    if (platform.urlPattern.test(url)) {
      return platform
    }
  }
  return null
}

/**
 * 获取所有激活的平台
 */
export const getActivePlatforms = () => {
  return Object.values(PLATFORMS)
}

/**
 * 获取已支持的平台名称
 */
export const getSupportedPlatformNames = () => {
  return getActivePlatforms().map((platform) => platform.name).join('、')
}

/**
 * 根据ID获取平台配置
 */
export const getPlatformById = (id) => {
  if (!id) return null

  const normalizedId = String(id).toUpperCase()
  return PLATFORMS[normalizedId] || Object.values(PLATFORMS).find((platform) => {
    return platform.aliases?.includes(normalizedId)
  }) || null
}
