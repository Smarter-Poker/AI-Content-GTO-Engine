/**
 * 📊 ANALYTICS SERVICE — Performance Data API
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface WeeklySummary {
    total_sessions: number;
    total_questions: number;
    avg_accuracy: number;
    best_streak: number;
    total_xp: number;
    total_diamonds: number;
    net_ev: number;
}

export interface ConceptStats {
    category: string;
    accuracy: number;
    mastery_level: number;
    trend: 'improving' | 'stable' | 'declining';
    attempts: number;
}

export interface LeakInfo {
    category: string;
    severity: 'minor' | 'moderate' | 'severe' | 'critical';
    occurrences: number;
}

export interface AnalyticsSummary {
    weekly_summary: WeeklySummary;
    concepts: ConceptStats[];
    active_leaks: LeakInfo[];
}

export interface DailySnapshot {
    snapshot_date: string;
    sessions_completed: number;
    questions_answered: number;
    accuracy: number;
    best_streak: number;
    net_ev: number;
    xp_earned: number;
    diamonds_earned: number;
}

export class AnalyticsService {
    constructor(private supabase: SupabaseClient) { }

    async getSummary(userId: string): Promise<AnalyticsSummary> {
        const { data, error } = await this.supabase.rpc('fn_get_analytics_summary', {
            p_user_id: userId
        });
        if (error) throw new Error(`Failed to get analytics: ${error.message}`);
        return data as AnalyticsSummary;
    }

    async getDailySnapshots(userId: string, days: number = 30): Promise<DailySnapshot[]> {
        const { data, error } = await this.supabase
            .from('performance_snapshots')
            .select('*')
            .eq('user_id', userId)
            .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('snapshot_date', { ascending: false });
        if (error) throw new Error(`Failed to get snapshots: ${error.message}`);
        return data || [];
    }

    async getConceptMastery(userId: string): Promise<ConceptStats[]> {
        const { data, error } = await this.supabase
            .from('concept_mastery')
            .select('concept_category, accuracy, mastery_level, trend, total_attempts')
            .eq('user_id', userId)
            .order('accuracy', { ascending: false });
        if (error) throw new Error(`Failed to get mastery: ${error.message}`);
        return (data || []).map(d => ({
            category: d.concept_category,
            accuracy: d.accuracy,
            mastery_level: d.mastery_level,
            trend: d.trend,
            attempts: d.total_attempts
        }));
    }

    async getActiveLeaks(userId: string): Promise<LeakInfo[]> {
        const { data, error } = await this.supabase
            .from('leak_history')
            .select('concept_category, severity, occurrences')
            .eq('user_id', userId)
            .eq('is_resolved', false)
            .order('occurrences', { ascending: false });
        if (error) throw new Error(`Failed to get leaks: ${error.message}`);
        return (data || []).map(d => ({
            category: d.concept_category,
            severity: d.severity,
            occurrences: d.occurrences
        }));
    }

    async updateDailySnapshot(userId: string): Promise<void> {
        const { error } = await this.supabase.rpc('fn_update_daily_snapshot', {
            p_user_id: userId
        });
        if (error) throw new Error(`Failed to update snapshot: ${error.message}`);
    }
}

export const createAnalyticsService = (supabase: SupabaseClient) => new AnalyticsService(supabase);
export default AnalyticsService;
