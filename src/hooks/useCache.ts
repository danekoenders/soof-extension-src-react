import { useState, useEffect } from 'react';

interface CacheData {
  chatbot: any | null;
  shop: any | null;
}

interface Cache {
  data: CacheData;
  expiresAt: string | null;
}

const defaultCache: Cache = {
  data: {
    chatbot: null,
    shop: null,
  },
  expiresAt: null,
};

export const useCache = () => {
  const [cache, setCacheState] = useState<Cache>(defaultCache);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cache from sessionStorage on mount
  useEffect(() => {
    const loadCache = () => {
      try {
        const itemString = sessionStorage.getItem('soof-chat-cache');
        if (itemString) {
          const item = JSON.parse(itemString);
          const now = new Date();
          const expiresAt = new Date(item.expiresAt);

          if (expiresAt < now) {
            sessionStorage.removeItem('soof-chat-cache');
            setCacheState(defaultCache);
          } else {
            setCacheState(item);
          }
        }
      } catch (error) {
        console.error('Error loading cache:', error);
        setCacheState(defaultCache);
      } finally {
        setIsLoaded(true);
      }
    };

    loadCache();
  }, []);

  const setCache = (data?: CacheData) => {
    try {
      const now = new Date();
      const updatedCache: Cache = {
        data: data || cache.data,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      setCacheState(updatedCache);
      sessionStorage.setItem('soof-chat-cache', JSON.stringify(updatedCache));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  };

  const clearCache = () => {
    setCacheState(defaultCache);
    sessionStorage.removeItem('soof-chat-cache');
  };

  return {
    cache,
    setCache,
    clearCache,
    isLoaded,
  };
}; 