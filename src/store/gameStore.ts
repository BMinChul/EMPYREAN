import { create } from 'zustand';

// Define the structure of a Bet Request
export interface BetRequest {
  id: string; // Unique ID to link Scene object with Store
  amount: number; // CROSS Tokens
  x: number; // World X position
  y: number; // World Y position
  multiplier: number;
  boxWidth: number;
  boxHeight: number;
  basePrice: number;
  txHash?: string; // Blockchain Transaction Hash
}

interface GameState {
  currentPrice: number;
  balance: number; // In CROSS tokens
  betAmount: number; // In CROSS tokens
  lastWinAmount: number; // In CROSS tokens
  userAddress: string | null;
  
  // Bridge State for Asset Management
  pendingBet: BetRequest | null; // The bet currently waiting for TX approval
  lastConfirmedBet: BetRequest | null; // The bet that just succeeded (Signal to Scene)
  
  autoBet: boolean;
  setAutoBet: (enabled: boolean) => void;

  setCurrentPrice: (price: number) => void;
  setBalance: (amount: number) => void;
  setBetAmount: (amount: number) => void;
  setLastWinAmount: (amount: number) => void;
  setUserAddress: (address: string | null) => void;
  
  // Actions called by Phaser
  requestBet: (bet: BetRequest) => void;
  requestWin: (amount: number) => void; // amount in CROSS
  
  // Actions called by React after processing
  confirmBet: (txHash: string) => void; // Moves pending -> confirmed
  cancelBet: () => void; // Clears pending, refunds optimistic update
  clearLastConfirmedBet: () => void; // Called by Scene after rendering the real box

  clearPendingWin: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentPrice: 0,
  balance: 0, 
  betAmount: 1, // Default to 1 CROSS
  lastWinAmount: 0,
  userAddress: null,
  autoBet: false,
  
  pendingBet: null,
  lastConfirmedBet: null,
  pendingWin: null,

  setAutoBet: (enabled) => set({ autoBet: enabled }),

  setCurrentPrice: (price) => set({ currentPrice: price }),
  setBalance: (amount) => set({ balance: amount }),
  setBetAmount: (amount) => set({ betAmount: amount }),
  setLastWinAmount: (amount) => set({ lastWinAmount: amount }),
  setUserAddress: (address) => set({ userAddress: address }),

  // Called by Phaser when user clicks the grid
  requestBet: (bet) => set((state) => {
      // Optimistic deduction
      return { 
          pendingBet: bet,
          balance: Math.max(0, state.balance - bet.amount) 
      };
  }),

  // Called by React when Transaction is successful
  confirmBet: (txHash) => set((state) => ({
      lastConfirmedBet: { ...state.pendingBet!, txHash }, // Signal success to Scene
      pendingBet: null // Clear pending status
  })),

  // Called by React when Transaction fails/rejected
  cancelBet: () => set((state) => {
    if (!state.pendingBet) return {};
    return {
        pendingBet: null,
        balance: state.balance + state.pendingBet.amount // Refund
    };
  }),

  // Called by Phaser after it renders the confirmed box
  clearLastConfirmedBet: () => set({ lastConfirmedBet: null }),

  requestWin: (amount) => set((state) => {
      return { 
          balance: state.balance + amount
      };
  }),

  clearPendingWin: () => set({ }), // No longer used for client-side minting, server handles it
}));
