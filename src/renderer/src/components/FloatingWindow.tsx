import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import Logo from './Logo';

interface FloatingWindowProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  currentTicketNumber?: string;
  children: React.ReactNode;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  isCollapsed,
  onToggleCollapse,
  position,
  onPositionChange,
  currentTicketNumber,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // تحديد حدود السحب
  const bounds = {
    left: 0,
    top: 0,
    right: window.innerWidth - (isCollapsed ? 60 : 400),
    bottom: window.innerHeight - (isCollapsed ? 60 : 600)
  };

  // إعداد السحب
  const bind = useDrag(
    ({ active, movement: [mx, my], first, last }) => {
      if (first) {
        setIsDragging(true);
      }

      if (last) {
        setIsDragging(false);
        // حفظ الموقع في localStorage
        localStorage.setItem('floatingWindowPosition', JSON.stringify({
          x: Math.max(bounds.left, Math.min(bounds.right, position.x + mx)),
          y: Math.max(bounds.top, Math.min(bounds.bottom, position.y + my))
        }));
      }

      if (active) {
        onPositionChange({
          x: Math.max(bounds.left, Math.min(bounds.right, position.x + mx)),
          y: Math.max(bounds.top, Math.min(bounds.bottom, position.y + my))
        });
      }
    },
    {
      filterTaps: true,
      threshold: 5
    }
  );

  // استعادة الموقع عند التحميل
  useEffect(() => {
    const savedPosition = localStorage.getItem('floatingWindowPosition');
    if (savedPosition) {
      try {
        const parsedPosition = JSON.parse(savedPosition);
        onPositionChange(parsedPosition);
      } catch (error) {
        console.error('Error parsing saved position:', error);
      }
    }
  }, []);

  // تحديث الحدود عند تغيير الحالة
  useEffect(() => {
    const newBounds = {
      left: 0,
      top: 0,
      right: window.innerWidth - (isCollapsed ? 60 : 400),
      bottom: window.innerHeight - (isCollapsed ? 60 : 600)
    };

    // التأكد من أن الموقع الحالي لا يزال صالحاً
    if (position.x > newBounds.right || position.y > newBounds.bottom) {
      onPositionChange({
        x: Math.min(position.x, newBounds.right),
        y: Math.min(position.y, newBounds.bottom)
      });
    }
  }, [isCollapsed, position]);

  // متغيرات الأنيميشن
  const windowVariants: Variants = {
    collapsed: {
      width: 60,
      height: 60,
      borderRadius: "50%",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
        duration: 0.6
      }
    },
    expanded: {
      width: 400,
      height: 600,
      borderRadius: "16px",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25,
        duration: 0.6
      }
    }
  };

  const contentVariants: Variants = {
    collapsed: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    },
    expanded: {
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0.3,
        duration: 0.4
      }
    }
  };

  const iconVariants: Variants = {
    collapsed: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.2
      }
    },
    expanded: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none'
      }}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={windowVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
    >
      {/* الحاوية الرئيسية */}
      <div
        {...bind()}
        className={`
          relative overflow-hidden
          ${isCollapsed
            ? 'w-15 h-15 bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl'
            : 'w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 shadow-2xl'
          }
          backdrop-blur-xl border border-white/20
          ${isDragging ? 'scale-105 rotate-1' : ''}
          ${isHovered && isCollapsed ? 'shadow-blue-500/50' : ''}
          transition-all duration-300 ease-out
        `}
        style={{
          borderRadius: isCollapsed ? '50%' : '16px'
        }}
      >
        {/* الأيقونة المصغرة */}
        <AnimatePresence>
          {isCollapsed && (
            <motion.div
              variants={iconVariants}
              initial="expanded"
              animate="collapsed"
              exit="expanded"
              className="absolute inset-0 flex flex-col items-center justify-center text-white"
              onClick={onToggleCollapse}
            >
              <Logo className="w-8 h-8 mb-1" size="sm" />
              {currentTicketNumber && (
                <span className="text-xs font-bold bg-white/20 px-1 rounded">
                  {currentTicketNumber}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* المحتوى الموسع */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="relative w-full h-full"
            >
              {/* زر الإغلاق */}
              <button
                onClick={onToggleCollapse}
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
              >
                <span className="text-lg">×</span>
              </button>

              {/* المحتوى */}
              <div className="w-full h-full">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* تأثيرات بصرية إضافية */}
        {isCollapsed && isHovered && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 blur-sm opacity-60 animate-pulse -z-10" />
        )}
      </div>

      {/* مؤشر السحب */}
      {isDragging && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-ping" />
      )}
    </motion.div>
  );
};

export default FloatingWindow;
