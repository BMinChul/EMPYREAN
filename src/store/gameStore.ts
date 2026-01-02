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
  
  // UI Signals
  connectionError: boolean;
  setConnectionError: (show: boolean) => void;

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
  confirmBet: (betId: string, txHash: string) => void; // Moves pending -> confirmed (Requires ID check)
  cancelBet: () => void; // Clears pending, refunds optimistic update
  clearLastConfirmedBet: () => void; // Called by Scene after rendering the real box

  clearPendingBet: () => void; // Explicit cleanup for errors

  clearPendingWin: () => void;

  // Server Integration Actions
  registerServerBet: (bet: BetRequest) => Promise<void>;
  claimServerPayout: (betId: string) => Promise<void>;
  fetchActiveBets: () => Promise<any[]>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentPrice: 0,
  balance: 0, 
  betAmount: 1, // Default to 1 CROSS
  lastWinAmount: 0,
  userAddress: null,
  autoBet: true,
  
  pendingBet: null,
  lastConfirmedBet: null,
  pendingWin: null,
  connectionError: false,

  setAutoBet: (enabled) => set({ autoBet: enabled }),
  setConnectionError: (show) => set({ connectionError: show }),

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
  confirmBet: (betId, txHash) => set((state) => {
      if (!state.pendingBet) return {};
      
      // CRITICAL SECURITY FIX: Ghost Bet Prevention
      // Only confirm if the finishing transaction matches the current pending bet.
      // If user started Bet B while Bet A was mining (and A finishes), ignore A.
      if (state.pendingBet.id !== betId) {
          console.warn("⚠️ Ignored Stale Transaction Confirmation", { txBetId: betId, currentBetId: state.pendingBet.id });
          return {}; 
      }

      return {
          lastConfirmedBet: { ...state.pendingBet, txHash }, // Signal success to Scene
          pendingBet: null // Clear pending status (Releases Lock)
      };
  }),

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

  clearPendingBet: () => set((state) => {
    if (!state.pendingBet) return {};
    // Refund logic is handled here
    return {
        pendingBet: null, // Releases Global Lock
        balance: state.balance + state.pendingBet.amount 
    };
  }),

  requestWin: (amount) => set((state) => {
      return { 
          balance: state.balance + amount
      };
  }),

  clearPendingWin: () => set({ }), // No longer used for client-side minting, server handles it

  registerServerBet: async (bet) => {
      const { userAddress } = get();
      if (!userAddress) return;
      
      try {
          await fetch('https://gene-fragmental-addisyn.ngrok-free.dev/api/place-bet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  betId: bet.id,
                  userAddress: userAddress,
                  betAmount: bet.amount,
                  multiplier: bet.multiplier
              })
          });
      } catch (err) {
          console.error("Failed to register bet with server:", err);
      }
  },

  claimServerPayout: async (betId) => {
      const { userAddress } = get();
      if (!userAddress) return;

      try {
          await fetch('https://gene-fragmental-addisyn.ngrok-free.dev/api/payout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  betId: betId,
                  userAddress: userAddress
              })
          });
      } catch (err) {
          console.error("Failed to claim payout from server:", err);
      }
  },

  fetchActiveBets: async () => {
      const { userAddress } = get();
      if (!userAddress) return [];

      try {
          const res = await fetch(`https://gene-fragmental-addisyn.ngrok-free.dev/api/my-bets/${userAddress}`);
          if (res.ok) {
              const data = await res.json();
              return Array.isArray(data) ? data : [];
          }
      } catch (err) {
          console.warn("Failed to fetch active bets:", err);
      }
      return [];
  },
}));
