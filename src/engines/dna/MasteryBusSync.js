/**
 * 🛰️ SMARTER.POKER — MASTERY BUS SYNC
 * ═══════════════════════════════════════════════════════════════════════════
 * ORB_01_SOCIAL_DNA: Cross-Silo Handshake Engine
 * 
 * Listens for 85% training mastery scores from GREEN silo to update DNA "Accuracy".
 * 
 * HARD LAW: 85% Mastery Gate must be passed before Accuracy DNA is updated
 * HARD LAW: XP can NEVER decrease (XP_TRIPLE_LOCK)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import net from 'net';
import { DNA_METRICS } from './DNAScoreCalculator.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🛰️ MASTERY BUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const MASTERY_BUS_CONFIG = {
    // Pentagon Bus connection
    BUS_HOST: process.env.PENTAGON_BUS_HOST || '127.0.0.1',
    BUS_PORT: parseInt(process.env.PENTAGON_BUS_PORT) || 4000,

    // Hard Law: 85% mastery threshold
    MASTERY_THRESHOLD: 0.85,

    // Reconnection settings
    RECONNECT_DELAY_MS: 5000,
    MAX_RECONNECT_ATTEMPTS: 10,

    // Accuracy calculation
    ACCURACY_ROLLING_WINDOW: 20,    // Last 20 drill sessions
    MIN_DRILLS_FOR_ACCURACY: 20,    // Minimum drills before DNA accuracy

    // Event types to listen for
    LISTEN_EVENTS: [
        'MASTERY_ACHIEVED',
        'LEVEL_UNLOCKED',
        'GTO_EVALUATION_COMPLETE',
        'TRAINING_SESSION_END'
    ]
};

const SYNC_STATUS = {
    CONNECTED: 'CONNECTED',
    DISCONNECTED: 'DISCONNECTED',
    RECONNECTING: 'RECONNECTING',
    ERROR: 'ERROR'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🛰️ MASTERY BUS SYNC ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class MasteryBusSync {
    constructor(options = {}) {
        this.config = { ...MASTERY_BUS_CONFIG, ...options.config };

        // Bus connection
        this.connection = null;
        this.status = SYNC_STATUS.DISCONNECTED;
        this.reconnectAttempts = 0;

        // DNA Accuracy tracking per user
        this.userAccuracyHistory = new Map();
        this.userDNAAccuracy = new Map();

        // Mastery state cache
        this.userMasteryState = new Map();

        // Event handlers
        this.eventHandlers = new Map();

        // Statistics
        this.stats = {
            messagesReceived: 0,
            accuracyUpdates: 0,
            masteryEvents: 0,
            lastSync: null,
            errors: 0
        };

        console.log('🛰️ MasteryBusSync initialized (ORB_01_SOCIAL_DNA)');
        console.log(`   Mastery Threshold: ${this.config.MASTERY_THRESHOLD * 100}%`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 CONNECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Connect to the Pentagon Master Bus
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.connection = net.connect(
                    this.config.BUS_PORT,
                    this.config.BUS_HOST
                );

                this.connection.on('connect', () => {
                    this.status = SYNC_STATUS.CONNECTED;
                    this.reconnectAttempts = 0;
                    console.log(`🛰️ MasteryBusSync connected to ${this.config.BUS_HOST}:${this.config.BUS_PORT}`);

                    // Register as DNA listener
                    this.sendMessage({
                        type: 'REGISTER_LISTENER',
                        source: 'DNA_MASTERY_SYNC',
                        events: this.config.LISTEN_EVENTS
                    });

                    resolve();
                });

                this.connection.on('data', (data) => this.handleMessage(data));

                this.connection.on('error', (err) => {
                    this.status = SYNC_STATUS.ERROR;
                    this.stats.errors++;
                    console.error(`🛰️ MasteryBusSync error: ${err.message}`);
                    this.attemptReconnect();
                });

                this.connection.on('close', () => {
                    this.status = SYNC_STATUS.DISCONNECTED;
                    console.log('🛰️ MasteryBusSync disconnected');
                    this.attemptReconnect();
                });

            } catch (err) {
                console.warn(`🛰️ MasteryBusSync connection failed: ${err.message}`);
                resolve(); // Don't block startup
            }
        });
    }

    /**
     * Attempt to reconnect to the bus
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.MAX_RECONNECT_ATTEMPTS) {
            console.error('🛰️ MasteryBusSync: Max reconnect attempts reached');
            return;
        }

        this.status = SYNC_STATUS.RECONNECTING;
        this.reconnectAttempts++;

        console.log(`🛰️ MasteryBusSync: Reconnecting (attempt ${this.reconnectAttempts})...`);

        setTimeout(() => {
            this.connect();
        }, this.config.RECONNECT_DELAY_MS);
    }

    /**
     * Disconnect from the bus
     */
    disconnect() {
        if (this.connection) {
            this.connection.end();
            this.connection = null;
        }
        this.status = SYNC_STATUS.DISCONNECTED;
    }

    /**
     * Send message to the bus
     */
    sendMessage(message) {
        if (this.status !== SYNC_STATUS.CONNECTED || !this.connection) {
            return false;
        }

        try {
            this.connection.write(JSON.stringify({
                ...message,
                timestamp: new Date().toISOString()
            }) + '\n');
            return true;
        } catch (err) {
            console.warn(`🛰️ MasteryBusSync send error: ${err.message}`);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📨 MESSAGE HANDLING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Handle incoming messages from the bus
     */
    handleMessage(data) {
        try {
            const lines = data.toString().split('\n').filter(l => l.trim());

            for (const line of lines) {
                const message = JSON.parse(line);
                this.stats.messagesReceived++;

                this.processMessage(message);
            }
        } catch (err) {
            // Silent parse errors for partial messages
        }
    }

    /**
     * Process a single message
     */
    processMessage(message) {
        const { type, payload } = message;

        switch (type) {
            case 'MASTERY_ACHIEVED':
                this.handleMasteryAchieved(payload);
                break;

            case 'LEVEL_UNLOCKED':
                this.handleLevelUnlocked(payload);
                break;

            case 'GTO_EVALUATION_COMPLETE':
                this.handleGTOEvaluation(payload);
                break;

            case 'TRAINING_SESSION_END':
                this.handleSessionEnd(payload);
                break;

            default:
                // Call registered handlers
                if (this.eventHandlers.has(type)) {
                    this.eventHandlers.get(type)(payload);
                }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Handle mastery achievement event
     * HARD LAW: Only updates DNA if 85% threshold passed
     */
    handleMasteryAchieved(payload) {
        const { userId, levelId, accuracy, masteryToken } = payload;

        this.stats.masteryEvents++;

        // ═══════════════════════════════════════════════════════════════
        // 🔐 HARD LAW: Verify 85% threshold
        // ═══════════════════════════════════════════════════════════════
        if (accuracy < this.config.MASTERY_THRESHOLD) {
            console.warn(`🛰️ Mastery event rejected: ${accuracy * 100}% < 85% threshold`);
            return;
        }

        // Record mastery for user
        if (!this.userMasteryState.has(userId)) {
            this.userMasteryState.set(userId, new Map());
        }

        this.userMasteryState.get(userId).set(levelId, {
            accuracy,
            achievedAt: new Date().toISOString(),
            masteryToken
        });

        // Update DNA accuracy
        this.updateDNAAccuracy(userId, accuracy);

        console.log(`🛰️ Mastery recorded: ${userId} Level ${levelId} @ ${(accuracy * 100).toFixed(1)}%`);

        // Emit event
        this.emit('dna_accuracy_updated', { userId, accuracy: this.getDNAAccuracy(userId) });
    }

    /**
     * Handle level unlock event
     */
    handleLevelUnlocked(payload) {
        const { userId, levelId, previousAccuracy } = payload;

        // Track unlock for DNA profile
        if (!this.userMasteryState.has(userId)) {
            this.userMasteryState.set(userId, new Map());
        }

        const state = this.userMasteryState.get(userId);
        state.set(`unlock_${levelId}`, {
            unlockedAt: new Date().toISOString(),
            accuracy: previousAccuracy
        });
    }

    /**
     * Handle individual GTO evaluation result
     */
    handleGTOEvaluation(payload) {
        const { userId, isOptimal, accuracy, evLoss, sessionId } = payload;

        // Track per-drill accuracy for rolling window
        if (!this.userAccuracyHistory.has(userId)) {
            this.userAccuracyHistory.set(userId, []);
        }

        const history = this.userAccuracyHistory.get(userId);
        history.push({
            timestamp: Date.now(),
            isOptimal,
            accuracy,
            evLoss,
            sessionId
        });

        // Trim to window size
        if (history.length > this.config.ACCURACY_ROLLING_WINDOW) {
            history.shift();
        }

        // Recalculate DNA accuracy if we have enough data
        if (history.length >= this.config.MIN_DRILLS_FOR_ACCURACY) {
            this.recalculateDNAAccuracy(userId);
        }
    }

    /**
     * Handle training session end
     */
    handleSessionEnd(payload) {
        const { userId, sessionId, accuracy, totalQuestions, optimalCount } = payload;

        // Update session-level accuracy
        if (accuracy !== undefined && totalQuestions >= 20) {
            this.updateDNAAccuracy(userId, accuracy);
            this.stats.accuracyUpdates++;
        }

        this.stats.lastSync = new Date().toISOString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 DNA ACCURACY CALCULATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Update DNA accuracy for a user
     */
    updateDNAAccuracy(userId, newAccuracy) {
        const currentAccuracy = this.userDNAAccuracy.get(userId);

        // ═══════════════════════════════════════════════════════════════
        // HARD LAW: Rolling average with recency weighting
        // ═══════════════════════════════════════════════════════════════
        if (currentAccuracy === undefined) {
            this.userDNAAccuracy.set(userId, newAccuracy);
        } else {
            // Weighted average: 70% new, 30% old
            const weighted = (newAccuracy * 0.7) + (currentAccuracy * 0.3);
            this.userDNAAccuracy.set(userId, Math.min(1.0, weighted));
        }

        return this.getDNAAccuracy(userId);
    }

    /**
     * Recalculate DNA accuracy from history
     */
    recalculateDNAAccuracy(userId) {
        const history = this.userAccuracyHistory.get(userId) || [];

        if (history.length === 0) return;

        // Calculate weighted accuracy (recent drills weighted higher)
        let weightedSum = 0;
        let weightTotal = 0;

        for (let i = 0; i < history.length; i++) {
            const weight = 1 + (i / history.length); // Later entries weighted higher
            const accuracy = history[i].isOptimal ? 1.0 : 0.0;

            weightedSum += accuracy * weight;
            weightTotal += weight;
        }

        const calculatedAccuracy = weightedSum / weightTotal;
        this.userDNAAccuracy.set(userId, calculatedAccuracy);
    }

    /**
     * Get DNA accuracy for a user
     */
    getDNAAccuracy(userId) {
        return this.userDNAAccuracy.get(userId) || 0.5; // Default 50% if no data
    }

    /**
     * Get full DNA accuracy metric object
     */
    getDNAAccuracyMetric(userId) {
        const accuracy = this.getDNAAccuracy(userId);
        const history = this.userAccuracyHistory.get(userId) || [];
        const masteryLevels = this.userMasteryState.get(userId);

        return {
            metric: DNA_METRICS.ACCURACY,
            value: accuracy,
            confidence: this.getConfidence(history.length),
            dataPoints: history.length,
            masteredLevels: masteryLevels ? masteryLevels.size : 0,
            meetsThreshold: accuracy >= this.config.MASTERY_THRESHOLD
        };
    }

    /**
     * Get confidence level
     */
    getConfidence(dataPoints) {
        if (dataPoints < 20) return 'LOW';
        if (dataPoints < 50) return 'MEDIUM';
        if (dataPoints < 100) return 'HIGH';
        return 'VERY_HIGH';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📡 EVENT EMITTER
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        if (Array.isArray(this.eventHandlers.get(event))) {
            this.eventHandlers.get(event).push(handler);
        } else {
            this.eventHandlers.set(event, [handler]);
        }
    }

    /**
     * Emit event
     */
    emit(event, payload) {
        const handlers = this.eventHandlers.get(event);
        if (handlers && Array.isArray(handlers)) {
            for (const handler of handlers) {
                try {
                    handler(payload);
                } catch (err) {
                    console.warn(`🛰️ Event handler error: ${err.message}`);
                }
            }
        }

        // Also broadcast to bus
        this.sendMessage({
            type: event.toUpperCase(),
            source: 'DNA_MASTERY_SYNC',
            payload
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 QUERY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get user's complete mastery state
     */
    getUserMasteryState(userId) {
        const mastery = this.userMasteryState.get(userId);
        const accuracy = this.getDNAAccuracyMetric(userId);

        return {
            userId,
            accuracy,
            masteredLevels: mastery ? Array.from(mastery.entries()) : [],
            isActive: this.userAccuracyHistory.has(userId)
        };
    }

    /**
     * Check if user has achieved 85% on a level
     */
    hasAchievedMastery(userId, levelId) {
        const mastery = this.userMasteryState.get(userId);
        if (!mastery) return false;

        const levelMastery = mastery.get(levelId);
        return levelMastery && levelMastery.accuracy >= this.config.MASTERY_THRESHOLD;
    }

    /**
     * Get highest mastered level
     */
    getHighestMasteredLevel(userId) {
        const mastery = this.userMasteryState.get(userId);
        if (!mastery) return 0;

        let highest = 0;
        for (const [key, value] of mastery.entries()) {
            if (typeof key === 'number' && key > highest) {
                highest = key;
            }
        }
        return highest;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 STATISTICS
    // ═══════════════════════════════════════════════════════════════════════

    getStats() {
        return {
            ...this.stats,
            status: this.status,
            usersTracked: this.userDNAAccuracy.size,
            totalMasteryRecords: Array.from(this.userMasteryState.values())
                .reduce((sum, m) => sum + m.size, 0)
        };
    }

    getStatus() {
        return {
            status: this.status,
            connected: this.status === SYNC_STATUS.CONNECTED,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export function createMasteryBusSync(options = {}) {
    return new MasteryBusSync(options);
}

export { MASTERY_BUS_CONFIG, SYNC_STATUS };

export default MasteryBusSync;
