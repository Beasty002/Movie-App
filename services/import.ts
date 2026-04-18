/**
 * ─── WATCHLIST IMPORT SERVICE ────────────────────────────────────────────────
 * 
 * Supports importing watchlists from popular anime/drama/movie tracking sites:
 * - MyAnimeList (MAL)
 * - AniList
 * - MyDramaList
 * - Letterboxd
 * - Trakt
 * - Kitsu
 * 
 * FLOW:
 * 1. User selects source site (import screen)
 * 2. User exports their list as CSV from the site
 * 3. User pastes CSV into the import screen
 * 4. Service parses CSV with site-specific parser
 * 5. Service matches each title to TMDB (with 50ms delay between API calls)
 * 6. Shows preview: successful matches + failed items
 * 7. User confirms import
 * 8. Items are batch inserted into Supabase watchlist
 * 
 * RATE LIMITING:
 * - 50ms delay between TMDB searches to avoid rate limiting
 * - TMDB cache (5 min) is utilized by the service
 * 
 * ERROR HANDLING:
 * - Failed title matches show reason and are excluded from import
 * - User can still import successfully matched items
 */

import type { MediaType, WatchlistStatus } from '@/types';
import type { ImportedItem, ImportResult, ImportSource, ParsedCSVRow } from '@/types/import';
import { searchDramas, searchMovies } from './tmdb';

// ─── CSV Parsing ────────────────────────────────────────────────────────────

/**
 * Parse CSV from different sources
 * Each source has a slightly different format
 */
function parseCSV(content: string): ParsedCSVRow[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const rows: ParsedCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        // Simple CSV parsing - handles quoted values
        const values = lines[i].match(/(?:[^",]|"(?:(?="")|(?!$))"?)+/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];

        const row: ParsedCSVRow = { title: '', status: '' };
        headers.forEach((header, idx) => {
            row[header as keyof ParsedCSVRow] = values[idx];
        });

        if (row.title) rows.push(row);
    }

    return rows;
}

/**
 * MAL CSV format (exported from MyAnimeList)
 * Columns: anime_id, title, type, episodes, status(1=watching,2=completed,etc), score
 */
export function parseMALCSV(content: string): ImportedItem[] {
    const rows = parseCSV(content);

    const statusMap: Record<number, WatchlistStatus> = {
        1: 'watching',
        2: 'completed',
        3: 'on_hold',
        4: 'dropped',
        6: 'planning'
    };

    return rows.map((row: any) => ({
        title: row['title'] || row['anime_title'] || '',
        mediaType: (row['type']?.toLowerCase() === 'movie' ? 'movie' : 'anime') as MediaType,
        status: statusMap[parseInt(row['my_watch_status'] || row['status'] || '1')] || 'planning',
        episodesWatched: parseInt(row['my_watched_episodes'] || row['episodes_watched'] || '0'),
        score: parseInt(row['my_score'] || row['score'] || '0'),
        sourceId: row['anime_id'],
    }));
}

/**
 * AniList format (exported via myanimelist integration)
 * Columns similar to MAL
 */
export function parseAniListCSV(content: string): ImportedItem[] {
    return parseMALCSV(content); // AniList export is similar to MAL
}

/**
 * MyDramaList CSV format
 * Columns: Title, AvgScore, MyScore, Status(Watching,Complete,Completed,Plan to Watch,On-Hold,Dropped,NA), Episodes Watched
 */
export function parseMyDramaListCSV(content: string): ImportedItem[] {
    const rows = parseCSV(content);

    const statusMap: Record<string, WatchlistStatus> = {
        'watching': 'watching',
        'complete': 'completed',
        'completed': 'completed',
        'plan to watch': 'planning',
        'on-hold': 'on_hold',
        'dropped': 'dropped',
    };

    return rows.map((row: any) => ({
        title: row['title'] || '',
        mediaType: 'kdrama' as MediaType,
        status: statusMap[row['status']?.toLowerCase() || 'plan to watch'] || 'planning',
        episodesWatched: parseInt(row['episodes watched'] || row['episodes_watched'] || '0'),
        score: parseInt(row['myscore'] || row['my_score'] || '0'),
        rating: parseInt(row['avgscore'] || row['avg_score'] || '0'),
        sourceId: row['dramaid'],
    }));
}

/**
 * Letterboxd CSV format (for movies)
 * Columns: Name, Year, LetterboxdURI, Rating
 */
export function parseLetterboxdCSV(content: string): ImportedItem[] {
    const rows = parseCSV(content);

    return rows.map((row: any) => ({
        title: row['name'] || '',
        mediaType: 'movie' as MediaType,
        status: 'completed' as WatchlistStatus,
        score: (parseInt(row['rating'] || '0') * 2), // Letterboxd uses 0.5-5 stars, convert to 0-10
        sourceId: row['letterboxduri'],
    }));
}

/**
 * Trakt CSV format
 * Columns: Title, Year, Status(watched,watching,planning,dropped,on-hold)
 */
export function parseTraktCSV(content: string): ImportedItem[] {
    const rows = parseCSV(content);

    const statusMap: Record<string, WatchlistStatus> = {
        'watched': 'completed',
        'watching': 'watching',
        'planning': 'planning',
        'on-hold': 'on_hold',
        'dropped': 'dropped',
    };

    return rows.map((row: any) => ({
        title: `${row['title'] || ''} (${row['year'] || ''})`,
        mediaType: row['type']?.toLowerCase() === 'movie' ? 'movie' : 'kdrama',
        status: statusMap[row['status']?.toLowerCase() || 'watching'] || 'planning',
    }));
}

/**
 * Kitsu CSV format (similar to MAL)
 */
export function parseKitsuCSV(content: string): ImportedItem[] {
    return parseMALCSV(content);
}

/**
 * Generic CSV parser - tries to intelligently map columns
 */
export function parseGenericCSV(content: string): ImportedItem[] {
    const rows = parseCSV(content);

    return rows.map((row: any) => {
        // Find title column (common names: title, name, anime_title, drama_title)
        const titleKey = Object.keys(row).find(k =>
            k.includes('title') || k.includes('name') || k.includes('anime') || k.includes('drama')
        );

        return {
            title: (titleKey ? row[titleKey] : '') || '',
            mediaType: 'kdrama' as MediaType,
            status: 'planning' as WatchlistStatus,
        };
    });
}

/**
 * Main parser - routes to appropriate parser based on source
 */
export function parseImportedData(source: ImportSource, content: string): ImportedItem[] {
    try {
        switch (source) {
            case 'mal':
                return parseMALCSV(content);
            case 'anilist':
                return parseAniListCSV(content);
            case 'mydramalist':
                return parseMyDramaListCSV(content);
            case 'letterboxd':
                return parseLetterboxdCSV(content);
            case 'trakt':
                return parseTraktCSV(content);
            case 'kitsu':
                return parseKitsuCSV(content);
            case 'csv_generic':
                return parseGenericCSV(content);
            default:
                return [];
        }
    } catch (err) {
        console.error(`Error parsing ${source} CSV:`, err);
        return [];
    }
}

// ─── Title Matching (TMDB Lookup) ────────────────────────────────────────────

/**
 * Convert imported status to our app's status
 */
function normalizeStatus(status: string | WatchlistStatus): WatchlistStatus {
    if (typeof status !== 'string') return status;

    const normalized = status.toLowerCase();
    if (normalized.includes('watch') && normalized.includes('ing')) return 'watching';
    if (normalized.includes('complet') || normalized.includes('watched')) return 'completed';
    if (normalized.includes('plan') || normalized.includes('want')) return 'planning';
    if (normalized.includes('hold') || normalized.includes('pause')) return 'on_hold';
    if (normalized.includes('drop')) return 'dropped';

    return 'planning';
}

/**
 * Search for a title on TMDB and get matching media
 */
export async function matchTitleToTMDB(item: ImportedItem) {
    try {
        const isMovie = item.mediaType === 'movie';

        // Search based on media type
        const response = isMovie
            ? await searchMovies(item.title)
            : await searchDramas(item.title);

        const results = response.results || [];
        if (results.length === 0) {
            return null;
        }

        // Return first result (best match)
        const match = results[0];
        return {
            media_id: match.id,
            media_title: item.title,
            media_type: item.mediaType,
            status: normalizeStatus(item.status),
        };
    } catch (err) {
        console.error(`Error matching title "${item.title}":`, err);
        return null;
    }
}

/**
 * Process import - match all items to TMDB and prepare for adding to watchlist
 */
export async function processImport(items: ImportedItem[]): Promise<ImportResult> {
    const successful: ImportedItem[] = [];
    const failed: Array<{ title: string; reason: string }> = [];

    for (const item of items) {
        try {
            const match = await matchTitleToTMDB(item);
            if (match) {
                successful.push({
                    ...item,
                    media_id: match.media_id,
                });
            } else {
                failed.push({
                    title: item.title,
                    reason: 'Title not found on TMDB',
                });
            }
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            failed.push({
                title: item.title,
                reason: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }

    return {
        successful,
        failed,
        totalProcessed: items.length,
        totalMatched: successful.length,
    };
}
