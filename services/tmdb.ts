import type {
  TMDBCast,
  TMDBDrama,
  TMDBEpisode,
  TMDBSearchResponse,
} from '@/types';

const BASE_URL =
  process.env.EXPO_PUBLIC_TMDB_BASE_URL ?? 'https://api.themoviedb.org/3';
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
const IMAGE_BASE =
  process.env.EXPO_PUBLIC_TMDB_IMAGE_URL ?? 'https://image.tmdb.org/t/p';

// ─── Simple in-memory cache (5-minute TTL) ───────────────────────────────────
interface CacheEntry {
  data: unknown;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchTMDB<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('language', 'ko-KR');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const key = url.toString();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const res = await fetch(key, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${path}`);
  }

  const data = (await res.json()) as T;
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// ─── Image helper ─────────────────────────────────────────────────────────────
export function getImageUrl(
  path: string | null,
  size: 'w300' | 'w500' | 'w780' = 'w300',
): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

// ─── API functions ────────────────────────────────────────────────────────────
export async function searchDramas(
  query: string,
  page = 1,
): Promise<TMDBSearchResponse> {
  return fetchTMDB<TMDBSearchResponse>('/search/tv', {
    query: encodeURIComponent(query),
    page: String(page),
    with_origin_country: 'KR',
  });
}

export async function getDramaDetail(id: number): Promise<TMDBDrama> {
  return fetchTMDB<TMDBDrama>(`/tv/${id}`, {
    append_to_response: 'credits,seasons',
  });
}

export async function getDramaCredits(id: number): Promise<TMDBCast[]> {
  const data = await fetchTMDB<{ cast: TMDBCast[] }>(`/tv/${id}/credits`);
  return data.cast;
}

export async function getDramaEpisodes(
  id: number,
  season: number,
): Promise<TMDBEpisode[]> {
  const data = await fetchTMDB<{ episodes: TMDBEpisode[] }>(
    `/tv/${id}/season/${season}`,
  );
  return data.episodes ?? [];
}

export async function getTrending(): Promise<TMDBDrama[]> {
  const data = await fetchTMDB<TMDBSearchResponse>('/trending/tv/week', {
    with_origin_country: 'KR',
  });
  return data.results;
}
