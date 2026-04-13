import { CheckCircle, Circle, Clock } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { PollListItem } from '@/types';

interface PollListCardProps {
  poll: PollListItem;
  onPress: () => void;
}

function getTimeRemaining(expiresAt: string, isActive: boolean): string {
  if (!isActive) return 'Ended';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours}h left`;
  return `${totalMinutes}m left`;
}

function getOptionsPreview(options: PollListItem['options']): string {
  if (options.length === 0) return 'No options';
  const first = options.slice(0, 2).map((o) => o.title);
  const extra = options.length - 2;
  if (extra > 0) return `${first.join(', ')} +${extra}`;
  return first.join(', ');
}

export default function PollListCard({ poll, onPress }: PollListCardProps) {
  const timeRemaining = getTimeRemaining(poll.expires_at, poll.is_active);
  const isEnded = !poll.is_active || timeRemaining === 'Ended';
  const optionsPreview = getOptionsPreview(poll.options);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-dark-100 rounded-2xl p-4 mb-3"
    >
      {/* Title */}
      <Text className="text-white font-semibold text-base mb-1" numberOfLines={1}>
        {poll.title}
      </Text>

      {/* Options preview */}
      <Text className="text-light-300 text-[12px] mb-3" numberOfLines={1}>
        {optionsPreview}
      </Text>

      {/* Bottom row */}
      <View className="flex-row items-center gap-x-3">
        {/* Vote count */}
        <View className="flex-row items-center gap-x-1">
          <Circle size={12} color="#A8B5DB" strokeWidth={2} />
          <Text className="text-light-300 text-[11px]">
            {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
          </Text>
        </View>

        {/* Time */}
        <View className="flex-row items-center gap-x-1">
          <Clock size={12} color="#A8B5DB" strokeWidth={2} />
          <Text className="text-light-300 text-[11px]">{timeRemaining}</Text>
        </View>

        {/* Status badge */}
        <View
          className={`ml-auto px-2 py-0.5 rounded-full flex-row items-center gap-x-1 ${
            isEnded ? 'bg-dark-200' : 'bg-green-500/15'
          }`}
        >
          <CheckCircle
            size={10}
            color={isEnded ? '#6B7280' : '#22C55E'}
            strokeWidth={2.5}
          />
          <Text
            className={`text-[10px] font-medium ${
              isEnded ? 'text-light-300' : 'text-green-400'
            }`}
          >
            {isEnded ? 'Ended' : 'Active'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
