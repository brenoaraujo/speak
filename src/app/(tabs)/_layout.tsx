import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { countDueReviewCards } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const theme = useTheme();
  const { session } = useAuth();
  const [dueCount, setDueCount] = useState(0);

  // Keep the "due today" badge on the Learn tab roughly current.
  useEffect(() => {
    if (!session) {
      setDueCount(0);
      return;
    }
    let active = true;
    const refresh = () => {
      countDueReviewCards()
        .then((n) => active && setDueCount(n))
        .catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, 45000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
