import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { MODULE_TOURS } from '@/config/tourSteps';
import { supabase } from '@/lib/supabase';

interface ProductTourContextType {
  startTour: (moduleKey: string) => void;
  stopTour: () => void;
  hasTourForModule: (moduleKey: string) => boolean;
}

const ProductTourContext = createContext<ProductTourContextType | undefined>(undefined);

export const ProductTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const driverInstanceRef = useRef<Driver | null>(null);

  const stopTour = useCallback(() => {
    if (driverInstanceRef.current) {
      try {
        driverInstanceRef.current.destroy();
      } catch (e) {
        console.error('Error destroying driver tour:', e);
      }
      driverInstanceRef.current = null;
    }
    // Clean up any remaining driver.js DOM artifacts
    if (typeof document !== 'undefined') {
      const selector = '.driver-popover, .driver-overlay, .driver-active-element, .driver-stage-nolight, div[id^="driver-"]';
      document.querySelectorAll(selector).forEach(el => el.remove());
    }
  }, []);

  // Listen to Supabase auth state change: if signed out, terminate any active tour
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        stopTour();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [stopTour]);

  // Listen to URL location changes: if navigating to unauthenticated/auth routes, kill tour
  useEffect(() => {
    const checkAuthRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const authRoutes = ['/auth', '/login', '/portal/login', '/reset-password', '/update-password', '/forgot-password'];
      if (authRoutes.some(route => path.startsWith(route))) {
        stopTour();
      }
    };

    checkAuthRoute();
    window.addEventListener('popstate', checkAuthRoute);
    return () => {
      window.removeEventListener('popstate', checkAuthRoute);
    };
  }, [stopTour]);

  const hasTourForModule = useCallback((moduleKey: string) => {
    return !!MODULE_TOURS[moduleKey];
  }, []);

  const startTour = useCallback((moduleKey: string) => {
    // Stop any previously running tour
    stopTour();

    const config = MODULE_TOURS[moduleKey];
    if (!config || !config.steps || config.steps.length === 0) return;

    // Filter steps to only include elements that exist in the DOM right now
    const validSteps = config.steps.filter(step => {
      if (typeof step.element === 'string') {
        return !!document.querySelector(step.element);
      }
      return true;
    });

    if (validSteps.length === 0) return;

    const driverObj: Driver = driver({
      showProgress: true,
      animate: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Entendido! ✨',
      steps: validSteps,
      onDestroyed: () => {
        driverInstanceRef.current = null;
        try {
          localStorage.setItem(`getmysession_tour_seen_${moduleKey}`, 'true');
        } catch (e) {
          console.error('Error saving tour state:', e);
        }
      },
    });

    driverInstanceRef.current = driverObj;
    driverObj.drive();
  }, [stopTour]);

  return (
    <ProductTourContext.Provider value={{ startTour, stopTour, hasTourForModule }}>
      {children}
    </ProductTourContext.Provider>
  );
};

export const useProductTour = () => {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useProductTour must be used within a ProductTourProvider');
  }
  return context;
};
