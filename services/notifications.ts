import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { supabase } from './supabase';

// Lazy load Notifications to avoid crashes in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsError: Error | null = null;

async function getNotifications() {
    if (notificationsError) {
        throw notificationsError;
    }
    if (!Notifications) {
        try {
            Notifications = await import('expo-notifications');
            // Configure how notifications behave when app is in foreground
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
        } catch (error) {
            notificationsError = error instanceof Error ? error : new Error(String(error));
            console.warn('[NOTIFICATIONS] expo-notifications not available in this environment:', notificationsError.message);
            throw notificationsError;
        }
    }
    return Notifications;
}

/**
 * Register for push notifications using Expo Notifications
 * Requests user permission and returns the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Check if already asked and denied
        const permission = await AsyncStorage.getItem('votch_push_permission_asked');
        if (permission === 'denied') {
            return null;
        }

        // Check device capabilities
        if (!Device.isDevice) {
            console.warn('Push notifications only work on physical devices');
            return null;
        }

        const Notif = await getNotifications();

        // Request permissions
        const { status: existingStatus } = await Notif.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notif.requestPermissionsAsync();
            finalStatus = status;
            await AsyncStorage.setItem(
                'votch_push_permission_asked',
                finalStatus === 'granted' ? 'granted' : 'denied'
            );
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission not granted');
            return null;
        }

        // Get Expo push token
        const token = await Notif.getExpoPushTokenAsync({
            projectId: 'votch', // From app.json
        });

        return token.data;
    } catch (error) {
        console.error('[NOTIFICATIONS] Error registering for push notifications:', error);
        return null;
    }
}

/**
 * Save the Expo push token to Supabase profiles table
 */
export async function saveTokenToSupabase(
    token: string,
    userId: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) {
            console.error('Error saving push token to Supabase:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error saving push token:', error);
        return false;
    }
}

/**
 * Schedule a local notification
 * Used for streak reminders that don't need server involvement
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    triggerSeconds: number,
    payload?: Record<string, unknown>
): Promise<string | null> {
    try {
        const Notif = await getNotifications();
        const notificationId = await Notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                data: payload || {},
                sound: true,
                badge: 1,
            },
            trigger: {
                type: 'time-interval' as const,
                seconds: triggerSeconds,
            },
        });

        return notificationId;
    } catch (error) {
        console.error('[NOTIFICATIONS] Error scheduling local notification:', error);
        return null;
    }
}

/**
 * Cancel all local notifications
 */
export async function cancelAllLocalNotifications(): Promise<void> {
    try {
        const Notif = await getNotifications();
        await Notif.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('[NOTIFICATIONS] Error canceling notifications:', error);
    }
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
    try {
        const Notif = await getNotifications();
        const count = await Notif.getBadgeCountAsync();
        return count;
    } catch (error) {
        console.error('[NOTIFICATIONS] Error getting badge count:', error);
        return 0;
    }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
    try {
        const Notif = await getNotifications();
        await Notif.setBadgeCountAsync(count);
    } catch (error) {
        console.error('[NOTIFICATIONS] Error setting badge count:', error);
    }
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
    try {
        const Notif = await getNotifications();
        await Notif.setBadgeCountAsync(0);
    } catch (error) {
        console.error('[NOTIFICATIONS] Error clearing badge:', error);
    }
}

/**
 * Set up notification response listeners
 * Handles what happens when user taps on a notification
 */
export function setupNotificationHandlers(
    navigationHandler: (payload: Record<string, unknown>) => void
) {
    // Lazy load and setup handlers
    getNotifications()
        .then((Notif) => {
            // Handle notification response (user taps on notification)
            const subscription = Notif.addNotificationResponseReceivedListener(
                (response) => {
                    const payload = response.notification.request.content.data;
                    navigationHandler(payload);
                }
            );

            // Handle foreground notifications (show banner while app is open)
            const foregroundSubscription =
                Notif.addNotificationReceivedListener((notification) => {
                    // Notification is shown by setNotificationHandler above
                });

            return () => {
                subscription.remove();
                foregroundSubscription.remove();
            };
        })
        .catch((error) => {
            console.warn('[NOTIFICATIONS] Could not setup notification handlers:', error.message);
        });
}

/**
 * Calculate seconds until 8 PM (daily streak reminder time)
 */
export function getSecondsUntil8PM(): number {
    const now = new Date();
    const today8PM = new Date();
    today8PM.setHours(20, 0, 0, 0); // 8 PM = 20:00

    // If we're already past 8 PM today, schedule for tomorrow
    if (now > today8PM) {
        today8PM.setDate(today8PM.getDate() + 1);
    }

    return Math.max(0, Math.floor((today8PM.getTime() - now.getTime()) / 1000));
}
