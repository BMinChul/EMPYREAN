import { create } from 'zustand';

// Define the structure of a Bet Request
export interface BetRequest {
  id: string; // Unique ID to link Scene object with Store
  amount: number; // USD
  x: number; // World X position
  y: number; // World Y position
  multiplier: number;
  boxWidth: number;
  boxHeight: number;
  basePrice: number;
}

interface GameState {
  currentPrice: number;
  balance: number; // In tCROSS tokens
  tokenPrice: number; // Value of 1 tCROSS in USD
  betAmount: number; // In USD
  lastWinAmount: number; // In USD
  
  // Bridge State for Asset Management
  pendingBet: BetRequest | null; // The bet currently waiting for TX approval
  lastConfirmedBet: BetRequest | null; // The bet that just succeeded (Signal to Scene)
  
  autoBet: boolean;
  setAutoBet: (enabled: boolean) => void;

  setCurrentPrice: (price: number) => void;
  setBalance: (amount: number) => void;
  setBetAmount: (amount: number) => void;
  setLastWinAmount: (amount: number) => void;
  
  // Actions called by Phaser
  requestBet: (bet: BetRequest) => void;
  requestWin: (amount: number) => void;
  
  // Actions called by React after processing
  confirmBet: () => void; // Moves pending -> confirmed
  cancelBet: () => void; // Clears pending, refunds optimistic update
  clearLastConfirmedBet: () => void; // Called by Scene after rendering the real box

  clearPendingWin: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentPrice: 0,
  balance: 0, 
  tokenPrice: 0.10, // Fixed price for tCROSS (1 Token = $0.10)
  betAmount: 0.01, // Default to 0.1 tCROSS ($0.01)
  lastWinAmount: 0,
  autoBet: false,
  
  pendingBet: null,
  lastConfirmedBet: null,
  pendingWin: null,

  setAutoBet: (enabled) => set({ autoBet: enabled }),

  setCurrentPrice: (price) => set({ currentPrice: price }),
  setBalance: (amount) => set({ balance: amount }),
  setBetAmount: (amount) => set({ betAmount: amount }),
  setLastWinAmount: (amount) => set({ lastWinAmount: amount }),

  // Called by Phaser when user clicks the grid
  requestBet: (bet) => set((state) => {
      const tokenCost = bet.amount / state.tokenPrice;
      return { 
          pendingBet: bet,
          balance: Math.max(0, state.balance - tokenCost) // Optimistic deduction
      };
  }),

  // Called by React when Transaction is successful
  confirmBet: () => set((state) => ({
      lastConfirmedBet: state.pendingBet, // Signal success to Scene
      pendingBet: null // Clear pending status
  })),

  // Called by React when Transaction fails/rejected
  cancelBet: () => set((state) => {
    if (!state.pendingBet) return {};
    const refundTokens = state.pendingBet.amount / state.tokenPrice;
    return {
        pendingBet: null,
        balance: state.balance + refundTokens // Refund
    };
  }),

  // Called by Phaser after it renders the confirmed box
  clearLastConfirmedBet: () => set({ lastConfirmedBet: null }),

  requestWin: (amountUSD) => set((state) => {
      const tokenReward = amountUSD / state.tokenPrice;
      return { 
          pendingWin: (state.pendingWin || 0) + amountUSD,
          balance: state.balance + tokenReward
      };
  }),

  clearPendingWin: () => set({ pendingWin: null }),
}));
