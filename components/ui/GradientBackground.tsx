import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function GradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[
          'rgba(139, 92, 246, 0.07)',
          'rgba(99, 102, 241, 0.04)',
          'rgba(0, 0, 0, 0)',
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </View>
  );
}
