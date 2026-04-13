import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { MediaType, WatchlistItem, WatchlistStatus, WatchlistWithProgress } from '@/types';

interface WatchlistState {
  items: WatchlistWithProgress[];
  isLoading: boolean;
  error: string | null;
  fetchWatchlist: (userId: string) => Promise<void>;
  addToWatchlist: (
    item: Omit<WatchlistItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    userId: string,
  ) => Promise<void>;
  updateStatus: (id: string, status: WatchlistStatus) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;
  getItemByMedia: (mediaId: number, mediaType: MediaType) => WatchlistWithProgress | null;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWatchlist: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('watchlist_with_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ items: (data as WatchlistWithProgress[]) ?? [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load watchlist';
      set({ error: msg });
    } finally {
      set({ isLoading: false });
    }
  },

  addToWatchlist: async (item, userId) => {
    const tempId = `temp-${Date.now()}`;
    const tempItem: WatchlistWithProgress = {
      ...item,
      id: tempId,
      user_id: userId,
      episodes_watched: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic add
    set((state) => ({ items: [tempItem, ...state.items] }));

    try {
      const { data, error } = await supabase
        .from('watchlist')
        .insert({ ...item, user_id: userId })
        .select()
        .single();

      if (error) throw error;

      // Replace temp with server data
      set((state) => ({
        items: state.items.map((i) =>
          i.id === tempId ? { ...(data as WatchlistItem), episodes_watched: 0 } : i,
        ),
      }));
    } catch (err) {
      // Revert on failure
      set((state) => ({ items: state.items.filter((i) => i.id !== tempId) }));
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    const previous = get().items.find((i) => i.id === id);

    // Optimistic update
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, status, updated_at: new Date().toISOString() } : i,
      ),
    }));

    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      // Revert
      if (previous) {
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? previous : i)),
        }));
      }
      throw err;
    }
  },

  removeFromWatchlist: async (id) => {
    const previous = get().items.find((i) => i.id === id);

    // Optimistic remove
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));

    try {
      const { error } = await supabase.from('watchlist').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      // Revert
      if (previous) {
        set((state) => ({ items: [previous, ...state.items] }));
      }
      throw err;
    }
  },

  getItemByMedia: (mediaId, mediaType) => {
    return get().items.find((i) => i.media_id === mediaId && i.media_type === mediaType) ?? null;
  },
}));
