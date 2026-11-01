import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome
              name="map"
              size={size}
              color={typeof color === 'string' ? color : '#000'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planifier',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome
              name="road"
              size={size}
              color={typeof color === 'string' ? color : '#000'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="autonomy"
        options={{
          title: 'Autonomie',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome
              name="battery-three-quarters"
              size={size}
              color={typeof color === 'string' ? color : '#000'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome
              name="user"
              size={size}
              color={typeof color === 'string' ? color : '#000'}
            />
          ),
        }}
      />
    </Tabs>
  );
}