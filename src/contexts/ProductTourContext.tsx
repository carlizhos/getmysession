import React, { createContext, useContext, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { MODULE_TOURS } from '@/config/tourSteps';

interface ProductTourContextType {
  startTour: (moduleKey: string) => void;
  hasTourForModule: (moduleKey: string) => boolean;
}

const ProductTourContext = createContext<ProductTourContextType | undefined>(undefined);

export const ProductTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasTourForModule = useCallback((moduleKey: string) => {
    return !!MODULE_TOURS[moduleKey];
  }, []);

  const startTour = useCallback((moduleKey: string) => {
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
        try {
          localStorage.setItem(`saudade_tour_seen_${moduleKey}`, 'true');
        } catch (e) {
          console.error('Error saving tour state:', e);
        }
      },
    });

    driverObj.drive();
  }, []);

  return (
    <ProductTourContext.Provider value={{ startTour, hasTourForModule }}>
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
