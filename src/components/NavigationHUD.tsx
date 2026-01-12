/**
 * 🧭 NAVIGATION HUD — FLOATING REACTIVE NAVIGATION BAR
 * ═══════════════════════════════════════════════════════════════════════════
 * Floating navigation with active-state glow effects.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useArena } from '../providers/ArenaAuthProvider';

interface NavigationHUDProps {
    position?: 'bottom' | 'sidebar';
}

interface NavItem {
    id: string;
    label: string;
    icon: string;
    path: string;
    isActive?: boolean;
}

const NavigationHUD: React.FC<NavigationHUDProps> = ({ position = 'bottom' }) => {
    const arena = useArena();

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '🎮', path: '/app', isActive: true },
        { id: 'training', label: 'Training', icon: '🎯', path: '/app/training', isActive: false },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/app/profile', isActive: false },
    ];

    const handleSignOut = async () => {
        await arena.signOut();
        window.location.href = '/login';
    };

    const handleNavClick = (path: string) => {
        window.location.href = path;
    };

    if (position === 'sidebar') {
        return (
            <motion.nav className="nav-hud nav-hud--sidebar glass-heavy"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
                <div className="nav-hud-header">
                    <span className="nav-logo">🃏</span>
                    <span className="nav-title text-gradient">PokerIQ</span>
                </div>
                <div className="nav-items">
                    {navItems.map(item => (
                        <motion.button key={item.id}
                            className={`nav-item ${item.isActive ? 'nav-item--active' : ''}`}
                            onClick={() => handleNavClick(item.path)}
                            whileHover={{ x: 8 }} whileTap={{ scale: 0.95 }}>
                            <span className="nav-item-icon">{item.icon}</span>
                            <span className="nav-item-label">{item.label}</span>
                            {item.isActive && <motion.div className="nav-active-glow" layoutId="activeGlow" />}
                        </motion.button>
                    ))}
                </div>
                <div className="nav-footer">
                    <motion.button className="nav-signout" onClick={handleSignOut}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <span>🚪</span><span>Sign Out</span>
                    </motion.button>
                </div>
                <style>{sidebarStyles}</style>
            </motion.nav>
        );
    }

    return (
        <motion.nav className="nav-hud nav-hud--bottom glass-heavy"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
            <div className="nav-items">
                {navItems.map(item => (
                    <motion.button key={item.id}
                        className={`nav-item ${item.isActive ? 'nav-item--active' : ''}`}
                        onClick={() => handleNavClick(item.path)}
                        whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}>
                        <span className="nav-item-icon">{item.icon}</span>
                        <span className="nav-item-label">{item.label}</span>
                        {item.isActive && <motion.div className="nav-active-indicator" layoutId="activeIndicator" />}
                    </motion.button>
                ))}
                <motion.button className="nav-item nav-signout-btn" onClick={handleSignOut}
                    whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}>
                    <span className="nav-item-icon">🚪</span>
                    <span className="nav-item-label">Sign Out</span>
                </motion.button>
            </div>
            <style>{bottomStyles}</style>
        </motion.nav>
    );
};

const bottomStyles = `
.nav-hud--bottom {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    border-radius: 24px; padding: 8px 16px; z-index: var(--z-floating);
}
.nav-hud--bottom .nav-items { display: flex; gap: 8px; align-items: center; }
.nav-hud--bottom .nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 12px 20px; border-radius: 16px; border: none; background: transparent;
    color: rgba(248, 250, 252, 0.6); cursor: pointer; position: relative;
    transition: all 0.2s ease;
}
.nav-hud--bottom .nav-item:hover { color: #F8FAFC; background: rgba(255,255,255,0.05); }
.nav-hud--bottom .nav-item--active { color: var(--color-poker-primary); }
.nav-hud--bottom .nav-item--active::after {
    content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
    width: 20px; height: 3px; background: var(--color-poker-primary); border-radius: 2px;
    box-shadow: 0 0 10px var(--color-poker-glow);
}
.nav-hud--bottom .nav-item-icon { font-size: 1.5rem; }
.nav-hud--bottom .nav-item-label { font-size: 0.75rem; font-weight: 500; }
.nav-hud--bottom .nav-signout-btn { color: rgba(255,68,68,0.7); }
.nav-hud--bottom .nav-signout-btn:hover { color: var(--color-xp-primary); background: rgba(255,68,68,0.1); }
`;

const sidebarStyles = `
.nav-hud--sidebar {
    position: fixed; left: 16px; top: 16px; bottom: 16px; width: 220px;
    border-radius: 20px; padding: 24px 16px; z-index: var(--z-floating);
    display: flex; flex-direction: column;
}
.nav-hud-header { display: flex; align-items: center; gap: 12px; padding: 0 8px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.nav-logo { font-size: 2rem; }
.nav-title { font-size: 1.25rem; font-weight: 700; }
.nav-hud--sidebar .nav-items { flex: 1; display: flex; flex-direction: column; gap: 4px; padding-top: 24px; }
.nav-hud--sidebar .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px;
    border: none; background: transparent; color: rgba(248,250,252,0.6);
    cursor: pointer; position: relative; text-align: left; width: 100%;
}
.nav-hud--sidebar .nav-item:hover { color: #F8FAFC; background: rgba(255,255,255,0.05); }
.nav-hud--sidebar .nav-item--active {
    color: var(--color-poker-primary); background: var(--color-poker-surface);
    box-shadow: 0 0 20px var(--color-poker-soft);
}
.nav-hud--sidebar .nav-item-icon { font-size: 1.25rem; }
.nav-hud--sidebar .nav-item-label { font-size: 0.9375rem; font-weight: 500; }
.nav-footer { padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
.nav-signout {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px;
    border-radius: 12px; border: none; background: rgba(255,68,68,0.1);
    color: var(--color-xp-primary); cursor: pointer; font-size: 0.9375rem; font-weight: 500;
}
.nav-signout:hover { background: rgba(255,68,68,0.2); }
`;

export default NavigationHUD;
