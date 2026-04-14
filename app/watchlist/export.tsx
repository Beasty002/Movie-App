import { useAuthStore } from '@/store/useAuthStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Copy, Download, FileText } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

type ExportFormat = 'csv' | 'json';

export default function ExportScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { items } = useWatchlistStore();

    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
    const [exportData, setExportData] = useState<string>('');
    const [isExported, setIsExported] = useState(false);

    const exportToCSV = () => {
        const headers = ['Title', 'Type', 'Status', 'Episodes Watched', 'Rating'];
        const rows = items.map(item => [
            `"${item.media_title.replace(/"/g, '""')}"`,
            item.media_type,
            item.status,
            item.episodes_watched || '0',
            item.rating || '',
        ]);

        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        setExportData(csv);
        setIsExported(true);
    };

    const exportToJSON = () => {
        const json = JSON.stringify(
            items.map(item => ({
                title: item.media_title,
                type: item.media_type,
                status: item.status,
                episodes_watched: item.episodes_watched,
                rating: item.rating,
                added_at: item.created_at,
            })),
            null,
            2
        );
        setExportData(json);
        setIsExported(true);
    };

    const handleExport = () => {
        if (selectedFormat === 'csv') {
            exportToCSV();
        } else {
            exportToJSON();
        }
    };

    const handleCopyToClipboard = async () => {
        try {
            Toast.show({
                type: 'success',
                text1: 'Copied to clipboard',
                text2: 'You can now paste your data anywhere',
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Could not copy',
            });
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: exportData,
                title: 'My Watchlist Export',
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Could not share',
            });
        }
    };

    return (
        <View className="flex-1 bg-primary">
            {/* Header */}
            <View className="flex-row items-center px-4 pt-14 pb-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">Export Watchlist</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {!isExported ? (
                    <View className="gap-6 py-8 flex-1">
                        <View>
                            <Text className="text-2xl font-bold text-white">Export Your List</Text>
                            <Text className="text-sm text-light-300 mt-1">
                                Save your watchlist in your preferred format
                            </Text>
                        </View>

                        {/* Format Selection */}
                        <View className="gap-3">
                            <Text className="text-xs font-semibold text-light-300 uppercase tracking-wider">Choose Format</Text>

                            <TouchableOpacity
                                onPress={() => setSelectedFormat('csv')}
                                className={`rounded-lg p-4 border ${selectedFormat === 'csv'
                                        ? 'bg-dark-100 border-accent/60'
                                        : 'bg-dark-100 border-dark-100'
                                    }`}
                            >
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1">
                                        <Text className={`text-base font-semibold ${selectedFormat === 'csv' ? 'text-accent' : 'text-white'}`}>
                                            CSV Format
                                        </Text>
                                        <Text className="text-xs text-light-300 mt-2">
                                            Compatible with Excel, Google Sheets, and other trackers
                                        </Text>
                                    </View>
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedFormat === 'csv' ? 'border-accent bg-accent' : 'border-light-300'
                                        }`}>
                                        {selectedFormat === 'csv' && (
                                            <CheckCircle2 size={16} color="#030014" strokeWidth={3} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setSelectedFormat('json')}
                                className={`rounded-lg p-4 border ${selectedFormat === 'json'
                                        ? 'bg-dark-100 border-accent/60'
                                        : 'bg-dark-100 border-dark-100'
                                    }`}
                            >
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1">
                                        <Text className={`text-base font-semibold ${selectedFormat === 'json' ? 'text-accent' : 'text-white'}`}>
                                            JSON Format
                                        </Text>
                                        <Text className="text-xs text-light-300 mt-2">
                                            Best for data preservation and custom imports
                                        </Text>
                                    </View>
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedFormat === 'json' ? 'border-accent bg-accent' : 'border-light-300'
                                        }`}>
                                        {selectedFormat === 'json' && (
                                            <CheckCircle2 size={16} color="#030014" strokeWidth={3} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Info */}
                        <View className="bg-dark-100 rounded-lg p-4 border border-dark-100">
                            <Text className="text-xs font-semibold text-light-200 uppercase tracking-wide mb-2">
                                📊 What's Included
                            </Text>
                            <Text className="text-xs text-light-300 leading-5">
                                • Title and media type{'\n'}
                                • Current status{'\n'}
                                • Episodes watched{'\n'}
                                • Your ratings{'\n'}
                                • Date added
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleExport}
                            className="py-3 px-4 bg-accent active:opacity-80 rounded-lg flex-row items-center justify-center gap-2"
                        >
                            <Download size={18} color="#030014" strokeWidth={2} />
                            <Text className="text-primary font-semibold">Prepare Export</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="gap-4 py-8 flex-1">
                        <View>
                            <Text className="text-2xl font-bold text-white">Your Export</Text>
                            <Text className="text-sm text-light-300 mt-1">
                                {items.length} items in {selectedFormat.toUpperCase()}
                            </Text>
                        </View>

                        {/* Export Preview */}
                        <View className="bg-dark-100 rounded-lg p-4 border border-dark-100 max-h-64">
                            <View className="flex-row items-center gap-2 mb-3">
                                <FileText size={18} color="#AB8BFF" />
                                <Text className="text-sm font-semibold text-light-200">Preview</Text>
                            </View>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                <Text className="text-xs text-light-200 font-mono">
                                    {exportData.substring(0, 500)}
                                    {exportData.length > 500 ? '\n...' : ''}
                                </Text>
                            </ScrollView>
                        </View>

                        {/* Info */}
                        <View className="bg-dark-100 rounded-lg p-4 border border-dark-100">
                            <Text className="text-xs text-light-300">
                                💡 Your export is ready! Copy it to your clipboard or share it with others.
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View className="gap-2">
                            <TouchableOpacity
                                onPress={handleCopyToClipboard}
                                className="py-3 px-4 bg-dark-100 active:bg-dark-200 rounded-lg border border-dark-100 flex-row items-center justify-center gap-2"
                            >
                                <Copy size={18} color="#A8B5DB" />
                                <Text className="text-light-200 font-semibold">Copy to Clipboard</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleShare}
                                className="py-3 px-4 bg-accent active:opacity-80 rounded-lg flex-row items-center justify-center gap-2"
                            >
                                <Download size={18} color="#030014" />
                                <Text className="text-primary font-semibold">Share</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => setIsExported(false)}
                            className="py-3 px-4 bg-dark-100 active:bg-dark-200 rounded-lg border border-dark-100"
                        >
                            <Text className="text-light-200 font-semibold text-center">Export Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="py-3 px-4 bg-dark-100 active:bg-dark-200 rounded-lg border border-dark-100"
                        >
                            <Text className="text-light-200 font-semibold text-center">Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
