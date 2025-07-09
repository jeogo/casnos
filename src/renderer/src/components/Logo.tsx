import React, { useState, useEffect } from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  position?: 'left' | 'center' | 'right'
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', position = 'left' }) => {
  const [logoSrc, setLogoSrc] = useState<string>('')
  const [showFallback, setShowFallback] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl'
  }

  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }

  useEffect(() => {
    // Try multiple possible logo paths for Electron app
    const possiblePaths = [
      // Most likely to work - from public directory (should work in both dev and prod)
      '/logo.png',
      '/assets/logo.png',
      // Direct resource paths (fallback)
      'logo.png',
      'assets/logo.png',
      // Legacy paths (if needed)
      './resources/logo.png',
      './resources/assets/logo.png',
      '../resources/logo.png',
      '../resources/assets/logo.png'
    ]

    const testImagePath = async (path: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          resolve(true)
        }
        img.onerror = () => {
          resolve(false)
        }

        // Set the src to start loading
        img.src = path

        // Add timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete || img.naturalWidth === 0) {
            resolve(false)
          }
        }, 3000) // Increased timeout to 3 seconds
      })
    }

    const findWorkingLogo = async () => {
      for (let i = 0; i < possiblePaths.length; i++) {
        const path = possiblePaths[i]

        const works = await testImagePath(path)
        if (works) {
          setLogoSrc(path)
          setShowFallback(false)
          return
        }
      }

      setShowFallback(true)
    }

    findWorkingLogo()
  }, [])

  const handleImageError = () => {
    setShowFallback(true)
  }

  if (showFallback || !logoSrc) {
    // Beautiful fallback icon that always works
    return (
      <div className={`flex items-center ${positionClasses[position]} ${className}`}>
        <div className={`${sizeClasses[size]} flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl font-bold drop-shadow-lg border-2 border-blue-300 transition-all duration-200 hover:scale-105 relative group`}>
          <span className="text-2xl">🎫</span>

          {/* Tooltip showing that this is a fallback */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Logo fallback - CASNOS
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center ${positionClasses[position]} ${className}`}>
      <img
        src={logoSrc}
        alt="CASNOS Logo"
        className={`${sizeClasses[size]} object-contain drop-shadow-lg rounded-lg transition-all duration-200 hover:scale-105`}
        onError={handleImageError}
        loading="eager"
      />
    </div>
  )
}

export default Logo
