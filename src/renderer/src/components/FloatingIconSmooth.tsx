import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import Logo from './Logo';

interface FloatingIconProps {
  currentTicketNumber?: string;
  queueCount?: number;
  isActive?: boolean;
  children: React.ReactNode;
}

const FloatingIcon: React.FC<FloatingIconProps> = ({
  currentTicketNumber,
  queueCount = 0,
  isActive = false,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateTime = useRef<number>(0);

  // Use motion values for smooth animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for smooth movement
  const springX = useSpring(x, {
    stiffness: 400,
    damping: 40,
    mass: 0.8,
    restDelta: 0.01
  });
  const springY = useSpring(y, {
    stiffness: 400,
    damping: 40,
    mass: 0.8,
    restDelta: 0.01
  });

  // Smooth window resize
  useEffect(() => {
    if (window.api?.windowResize) {
      if (isExpanded) {
        window.api.windowResize(500, 650);
      } else {
        window.api.windowResize(80, 80);
      }
    }
  }, [isExpanded]);

  // Throttled position update using RAF
  const updateWindowPosition = useCallback((clientX: number, clientY: number) => {
    const now = performance.now();
    if (now - lastUpdateTime.current < 16) return; // ~60fps throttling

    lastUpdateTime.current = now;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const screenX = clientX - 40; // Center the icon
      const screenY = clientY - 40;

      // Smooth boundary constraints
      const padding = 20;
      const maxX = window.screen.availWidth - 80 - padding;
      const maxY = window.screen.availHeight - 80 - padding;

      const constrainedX = Math.max(padding, Math.min(screenX, maxX));
      const constrainedY = Math.max(padding, Math.min(screenY, maxY));

      // Update motion values for smooth animation
      x.set(constrainedX);
      y.set(constrainedY);

      // Update Electron window position
      if (window.api?.windowSetPosition) {
        window.api.windowSetPosition(constrainedX, constrainedY);
      }
    });
  }, [x, y]);

  // Enhanced pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isExpanded) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.currentTarget as HTMLElement;

    // Set pointer capture for smooth tracking
    element.setPointerCapture(e.pointerId);
    setIsDragging(true);

    // Add visual feedback
    element.style.cursor = 'grabbing';

    // Initial position update
    updateWindowPosition(e.clientX, e.clientY);
  }, [isExpanded, updateWindowPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    e.preventDefault();
    updateWindowPosition(e.clientX, e.clientY);
  }, [isDragging, updateWindowPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const element = e.currentTarget as HTMLElement;

    // Release pointer capture
    element.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    // Reset cursor
    element.style.cursor = 'grab';

    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, [isDragging]);

  const handleToggleExpand = useCallback(() => {
    if (!isDragging) {
      setIsExpanded(!isExpanded);
    }
  }, [isDragging, isExpanded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-transparent pointer-events-none">
      {/* Collapsed State - Draggable Icon */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            ref={dragRef}
            className="absolute z-50 pointer-events-auto"
            style={{
              width: '80px',
              height: '80px',
              x: springX,
              y: springY,
              cursor: 'grab',
              touchAction: 'none', // Prevent scrolling on touch
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? 5 : 0
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleToggleExpand}
          >
            {/* Icon Container */}
            <div className="relative w-full h-full">
              {/* Main Icon */}
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-2xl border-2 border-white/20 flex items-center justify-center backdrop-blur-xl"
                animate={{
                  boxShadow: isDragging
                    ? "0 25px 50px -12px rgba(59, 130, 246, 0.5)"
                    : "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                }}
                transition={{ duration: 0.2 }}
              >
                {/* Logo */}
                <Logo className="w-8 h-8 text-white" size="md" />

                {/* Ticket Number Badge */}
                {currentTicketNumber && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <span className="text-xs font-bold text-white">
                      {currentTicketNumber.slice(-1)}
                    </span>
                  </motion.div>
                )}

                {/* Queue Count Badge */}
                {queueCount > 0 && (
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border border-white shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <span className="text-xs font-bold text-white">
                      {queueCount > 99 ? '99+' : queueCount}
                    </span>
                  </motion.div>
                )}

                {/* Status Indicator */}
                <motion.div
                  className={`absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                    isActive ? 'bg-green-400' : 'bg-gray-400'
                  }`}
                  animate={{
                    scale: isActive ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>

              {/* Enhanced Glow Effect */}
              <motion.div
                className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 blur-md -z-10"
                animate={{
                  opacity: isDragging ? 0.8 : 0.4,
                  scale: isDragging ? 1.3 : 1.1,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded State - Full Interface */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-full h-full max-w-lg max-h-[650px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Logo className="w-6 h-6 text-white" size="md" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">شباك الخدمة</h2>
                    <p className="text-sm opacity-90">نظام إدارة الطوابير</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleToggleExpand}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="تصغير النافذة"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </motion.button>

                  <motion.button
                    onClick={() => window.api?.windowClose?.()}
                    className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="إغلاق النافذة"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-white">
                <div className="p-4 h-full">
                  {children}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingIcon;
