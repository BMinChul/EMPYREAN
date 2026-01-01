import { create } from 'zustand';

interface GameState {
  currentPrice: number;
  balance: number; // In tCROSS tokens
  tokenPrice: number; // USD value of 1 tCROSS
  
  betAmount: number; // In USD
  lastWinAmount: number; // In USD
  
  // Bridge State for Asset Management
  pendingBet: number | null; // In Tokens
  pendingWin: number | null; // In Tokens

  setCurrentPrice: (price: number) => void;
  setTokenPrice: (price: number) => void;
  setBalance: (amount: number) => void;
  setBetAmount: (amount: number) => void;
  setLastWinAmount: (amount: number) => void;
  
  // Actions called by Phaser
  // Request a bet of X USD
  requestBet: (amountUSD: number) => void;
  // Request a win of X USD
  requestWin: (amountUSD: number) => void;
  
  // Actions called by React after processing
  clearPendingBet: () => void;
  clearPendingWin: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentPrice: 0,
  balance: 0, 
  tokenPrice: 1.25, // Initial simulated price
  
  betAmount: 1,
  lastWinAmount: 0,
  
  pendingBet: null,
  pendingWin: null,

  setCurrentPrice: (price) => set({ currentPrice: price }),
  setTokenPrice: (price) => set({ tokenPrice: price }),
  
  setBalance: (amount) => set({ balance: amount }),
  
  setBetAmount: (amount) => set({ betAmount: amount }),
  
  setLastWinAmount: (amount) => set({ lastWinAmount: amount }),

  // Called by Phaser when user places a bet (Amount is in USD)
  requestBet: (amountUSD) => {
    const { tokenPrice, balance } = get();
    // Calculate token amount: $10 / $1.25 = 8 Tokens
    const tokenAmount = amountUSD / tokenPrice;
    
    set((state) => ({ 
      pendingBet: (state.pendingBet || 0) + tokenAmount,
      balance: state.balance - tokenAmount // Optimistic update
    }));
  },

  // Called by Phaser when user wins (Amount is in USD)
  requestWin: (amountUSD) => {
    const { tokenPrice } = get();
    // Calculate token amount: $20 / $1.25 = 16 Tokens
    const tokenAmount = amountUSD / tokenPrice;

    set((state) => ({ 
      pendingWin: (state.pendingWin || 0) + tokenAmount,
      balance: state.balance + tokenAmount // Optimistic update
    }));
  },

  clearPendingBet: () => set({ pendingBet: null }),
  clearPendingWin: () => set({ pendingWin: null }),
}));
