import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

interface FloatingIconProps {
  children: React.ReactNode;
}

const FloatingIcon: React.FC<FloatingIconProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Handle window resize from main process
  useEffect(() => {
    if (window.api && window.api.windowResize) {
      if (isExpanded) {
        // Expand to full content size
        window.api.windowResize(500, 700);
      } else {
        // Collapse to small icon
        window.api.windowResize(80, 80);
      }
    }
  }, [isExpanded]);

  // Handle drag functionality for small icon
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return; // Don't drag when expanded

    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Update Electron window position
      if (window.api && window.api.windowSetPosition) {
        window.api.windowSetPosition(deltaX, deltaY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // If collapsed, show just the floating icon
  if (!isExpanded) {
    return (
      <div className="w-full h-full bg-transparent flex items-center justify-center">
        <motion.div
          className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-2xl border-2 border-white/20 flex items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragging ? 'scale-110 shadow-blue-500/50' : 'hover:scale-105 hover:shadow-lg'
          }`}
          onMouseDown={handleMouseDown}
          onClick={toggleExpanded}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Logo */}
          <Logo className="w-8 h-8 text-white" size="md" />

          {/* Status Indicator */}
          <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-white shadow-lg bg-green-400 animate-pulse" />

          {/* Glow Effect */}
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 blur-md opacity-60 -z-10 transition-opacity duration-300 animate-pulse" />
        </motion.div>
      </div>
    );
  }

  // If expanded, show the full interface
  return (
    <div className="w-full h-full bg-transparent">
      <AnimatePresence>
        <motion.div
          className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Header with controls */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo className="w-6 h-6" size="sm" />
              <span className="text-lg font-bold">شباك الخدمة</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleExpanded}
                className="w-8 h-8 rounded-full bg-yellow-500/80 hover:bg-yellow-500 flex items-center justify-center text-sm transition-colors"
                title="تصغير"
              >
                −
              </button>
              <button
                onClick={() => window.api?.windowClose()}
                className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-sm transition-colors"
                title="إغلاق"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FloatingIcon;
