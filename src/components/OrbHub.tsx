/**
 * 🌐 ORB HUB — DYNAMIC RADIAL NAVIGATION CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * Circular floating navigation menu with 3D-tilt effects and neon glows.
 * Navigation Nodes: Training Games, Charts & Analytics, Clubs Arena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface OrbNode {
    id: string;
    label: string;
    icon: string;
    path: string;
    color: string;
    glowColor: string;
    description: string;
}

interface OrbHubProps {
    isExpanded?: boolean;
    onToggle?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 ORB NAVIGATION NODES
// ═══════════════════════════════════════════════════════════════════════════════

const ORB_NODES: OrbNode[] = [
    {
        id: 'training',
        label: 'Training Games',
        icon: '🎯',
        path: '/app/training',
        color: '#F97316', // Orange
        glowColor: 'rgba(249, 115, 22, 0.6)',
        description: 'GTO Drills & Mastery System'
    },
    {
        id: 'analytics',
        label: 'Charts & Analytics',
        icon: '📊',
        path: '/app/analytics',
        color: '#FACC15', // Yellow
        glowColor: 'rgba(250, 204, 21, 0.6)',
        description: 'Performance & Leak Detection'
    },
    {
        id: 'clubs',
        label: 'Clubs Arena',
        icon: '🏟️',
        path: '/app/clubs',
        color: '#8B5CF6', // Purple
        glowColor: 'rgba(139, 92, 246, 0.6)',
        description: 'Social Gaming & Tournaments'
    },
    {
        id: 'brain',
        label: 'The Brain',
        icon: '🧠',
        path: '/app/brain',
        color: '#00FF88', // Green
        glowColor: 'rgba(0, 255, 136, 0.6)',
        description: 'Memory & Pattern Training'
    },
    {
        id: 'arcade',
        label: 'Diamond Arcade',
        icon: '💎',
        path: '/app/arcade',
        color: '#00D4FF', // Cyan
        glowColor: 'rgba(0, 212, 255, 0.6)',
        description: 'Skill Games & Rewards'
    }
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ORB NODE COMPONENT — Individual Navigation Item
// ═══════════════════════════════════════════════════════════════════════════════

interface OrbNodeItemProps {
    node: OrbNode;
    index: number;
    totalNodes: number;
    isExpanded: boolean;
    isActive: boolean;
    onSelect: (node: OrbNode) => void;
}

const OrbNodeItem: React.FC<OrbNodeItemProps> = ({
    node,
    index,
    totalNodes,
    isExpanded,
    isActive,
    onSelect
}) => {
    const nodeRef = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Calculate position in radial layout
    const angle = (index / totalNodes) * 360 - 90; // Start from top
    const radius = 120;
    const radian = (angle * Math.PI) / 180;
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;

    // 3D Tilt effect on hover
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useTransform(mouseY, [-30, 30], [15, -15]);
    const rotateY = useTransform(mouseX, [-30, 30], [-15, 15]);
    const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
    const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!nodeRef.current) return;
        const rect = nodeRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
    }, [mouseX, mouseY]);

    const handleMouseLeave = useCallback(() => {
        mouseX.set(0);
        mouseY.set(0);
        setIsHovered(false);
    }, [mouseX, mouseY]);

    return (
        <motion.button
            ref={nodeRef}
            className={`orb-node ${isActive ? 'orb-node--active' : ''}`}
            style={{
                '--node-color': node.color,
                '--node-glow': node.glowColor,
                rotateX: springRotateX,
                rotateY: springRotateY,
                transformPerspective: 600
            } as React.CSSProperties}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
                opacity: isExpanded ? 1 : 0,
                scale: isExpanded ? 1 : 0,
                x: isExpanded ? x : 0,
                y: isExpanded ? y : 0
            }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: isExpanded ? index * 0.05 : (totalNodes - index) * 0.03
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onClick={() => onSelect(node)}
            whileTap={{ scale: 0.9 }}
        >
            <div className="orb-node-inner">
                <span className="orb-node-icon">{node.icon}</span>
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            className="orb-node-tooltip"
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        >
                            <span className="tooltip-label">{node.label}</span>
                            <span className="tooltip-desc">{node.description}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {isActive && (
                <motion.div
                    className="orb-node-active-ring"
                    layoutId="activeOrbRing"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            )}
        </motion.button>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 ORB HUB COMPONENT — Main Navigation Controller
// ═══════════════════════════════════════════════════════════════════════════════

export const OrbHub: React.FC<OrbHubProps> = ({ isExpanded: controlledExpanded, onToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [internalExpanded, setInternalExpanded] = useState(false);

    const isExpanded = controlledExpanded ?? internalExpanded;

    const handleToggle = useCallback(() => {
        if (onToggle) {
            onToggle();
        } else {
            setInternalExpanded(prev => !prev);
        }
    }, [onToggle]);

    const handleNodeSelect = useCallback((node: OrbNode) => {
        navigate(node.path);
        if (!controlledExpanded) {
            setInternalExpanded(false);
        }
    }, [navigate, controlledExpanded]);

    const activeNode = ORB_NODES.find(n => location.pathname.startsWith(n.path));

    return (
        <div className="orb-hub-container">
            {/* Backdrop overlay when expanded */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="orb-hub-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleToggle}
                    />
                )}
            </AnimatePresence>

            <div className="orb-hub">
                {/* Central Hub Button */}
                <motion.button
                    className="orb-hub-center glass-heavy"
                    onClick={handleToggle}
                    animate={{
                        rotate: isExpanded ? 45 : 0,
                        scale: isExpanded ? 1.1 : 1
                    }}
                    whileHover={{ scale: isExpanded ? 1.15 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.span
                        className="hub-icon"
                        animate={{ rotate: isExpanded ? -45 : 0 }}
                    >
                        {activeNode?.icon || '🎮'}
                    </motion.span>
                    <div className="hub-pulse" />
                </motion.button>

                {/* Radial Navigation Nodes */}
                <div className="orb-nodes-container">
                    {ORB_NODES.map((node, index) => (
                        <OrbNodeItem
                            key={node.id}
                            node={node}
                            index={index}
                            totalNodes={ORB_NODES.length}
                            isExpanded={isExpanded}
                            isActive={location.pathname.startsWith(node.path)}
                            onSelect={handleNodeSelect}
                        />
                    ))}
                </div>
            </div>

            <style>{orbHubStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ORB HUB STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const orbHubStyles = `
.orb-hub-container {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-floating);
}

.orb-hub-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: -1;
}

.orb-hub {
    position: relative;
    width: 300px;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.orb-hub-center {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    background: rgba(26, 26, 36, 0.9);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
    box-shadow: 
        0 0 30px rgba(0, 255, 136, 0.3),
        inset 0 0 20px rgba(0, 255, 136, 0.1);
}

.hub-icon {
    font-size: 1.75rem;
    display: block;
}

.hub-pulse {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--color-poker-primary);
    opacity: 0;
    animation: hub-pulse 2s ease-out infinite;
}

@keyframes hub-pulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.5); opacity: 0; }
}

.orb-nodes-container {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.orb-node {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid var(--node-color);
    background: rgba(26, 26, 36, 0.9);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    transform-style: preserve-3d;
    box-shadow: 0 0 20px var(--node-glow);
    transition: box-shadow 0.3s ease;
}

.orb-node:hover {
    box-shadow: 
        0 0 30px var(--node-glow),
        0 0 60px var(--node-glow);
}

.orb-node--active {
    border-width: 3px;
}

.orb-node-inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.orb-node-icon {
    font-size: 1.5rem;
}

.orb-node-tooltip {
    position: absolute;
    top: -70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(26, 26, 36, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 10px 16px;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    backdrop-filter: blur(10px);
}

.tooltip-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #F8FAFC;
}

.tooltip-desc {
    font-size: 0.75rem;
    color: rgba(248, 250, 252, 0.6);
}

.orb-node-active-ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid var(--node-color);
    opacity: 0.5;
}

@media (max-width: 768px) {
    .orb-hub-container {
        bottom: 80px;
    }
    
    .orb-hub {
        width: 240px;
        height: 240px;
    }
    
    .orb-hub-center {
        width: 56px;
        height: 56px;
    }
    
    .orb-node {
        width: 48px;
        height: 48px;
    }
}
`;

export default OrbHub;
