/**
 * 🛰️ ARENA AUTH PROVIDER — THE SPATIAL ARCHITECTURE & ANTI-GRAVITY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Root spatial provider with global state contract and reactive motion engine.
 * Features:
 * - Supabase Auth listener with real-time session management
 * - Anti-Gravity hook for 60fps refresh-rate synchronization
 * - SpatialCanvas with dynamic CSS perspective and depth variables
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode
} from 'react';
import { createClient, User, Session, SupabaseClient } from '@supabase/supabase-js';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type ArenaStatus = 'loading' | 'active' | 'error' | 'unauthenticated';

export interface ArenaState {
    user: User | null;
    session: Session | null;
    status: ArenaStatus;
    flags: string[];
    supabase: SupabaseClient | null;
}

export interface ArenaContextValue extends ArenaState {
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    addFlag: (flag: string) => void;
    removeFlag: (flag: string) => void;
    hasFlag: (flag: string) => boolean;
}

export interface SpatialState {
    mouseX: number;
    mouseY: number;
    perspectiveX: number;
    perspectiveY: number;
    depth: number;
    velocity: { x: number; y: number };
}

export interface SpatialContextValue extends SpatialState {
    isAntiGravityEnabled: boolean;
    setAntiGravityEnabled: (enabled: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 SUPABASE CLIENT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

// Vite uses import.meta.env instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 CONTEXT CREATION
// ═══════════════════════════════════════════════════════════════════════════════

const ArenaAuthContext = createContext<ArenaContextValue | null>(null);
const SpatialContext = createContext<SpatialContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// 🪝 CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Access the Arena Auth context
 */
export function useArena(): ArenaContextValue {
    const context = useContext(ArenaAuthContext);
    if (!context) {
        throw new Error('useArena must be used within an ArenaAuthProvider');
    }
    return context;
}

/**
 * Access the Spatial context for motion and perspective
 */
export function useSpatial(): SpatialContextValue {
    const context = useContext(SpatialContext);
    if (!context) {
        throw new Error('useSpatial must be used within a SpatialCanvas');
    }
    return context;
}

/**
 * 🛸 ANTI-GRAVITY HOOK — 60fps refresh-rate synchronization
 * Manages frame-perfect updates for child components
 */
export function useAntiGravity(callback: (deltaTime: number) => void, enabled: boolean = true) {
    const frameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());

    useEffect(() => {
        if (!enabled) return;

        const animate = (currentTime: number) => {
            const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
            lastTimeRef.current = currentTime;

            // Lock to 60fps (~16.67ms per frame)
            if (deltaTime < 0.1) {
                callback(deltaTime);
            }

            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [callback, enabled]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛰️ ARENA AUTH PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface ArenaAuthProviderProps {
    children: ReactNode;
}

export const ArenaAuthProvider: React.FC<ArenaAuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [status, setStatus] = useState<ArenaStatus>('loading');
    const [flags, setFlags] = useState<string[]>([]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔐 AUTH STATE LISTENER
    // ═══════════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!supabase) {
            console.warn('⚠️ Supabase not configured — running in demo mode');
            setStatus('unauthenticated');
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setStatus(session ? 'active' : 'unauthenticated');
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`🔐 Auth Event: ${event}`);
                setSession(session);
                setUser(session?.user ?? null);

                switch (event) {
                    case 'SIGNED_IN':
                        setStatus('active');
                        setFlags(prev => [...prev, 'JUST_SIGNED_IN']);
                        break;
                    case 'SIGNED_OUT':
                        setStatus('unauthenticated');
                        setFlags([]);
                        break;
                    case 'TOKEN_REFRESHED':
                        setStatus('active');
                        break;
                    case 'USER_UPDATED':
                        setStatus('active');
                        break;
                    default:
                        if (session) setStatus('active');
                        else setStatus('unauthenticated');
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔐 AUTH METHODS
    // ═══════════════════════════════════════════════════════════════════════

    const signIn = useCallback(async (email: string, password: string) => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') };
        }

        setStatus('loading');
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setStatus('error');
            return { error };
        }

        return { error: null };
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        if (!supabase) {
            return { error: new Error('Supabase not configured') };
        }

        setStatus('loading');
        const { error } = await supabase.auth.signUp({ email, password });

        if (error) {
            setStatus('error');
            return { error };
        }

        return { error: null };
    }, []);

    const signOut = useCallback(async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setStatus('unauthenticated');
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // 🚩 FLAG MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    const addFlag = useCallback((flag: string) => {
        setFlags(prev => prev.includes(flag) ? prev : [...prev, flag]);
    }, []);

    const removeFlag = useCallback((flag: string) => {
        setFlags(prev => prev.filter(f => f !== flag));
    }, []);

    const hasFlag = useCallback((flag: string) => {
        return flags.includes(flag);
    }, [flags]);

    // ═══════════════════════════════════════════════════════════════════════
    // 📦 CONTEXT VALUE
    // ═══════════════════════════════════════════════════════════════════════

    const value: ArenaContextValue = {
        user,
        session,
        status,
        flags,
        supabase,
        signIn,
        signUp,
        signOut,
        addFlag,
        removeFlag,
        hasFlag
    };

    return (
        <ArenaAuthContext.Provider value={value}>
            {children}
        </ArenaAuthContext.Provider>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 SPATIAL CANVAS — Dynamic Perspective & Depth Injection
// ═══════════════════════════════════════════════════════════════════════════════

interface SpatialCanvasProps {
    children: ReactNode;
    perspectiveIntensity?: number;
    depthLayers?: number;
}

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({
    children,
    perspectiveIntensity = 0.02,
    depthLayers = 5
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAntiGravityEnabled, setAntiGravityEnabled] = useState(true);

    // Raw motion values from cursor movement
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smoothed perspective with spring physics
    const perspectiveX = useSpring(mouseX, { stiffness: 150, damping: 20 });
    const perspectiveY = useSpring(mouseY, { stiffness: 150, damping: 20 });

    // Transform to rotation values
    const rotateX = useTransform(perspectiveY, [-0.5, 0.5], [3, -3]);
    const rotateY = useTransform(perspectiveX, [-0.5, 0.5], [-3, 3]);

    // Depth calculation based on distance from center
    const depth = useTransform(
        [perspectiveX, perspectiveY],
        ([x, y]: number[]) => {
            const distance = Math.sqrt(x * x + y * y);
            return Math.min(1, distance * 2);
        }
    );

    // Velocity tracking
    const [velocity, setVelocity] = useState({ x: 0, y: 0 });
    const lastPos = useRef({ x: 0, y: 0 });

    // ═══════════════════════════════════════════════════════════════════════
    // 🖱️ MOUSE TRACKING
    // ═══════════════════════════════════════════════════════════════════════

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!containerRef.current || !isAntiGravityEnabled) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Normalize to -0.5 to 0.5 range
        const normalizedX = ((e.clientX - centerX) / rect.width) * perspectiveIntensity * 50;
        const normalizedY = ((e.clientY - centerY) / rect.height) * perspectiveIntensity * 50;

        mouseX.set(normalizedX);
        mouseY.set(normalizedY);

        // Calculate velocity
        setVelocity({
            x: e.clientX - lastPos.current.x,
            y: e.clientY - lastPos.current.y
        });
        lastPos.current = { x: e.clientX, y: e.clientY };
    }, [mouseX, mouseY, perspectiveIntensity, isAntiGravityEnabled]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [handleMouseMove]);

    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 CSS VARIABLE INJECTION
    // ═══════════════════════════════════════════════════════════════════════

    useEffect(() => {
        const unsubscribeX = perspectiveX.on('change', (v) => {
            document.documentElement.style.setProperty('--spatial-x', `${v}`);
        });
        const unsubscribeY = perspectiveY.on('change', (v) => {
            document.documentElement.style.setProperty('--spatial-y', `${v}`);
        });
        const unsubscribeDepth = depth.on('change', (v) => {
            document.documentElement.style.setProperty('--spatial-depth', `${v}`);
        });

        return () => {
            unsubscribeX();
            unsubscribeY();
            unsubscribeDepth();
        };
    }, [perspectiveX, perspectiveY, depth]);

    // ═══════════════════════════════════════════════════════════════════════
    // 📦 CONTEXT VALUE
    // ═══════════════════════════════════════════════════════════════════════

    const spatialValue: SpatialContextValue = {
        mouseX: mouseX.get(),
        mouseY: mouseY.get(),
        perspectiveX: perspectiveX.get(),
        perspectiveY: perspectiveY.get(),
        depth: depth.get(),
        velocity,
        isAntiGravityEnabled,
        setAntiGravityEnabled
    };

    return (
        <SpatialContext.Provider value={spatialValue}>
            <motion.div
                ref={containerRef}
                className="spatial-canvas"
                style={{
                    rotateX,
                    rotateY,
                    transformPerspective: 1200,
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* Depth layer overlays */}
                {Array.from({ length: depthLayers }, (_, i) => (
                    <div
                        key={i}
                        className={`depth-layer depth-layer-${i + 1}`}
                        style={{
                            '--layer-index': i + 1,
                            '--layer-depth': (i + 1) / depthLayers
                        } as React.CSSProperties}
                    />
                ))}

                {/* Main content */}
                <div className="spatial-content">
                    {children}
                </div>
            </motion.div>
        </SpatialContext.Provider>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default ArenaAuthProvider;
