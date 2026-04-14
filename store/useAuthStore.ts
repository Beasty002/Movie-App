import { supabase } from '@/services/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isInitialized: true });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (data.session) {
        set({ session: data.session, user: data.session.user });
      }
    } catch (err) {
      const authError = err as AuthError;
      const errorMsg = authError.message;
      set({ error: errorMsg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        // Handle rate limiting
        if (error.message.includes('only request this after')) {
          const match = error.message.match(/after (\d+) seconds/);
          const seconds = match ? match[1] : '60';
          throw new Error(`Please wait ${seconds} seconds before trying again`);
        }
        throw error;
      }

      if (!data.user?.id) {
        throw new Error('No user ID returned from auth signup');
      }

      // Create profile
      const defaultUsername = `user_${email.split('@')[0]}`;
      await supabase.from('profiles').insert({
        id: data.user.id,
        username: defaultUsername
      }).throwOnError();

      // Create user preferences
      await supabase
        .from('user_preferences')
        .insert({ user_id: data.user.id })
        .throwOnError();
    } catch (err) {
      const authError = err as AuthError | Error;
      const errorMsg = authError instanceof AuthError
        ? authError.message
        : authError.message;
      set({ error: errorMsg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open the OAuth URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'votch://'
        );

        if (result.type === 'success') {
          // Small delay to allow session to be established
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Get the updated session
          const { data: { session }, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) throw sessionError;

          if (session) {
            set({ session, user: session.user });
          }
        } else if (result.type === 'cancel') {
          set({ error: 'Google sign-in was cancelled' });
        }
      }
    } catch (err) {
      const authError = err as AuthError | Error;
      const errorMsg =
        authError instanceof AuthError
          ? authError.message
          : authError.message;
      set({ error: errorMsg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      const authError = err as AuthError;
      set({ error: authError.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
