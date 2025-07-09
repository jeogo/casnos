// 📁 Resource Protocol Handler - معالج بروتوكول الموارد
// This file handles static resource serving for production builds

import { protocol } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { getResourcePath } from '../utils/environment'

/**
 * تسجيل بروتوكول الموارد للإنتاج
 * Register resource protocol for production
 */
export function registerResourceProtocol(): void {
  console.log('[RESOURCE-PROTOCOL] 🔗 Registering resource protocol...')

  try {
    // Register a custom protocol for serving video files
    protocol.registerFileProtocol('app-resource', (request, callback) => {
      const url = request.url.replace('app-resource://', '')

      // Handle video files
      if (url.startsWith('video/')) {
        const videoPath = url.replace('video/', '')
        const fullPath = join(getResourcePath('video'), videoPath)

        if (existsSync(fullPath)) {
          console.log(`[RESOURCE-PROTOCOL] ✅ Serving video: ${fullPath}`)
          callback({ path: fullPath })
        } else {
          console.error(`[RESOURCE-PROTOCOL] ❌ Video not found: ${fullPath}`)
          callback({ error: -6 }) // FILE_NOT_FOUND
        }
        return
      }

      // Handle audio files
      if (url.startsWith('voice/')) {
        const audioPath = url.replace('voice/', '')
        const fullPath = join(getResourcePath('voice'), audioPath)

        if (existsSync(fullPath)) {
          console.log(`[RESOURCE-PROTOCOL] ✅ Serving audio: ${fullPath}`)
          callback({ path: fullPath })
        } else {
          console.error(`[RESOURCE-PROTOCOL] ❌ Audio not found: ${fullPath}`)
          callback({ error: -6 }) // FILE_NOT_FOUND
        }
        return
      }

      // Handle other resources
      const fullPath = join(getResourcePath('assets'), url)
      if (existsSync(fullPath)) {
        console.log(`[RESOURCE-PROTOCOL] ✅ Serving resource: ${fullPath}`)
        callback({ path: fullPath })
      } else {
        console.error(`[RESOURCE-PROTOCOL] ❌ Resource not found: ${fullPath}`)
        callback({ error: -6 }) // FILE_NOT_FOUND
      }
    })

    console.log('[RESOURCE-PROTOCOL] ✅ Resource protocol registered successfully')
  } catch (error) {
    console.error('[RESOURCE-PROTOCOL] ❌ Failed to register resource protocol:', error)
  }
}

/**
 * تسجيل بروتوكول HTTP مخصص للموارد
 * Register custom HTTP protocol for resources
 */
export function registerHttpResourceProtocol(): void {
  console.log('[RESOURCE-PROTOCOL] 🌐 Registering HTTP resource protocol...')

  try {
    // Register protocol to handle /video/ and /voice/ paths
    protocol.registerHttpProtocol('resource', (request, callback) => {
      const url = new URL(request.url)
      const pathname = url.pathname.replace(/^\//, '')

      if (pathname.startsWith('video/')) {
        const videoPath = pathname.replace('video/', '')
        const fullPath = join(getResourcePath('video'), videoPath)

        if (existsSync(fullPath)) {
          callback({
            url: `file://${fullPath}`,
            headers: {
              'Content-Type': 'video/mp4',
              'Cache-Control': 'no-cache',
              'Access-Control-Allow-Origin': '*'
            }
          })
        } else {
          callback({ error: -6 })
        }
        return
      }

      if (pathname.startsWith('voice/')) {
        const audioPath = pathname.replace('voice/', '')
        const fullPath = join(getResourcePath('voice'), audioPath)

        if (existsSync(fullPath)) {
          callback({
            url: `file://${fullPath}`,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-cache',
              'Access-Control-Allow-Origin': '*'
            }
          })
        } else {
          callback({ error: -6 })
        }
        return
      }

      callback({ error: -6 })
    })

    console.log('[RESOURCE-PROTOCOL] ✅ HTTP resource protocol registered successfully')
  } catch (error) {
    console.error('[RESOURCE-PROTOCOL] ❌ Failed to register HTTP resource protocol:', error)
  }
}

/**
 * إلغاء تسجيل البروتوكولات
 * Unregister protocols
 */
export function unregisterResourceProtocols(): void {
  try {
    if (protocol.isProtocolRegistered('app-resource')) {
      protocol.unregisterProtocol('app-resource')
      console.log('[RESOURCE-PROTOCOL] ✅ app-resource protocol unregistered')
    }

    if (protocol.isProtocolRegistered('resource')) {
      protocol.unregisterProtocol('resource')
      console.log('[RESOURCE-PROTOCOL] ✅ resource protocol unregistered')
    }
  } catch (error) {
    console.error('[RESOURCE-PROTOCOL] ❌ Failed to unregister protocols:', error)
  }
}
