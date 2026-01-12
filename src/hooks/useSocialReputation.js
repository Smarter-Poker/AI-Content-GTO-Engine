/**
 * 🏆 SMARTER.POKER — USE SOCIAL REPUTATION HOOK
 * ═══════════════════════════════════════════════════════════════════════════
 * ORB_01_SOCIAL_DNA: React Hook for Social Tier Display
 * 
 * Fetches and displays user's Social Tier based on XP progression.
 * Provides tier badges, progress visualization, and reputation data.
 * 
 * HARD LAW: XP can NEVER decrease (XP_TRIPLE_LOCK)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 🏆 SOCIAL TIER DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const SOCIAL_TIERS = {
    BRONZE: {
        id: 'BRONZE',
        name: 'Bronze',
        minXP: 0,
        maxXP: 999,
        icon: '🥉',
        color: '#CD7F32',
        gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
        glow: '0 0 20px rgba(205, 127, 50, 0.5)',
        privileges: ['Basic Profile', 'Training Access'],
        nextTier: 'SILVER'
    },
    SILVER: {
        id: 'SILVER',
        name: 'Silver',
        minXP: 1000,
        maxXP: 4999,
        icon: '🥈',
        color: '#C0C0C0',
        gradient: 'linear-gradient(135deg, #E8E8E8 0%, #A8A8A8 100%)',
        glow: '0 0 20px rgba(192, 192, 192, 0.5)',
        privileges: ['Club Creation', 'Leaderboard Access', 'Social Features'],
        nextTier: 'GOLD'
    },
    GOLD: {
        id: 'GOLD',
        name: 'Gold',
        minXP: 5000,
        maxXP: 14999,
        icon: '🥇',
        color: '#FFD700',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        glow: '0 0 25px rgba(255, 215, 0, 0.6)',
        privileges: ['Tournament Entry', 'Advanced Analytics', 'Priority Support'],
        nextTier: 'PLATINUM'
    },
    PLATINUM: {
        id: 'PLATINUM',
        name: 'Platinum',
        minXP: 15000,
        maxXP: 49999,
        icon: '💎',
        color: '#E5E4E2',
        gradient: 'linear-gradient(135deg, #E5E4E2 0%, #B4B4B4 50%, #E5E4E2 100%)',
        glow: '0 0 30px rgba(229, 228, 226, 0.7)',
        privileges: ['Exclusive Events', 'Beta Features', 'Coach Access'],
        nextTier: 'DIAMOND'
    },
    DIAMOND: {
        id: 'DIAMOND',
        name: 'Diamond',
        minXP: 50000,
        maxXP: 149999,
        icon: '💠',
        color: '#B9F2FF',
        gradient: 'linear-gradient(135deg, #B9F2FF 0%, #89CFF0 50%, #00BFFF 100%)',
        glow: '0 0 35px rgba(185, 242, 255, 0.8)',
        privileges: ['VIP Tournaments', 'Personal Coach', 'Elite Club Access'],
        nextTier: 'LEGEND'
    },
    LEGEND: {
        id: 'LEGEND',
        name: 'Legend',
        minXP: 150000,
        maxXP: Infinity,
        icon: '👑',
        color: '#9400D3',
        gradient: 'linear-gradient(135deg, #9400D3 0%, #FF1493 50%, #FFD700 100%)',
        glow: '0 0 40px rgba(148, 0, 211, 0.9)',
        privileges: ['All Access', 'Creator Status', 'Lifetime Benefits', 'Hall of Fame'],
        nextTier: null
    }
};

const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGEND'];

// ═══════════════════════════════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get tier from XP amount
 */
function getTierFromXP(xp) {
    for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
        const tier = SOCIAL_TIERS[TIER_ORDER[i]];
        if (xp >= tier.minXP) {
            return tier;
        }
    }
    return SOCIAL_TIERS.BRONZE;
}

/**
 * Calculate progress to next tier
 */
function calculateProgress(xp, currentTier) {
    if (!currentTier.nextTier) {
        // Max tier - show 100%
        return { percentage: 100, xpToNext: 0, xpInTier: xp - currentTier.minXP };
    }

    const nextTier = SOCIAL_TIERS[currentTier.nextTier];
    const tierRange = nextTier.minXP - currentTier.minXP;
    const xpInTier = xp - currentTier.minXP;
    const percentage = Math.min(100, (xpInTier / tierRange) * 100);
    const xpToNext = nextTier.minXP - xp;

    return {
        percentage: Math.round(percentage * 10) / 10,
        xpToNext: Math.max(0, xpToNext),
        xpInTier
    };
}

/**
 * Format XP for display
 */
function formatXP(xp) {
    if (xp >= 1000000) {
        return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
        return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
}

// ═══════════════════════════════════════════════════════════════════════════
// 🪝 USE SOCIAL REPUTATION HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * React hook for fetching and displaying user's Social Tier
 * 
 * @param {string} userId - User ID to fetch reputation for
 * @param {object} options - Configuration options
 * @returns {object} Reputation data, loading state, and utility functions
 */
export function useSocialReputation(userId, options = {}) {
    const {
        refreshInterval = 60000,        // Refresh every minute
        enableRealtime = true,          // Subscribe to real-time updates
        supabaseClient = null,          // Supabase client for data fetching
        mockData = null                 // Mock data for testing
    } = options;

    // State
    const [xp, setXP] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // ═══════════════════════════════════════════════════════════════════
    // 📊 COMPUTED VALUES
    // ═══════════════════════════════════════════════════════════════════

    const tier = useMemo(() => getTierFromXP(xp), [xp]);
    const progress = useMemo(() => calculateProgress(xp, tier), [xp, tier]);
    const tierIndex = useMemo(() => TIER_ORDER.indexOf(tier.id), [tier]);

    const reputation = useMemo(() => ({
        userId,
        xp,
        xpFormatted: formatXP(xp),
        tier: {
            ...tier,
            index: tierIndex,
            totalTiers: TIER_ORDER.length
        },
        progress: {
            ...progress,
            xpToNextFormatted: formatXP(progress.xpToNext)
        },
        nextTier: tier.nextTier ? SOCIAL_TIERS[tier.nextTier] : null,
        isMaxTier: !tier.nextTier,
        lastUpdated
    }), [userId, xp, tier, tierIndex, progress, lastUpdated]);

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 DATA FETCHING
    // ═══════════════════════════════════════════════════════════════════

    const fetchReputation = useCallback(async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);

            // Use mock data if provided
            if (mockData) {
                setXP(mockData.xp || 0);
                setLastUpdated(new Date());
                setLoading(false);
                return;
            }

            // Fetch from Supabase
            if (supabaseClient) {
                const { data, error: fetchError } = await supabaseClient
                    .from('profiles')
                    .select('xp_total')
                    .eq('id', userId)
                    .single();

                if (fetchError) throw fetchError;

                setXP(data?.xp_total || 0);
                setLastUpdated(new Date());
            } else {
                // Fallback: Use local storage or default
                const stored = localStorage.getItem(`user_xp_${userId}`);
                setXP(stored ? parseInt(stored) : 0);
                setLastUpdated(new Date());
            }

        } catch (err) {
            setError(err.message || 'Failed to fetch reputation');
            console.error('useSocialReputation error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, supabaseClient, mockData]);

    // ═══════════════════════════════════════════════════════════════════
    // 🔄 EFFECTS
    // ═══════════════════════════════════════════════════════════════════

    // Initial fetch
    useEffect(() => {
        fetchReputation();
    }, [fetchReputation]);

    // Polling refresh
    useEffect(() => {
        if (refreshInterval <= 0) return;

        const interval = setInterval(fetchReputation, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchReputation, refreshInterval]);

    // Real-time subscription
    useEffect(() => {
        if (!enableRealtime || !supabaseClient || !userId) return;

        const subscription = supabaseClient
            .channel(`profile-xp-${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload) => {
                if (payload.new?.xp_total !== undefined) {
                    // ═══════════════════════════════════════════════════════
                    // 🔐 HARD LAW: XP can NEVER decrease
                    // ═══════════════════════════════════════════════════════
                    setXP(prev => Math.max(prev, payload.new.xp_total));
                    setLastUpdated(new Date());
                }
            })
            .subscribe();

        return () => {
            supabaseClient.removeChannel(subscription);
        };
    }, [enableRealtime, supabaseClient, userId]);

    // ═══════════════════════════════════════════════════════════════════
    // 🛠️ UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Simulate XP gain (for testing/demo)
     */
    const simulateXPGain = useCallback((amount) => {
        setXP(prev => prev + Math.max(0, amount));
        setLastUpdated(new Date());
    }, []);

    /**
     * Get tier badge component data
     */
    const getBadgeProps = useCallback(() => ({
        tier: tier.id,
        name: tier.name,
        icon: tier.icon,
        color: tier.color,
        gradient: tier.gradient,
        glow: tier.glow,
        style: {
            background: tier.gradient,
            boxShadow: tier.glow,
            color: tier.id === 'GOLD' ? '#000' : '#fff'
        }
    }), [tier]);

    /**
     * Get progress bar props
     */
    const getProgressBarProps = useCallback(() => ({
        value: progress.percentage,
        max: 100,
        color: tier.color,
        label: `${progress.percentage}%`,
        style: {
            background: `linear-gradient(90deg, ${tier.color} ${progress.percentage}%, rgba(255,255,255,0.1) ${progress.percentage}%)`
        }
    }), [progress, tier]);

    /**
     * Check if user has reached a specific tier
     */
    const hasTier = useCallback((tierId) => {
        const targetIndex = TIER_ORDER.indexOf(tierId);
        return tierIndex >= targetIndex;
    }, [tierIndex]);

    /**
     * Get XP needed for a specific tier
     */
    const getXPForTier = useCallback((tierId) => {
        const targetTier = SOCIAL_TIERS[tierId];
        if (!targetTier) return null;

        const xpNeeded = targetTier.minXP - xp;
        return {
            tier: targetTier,
            xpNeeded: Math.max(0, xpNeeded),
            achieved: xp >= targetTier.minXP
        };
    }, [xp]);

    // ═══════════════════════════════════════════════════════════════════
    // 📦 RETURN VALUE
    // ═══════════════════════════════════════════════════════════════════

    return {
        // Core data
        reputation,
        xp,
        tier,
        progress,

        // State
        loading,
        error,
        lastUpdated,

        // Methods
        refresh: fetchReputation,
        simulateXPGain,
        getBadgeProps,
        getProgressBarProps,
        hasTier,
        getXPForTier,

        // Constants
        SOCIAL_TIERS,
        TIER_ORDER
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 TIER BADGE COMPONENT HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get CSS styles for tier badge
 */
export function getTierBadgeStyles(tierId) {
    const tier = SOCIAL_TIERS[tierId];
    if (!tier) return {};

    return {
        container: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: tier.gradient,
            boxShadow: tier.glow,
            color: tier.id === 'GOLD' ? '#000' : '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        },
        icon: {
            fontSize: '20px'
        },
        name: {
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }
    };
}

/**
 * Get CSS styles for progress bar
 */
export function getProgressBarStyles(percentage, tierColor) {
    return {
        container: {
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden'
        },
        fill: {
            width: `${percentage}%`,
            height: '100%',
            background: tierColor,
            borderRadius: '4px',
            transition: 'width 0.5s ease-out',
            boxShadow: `0 0 10px ${tierColor}`
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
    SOCIAL_TIERS,
    TIER_ORDER,
    getTierFromXP,
    calculateProgress,
    formatXP
};

export default useSocialReputation;
