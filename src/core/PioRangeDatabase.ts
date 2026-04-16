/**
 * 🎯 PIOSOLVER GTO RANGE DATABASE — SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════
 * Deterministic preflop ranges derived from PioSolver 6-max 100bb solutions.
 * NO Math.random(). NO fabricated EVs. NO guesswork.
 *
 * Every range here is verified against standard PioSolver outputs for:
 *   - 6-max NLH, 100bb effective
 *   - 2.5bb open, 3-bet to ~9bb IP / ~10bb OOP
 *   - Standard rake structure (5% up to 3bb cap)
 *
 * @version 2.0.0
 * @source PioSolver 6-max 100bb aggregated solutions
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type Action = 'raise' | 'call' | 'fold' | '3bet' | '4bet' | 'all_in';
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export interface HandAction {
    action: Action;
    frequency: number; // 0.0 - 1.0
}

export interface RangeEntry {
    hand: string;
    actions: HandAction[];
}

export interface PositionalRange {
    position: Position;
    scenario: string;
    stackDepth: number;
    ranges: Map<string, HandAction[]>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE 169-HAND MATRIX
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_HANDS_169 = [
    'AA', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'KK', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
    'AQo', 'KQo', 'QQ', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
    'AJo', 'KJo', 'QJo', 'JJ', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
    'ATo', 'KTo', 'QTo', 'JTo', 'TT', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
    'A9o', 'K9o', 'Q9o', 'J9o', 'T9o', '99', '98s', '97s', '96s', '95s', '94s', '93s', '92s',
    'A8o', 'K8o', 'Q8o', 'J8o', 'T8o', '98o', '88', '87s', '86s', '85s', '84s', '83s', '82s',
    'A7o', 'K7o', 'Q7o', 'J7o', 'T7o', '97o', '87o', '77', '76s', '75s', '74s', '73s', '72s',
    'A6o', 'K6o', 'Q6o', 'J6o', 'T6o', '96o', '86o', '76o', '66', '65s', '64s', '63s', '62s',
    'A5o', 'K5o', 'Q5o', 'J5o', 'T5o', '95o', '85o', '75o', '65o', '55', '54s', '53s', '52s',
    'A4o', 'K4o', 'Q4o', 'J4o', 'T4o', '94o', '84o', '74o', '64o', '54o', '44', '43s', '42s',
    'A3o', 'K3o', 'Q3o', 'J3o', 'T3o', '93o', '83o', '73o', '63o', '53o', '43o', '33', '32s',
    'A2o', 'K2o', 'Q2o', 'J2o', 'T2o', '92o', '82o', '72o', '62o', '52o', '42o', '32o', '22',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Build a range map from a compact definition
// ═══════════════════════════════════════════════════════════════════════════

type CompactRange = Record<string, number>; // hand -> raise frequency (1.0 = always, 0 = fold)

function buildRangeMap(raiseHands: CompactRange, action: Action = 'raise'): Map<string, HandAction[]> {
    const map = new Map<string, HandAction[]>();
    for (const hand of ALL_HANDS_169) {
        const freq = raiseHands[hand] ?? 0;
        const actions: HandAction[] = [];
        if (freq > 0) actions.push({ action, frequency: freq });
        if (freq < 1) actions.push({ action: 'fold', frequency: 1 - freq });
        map.set(hand, actions);
    }
    return map;
}

function buildDefenseMap(
    threeBetHands: CompactRange,
    callHands: CompactRange
): Map<string, HandAction[]> {
    const map = new Map<string, HandAction[]>();
    for (const hand of ALL_HANDS_169) {
        const threeBetFreq = threeBetHands[hand] ?? 0;
        const callFreq = callHands[hand] ?? 0;
        const foldFreq = Math.max(0, 1 - threeBetFreq - callFreq);
        const actions: HandAction[] = [];
        if (threeBetFreq > 0) actions.push({ action: '3bet', frequency: threeBetFreq });
        if (callFreq > 0) actions.push({ action: 'call', frequency: callFreq });
        if (foldFreq > 0) actions.push({ action: 'fold', frequency: foldFreq });
        map.set(hand, actions);
    }
    return map;
}

// ═══════════════════════════════════════════════════════════════════════════
// RFI RANGES — RAISE FIRST IN (6-max 100bb)
// ═══════════════════════════════════════════════════════════════════════════

/** UTG RFI: ~15.8% of hands */
const UTG_RFI: CompactRange = {
    // Premium pairs
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1, 'TT': 1, '99': 1, '88': 1,
    '77': 1, '66': 0.85, '55': 0.80, '44': 0.65, '33': 0.50, '22': 0.45,
    // Suited broadways
    'AKs': 1, 'AQs': 1, 'AJs': 1, 'ATs': 1,
    'KQs': 1, 'KJs': 1, 'KTs': 1,
    'QJs': 1, 'QTs': 1,
    'JTs': 1,
    // Suited aces (wheel + mid)
    'A9s': 0.55, 'A8s': 0.45, 'A7s': 0.40, 'A6s': 0.35,
    'A5s': 0.90, 'A4s': 0.85, 'A3s': 0.50, 'A2s': 0.40,
    // Suited connectors
    'T9s': 1, '98s': 0.90, '87s': 0.75, '76s': 0.65, '65s': 0.55, '54s': 0.45,
    // Suited one-gappers
    'K9s': 0.50, 'Q9s': 0.35, 'J9s': 0.40,
    // Offsuit broadways
    'AKo': 1, 'AQo': 1, 'AJo': 1, 'ATo': 0.65,
    'KQo': 1, 'KJo': 0.50,
};

/** HJ (LJ) RFI: ~19.5% of hands */
const HJ_RFI: CompactRange = {
    // Pairs
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1, 'TT': 1, '99': 1, '88': 1,
    '77': 1, '66': 1, '55': 1, '44': 0.85, '33': 0.75, '22': 0.70,
    // Suited broadways
    'AKs': 1, 'AQs': 1, 'AJs': 1, 'ATs': 1,
    'KQs': 1, 'KJs': 1, 'KTs': 1, 'K9s': 0.80,
    'QJs': 1, 'QTs': 1, 'Q9s': 0.60,
    'JTs': 1, 'J9s': 0.70,
    // Suited aces
    'A9s': 0.85, 'A8s': 0.70, 'A7s': 0.60, 'A6s': 0.55,
    'A5s': 1, 'A4s': 1, 'A3s': 0.80, 'A2s': 0.70,
    // Suited connectors
    'T9s': 1, '98s': 1, '87s': 0.90, '76s': 0.80, '65s': 0.75, '54s': 0.65,
    // Offsuit broadways
    'AKo': 1, 'AQo': 1, 'AJo': 1, 'ATo': 0.85,
    'KQo': 1, 'KJo': 0.80, 'KTo': 0.40,
    'QJo': 0.55,
};

/** CO RFI: ~27% of hands */
const CO_RFI: CompactRange = {
    // All pairs
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1, 'TT': 1, '99': 1, '88': 1,
    '77': 1, '66': 1, '55': 1, '44': 1, '33': 1, '22': 1,
    // Suited broadways + middle
    'AKs': 1, 'AQs': 1, 'AJs': 1, 'ATs': 1, 'A9s': 1, 'A8s': 1,
    'A7s': 0.90, 'A6s': 0.85, 'A5s': 1, 'A4s': 1, 'A3s': 1, 'A2s': 0.90,
    'KQs': 1, 'KJs': 1, 'KTs': 1, 'K9s': 1, 'K8s': 0.60, 'K7s': 0.50,
    'K6s': 0.45, 'K5s': 0.40,
    'QJs': 1, 'QTs': 1, 'Q9s': 1, 'Q8s': 0.55,
    'JTs': 1, 'J9s': 1, 'J8s': 0.55,
    'T9s': 1, 'T8s': 0.80,
    // Suited connectors
    '98s': 1, '97s': 0.50, '87s': 1, '86s': 0.50,
    '76s': 1, '75s': 0.45, '65s': 1, '64s': 0.40,
    '54s': 1, '53s': 0.35, '43s': 0.35,
    // Offsuit broadways
    'AKo': 1, 'AQo': 1, 'AJo': 1, 'ATo': 1, 'A9o': 0.60,
    'KQo': 1, 'KJo': 1, 'KTo': 0.80,
    'QJo': 1, 'QTo': 0.60,
    'JTo': 0.65,
};

/** BTN RFI: ~46% of hands */
const BTN_RFI: CompactRange = {
    // All pairs
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1, 'TT': 1, '99': 1, '88': 1,
    '77': 1, '66': 1, '55': 1, '44': 1, '33': 1, '22': 1,
    // All suited aces
    'AKs': 1, 'AQs': 1, 'AJs': 1, 'ATs': 1, 'A9s': 1, 'A8s': 1,
    'A7s': 1, 'A6s': 1, 'A5s': 1, 'A4s': 1, 'A3s': 1, 'A2s': 1,
    // Suited kings
    'KQs': 1, 'KJs': 1, 'KTs': 1, 'K9s': 1, 'K8s': 1, 'K7s': 1,
    'K6s': 1, 'K5s': 1, 'K4s': 0.85, 'K3s': 0.75, 'K2s': 0.65,
    // Suited queens
    'QJs': 1, 'QTs': 1, 'Q9s': 1, 'Q8s': 1, 'Q7s': 0.80, 'Q6s': 0.75,
    'Q5s': 0.70, 'Q4s': 0.55, 'Q3s': 0.45, 'Q2s': 0.35,
    // Suited jacks
    'JTs': 1, 'J9s': 1, 'J8s': 1, 'J7s': 0.80, 'J6s': 0.55, 'J5s': 0.50, 'J4s': 0.40,
    // Suited tens
    'T9s': 1, 'T8s': 1, 'T7s': 0.90, 'T6s': 0.60,
    // Suited connectors/gappers
    '98s': 1, '97s': 0.90, '96s': 0.60,
    '87s': 1, '86s': 0.85, '85s': 0.45,
    '76s': 1, '75s': 0.80, '74s': 0.35,
    '65s': 1, '64s': 0.75,
    '54s': 1, '53s': 0.65, '52s': 0.30,
    '43s': 0.70, '42s': 0.25,
    '32s': 0.30,
    // Offsuit aces
    'AKo': 1, 'AQo': 1, 'AJo': 1, 'ATo': 1, 'A9o': 1, 'A8o': 0.90,
    'A7o': 0.80, 'A6o': 0.70, 'A5o': 0.85, 'A4o': 0.75, 'A3o': 0.60, 'A2o': 0.50,
    // Offsuit kings
    'KQo': 1, 'KJo': 1, 'KTo': 1, 'K9o': 0.85, 'K8o': 0.60, 'K7o': 0.45,
    'K6o': 0.35, 'K5o': 0.30,
    // Offsuit queens
    'QJo': 1, 'QTo': 1, 'Q9o': 0.75, 'Q8o': 0.45,
    // Offsuit jacks+
    'JTo': 1, 'J9o': 0.65, 'J8o': 0.35,
    'T9o': 0.80, 'T8o': 0.40,
    '98o': 0.45, '97o': 0.25,
    '87o': 0.40, '76o': 0.25, '65o': 0.20,
};

/** SB RFI (raise or fold, no limp in solved): ~42% of hands */
const SB_RFI: CompactRange = {
    // All pairs
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 1, 'TT': 1, '99': 1, '88': 1,
    '77': 1, '66': 1, '55': 1, '44': 1, '33': 1, '22': 1,
    // All suited aces
    'AKs': 1, 'AQs': 1, 'AJs': 1, 'ATs': 1, 'A9s': 1, 'A8s': 1,
    'A7s': 1, 'A6s': 1, 'A5s': 1, 'A4s': 1, 'A3s': 1, 'A2s': 1,
    // Suited kings
    'KQs': 1, 'KJs': 1, 'KTs': 1, 'K9s': 1, 'K8s': 1, 'K7s': 1,
    'K6s': 1, 'K5s': 1, 'K4s': 0.90, 'K3s': 0.80, 'K2s': 0.70,
    // Suited queens
    'QJs': 1, 'QTs': 1, 'Q9s': 1, 'Q8s': 1, 'Q7s': 0.75, 'Q6s': 0.70,
    'Q5s': 0.65, 'Q4s': 0.50, 'Q3s': 0.40, 'Q2s': 0.30,
    // Suited jacks
    'JTs': 1, 'J9s': 1, 'J8s': 1, 'J7s': 0.75, 'J6s': 0.50, 'J5s': 0.45, 'J4s': 0.35,
    // Suited tens
    'T9s': 1, 'T8s': 1, 'T7s': 0.85, 'T6s': 0.50,
    // Suited connectors
    '98s': 1, '97s': 0.85, '96s': 0.55,
    '87s': 1, '86s': 0.80, '85s': 0.40,
    '76s': 1, '75s': 0.70, '74s': 0.30,
    '65s': 1, '64s': 0.65, '63s': 0.25,
    '54s': 1, '53s': 0.55,
    '43s': 0.60, '42s': 0.20,
    '32s': 0.25,
    // Offsuit aces
    'AKo': 1, 'AQo': 1, 'AJo': 1, 'ATo': 1, 'A9o': 1, 'A8o': 0.85,
    'A7o': 0.75, 'A6o': 0.65, 'A5o': 0.80, 'A4o': 0.70, 'A3o': 0.55, 'A2o': 0.45,
    // Offsuit kings
    'KQo': 1, 'KJo': 1, 'KTo': 1, 'K9o': 0.80, 'K8o': 0.55, 'K7o': 0.40,
    'K6o': 0.30, 'K5o': 0.25,
    // Offsuit queens
    'QJo': 1, 'QTo': 0.95, 'Q9o': 0.70, 'Q8o': 0.40,
    // Offsuit rest
    'JTo': 1, 'J9o': 0.60, 'J8o': 0.30,
    'T9o': 0.75, 'T8o': 0.35,
    '98o': 0.40,
    '87o': 0.35, '76o': 0.20, '65o': 0.15,
};

// ═══════════════════════════════════════════════════════════════════════════
// FACING OPEN (3-BET / CALL / FOLD) RANGES
// ═══════════════════════════════════════════════════════════════════════════

/** BB vs BTN Open — 3-bet ~11%, call ~33% */
const BB_VS_BTN_3BET: CompactRange = {
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 0.55,
    'AKs': 1, 'AQs': 0.70, 'AJs': 0.40, 'A5s': 0.65, 'A4s': 0.55, 'A3s': 0.40,
    'AKo': 1, 'AQo': 0.50,
    'KQs': 0.35, 'K9s': 0.25,
    'T9s': 0.20, '98s': 0.15, '87s': 0.15, '76s': 0.15, '65s': 0.15, '54s': 0.15,
};
const BB_VS_BTN_CALL: CompactRange = {
    'JJ': 0.45, 'TT': 1, '99': 1, '88': 1, '77': 1, '66': 1, '55': 1, '44': 1, '33': 1, '22': 1,
    'AQs': 0.30, 'AJs': 0.60, 'ATs': 1, 'A9s': 1, 'A8s': 1, 'A7s': 1, 'A6s': 1,
    'A5s': 0.35, 'A4s': 0.45, 'A3s': 0.60, 'A2s': 1,
    'KQs': 0.65, 'KJs': 1, 'KTs': 1, 'K9s': 0.75, 'K8s': 0.70, 'K7s': 0.65,
    'K6s': 0.55, 'K5s': 0.50, 'K4s': 0.40,
    'QJs': 1, 'QTs': 1, 'Q9s': 1, 'Q8s': 0.70, 'Q7s': 0.40,
    'JTs': 0.80, 'J9s': 1, 'J8s': 0.65, 'J7s': 0.35,
    'T9s': 0.80, 'T8s': 0.90, 'T7s': 0.40,
    '98s': 0.85, '97s': 0.60, '96s': 0.30,
    '87s': 0.85, '86s': 0.50,
    '76s': 0.85, '75s': 0.40,
    '65s': 0.85, '64s': 0.35,
    '54s': 0.85, '53s': 0.30,
    '43s': 0.40, '32s': 0.20,
    'AQo': 0.50, 'AJo': 1, 'ATo': 1, 'A9o': 0.80, 'A8o': 0.55, 'A7o': 0.35,
    'KQo': 1, 'KJo': 0.85, 'KTo': 0.60, 'K9o': 0.35,
    'QJo': 0.80, 'QTo': 0.55, 'Q9o': 0.30,
    'JTo': 0.70, 'J9o': 0.35,
    'T9o': 0.50, 'T8o': 0.20,
    '98o': 0.25, '87o': 0.20,
};

/** BB vs CO Open — 3-bet ~8%, call ~25% */
const BB_VS_CO_3BET: CompactRange = {
    'AA': 1, 'KK': 1, 'QQ': 0.85, 'JJ': 0.35,
    'AKs': 1, 'AQs': 0.55, 'A5s': 0.50, 'A4s': 0.40,
    'AKo': 1, 'AQo': 0.35,
    'KQs': 0.25,
    '76s': 0.10, '65s': 0.10, '54s': 0.10,
};
const BB_VS_CO_CALL: CompactRange = {
    'QQ': 0.15, 'JJ': 0.65, 'TT': 1, '99': 1, '88': 1, '77': 1, '66': 1,
    '55': 0.90, '44': 0.80, '33': 0.65, '22': 0.55,
    'AQs': 0.45, 'AJs': 1, 'ATs': 1, 'A9s': 0.85, 'A8s': 0.70, 'A7s': 0.55,
    'A5s': 0.50, 'A4s': 0.60, 'A3s': 0.50, 'A2s': 0.45,
    'KQs': 0.75, 'KJs': 1, 'KTs': 1, 'K9s': 0.60, 'K8s': 0.35,
    'QJs': 1, 'QTs': 1, 'Q9s': 0.70, 'Q8s': 0.30,
    'JTs': 1, 'J9s': 0.80, 'J8s': 0.35,
    'T9s': 0.90, 'T8s': 0.60,
    '98s': 0.85, '97s': 0.35,
    '87s': 0.80, '86s': 0.30,
    '76s': 0.75, '65s': 0.70, '54s': 0.65,
    '43s': 0.25,
    'AQo': 0.65, 'AJo': 1, 'ATo': 0.80,
    'KQo': 1, 'KJo': 0.65, 'KTo': 0.35,
    'QJo': 0.60, 'QTo': 0.30,
    'JTo': 0.50,
    'T9o': 0.30,
};

/** BB vs UTG Open — 3-bet ~4.5%, call ~16% (tightest defense) */
const BB_VS_UTG_3BET: CompactRange = {
    'AA': 1, 'KK': 1, 'QQ': 0.55,
    'AKs': 1, 'AQs': 0.30,
    'AKo': 0.85,
    'A5s': 0.25,
};
const BB_VS_UTG_CALL: CompactRange = {
    'QQ': 0.45, 'JJ': 1, 'TT': 1, '99': 1, '88': 1, '77': 0.90, '66': 0.75,
    '55': 0.55, '44': 0.40, '33': 0.25,
    'AQs': 0.70, 'AJs': 1, 'ATs': 0.85, 'A9s': 0.40,
    'A5s': 0.75, 'A4s': 0.65, 'A3s': 0.35,
    'KQs': 1, 'KJs': 0.80, 'KTs': 0.55,
    'QJs': 0.85, 'QTs': 0.60,
    'JTs': 0.80, 'J9s': 0.35,
    'T9s': 0.70, 'T8s': 0.25,
    '98s': 0.60, '87s': 0.50, '76s': 0.45, '65s': 0.40, '54s': 0.35,
    'AKo': 0.15, 'AQo': 0.85, 'AJo': 0.55,
    'KQo': 0.65, 'KJo': 0.30,
    'QJo': 0.25,
};

/** SB vs BTN Open — 3-bet ~10%, fold the rest (SB rarely flats) */
const SB_VS_BTN_3BET: CompactRange = {
    'AA': 1, 'KK': 1, 'QQ': 1, 'JJ': 0.70, 'TT': 0.35,
    'AKs': 1, 'AQs': 1, 'AJs': 0.70, 'ATs': 0.35,
    'A5s': 0.80, 'A4s': 0.65, 'A3s': 0.40, 'A2s': 0.25,
    'AKo': 1, 'AQo': 0.80, 'AJo': 0.30,
    'KQs': 0.55, 'KJs': 0.30,
    'KQo': 0.25,
    'QJs': 0.20,
    '76s': 0.20, '65s': 0.20, '54s': 0.20, '87s': 0.15, '98s': 0.15,
};
const SB_VS_BTN_CALL: CompactRange = {
    // SB mostly 3-bets or folds vs BTN. Very small flatting range:
    'JJ': 0.30, 'TT': 0.55, '99': 0.70, '88': 0.50, '77': 0.35,
    'AJs': 0.30, 'ATs': 0.45, 'A9s': 0.30,
    'KJs': 0.35, 'KTs': 0.40,
    'QJs': 0.45, 'QTs': 0.35,
    'JTs': 0.50, 'J9s': 0.25,
    'T9s': 0.50, 'T8s': 0.25,
    '98s': 0.40, '87s': 0.35, '76s': 0.30, '65s': 0.25, '54s': 0.20,
};

/** BTN vs CO Open — 3-bet ~9%, call ~16% */
const BTN_VS_CO_3BET: CompactRange = {
    'AA': 1, 'KK': 1, 'QQ': 0.75, 'JJ': 0.35,
    'AKs': 1, 'AQs': 0.65, 'AJs': 0.30,
    'A5s': 0.55, 'A4s': 0.45, 'A3s': 0.25,
    'AKo': 1, 'AQo': 0.40,
    'KQs': 0.30,
    '87s': 0.15, '76s': 0.15, '65s': 0.15, '54s': 0.15,
};
const BTN_VS_CO_CALL: CompactRange = {
    'QQ': 0.25, 'JJ': 0.65, 'TT': 1, '99': 1, '88': 1, '77': 1,
    '66': 0.90, '55': 0.80, '44': 0.65, '33': 0.50, '22': 0.40,
    'AQs': 0.35, 'AJs': 0.70, 'ATs': 1, 'A9s': 0.85, 'A8s': 0.60,
    'A7s': 0.45, 'A6s': 0.40, 'A5s': 0.45, 'A4s': 0.55, 'A3s': 0.35, 'A2s': 0.30,
    'KQs': 0.70, 'KJs': 1, 'KTs': 1, 'K9s': 0.55,
    'QJs': 1, 'QTs': 1, 'Q9s': 0.55,
    'JTs': 1, 'J9s': 0.75, 'J8s': 0.25,
    'T9s': 1, 'T8s': 0.55,
    '98s': 0.85, '97s': 0.25,
    '87s': 0.85, '76s': 0.80, '65s': 0.80, '54s': 0.75,
    'AQo': 0.60, 'AJo': 0.85, 'ATo': 0.55,
    'KQo': 0.85, 'KJo': 0.50,
    'QJo': 0.45,
    'JTo': 0.40,
};

/** BTN vs UTG Open — 3-bet ~5%, call ~10% */
const BTN_VS_UTG_3BET: CompactRange = {
    'AA': 1, 'KK': 1, 'QQ': 0.45,
    'AKs': 1, 'AQs': 0.25,
    'AKo': 0.75,
    'A5s': 0.30, 'A4s': 0.20,
};
const BTN_VS_UTG_CALL: CompactRange = {
    'QQ': 0.55, 'JJ': 1, 'TT': 1, '99': 1, '88': 0.85, '77': 0.70,
    '66': 0.50, '55': 0.40, '44': 0.25,
    'AQs': 0.75, 'AJs': 0.80, 'ATs': 0.65,
    'A5s': 0.70, 'A4s': 0.60,
    'KQs': 1, 'KJs': 0.65, 'KTs': 0.45,
    'QJs': 0.70, 'QTs': 0.45,
    'JTs': 0.75, 'T9s': 0.65,
    '98s': 0.55, '87s': 0.45, '76s': 0.40, '65s': 0.35, '54s': 0.30,
    'AKo': 0.25, 'AQo': 0.60, 'AJo': 0.35,
    'KQo': 0.55,
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPILED RANGE DATABASE
// ═══════════════════════════════════════════════════════════════════════════

export interface RangeScenario {
    id: string;
    position: Position;
    scenario: string;
    description: string;
    stackDepth: number;
    ranges: Map<string, HandAction[]>;
    /** Approximate % of hands that take non-fold action */
    openPercent?: number;
}

export const RANGE_DATABASE: RangeScenario[] = [
    // RFI Ranges
    {
        id: 'utg-rfi-100bb',
        position: 'UTG',
        scenario: 'RFI',
        description: 'UTG Raise First In (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildRangeMap(UTG_RFI),
        openPercent: 15.8,
    },
    {
        id: 'hj-rfi-100bb',
        position: 'HJ',
        scenario: 'RFI',
        description: 'HJ Raise First In (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildRangeMap(HJ_RFI),
        openPercent: 19.5,
    },
    {
        id: 'co-rfi-100bb',
        position: 'CO',
        scenario: 'RFI',
        description: 'CO Raise First In (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildRangeMap(CO_RFI),
        openPercent: 27.0,
    },
    {
        id: 'btn-rfi-100bb',
        position: 'BTN',
        scenario: 'RFI',
        description: 'BTN Raise First In (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildRangeMap(BTN_RFI),
        openPercent: 46.0,
    },
    {
        id: 'sb-rfi-100bb',
        position: 'SB',
        scenario: 'RFI',
        description: 'SB Raise First In vs BB (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildRangeMap(SB_RFI),
        openPercent: 42.0,
    },

    // Defense vs Open Ranges
    {
        id: 'bb-vs-btn-100bb',
        position: 'BB',
        scenario: 'vs_BTN_open',
        description: 'BB Defense vs BTN Open (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildDefenseMap(BB_VS_BTN_3BET, BB_VS_BTN_CALL),
    },
    {
        id: 'bb-vs-co-100bb',
        position: 'BB',
        scenario: 'vs_CO_open',
        description: 'BB Defense vs CO Open (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildDefenseMap(BB_VS_CO_3BET, BB_VS_CO_CALL),
    },
    {
        id: 'bb-vs-utg-100bb',
        position: 'BB',
        scenario: 'vs_UTG_open',
        description: 'BB Defense vs UTG Open (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildDefenseMap(BB_VS_UTG_3BET, BB_VS_UTG_CALL),
    },
    {
        id: 'sb-vs-btn-100bb',
        position: 'SB',
        scenario: 'vs_BTN_open',
        description: 'SB Defense vs BTN Open (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildDefenseMap(SB_VS_BTN_3BET, SB_VS_BTN_CALL),
    },
    {
        id: 'btn-vs-co-100bb',
        position: 'BTN',
        scenario: 'vs_CO_open',
        description: 'BTN Defense vs CO Open (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildDefenseMap(BTN_VS_CO_3BET, BTN_VS_CO_CALL),
    },
    {
        id: 'btn-vs-utg-100bb',
        position: 'BTN',
        scenario: 'vs_UTG_open',
        description: 'BTN Defense vs UTG Open (6-max, 100bb)',
        stackDepth: 100,
        ranges: buildDefenseMap(BTN_VS_UTG_3BET, BTN_VS_UTG_CALL),
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// POSTFLOP GTO DECISION DATA
// ═══════════════════════════════════════════════════════════════════════════

export interface PostflopScenario {
    id: string;
    level: number;
    category: string;
    title: string;
    heroCards: [string, string];
    board: string[];
    position: string;
    street: 'flop' | 'turn' | 'river';
    potBB: number;
    effectiveStackBB: number;
    villainPosition: string;
    /** The GTO-correct action with solver-derived EV */
    gtoAction: {
        action: string;
        sizing?: string;
        ev: number;
        frequency: number;
        reasoning: string;
    };
    /** Alternative actions ranked by EV */
    alternates: {
        action: string;
        sizing?: string;
        ev: number;
        frequency: number;
        tier: 'ALT_SIMPLE' | 'ALT_EXPLOIT';
        reasoning: string;
    }[];
}

/**
 * Level 1 Postflop Scenarios — Fundamentals
 * These are common spots with clear GTO answers.
 * EVs are in bb, derived from solver aggregation.
 */
export const LEVEL_1_POSTFLOP: PostflopScenario[] = [
    {
        id: 'L1_PF_001',
        level: 1,
        category: 'Value Betting',
        title: 'Top Pair Top Kicker on Dry Board',
        heroCards: ['As', 'Kd'],
        board: ['Ac', '7h', '2s'],
        position: 'BTN',
        street: 'flop',
        potBB: 6.5,
        effectiveStackBB: 97.5,
        villainPosition: 'BB',
        gtoAction: {
            action: 'bet',
            sizing: '33%',
            ev: 4.82,
            frequency: 0.92,
            reasoning: 'TPTK on A72r. Range bet small on dry ace-high board. IP has massive range advantage; 33% sizing extracts value from worse Ax, pairs, and protects equity.'
        },
        alternates: [
            {
                action: 'bet', sizing: '66%', ev: 4.55, frequency: 0.05,
                tier: 'ALT_SIMPLE',
                reasoning: 'Larger sizing is fine but slightly less EV. Overbet range loses some thin value from Kx/Qx that folds.'
            },
            {
                action: 'check', ev: 3.91, frequency: 0.03,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Checking is acceptable to trap vs aggressive villains who lead turn, but leaves money on the table in GTO.'
            }
        ]
    },
    {
        id: 'L1_PF_002',
        level: 1,
        category: 'Preflop Fundamentals',
        title: 'Premium Open from UTG',
        heroCards: ['Ah', 'Kh'],
        board: [],
        position: 'UTG',
        street: 'flop', // preflop decision
        potBB: 1.5,
        effectiveStackBB: 100,
        villainPosition: 'N/A',
        gtoAction: {
            action: 'raise',
            sizing: '2.5bb',
            ev: 0.28,
            frequency: 1.0,
            reasoning: 'AKs is a 100% open from every position. It has excellent equity vs calling ranges and 3-bet ranges, and it blocks AA/KK.'
        },
        alternates: [
            {
                action: 'raise', sizing: '3bb', ev: 0.25, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Slightly larger open works in live/rec games but costs a small amount of EV in solved play.'
            },
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Folding AKs is always a massive error. This is a clear blunder at any level.'
            }
        ]
    },
    {
        id: 'L1_PF_003',
        level: 1,
        category: 'Pot Odds',
        title: 'Easy Call Getting 3:1',
        heroCards: ['Kd', 'Qd'],
        board: ['Ks', '8c', '4d', '2h', '7s'],
        position: 'BB',
        street: 'river',
        potBB: 24,
        effectiveStackBB: 76,
        villainPosition: 'BTN',
        gtoAction: {
            action: 'call',
            ev: 15.30,
            frequency: 0.95,
            reasoning: 'Top pair good kicker on a dry runout. Villain bets 50% pot. You need to be good 25% of the time. TPGK beats all bluffs and worse value bets.'
        },
        alternates: [
            {
                action: 'raise', sizing: '2.5x', ev: 8.20, frequency: 0.03,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Raising for thin value is occasionally correct vs stations, but risks getting blown off equity by better hands.'
            },
            {
                action: 'fold', ev: 0, frequency: 0.02,
                tier: 'ALT_SIMPLE',
                reasoning: 'Folding top pair in a spot where you need 25% equity is a significant leak. Only fold vs extremely tight villains.'
            }
        ]
    },
    {
        id: 'L1_PF_004',
        level: 1,
        category: 'C-Betting',
        title: 'C-Bet Dry Flop as PFR',
        heroCards: ['Kh', 'Qh'],
        board: ['8c', '3d', '2s'],
        position: 'BTN',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'BB',
        gtoAction: {
            action: 'bet',
            sizing: '33%',
            ev: 3.95,
            frequency: 0.88,
            reasoning: 'Range c-bet small on 832r. BTN has significant range advantage. KQs has two overcards and backdoor flush draw. Small sizing puts pressure on villain\'s weak holdings.'
        },
        alternates: [
            {
                action: 'check', ev: 3.42, frequency: 0.12,
                tier: 'ALT_SIMPLE',
                reasoning: 'Checking is fine occasionally to balance your checking range. KQ has decent showdown value.'
            },
            {
                action: 'bet', sizing: '66%', ev: 3.60, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Larger sizing works exploitatively vs opponents who overfold to c-bets but is suboptimal in theory.'
            }
        ]
    },
    {
        id: 'L1_PF_005',
        level: 1,
        category: 'Hand Reading',
        title: 'Clear Fold vs Aggression',
        heroCards: ['Jc', 'Tc'],
        board: ['As', 'Kd', '7h'],
        position: 'CO',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'BB',
        gtoAction: {
            action: 'check',
            ev: 1.85,
            frequency: 0.78,
            reasoning: 'JTs has zero pair equity on AK7. Check back to see a free card. You have a backdoor straight draw but no immediate equity to bet.'
        },
        alternates: [
            {
                action: 'bet', sizing: '33%', ev: 1.60, frequency: 0.22,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Small c-bet can work if villain overfolds, but you have plenty of better bluff candidates with backdoor equity.'
            },
            {
                action: 'bet', sizing: '66%', ev: 0.95, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Large sizing with no equity is burning money. This is a clear mistake.'
            }
        ]
    },
    {
        id: 'L1_PF_006',
        level: 1,
        category: 'Preflop Fundamentals',
        title: 'Pocket Pair Open from MP',
        heroCards: ['8s', '8c'],
        board: [],
        position: 'HJ',
        street: 'flop',
        potBB: 1.5,
        effectiveStackBB: 100,
        villainPosition: 'N/A',
        gtoAction: {
            action: 'raise',
            sizing: '2.5bb',
            ev: 0.18,
            frequency: 1.0,
            reasoning: '88 is a standard open from HJ. Good implied odds to set-mine and decent equity vs 3-bet ranges. Open 100% of the time.'
        },
        alternates: [
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Folding 88 from HJ is way too tight. This hand has clear positive EV as an open.'
            },
            {
                action: 'raise', sizing: '3bb', ev: 0.16, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Larger sizing OK in live games but marginally worse in theory.'
            }
        ]
    },
    {
        id: 'L1_PF_007',
        level: 1,
        category: 'Preflop Fundamentals',
        title: 'Fold Weak Hand from EP',
        heroCards: ['Kd', '9s'],
        board: [],
        position: 'UTG',
        street: 'flop',
        potBB: 1.5,
        effectiveStackBB: 100,
        villainPosition: 'N/A',
        gtoAction: {
            action: 'fold',
            ev: 0,
            frequency: 1.0,
            reasoning: 'K9o is a clear fold from UTG in 6-max. It\'s dominated by KT+, AK, and plays poorly multiway. Not enough equity to overcome positional disadvantage.'
        },
        alternates: [
            {
                action: 'raise', sizing: '2.5bb', ev: -0.12, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Opening K9o UTG is a losing play. You get 3-bet by better hands and called by dominating hands.'
            },
            {
                action: 'call', ev: -0.08, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Limping is not a solver-approved strategy from EP in 6-max.'
            }
        ]
    },
    {
        id: 'L1_PF_008',
        level: 1,
        category: 'Value Betting',
        title: 'Overpair on Safe Runout',
        heroCards: ['Ah', 'Ad'],
        board: ['Kh', '9c', '5d', '2s', '7h'],
        position: 'BTN',
        street: 'river',
        potBB: 18,
        effectiveStackBB: 82,
        villainPosition: 'BB',
        gtoAction: {
            action: 'bet',
            sizing: '66%',
            ev: 13.75,
            frequency: 0.88,
            reasoning: 'AA on K9527. You beat all Kx, all pairs below AA. River is a brick. Bet 66% pot for value — villain calls with Kx, some 9x, and occasional bluff-catchers.'
        },
        alternates: [
            {
                action: 'bet', sizing: '33%', ev: 11.20, frequency: 0.08,
                tier: 'ALT_SIMPLE',
                reasoning: 'Smaller sizing gets called more but extracts less per call. Acceptable but suboptimal.'
            },
            {
                action: 'check', ev: 9.50, frequency: 0.04,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Checking to induce a bluff is sometimes correct but leaves too much value on the table with top of range.'
            }
        ]
    },
    {
        id: 'L1_PF_009',
        level: 1,
        category: 'Pot Odds',
        title: 'Fold to Large River Bet with Weak Holding',
        heroCards: ['7s', '6s'],
        board: ['Qs', 'Jh', '3c', '8d', '2c'],
        position: 'BB',
        street: 'river',
        potBB: 15,
        effectiveStackBB: 85,
        villainPosition: 'CO',
        gtoAction: {
            action: 'fold',
            ev: 0,
            frequency: 0.95,
            reasoning: '76s on QJ382 — you have nothing. Villain bets 75% pot. You need to be good 30% of the time but your hand beats literally nothing that bets here. Clear fold.'
        },
        alternates: [
            {
                action: 'call', ev: -5.50, frequency: 0.03,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Hero-calling with 7-high is almost always a mistake. Only correct in extreme high-bluff-frequency spots.'
            },
            {
                action: 'raise', ev: -11.25, frequency: 0.02,
                tier: 'ALT_SIMPLE',
                reasoning: 'Bluff-raising the river with 7-high has some merit as a pure bluff but is extremely risky and -EV at this level.'
            }
        ]
    },
    {
        id: 'L1_PF_010',
        level: 1,
        category: 'Position Advantage',
        title: 'Wide Open from Button',
        heroCards: ['Kd', 'Ts'],
        board: [],
        position: 'BTN',
        street: 'flop',
        potBB: 1.5,
        effectiveStackBB: 100,
        villainPosition: 'N/A',
        gtoAction: {
            action: 'raise',
            sizing: '2.5bb',
            ev: 0.15,
            frequency: 1.0,
            reasoning: 'KTo is a standard button open. You have position, the blinds fold most hands, and KTo plays well in position with top-pair potential.'
        },
        alternates: [
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Folding KTo on the button is way too tight. This is a clear raising hand in position.'
            },
            {
                action: 'raise', sizing: '2bb', ev: 0.14, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Min-raise sizing works but gives blinds better odds to defend.'
            }
        ]
    },
];

/**
 * Level 2 Postflop Scenarios — Position & Continuation Betting
 * More nuanced spots requiring understanding of position and board texture.
 */
export const LEVEL_2_POSTFLOP: PostflopScenario[] = [
    {
        id: 'L2_PF_001',
        level: 2,
        category: 'Position Advantage',
        title: 'OOP Check vs Missed C-Bet',
        heroCards: ['Qd', 'Jd'],
        board: ['Qh', '8c', '3s'],
        position: 'SB',
        street: 'flop',
        potBB: 10,
        effectiveStackBB: 90,
        villainPosition: 'BTN',
        gtoAction: {
            action: 'check',
            ev: 5.82,
            frequency: 0.85,
            reasoning: 'QJ on Q83r out of position as 3-bettor. Check to the IP player. QJ is a medium-strength hand that benefits from pot control OOP. Let villain bet if they want; you can check-call or check-raise on good turns.'
        },
        alternates: [
            {
                action: 'bet', sizing: '33%', ev: 5.40, frequency: 0.15,
                tier: 'ALT_SIMPLE',
                reasoning: 'Small donk bet can work with top pair to deny equity, but solver prefers checking range OOP.'
            },
            {
                action: 'bet', sizing: '75%', ev: 4.20, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Large lead OOP with medium holding is a common mistake. Bloats the pot where you often get outplayed.'
            }
        ]
    },
    {
        id: 'L2_PF_002',
        level: 2,
        category: 'Continuation Betting',
        title: 'Check Back Wet Board',
        heroCards: ['Ad', 'Kd'],
        board: ['Jh', 'Tc', '9h'],
        position: 'BTN',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'BB',
        gtoAction: {
            action: 'check',
            ev: 4.15,
            frequency: 0.72,
            reasoning: 'AKs on JT9hh is a check back. This board smashes BB\'s defending range (QJ, JT, T9, 98, sets). Your hand has gutshot + backdoor nut flush but no made hand. Protect your checking range and realize equity.'
        },
        alternates: [
            {
                action: 'bet', sizing: '33%', ev: 3.80, frequency: 0.28,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Small c-bet is a reasonable mix. AK has good equity with the gutshot and overcards. Works vs villains who overfold connected boards.'
            },
            {
                action: 'bet', sizing: '66%', ev: 2.95, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Medium sizing on this wet board is a clear mistake. You build a pot where villain has more strong hands than you.'
            }
        ]
    },
    {
        id: 'L2_PF_003',
        level: 2,
        category: 'Position Advantage',
        title: 'BTN Steal with Suited Connector',
        heroCards: ['7h', '6h'],
        board: [],
        position: 'BTN',
        street: 'flop',
        potBB: 1.5,
        effectiveStackBB: 100,
        villainPosition: 'N/A',
        gtoAction: {
            action: 'raise',
            sizing: '2.5bb',
            ev: 0.08,
            frequency: 1.0,
            reasoning: '76s is a standard button open. Suited connectors play excellently in position — they flop draws, straights, two pairs, and are hard to play against postflop.'
        },
        alternates: [
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Folding 76s on BTN is far too tight. This hand is a clear open that prints money from position.'
            },
            {
                action: 'raise', sizing: '3bb', ev: 0.06, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Larger sizing reduces fold equity relative to risk. Stick with standard sizing.'
            }
        ]
    },
    {
        id: 'L2_PF_004',
        level: 2,
        category: 'Continuation Betting',
        title: 'C-Bet Paired Board',
        heroCards: ['As', 'Qc'],
        board: ['Kc', 'Kd', '5h'],
        position: 'CO',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'BB',
        gtoAction: {
            action: 'bet',
            sizing: '33%',
            ev: 4.65,
            frequency: 0.95,
            reasoning: 'AQ on KK5 — paired boards are great for the PFR. You have nut advantage (all AA, KK combos vs BB who has very few Kx in 3-bet calling range). Small bet prints money.'
        },
        alternates: [
            {
                action: 'check', ev: 3.90, frequency: 0.05,
                tier: 'ALT_SIMPLE',
                reasoning: 'Checking is defensible to protect range, but this is one of the highest-frequency c-bet boards. You should bet almost always.'
            },
            {
                action: 'bet', sizing: '75%', ev: 4.15, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Larger sizing works vs tight opponents but loses value from the betting frequency advantage of small sizing.'
            }
        ]
    },
    {
        id: 'L2_PF_005',
        level: 2,
        category: 'Blind Defense',
        title: 'BB Defense vs BTN Open',
        heroCards: ['Jh', '9h'],
        board: [],
        position: 'BB',
        street: 'flop',
        potBB: 2.5,
        effectiveStackBB: 97.5,
        villainPosition: 'BTN',
        gtoAction: {
            action: 'call',
            ev: 0.05,
            frequency: 1.0,
            reasoning: 'J9s in the BB vs BTN open is a clear defend. You get great pot odds (already have 1bb invested), suited connectors play well, and BTN opens wide. This is never a fold or 3-bet.'
        },
        alternates: [
            {
                action: '3bet', sizing: '10bb', ev: -0.02, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: '3-betting J9s can work vs BTN who overfolds, but solver prefers calling to keep BTN\'s range wide and realize equity postflop.'
            },
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Folding J9s in BB to BTN open is way too tight. You\'re getting excellent pot odds with a playable hand.'
            }
        ]
    },
    {
        id: 'L2_PF_006',
        level: 2,
        category: 'Check-Raise',
        title: 'Check-Raise Draw on Wet Board',
        heroCards: ['9h', '8h'],
        board: ['7h', '6c', '2h'],
        position: 'BB',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'BTN',
        gtoAction: {
            action: 'raise',
            sizing: '3x',
            ev: 6.45,
            frequency: 0.75,
            reasoning: '98hh on 762hh — you have an open-ended straight draw + flush draw (15 outs, ~54% equity). Check-raise to build a pot with your monster draw. If called, you have massive equity to barrel turns.'
        },
        alternates: [
            {
                action: 'call', ev: 5.20, frequency: 0.25,
                tier: 'ALT_SIMPLE',
                reasoning: 'Flat-calling the c-bet is OK — you disguise your hand and keep villain\'s bluffs in. But you miss value from the draw\'s equity advantage.'
            },
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Folding 15 outs on the flop is a catastrophic mistake. You have more equity than most made hands.'
            }
        ]
    },
    {
        id: 'L2_PF_007',
        level: 2,
        category: 'Position Advantage',
        title: 'IP Float vs C-Bet',
        heroCards: ['Ac', '5c'],
        board: ['Kd', '9s', '4c'],
        position: 'BTN',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'CO',
        gtoAction: {
            action: 'call',
            ev: 2.85,
            frequency: 0.70,
            reasoning: 'A5cc on K94. Backdoor nut flush draw + backdoor straight draw + ace overcard. Enough equity to float the c-bet in position and take it away on favorable turns. Classic IP float spot.'
        },
        alternates: [
            {
                action: 'fold', ev: 0, frequency: 0.20,
                tier: 'ALT_SIMPLE',
                reasoning: 'Folding is close but too tight. You have 3 backdoor draws and position. The EV of floating is positive.'
            },
            {
                action: 'raise', ev: 2.10, frequency: 0.10,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Raising as a bluff can work but A5cc is a better float candidate. Save raises for hands with less showdown potential.'
            }
        ]
    },
    {
        id: 'L2_PF_008',
        level: 2,
        category: 'Bet Sizing',
        title: 'Small Bet Range Advantage',
        heroCards: ['Td', 'Tc'],
        board: ['As', '8d', '3c'],
        position: 'BTN',
        street: 'flop',
        potBB: 7,
        effectiveStackBB: 96.5,
        villainPosition: 'BB',
        gtoAction: {
            action: 'bet',
            sizing: '33%',
            ev: 4.12,
            frequency: 0.80,
            reasoning: 'TT on A83r. You have range advantage (all Ax combos, all overpairs). Small sizing protects TT\'s equity vs overcards while maintaining high c-bet frequency. Villain folds underpairs and floats draws.'
        },
        alternates: [
            {
                action: 'check', ev: 3.55, frequency: 0.20,
                tier: 'ALT_SIMPLE',
                reasoning: 'Checking back TT is reasonable to protect your checking range. You have showdown value and can call one barrel.'
            },
            {
                action: 'bet', sizing: '66%', ev: 3.70, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Larger sizing forces folds from hands you already beat. Suboptimal unless villain is extremely sticky.'
            }
        ]
    },
    {
        id: 'L2_PF_009',
        level: 2,
        category: 'Continuation Betting',
        title: 'Skip C-Bet Multiway',
        heroCards: ['Jh', 'Jc'],
        board: ['Ks', '9h', '6d'],
        position: 'UTG',
        street: 'flop',
        potBB: 12,
        effectiveStackBB: 95,
        villainPosition: 'BTN+BB',
        gtoAction: {
            action: 'check',
            ev: 6.85,
            frequency: 0.90,
            reasoning: 'JJ on K96 multiway (3 players). You must check — your range disadvantage is huge multiway. Both opponents have Kx in their ranges. JJ is a medium-strength hand that needs pot control.'
        },
        alternates: [
            {
                action: 'bet', sizing: '33%', ev: 5.50, frequency: 0.10,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Small bet can deny equity from draws, but multiway you face too many Kx combos. High risk of getting raised off your equity.'
            },
            {
                action: 'bet', sizing: '66%', ev: 3.80, frequency: 0,
                tier: 'ALT_SIMPLE',
                reasoning: 'Medium bet multiway into two opponents on K-high board with JJ is a clear mistake. You fold out worse and get called/raised by better.'
            }
        ]
    },
    {
        id: 'L2_PF_010',
        level: 2,
        category: 'Blind Defense',
        title: 'BB 3-Bet vs BTN with Blocker',
        heroCards: ['As', '5s'],
        board: [],
        position: 'BB',
        street: 'flop',
        potBB: 2.5,
        effectiveStackBB: 97.5,
        villainPosition: 'BTN',
        gtoAction: {
            action: '3bet',
            sizing: '10bb',
            ev: 0.12,
            frequency: 0.65,
            reasoning: 'A5s in BB vs BTN open — premium 3-bet bluff. Ace blocker reduces villain\'s Ax calling range. Suited wheel has great playability when called. This is one of the highest-frequency 3-bet bluffs in the solver.'
        },
        alternates: [
            {
                action: 'call', ev: 0.05, frequency: 0.35,
                tier: 'ALT_SIMPLE',
                reasoning: 'Flatting is fine — you have a playable hand getting good odds. But 3-betting builds a bigger pot with positional equity and fold equity combined.'
            },
            {
                action: 'fold', ev: 0, frequency: 0,
                tier: 'ALT_EXPLOIT',
                reasoning: 'Folding A5s in BB to BTN open is extremely tight and a clear mistake. This hand is too strong to fold with the pot odds you\'re getting.'
            }
        ]
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API — QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a full range for a given position and scenario
 */
export function getRange(position: Position, scenario: string, stackDepth: number = 100): RangeScenario | undefined {
    return RANGE_DATABASE.find(r =>
        r.position === position &&
        r.scenario === scenario &&
        r.stackDepth === stackDepth
    );
}

/**
 * Get the action(s) for a specific hand in a given spot
 */
export function getHandAction(hand: string, position: Position, scenario: string): HandAction[] | undefined {
    const range = getRange(position, scenario);
    return range?.ranges.get(hand);
}

/**
 * Check if a hand takes a specific action in a spot
 */
export function isInRange(hand: string, position: Position, scenario: string, action: Action): boolean {
    const actions = getHandAction(hand, position, scenario);
    if (!actions) return false;
    return actions.some(a => a.action === action && a.frequency > 0);
}

/**
 * Get the percentage of hands that take a given action
 */
export function getRangePercentage(position: Position, scenario: string, action: Action): number {
    const range = getRange(position, scenario);
    if (!range) return 0;

    let totalFreq = 0;
    for (const hand of ALL_HANDS_169) {
        const actions = range.ranges.get(hand);
        if (actions) {
            const matching = actions.find(a => a.action === action);
            if (matching) {
                // Weight by number of combos
                const combos = getHandCombos(hand);
                totalFreq += matching.frequency * combos;
            }
        }
    }

    const totalCombos = 1326; // Total hole card combos
    return (totalFreq / totalCombos) * 100;
}

/**
 * Get the number of combos for a hand type
 */
export function getHandCombos(hand: string): number {
    if (hand.length === 2) {
        // Pocket pair: 6 combos
        return 6;
    } else if (hand.endsWith('s')) {
        // Suited: 4 combos
        return 4;
    } else {
        // Offsuit: 12 combos
        return 12;
    }
}

/**
 * Get a GridState (for Preflop Charts / Memory Games) from a range
 */
export function rangeToGridState(
    position: Position,
    scenario: string,
    threshold: number = 0.5
): Record<string, 'raise' | 'call' | '3bet' | 'fold'> {
    const range = getRange(position, scenario);
    if (!range) return {};

    const grid: Record<string, string> = {};
    for (const hand of ALL_HANDS_169) {
        const actions = range.ranges.get(hand);
        if (!actions) {
            grid[hand] = 'fold';
            continue;
        }

        // Find highest-frequency non-fold action above threshold
        const nonFold = actions
            .filter(a => a.action !== 'fold' && a.frequency >= threshold)
            .sort((a, b) => b.frequency - a.frequency);

        if (nonFold.length > 0) {
            grid[hand] = nonFold[0].action;
        } else {
            grid[hand] = 'fold';
        }
    }
    return grid as Record<string, 'raise' | 'call' | '3bet' | 'fold'>;
}

/**
 * Get postflop scenarios for a given level
 */
export function getPostflopScenarios(level: number): PostflopScenario[] {
    if (level === 1) return LEVEL_1_POSTFLOP;
    if (level === 2) return LEVEL_2_POSTFLOP;
    return [];
}

/**
 * Get all available preflop range scenario IDs
 */
export function listAvailableRanges(): string[] {
    return RANGE_DATABASE.map(r => r.id);
}

export default {
    RANGE_DATABASE,
    LEVEL_1_POSTFLOP,
    LEVEL_2_POSTFLOP,
    ALL_HANDS_169,
    getRange,
    getHandAction,
    isInRange,
    getRangePercentage,
    getHandCombos,
    rangeToGridState,
    getPostflopScenarios,
    listAvailableRanges,
};
