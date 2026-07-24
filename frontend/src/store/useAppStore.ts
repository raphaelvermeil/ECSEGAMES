import { create } from "zustand";

// Placeholder global store. Real slices (auth, team, competitions) come later.
interface AppState {
  ready: boolean;
  setReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));
