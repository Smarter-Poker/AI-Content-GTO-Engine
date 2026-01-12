/**
 * 📊 ANALYTICS PAGE — CHARTS & PERFORMANCE TRACKING
 * ═══════════════════════════════════════════════════════════════════════════
 * Dashboard with accuracy trends, concept heatmap, and leak detection.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArena } from '../../providers/ArenaAuthProvider';
import { usePlayerState } from '../../providers/PlayerStateProvider';
import { createAnalyticsService, AnalyticsSummary, DailySnapshot, ConceptStats } from '../../services/AnalyticsService';

type TimeRange = '7d' | '30d' | '90d';

export const AnalyticsPage: React.FC = () => {
    const { supabase, user } = useArena();
    const playerState = usePlayerState();

    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!supabase || !user?.id) return;
        setIsLoading(true);
        try {
            const service = createAnalyticsService(supabase);
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const [summaryData, snapshotData] = await Promise.all([
                service.getSummary(user.id),
                service.getDailySnapshots(user.id, days)
            ]);
            setSummary(summaryData);
            setSnapshots(snapshotData);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, user?.id, timeRange]);

    useEffect(() => { loadData(); }, [loadData]);

    if (isLoading) {
        return (
            <div className="analytics-loading">
                <span className="spinner">📊</span>
                <p>Loading your performance data...</p>
                <style>{loadingStyles}</style>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <header className="analytics-header">
                <h1 className="text-gradient">📊 Performance Analytics</h1>
                <div className="time-toggle">
                    {(['7d', '30d', '90d'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            className={timeRange === range ? 'active' : ''}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </header>

            {/* Summary Cards */}
            <div className="summary-grid">
                <SummaryCard icon="🎯" label="Accuracy" value={`${((summary?.weekly_summary.avg_accuracy || 0) * 100).toFixed(1)}%`} trend="up" />
                <SummaryCard icon="📝" label="Questions" value={summary?.weekly_summary.total_questions?.toString() || '0'} />
                <SummaryCard icon="🔥" label="Best Streak" value={summary?.weekly_summary.best_streak?.toString() || '0'} />
                <SummaryCard icon="⭐" label="XP Earned" value={summary?.weekly_summary.total_xp?.toString() || '0'} />
                <SummaryCard icon="💎" label="Diamonds" value={summary?.weekly_summary.total_diamonds?.toString() || '0'} />
                <SummaryCard icon="📈" label="Net EV" value={`${(summary?.weekly_summary.net_ev || 0).toFixed(2)} BB`} trend={(summary?.weekly_summary.net_ev || 0) > 0 ? 'up' : 'down'} />
            </div>

            {/* Accuracy Chart */}
            <div className="chart-section">
                <h2>📈 Accuracy Trend</h2>
                <AccuracyChart snapshots={snapshots} />
            </div>

            {/* Concept Mastery Heatmap */}
            <div className="chart-section">
                <h2>🎯 Concept Mastery</h2>
                <ConceptHeatmap concepts={summary?.concepts || []} />
            </div>

            {/* Active Leaks */}
            {(summary?.active_leaks?.length || 0) > 0 && (
                <div className="chart-section leaks">
                    <h2>🚨 Active Leaks</h2>
                    <LeaksList leaks={summary?.active_leaks || []} />
                </div>
            )}

            <style>{analyticsStyles}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SUMMARY CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface SummaryCardProps {
    icon: string;
    label: string;
    value: string;
    trend?: 'up' | 'down';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, trend }) => (
    <motion.div className="summary-card glass" whileHover={{ scale: 1.02, y: -4 }}>
        <span className="card-icon">{icon}</span>
        <span className="card-label">{label}</span>
        <span className={`card-value ${trend || ''}`}>{value}</span>
        {trend && <span className="trend-arrow">{trend === 'up' ? '↑' : '↓'}</span>}
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 ACCURACY CHART
// ═══════════════════════════════════════════════════════════════════════════════

const AccuracyChart: React.FC<{ snapshots: DailySnapshot[] }> = ({ snapshots }) => {
    if (snapshots.length === 0) {
        return <div className="no-data">No data yet. Complete training sessions to see your progress!</div>;
    }

    const maxAccuracy = Math.max(...snapshots.map(s => s.accuracy), 0.5);
    const reversed = [...snapshots].reverse();

    return (
        <div className="accuracy-chart">
            <div className="chart-y-axis">
                <span>100%</span>
                <span className="threshold">85%</span>
                <span>50%</span>
                <span>0%</span>
            </div>
            <div className="chart-bars">
                {reversed.map((snap, i) => (
                    <motion.div
                        key={snap.snapshot_date}
                        className="bar-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div className="bar-wrapper">
                            <motion.div
                                className={`bar ${snap.accuracy >= 0.85 ? 'passing' : ''}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${(snap.accuracy / maxAccuracy) * 100}%` }}
                                transition={{ delay: i * 0.05, duration: 0.5 }}
                            />
                            <div className="threshold-line" />
                        </div>
                        <span className="bar-label">{new Date(snap.snapshot_date).getDate()}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 CONCEPT HEATMAP
// ═══════════════════════════════════════════════════════════════════════════════

const ConceptHeatmap: React.FC<{ concepts: ConceptStats[] }> = ({ concepts }) => {
    if (concepts.length === 0) {
        return <div className="no-data">Complete training to build your concept mastery map!</div>;
    }

    const getMasteryColor = (level: number) => {
        const colors = ['#475569', '#EF4444', '#F97316', '#FACC15', '#4ADE80', '#00FF88'];
        return colors[level] || colors[0];
    };

    const getTrendIcon = (trend: string) => {
        return trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';
    };

    return (
        <div className="concept-grid">
            {concepts.map((concept, i) => (
                <motion.div
                    key={concept.category}
                    className="concept-card glass-subtle"
                    style={{ '--mastery-color': getMasteryColor(concept.mastery_level) } as React.CSSProperties}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.03 }}
                >
                    <div className="concept-header">
                        <span className="concept-name">{concept.category}</span>
                        <span className="trend-icon">{getTrendIcon(concept.trend)}</span>
                    </div>
                    <div className="mastery-bar">
                        <motion.div
                            className="mastery-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${concept.accuracy * 100}%` }}
                        />
                    </div>
                    <div className="concept-stats">
                        <span>{(concept.accuracy * 100).toFixed(0)}%</span>
                        <span>{concept.attempts} attempts</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🚨 LEAKS LIST
// ═══════════════════════════════════════════════════════════════════════════════

interface LeakInfo { category: string; severity: string; occurrences: number; }

const LeaksList: React.FC<{ leaks: LeakInfo[] }> = ({ leaks }) => {
    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            minor: '#FACC15', moderate: '#F97316', severe: '#EF4444', critical: '#DC2626'
        };
        return colors[severity] || '#EF4444';
    };

    return (
        <div className="leaks-list">
            {leaks.map((leak, i) => (
                <motion.div
                    key={leak.category}
                    className="leak-item glass"
                    style={{ '--leak-color': getSeverityColor(leak.severity) } as React.CSSProperties}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <span className="leak-icon">🚨</span>
                    <div className="leak-info">
                        <span className="leak-category">{leak.category}</span>
                        <span className="leak-severity">{leak.severity.toUpperCase()}</span>
                    </div>
                    <span className="leak-count">{leak.occurrences}x</span>
                </motion.div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const loadingStyles = `
.analytics-loading { min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
.analytics-loading .spinner { font-size: 4rem; animation: spin 1s ease-in-out infinite; }
.analytics-loading p { color: rgba(248, 250, 252, 0.6); }
@keyframes spin { to { transform: rotate(360deg); } }
`;

const analyticsStyles = `
.analytics-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.analytics-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
.analytics-header h1 { font-size: 2rem; }
.time-toggle { display: flex; gap: 8px; }
.time-toggle button { padding: 10px 20px; border: none; background: rgba(255,255,255,0.05); border-radius: 10px; color: rgba(248,250,252,0.6); cursor: pointer; }
.time-toggle button.active { background: var(--color-poker-surface); color: var(--color-poker-primary); }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
.summary-card { padding: 20px; border-radius: 16px; text-align: center; position: relative; }
.card-icon { font-size: 2rem; display: block; margin-bottom: 8px; }
.card-label { display: block; font-size: 0.75rem; color: rgba(248,250,252,0.5); margin-bottom: 4px; text-transform: uppercase; }
.card-value { font-size: 1.5rem; font-weight: 700; color: #F8FAFC; }
.card-value.up { color: var(--color-poker-primary); }
.card-value.down { color: var(--color-xp-primary); }
.trend-arrow { position: absolute; top: 12px; right: 12px; font-size: 0.875rem; }

.chart-section { background: rgba(255,255,255,0.02); border-radius: 20px; padding: 24px; margin-bottom: 24px; }
.chart-section h2 { font-size: 1.25rem; margin-bottom: 20px; color: #F8FAFC; }
.chart-section.leaks { background: rgba(255, 68, 68, 0.05); border: 1px solid rgba(255, 68, 68, 0.2); }
.no-data { text-align: center; padding: 40px; color: rgba(248,250,252,0.5); }

.accuracy-chart { display: flex; gap: 16px; height: 200px; }
.chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; font-size: 0.75rem; color: rgba(248,250,252,0.4); min-width: 40px; text-align: right; padding-right: 8px; }
.chart-y-axis .threshold { color: var(--color-poker-primary); }
.chart-bars { flex: 1; display: flex; gap: 4px; align-items: flex-end; }
.bar-container { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bar-wrapper { flex: 1; width: 100%; position: relative; display: flex; align-items: flex-end; }
.bar { width: 100%; background: linear-gradient(180deg, var(--color-diamond), var(--color-poker-primary)); border-radius: 4px 4px 0 0; min-height: 4px; }
.bar.passing { background: var(--color-poker-primary); box-shadow: 0 0 10px var(--color-poker-glow); }
.threshold-line { position: absolute; bottom: 85%; left: 0; right: 0; height: 1px; background: var(--color-poker-primary); opacity: 0.3; }
.bar-label { font-size: 0.625rem; color: rgba(248,250,252,0.4); margin-top: 4px; }

.concept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.concept-card { padding: 16px; border-radius: 12px; border-left: 4px solid var(--mastery-color); }
.concept-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.concept-name { font-weight: 600; color: #F8FAFC; font-size: 0.875rem; }
.mastery-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.mastery-fill { height: 100%; background: var(--mastery-color); border-radius: 3px; }
.concept-stats { display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.75rem; color: rgba(248,250,252,0.5); }

.leaks-list { display: flex; flex-direction: column; gap: 12px; }
.leak-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; border-left: 4px solid var(--leak-color); }
.leak-icon { font-size: 1.5rem; }
.leak-info { flex: 1; }
.leak-category { display: block; font-weight: 600; color: #F8FAFC; }
.leak-severity { font-size: 0.75rem; color: var(--leak-color); }
.leak-count { font-size: 1.25rem; font-weight: 700; color: var(--leak-color); }
`;

export default AnalyticsPage;
