import {
    cancelAllLocalNotifications,
    getSecondsUntil8PM,
    registerForPushNotifications,
    saveTokenToSupabase,
    scheduleLocalNotification,
    setBadgeCount,
} from '@/services/notifications';
import { supabase } from '@/services/supabase';
import { Notification } from '@/types';
import { create } from 'zustand';

interface NotificationsStore {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    pushToken: string | null;
    permissionStatus: 'granted' | 'denied' | 'undetermined';

    initialize: (userId: string) => Promise<void>;
    fetchNotifications: (userId: string) => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    subscribeToNewNotifications: (userId: string) => () => void;
    scheduleStreakReminder: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    pushToken: null,
    permissionStatus: 'undetermined',

    initialize: async (userId: string) => {
        try {
            set({ isLoading: true });

            // Register for push notifications
            const token = await registerForPushNotifications();
            if (token) {
                set({ pushToken: token, permissionStatus: 'granted' });
                await saveTokenToSupabase(token, userId);
            } else {
                set({ permissionStatus: 'denied' });
            }

            // Fetch initial notifications
            await get().fetchNotifications(userId);

            // Set up realtime subscription
            get().subscribeToNewNotifications(userId);

            // Schedule daily streak reminder at 8 PM
            await get().scheduleStreakReminder();
        } catch (error) {
            console.error('Error initializing notifications store:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchNotifications: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            const unreadCount = (data || []).filter((n) => !n.is_read).length;
            set({
                notifications: data || [],
                unreadCount,
            });

            // Update badge count
            await setBadgeCount(unreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    },

    markAsRead: async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) {
                console.error('Error marking notification as read:', error);
                return;
            }

            // Update local state
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));

            // Update badge
            const newUnreadCount = get().unreadCount;
            await setBadgeCount(newUnreadCount);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    markAllAsRead: async () => {
        try {
            const unreadIds = get()
                .notifications.filter((n) => !n.is_read)
                .map((n) => n.id);

            if (unreadIds.length === 0) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds);

            if (error) {
                console.error('Error marking all as read:', error);
                return;
            }

            set((state) => ({
                notifications: state.notifications.map((n) => ({
                    ...n,
                    is_read: true,
                })),
                unreadCount: 0,
            }));

            await setBadgeCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    },

    deleteNotification: async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) {
                console.error('Error deleting notification:', error);
                return;
            }

            set((state) => {
                const notification = state.notifications.find((n) => n.id === notificationId);
                const wasUnread = notification && !notification.is_read;

                return {
                    notifications: state.notifications.filter((n) => n.id !== notificationId),
                    unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
                };
            });

            const newUnreadCount = get().unreadCount;
            await setBadgeCount(newUnreadCount);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    },

    subscribeToNewNotifications: (userId: string) => {
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on('postgres_changes' as any, {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            }, (payload: any) => {
                const newNotification = payload.new as Notification;
                set((state) => ({
                    notifications: [newNotification, ...state.notifications],
                    unreadCount: state.unreadCount + 1,
                }));

                get().unreadCount && setBadgeCount(get().unreadCount);
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    },

    scheduleStreakReminder: async () => {
        try {
            // Cancel any existing reminders
            await cancelAllLocalNotifications();

            // Schedule new reminder for 8 PM today/tomorrow
            const secondsUntil8PM = getSecondsUntil8PM();

            await scheduleLocalNotification(
                "🔥 Don't break your streak!",
                'Mark an episode watched today to keep your streak alive',
                secondsUntil8PM,
                {
                    type: 'streak_reminder',
                    navigateTo: '/(tabs)/watchlist',
                }
            );

            // Re-schedule daily (every 24 hours)
            // This will be called again when the notification fires or app reopens
        } catch (error) {
            console.error('Error scheduling streak reminder:', error);
        }
    },
}));
