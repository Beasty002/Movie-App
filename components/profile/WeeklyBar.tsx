import { Text, View } from 'react-native';

interface WeeklyBarProps {
    data: number[]; // 7 days of episode counts
    totalEpisodes: number;
    totalHours: number;
}

export function WeeklyBar({ data, totalEpisodes, totalHours }: WeeklyBarProps) {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const maxValue = Math.max(...data, 1);
    const today = new Date();
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

    return (
        <View className="bg-dark-100 rounded-lg p-4 border border-dark-200">
            <Text className="text-sm font-semibold text-white mb-3">Weekly Activity</Text>
            <View className="flex-row items-end justify-between h-32 gap-2 mb-3">
                {data.map((episodes, index) => {
                    const isToday = index === todayIndex;
                    const height = episodes > 0 ? (episodes / maxValue) * 96 : 6;

                    return (
                        <View key={index} className="flex-1 items-center">
                            <View
                                className={`w-full rounded-t-md ${isToday ? 'bg-accent' : 'bg-accent/30'}`}
                                style={{ height }}
                            />
                            <Text className={`text-xs mt-2 font-semibold ${isToday ? 'text-accent' : 'text-light-300'}`}>
                                {days[index]}
                            </Text>
                        </View>
                    );
                })}
            </View>
            <View className="border-t border-dark-200 pt-3">
                <Text className="text-sm font-medium text-light-200">
                    This week: <Text className="text-white font-semibold">{totalEpisodes} eps</Text>
                    {' · '}
                    <Text className="text-white font-semibold">{totalHours}h</Text>
                </Text>
            </View>
        </View>
    );
}
