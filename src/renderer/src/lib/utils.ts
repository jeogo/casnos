import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * دالة مساعدة لدمج وتنظيم CSS classes
 * تستخدم clsx و tailwind-merge لحل تضارب الفئات
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ألوان النظام المخصصة
 */
export const colors = {
  primary: '#6988e6',
  secondary: '#e69e88',
  background: {
    DEFAULT: '#1b1b1f',
    soft: '#222222',
    mute: '#282828',
  },
  text: {
    DEFAULT: 'rgba(255, 255, 245, 0.86)',
    secondary: 'rgba(235, 235, 245, 0.6)',
    muted: 'rgba(235, 235, 245, 0.38)',
  }
} as const

/**
 * فئات CSS مُعرفة مسبقاً للاستخدام المتكرر
 */
export const commonClasses = {
  // Cards
  card: 'bg-background-soft rounded-lg p-6 shadow-lg',
  cardHover: 'hover:bg-background-mute transition-colors duration-200',

  // Buttons
  button: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
  buttonPrimary: 'bg-primary text-white hover:bg-blue-600',
  buttonSecondary: 'bg-background-mute text-text hover:bg-gray-2',

  // Text
  heading: 'text-text font-bold',
  textSecondary: 'text-text-secondary',
  textMuted: 'text-text-muted',

  // Layout
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  centerFlex: 'flex items-center justify-center',

  // Animations
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
} as const
