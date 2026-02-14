import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

type UserAliasContextType = {
  alias: string;
  setAlias: (name: string) => Promise<void>;
};

const UserAliasContext = createContext<UserAliasContextType | undefined>(undefined);

export function UserAliasProvider({ children }: { children: React.ReactNode }) {
  const [alias, setAliasState] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadAlias();
  }, [user?.uid]);

  const loadAlias = async () => {
    try {
      if (!user?.uid) return;
      const saved = await AsyncStorage.getItem(`@alias_${user.uid}`);
      if (saved) {
        setAliasState(saved);
      } else {
        // Default to email prefix
        const fallback = user.email?.split('@')[0] || '';
        setAliasState(fallback);
      }
    } catch (error) {
      console.error('Failed to load alias:', error);
    }
  };

  const setAlias = async (name: string) => {
    try {
      if (!user?.uid) return;
      await AsyncStorage.setItem(`@alias_${user.uid}`, name);
      setAliasState(name);
    } catch (error) {
      console.error('Failed to save alias:', error);
    }
  };

  return (
    <UserAliasContext.Provider value={{ alias, setAlias }}>
      {children}
    </UserAliasContext.Provider>
  );
}

export function useUserAlias() {
  const context = useContext(UserAliasContext);
  if (context === undefined) {
    throw new Error('useUserAlias must be used within a UserAliasProvider');
  }
  return context;
}
