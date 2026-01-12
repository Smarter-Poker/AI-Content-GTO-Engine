/**
 * 📦 COMPONENT INDEX — CENTRALIZED EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Export all UI components from a single entry point.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Navigation Components
export { default as NavigationHUD } from './NavigationHUD';
export { OrbHub, default as OrbHubDefault } from './OrbHub';

// HUD Components
export { PlayerHUD, default as PlayerHUDDefault } from './PlayerHUD';

// Error Handling
export {
    SpatialGlitchBoundary,
    useConnectionStatus,
    default as SpatialGlitchBoundaryDefault
} from './SpatialGlitchBoundary';
