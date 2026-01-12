/**
 * 🛰️ GREEN_PRODUCTION_HARDENING: TASK_24
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTO CONTENT HYDRATION V3
 * 
 * AI Prompt Templates for daily A+ content generation.
 * Ensures GTO + 2 Alternate Lines are natively generated in JSON format.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 CONTENT HYDRATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const HYDRATION_CONFIG = {
    // Daily generation target
    DAILY_DRILLS_PER_LEVEL: 20,

    // ═══════════════════════════════════════════════════════════════════════
    // 🔐 HARD LAW: GTO + 2 Alternates required
    // ═══════════════════════════════════════════════════════════════════════
    REQUIRED_GTO_SOLUTIONS: 1,
    REQUIRED_ALTERNATE_LINES: 2,

    // Generation quality gate
    QUALITY_THRESHOLD: 'A+',

    // Output format
    OUTPUT_FORMAT: 'JSON',

    // Solver reference
    SOLVER_SOURCE: 'PioSolver',

    // Scenario complexity by level
    LEVEL_COMPLEXITY: {
        1: { complexity: 'BASIC', streets: ['PREFLOP'], scenarios: ['OPEN_RAISE', 'COLD_CALL'] },
        2: { complexity: 'BASIC', streets: ['PREFLOP', 'FLOP'], scenarios: ['CBET_IP', 'CBET_OOP'] },
        3: { complexity: 'INTERMEDIATE', streets: ['PREFLOP', 'FLOP'], scenarios: ['CBET_SIZING', 'CHECK_RAISE'] },
        4: { complexity: 'INTERMEDIATE', streets: ['PREFLOP', 'FLOP', 'TURN'], scenarios: ['DEFENSE', 'FLOAT'] },
        5: { complexity: 'ADVANCED', streets: ['PREFLOP', 'FLOP', 'TURN'], scenarios: ['MULTI_STREET', 'PROBE'] },
        6: { complexity: 'ADVANCED', streets: ['ALL'], scenarios: ['TEXTURE_ANALYSIS', 'RANGE_ADVANTAGE'] },
        7: { complexity: 'EXPERT', streets: ['ALL'], scenarios: ['MIXED_STRATEGY', 'FREQUENCY'] },
        8: { complexity: 'EXPERT', streets: ['ALL'], scenarios: ['EXPLOIT', 'POPULATION_READ'] },
        9: { complexity: 'ELITE', streets: ['ALL'], scenarios: ['ICM', 'SHORT_STACK', 'BUBBLE'] },
        10: { complexity: 'ELITE', streets: ['ALL'], scenarios: ['BOSS_MODE', 'ALL_CONCEPTS'] }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 AI PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const AI_PROMPT_TEMPLATES = {
    /**
     * Master prompt for generating GTO drills
     */
    MASTER_DRILL_GENERATION: `
You are a world-class GTO poker strategist and content creator for Smarter.Poker.
Your task is to generate high-quality training drills that teach GTO (Game Theory Optimal) poker strategy.

═══════════════════════════════════════════════════════════════════════
🔐 HARD LAWS (MUST BE FOLLOWED):
═══════════════════════════════════════════════════════════════════════

1. **GTO PRIMARY**: Every drill MUST have exactly ONE GTO-optimal solution with EV > 0
2. **ALTERNATES**: Every drill MUST have exactly 2 alternate lines (ALT_SIMPLE and ALT_EXPLOIT)
3. **REASONING**: Every solution MUST include educational reasoning explaining WHY
4. **ACCURACY**: All EV values must be realistic and solver-verified
5. **FORMAT**: Output MUST be valid JSON matching the schema below

═══════════════════════════════════════════════════════════════════════
📊 OUTPUT JSON SCHEMA:
═══════════════════════════════════════════════════════════════════════

{
  "drill": {
    "id": "string (UUID format)",
    "level_id": number,
    "drill_code": "string (unique identifier)",
    "scenario_type": "string",
    "difficulty": "BASIC|INTERMEDIATE|ADVANCED|EXPERT|ELITE",
    "street": "PREFLOP|FLOP|TURN|RIVER",
    "board": {
      "flop": ["As", "Kh", "7d"],
      "turn": "2c",
      "river": "9s"
    },
    "hero": {
      "position": "BTN|CO|HJ|LJ|SB|BB",
      "hand": ["Ah", "Kd"],
      "stack_bb": number
    },
    "villain": {
      "position": "string",
      "stack_bb": number,
      "player_type": "UNKNOWN|TAG|LAG|NIT|FISH"
    },
    "pot_size_bb": number,
    "to_call_bb": number,
    "action_prompt": "string describing the decision point"
  },
  "solutions": [
    {
      "solution_type": "GTO_PRIMARY",
      "action": "string (e.g., 'RAISE 2.5x', 'CALL', 'FOLD')",
      "action_category": "FOLD|CHECK|CALL|BET|RAISE|ALL_IN",
      "sizing": "string or null",
      "ev": number (MUST be > 0 for GTO_PRIMARY),
      "ev_bb": number,
      "frequency": number (0-1 for mixed strategies),
      "is_optimal": true,
      "reasoning": "string explaining WHY this is optimal"
    },
    {
      "solution_type": "ALT_SIMPLE",
      "action": "string",
      "action_category": "FOLD|CHECK|CALL|BET|RAISE|ALL_IN",
      "sizing": "string or null",
      "ev": number,
      "ev_bb": number,
      "frequency": number,
      "is_optimal": false,
      "reasoning": "string explaining this simplified alternative"
    },
    {
      "solution_type": "ALT_EXPLOIT",
      "action": "string",
      "action_category": "FOLD|CHECK|CALL|BET|RAISE|ALL_IN",
      "sizing": "string or null",
      "ev": number,
      "ev_bb": number,
      "frequency": number,
      "is_optimal": false,
      "reasoning": "string explaining this exploitative adjustment"
    }
  ],
  "metadata": {
    "quality_grade": "A+",
    "solver_source": "PioSolver",
    "generated_at": "ISO timestamp",
    "concepts_tested": ["array of concept tags"]
  }
}
`.trim(),

    /**
     * Level-specific prompt extensions
     */
    LEVEL_CONTEXT: (levelId) => {
        const config = HYDRATION_CONFIG.LEVEL_COMPLEXITY[levelId] || HYDRATION_CONFIG.LEVEL_COMPLEXITY[1];
        return `
═══════════════════════════════════════════════════════════════════════
📊 LEVEL ${levelId} REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════

Complexity: ${config.complexity}
Streets to use: ${config.streets.join(', ')}
Scenario types: ${config.scenarios.join(', ')}

Generate scenarios appropriate for a ${config.complexity} level student.
${levelId >= 7 ? 'Include mixed strategy frequencies where applicable.' : ''}
${levelId >= 9 ? 'Include ICM considerations for tournament play.' : ''}
${levelId === 10 ? 'This is BOSS MODE - use the most challenging and nuanced scenarios.' : ''}
`.trim();
    },

    /**
     * Batch generation prompt
     */
    BATCH_GENERATION: (levelId, count) => `
Generate ${count} unique GTO training drills for Level ${levelId}.

Each drill must:
1. Be completely unique (no duplicate scenarios)
2. Cover different aspects of ${HYDRATION_CONFIG.LEVEL_COMPLEXITY[levelId]?.scenarios.join(', ') || 'general play'}
3. Have varied board textures (wet, dry, paired, monotone, etc.)
4. Include realistic stack sizes (50-200bb for cash, varied for tournaments)

Return as a JSON array of drill objects following the schema.
`.trim()
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 CONTENT HYDRATION ENGINE V3
// ═══════════════════════════════════════════════════════════════════════════════

export class ContentHydrationV3 {
    constructor(options = {}) {
        this.config = { ...HYDRATION_CONFIG, ...options.config };
        this.aiProvider = options.aiProvider || null; // OpenAI, Claude, etc.

        // Generation stats
        this.generationLog = [];
        this.dailyStats = {
            date: new Date().toISOString().split('T')[0],
            generated: 0,
            validated: 0,
            rejected: 0
        };

        console.log('🌊 ContentHydrationV3 initialized (TASK_24: AI Prompt Templates)');
        console.log(`   Daily target: ${this.config.DAILY_DRILLS_PER_LEVEL} drills/level`);
        console.log(`   Quality gate: ${this.config.QUALITY_THRESHOLD}`);
    }

    /**
     * Get master prompt for drill generation
     */
    getMasterPrompt() {
        return AI_PROMPT_TEMPLATES.MASTER_DRILL_GENERATION;
    }

    /**
     * Get level-specific context
     */
    getLevelContext(levelId) {
        return AI_PROMPT_TEMPLATES.LEVEL_CONTEXT(levelId);
    }

    /**
     * Build complete prompt for AI generation
     */
    buildGenerationPrompt(levelId, count = 1) {
        const systemPrompt = this.getMasterPrompt();
        const levelContext = this.getLevelContext(levelId);
        const batchInstructions = AI_PROMPT_TEMPLATES.BATCH_GENERATION(levelId, count);

        return {
            system: systemPrompt,
            context: levelContext,
            instructions: batchInstructions,
            full_prompt: `${systemPrompt}\n\n${levelContext}\n\n${batchInstructions}`
        };
    }

    /**
     * Validate generated content meets Hard Laws
     */
    validateGeneratedContent(content) {
        const errors = [];

        try {
            const data = typeof content === 'string' ? JSON.parse(content) : content;
            const drills = Array.isArray(data) ? data : [data];

            for (const drill of drills) {
                const solutions = drill.solutions || [];

                // ═══════════════════════════════════════════════════════════════
                // 🔐 HARD LAW 1: GTO_PRIMARY with EV > 0
                // ═══════════════════════════════════════════════════════════════
                const gto = solutions.find(s => s.solution_type === 'GTO_PRIMARY');
                if (!gto) {
                    errors.push({ drill_id: drill.drill?.id, error: 'MISSING_GTO_PRIMARY' });
                } else if (gto.ev <= 0) {
                    errors.push({ drill_id: drill.drill?.id, error: 'GTO_EV_NOT_POSITIVE', ev: gto.ev });
                }

                // ═══════════════════════════════════════════════════════════════
                // 🔐 HARD LAW 2: 2 Alternate lines
                // ═══════════════════════════════════════════════════════════════
                const alternates = solutions.filter(s =>
                    s.solution_type === 'ALT_SIMPLE' || s.solution_type === 'ALT_EXPLOIT'
                );
                if (alternates.length < this.config.REQUIRED_ALTERNATE_LINES) {
                    errors.push({
                        drill_id: drill.drill?.id,
                        error: 'INSUFFICIENT_ALTERNATES',
                        found: alternates.length,
                        required: this.config.REQUIRED_ALTERNATE_LINES
                    });
                }

                // ═══════════════════════════════════════════════════════════════
                // 🔐 HARD LAW 3: Reasoning required
                // ═══════════════════════════════════════════════════════════════
                for (const solution of solutions) {
                    if (!solution.reasoning || solution.reasoning.trim() === '') {
                        errors.push({
                            drill_id: drill.drill?.id,
                            error: 'MISSING_REASONING',
                            action: solution.action
                        });
                    }
                }
            }

            return {
                valid: errors.length === 0,
                drills_count: drills.length,
                errors,
                passed: drills.length - new Set(errors.map(e => e.drill_id)).size
            };

        } catch (e) {
            return {
                valid: false,
                errors: [{ error: 'PARSE_ERROR', message: e.message }],
                passed: 0
            };
        }
    }

    /**
     * Generate content using AI provider
     */
    async generateDrills(levelId, count = 20) {
        const prompt = this.buildGenerationPrompt(levelId, count);

        // If AI provider available, use it
        if (this.aiProvider) {
            try {
                const response = await this.aiProvider.generate(prompt.full_prompt);
                const validation = this.validateGeneratedContent(response);

                this.logGeneration(levelId, count, validation);
                return { content: response, validation };
            } catch (e) {
                return { error: e.message, validation: { valid: false } };
            }
        }

        // Mock generation
        return this.mockGenerateDrills(levelId, count);
    }

    /**
     * Mock drill generation for testing
     */
    mockGenerateDrills(levelId, count) {
        const drills = [];
        const config = this.config.LEVEL_COMPLEXITY[levelId] || this.config.LEVEL_COMPLEXITY[1];

        for (let i = 0; i < count; i++) {
            const drillId = `drill_${levelId}_${Date.now()}_${i}`;

            drills.push({
                drill: {
                    id: drillId,
                    level_id: levelId,
                    drill_code: `L${levelId}_D${i + 1}`,
                    scenario_type: config.scenarios[i % config.scenarios.length],
                    difficulty: config.complexity,
                    street: config.streets[i % config.streets.length],
                    board: {
                        flop: ['As', 'Kh', '7d'],
                        turn: i % 2 === 0 ? '2c' : null,
                        river: null
                    },
                    hero: {
                        position: ['BTN', 'CO', 'HJ', 'SB', 'BB'][i % 5],
                        hand: ['Ah', 'Kd'],
                        stack_bb: 100
                    },
                    villain: {
                        position: 'BB',
                        stack_bb: 100,
                        player_type: 'UNKNOWN'
                    },
                    pot_size_bb: 6.5,
                    to_call_bb: 0,
                    action_prompt: 'Hero to act on the flop in position'
                },
                solutions: [
                    {
                        solution_type: 'GTO_PRIMARY',
                        action: 'BET 33%',
                        action_category: 'BET',
                        sizing: '33',
                        ev: 0.15 + (Math.random() * 0.1),
                        ev_bb: 2.15,
                        frequency: 0.67,
                        is_optimal: true,
                        reasoning: 'GTO dictates a c-bet at 33% pot on this dry texture with range advantage.'
                    },
                    {
                        solution_type: 'ALT_SIMPLE',
                        action: 'CHECK',
                        action_category: 'CHECK',
                        sizing: null,
                        ev: 0.08,
                        ev_bb: 0.52,
                        frequency: 0.33,
                        is_optimal: false,
                        reasoning: 'Checking preserves pot control and traps villain with disguised strong hands.'
                    },
                    {
                        solution_type: 'ALT_EXPLOIT',
                        action: 'BET 75%',
                        action_category: 'BET',
                        sizing: '75',
                        ev: 0.12,
                        ev_bb: 1.56,
                        frequency: 0,
                        is_optimal: false,
                        reasoning: 'Larger sizing exploits opponents who overcall or chase draws at incorrect odds.'
                    }
                ],
                metadata: {
                    quality_grade: 'A+',
                    solver_source: 'PioSolver',
                    generated_at: new Date().toISOString(),
                    concepts_tested: [config.scenarios[i % config.scenarios.length], 'POSITION', 'SIZING']
                }
            });
        }

        const validation = this.validateGeneratedContent(drills);
        this.logGeneration(levelId, count, validation);

        return {
            content: drills,
            validation,
            prompt_used: this.buildGenerationPrompt(levelId, count)
        };
    }

    /**
     * Log generation attempt
     */
    logGeneration(levelId, count, validation) {
        this.generationLog.push({
            timestamp: new Date().toISOString(),
            level_id: levelId,
            requested: count,
            passed: validation.passed || 0,
            errors: validation.errors?.length || 0
        });

        this.dailyStats.generated += count;
        this.dailyStats.validated += validation.passed || 0;
        this.dailyStats.rejected += (validation.errors?.length || 0);
    }

    /**
     * Get output format spec for API integration
     */
    getOutputFormatSpec() {
        return {
            format: this.config.OUTPUT_FORMAT,
            schema_version: '3.0',
            required_fields: [
                'drill.id',
                'drill.level_id',
                'solutions[].solution_type',
                'solutions[].action',
                'solutions[].ev',
                'solutions[].reasoning'
            ],
            hard_laws: [
                'GTO_PRIMARY.ev > 0',
                'solutions.length >= 3',
                'alternates.length >= 2'
            ]
        };
    }

    /**
     * Get daily stats
     */
    getDailyStats() {
        return {
            ...this.dailyStats,
            success_rate: this.dailyStats.generated > 0
                ? ((this.dailyStats.validated / this.dailyStats.generated) * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createContentHydrationV3(options = {}) {
    return new ContentHydrationV3(options);
}

export { HYDRATION_CONFIG, AI_PROMPT_TEMPLATES };

export default ContentHydrationV3;
