import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StoresProvider } from '../context/StoresContext';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#8B7371',
        tabBarStyle: {
          backgroundColor: '#FFF8F3',
          borderTopColor: '#FFE1D6',
          borderTopWidth: 2,
        },
        headerStyle: {
          backgroundColor: '#FFF8F3',
        },
        headerTintColor: '#FF6B6B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'Stores',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}