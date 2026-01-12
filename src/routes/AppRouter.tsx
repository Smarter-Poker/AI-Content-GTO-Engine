/**
 * 🛣️ APP ROUTER — DETERMNISTIC ROUTING & GATEKEEPER
 * ═══════════════════════════════════════════════════════════════════════════
 * Authenticated routing skeleton with animated fallbacks.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { Suspense, lazy, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useArena, ArenaStatus } from '../providers/ArenaAuthProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 AUTH GUARD — HOC for Protected Routes
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthGuardProps {
    children: ReactNode;
    requiredStatus?: ArenaStatus[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredStatus = ['active'] }) => {
    const { status } = useArena();
    const location = useLocation();

    if (status === 'loading') {
        return <ArenaSpinner message="Authenticating..." />;
    }

    if (!requiredStatus.includes(status)) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⏳ ARENA SPINNER — Geometric Fractal Animation
// ═══════════════════════════════════════════════════════════════════════════════

interface ArenaSpinnerProps {
    message?: string;
}

export const ArenaSpinner: React.FC<ArenaSpinnerProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="arena-spinner">
            <div className="spinner-container">
                <motion.div className="spinner-ring spinner-ring-1"
                    animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                <motion.div className="spinner-ring spinner-ring-2"
                    animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                <motion.div className="spinner-ring spinner-ring-3"
                    animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                <div className="spinner-core">
                    <span className="spinner-icon">🃏</span>
                </div>
            </div>
            <motion.p className="spinner-message"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {message}
            </motion.p>
            <style>{spinnerStyles}</style>
        </div>
    );
};

const spinnerStyles = `
.arena-spinner { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--color-void); gap: 32px; }
.spinner-container { position: relative; width: 120px; height: 120px; }
.spinner-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid transparent; }
.spinner-ring-1 { border-top-color: var(--color-poker-primary); border-right-color: var(--color-poker-primary); }
.spinner-ring-2 { inset: 10px; border-top-color: var(--color-diamond); border-left-color: var(--color-diamond); }
.spinner-ring-3 { inset: 20px; border-bottom-color: var(--color-xp-primary); border-right-color: var(--color-xp-primary); }
.spinner-core { position: absolute; inset: 35px; display: flex; align-items: center; justify-content: center; background: var(--color-deep); border-radius: 50%; }
.spinner-icon { font-size: 2rem; }
.spinner-message { color: rgba(248,250,252,0.6); font-size: 0.9375rem; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🚨 SYSTEM GLITCH — Error/Forbidden States
// ═══════════════════════════════════════════════════════════════════════════════

interface SystemGlitchProps {
    type: 'forbidden' | 'error' | 'notfound';
}

export const SystemGlitch: React.FC<SystemGlitchProps> = ({ type }) => {
    const config = {
        forbidden: { code: '403', title: 'ACCESS DENIED', icon: '🔒', subtitle: 'You do not have permission to access this area.' },
        error: { code: '500', title: 'SIGNAL LOST', icon: '📡', subtitle: 'Something went wrong. Please try again.' },
        notfound: { code: '404', title: 'VOID DETECTED', icon: '🕳️', subtitle: 'This page does not exist in our universe.' }
    }[type];

    return (
        <div className="system-glitch">
            <motion.div className="glitch-container"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}>
                <div className="glitch-icon">{config.icon}</div>
                <motion.div className="glitch-code"
                    animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                    {config.code}
                </motion.div>
                <h1 className="glitch-title">{config.title}</h1>
                <p className="glitch-subtitle">{config.subtitle}</p>
                <motion.button className="glitch-button glass neon-border-poker"
                    onClick={() => window.location.href = '/'}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    Return to Safety
                </motion.button>
            </motion.div>
            <div className="glitch-scanlines" />
            <style>{glitchStyles}</style>
        </div>
    );
};

const glitchStyles = `
.system-glitch { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--color-void); position: relative; overflow: hidden; }
.glitch-container { text-align: center; z-index: 1; }
.glitch-icon { font-size: 4rem; margin-bottom: 16px; }
.glitch-code { font-size: 6rem; font-weight: 900; font-family: var(--font-mono); color: var(--color-xp-primary); text-shadow: 0 0 40px var(--color-xp-glow); }
.glitch-title { font-size: 1.5rem; font-weight: 700; margin: 16px 0 8px; color: #F8FAFC; }
.glitch-subtitle { color: rgba(248,250,252,0.6); margin-bottom: 32px; }
.glitch-button { padding: 14px 32px; border: none; background: transparent; color: var(--color-poker-primary); font-weight: 600; cursor: pointer; border-radius: 12px; }
.glitch-scanlines { position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px); pointer-events: none; opacity: 0.3; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🚪 PORTAL ENTRY — Login Component
// ═══════════════════════════════════════════════════════════════════════════════

export const PortalEntry: React.FC = () => {
    const { signIn, signUp, status } = useArena();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isSignUp, setIsSignUp] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
        if (result.error) setError(result.error.message);
        else window.location.href = '/app';
    };

    if (status === 'active') return <Navigate to="/app" replace />;

    return (
        <div className="portal-entry">
            <motion.div className="portal-card glass-heavy rounded-xl"
                initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
                <div className="portal-header">
                    <span className="portal-logo">🃏</span>
                    <h1 className="portal-title text-gradient">PokerIQ</h1>
                    <p className="portal-subtitle">{isSignUp ? 'Create your account' : 'Welcome back, champion'}</p>
                </div>
                <form className="portal-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                            className="form-input glass" required />
                    </div>
                    <div className="form-group">
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                            className="form-input glass" required />
                    </div>
                    {error && <div className="form-error">{error}</div>}
                    <motion.button type="submit" className="form-submit neon-border-poker"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={status === 'loading'}>
                        {status === 'loading' ? 'Processing...' : isSignUp ? 'Create Account' : 'Enter the Arena'}
                    </motion.button>
                </form>
                <div className="portal-footer">
                    <button type="button" className="portal-toggle" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </motion.div>
            <style>{portalStyles}</style>
        </div>
    );
};

const portalStyles = `
.portal-entry { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--color-void); padding: 24px; }
.portal-card { width: 100%; max-width: 420px; padding: 48px 40px; }
.portal-header { text-align: center; margin-bottom: 40px; }
.portal-logo { font-size: 4rem; display: block; margin-bottom: 16px; }
.portal-title { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
.portal-subtitle { color: rgba(248,250,252,0.6); }
.portal-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { position: relative; }
.form-input { width: 100%; padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #F8FAFC; font-size: 1rem; outline: none; transition: all 0.2s; }
.form-input:focus { border-color: var(--color-poker-primary); box-shadow: 0 0 20px var(--color-poker-soft); }
.form-input::placeholder { color: rgba(248,250,252,0.4); }
.form-error { color: var(--color-xp-primary); font-size: 0.875rem; text-align: center; }
.form-submit { width: 100%; padding: 16px; border-radius: 12px; border: none; background: linear-gradient(135deg, var(--color-poker-primary), var(--color-diamond)); color: var(--color-void); font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 8px; }
.form-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.portal-footer { text-align: center; margin-top: 24px; }
.portal-toggle { background: none; border: none; color: var(--color-diamond); cursor: pointer; font-size: 0.875rem; }
.portal-toggle:hover { text-decoration: underline; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 PROJECT ROOT — Dashboard Placeholder
// ═══════════════════════════════════════════════════════════════════════════════

export const ProjectRoot: React.FC = () => {
    const { user } = useArena();
    return (
        <div className="project-root">
            <motion.div className="welcome-card glass rounded-xl"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="welcome-title text-gradient">Welcome to the Arena</h1>
                <p className="welcome-email">{user?.email || 'Champion'}</p>
                <div className="welcome-stats">
                    <div className="stat-card glass-subtle rounded-lg">
                        <span className="stat-icon">🎮</span><span className="stat-label">Training</span>
                        <span className="stat-value">Ready</span>
                    </div>
                    <div className="stat-card glass-subtle rounded-lg">
                        <span className="stat-icon">💎</span><span className="stat-label">Diamonds</span>
                        <span className="stat-value">0</span>
                    </div>
                    <div className="stat-card glass-subtle rounded-lg">
                        <span className="stat-icon">⭐</span><span className="stat-label">XP</span>
                        <span className="stat-value">0</span>
                    </div>
                </div>
            </motion.div>
            <style>{projectStyles}</style>
        </div>
    );
};

const projectStyles = `
.project-root { padding: 32px; max-width: 1200px; margin: 0 auto; }
.welcome-card { padding: 48px; text-align: center; }
.welcome-title { font-size: 2.5rem; font-weight: 700; margin-bottom: 8px; }
.welcome-email { color: rgba(248,250,252,0.6); margin-bottom: 40px; }
.welcome-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
.stat-card { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.stat-icon { font-size: 2rem; }
.stat-label { font-size: 0.875rem; color: rgba(248,250,252,0.6); }
.stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-poker-primary); }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🛣️ APP ROUTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ArenaShell = lazy(() => import('../layouts/ArenaShell'));
const AnalyticsPage = lazy(() => import('../pages/Analytics/AnalyticsPage'));
const ClubsPage = lazy(() => import('../pages/Clubs/ClubsPage'));
const BrainPage = lazy(() => import('../pages/Brain/BrainPage'));
const ArcadePage = lazy(() => import('../pages/Arcade/ArcadePage'));

// 🏁 NEW TRAINING COMPONENTS
import { TrainingHub } from '../components/hub/TrainingHub';
import { TrainingArena } from '../components/arena/TrainingArena';

export const AppRouter: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<PortalEntry />} />
            <Route path="/loading" element={<ArenaSpinner message="Initializing Arena..." />} />
            <Route path="/forbidden" element={<SystemGlitch type="forbidden" />} />
            <Route path="/error" element={<SystemGlitch type="error" />} />

            {/* Main App Routes - Protected by AuthGuard */}
            <Route path="/app" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading Arena..." />}>
                        <ArenaShell><ProjectRoot /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* 🎮 TRAINING HUB (Netflix Style) */}
            <Route path="/app/training" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading Training Hub..." />}>
                        <ArenaShell><TrainingHub /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* 🏟️ TRAINING ARENA (Playable Game) */}
            <Route path="/app/arena/:gameId" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Entering Initializing Arena..." />}>
                        {/* We don't wrap in ArenaShell to keep it full screen / immersive */}
                        <TrainingArena />
                    </Suspense>
                </AuthGuard>
            } />

            {/* Analytics Section */}
            <Route path="/app/analytics" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading Analytics..." />}>
                        <ArenaShell><AnalyticsPage /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* Clubs Section */}
            <Route path="/app/clubs" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading Clubs..." />}>
                        <ArenaShell><ClubsPage /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* Brain Section */}
            <Route path="/app/brain" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading Brain..." />}>
                        <ArenaShell><BrainPage /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* Arcade Section */}
            <Route path="/app/arcade" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading Arcade..." />}>
                        <ArenaShell><ArcadePage /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* Fallback for unknown /app/* routes */}
            <Route path="/app/*" element={
                <AuthGuard>
                    <Suspense fallback={<ArenaSpinner message="Loading..." />}>
                        <ArenaShell><ProjectRoot /></ArenaShell>
                    </Suspense>
                </AuthGuard>
            } />

            {/* 404 Catch-all */}
            <Route path="*" element={<SystemGlitch type="notfound" />} />
        </Routes>
    );
};

const RootRedirect: React.FC = () => {
    const { status } = useArena();
    if (status === 'loading') return <ArenaSpinner message="Checking authentication..." />;
    return <Navigate to={status === 'active' ? '/app' : '/login'} replace />;
};

export default AppRouter;
