import type { MediaType, WatchlistStatus } from './index';

// ─── Import source types ────────────────────────────────────────────────────
export type ImportSource = 'mal' | 'anilist' | 'mydramalist' | 'letterboxd' | 'trakt' | 'kitsu' | 'csv_generic';

export interface ImportedItem {
    title: string;
    mediaType: MediaType;
    status: WatchlistStatus;
    rating?: number;
    notes?: string;
    episodesWatched?: number;
    score?: number; // Original score from source (0-10 or 0-100)
    sourceId?: string; // ID from the original source
    media_id?: number; // Added by import service when matched to TMDB
}

export interface ImportResult {
    successful: ImportedItem[];
    failed: Array<{ title: string; reason: string }>;
    totalProcessed: number;
    totalMatched: number;
}

export interface ImportConfig {
    source: ImportSource;
    data: string; // CSV content or JSON string
    userId?: string;
}

// CSV parsers expect these formats from different sources
export interface ParsedCSVRow {
    title: string;
    status: string;
    score?: string | number;
    episodes?: string | number;
    notes?: string;
    mediaType?: string;
    sourceId?: string;
}
