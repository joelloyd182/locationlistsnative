import React, { createContext, useState, useContext, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

type Meal = {
  id: string;
  date: string;
  name: string;
  ingredients: string[];
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

type MealPlanContextType = {
  meals: Meal[];
  addMeal: (date: string, name: string, mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<string>;
  updateMeal: (id: string, name: string) => Promise<void>;
  updateMealType: (id: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  addIngredient: (mealId: string, ingredient: string) => Promise<void>;
  removeIngredient: (mealId: string, ingredient: string) => Promise<void>;
  getMealsForDate: (date: string) => Meal[];
  getMealsForWeek: (startDate: Date) => Meal[];
  moveMeal: (mealId: string, newDate: string) => Promise<void>;
};

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export function MealPlanProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const { user } = useAuth();

  // Sync with Firestore when user changes
  useEffect(() => {
    if (!user) {
      setMeals([]);
      return;
    }

    console.log('Setting up Firestore listener for meals, user:', user.uid);

    // Real-time listener to Firestore
    const mealsRef = collection(db, 'users', user.uid, 'meals');
    const q = query(mealsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreMeals: Meal[] = [];
      snapshot.forEach((doc) => {
        firestoreMeals.push({ id: doc.id, ...doc.data() } as Meal);
      });
      console.log('Loaded meals from Firestore:', firestoreMeals.length);
      setMeals(firestoreMeals);
    });

    return () => unsubscribe();
  }, [user]);

  const addMeal = async (date: string, name: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'dinner'): Promise<string> => {
    if (!user) return '';

    const newMeal: Meal = {
      id: Date.now().toString(),
      date,
      name,
      ingredients: [],
      mealType,
    };

    const mealRef = doc(db, 'users', user.uid, 'meals', newMeal.id);
    await setDoc(mealRef, newMeal);
    console.log('Meal added to Firestore');
    return newMeal.id;
  };

  const updateMeal = async (id: string, name: string) => {
    if (!user) return;

    const meal = meals.find(m => m.id === id);
    if (!meal) return;

    const updatedMeal = { ...meal, name };
    const mealRef = doc(db, 'users', user.uid, 'meals', id);
    await setDoc(mealRef, updatedMeal);
    console.log('Meal updated in Firestore');
  };

  const updateMealType = async (id: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    if (!user) return;

    const meal = meals.find(m => m.id === id);
    if (!meal) return;

    const updatedMeal = { ...meal, mealType };
    const mealRef = doc(db, 'users', user.uid, 'meals', id);
    await setDoc(mealRef, updatedMeal);
    console.log('Meal type updated in Firestore');
  };

  const deleteMeal = async (id: string) => {
    if (!user) return;

    const mealRef = doc(db, 'users', user.uid, 'meals', id);
    await deleteDoc(mealRef);
    console.log('Meal deleted from Firestore');
  };
  
  const moveMeal = async (mealId: string, newDate: string): Promise<void> => {
  if (!user) return;

  try {
    const mealRef = doc(db, 'users', user.uid, 'meals', mealId);
    await updateDoc(mealRef, {
      date: newDate,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error moving meal:', error);
    throw error;
  }
};

  const addIngredient = async (mealId: string, ingredient: string) => {
    if (!user) return;

    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    const updatedMeal = {
      ...meal,
      ingredients: [...meal.ingredients, ingredient],
    };

    const mealRef = doc(db, 'users', user.uid, 'meals', mealId);
    await setDoc(mealRef, updatedMeal);
    console.log('Ingredient added to Firestore');
  };

  const removeIngredient = async (mealId: string, ingredient: string) => {
    if (!user) return;

    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    const updatedMeal = {
      ...meal,
      ingredients: meal.ingredients.filter(i => i !== ingredient),
    };

    const mealRef = doc(db, 'users', user.uid, 'meals', mealId);
    await setDoc(mealRef, updatedMeal);
    console.log('Ingredient removed from Firestore');
  };

  const getMealsForDate = (date: string) => {
    return meals.filter(meal => meal.date === date);
  };

  const getMealsForWeek = (startDate: Date) => {
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }
    return meals.filter(meal => weekDates.includes(meal.date));
  };

  return (
    <MealPlanContext.Provider value={{
      meals,
      addMeal,
      updateMeal,
      updateMealType,
      deleteMeal,
      addIngredient,
      removeIngredient,
	  moveMeal,
      getMealsForDate,
      getMealsForWeek,
    }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const context = useContext(MealPlanContext);
  if (!context) {
    throw new Error('useMealPlan must be used within MealPlanProvider');
  }
  return context;
}
