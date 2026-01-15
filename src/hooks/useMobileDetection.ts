import { useState, useEffect } from 'react';
import { isMobileViewport } from "../utils/mobile";

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileViewport());

    // Optional: Listen for resize events to detect orientation changes
    const handleResize = () => {
      setIsMobile(isMobileViewport());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}; 
