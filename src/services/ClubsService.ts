/**
 * 🏛️ CLUBS SERVICE — Social Gaming API
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface Club {
    id: string;
    name: string;
    slug: string;
    description?: string;
    avatar_url?: string;
    banner_url?: string;
    city?: string;
    country?: string;
    member_count: number;
    is_public: boolean;
    min_level_required: number;
    owner_id: string;
}

export interface ClubMember {
    id: string;
    club_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'moderator' | 'member';
    status: 'pending' | 'active' | 'banned';
    xp_contributed: number;
    challenges_completed: number;
    weekly_rank?: number;
    joined_at: string;
}

export interface ClubChallenge {
    id: string;
    club_id: string;
    title: string;
    description?: string;
    challenge_type: 'accuracy' | 'questions' | 'streak' | 'xp' | 'custom';
    target_value: number;
    diamond_reward: number;
    xp_reward: number;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    ends_at: string;
}

export interface NearbyClub extends Club {
    distance_km: number;
}

export class ClubsService {
    constructor(private supabase: SupabaseClient) { }

    async discoverNearby(lat: number, lng: number, radiusKm: number = 50): Promise<NearbyClub[]> {
        const { data, error } = await this.supabase.rpc('fn_discover_clubs', {
            p_latitude: lat,
            p_longitude: lng,
            p_radius_km: radiusKm,
            p_limit: 20
        });
        if (error) throw new Error(`Discovery failed: ${error.message}`);
        return (data || []).map((d: any) => ({
            id: d.club_id, name: d.name, description: d.description,
            avatar_url: d.avatar_url, member_count: d.member_count,
            distance_km: d.distance_km, city: d.city, country: d.country
        })) as NearbyClub[];
    }

    async getClub(clubId: string): Promise<Club | null> {
        const { data, error } = await this.supabase
            .from('clubs')
            .select('*')
            .eq('id', clubId)
            .single();
        if (error) return null;
        return data as Club;
    }

    async getMyClubs(userId: string): Promise<Club[]> {
        const { data, error } = await this.supabase
            .from('club_members')
            .select('club:clubs(*)')
            .eq('user_id', userId)
            .eq('status', 'active');
        if (error) throw new Error(`Failed to get clubs: ${error.message}`);
        return (data || []).map((d: any) => d.club) as Club[];
    }

    async join(userId: string, clubId: string): Promise<{ success: boolean; status?: string; error?: string }> {
        const { data, error } = await this.supabase.rpc('fn_join_club', {
            p_user_id: userId,
            p_club_id: clubId
        });
        if (error) throw new Error(`Join failed: ${error.message}`);
        return data;
    }

    async create(ownerId: string, name: string, description?: string, lat?: number, lng?: number, city?: string, country?: string): Promise<string> {
        const { data, error } = await this.supabase.rpc('fn_create_club', {
            p_owner_id: ownerId,
            p_name: name,
            p_description: description || null,
            p_latitude: lat || null,
            p_longitude: lng || null,
            p_city: city || null,
            p_country: country || null
        });
        if (error) throw new Error(`Create failed: ${error.message}`);
        return data as string;
    }

    async leave(userId: string, clubId: string): Promise<void> {
        const { error } = await this.supabase
            .from('club_members')
            .delete()
            .eq('user_id', userId)
            .eq('club_id', clubId);
        if (error) throw new Error(`Leave failed: ${error.message}`);
        await this.supabase.rpc('fn_update_member_count', { p_club_id: clubId });
    }

    async getMembers(clubId: string): Promise<ClubMember[]> {
        const { data, error } = await this.supabase
            .from('club_members')
            .select('*')
            .eq('club_id', clubId)
            .eq('status', 'active')
            .order('xp_contributed', { ascending: false });
        if (error) throw new Error(`Failed to get members: ${error.message}`);
        return data as ClubMember[];
    }

    async getChallenges(clubId: string): Promise<ClubChallenge[]> {
        const { data, error } = await this.supabase
            .from('club_challenges')
            .select('*')
            .eq('club_id', clubId)
            .in('status', ['upcoming', 'active'])
            .order('ends_at', { ascending: true });
        if (error) throw new Error(`Failed to get challenges: ${error.message}`);
        return data as ClubChallenge[];
    }

    async searchClubs(query: string): Promise<Club[]> {
        const { data, error } = await this.supabase
            .from('clubs')
            .select('*')
            .eq('is_public', true)
            .ilike('name', `%${query}%`)
            .order('member_count', { ascending: false })
            .limit(20);
        if (error) throw new Error(`Search failed: ${error.message}`);
        return data as Club[];
    }
}

export const createClubsService = (supabase: SupabaseClient) => new ClubsService(supabase);
export default ClubsService;
