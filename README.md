# Votch — K-Drama & Anime Tracking with Friend Polls 🎬

A React Native app built with Expo for tracking dramas, anime, and movies with the ability to create polls to decide what to watch with friends.

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Create `.env.local` with Supabase and TMDB credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   EXPO_PUBLIC_MOVIE_API_KEY=your_tmdb_key
   ```

3. Start the app
   ```bash
   npm start
   ```

## Tech Stack
- **Frontend:** React Native + Expo SDK 52 (Expo Router)
- **State:** Zustand (local) + TanStack Query (server)
- **Database:** Supabase (PostgreSQL + Realtime)
- **Styling:** NativeWind (Tailwind for React Native)
- **API:** TMDB (movies/dramas), AniList GraphQL (anime)

## Features
- 🎬 Track dramas, anime, and movies
- ⏸️ Episode progress tracking
- 📊 Statistics and watch history
- 🗳️ Create polls to decide what to watch with friends
- 📤 Import watchlists from MAL, AniList, MyDramaList, Letterboxd, etc.
- 📥 Export watchlists to CSV/JSON
- 👥 Real-time guest voting on polls
- 🔗 Deep link sharing for polls

## Error Handling
The app includes comprehensive error handling:
- Global error handler prevents crashes from unhandled exceptions
- Safe async utilities for promise handling
- Data validation before property access
- User-friendly error messages

See `Decision.md` for architecture notes and `PROGRESS.md` for build status.
