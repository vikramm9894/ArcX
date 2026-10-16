import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Configure notification behavior for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const REMINDERS_KEY = '@arcx_reminders_settings_v1';

export interface ArcReminderSettings {
  morningEnabled: boolean;
  morningTime: string; // "05:00"
  middayEnabled: boolean;
  middayTime: string; // "13:00"
  eveningEnabled: boolean;
  eveningTime: string; // "21:00"
  streakShieldEnabled: boolean;
  streakShieldTime: string; // "22:30"
}

export const defaultReminderSettings: ArcReminderSettings = {
  morningEnabled: true,
  morningTime: '05:00',
  middayEnabled: true,
  middayTime: '13:00',
  eveningEnabled: true,
  eveningTime: '21:00',
  streakShieldEnabled: true,
  streakShieldTime: '22:30',
};

/** Request native / browser notification permissions */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await window.Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[ArcX Notifications] Permission request error:', error);
    return false;
  }
}

/** Check current notification permission state */
export async function getNotificationPermissionStatus(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted';
    }
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Load reminder settings from persistent storage */
export async function getReminderSettings(): Promise<ArcReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_KEY);
    if (!raw) return defaultReminderSettings;
    return { ...defaultReminderSettings, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[ArcX Notifications] Failed to read settings, using default:', err);
    return defaultReminderSettings;
  }
}

/** Save reminder settings and re-sync schedule */
export async function saveReminderSettings(settings: ArcReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(settings));
    await scheduleArcReminders(settings);
  } catch (err) {
    console.warn('[ArcX Notifications] Failed to save settings:', err);
  }
}

/** Parse "HH:MM" into hour & minute integers */
function parseTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  return {
    hour: isNaN(parts[0]) ? 8 : parts[0],
    minute: isNaN(parts[1]) ? 0 : parts[1],
  };
}

/**
 * Cancel and reschedule all Winter Arc daily protocol alerts
 */
export async function scheduleArcReminders(settings: ArcReminderSettings): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // In web, background scheduling via expo-notifications is limited,
      // but we store settings and permit foreground notifications
      return;
    }

    // Cancel existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Morning Call
    if (settings.morningEnabled) {
      const { hour, minute } = parseTime(settings.morningTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❄️ Winter Arc: Morning Discipline Call',
          body: 'The cold waits for no one. Awaken early and conquer your first non-negotiable.',
          sound: true,
          data: { type: 'morning' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }

    // 2. Midday Fortitude Check
    if (settings.middayEnabled) {
      const { hour, minute } = parseTime(settings.middayTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚡ Winter Arc: Midday Fortitude Check',
          body: 'Check your pillars. Stay hydrated, maintain high focus, and prepare today’s workout.',
          sound: true,
          data: { type: 'midday' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }

    // 3. Evening Reflection & Creed
    if (settings.eveningEnabled) {
      const { hour, minute } = parseTime(settings.eveningTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📜 Winter Arc: Evening Stoic Reflection',
          body: 'What tested your discipline today? Complete your daily reflection and lock the day.',
          sound: true,
          data: { type: 'evening' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }

    // 4. Midnight Streak Shield Alert
    if (settings.streakShieldEnabled) {
      const { hour, minute } = parseTime(settings.streakShieldTime);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Streak Shield Alert: 90 Minutes Left',
          body: 'Unchecked daily habits remain! Protect your Winter Arc streak before midnight.',
          sound: true,
          data: { type: 'streak_shield' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  } catch (err) {
    console.warn('[ArcX Notifications] Error scheduling notifications:', err);
  }
}

/**
 * Triggers an immediate test notification for live verification
 */
export async function triggerTestReminder(): Promise<void> {
  const title = '⚔️ Winter Arc Protocol Active';
  const body = 'Discipline verified. Your alert engine is synchronized and locked in.';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        new window.Notification(title, { body });
        return;
      }
    }
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  } catch (err) {
    console.warn('[ArcX Notifications] Test notification failed:', err);
  }
}
