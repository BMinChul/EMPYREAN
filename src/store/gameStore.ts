import { create } from 'zustand';

interface GameState {
  currentPrice: number;
  balance: number;
  betAmount: number;
  lastWinAmount: number; // For notification
  setCurrentPrice: (price: number) => void;
  updateBalance: (amount: number) => void;
  setBalance: (amount: number) => void;
  setBetAmount: (amount: number) => void;
  setLastWinAmount: (amount: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentPrice: 0,
  balance: 0, // Starting balance controlled by server
  betAmount: 1, // Default bet
  lastWinAmount: 0,
  setCurrentPrice: (price) => set({ currentPrice: price }),
  updateBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
  setBalance: (amount) => set({ balance: amount }),
  setBetAmount: (amount) => set({ betAmount: amount }),
  setLastWinAmount: (amount) => set({ lastWinAmount: amount }),
}));
