/**
 * 🚀 APP.TSX — ROOT APPLICATION ENTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * Initializes the application with all providers and the shell hierarchy.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ArenaAuthProvider, SpatialCanvas } from './providers/ArenaAuthProvider';
import { PlayerStateProvider } from './providers/PlayerStateProvider';
import { SpatialGlitchBoundary } from './components/SpatialGlitchBoundary';
import { AppRouter } from './routes/AppRouter';
import './styles/spatial.css';

/**
 * 🏛️ ROOT APPLICATION COMPONENT
 * Provider Hierarchy:
 * 1. BrowserRouter — Client-side routing
 * 2. SpatialGlitchBoundary — Error recovery with neural link animation
 * 3. ArenaAuthProvider — Authentication state
 * 4. PlayerStateProvider — XP, Diamonds, Streak (Supabase real-time)
 * 5. SpatialCanvas — 3D perspective injection
 */
const App: React.FC = () => {
    return (
        <BrowserRouter>
            <SpatialGlitchBoundary
                fallbackRoute="/"
                onError={(error, errorInfo) => {
                    console.error('🔴 App Error:', error);
                    console.error('📊 Stack:', errorInfo.componentStack);
                }}
            >
                <ArenaAuthProvider>
                    <PlayerStateProvider>
                        <SpatialCanvas perspectiveIntensity={0.015} depthLayers={5}>
                            <AppRouter />
                        </SpatialCanvas>
                    </PlayerStateProvider>
                </ArenaAuthProvider>
            </SpatialGlitchBoundary>
        </BrowserRouter>
    );
};

export default App;
