import { useNotificationsStore } from '@/store/useNotificationsStore';
import type { Notification } from '@/types';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    BarChart2,
    Bell,
    Check,
    Clock,
    Flag,
    Flame,
    TrendingUp,
    Trophy,
    Tv,
    X,
} from 'lucide-react-native';
import { useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

function getNotificationIcon(type: Notification['type']) {
    switch (type) {
        case 'poll_vote':
            return <BarChart2 size={18} color="#A78BFA" strokeWidth={2} />;
        case 'poll_ending':
            return <Clock size={18} color="#F59E0B" strokeWidth={2} />;
        case 'poll_ended':
            return <Flag size={18} color="#EF4444" strokeWidth={2} />;
        case 'episode_release':
            return <Tv size={18} color="#06B6D4" strokeWidth={2} />;
        case 'streak_reminder':
            return <Flame size={18} color="#F97316" strokeWidth={2} />;
        case 'badge_unlocked':
            return <Trophy size={18} color="#FBBF24" strokeWidth={2} />;
        case 'weekly_recap':
            return <TrendingUp size={18} color="#8B5CF6" strokeWidth={2} />;
        case 'friend_activity':
            return <Bell size={18} color="#A78BFA" strokeWidth={2} />;
        default:
            return <Bell size={18} color="#9CA3AF" strokeWidth={2} />;
    }
}

function getIconBg(type: Notification['type']): string {
    switch (type) {
        case 'poll_vote': return 'bg-purple-500/20';
        case 'poll_ending': return 'bg-amber-500/20';
        case 'poll_ended': return 'bg-red-500/20';
        case 'episode_release': return 'bg-cyan-500/20';
        case 'streak_reminder': return 'bg-orange-500/20';
        case 'badge_unlocked': return 'bg-yellow-500/20';
        case 'weekly_recap': return 'bg-violet-500/20';
        default: return 'bg-dark-200';
    }
}

function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

function NotificationItem({
    notification,
    onPress,
    onDelete,
}: {
    notification: Notification;
    onPress: () => void;
    onDelete: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            className={`flex-row items-start px-4 py-3.5 border-b border-dark-200 ${
                !notification.is_read ? 'bg-accent/5' : 'bg-transparent'
            }`}
        >
            {/* Icon bubble */}
            <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 mt-0.5 ${getIconBg(notification.type)}`}>
                {getNotificationIcon(notification.type)}
            </View>

            <View className="flex-1">
                <View className="flex-row items-center gap-1.5 mb-0.5">
                    {!notification.is_read && (
                        <View className="w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                    <Text
                        className={`text-sm flex-1 ${!notification.is_read ? 'font-semibold text-white' : 'font-medium text-light-200'}`}
                        numberOfLines={1}
                    >
                        {notification.title}
                    </Text>
                </View>
                <Text className="text-light-300 text-xs leading-4" numberOfLines={2}>
                    {notification.body}
                </Text>
                <Text className="text-light-300/60 text-[10px] mt-1">
                    {timeAgo(notification.created_at)}
                </Text>
            </View>

            <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="p-1.5 ml-2 mt-0.5"
            >
                <X size={14} color="#9CA4AB" strokeWidth={2} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotificationsStore();

    useEffect(() => {
        // Notifications are initialized from the main app layout
    }, []);

    const handleNotificationPress = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        const payload = notification.payload as Record<string, unknown> || {};

        switch (notification.type) {
            case 'poll_vote':
            case 'poll_ending':
            case 'poll_ended':
                if (payload.poll_id) router.push(`/poll/${payload.poll_id}`);
                break;
            case 'episode_release':
                if (payload.drama_id) router.push(`/drama/${payload.drama_id}`);
                break;
            case 'streak_reminder':
                router.push('/(tabs)/watchlist');
                break;
            case 'weekly_recap':
            case 'badge_unlocked':
                router.push('/(tabs)/profile');
                break;
            case 'friend_activity':
                router.push('/(tabs)/polls');
                break;
        }
    };

    return (
        <View className="flex-1 bg-primary">
            {/* Header */}
            <View className="flex-row items-center px-4 pt-14 pb-4 border-b border-dark-200">
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-white font-bold text-lg">Notifications</Text>
                    {unreadCount > 0 && (
                        <Text className="text-xs text-light-300 mt-0.5">{unreadCount} unread</Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        onPress={markAllAsRead}
                        activeOpacity={0.75}
                        className="flex-row items-center gap-1.5 px-3 py-1.5 bg-accent/15 rounded-lg"
                    >
                        <Check size={13} color="#AB8BFF" strokeWidth={2.5} />
                        <Text className="text-xs font-semibold text-accent">Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#AB8BFF" />
                </View>
            ) : notifications.length === 0 ? (
                <View className="flex-1 items-center justify-center px-4">
                    <View className="w-16 h-16 rounded-full bg-dark-100 items-center justify-center mb-4">
                        <Bell size={28} color="#A8B5DB" strokeWidth={1.5} />
                    </View>
                    <Text className="text-white font-semibold text-base text-center">
                        No notifications yet
                    </Text>
                    <Text className="text-light-300 text-sm mt-1 text-center">
                        New notifications will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={({ item }) => (
                        <NotificationItem
                            notification={item}
                            onPress={() => handleNotificationPress(item)}
                            onDelete={() => deleteNotification(item.id)}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                />
            )}
        </View>
    );
}
