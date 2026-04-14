import { useAuthStore } from '@/store/useAuthStore';
import { useImportStore } from '@/store/useImportStore';
import { useWatchlistStore } from '@/store/useWatchlistStore';
import type { ImportSource } from '@/types/import';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Copy, Download, FileText, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

const IMPORT_SOURCES: Array<{
    id: ImportSource;
    name: string;
    url: string;
    description: string;
    format: string;
}> = [
        {
            id: 'mal',
            name: 'MyAnimeList (MAL)',
            url: 'https://myanimelist.net',
            description: 'Anime tracking (export CSV from profile)',
            format: 'CSV',
        },
        {
            id: 'anilist',
            name: 'AniList',
            url: 'https://anilist.co',
            description: 'Anime & manga hub',
            format: 'CSV/JSON',
        },
        {
            id: 'mydramalist',
            name: 'MyDramaList',
            url: 'https://mydramalist.com',
            description: 'K-Drama focused tracking',
            format: 'CSV',
        },
        {
            id: 'letterboxd',
            name: 'Letterboxd',
            url: 'https://letterboxd.com',
            description: 'Movie tracking & social',
            format: 'CSV',
        },
        {
            id: 'trakt',
            name: 'Trakt',
            url: 'https://trakt.tv',
            description: 'Movies & TV shows',
            format: 'CSV',
        },
        {
            id: 'kitsu',
            name: 'Kitsu',
            url: 'https://kitsu.io',
            description: 'Anime & manga platform',
            format: 'CSV',
        },
    ];

type ImportStep = 'select_source' | 'paste_csv' | 'review' | 'importing' | 'complete';

export default function ImportScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { importFromCSV, addMatchedItemsToWatchlist, isLoading, error, importResult, pendingItems, importProgress, clearImport } = useImportStore();
    const { fetchWatchlist } = useWatchlistStore();

    const [step, setStep] = useState<ImportStep>('select_source');
    const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
    const [csvContent, setCsvContent] = useState('');
    const [importedCount, setImportedCount] = useState(0);
    const [inputMethod, setInputMethod] = useState<'paste' | 'file'>('paste');

    const handleSelectSource = (source: ImportSource) => {
        setSelectedSource(source);
        setStep('paste_csv');
    };

    const getExportInstructions = (sourceId: ImportSource) => {
        const instructions: Record<ImportSource, string> = {
            mal: 'Go to MyAnimeList → Settings → Export Data → Download anime list as CSV',
            anilist: 'Go to AniList → Settings → Data Export → Export as CSV',
            mydramalist: 'Go to MyDramaList → Profile → Lists → Export as CSV',
            letterboxd: 'Go to Letterboxd → Account → Import/Export → Download as CSV',
            trakt: 'Go to Trakt → Settings → Data Download → Export as CSV',
            kitsu: 'Go to Kitsu → Settings → Export → Download as CSV',
            csv_generic: 'Prepare a CSV with: title, status, score',
        };
        return instructions[sourceId];
    };

    const handlePasteFromClipboard = async () => {
        try {
            Toast.show({
                type: 'info',
                text1: 'Paste CSV content',
                text2: 'Use Ctrl+V to paste your data',
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Could not access clipboard',
            });
        }
    };

    const handleImportCSV = async () => {
        if (!csvContent.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Please paste CSV content',
                text2: 'Make sure your CSV is not empty',
            });
            return;
        }

        if (!selectedSource) {
            Toast.show({
                type: 'error',
                text1: 'Please select a source',
            });
            return;
        }

        try {
            await importFromCSV(selectedSource, csvContent, user!.id);
            setStep('review');
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Could not process list',
                text2: err instanceof Error ? err.message : 'Something went wrong',
            });
        }
    };

    const handleConfirmImport = async () => {
        try {
            setStep('importing');
            if (!user) throw new Error('User not found');

            await addMatchedItemsToWatchlist(user.id, pendingItems);
            await fetchWatchlist(user.id);

            setStep('complete');
            setImportedCount(importResult?.totalMatched || 0);
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Import Failed',
                text2: err instanceof Error ? err.message : 'Could not add items',
            });
            setStep('review');
        }
    };

    const handleDone = () => {
        clearImport();
        router.back();
    };

    return (
        <View className="flex-1 bg-primary">
            {/* Header */}
            <View className="flex-row items-center px-4 pt-14 pb-4">
                <TouchableOpacity
                    onPress={() => {
                        if (step === 'select_source') {
                            router.back();
                        } else {
                            setStep('select_source');
                            setCsvContent('');
                            clearImport();
                        }
                    }}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-full bg-dark-100 items-center justify-center mr-3"
                >
                    <ArrowLeft size={18} color="#A8B5DB" strokeWidth={2} />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">Import Watchlist</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Step 1: Select Source */}
                {step === 'select_source' && (
                    <View className="gap-4 py-6">
                        <View className="mb-2">
                            <Text className="text-2xl font-bold text-white">Import Your List</Text>
                            <Text className="text-sm text-light-300 mt-1">
                                Bring your shows from other platforms
                            </Text>
                        </View>

                        <View className="gap-3 mt-6">
                            {IMPORT_SOURCES.map(source => (
                                <TouchableOpacity
                                    key={source.id}
                                    onPress={() => handleSelectSource(source.id)}
                                    className="bg-dark-100 rounded-lg p-4 border border-dark-100 active:border-accent/50 active:bg-dark-200"
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-lg font-semibold text-white">{source.name}</Text>
                                            <Text className="text-xs text-light-300 mt-2">{source.description}</Text>
                                        </View>
                                        <Download size={20} color="#AB8BFF" strokeWidth={1.5} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="mt-4 bg-dark-100 rounded-lg p-4 border border-accent/20">
                            <Text className="text-xs text-light-100 leading-5 font-medium">
                                💡 <Text className="font-normal text-light-200">Each service has an export option. Check your account settings for "Download" or "Export".</Text>
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 2: Add Your Data */}
                {step === 'paste_csv' && selectedSource && (
                    <View className="gap-4 py-6 flex-1">
                        <View>
                            <Text className="text-2xl font-bold text-white">Add Your Data</Text>
                            <Text className="text-sm text-light-300 mt-1">
                                {IMPORT_SOURCES.find(s => s.id === selectedSource)?.name}
                            </Text>
                        </View>

                        {/* Instructions Card */}
                        <View className="bg-dark-100 rounded-lg p-4 border border-dark-100 mt-2">
                            <Text className="text-xs font-semibold text-light-200 uppercase tracking-wide mb-2">
                                📥 How to Export
                            </Text>
                            <Text className="text-xs text-light-300 leading-5">
                                {getExportInstructions(selectedSource)}
                            </Text>
                        </View>

                        {/* Input Method Toggle */}
                        <View className="flex-row gap-2 mt-4">
                            <TouchableOpacity
                                onPress={() => setInputMethod('paste')}
                                className={`flex-1 py-2 px-3 rounded-lg border ${inputMethod === 'paste'
                                        ? 'bg-accent border-accent'
                                        : 'bg-dark-100 border-dark-100'
                                    }`}
                            >
                                <Text className={`text-sm font-semibold text-center ${inputMethod === 'paste' ? 'text-primary' : 'text-light-200'}`}>
                                    Paste
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setInputMethod('file')}
                                className={`flex-1 py-2 px-3 rounded-lg border ${inputMethod === 'file'
                                        ? 'bg-accent border-accent'
                                        : 'bg-dark-100 border-dark-100'
                                    }`}
                            >
                                <Text className={`text-sm font-semibold text-center ${inputMethod === 'file' ? 'text-primary' : 'text-light-200'}`}>
                                    Upload File
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Paste Input */}
                        {inputMethod === 'paste' && (
                            <View className="gap-2">
                                <TextInput
                                    placeholder="Paste your CSV data here... (use Ctrl+V)"
                                    placeholderTextColor="#9CA4AB"
                                    value={csvContent}
                                    onChangeText={setCsvContent}
                                    multiline
                                    numberOfLines={6}
                                    className="bg-dark-100 rounded-lg p-4 border border-dark-100 text-white text-sm font-mono flex-1 min-h-[140px]"
                                    editable={!isLoading}
                                />
                                <TouchableOpacity
                                    onPress={handlePasteFromClipboard}
                                    className="flex-row items-center justify-center gap-2 py-2 px-3 bg-dark-100 rounded-lg border border-dark-100 active:bg-dark-200"
                                >
                                    <Copy size={16} color="#A8B5DB" />
                                    <Text className="text-sm font-medium text-light-200">Paste from Clipboard</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* File Upload */}
                        {inputMethod === 'file' && (
                            <View className="gap-3">
                                <View className="border-2 border-dashed border-accent/30 rounded-lg p-8 items-center justify-center bg-dark-100/50">
                                    <FileText size={40} color="#AB8BFF" strokeWidth={1.5} />
                                    <Text className="text-sm font-semibold text-light-200 mt-3">
                                        Select CSV File
                                    </Text>
                                    <Text className="text-xs text-light-300 mt-1 text-center">
                                        Choose a file from your device
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    className="flex-row items-center justify-center gap-2 py-3 px-4 bg-dark-100 rounded-lg border border-dark-100 active:bg-dark-200"
                                >
                                    <Upload size={18} color="#A8B5DB" />
                                    <Text className="text-sm font-semibold text-light-200">Choose File</Text>
                                </TouchableOpacity>
                                <Text className="text-xs text-light-300 text-center mt-2">
                                    💡 File upload requires native setup - paste CSV method is simpler for now
                                </Text>
                            </View>
                        )}

                        {error && (
                            <View className="bg-dark-100 rounded-lg p-3 border border-red-900/60 flex-row gap-3">
                                <AlertCircle size={18} color="#fca5a5" />
                                <Text className="text-red-300 text-sm flex-1">{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={handleImportCSV}
                            disabled={isLoading || !csvContent.trim()}
                            className={`rounded-lg py-3 px-4 items-center justify-center flex-row gap-2 ${isLoading || !csvContent.trim() ? 'bg-dark-100 opacity-50' : 'bg-accent active:opacity-80'
                                }`}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#030014" />
                            ) : (
                                <>
                                    <Download size={18} color="#030014" strokeWidth={2} />
                                    <Text className="text-primary font-semibold">Import List</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 3: Review Results */}
                {step === 'review' && importResult && (
                    <View className="gap-4 py-6 flex-1">
                        <View>
                            <Text className="text-2xl font-bold text-white">Review Results</Text>
                            <Text className="text-sm text-light-300 mt-1">
                                {importResult.totalMatched} / {importResult.totalProcessed} items found
                            </Text>
                        </View>

                        <View className="bg-dark-100 rounded-lg p-4 border border-accent/30">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="font-semibold text-light-100">
                                        Found {importResult.successful.length} items
                                    </Text>
                                    <Text className="text-xs text-light-300 mt-1">
                                        Ready to add to your watchlist
                                    </Text>
                                </View>
                                <CheckCircle2 size={24} color="#AB8BFF" strokeWidth={1.5} />
                            </View>
                        </View>

                        {/* Successful */}
                        {importResult.successful.length > 0 && (
                            <View className="gap-2">
                                <Text className="text-sm font-semibold text-accent">
                                    ✅ Matched ({importResult.successful.length})
                                </Text>
                                <View className="bg-dark-100 rounded-lg p-3 max-h-48 border border-dark-100">
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {importResult.successful.map((item, idx) => (
                                            <View
                                                key={idx}
                                                className="py-3 border-b border-dark-200 last:border-b-0"
                                            >
                                                <Text className="text-sm text-white font-medium">{item.title}</Text>
                                                <Text className="text-xs text-light-300 mt-1">
                                                    {item.mediaType} • {item.status}
                                                </Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        )}

                        {/* Failed */}
                        {importResult.failed.length > 0 && (
                            <View className="gap-2">
                                <Text className="text-sm font-semibold text-light-200">
                                    ⚠️ Not Found ({importResult.failed.length})
                                </Text>
                                <View className="bg-dark-100 rounded-lg p-3 max-h-40 border border-dark-100">
                                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                                        {importResult.failed.map((item, idx) => (
                                            <View
                                                key={idx}
                                                className="py-2 border-b border-dark-200 last:border-b-0"
                                            >
                                                <Text className="text-xs text-white font-medium">{item.title}</Text>
                                                <Text className="text-xs text-light-300 mt-0.5">
                                                    {item.reason}
                                                </Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                                <Text className="text-xs text-light-300 mt-2">
                                    Items not found won't be imported, but others will still be added.
                                </Text>
                            </View>
                        )}

                        <View className="flex-row gap-2 mt-4">
                            <TouchableOpacity
                                onPress={() => setStep('paste_csv')}
                                className="flex-1 py-3 px-4 rounded-lg bg-dark-100 border border-dark-100 active:bg-dark-200"
                            >
                                <Text className="text-white font-semibold text-center text-sm">Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleConfirmImport}
                                disabled={isLoading || importResult.successful.length === 0}
                                className={`flex-1 py-3 px-4 rounded-lg flex-row items-center justify-center gap-2 ${isLoading || importResult.successful.length === 0 ? 'bg-dark-100 opacity-50' : 'bg-accent active:opacity-80'
                                    }`}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#030014" />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} color="#030014" strokeWidth={2} />
                                        <Text className="text-primary font-semibold text-sm">
                                            Add {importResult.successful.length}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Step 4: Importing */}
                {step === 'importing' && (
                    <View className="flex-1 justify-center items-center gap-4 py-20">
                        <ActivityIndicator size="large" color="#AB8BFF" />
                        <Text className="text-white font-semibold">Adding items...</Text>
                        <View className="w-full bg-dark-100 rounded-lg h-2 overflow-hidden">
                            <View
                                className="bg-accent h-full"
                                style={{ width: `${importProgress}%` }}
                            />
                        </View>
                        <Text className="text-light-300 text-xs">{importProgress}% complete</Text>
                    </View>
                )}

                {/* Step 5: Complete */}
                {step === 'complete' && (
                    <View className="flex-1 justify-center items-center gap-4 py-20">
                        <CheckCircle2 size={64} color="#AB8BFF" strokeWidth={1.5} />
                        <Text className="text-2xl font-bold text-white text-center">
                            All Set! ✨
                        </Text>
                        <Text className="text-light-200 text-center text-base">
                            {importedCount} items added to your watchlist
                        </Text>
                        <View className="bg-dark-100 rounded-lg p-4 border border-dark-100 mt-4 w-full">
                            <Text className="text-xs text-light-300">
                                {importResult?.failed.length || 0} items couldn't be matched. You can add them manually by searching.
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDone}
                            className="rounded-lg py-3 px-8 bg-accent active:opacity-80 mt-4"
                        >
                            <Text className="text-primary font-semibold">Back to Watchlist</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
