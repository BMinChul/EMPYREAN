import { create } from 'zustand';

interface GameState {
  currentPrice: number;
  balance: number; // In tCROSS tokens
  tokenPrice: number; // Value of 1 tCROSS in USD
  betAmount: number; // In USD
  lastWinAmount: number; // In USD
  
  // Bridge State for Asset Management
  pendingBet: number | null; // In USD
  pendingWin: number | null; // In USD

  setCurrentPrice: (price: number) => void;
  setBalance: (amount: number) => void;
  setBetAmount: (amount: number) => void;
  setLastWinAmount: (amount: number) => void;
  
  // Actions called by Phaser
  requestBet: (amount: number) => void;
  requestWin: (amount: number) => void;
  
  // Actions called by React after processing
  clearPendingBet: () => void;
  clearPendingWin: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentPrice: 0,
  balance: 0, 
  tokenPrice: 0.10, // Fixed price for tCROSS (1 Token = $0.10)
  betAmount: 1,
  lastWinAmount: 0,
  
  pendingBet: null,
  pendingWin: null,

  setCurrentPrice: (price) => set({ currentPrice: price }),
  
  setBalance: (amount) => set({ balance: amount }),
  
  setBetAmount: (amount) => set({ betAmount: amount }),
  
  setLastWinAmount: (amount) => set({ lastWinAmount: amount }),

  // Called by Phaser when user places a bet
  requestBet: (amountUSD) => set((state) => {
      // Calculate token cost
      const tokenCost = amountUSD / state.tokenPrice;
      return { 
          pendingBet: (state.pendingBet || 0) + amountUSD,
          balance: Math.max(0, state.balance - tokenCost) // Optimistic update
      };
  }),

  // Called by Phaser when user wins
  requestWin: (amountUSD) => set((state) => {
      // Calculate token reward
      const tokenReward = amountUSD / state.tokenPrice;
      return { 
          pendingWin: (state.pendingWin || 0) + amountUSD,
          balance: state.balance + tokenReward // Optimistic update
      };
  }),

  clearPendingBet: () => set({ pendingBet: null }),
  clearPendingWin: () => set({ pendingWin: null }),
}));
