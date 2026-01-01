import { create } from 'zustand';

interface GameState {
  currentPrice: number;
  balance: number;
  betAmount: number;
  lastWinAmount: number;
  
  // Bridge State for Asset Management
  pendingBet: number | null;
  pendingWin: number | null;

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
  balance: 0, // Initial balance 0, will sync from server
  betAmount: 1,
  lastWinAmount: 0,
  
  pendingBet: null,
  pendingWin: null,

  setCurrentPrice: (price) => set({ currentPrice: price }),
  
  setBalance: (amount) => set({ balance: amount }),
  
  setBetAmount: (amount) => set({ betAmount: amount }),
  
  setLastWinAmount: (amount) => set({ lastWinAmount: amount }),

  // Called by Phaser when user places a bet
  requestBet: (amount) => set((state) => ({ 
      pendingBet: (state.pendingBet || 0) + amount,
      balance: state.balance - amount // Optimistic update
  })),

  // Called by Phaser when user wins
  requestWin: (amount) => set((state) => ({ 
      pendingWin: (state.pendingWin || 0) + amount,
      balance: state.balance + amount // Optimistic update
  })),

  clearPendingBet: () => set({ pendingBet: null }),
  clearPendingWin: () => set({ pendingWin: null }),
}));
