/**
 * 📦 Resource Path Manager - Resource Path Resolution for Packaged Apps
 * مدير مسارات الموارد للتطبيقات المحزومة
 *
 * This class handles resource path resolution for both development and production environments,
 * ensuring assets are found correctly in packaged Electron applications.
 */

import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export class ResourcePathManager {
  private static instance: ResourcePathManager
  private resourcesPath: string
  private assetsPath: string
  private fontsPath: string
  private videoPath: string
  private voicePath: string
  private isPackaged: boolean

  private constructor() {
    this.isPackaged = app.isPackaged

    // Determine base resources path
    if (this.isPackaged) {
      // In production, resources are in the app.asar.unpacked or process.resourcesPath
      this.resourcesPath = path.join(process.resourcesPath, 'resources')
    } else {
      // In development, resources are in the project directory
      this.resourcesPath = path.join(process.cwd(), 'resources')
    }

    // Define subdirectories
    this.assetsPath = path.join(this.resourcesPath, 'assets')
    this.fontsPath = path.join(this.resourcesPath, 'fonts')
    this.videoPath = path.join(this.resourcesPath, 'video')
    this.voicePath = path.join(this.resourcesPath, 'voice')

    console.log(`[Resources] 📦 Resources initialized at: ${this.resourcesPath}`)
    console.log(`[Resources] 📦 Is packaged: ${this.isPackaged}`)

    // Validate critical paths
    this.validatePaths()
  }

  static getInstance(): ResourcePathManager {
    if (!ResourcePathManager.instance) {
      ResourcePathManager.instance = new ResourcePathManager()
    }
    return ResourcePathManager.instance
  }

  // ==================== PATH GETTERS ====================

  /**
   * Get the main resources directory path
   */
  getResourcesPath(): string {
    return this.resourcesPath
  }

  /**
   * Get the assets directory path
   */
  getAssetsPath(): string {
    return this.assetsPath
  }

  /**
   * Get the fonts directory path
   */
  getFontsPath(): string {
    return this.fontsPath
  }

  /**
   * Get the video directory path
   */
  getVideoPath(): string {
    return this.videoPath
  }

  /**
   * Get the voice directory path
   */
  getVoicePath(): string {
    return this.voicePath
  }

  // ==================== SPECIFIC ASSET PATHS ====================

  /**
   * Get the SumatraPDF executable path
   */
  getSumatraPDFPath(): string {
    return path.join(this.assetsPath, 'SumatraPDF.exe')
  }

  /**
   * Get the SumatraPDF settings file path
   */
  getSumatraPDFSettingsPath(): string {
    return path.join(this.assetsPath, 'SumatraPDF-settings.txt')
  }

  /**
   * Get the logo image path
   */
  getLogoPath(): string {
    return path.join(this.assetsPath, 'logo.png')
  }

  /**
   * Get a specific asset file path
   */
  getAssetPath(filename: string): string {
    return path.join(this.assetsPath, filename)
  }

  /**
   * Get a specific font file path
   */
  getFontPath(filename: string): string {
    return path.join(this.fontsPath, filename)
  }

  /**
   * Get a specific video file path
   */
  getVideoFilePath(filename: string): string {
    return path.join(this.videoPath, filename)
  }

  /**
   * Get a specific voice file path
   */
  getVoiceFilePath(filename: string): string {
    return path.join(this.voicePath, filename)
  }

  // ==================== VALIDATION AND DIAGNOSTICS ====================

  /**
   * Validate that critical paths exist
   */
  private validatePaths(): void {
    const criticalPaths = [
      { name: 'Resources', path: this.resourcesPath },
      { name: 'Assets', path: this.assetsPath }
    ]

    criticalPaths.forEach(({ name, path: pathValue }) => {
      if (!fs.existsSync(pathValue)) {
        console.warn(`[Resources] ⚠️ ${name} directory not found: ${pathValue}`)
      } else {
        console.log(`[Resources] ✅ ${name} directory found: ${pathValue}`)
      }
    })
  }

  /**
   * Check if SumatraPDF is available
   */
  isSumatraPDFAvailable(): boolean {
    return fs.existsSync(this.getSumatraPDFPath())
  }

  /**
   * Check if logo is available
   */
  isLogoAvailable(): boolean {
    return fs.existsSync(this.getLogoPath())
  }

  /**
   * Check if a specific asset exists
   */
  assetExists(filename: string): boolean {
    return fs.existsSync(this.getAssetPath(filename))
  }

  /**
   * Check if a specific font exists
   */
  fontExists(filename: string): boolean {
    return fs.existsSync(this.getFontPath(filename))
  }

  /**
   * Check if a specific video exists
   */
  videoExists(filename: string): boolean {
    return fs.existsSync(this.getVideoFilePath(filename))
  }

  /**
   * Check if a specific voice file exists
   */
  voiceExists(filename: string): boolean {
    return fs.existsSync(this.getVoiceFilePath(filename))
  }

  /**
   * List all available assets
   */
  listAssets(): string[] {
    try {
      if (!fs.existsSync(this.assetsPath)) return []
      return fs.readdirSync(this.assetsPath).filter(file =>
        fs.statSync(path.join(this.assetsPath, file)).isFile()
      )
    } catch (error) {
      console.error('[Resources] ❌ Error listing assets:', error)
      return []
    }
  }

  /**
   * List all available fonts
   */
  listFonts(): string[] {
    try {
      if (!fs.existsSync(this.fontsPath)) return []
      return fs.readdirSync(this.fontsPath).filter(file =>
        fs.statSync(path.join(this.fontsPath, file)).isFile() &&
        file.match(/\.(ttf|otf|woff|woff2)$/i)
      )
    } catch (error) {
      console.error('[Resources] ❌ Error listing fonts:', error)
      return []
    }
  }

  /**
   * List all available videos
   */
  listVideos(): string[] {
    try {
      if (!fs.existsSync(this.videoPath)) return []
      return fs.readdirSync(this.videoPath).filter(file =>
        fs.statSync(path.join(this.videoPath, file)).isFile() &&
        file.match(/\.(mp4|avi|mov|wmv|webm)$/i)
      )
    } catch (error) {
      console.error('[Resources] ❌ Error listing videos:', error)
      return []
    }
  }

  /**
   * List all available voice files
   */
  listVoiceFiles(): string[] {
    try {
      if (!fs.existsSync(this.voicePath)) return []
      return fs.readdirSync(this.voicePath).filter(file =>
        fs.statSync(path.join(this.voicePath, file)).isFile() &&
        file.match(/\.(mp3|wav|ogg|m4a)$/i)
      )
    } catch (error) {
      console.error('[Resources] ❌ Error listing voice files:', error)
      return []
    }
  }

  /**
   * Get resource URL for serving to renderer process
   */
  getResourceURL(relativePath: string): string {
    if (this.isPackaged) {
      // In packaged apps, use the resource protocol
      return `resource://${relativePath}`
    } else {
      // In development, use file protocol
      const fullPath = path.join(this.resourcesPath, relativePath)
      return `file://${fullPath.replace(/\\/g, '/')}`
    }
  }

  /**
   * Get comprehensive diagnostics
   */
  getDiagnostics(): {
    isPackaged: boolean
    resourcesPath: string
    pathsExist: Record<string, boolean>
    criticalAssets: Record<string, boolean>
    availableAssets: {
      assets: string[]
      fonts: string[]
      videos: string[]
      voices: string[]
    }
  } {
    const paths = {
      resources: this.resourcesPath,
      assets: this.assetsPath,
      fonts: this.fontsPath,
      videos: this.videoPath,
      voices: this.voicePath
    }

    const pathsExist: Record<string, boolean> = {}
    Object.entries(paths).forEach(([key, pathValue]) => {
      pathsExist[key] = fs.existsSync(pathValue)
    })

    const criticalAssets = {
      sumatraPDF: this.isSumatraPDFAvailable(),
      logo: this.isLogoAvailable(),
      sumatraSettings: this.assetExists('SumatraPDF-settings.txt')
    }

    return {
      isPackaged: this.isPackaged,
      resourcesPath: this.resourcesPath,
      pathsExist,
      criticalAssets,
      availableAssets: {
        assets: this.listAssets(),
        fonts: this.listFonts(),
        videos: this.listVideos(),
        voices: this.listVoiceFiles()
      }
    }
  }

  /**
   * Resolve platform-specific paths
   */
  resolvePlatformPath(basePath: string, filename: string): string {
    const fullPath = path.join(basePath, filename)

    // On Windows, ensure proper path separators
    if (process.platform === 'win32') {
      return fullPath.replace(/\//g, '\\')
    }

    return fullPath
  }

  /**
   * Get safe file URI for renderer process
   */
  getSafeFileURI(filePath: string): string {
    // Convert Windows paths to forward slashes for URIs
    const normalizedPath = filePath.replace(/\\/g, '/')

    // Ensure proper file:// URI format
    if (normalizedPath.startsWith('file://')) {
      return normalizedPath
    }

    return `file://${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`
  }
}

// Export singleton instance
export const resourcePathManager = ResourcePathManager.getInstance()
