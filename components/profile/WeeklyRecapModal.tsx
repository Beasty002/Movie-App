import { generateShareText } from '@/services/weeklyRecap';
import { WeeklyStats } from '@/types';
import { X } from 'lucide-react-native';
import { Modal, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';

interface WeeklyRecapModalProps {
    visible: boolean;
    stats: WeeklyStats;
    onClose: () => void;
}

/**
 * Modal displaying weekly recap with stats and share button
 */
export function WeeklyRecapModal({ visible, stats, onClose }: WeeklyRecapModalProps) {
    const handleShare = async () => {
        try {
            const text = generateShareText(stats);
            await Share.share({
                message: text,
                title: 'My Week in Votch',
            });
        } catch (error) {
            console.error('Error sharing recap:', error);
        }
    };

    const daysActive = stats.episodesThisWeek > 0 ? 5 : 0; // Simplified - would need to calculate from progress data

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View className="flex-1 bg-black/60 items-center justify-end">
                <View className="bg-white w-full rounded-t-3xl p-6 pb-8">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-gray-900">Your Week in Votch</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <X size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
                        {/* Episodes & Hours */}
                        <View className="bg-purple-50 rounded-lg p-4 mb-4">
                            <View className="items-center">
                                <Text className="text-4xl font-bold text-purple-600 mb-2">
                                    {stats.episodesThisWeek}
                                </Text>
                                <Text className="text-gray-600 font-medium">Episodes Watched</Text>
                            </View>
                            <View className="border-t border-purple-200 my-4" />
                            <View className="flex-row justify-around">
                                <View className="items-center">
                                    <Text className="text-2xl font-bold text-gray-900">{stats.hoursThisWeek}</Text>
                                    <Text className="text-xs text-gray-500 mt-1">Hours</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-2xl font-bold text-gray-900">{daysActive}</Text>
                                    <Text className="text-xs text-gray-500 mt-1">Days Active</Text>
                                </View>
                            </View>
                        </View>

                        {/* Comparison */}
                        {stats.comparedToLastWeek !== 0 && (
                            <View className="bg-blue-50 rounded-lg p-4 mb-4">
                                <View className="flex-row items-center gap-2">
                                    <Text
                                        className={`text-lg font-bold ${stats.comparedToLastWeek > 0 ? 'text-green-600' : 'text-orange-600'
                                            }`}
                                    >
                                        {stats.comparedToLastWeek > 0 ? '↑' : '↓'}
                                        {Math.abs(stats.comparedToLastWeek)}
                                    </Text>
                                    <Text className="text-gray-700 text-sm">
                                        {stats.comparedToLastWeek > 0 ? 'more' : 'less'} episodes than last week
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Top Drama */}
                        {stats.topDrama && (
                            <View className="bg-gray-50 rounded-lg p-4 mb-4">
                                <Text className="text-gray-600 text-xs font-medium mb-2">Top Drama</Text>
                                <Text className="text-gray-900 font-semibold">{stats.topDrama.media_title}</Text>
                                {stats.topDrama.media_title_korean && (
                                    <Text className="text-gray-500 text-sm mt-1">{stats.topDrama.media_title_korean}</Text>
                                )}
                            </View>
                        )}

                        {/* Genre Breakdown */}
                        {Object.keys(stats.genreBreakdown).length > 0 && (
                            <View className="bg-amber-50 rounded-lg p-4">
                                <Text className="text-gray-600 text-xs font-medium mb-3">Genre Breakdown</Text>
                                <View className="gap-2">
                                    {Object.entries(stats.genreBreakdown).map(([genre, count]) => (
                                        <View key={genre} className="flex-row justify-between items-center">
                                            <Text className="text-gray-700 text-sm">{genre}</Text>
                                            <Text className="text-gray-900 font-semibold">{count}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Share Button */}
                    <TouchableOpacity
                        onPress={handleShare}
                        className="bg-purple-600 rounded-lg py-3 items-center mb-2"
                    >
                        <Text className="text-white font-semibold">Share Your Week</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onClose}
                        className="bg-gray-100 rounded-lg py-3 items-center"
                    >
                        <Text className="text-gray-900 font-semibold">Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
