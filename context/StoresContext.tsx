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

export type StoreItem = {
  id: string;
  text: string;
  checked: boolean;
  price?: number;       // Manual price entry
  quantity?: number;     // For future quantity tracking
  note?: string;         // Optional note/details
};

export type Store = {
  id: string;
  name: string;
  isOnline: boolean;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  triggerRadius?: number;
  website?: string;
  items: StoreItem[];
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
  updateItem: (storeId: string, itemId: string, updates: Partial<StoreItem>) => Promise<boolean>;
  clearCheckedItems: (storeId: string) => Promise<boolean>;
};

const StoresContext = createContext<StoresContextType | undefined>(undefined);

/**
 * Normalise item text for duplicate comparison.
 * Lowercases and trims whitespace so "Cheese" matches "cheese" and " Cheese " matches "Cheese".
 */
function normalizeItemText(text: string): string {
  return text.trim().toLowerCase();
}

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
      () => addStore(storeData)
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
      () => updateStore(id, updates)
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
      () => deleteStore(id)
    );

    return result !== null;
  };

  const addItem = async (storeId: string, itemText: string): Promise<boolean> => {
    // ── DUPLICATE CHECK ──
    // If an unchecked item with the same text already exists, skip it
    const store = stores.find(s => s.id === storeId);
    if (store) {
      const normalizedNew = normalizeItemText(itemText);
      const duplicate = store.items.find(
        i => !i.checked && normalizeItemText(i.text) === normalizedNew
      );
      if (duplicate) {
        // Item already exists and isn't checked — no need to add again
        console.log(`Skipping duplicate item: "${itemText}" (already in ${store.name})`);
        return true; // Return true since the item is already there
      }
    }

    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        const newItem: StoreItem = {
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
      () => addItem(storeId, itemText)
    );

    return result !== null;
  };

  const addItems = async (storeId: string, itemTexts: string[]): Promise<boolean> => {
    // ── DUPLICATE CHECK for bulk adds ──
    // Filter out items that already exist (unchecked) in the store
    const store = stores.find(s => s.id === storeId);
    const existingTexts = new Set(
      (store?.items || [])
        .filter(i => !i.checked)
        .map(i => normalizeItemText(i.text))
    );
    
    const uniqueTexts = itemTexts.filter(text => {
      const normalized = normalizeItemText(text);
      if (existingTexts.has(normalized)) {
        console.log(`Skipping duplicate: "${text}"`);
        return false;
      }
      // Also deduplicate within the batch itself
      if (existingTexts.has(normalized)) return false;
      existingTexts.add(normalized);
      return true;
    });

    if (uniqueTexts.length === 0) {
      console.log('All items already exist, nothing to add');
      return true;
    }

    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        const newItems: StoreItem[] = uniqueTexts.map(text => ({
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
      () => addItems(storeId, itemTexts)
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
      () => toggleItem(storeId, itemId)
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
      () => deleteItem(storeId, itemId)
    );

    return result !== null;
  };

  // NEW: Update an item's metadata (price, note, quantity)
  const updateItem = async (storeId: string, itemId: string, updates: Partial<StoreItem>): Promise<boolean> => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return false;

    const item = store.items.find(i => i.id === itemId);
    if (!item) return false;

    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        const updatedItem = { ...item, ...updates };
        
        // Remove old, add updated
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
      () => updateItem(storeId, itemId, updates)
    );

    return result !== null;
  };

  // NEW: Clear all checked items from a store in one batch
  const clearCheckedItems = async (storeId: string): Promise<boolean> => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return false;

    const checkedItems = store.items.filter(i => i.checked);
    if (checkedItems.length === 0) return true;

    const result = await withErrorHandling(
      async () => {
        const storeRef = doc(db, 'stores', storeId);
        // Remove all checked items in one update
        for (const item of checkedItems) {
          await updateDoc(storeRef, {
            items: arrayRemove(item),
          });
        }
        await updateDoc(storeRef, {
          updatedAt: Timestamp.now(),
        });
        return true;
      },
      undefined,
      () => clearCheckedItems(storeId)
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
        deleteItem,
        updateItem,
        clearCheckedItems,
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
