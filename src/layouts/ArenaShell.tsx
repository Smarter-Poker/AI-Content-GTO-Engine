/**
 * 🏟️ ARENA SHELL — THE PERSISTENT VISUAL FRAME
 * ═══════════════════════════════════════════════════════════════════════════
 * Features: High-depth animated background, AnimatePresence transitions,
 * React Portal for modals/toasts, Red/Green engine color coordination.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NavigationHUD from '../components/NavigationHUD';
import PlayerHUD from '../components/PlayerHUD';
import OrbHub from '../components/OrbHub';

interface ArenaShellProps {
    children: ReactNode;
    variant?: 'default' | 'immersive' | 'minimal';
    showNavigation?: boolean;
    showParticles?: boolean;
}

interface Particle {
    id: number;
    x: number;
    delay: number;
    duration: number;
    size: number;
    color: 'poker' | 'xp' | 'diamond';
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

const contentVariants = {
    initial: { opacity: 0, x: 50, filter: 'blur(10px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, x: -50, filter: 'blur(10px)', transition: { duration: 0.3 } }
};

const toastVariants = {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }
};

const generateParticles = (count: number): Particle[] => {
    const colors: Array<'poker' | 'xp' | 'diamond'> = ['poker', 'xp', 'diamond'];
    return Array.from({ length: count }, (_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 20,
        duration: 15 + Math.random() * 10, size: 1 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]
    }));
};

const AnimatedBackground: React.FC<{ showParticles: boolean }> = ({ showParticles }) => {
    const [particles] = useState(() => generateParticles(30));
    const getColor = (c: Particle['color']) => c === 'poker' ? 'var(--color-poker-primary)' : c === 'xp' ? 'var(--color-xp-primary)' : 'var(--color-diamond)';

    return (
        <div className="arena-bg">
            <div className="gradient-layer gradient-animated" />
            <div className="accent-layer accent-poker" />
            <div className="accent-layer accent-xp" />
            {showParticles && (
                <div className="particle-layer">
                    {particles.map(p => (
                        <motion.div key={p.id} className="particle"
                            style={{ left: `${p.x}%`, width: p.size, height: p.size, background: getColor(p.color) }}
                            animate={{ y: [window.innerHeight + 50, -50], opacity: [0, 0.6, 0.6, 0] }}
                            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
                        />
                    ))}
                </div>
            )}
            <div className="vignette-overlay" />
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    const getStyles = (t: Toast['type']) => t === 'success' ? 'toast-success neon-border-poker' : t === 'error' ? 'toast-error neon-border-xp' : 'toast-info neon-border-diamond';
    const getIcon = (t: Toast['type']) => t === 'success' ? '✅' : t === 'error' ? '❌' : t === 'warning' ? '⚠️' : 'ℹ️';
    const portal = document.getElementById('toast-portal');
    if (!portal) return null;

    return createPortal(
        <div className="toast-container">
            <AnimatePresence mode="popLayout">
                {toasts.map(t => (
                    <motion.div key={t.id} className={`toast glass ${getStyles(t.type)}`}
                        variants={toastVariants} initial="initial" animate="animate" exit="exit" layout onClick={() => onDismiss(t.id)}>
                        <span className="toast-icon">{getIcon(t.type)}</span>
                        <span className="toast-message">{t.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>,
        portal
    );
};

export const ModalOverlay: React.FC<{ isOpen: boolean; onClose: () => void; children: ReactNode }> = ({ isOpen, onClose, children }) => {
    const portal = document.getElementById('modal-portal');
    if (!portal) return null;
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                    <motion.div className="modal-content glass-heavy rounded-xl"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
                        exit={{ opacity: 0, scale: 0.9 }} onClick={e => e.stopPropagation()}>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        portal
    );
};

export const ArenaShell: React.FC<ArenaShellProps> = ({ children, variant = 'default', showNavigation = true, showParticles = true }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [contentKey] = useState(0);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { ...toast, id }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), toast.duration ?? 5000);
        return id;
    }, []);

    useEffect(() => { (window as any).__arenaToast = addToast; return () => { delete (window as any).__arenaToast; }; }, [addToast]);

    return (
        <div className={`arena-shell ${variant !== 'default' ? `arena-shell--${variant}` : ''}`}>
            <AnimatedBackground showParticles={showParticles && variant !== 'minimal'} />
            <PlayerHUD />
            {showNavigation && <OrbHub />}
            <main className="arena-content">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={contentKey} className="arena-content-inner" variants={contentVariants} initial="initial" animate="animate" exit="exit">
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
            <div id="modal-portal" className="z-modal" />
            <div id="toast-portal" className="z-toast" />
            <ToastContainer toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />
            <style>{shellStyles}</style>
        </div>
    );
};

const shellStyles = `
.arena-shell { position: relative; min-height: 100vh; width: 100%; overflow-x: hidden; }
.arena-bg { position: fixed; inset: 0; z-index: var(--z-void); overflow: hidden; }
.gradient-layer { position: absolute; inset: 0; }
.accent-layer { position: absolute; inset: 0; pointer-events: none; }
.accent-poker { background: radial-gradient(ellipse 80% 50% at 20% 80%, var(--color-poker-surface) 0%, transparent 50%); opacity: 0.8; }
.accent-xp { background: radial-gradient(ellipse 60% 40% at 80% 20%, var(--color-xp-surface) 0%, transparent 50%); opacity: 0.6; }
.vignette-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 30%, var(--color-void) 100%); pointer-events: none; }
.arena-content { position: relative; z-index: var(--z-base); min-height: 100vh; padding-top: 80px; padding-bottom: 180px; }
.arena-content-inner { min-height: 100vh; }
.toast-container { position: fixed; bottom: 100px; right: 24px; display: flex; flex-direction: column; gap: 12px; z-index: var(--z-toast); pointer-events: none; }
.toast { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 12px; cursor: pointer; pointer-events: auto; max-width: 400px; }
.toast-icon { font-size: 1.25rem; }
.toast-message { font-size: 0.9375rem; font-weight: 500; color: #F8FAFC; }
.toast-success { background: rgba(0, 255, 136, 0.1); }
.toast-error { background: rgba(255, 68, 68, 0.1); }
.toast-info { background: rgba(0, 212, 255, 0.1); }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); padding: 24px; }
.modal-content { max-width: 90vw; max-height: 90vh; overflow: auto; }
.particle-layer .particle { position: absolute; border-radius: 50%; }
`;

export default ArenaShell;
