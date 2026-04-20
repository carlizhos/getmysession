import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  delay?: number; // Time in ms before settling
}

const NotificationBadge = ({ count, className, delay = 10000 }: NotificationBadgeProps) => {
  const [isSettled, setIsSettled] = useState(false);
  const [isVisible, setIsVisible] = useState(count > 0);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > 0) {
      setIsVisible(true);
      // If count increased, "wake up" from settled state
      if (count !== prevCount.current) {
        setIsSettled(false);
      }
    } else {
      setIsVisible(false);
    }
    prevCount.current = count;
  }, [count]);

  useEffect(() => {
    if (isVisible && !isSettled) {
      const timer = setTimeout(() => {
        setIsSettled(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isSettled, delay]);

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
