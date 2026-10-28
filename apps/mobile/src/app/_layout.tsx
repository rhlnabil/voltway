import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="map" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planifier',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="road" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}