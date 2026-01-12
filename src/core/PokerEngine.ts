/**
 * 🃏 POKER ENGINE (LIGHTWEIGHT)
 * ═══════════════════════════════════════════════════════════════════════════
 * A purely client-side state machine to drive the visual "Video Game" feel.
 * It does NOT solve GTO. It simulates the flow of a hand so the UI can react.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type Street = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
export type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE';

export interface SeatState {
    id: string; // 'BTN', 'SB', 'BB', etc.
    chips: number;
    cards: [string, string] | null; // ['Ah', 'Kd'] or null if no cards/folded
    isActive: boolean; // Is currently in the hand
    isHero: boolean;
    isFolded: boolean;
    currentBet: number; // Amount put in this street
    didAct: boolean;
}

export interface GameState {
    street: Street;
    pot: number;
    board: string[]; // ['Ah', 'Kd', '2c']
    seats: SeatState[];
    activeSeatIndex: number; // Who's turn is it?
    heroSeatIndex: number;
    dealerIndex: number;
    minBet: number; // For slider
}

export class PokerEngine {
    private state: GameState;
    private listeners: ((state: GameState) => void)[] = [];

    constructor() {
        this.state = this.getInitialState();
    }

    private getInitialState(): GameState {
        return {
            street: 'PREFLOP',
            pot: 0,
            board: [],
            seats: [],
            activeSeatIndex: -1,
            heroSeatIndex: 3, // UTG+1 usually default for training
            dealerIndex: 0,
            minBet: 1
        };
    }

    /**
     * Start a new mocked hand.
     */
    public startHand(heroCards: [string, string] = ['Ah', 'Kd']): void {
        const seatIds = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO'];
        // Rotate so Hero (UTG+1) is at index 3? 
        // Let's just create 9 seats.

        const seats: SeatState[] = Array(9).fill(null).map((_, i) => ({
            id: ['SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'V1'][i],
            chips: 100,
            cards: null,
            isActive: true,
            isHero: i === 3, // UTG+1 is Hero
            isFolded: false,
            currentBet: 0,
            didAct: false
        }));

        // Assign Hero Cards
        if (seats[3]) seats[3].cards = heroCards;

        // Mock Action: UTG (Index 2) opens to 2.5bb
        seats[2].currentBet = 2.5;
        seats[2].chips -= 2.5;
        seats[2].didAct = true;

        // Setup State
        this.state = {
            street: 'PREFLOP',
            pot: 1.5 + 2.5, // SB+BB+UTG
            board: [],
            seats: seats,
            activeSeatIndex: 3, // Action is on Hero (UTG+1)
            heroSeatIndex: 3,
            dealerIndex: 7, // BTN
            minBet: 2.5 * 3 // Min raise
        };

        this.notify();
    }

    /**
     * Hero performs an action
     */
    public act(type: ActionType, amount: number = 0): void {
        const { activeSeatIndex, seats } = this.state;
        const actor = seats[activeSeatIndex];

        if (type === 'FOLD') {
            actor.isFolded = true;
            actor.isActive = false;
        } else if (type === 'CHECK') {
            // Check
        } else if (type === 'CALL') {
            const toCall = 2.5; // Mock
            const diff = toCall - actor.currentBet;
            actor.chips -= diff;
            actor.currentBet = toCall;
            this.state.pot += diff;
        } else if (type === 'BET' || type === 'RAISE') {
            const total = amount;
            const diff = total - actor.currentBet;
            actor.chips -= diff;
            actor.currentBet = total;
            this.state.pot += diff;
        }

        actor.didAct = true;
        this.nextTurn();
        this.notify();
    }

    private nextTurn() {
        // Simple mock rotation
        let nextIndex = (this.state.activeSeatIndex + 1) % 9;

        // Find next active player
        let iterations = 0;
        while ((this.state.seats[nextIndex].isFolded || !this.state.seats[nextIndex].isActive) && iterations < 9) {
            nextIndex = (nextIndex + 1) % 9;
            iterations++;
        }

        this.state.activeSeatIndex = nextIndex;

        // If back to preflop raiser or everyone acted, deal street?
        // For this dumb mock, if we pass Hero, just deal Flop immediately
        if (this.state.activeSeatIndex !== this.state.heroSeatIndex && this.state.street === 'PREFLOP') {
            this.dealFlop();
        }
    }

    private dealFlop() {
        this.state.street = 'FLOP';
        this.state.board = ['7s', '8s', 'Qd']; // Mock texture
        this.state.seats.forEach(s => { s.currentBet = 0; s.didAct = false; });
        this.state.activeSeatIndex = 3; // Hero first to act on flop (OOP? No, UTG+1 vs UTG... UTG acts first)
        // Let's pretend UTG checks.
        this.state.activeSeatIndex = 3;
        this.notify();
    }

    public getState(): GameState {
        return this.state;
    }

    public subscribe(listener: (state: GameState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.state));
    }
}

// Singleton for easy access
export const pokerEngine = new PokerEngine();
