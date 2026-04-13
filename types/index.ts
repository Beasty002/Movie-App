// ─── Media types ────────────────────────────────────────────────────────────
export type MediaType = 'kdrama' | 'anime' | 'movie';
export type WatchlistStatus = 'planning' | 'watching' | 'completed' | 'dropped';

// ─── TMDB API types ──────────────────────────────────────────────────────────
export interface TMDBDrama {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  origin_country?: string[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  status?: string;
  networks?: { id: number; name: string; logo_path: string }[];
  genres?: { id: number; name: string }[];
  credits?: { cast: TMDBCast[] };
  media_type?: 'tv' | 'movie';
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  air_date: string;
  overview: string;
  still_path: string | null;
}

export interface TMDBSearchResponse {
  results: TMDBDrama[];
  total_results: number;
  total_pages: number;
  page: number;
}

// ─── App types ───────────────────────────────────────────────────────────────
export interface WatchlistItem {
  id: string;
  user_id: string;
  media_id: number;
  media_type: MediaType;
  media_title: string;
  media_title_korean: string | null;
  media_poster: string | null;
  media_year: number | null;
  total_episodes: number | null;
  status: WatchlistStatus;
  created_at: string;
  updated_at: string;
}

export interface WatchlistWithProgress extends WatchlistItem {
  episodes_watched: number;
}

export interface ProgressEntry {
  id: string;
  user_id: string;
  media_id: number;
  media_type: MediaType;
  episode_number: number;
  watched_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  media_id: number;
  media_type: MediaType;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}
