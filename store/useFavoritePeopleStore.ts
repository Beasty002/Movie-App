import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { FavoritePerson } from '@/types';
import { create } from 'zustand';

interface FavoritePeopleState {
  favorites: FavoritePerson[];
  isLoaded: boolean;
  fetchFavorites: (userId: string) => Promise<void>;
  addFavorite: (person: FavoritePerson) => Promise<void>;
  removeFavorite: (personId: number) => Promise<void>;
  isFavorite: (personId: number) => boolean;
}

export const useFavoritePeopleStore = create<FavoritePeopleState>((set, get) => ({
  favorites: [],
  isLoaded: false,

  fetchFavorites: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('favorite_people')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const favorites: FavoritePerson[] = (data ?? []).map((row) => ({
        id: row.person_id as number,
        name: row.person_name as string,
        profile_path: (row.profile_path as string | null) ?? null,
        known_for: (row.known_for as string | undefined) ?? undefined,
      }));
      set({ favorites, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  addFavorite: async (person) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const { favorites } = get();
    if (favorites.some((f) => f.id === person.id)) return;

    // Optimistic update
    set({ favorites: [person, ...favorites] });

    await supabase.from('favorite_people').insert({
      user_id: userId,
      person_id: person.id,
      person_name: person.name,
      profile_path: person.profile_path,
      known_for: person.known_for ?? null,
    });
  },

  removeFavorite: async (personId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // Optimistic update
    set((state) => ({ favorites: state.favorites.filter((f) => f.id !== personId) }));

    await supabase
      .from('favorite_people')
      .delete()
      .eq('user_id', userId)
      .eq('person_id', personId);
  },

  isFavorite: (personId) => get().favorites.some((f) => f.id === personId),
}));
