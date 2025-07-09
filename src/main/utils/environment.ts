// 🔍 Environment Detection Utility
// مساعد كشف البيئة للمسارات الصحيحة

import { app } from 'electron'
import { ResourcePathManager } from './resourcePathManager'

/**
 * كشف ما إذا كنا في بيئة التطوير أم الإنتاج
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}

/**
 * الحصول على مسار الموارد الصحيح حسب البيئة
 */
export const getResourcePath = (resourceType: 'video' | 'voice' | 'fonts' | 'assets'): string => {
  const resourceManager = ResourcePathManager.getInstance()

  switch (resourceType) {
    case 'assets':
      return resourceManager.getAssetsPath()
    case 'fonts':
      return resourceManager.getFontsPath()
    case 'video':
      return resourceManager.getVideoPath()
    case 'voice':
      return resourceManager.getVoicePath()
    default:
      return resourceManager.getResourcesPath()
  }
}

/**
 * الحصول على مسار الفيديو للـ Frontend
 */
export const getVideoUrlPath = (fileName: string): string => {
  if (isDevelopment()) {
    // In development, resources are served from /video/ path due to publicDir config
    return `/video/${fileName}`
  } else {
    // In production, use custom app-resource protocol for reliable access
    return `app-resource://video/${fileName}`
  }
}

/**
 * الحصول على مسار الصوت للـ Frontend
 */
export const getAudioUrlPath = (fileName: string): string => {
  if (isDevelopment()) {
    return `/resources/voice/${fileName}`
  } else {
    // In production, use custom app-resource protocol for reliable access
    return `app-resource://voice/${fileName}`
  }
}

/**
 * لوج معلومات البيئة للتشخيص
 */
export const logEnvironmentInfo = (): void => {
  console.log('[ENV] 🔍 Environment Detection:')
  console.log(`[ENV] - isDevelopment: ${isDevelopment()}`)
  console.log(`[ENV] - process.env.NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`[ENV] - app.isPackaged: ${app.isPackaged}`)
  console.log(`[ENV] - process.resourcesPath: ${process.resourcesPath}`)

  const resourceManager = ResourcePathManager.getInstance()
  console.log(`[ENV] - ResourcesPath: ${resourceManager.getResourcesPath()}`)
  console.log(`[ENV] - AssetsPath: ${resourceManager.getAssetsPath()}`)
}
