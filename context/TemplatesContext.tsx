import React, { createContext, useState, useContext, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

type MealTemplate = {
  id: string;
  name: string;
  ingredients: string[];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: number;
};

type TemplatesContextType = {
  templates: MealTemplate[];
  saveTemplate: (name: string, ingredients: string[], mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
};

const TemplatesContext = createContext<TemplatesContextType | undefined>(undefined);

export function TemplatesProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const { user } = useAuth();

  // Sync with Firestore
  useEffect(() => {
    if (!user) {
      setTemplates([]);
      return;
    }

    const templatesRef = collection(db, 'users', user.uid, 'mealTemplates');
    const q = query(templatesRef);

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const firestoreTemplates: MealTemplate[] = [];
        snapshot.forEach((doc) => {
          firestoreTemplates.push({ id: doc.id, ...doc.data() } as MealTemplate);
        });
        console.log('Loaded templates from Firestore:', firestoreTemplates.length);
        setTemplates(firestoreTemplates.sort((a, b) => b.createdAt - a.createdAt));
      },
      (error) => {
        console.log('Templates listener error (likely transient):', error.message);
        setTemplates([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveTemplate = async (name: string, ingredients: string[], mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    if (!user) return;

    const newTemplate: MealTemplate = {
      id: Date.now().toString(),
      name,
      ingredients,
      mealType,
      createdAt: Date.now(),
    };

    const templateRef = doc(db, 'users', user.uid, 'mealTemplates', newTemplate.id);
    await setDoc(templateRef, newTemplate);
    console.log('Template saved to Firestore');
  };

  const deleteTemplate = async (id: string) => {
    if (!user) return;

    const templateRef = doc(db, 'users', user.uid, 'mealTemplates', id);
    await deleteDoc(templateRef);
    console.log('Template deleted from Firestore');
  };

  return (
    <TemplatesContext.Provider value={{
      templates,
      saveTemplate,
      deleteTemplate,
    }}>
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error('useTemplates must be used within TemplatesProvider');
  }
  return context;
}
