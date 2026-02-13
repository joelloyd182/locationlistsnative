import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ... 6 = Saturday

type WeekStartContextType = {
  weekStartDay: WeekStartDay;
  setWeekStartDay: (day: WeekStartDay) => Promise<void>;
  getWeekStart: (date?: Date) => Date;
};

const WeekStartContext = createContext<WeekStartContextType | undefined>(undefined);

export function WeekStartProvider({ children }: { children: React.ReactNode }) {
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>(6); // Default: Saturday

  useEffect(() => {
    loadWeekStartDay();
  }, []);

  const loadWeekStartDay = async () => {
    try {
      const saved = await AsyncStorage.getItem('@week_start_day');
      if (saved !== null) {
        setWeekStartDayState(parseInt(saved) as WeekStartDay);
      }
    } catch (error) {
      console.error('Failed to load week start day:', error);
    }
  };

  const setWeekStartDay = async (day: WeekStartDay) => {
    try {
      await AsyncStorage.setItem('@week_start_day', day.toString());
      setWeekStartDayState(day);
    } catch (error) {
      console.error('Failed to save week start day:', error);
    }
  };

  const getWeekStart = (date: Date = new Date()): Date => {
    const current = new Date(date);
    const currentDay = current.getDay();
    
    // Calculate days to subtract to get to week start
    let daysToSubtract = currentDay - weekStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);
    
    return weekStart;
  };

  return (
    <WeekStartContext.Provider value={{ weekStartDay, setWeekStartDay, getWeekStart }}>
      {children}
    </WeekStartContext.Provider>
  );
}

export function useWeekStart() {
  const context = useContext(WeekStartContext);
  if (context === undefined) {
    throw new Error('useWeekStart must be used within a WeekStartProvider');
  }
  return context;
}

export const WEEK_START_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;
