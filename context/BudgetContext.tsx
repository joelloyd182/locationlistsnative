import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, setDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { useWeekStart } from './WeekStartContext';

// ── Types ────────────────────────────────────────

export type PriceHistoryEntry = {
  itemText: string;       // Normalized item name
  storeName: string;
  storeId: string;
  price: number;
  date: string;           // ISO date string
};

export type BudgetPeriod = 'weekly' | 'monthly';

type BudgetContextType = {
  /** Budget target amount */
  budgetTarget: number | null;
  /** Budget period (weekly or monthly) */
  budgetPeriod: BudgetPeriod;
  /** Set the budget target */
  setBudgetTarget: (amount: number | null) => Promise<void>;
  /** Set the budget period */
  setBudgetPeriod: (period: BudgetPeriod) => Promise<void>;
  /** All price history entries */
  priceHistory: PriceHistoryEntry[];
  /** Log a price to history */
  logPrice: (entry: Omit<PriceHistoryEntry, 'date'>) => Promise<void>;
  /** Get the last known price for an item at a store */
  getLastPrice: (itemText: string, storeId: string) => number | null;
  /** Get the last known price for an item across all stores */
  getLastPriceAnyStore: (itemText: string) => PriceHistoryEntry | null;
  /** Get spending for the current week */
  weeklySpend: number;
  /** Get spending for the current month */
  monthlySpend: number;
  /** Get spending per store for a date range */
  getSpendByStore: (startDate: Date, endDate: Date) => Record<string, { storeName: string; total: number; count: number }>;
  /** Get spend over time for chart data */
  getWeeklySpendHistory: (weeksBack: number) => Array<{ weekStart: string; total: number }>;
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

function normalizeItemName(text: string): string {
  return text.trim().toLowerCase();
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { getWeekStart } = useWeekStart();
  const [budgetTarget, setBudgetTargetState] = useState<number | null>(null);
  const [budgetPeriod, setBudgetPeriodState] = useState<BudgetPeriod>('weekly');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);

  // ── Load budget settings from AsyncStorage ─────
  useEffect(() => {
    loadBudgetSettings();
  }, []);

  const loadBudgetSettings = async () => {
    try {
      const [targetStr, periodStr] = await Promise.all([
        AsyncStorage.getItem('@budget_target'),
        AsyncStorage.getItem('@budget_period'),
      ]);
      if (targetStr !== null) setBudgetTargetState(parseFloat(targetStr));
      if (periodStr !== null) setBudgetPeriodState(periodStr as BudgetPeriod);
    } catch (error) {
      console.error('Failed to load budget settings:', error);
    }
  };

  const setBudgetTarget = async (amount: number | null) => {
    try {
      if (amount === null) {
        await AsyncStorage.removeItem('@budget_target');
      } else {
        await AsyncStorage.setItem('@budget_target', amount.toString());
      }
      setBudgetTargetState(amount);
    } catch (error) {
      console.error('Failed to save budget target:', error);
    }
  };

  const setBudgetPeriod = async (period: BudgetPeriod) => {
    try {
      await AsyncStorage.setItem('@budget_period', period);
      setBudgetPeriodState(period);
    } catch (error) {
      console.error('Failed to save budget period:', error);
    }
  };

  // ── Listen to price history from Firestore ─────
  useEffect(() => {
    if (!user) {
      setPriceHistory([]);
      return;
    }

    const historyRef = collection(db, 'users', user.uid, 'priceHistory');
    const unsubscribe = onSnapshot(historyRef, (snapshot) => {
      const entries: PriceHistoryEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          itemText: data.itemText,
          storeName: data.storeName,
          storeId: data.storeId,
          price: data.price,
          date: data.date,
        });
      });
      // Sort newest first
      entries.sort((a, b) => b.date.localeCompare(a.date));
      setPriceHistory(entries);
    });

    return () => unsubscribe();
  }, [user]);

  // ── Log a price ────────────────────────────────
  const logPrice = async (entry: Omit<PriceHistoryEntry, 'date'>) => {
    if (!user) return;
    
    const fullEntry: PriceHistoryEntry = {
      ...entry,
      itemText: normalizeItemName(entry.itemText),
      date: new Date().toISOString().split('T')[0],
    };

    try {
      // Use a composite key so we update rather than duplicate for same item+store+date
      const docId = `${normalizeItemName(entry.itemText)}_${entry.storeId}_${fullEntry.date}`;
      const docRef = doc(db, 'users', user.uid, 'priceHistory', docId);
      await setDoc(docRef, fullEntry);
    } catch (error) {
      console.error('Failed to log price:', error);
    }
  };

  // ── Price lookups ──────────────────────────────
  const getLastPrice = (itemText: string, storeId: string): number | null => {
    const normalized = normalizeItemName(itemText);
    const entry = priceHistory.find(
      e => e.itemText === normalized && e.storeId === storeId
    );
    return entry?.price ?? null;
  };

  const getLastPriceAnyStore = (itemText: string): PriceHistoryEntry | null => {
    const normalized = normalizeItemName(itemText);
    return priceHistory.find(e => e.itemText === normalized) ?? null;
  };

  // ── Spending calculations ──────────────────────
  const weeklySpend = useMemo(() => {
    const weekStart = getWeekStart();
    const weekStartStr = weekStart.toISOString().split('T')[0];
    return priceHistory
      .filter(e => e.date >= weekStartStr)
      .reduce((sum, e) => sum + e.price, 0);
  }, [priceHistory, getWeekStart]);

  const monthlySpend = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    return priceHistory
      .filter(e => e.date >= monthStartStr)
      .reduce((sum, e) => sum + e.price, 0);
  }, [priceHistory]);

  const getSpendByStore = (startDate: Date, endDate: Date) => {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const result: Record<string, { storeName: string; total: number; count: number }> = {};
    
    priceHistory
      .filter(e => e.date >= startStr && e.date <= endStr)
      .forEach(e => {
        if (!result[e.storeId]) {
          result[e.storeId] = { storeName: e.storeName, total: 0, count: 0 };
        }
        result[e.storeId].total += e.price;
        result[e.storeId].count += 1;
      });
    
    return result;
  };

  const getWeeklySpendHistory = (weeksBack: number) => {
    const weeks: Array<{ weekStart: string; total: number }> = [];
    
    for (let i = weeksBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      
      const total = priceHistory
        .filter(e => e.date >= startStr && e.date < endStr)
        .reduce((sum, e) => sum + e.price, 0);
      
      weeks.push({
        weekStart: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total,
      });
    }
    
    return weeks;
  };

  return (
    <BudgetContext.Provider value={{
      budgetTarget,
      budgetPeriod,
      setBudgetTarget,
      setBudgetPeriod,
      priceHistory,
      logPrice,
      getLastPrice,
      getLastPriceAnyStore,
      weeklySpend,
      monthlySpend,
      getSpendByStore,
      getWeeklySpendHistory,
    }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
