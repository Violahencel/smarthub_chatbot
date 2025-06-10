import { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = useCallback(() => {
    setLoadingCount(prev => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <LoadingContext.Provider value={{
      isLoading: loadingCount > 0,
      startLoading,
      stopLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const withLoading = async <T,>(
  fn: () => Promise<T>,
  { startLoading, stopLoading }: { startLoading: () => void; stopLoading: () => void }
): Promise<T> => {
  startLoading();
  try {
    return await fn();
  } finally {
    stopLoading();
  }
}; 