/**
 * 🏛️ CLUBS PAGE — SOCIAL GAMING & DISCOVERY
 * ═══════════════════════════════════════════════════════════════════════════
 * Club discovery, membership, and weekly challenges.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArena } from '../../providers/ArenaAuthProvider';
import { usePlayerState } from '../../providers/PlayerStateProvider';
import { createClubsService, Club, NearbyClub, ClubChallenge } from '../../services/ClubsService';

type TabView = 'discover' | 'my-clubs' | 'create';

export const ClubsPage: React.FC = () => {
    const { supabase, user } = useArena();
    const playerState = usePlayerState();

    const [tab, setTab] = useState<TabView>('discover');
    const [nearbyClubs, setNearbyClubs] = useState<NearbyClub[]>([]);
    const [myClubs, setMyClubs] = useState<Club[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Club[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setUserLocation({ lat: 40.7128, lng: -74.006 }) // Default to NYC
            );
        }
    }, []);

    const loadData = useCallback(async () => {
        if (!supabase || !user?.id) return;
        setIsLoading(true);
        try {
            const service = createClubsService(supabase);
            const clubs = await service.getMyClubs(user.id);
            setMyClubs(clubs);
            if (userLocation) {
                const nearby = await service.discoverNearby(userLocation.lat, userLocation.lng);
                setNearbyClubs(nearby);
            }
        } catch (err) {
            console.error('Failed to load clubs:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, user?.id, userLocation]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSearch = useCallback(async () => {
        if (!supabase || !searchQuery.trim()) return;
        const service = createClubsService(supabase);
        const results = await service.searchClubs(searchQuery);
        setSearchResults(results);
    }, [supabase, searchQuery]);

    const handleJoin = useCallback(async (clubId: string) => {
        if (!supabase || !user?.id) return;
        const service = createClubsService(supabase);
        const result = await service.join(user.id, clubId);
        if (result.success) {
            loadData();
        }
    }, [supabase, user?.id, loadData]);

    if (isLoading) {
        return (
            <div className="clubs-loading">
                <span className="spinner">🏛️</span>
                <p>Loading clubs...</p>
                <style>{loadingStyles}</style>
            </div>
        );
    }

    return (
        <div className="clubs-page">
            <header className="clubs-header">
                <h1 className="text-gradient">🏛️ Clubs Arena</h1>
                <p>Join clubs, compete in challenges, climb the leaderboards</p>
            </header>

            {/* Tab Navigation */}
            <div className="tabs">
                {(['discover', 'my-clubs', 'create'] as TabView[]).map(t => (
                    <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                        {t === 'discover' ? '🌍 Discover' : t === 'my-clubs' ? '🏠 My Clubs' : '➕ Create'}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            {tab === 'discover' && (
                <div className="search-section">
                    <div className="search-bar glass">
                        <input
                            type="text"
                            placeholder="Search clubs..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch}>🔍</button>
                    </div>
                </div>
            )}

            {/* Content */}
            <AnimatePresence mode="wait">
                {tab === 'discover' && (
                    <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {searchResults.length > 0 ? (
                            <>
                                <h2>Search Results</h2>
                                <ClubGrid clubs={searchResults} onJoin={handleJoin} />
                            </>
                        ) : (
                            <>
                                <h2>📍 Nearby Clubs</h2>
                                {nearbyClubs.length > 0 ? (
                                    <ClubGrid clubs={nearbyClubs} onJoin={handleJoin} showDistance />
                                ) : (
                                    <div className="empty-state">
                                        <span>🌍</span>
                                        <p>No clubs nearby. Be the first to create one!</p>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {tab === 'my-clubs' && (
                    <motion.div key="my-clubs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <h2>🏠 Your Clubs</h2>
                        {myClubs.length > 0 ? (
                            <ClubGrid clubs={myClubs} isMember />
                        ) : (
                            <div className="empty-state">
                                <span>🏛️</span>
                                <p>You haven't joined any clubs yet.</p>
                                <button onClick={() => setTab('discover')}>Discover Clubs</button>
                            </div>
                        )}
                    </motion.div>
                )}

                {tab === 'create' && (
                    <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <CreateClubForm supabase={supabase!} userId={user?.id || ''} onCreated={() => {
                            loadData();
                            setTab('my-clubs');
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{clubsStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ CLUB GRID
// ═══════════════════════════════════════════════════════════════════════════════

interface ClubGridProps {
    clubs: (Club | NearbyClub)[];
    onJoin?: (id: string) => void;
    isMember?: boolean;
    showDistance?: boolean;
}

const ClubGrid: React.FC<ClubGridProps> = ({ clubs, onJoin, isMember, showDistance }) => (
    <div className="club-grid">
        {clubs.map((club, i) => (
            <motion.div
                key={club.id}
                className="club-card glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
            >
                <div className="club-avatar">
                    {club.avatar_url ? (
                        <img src={club.avatar_url} alt={club.name} />
                    ) : (
                        <span>🏛️</span>
                    )}
                </div>
                <div className="club-info">
                    <h3>{club.name}</h3>
                    {club.description && <p className="description">{club.description}</p>}
                    <div className="meta">
                        <span>👥 {club.member_count}</span>
                        {showDistance && 'distance_km' in club && (
                            <span>📍 {club.distance_km} km</span>
                        )}
                        {(club.city || club.country) && (
                            <span>🌍 {club.city}{club.city && club.country ? ', ' : ''}{club.country}</span>
                        )}
                    </div>
                </div>
                {!isMember && onJoin && (
                    <motion.button
                        className="join-btn"
                        onClick={() => onJoin(club.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Join
                    </motion.button>
                )}
                {isMember && (
                    <motion.button
                        className="enter-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Enter →
                    </motion.button>
                )}
            </motion.div>
        ))}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ➕ CREATE CLUB FORM
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateFormProps {
    supabase: any;
    userId: string;
    onCreated: () => void;
}

const CreateClubForm: React.FC<CreateFormProps> = ({ supabase, userId, onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        setError('');
        try {
            const service = createClubsService(supabase);
            await service.create(userId, name, description || undefined, undefined, undefined, city || undefined);
            onCreated();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="create-form glass-heavy" onSubmit={handleSubmit}>
            <h2>➕ Create New Club</h2>
            <div className="form-group">
                <label>Club Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter club name" required />
            </div>
            <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's your club about?" rows={3} />
            </div>
            <div className="form-group">
                <label>City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City (optional)" />
            </div>
            {error && <div className="form-error">{error}</div>}
            <motion.button type="submit" className="submit-btn neon-border-poker" disabled={isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                {isSubmitting ? 'Creating...' : '🏛️ Create Club'}
            </motion.button>
        </form>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const loadingStyles = `
.clubs-loading { min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
.clubs-loading .spinner { font-size: 4rem; animation: spin 1s ease-in-out infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
`;

const clubsStyles = `
.clubs-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.clubs-header { text-align: center; margin-bottom: 32px; }
.clubs-header h1 { font-size: 2rem; margin-bottom: 8px; }
.clubs-header p { color: rgba(248, 250, 252, 0.6); }

.tabs { display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; }
.tabs button { padding: 12px 24px; border: none; background: rgba(255,255,255,0.05); border-radius: 12px; color: rgba(248,250,252,0.6); cursor: pointer; font-weight: 500; }
.tabs button.active { background: var(--color-poker-surface); color: var(--color-poker-primary); }

.search-section { margin-bottom: 24px; }
.search-bar { display: flex; gap: 12px; padding: 12px 16px; border-radius: 14px; max-width: 500px; margin: 0 auto; }
.search-bar input { flex: 1; background: transparent; border: none; color: #F8FAFC; font-size: 1rem; outline: none; }
.search-bar button { background: var(--color-poker-primary); border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }

h2 { font-size: 1.25rem; margin-bottom: 16px; color: #F8FAFC; }

.club-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.club-card { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 16px; }
.club-avatar { width: 60px; height: 60px; border-radius: 12px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; }
.club-avatar img { width: 100%; height: 100%; object-fit: cover; }
.club-info { flex: 1; min-width: 0; }
.club-info h3 { font-size: 1.125rem; color: #F8FAFC; margin-bottom: 4px; }
.club-info .description { font-size: 0.875rem; color: rgba(248,250,252,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px; }
.meta { display: flex; gap: 12px; font-size: 0.75rem; color: rgba(248,250,252,0.5); }
.join-btn, .enter-btn { padding: 10px 20px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.join-btn { background: var(--color-poker-primary); color: var(--color-void); }
.enter-btn { background: rgba(255,255,255,0.1); color: var(--color-poker-primary); }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-state span { font-size: 4rem; display: block; margin-bottom: 16px; }
.empty-state p { color: rgba(248,250,252,0.6); margin-bottom: 16px; }
.empty-state button { padding: 12px 24px; background: var(--color-poker-primary); border: none; border-radius: 10px; color: var(--color-void); font-weight: 600; cursor: pointer; }

.create-form { max-width: 500px; margin: 0 auto; padding: 32px; border-radius: 20px; }
.create-form h2 { text-align: center; margin-bottom: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 0.875rem; color: rgba(248,250,252,0.7); margin-bottom: 8px; }
.form-group input, .form-group textarea { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #F8FAFC; font-size: 1rem; outline: none; resize: none; }
.form-group input:focus, .form-group textarea:focus { border-color: var(--color-poker-primary); }
.form-error { color: var(--color-xp-primary); font-size: 0.875rem; margin-bottom: 16px; text-align: center; }
.submit-btn { width: 100%; padding: 16px; background: transparent; border: none; border-radius: 12px; color: var(--color-poker-primary); font-size: 1.1rem; font-weight: 700; cursor: pointer; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default ClubsPage;
