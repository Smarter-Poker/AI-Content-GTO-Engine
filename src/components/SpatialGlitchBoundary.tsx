/**
 * 🛡️ SPATIAL GLITCH ERROR BOUNDARY — FAULT TOLERANCE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * Error boundary with "Re-aligning Neural Link" animation.
 * Handles Supabase connection loss and runtime errors.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface SpatialGlitchBoundaryProps {
    children: ReactNode;
    fallbackRoute?: string;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface SpatialGlitchBoundaryState {
    hasError: boolean;
    error: Error | null;
    isRecovering: boolean;
    recoveryAttempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛡️ SPATIAL GLITCH ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════

export class SpatialGlitchBoundary extends Component<
    SpatialGlitchBoundaryProps,
    SpatialGlitchBoundaryState
> {
    private recoveryTimer: NodeJS.Timeout | null = null;

    constructor(props: SpatialGlitchBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            isRecovering: false,
            recoveryAttempts: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<SpatialGlitchBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🔴 Spatial Glitch Detected:', error);
        console.error('📊 Component Stack:', errorInfo.componentStack);

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    componentWillUnmount() {
        if (this.recoveryTimer) {
            clearTimeout(this.recoveryTimer);
        }
    }

    handleRetry = () => {
        this.setState({ isRecovering: true });

        this.recoveryTimer = setTimeout(() => {
            this.setState(prev => ({
                hasError: false,
                error: null,
                isRecovering: false,
                recoveryAttempts: prev.recoveryAttempts + 1
            }));
        }, 2000);
    };

    handleNavigateHome = () => {
        window.location.href = this.props.fallbackRoute || '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <SpatialGlitchFallback
                    error={this.state.error}
                    isRecovering={this.state.isRecovering}
                    recoveryAttempts={this.state.recoveryAttempts}
                    onRetry={this.handleRetry}
                    onNavigateHome={this.handleNavigateHome}
                />
            );
        }

        return this.props.children;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 SPATIAL GLITCH FALLBACK UI
// ═══════════════════════════════════════════════════════════════════════════════

interface SpatialGlitchFallbackProps {
    error: Error | null;
    isRecovering: boolean;
    recoveryAttempts: number;
    onRetry: () => void;
    onNavigateHome: () => void;
}

const SpatialGlitchFallback: React.FC<SpatialGlitchFallbackProps> = ({
    error,
    isRecovering,
    recoveryAttempts,
    onRetry,
    onNavigateHome
}) => {
    return (
        <div className="spatial-glitch-container">
            {/* Background glitch effects */}
            <div className="glitch-bg">
                <div className="glitch-line glitch-line-1" />
                <div className="glitch-line glitch-line-2" />
                <div className="glitch-line glitch-line-3" />
                <div className="glitch-scanlines" />
            </div>

            <motion.div
                className="glitch-content"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
                {/* Neural Link Animation */}
                <div className="neural-link">
                    <motion.div
                        className="neural-core"
                        animate={isRecovering ? {
                            rotate: 360,
                            scale: [1, 1.2, 1]
                        } : {
                            rotate: 0
                        }}
                        transition={isRecovering ? {
                            rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
                            scale: { duration: 0.5, repeat: Infinity }
                        } : {}}
                    >
                        <span className="neural-icon">🧠</span>
                    </motion.div>

                    {/* Orbiting particles */}
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="neural-orbit"
                            style={{
                                '--orbit-delay': `${i * 0.3}s`,
                                '--orbit-size': `${80 + i * 30}px`
                            } as React.CSSProperties}
                            animate={isRecovering ? {
                                rotate: 360
                            } : {}}
                            transition={{
                                duration: 2 + i * 0.5,
                                repeat: Infinity,
                                ease: 'linear'
                            }}
                        >
                            <div className="neural-particle" />
                        </motion.div>
                    ))}
                </div>

                {/* Status Text */}
                <div className="glitch-text">
                    <motion.h1
                        className="glitch-title"
                        animate={{
                            x: isRecovering ? [0, -2, 2, 0] : 0
                        }}
                        transition={{
                            duration: 0.1,
                            repeat: isRecovering ? Infinity : 0
                        }}
                    >
                        {isRecovering ? 'RE-ALIGNING NEURAL LINK' : 'SIGNAL DISRUPTION'}
                    </motion.h1>

                    <p className="glitch-subtitle">
                        {isRecovering
                            ? 'Establishing secure connection to the Spatial Grid...'
                            : 'The connection to the universe has been temporarily lost.'}
                    </p>

                    {error && !isRecovering && (
                        <div className="glitch-error glass-subtle">
                            <span className="error-label">⚠️ Error Signal:</span>
                            <code className="error-message">{error.message}</code>
                        </div>
                    )}

                    {recoveryAttempts > 0 && (
                        <p className="glitch-attempts">
                            Recovery attempts: {recoveryAttempts}
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="glitch-actions">
                    <AnimatePresence mode="wait">
                        {!isRecovering && (
                            <motion.div
                                className="action-buttons"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <motion.button
                                    className="glitch-btn glitch-btn-primary glass neon-border-poker"
                                    onClick={onRetry}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    🔄 Reconnect
                                </motion.button>

                                <motion.button
                                    className="glitch-btn glitch-btn-secondary glass"
                                    onClick={onNavigateHome}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    🏠 Return Home
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isRecovering && (
                        <div className="recovery-progress">
                            <div className="progress-bar">
                                <motion.div
                                    className="progress-fill"
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 2, ease: 'easeInOut' }}
                                />
                            </div>
                            <span className="progress-text">Synchronizing...</span>
                        </div>
                    )}
                </div>
            </motion.div>

            <style>{glitchStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 GLITCH STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const glitchStyles = `
.spatial-glitch-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-void);
    position: relative;
    overflow: hidden;
}

.glitch-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.glitch-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-xp-primary);
    opacity: 0.3;
    animation: glitch-slide 3s ease-in-out infinite;
}

.glitch-line-1 { top: 20%; animation-delay: 0s; }
.glitch-line-2 { top: 50%; animation-delay: 1s; }
.glitch-line-3 { top: 80%; animation-delay: 2s; }

@keyframes glitch-slide {
    0%, 100% { transform: translateX(-100%); opacity: 0; }
    50% { transform: translateX(100%); opacity: 0.5; }
}

.glitch-scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.1) 2px,
        rgba(0, 0, 0, 0.1) 4px
    );
    opacity: 0.3;
    animation: scanlines-move 10s linear infinite;
}

@keyframes scanlines-move {
    0% { transform: translateY(0); }
    100% { transform: translateY(4px); }
}

.glitch-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 32px;
    padding: 24px;
    z-index: 1;
}

.neural-link {
    position: relative;
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.neural-core {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(26, 26, 36, 0.9);
    border: 2px solid var(--color-poker-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 30px var(--color-poker-glow);
    z-index: 1;
}

.neural-icon {
    font-size: 2.5rem;
}

.neural-orbit {
    position: absolute;
    width: var(--orbit-size);
    height: var(--orbit-size);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    animation-delay: var(--orbit-delay);
}

.neural-particle {
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: var(--color-diamond);
    border-radius: 50%;
    box-shadow: 0 0 10px var(--color-diamond-glow);
}

.glitch-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.glitch-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #F8FAFC;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.glitch-subtitle {
    color: rgba(248, 250, 252, 0.6);
    max-width: 400px;
}

.glitch-error {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 24px;
    border-radius: 12px;
    margin-top: 16px;
    max-width: 500px;
}

.error-label {
    font-size: 0.75rem;
    color: var(--color-xp-primary);
    text-transform: uppercase;
}

.error-message {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: rgba(248, 250, 252, 0.8);
    word-break: break-word;
}

.glitch-attempts {
    font-size: 0.875rem;
    color: rgba(248, 250, 252, 0.4);
}

.glitch-actions {
    min-height: 60px;
}

.action-buttons {
    display: flex;
    gap: 16px;
}

.glitch-btn {
    padding: 14px 28px;
    border-radius: 12px;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.glitch-btn-primary {
    background: transparent;
    color: var(--color-poker-primary);
}

.glitch-btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(248, 250, 252, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.recovery-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 300px;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-poker-primary), var(--color-diamond));
    border-radius: 2px;
}

.progress-text {
    font-size: 0.875rem;
    color: rgba(248, 250, 252, 0.6);
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 CONNECTION STATUS HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useConnectionStatus = () => {
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);
    const [lastSync, setLastSync] = React.useState<Date | null>(null);

    React.useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setLastSync(new Date());
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline, lastSync };
};

export default SpatialGlitchBoundary;
