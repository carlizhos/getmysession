import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  forceSettled?: boolean; // Prop to synchronize with parent
  delay?: number;
}

const NotificationBadge = ({ count, className, forceSettled, delay = 10000 }: NotificationBadgeProps) => {
  const [internalSettled, setInternalSettled] = useState(false);
  const [isVisible, setIsVisible] = useState(count > 0);
  const prevCount = useRef(count);

  // Determine state: prefer prop, fallback to internal
  const isSettled = forceSettled !== undefined ? forceSettled : internalSettled;

  useEffect(() => {
    if (count > 0) {
      setIsVisible(true);
      if (count !== prevCount.current) {
        setInternalSettled(false);
      }
    } else {
      setIsVisible(false);
    }
    prevCount.current = count;
  }, [count]);

  useEffect(() => {
    if (isVisible && !internalSettled && forceSettled === undefined) {
      const timer = setTimeout(() => {
        setInternalSettled(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, internalSettled, delay, forceSettled]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-destructive text-white font-bold transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        isSettled 
          ? "h-2 w-2 text-[0px] scale-75 shadow-none shadow-destructive/0" 
          : "h-[13px] w-[13px] text-[7.5px] scale-100 shadow-sm shadow-destructive/40 animate-in zoom-in-50",
        className
      )}
    >
      <span 
        className={cn(
          "transition-all duration-500",
          isSettled ? "opacity-0 scale-50" : "opacity-100 scale-100"
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    </div>
  );
};

export default NotificationBadge;
