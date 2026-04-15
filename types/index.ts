// ─── Media types ────────────────────────────────────────────────────────────
export type MediaType = 'kdrama' | 'anime' | 'movie' | 'series';
export type WatchlistStatus = 'planning' | 'watching' | 'on_hold' | 'completed' | 'dropped';

// ─── TMDB API types ──────────────────────────────────────────────────────────

// TV show creator (returned in `created_by` on /tv/{id} — different from crew director)
export interface TMDBCreator {
  id: number;
  name: string;
  profile_path: string | null;
  gender?: number;
  credit_id?: string;
}

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
  credits?: { cast: TMDBCast[]; crew?: TMDBCrew[] };
  // TV-only: show creators/showrunners (replaces per-episode crew directors)
  created_by?: TMDBCreator[];
  media_type?: 'tv' | 'movie';
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
  department: string;
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

export interface TMDBPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for?: Array<{
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    media_type: 'tv' | 'movie';
    vote_average: number;
  }>;
}

export interface TMDBPersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  also_known_as: string[];
  gender: number;
}

export interface TMDBPersonCredit {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'tv' | 'movie';
  character?: string;
  job?: string;
  genre_ids?: number[];
}

export interface TMDBPersonSearchResponse {
  results: TMDBPerson[];
  total_results: number;
  total_pages: number;
  page: number;
}

// ─── App types ───────────────────────────────────────────────────────────────
export interface FavoritePerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for?: string; // character name or job title for context
}

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

// ─── Poll types ───────────────────────────────────────────────────────────────
export interface PollOption {
  index: number;
  media_id: number;
  media_type: MediaType;
  title: string;
  title_korean: string | null;
  poster: string | null;
  year: number | null;
}

export interface Poll {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  options: PollOption[];
  expiry_duration: '12h' | '24h' | '48h' | '1w';
  expires_at: string;
  is_active: boolean;
  share_code: string;
  created_at: string;
  updated_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  voter_id: string | null;
  guest_email: string | null;
  guest_identifier: string | null;
  option_index: number;
  created_at: string;
}

export interface PollWithResults extends Poll {
  total_votes: number;
  votes_by_option: Record<number, number>;
  user_vote: number | null;
}

export interface PollListItem {
  id: string;
  title: string;
  share_code: string;
  expires_at: string;
  is_active: boolean;
  total_votes: number;
  created_at: string;
  options: PollOption[];
}
