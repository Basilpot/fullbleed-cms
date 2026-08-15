import { create } from "zustand";

interface SidebarStore {
  hidden: string[];
  loaded: boolean;
  setHidden: (urls: string[]) => void;
  toggle: (url: string) => void;
  reset: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  hidden: [],
  loaded: false,
  setHidden: (urls) => set({ hidden: urls, loaded: true }),
  toggle: (url) =>
    set((state) => ({
      hidden: state.hidden.includes(url)
        ? state.hidden.filter((u) => u !== url)
        : [...state.hidden, url],
    })),
  reset: () => set({ hidden: [] }),
}));
