import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Store = {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  triggerRadius: number;
  website?: string;
  items: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
};

type StoresContextType = {
  stores: Store[];
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (id: string, updates: Partial<Store>) => void;
  deleteStore: (id: string) => void;
  addItem: (storeId: string, text: string) => void;
  toggleItem: (storeId: string, itemId: string) => void;
  deleteItem: (storeId: string, itemId: string) => void;
};

const StoresContext = createContext<StoresContextType | undefined>(undefined);

export function StoresProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);

  // Load stores from storage on mount
  useEffect(() => {
    loadStores();
  }, []);

  // Save stores whenever they change
  useEffect(() => {
    saveStores();
  }, [stores]);

  const loadStores = async () => {
    try {
      const stored = await AsyncStorage.getItem('stores');
      if (stored) {
        setStores(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const saveStores = async () => {
    try {
      await AsyncStorage.setItem('stores', JSON.stringify(stores));
    } catch (error) {
      console.error('Failed to save stores:', error);
    }
  };

  const addStore = (store: Omit<Store, 'id'>) => {
    const newStore: Store = {
      ...store,
      id: Date.now().toString(),
    };
    setStores([...stores, newStore]);
  };

  const updateStore = (id: string, updates: Partial<Store>) => {
    setStores(stores.map(store => 
      store.id === id ? { ...store, ...updates } : store
    ));
  };

  const deleteStore = (id: string) => {
    setStores(stores.filter(store => store.id !== id));
  };

  const addItem = (storeId: string, text: string) => {
    setStores(stores.map(store => {
      if (store.id === storeId) {
        return {
          ...store,
          items: [
            ...store.items,
            {
              id: Date.now().toString(),
              text,
              checked: false,
            }
          ]
        };
      }
      return store;
    }));
  };

  const toggleItem = (storeId: string, itemId: string) => {
    setStores(stores.map(store => {
      if (store.id === storeId) {
        return {
          ...store,
          items: store.items.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      }
      return store;
    }));
  };

  const deleteItem = (storeId: string, itemId: string) => {
    setStores(stores.map(store => {
      if (store.id === storeId) {
        return {
          ...store,
          items: store.items.filter(item => item.id !== itemId)
        };
      }
      return store;
    }));
  };

  return (
    <StoresContext.Provider value={{
      stores,
      addStore,
      updateStore,
      deleteStore,
      addItem,
      toggleItem,
      deleteItem,
    }}>
      {children}
    </StoresContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoresContext);
  if (!context) {
    throw new Error('useStores must be used within StoresProvider');
  }
  return context;
}