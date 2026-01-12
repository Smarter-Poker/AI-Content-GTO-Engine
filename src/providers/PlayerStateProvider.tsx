/**
 * 🎮 PLAYER STATE PROVIDER — GLOBAL STATE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════
 * Zustand-like state management with Supabase real-time sync.
 * Persists XP, Diamonds, Streak, and Level across sessions.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useArena } from './ArenaAuthProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlayerState {
    xp: number;
    diamonds: number;
    streak: number;
    multiplier: number;
    level: number;
    lastActiveAt: string | null;
    isLoading: boolean;
    isConnected: boolean;
    error: string | null;
}

export interface PlayerActions {
    addXP: (amount: number) => void;
    addDiamonds: (amount: number) => void;
    spendDiamonds: (amount: number) => boolean;
    incrementStreak: () => void;
    resetStreak: () => void;
    refreshState: () => Promise<void>;
    clearError: () => void;
}

export type PlayerContextValue = PlayerState & PlayerActions;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 CONTEXT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

const PlayerStateContext = createContext<PlayerContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// 🪝 CUSTOM HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function usePlayerState(): PlayerContextValue {
    const context = useContext(PlayerStateContext);
    if (!context) {
        throw new Error('usePlayerState must be used within a PlayerStateProvider');
    }
    return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 STREAK MULTIPLIER CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

const calculateMultiplier = (streak: number): number => {
    if (streak >= 7) return 2.0;  // Legendary streak
    if (streak >= 5) return 1.75; // Blazing streak
    if (streak >= 3) return 1.5;  // Fire streak
    if (streak >= 1) return 1.25; // Active streak
    return 1.0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 PLAYER STATE PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface PlayerStateProviderProps {
    children: ReactNode;
}

export const PlayerStateProvider: React.FC<PlayerStateProviderProps> = ({ children }) => {
    const { user, supabase } = useArena();
    const subscriptionRef = useRef<any>(null);

    const [state, setState] = useState<PlayerState>({
        xp: 0,
        diamonds: 0,
        streak: 0,
        multiplier: 1.0,
        level: 1,
        lastActiveAt: null,
        isLoading: true,
        isConnected: false,
        error: null
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 📡 FETCH INITIAL STATE
    // ═══════════════════════════════════════════════════════════════════════

    const fetchPlayerState = useCallback(async () => {
        if (!supabase || !user?.id) {
            setState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('xp, diamonds, streak, level, last_active_at')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                const streak = data.streak || 0;
                setState({
                    xp: data.xp || 0,
                    diamonds: data.diamonds || 0,
                    streak,
                    multiplier: calculateMultiplier(streak),
                    level: data.level || 1,
                    lastActiveAt: data.last_active_at,
                    isLoading: false,
                    isConnected: true,
                    error: null
                });
            } else {
                // Create initial record
                await supabase.from('user_progress').upsert({
                    user_id: user.id,
                    xp: 0,
                    diamonds: 100, // Welcome bonus
                    streak: 0,
                    level: 1,
                    last_active_at: new Date().toISOString()
                });

                setState({
                    xp: 0,
                    diamonds: 100,
                    streak: 0,
                    multiplier: 1.0,
                    level: 1,
                    lastActiveAt: new Date().toISOString(),
                    isLoading: false,
                    isConnected: true,
                    error: null
                });
            }
        } catch (err: any) {
            console.error('❌ Failed to fetch player state:', err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                isConnected: false,
                error: err.message || 'Failed to load player data'
            }));
        }
    }, [supabase, user?.id]);

    // ═══════════════════════════════════════════════════════════════════════
    // 📡 REAL-TIME SUBSCRIPTION
    // ═══════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!supabase || !user?.id) return;

        fetchPlayerState();

        // Subscribe to real-time updates
        subscriptionRef.current = supabase
            .channel(`user_progress:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_progress',
                    filter: `user_id=eq.${user.id}`
                },
                (payload: any) => {
                    console.log('📡 Real-time update:', payload);

                    if (payload.new) {
                        const data = payload.new;
                        const streak = data.streak || 0;

                        setState(prev => ({
                            ...prev,
                            xp: data.xp ?? prev.xp,
                            diamonds: data.diamonds ?? prev.diamonds,
                            streak,
                            multiplier: calculateMultiplier(streak),
                            level: data.level ?? prev.level,
                            lastActiveAt: data.last_active_at ?? prev.lastActiveAt,
                            isConnected: true,
                            error: null
                        }));
                    }
                }
            )
            .subscribe((status: string) => {
                console.log(`📡 Subscription status: ${status}`);
                setState(prev => ({
                    ...prev,
                    isConnected: status === 'SUBSCRIBED'
                }));
            });

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [supabase, user?.id, fetchPlayerState]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🎮 STATE ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    const addXP = useCallback(async (amount: number) => {
        if (!supabase || !user?.id || amount <= 0) return;

        const newXP = state.xp + Math.floor(amount * state.multiplier);
        const newLevel = Math.floor(newXP / 1000) + 1;

        // Optimistic update
        setState(prev => ({ ...prev, xp: newXP, level: newLevel }));

        try {
            await supabase
                .from('user_progress')
                .update({ xp: newXP, level: newLevel, last_active_at: new Date().toISOString() })
                .eq('user_id', user.id);
        } catch (err) {
            console.error('❌ Failed to update XP:', err);
            // Revert on error
            setState(prev => ({ ...prev, xp: state.xp, level: state.level }));
        }
    }, [supabase, user?.id, state.xp, state.level, state.multiplier]);

    const addDiamonds = useCallback(async (amount: number) => {
        if (!supabase || !user?.id || amount <= 0) return;

        const newDiamonds = state.diamonds + amount;

        setState(prev => ({ ...prev, diamonds: newDiamonds }));

        try {
            await supabase
                .from('user_progress')
                .update({ diamonds: newDiamonds, last_active_at: new Date().toISOString() })
                .eq('user_id', user.id);
        } catch (err) {
            console.error('❌ Failed to update diamonds:', err);
            setState(prev => ({ ...prev, diamonds: state.diamonds }));
        }
    }, [supabase, user?.id, state.diamonds]);

    const spendDiamonds = useCallback((amount: number): boolean => {
        if (amount <= 0 || state.diamonds < amount) return false;

        const newDiamonds = state.diamonds - amount;
        setState(prev => ({ ...prev, diamonds: newDiamonds }));

        if (supabase && user?.id) {
            supabase
                .from('user_progress')
                .update({ diamonds: newDiamonds, last_active_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .then(({ error }) => {
                    if (error) {
                        console.error('❌ Failed to spend diamonds:', error);
                        setState(prev => ({ ...prev, diamonds: state.diamonds }));
                    }
                });
        }

        return true;
    }, [supabase, user?.id, state.diamonds]);

    const incrementStreak = useCallback(async () => {
        if (!supabase || !user?.id) return;

        const newStreak = state.streak + 1;
        const newMultiplier = calculateMultiplier(newStreak);

        setState(prev => ({ ...prev, streak: newStreak, multiplier: newMultiplier }));

        try {
            await supabase
                .from('user_progress')
                .update({ streak: newStreak, last_active_at: new Date().toISOString() })
                .eq('user_id', user.id);
        } catch (err) {
            console.error('❌ Failed to increment streak:', err);
        }
    }, [supabase, user?.id, state.streak]);

    const resetStreak = useCallback(async () => {
        if (!supabase || !user?.id) return;

        setState(prev => ({ ...prev, streak: 0, multiplier: 1.0 }));

        try {
            await supabase
                .from('user_progress')
                .update({ streak: 0, last_active_at: new Date().toISOString() })
                .eq('user_id', user.id);
        } catch (err) {
            console.error('❌ Failed to reset streak:', err);
        }
    }, [supabase, user?.id]);

    const refreshState = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        await fetchPlayerState();
    }, [fetchPlayerState]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // 📦 CONTEXT VALUE
    // ═══════════════════════════════════════════════════════════════════════

    const value: PlayerContextValue = {
        ...state,
        addXP,
        addDiamonds,
        spendDiamonds,
        incrementStreak,
        resetStreak,
        refreshState,
        clearError
    };

    return (
        <PlayerStateContext.Provider value={value}>
            {children}
        </PlayerStateContext.Provider>
    );
};

export default PlayerStateProvider;
