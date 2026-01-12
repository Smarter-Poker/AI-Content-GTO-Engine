/**
 * 🛰️ GREEN_PRODUCTION_HARDENING: TASK_23
 * ═══════════════════════════════════════════════════════════════════════════
 * THE 85% MASTERY SEAL
 * 
 * Hard-coded Level_Unlock_Logic: No user can access Level 2+ without
 * a mastery_signed_token generated upon hitting 85% accuracy.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 HARD LAW: 85% MASTERY SEAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MASTERY_SEAL_CONFIG = {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔐 HARD LAW: 85% accuracy required for level unlock
    // ═══════════════════════════════════════════════════════════════════════
    MASTERY_THRESHOLD: 0.85,

    // Minimum questions before mastery can be evaluated
    MIN_QUESTIONS: 20,

    // Token validity period (24 hours)
    TOKEN_VALIDITY_MS: 24 * 60 * 60 * 1000,

    // Signing algorithm
    SIGNING_ALGORITHM: 'sha256',

    // Token version for migration support
    TOKEN_VERSION: 'v1',

    // Level 1 is always accessible (starting level)
    STARTING_LEVEL: 1
};

const SEAL_STATUS = {
    GRANTED: 'GRANTED',
    DENIED_LOW_ACCURACY: 'DENIED_LOW_ACCURACY',
    DENIED_INSUFFICIENT_QUESTIONS: 'DENIED_INSUFFICIENT_QUESTIONS',
    DENIED_TOKEN_EXPIRED: 'DENIED_TOKEN_EXPIRED',
    DENIED_INVALID_TOKEN: 'DENIED_INVALID_TOKEN',
    DENIED_LEVEL_LOCKED: 'DENIED_LEVEL_LOCKED'
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 MASTERY SEAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class MasterySealEngine {
    constructor(options = {}) {
        this.config = { ...MASTERY_SEAL_CONFIG, ...options.config };
        this.secretKey = options.secretKey || process.env.MASTERY_SEAL_SECRET || 'gto-mastery-seal-2024';

        // Token cache for validation
        this.tokenCache = new Map();

        // User mastery state
        this.userMasteryState = new Map();

        console.log('🔐 MasterySealEngine initialized (TASK_23: 85% Mastery Seal)');
        console.log(`   Threshold: ${this.config.MASTERY_THRESHOLD * 100}%`);
        console.log(`   Min Questions: ${this.config.MIN_QUESTIONS}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 CORE MASTERY CHECK
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if user has achieved mastery for a level
     * HARD LAW: 85% accuracy + minimum 20 questions
     */
    checkMastery(userId, levelId, correctAnswers, totalAnswers) {
        // Calculate accuracy
        const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 HARD LAW CHECK 1: Minimum questions
        // ═══════════════════════════════════════════════════════════════════
        if (totalAnswers < this.config.MIN_QUESTIONS) {
            return {
                achieved: false,
                status: SEAL_STATUS.DENIED_INSUFFICIENT_QUESTIONS,
                accuracy: (accuracy * 100).toFixed(2),
                questions_answered: totalAnswers,
                questions_required: this.config.MIN_QUESTIONS,
                questions_remaining: this.config.MIN_QUESTIONS - totalAnswers,
                message: `Need ${this.config.MIN_QUESTIONS - totalAnswers} more questions`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 HARD LAW CHECK 2: 85% accuracy threshold
        // ═══════════════════════════════════════════════════════════════════
        if (accuracy < this.config.MASTERY_THRESHOLD) {
            return {
                achieved: false,
                status: SEAL_STATUS.DENIED_LOW_ACCURACY,
                accuracy: (accuracy * 100).toFixed(2),
                accuracy_required: (this.config.MASTERY_THRESHOLD * 100).toFixed(0),
                accuracy_gap: ((this.config.MASTERY_THRESHOLD - accuracy) * 100).toFixed(2),
                message: `Need ${((this.config.MASTERY_THRESHOLD - accuracy) * 100).toFixed(1)}% more accuracy`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // ✅ MASTERY ACHIEVED — Generate signed token
        // ═══════════════════════════════════════════════════════════════════
        const token = this.generateMasteryToken(userId, levelId, accuracy);

        // Store mastery state
        this.userMasteryState.set(`${userId}:${levelId}`, {
            achieved: true,
            accuracy,
            achieved_at: new Date().toISOString(),
            token
        });

        return {
            achieved: true,
            status: SEAL_STATUS.GRANTED,
            accuracy: (accuracy * 100).toFixed(2),
            level_id: levelId,
            next_level_unlocked: levelId + 1,
            mastery_signed_token: token,
            message: `🏆 Mastery achieved! Level ${levelId + 1} unlocked!`
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 TOKEN GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Generate cryptographically signed mastery token
     */
    generateMasteryToken(userId, levelId, accuracy) {
        const timestamp = Date.now();
        const expiresAt = timestamp + this.config.TOKEN_VALIDITY_MS;

        // Token payload
        const payload = {
            v: this.config.TOKEN_VERSION,
            u: userId,
            l: levelId,
            nl: levelId + 1, // Next level unlocked
            a: Math.floor(accuracy * 10000), // Accuracy as integer (4 decimal precision)
            t: timestamp,
            e: expiresAt
        };

        // Stringify and encode
        const payloadStr = JSON.stringify(payload);
        const payloadBase64 = Buffer.from(payloadStr).toString('base64url');

        // Generate signature
        const signature = this.signPayload(payloadBase64);

        // Full token: payload.signature
        const token = `${payloadBase64}.${signature}`;

        // Cache for validation
        this.tokenCache.set(token, { payload, expiresAt });

        return token;
    }

    /**
     * Sign payload with HMAC
     */
    signPayload(payload) {
        const hmac = crypto.createHmac(this.config.SIGNING_ALGORITHM, this.secretKey);
        hmac.update(payload);
        return hmac.digest('base64url');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 TOKEN VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate mastery token for level access
     * HARD LAW: No Level 2+ access without valid mastery_signed_token
     */
    validateToken(token) {
        try {
            const [payloadBase64, signature] = token.split('.');

            if (!payloadBase64 || !signature) {
                return { valid: false, status: SEAL_STATUS.DENIED_INVALID_TOKEN };
            }

            // Verify signature
            const expectedSignature = this.signPayload(payloadBase64);
            if (signature !== expectedSignature) {
                return { valid: false, status: SEAL_STATUS.DENIED_INVALID_TOKEN };
            }

            // Decode payload
            const payloadStr = Buffer.from(payloadBase64, 'base64url').toString();
            const payload = JSON.parse(payloadStr);

            // Check expiration
            if (Date.now() > payload.e) {
                return {
                    valid: false,
                    status: SEAL_STATUS.DENIED_TOKEN_EXPIRED,
                    expired_at: new Date(payload.e).toISOString()
                };
            }

            return {
                valid: true,
                status: SEAL_STATUS.GRANTED,
                user_id: payload.u,
                level_completed: payload.l,
                next_level_unlocked: payload.nl,
                accuracy: payload.a / 10000,
                issued_at: new Date(payload.t).toISOString(),
                expires_at: new Date(payload.e).toISOString()
            };

        } catch (error) {
            return {
                valid: false,
                status: SEAL_STATUS.DENIED_INVALID_TOKEN,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔐 LEVEL ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if user can access a level
     * HARD LAW: Requires valid mastery token for Level 2+
     */
    canAccessLevel(userId, targetLevel, masteryToken = null) {
        // Level 1 is always accessible
        if (targetLevel <= this.config.STARTING_LEVEL) {
            return {
                allowed: true,
                level: targetLevel,
                status: SEAL_STATUS.GRANTED,
                message: 'Level 1 is always accessible'
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 HARD LAW: Level 2+ requires mastery_signed_token
        // ═══════════════════════════════════════════════════════════════════

        // Check cached mastery state first
        const previousLevel = targetLevel - 1;
        const masteryState = this.userMasteryState.get(`${userId}:${previousLevel}`);

        if (masteryState?.achieved) {
            // Validate the stored token
            const validation = this.validateToken(masteryState.token);
            if (validation.valid) {
                return {
                    allowed: true,
                    level: targetLevel,
                    status: SEAL_STATUS.GRANTED,
                    previous_mastery: {
                        level: previousLevel,
                        accuracy: (masteryState.accuracy * 100).toFixed(2)
                    }
                };
            }
        }

        // Check provided token
        if (masteryToken) {
            const validation = this.validateToken(masteryToken);

            if (validation.valid && validation.next_level_unlocked >= targetLevel) {
                return {
                    allowed: true,
                    level: targetLevel,
                    status: SEAL_STATUS.GRANTED,
                    token_verification: 'VALID'
                };
            }

            return {
                allowed: false,
                level: targetLevel,
                status: validation.status,
                message: `Token validation failed: ${validation.status}`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🚫 ACCESS DENIED — No valid mastery proof
        // ═══════════════════════════════════════════════════════════════════
        return {
            allowed: false,
            level: targetLevel,
            status: SEAL_STATUS.DENIED_LEVEL_LOCKED,
            message: `🔐 Level ${targetLevel} locked. Complete Level ${previousLevel} with 85%+ accuracy.`,
            requirement: {
                level_to_complete: previousLevel,
                accuracy_required: this.config.MASTERY_THRESHOLD * 100,
                min_questions: this.config.MIN_QUESTIONS
            }
        };
    }

    /**
     * Get user's highest unlocked level
     */
    getUnlockedLevels(userId) {
        const unlockedLevels = [1]; // Level 1 always unlocked

        for (let level = 1; level <= 10; level++) {
            const state = this.userMasteryState.get(`${userId}:${level}`);
            if (state?.achieved) {
                unlockedLevels.push(level + 1);
            }
        }

        return {
            user_id: userId,
            unlocked_levels: [...new Set(unlockedLevels)].sort((a, b) => a - b),
            highest_unlocked: Math.max(...unlockedLevels),
            mastery_states: Object.fromEntries(
                [...this.userMasteryState.entries()]
                    .filter(([key]) => key.startsWith(userId))
                    .map(([key, val]) => [key.split(':')[1], {
                        accuracy: (val.accuracy * 100).toFixed(2),
                        achieved_at: val.achieved_at
                    }])
            )
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createMasterySealEngine(options = {}) {
    return new MasterySealEngine(options);
}

export { MASTERY_SEAL_CONFIG, SEAL_STATUS };

export default MasterySealEngine;
