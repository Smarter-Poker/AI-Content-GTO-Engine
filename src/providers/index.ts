/**
 * 📦 PROVIDER INDEX — CENTRALIZED EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Export all providers from a single entry point.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Authentication & Spatial
export {
    ArenaAuthProvider,
    SpatialCanvas,
    useArena,
    useSpatial,
    useAntiGravity,
    type ArenaState,
    type ArenaContextValue,
    type SpatialState,
    type SpatialContextValue
} from './ArenaAuthProvider';

// Player State (XP, Diamonds, Streak)
export {
    PlayerStateProvider,
    usePlayerState,
    type PlayerState,
    type PlayerActions,
    type PlayerContextValue
} from './PlayerStateProvider';
