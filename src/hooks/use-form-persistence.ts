import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';

/**
 * A hook to persist form state to localStorage.
 * 
 * @param key The localStorage key to use.
 * @param initialValue The initial value if no data is found in storage.
 * @param validationFn Optional function to validate the stored data. If it returns false, stored data is discarded.
 * @returns [state, setState, clearState]
 */
export function useFormPersistence<T>(
  key: string, 
  initialValue: T,
  validationFn?: (data: T) => boolean
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  
  // Initialize state lazily
  const [state, setState] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Optional validation to ensure schema matches or data isn't stale
        if (validationFn && !validationFn(parsed)) {
          return initialValue;
        }
        return parsed;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return initialValue;
  });

  // Update localStorage when state changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(`Error writing to localStorage key "${key}":`, error);
    }
  }, [key, state]);

  // Function to clear storage (e.g., after successful submission)
  const clearState = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setState(initialValue);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [state, setState, clearState];
}
