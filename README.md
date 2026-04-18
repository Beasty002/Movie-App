# Votch — K-Drama & Anime Tracking with Friend Polls 🎬

A React Native app built with Expo for tracking dramas, anime, and movies with the ability to create polls to decide what to watch with friends.

## Setup

### For Local Development
1. Install dependencies
   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Then fill in your actual values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
   EXPO_PUBLIC_TMDB_BASE_URL=https://api.themoviedb.org/3
   EXPO_PUBLIC_TMDB_IMAGE_URL=https://image.tmdb.org/t/p
   ```
   ⚠️ **Never commit `.env` to git** — it's in `.gitignore`

3. Start the app
   ```bash
   npm start
   ```

### For Play Store Builds (via GitHub Actions)
The app automatically builds and deploys via GitHub Actions when you push to `main`.

**Required GitHub Secrets:**
Set these in `Settings → Secrets and Variables → Actions → Repository Secrets`:
- `EXPO_TOKEN` — Your Expo authentication token
- `EXPO_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anonymous key
- `EXPO_PUBLIC_TMDB_API_KEY` — Your TMDB API key
- `EXPO_PUBLIC_TMDB_BASE_URL` — `https://api.themoviedb.org/3`
- `EXPO_PUBLIC_TMDB_IMAGE_URL` — `https://image.tmdb.org/t/p`

**Build workflow:** `.github/workflows/eas-build.yml` (runs on `push` to `main` or manual trigger)

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
