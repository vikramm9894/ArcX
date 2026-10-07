import { Tabs } from 'expo-router';
import { colors } from '@/theme';
import { Icon } from '@/components/ui';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Protocol',
          tabBarIcon: ({ color, size }) => <Icon name="flame" color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color, size }) => <Icon name="dumbbell" color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, size }) => <Icon name="check-square" color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <Icon name="book-open" color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Arc Profile',
          tabBarIcon: ({ color, size }) => <Icon name="user" color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
