import React, { createContext, useState, useContext, useEffect } from 'react';
import { syncStoresToCache } from '../services/geofencing';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  arrayUnion,
  arrayRemove,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { parseFirestoreError, showErrorAlert, withErrorHandling } from '../utils/errorHandling';

export type Store = {
  id: string;
  name: string;
  isOnline: boolean;  // NEW: Whether this is an online-only store
  address?: string;   // Optional for online stores
  location?: {        // Optional for online stores
    lat: number;
    lng: number;
  };
  triggerRadius?: number;  // Optional for online stores
  website?: string;   // Recommended for online stores
  items: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
  userId: string;
  members?: string[];
  placeId?: string;
  phone?: string;
  rating?: number;
  openingHours?: string[];
  photos?: string[];
};

type StoresContextType = {
  stores: Store[];
  loading: boolean;
  error: string | null;
  addStore: (store: Omit<Store, 'id' | 'userId'>) => Promise<boolean>;
  updateStore: (id: string, updates: Partial<Store>) => Promise<boolean>;
  deleteStore: (id: string) => Promise<boolean>;
  addItem: (storeId: string, itemText: string) => Promise<boolean>;
  addItems: (storeId: string, itemTexts: string[]) => Promise<boolean>;
  toggleItem: (storeId: string, itemId: string) => Promise<boolean>;
  deleteItem: (storeId: string, itemId: string) => Promise<boolean>;
};

const StoresContext = createContext<StoresContextType | undefined>(undefined);

export function StoresProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStores([]);
      setLoading(false);
      return;
    }

    const storesRef = collection(db, 'stores');
    const q = query(
      storesRef,
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const storesData: Store[] = [];
        snapshot.forEach((doc) => {
          storesData.push({ id: doc.id, ...doc.data() } as Store);
        });
        setStores(storesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore sync error:', err);
        const appError = parseFirestoreError(err);
        setError(appError.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sync stores to AsyncStorage for geofencing (only physical stores)
  useEffect(() => {
    if (stores.length > 0) {
      // Filter to only physical stores for geofencing
      const physicalStores = stores.filter(s => !s.isOnline);
      syncStoresToCache(physicalStores);
    }
  }, [stores]);

  const addStore = async (storeData: Omit<Store, 'id' | 'userId'>): Promise<boolean> => {
    if (!user) return false;

    const result = await withErrorHandling(
      async () => {
        const docRef = await addDoc(collection(db, 'stores'), {
          ...storeData,
          userId: user.uid,
          members: [user.uid],
          createdAt: Timestamp.now(),
        });
        return docRef.id;
      },
      undefined,
      () => addStore(storeData) // Retry function
    );

    return result !== null;
  };

  const updateStore = async (id: string, updates: Partial<Store>): Promise<boolean> => {
    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', id);
        await updateDoc(storeRef, {
          ...updates,
          updatedAt: Timestamp.now(),
        });
        return true;
      },
      undefined,
      () => updateStore(id, updates) // Retry function
    );

    return result !== null;
  };

  const deleteStore = async (id: string): Promise<boolean> => {
    const result = await withErrorHandling(
      async () => {
        await deleteDoc(doc(db, 'stores', id));
        return true;
      },
      undefined,
      () => deleteStore(id) // Retry function
    );

    return result !== null;
  };

  const addItem = async (storeId: string, itemText: string): Promise<boolean> => {
    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        const newItem = {
          id: Date.now().toString(),
          text: itemText,
          checked: false,
        };
        
        await updateDoc(storeRef, {
          items: arrayUnion(newItem),
          updatedAt: Timestamp.now(),
        });
        return true;
      },
      undefined,
      () => addItem(storeId, itemText) // Retry function
    );

    return result !== null;
  };

  const addItems = async (storeId: string, itemTexts: string[]): Promise<boolean> => {
    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        const newItems = itemTexts.map(text => ({
          id: `${Date.now()}-${Math.random()}`,
          text,
          checked: false,
        }));
        
        await updateDoc(storeRef, {
          items: arrayUnion(...newItems),
          updatedAt: Timestamp.now(),
        });
        return true;
      },
      undefined,
      () => addItems(storeId, itemTexts) // Retry function
    );

    return result !== null;
  };

  const toggleItem = async (storeId: string, itemId: string): Promise<boolean> => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return false;

    const item = store.items.find(i => i.id === itemId);
    if (!item) return false;

    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        const updatedItem = { ...item, checked: !item.checked };
        
        await updateDoc(storeRef, {
          items: arrayRemove(item),
        });
        
        await updateDoc(storeRef, {
          items: arrayUnion(updatedItem),
          updatedAt: Timestamp.now(),
        });
        return true;
      },
      undefined,
      () => toggleItem(storeId, itemId) // Retry function
    );

    return result !== null;
  };

  const deleteItem = async (storeId: string, itemId: string): Promise<boolean> => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return false;

    const item = store.items.find(i => i.id === itemId);
    if (!item) return false;

    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        await updateDoc(storeRef, {
          items: arrayRemove(item),
          updatedAt: Timestamp.now(),
        });
        return true;
      },
      undefined,
      () => deleteItem(storeId, itemId) // Retry function
    );

    return result !== null;
  };

  return (
    <StoresContext.Provider 
      value={{ 
        stores, 
        loading, 
        error,
        addStore, 
        updateStore, 
        deleteStore, 
        addItem,
        addItems,
        toggleItem, 
        deleteItem 
      }}
    >
      {children}
    </StoresContext.Provider>
  );
}

export function useStores() {
  const context = useContext(StoresContext);
  if (context === undefined) {
    throw new Error('useStores must be used within a StoresProvider');
  }
  return context;
}
