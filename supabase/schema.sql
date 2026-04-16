-- ═══════════════════════════════════════════════════════════════════════════════
-- VOTCH — Complete Database Schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES — User accounts with basic info
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  push_token TEXT,
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  last_watched_date DATE,
  username_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all profiles, but only update their own
CREATE POLICY "Public read access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- WATCHLIST — User's tracked media
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('kdrama', 'anime', 'movie', 'series')),
  media_title TEXT NOT NULL,
  media_title_korean TEXT,
  media_poster TEXT,
  media_year INTEGER,
  total_episodes INTEGER,
  status TEXT NOT NULL CHECK (status IN ('planning', 'watching', 'on_hold', 'completed', 'dropped')) DEFAULT 'planning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id, media_type)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlist" ON watchlist
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROGRESS — Episode viewing history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('kdrama', 'anime', 'movie', 'series')),
  episode_number INTEGER NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id, media_type, episode_number)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add progress" ON progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON progress
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RATINGS — User ratings and reviews
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('kdrama', 'anime', 'movie', 'series')),
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id, media_type)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON ratings FOR SELECT USING (true);
CREATE POLICY "Users can add own ratings" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON ratings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- POLLS — Group watch decisions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  expiry_duration TEXT NOT NULL CHECK (expiry_duration IN ('12h', '24h', '48h', '1w')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  share_code TEXT NOT NULL UNIQUE,
  watch_date DATE,
  watch_time TEXT,
  watch_custom_time TEXT,
  watch_together_link TEXT,
  allow_suggestions BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON polls
  FOR INSERT WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);
CREATE POLICY "Creators can update own polls" ON polls
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- POLL_VOTES — Votes on polls (supports guests)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_identifier TEXT,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_vote UNIQUE (poll_id, voter_id),
  CONSTRAINT unique_guest_vote UNIQUE (poll_id, guest_identifier)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote" ON poll_votes FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS — User notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'poll_vote',
    'poll_ending',
    'poll_ended',
    'episode_release',
    'streak_reminder',
    'weekly_recap',
    'badge_unlocked',
    'friend_activity'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER_PREFERENCES — User settings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  primary_genre TEXT DEFAULT 'kdrama',
  theme TEXT DEFAULT 'system',
  timezone TEXT,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_streak_reminders BOOLEAN DEFAULT TRUE,
  notify_poll_activity BOOLEAN DEFAULT TRUE,
  notify_episode_releases BOOLEAN DEFAULT FALSE,
  notify_weekly_recap BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWS & COMPUTED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- View: watchlist_with_progress
-- Joins watchlist with computed episode counts
CREATE OR REPLACE VIEW watchlist_with_progress AS
SELECT
  w.*,
  COALESCE(COUNT(p.id), 0) AS episodes_watched
FROM watchlist w
LEFT JOIN progress p ON w.user_id = p.user_id
  AND w.media_id = p.media_id
  AND w.media_type = p.media_type
GROUP BY w.id, w.user_id, w.media_id, w.media_type, w.media_title,
  w.media_title_korean, w.media_poster, w.media_year, w.total_episodes,
  w.status, w.created_at, w.updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXING FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_media_id ON watchlist(media_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_watched_at ON progress(watched_at);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_polls_creator_id ON polls(creator_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
