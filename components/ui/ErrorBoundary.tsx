import { AlertCircle } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary to catch rendering errors and show fallback UI
 */
export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        console.error('ErrorBoundary caught an error:', error);
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View className="flex-1 bg-white items-center justify-center p-6">
                    <AlertCircle size={48} color="#EF4444" />
                    <Text className="text-lg font-bold text-gray-900 mt-4 text-center">
                        Something went wrong
                    </Text>
                    <Text className="text-gray-600 text-sm text-center mt-2">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </Text>
                    <TouchableOpacity
                        onPress={this.resetError}
                        className="mt-6 bg-purple-600 px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-semibold">Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
