import { create } from 'zustand';

interface GameState {
  currentPrice: number;
  balance: number;
  setCurrentPrice: (price: number) => void;
  updateBalance: (amount: number) => void;
  setBalance: (amount: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentPrice: 0,
  balance: 1000, // Starting balance
  setCurrentPrice: (price) => set({ currentPrice: price }),
  updateBalance: (amount) => set((state) => ({ balance: state.balance + amount })),
  setBalance: (amount) => set({ balance: amount }),
}));
