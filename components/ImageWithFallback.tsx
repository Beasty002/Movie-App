import { Image, ImageProps } from 'expo-image';
import { Film } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

interface ImageWithFallbackProps {
    source: ImageProps['source'];
    style?: ImageProps['style'];
    placeholderColor?: string;
    contentFit?: ImageProps['contentFit'];
}

export default function ImageWithFallback({
    source,
    style,
    placeholderColor = '#221F3D',
    contentFit = 'cover',
}: ImageWithFallbackProps) {
    const [error, setError] = useState(false);

    if (error || !source) {
        return (
            <View
                style={[
                    typeof style === 'object' ? style : {},
                    {
                        backgroundColor: placeholderColor,
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                ]}
            >
                <Film size={32} color="#6B7280" strokeWidth={1.5} />
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>No image</Text>
            </View>
        );
    }

    return (
        <Image
            source={source}
            style={style}
            contentFit={contentFit}
            placeholder={{ color: placeholderColor }}
            onError={() => setError(true)}
        />
    );
}
