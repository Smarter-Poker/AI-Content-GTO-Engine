-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏛️ CLUBS SCHEMA — SOCIAL GAMING & DISCOVERY
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tables: clubs, club_members, club_challenges, club_leaderboards
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable PostGIS for location-based discovery
CREATE EXTENSION IF NOT EXISTS postgis;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏛️ CLUBS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    
    -- Location (PostGIS)
    location GEOGRAPHY(POINT, 4326),
    city TEXT,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    
    -- Settings
    is_public BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    min_level_required INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 100,
    
    -- Stats
    member_count INTEGER DEFAULT 0,
    total_xp_earned BIGINT DEFAULT 0,
    avg_member_accuracy DECIMAL(5,4) DEFAULT 0,
    
    -- Activity
    weekly_challenge_id UUID,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ownership
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 👥 CLUB MEMBERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'banned')),
    
    -- Contribution
    xp_contributed BIGINT DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    weekly_rank INTEGER,
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(club_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏆 CLUB CHALLENGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS club_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    
    -- Challenge Details
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT DEFAULT 'accuracy' CHECK (challenge_type IN ('accuracy', 'questions', 'streak', 'xp', 'custom')),
    target_value INTEGER NOT NULL,
    
    -- Reward
    diamond_reward INTEGER DEFAULT 50,
    xp_reward INTEGER DEFAULT 500,
    badge_id TEXT,
    
    -- Duration
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    
    -- Results
    participants_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 CLUB LEADERBOARDS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS club_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    
    -- Period
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'alltime')),
    period_start DATE NOT NULL,
    period_end DATE,
    
    -- Rankings (JSONB array of user rankings)
    rankings JSONB DEFAULT '[]',
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(club_id, period_type, period_start)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_clubs_location ON clubs USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_clubs_public ON clubs(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_clubs_activity ON clubs(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_challenges_club ON club_challenges(club_id);
CREATE INDEX IF NOT EXISTS idx_club_challenges_active ON club_challenges(status) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: DISCOVER NEARBY CLUBS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_discover_clubs(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km INTEGER DEFAULT 50,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    club_id UUID,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    member_count INTEGER,
    distance_km DECIMAL,
    city TEXT,
    country TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.avatar_url,
        c.member_count,
        ROUND((ST_Distance(
            c.location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ) / 1000)::DECIMAL, 1) as distance_km,
        c.city,
        c.country
    FROM clubs c
    WHERE c.is_public = true
      AND ST_DWithin(
          c.location,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
          p_radius_km * 1000
      )
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: JOIN CLUB
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_join_club(p_user_id UUID, p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_club RECORD;
    v_user_level INTEGER;
    v_status TEXT;
BEGIN
    SELECT * INTO v_club FROM clubs WHERE id = p_club_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Club not found');
    END IF;
    
    IF v_club.member_count >= v_club.max_members THEN
        RETURN jsonb_build_object('error', 'Club is full');
    END IF;
    
    SELECT level INTO v_user_level FROM user_progress WHERE user_id = p_user_id;
    IF v_user_level < v_club.min_level_required THEN
        RETURN jsonb_build_object('error', 'Level ' || v_club.min_level_required || ' required');
    END IF;
    
    v_status := CASE WHEN v_club.requires_approval THEN 'pending' ELSE 'active' END;
    
    INSERT INTO club_members (club_id, user_id, status)
    VALUES (p_club_id, p_user_id, v_status)
    ON CONFLICT (club_id, user_id) DO NOTHING;
    
    IF v_status = 'active' THEN
        UPDATE clubs SET member_count = member_count + 1 WHERE id = p_club_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'status', v_status);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: CREATE CLUB
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_create_club(
    p_owner_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_club_id UUID;
    v_slug TEXT;
BEGIN
    v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
    
    INSERT INTO clubs (name, slug, description, owner_id, city, country, location)
    VALUES (
        p_name, v_slug, p_description, p_owner_id, p_city, p_country,
        CASE WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
             ELSE NULL
        END
    )
    RETURNING id INTO v_club_id;
    
    INSERT INTO club_members (club_id, user_id, role, status)
    VALUES (v_club_id, p_owner_id, 'owner', 'active');
    
    UPDATE clubs SET member_count = 1 WHERE id = v_club_id;
    
    RETURN v_club_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public clubs visible" ON clubs FOR SELECT USING (is_public = true OR owner_id = auth.uid());
CREATE POLICY "Owners manage clubs" ON clubs FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Members see memberships" ON club_members FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = auth.uid()));
CREATE POLICY "Users manage own membership" ON club_members FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Challenges visible to members" ON club_challenges FOR SELECT USING (
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_challenges.club_id AND cm.user_id = auth.uid()));
CREATE POLICY "Leaderboards visible to members" ON club_leaderboards FOR SELECT USING (
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_leaderboards.club_id AND cm.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON club_members TO authenticated;
GRANT SELECT ON club_challenges TO authenticated;
GRANT SELECT ON club_leaderboards TO authenticated;
GRANT EXECUTE ON FUNCTION fn_discover_clubs TO authenticated;
GRANT EXECUTE ON FUNCTION fn_join_club TO authenticated;
GRANT EXECUTE ON FUNCTION fn_create_club TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
