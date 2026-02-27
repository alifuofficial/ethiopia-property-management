'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CalendarType, formatDateByCalendar } from '@/lib/ethiopian-calendar';

interface CalendarContextType {
  calendarType: CalendarType;
  setCalendarType: (type: CalendarType) => void;
  systemDefault: CalendarType;
  setSystemDefault: (type: CalendarType) => void;
  toggleCalendar: () => void;
  formatDate: (date: Date | string, format?: 'short' | 'long' | 'amharic') => string;
  formatDateTime: (date: Date | string, format?: 'short' | 'long') => string;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const STORAGE_KEY = 'preferred-calendar';

export function CalendarProvider({ 
  children,
  initialDefault = 'gregorian',
}: { 
  children: ReactNode;
  initialDefault?: CalendarType;
}) {
  const [systemDefault, setSystemDefault] = useState<CalendarType>(initialDefault);
  const [calendarType, setCalendarTypeState] = useState<CalendarType>(() => {
    // Check localStorage for user preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as CalendarType | null;
      if (stored === 'gregorian' || stored === 'ethiopian') {
        return stored;
      }
    }
    return initialDefault;
  });

  // Update system default when it changes from settings
  useEffect(() => {
    setSystemDefault(initialDefault);
  }, [initialDefault]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newValue = e.newValue as CalendarType;
        if (newValue === 'gregorian' || newValue === 'ethiopian') {
          setCalendarTypeState(newValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setCalendarType = (type: CalendarType) => {
    setCalendarTypeState(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, type);
    }
  };

  const toggleCalendar = () => {
    const newType = calendarType === 'gregorian' ? 'ethiopian' : 'gregorian';
    setCalendarType(newType);
  };

  const formatDate = (date: Date | string, format: 'short' | 'long' | 'amharic' = 'short') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDateByCalendar(dateObj, calendarType, format);
  };

  const formatDateTime = (date: Date | string, format: 'short' | 'long' = 'short') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateStr = formatDateByCalendar(dateObj, calendarType, format);
    const time = dateObj.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    return `${dateStr} ${time}`;
  };

  return (
    <CalendarContext.Provider value={{ 
      calendarType, 
      setCalendarType, 
      systemDefault, 
      setSystemDefault,
      toggleCalendar,
      formatDate,
      formatDateTime,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

// Simple hook for components that just need formatting
export function useCalendarFormat() {
  const { calendarType, formatDate, formatDateTime } = useCalendar();
  
  return {
    calendarType,
    formatDate,
    formatDateTime,
  };
}
