import { Text, View } from 'react-native';

interface GenreChartProps {
    genres: { name: string; count: number }[];
}

const BAR_COLORS = ['bg-accent', 'bg-purple-400', 'bg-indigo-400', 'bg-violet-300'];

export function GenreChart({ genres }: GenreChartProps) {
    const maxCount = Math.max(...genres.map((g) => g.count), 1);

    return (
        <View className="bg-dark-100 rounded-lg p-4 border border-dark-200">
            <Text className="text-sm font-semibold text-white mb-3">Genre Breakdown</Text>
            <View className="gap-3">
                {genres.map((genre, index) => {
                    const percentage = Math.round((genre.count / maxCount) * 100);

                    return (
                        <View key={genre.name}>
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className="text-xs font-medium text-light-200 flex-1">
                                    {genre.name}
                                </Text>
                                <Text className="text-xs text-light-300 ml-2">{percentage}%</Text>
                            </View>
                            <View className="bg-dark-200 rounded-full h-2 overflow-hidden">
                                <View
                                    className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
