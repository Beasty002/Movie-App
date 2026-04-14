import { matchTitleToTMDB, parseImportedData } from '@/services/import';
import { supabase } from '@/services/supabase';
import type { WatchlistItem } from '@/types';
import type { ImportedItem, ImportResult, ImportSource } from '@/types/import';
import { create } from 'zustand';

interface ImportState {
    isLoading: boolean;
    error: string | null;
    importResult: ImportResult | null;
    pendingItems: ImportedItem[];
    importProgress: number; // 0-100

    // Methods
    importFromCSV: (source: ImportSource, csvContent: string, userId: string) => Promise<ImportResult>;
    addMatchedItemsToWatchlist: (userId: string, items: ImportedItem[]) => Promise<void>;
    clearImport: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
    isLoading: false,
    error: null,
    importResult: null,
    pendingItems: [],
    importProgress: 0,

    importFromCSV: async (source: ImportSource, csvContent: string, userId: string) => {
        set({ isLoading: true, error: null, importProgress: 0 });
        try {
            // Step 1: Parse CSV
            const parsed = parseImportedData(source, csvContent);
            set({ pendingItems: parsed, importProgress: 33 });

            if (parsed.length === 0) {
                throw new Error('No items found in the CSV file');
            }

            // Step 2: Match titles to TMDB and enrich items
            const enriched: (ImportedItem & { media_id: number })[] = [];
            for (let i = 0; i < parsed.length; i++) {
                const item = parsed[i];
                const match = await matchTitleToTMDB(item);
                if (match) {
                    enriched.push({
                        ...item,
                        media_id: match.media_id,
                    });
                }
                set({ importProgress: 33 + (i / parsed.length) * 33 });
                // Small delay to avoid rate limiting TMDB
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const result: ImportResult = {
                successful: enriched,
                failed: parsed
                    .filter(p => !enriched.find(e => e.title === p.title))
                    .map(item => ({ title: item.title, reason: 'Title not found on TMDB' })),
                totalProcessed: parsed.length,
                totalMatched: enriched.length,
            };

            set({ importResult: result, importProgress: 66, pendingItems: enriched });

            set({ importProgress: 100 });
            return result;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Import failed';
            set({ error: msg, isLoading: false });
            throw err;
        } finally {
            set({ isLoading: false });
        }
    },

    addMatchedItemsToWatchlist: async (userId: string, items: ImportedItem[]) => {
        set({ isLoading: true, error: null, importProgress: 0 });
        try {
            const itemsToAdd: WatchlistItem[] = [];
            const total = items.length;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Use imported data with media_id (should be added by the import process)
                const mediaId = (item as any).media_id;
                if (!mediaId) {
                    console.warn(`Skipping ${item.title} - no media_id`);
                    continue;
                }

                itemsToAdd.push({
                    id: `temp-${Date.now()}-${i}`, // Will be replaced by server
                    user_id: userId,
                    media_id: mediaId,
                    media_type: item.mediaType,
                    media_title: item.title,
                    status: item.status,
                    poster_path: null,
                    rating: item.rating || null,
                    notes: item.notes || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

                set({ importProgress: Math.round((i / total) * 100) });
            }

            // Batch insert to Supabase
            if (itemsToAdd.length > 0) {
                const { error } = await supabase
                    .from('watchlist')
                    .insert(
                        itemsToAdd.map(item => ({
                            user_id: item.user_id,
                            media_id: item.media_id,
                            media_type: item.media_type,
                            media_title: item.media_title,
                            status: item.status,
                            poster_path: item.poster_path,
                            rating: item.rating,
                            notes: item.notes,
                        }))
                    );

                if (error) throw error;
            }

            set({ importProgress: 100, pendingItems: [] });
            return itemsToAdd.length;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to add items to watchlist';
            set({ error: msg });
            throw err;
        } finally {
            set({ isLoading: false });
        }
    },

    clearImport: () => {
        set({
            isLoading: false,
            error: null,
            importResult: null,
            pendingItems: [],
            importProgress: 0,
        });
    },
}));
