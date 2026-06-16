import { create } from "zustand";
import { persist } from "zustand/middleware";

export type KeyboardLayout = "qwerty" | "dvorak";
export type PracticeLanguage = "ko" | "en";

interface Settings {
  language: PracticeLanguage;
  layout: KeyboardLayout;
  showLiveHeatmap: boolean;
}

interface AppState {
  settings: Settings;
  setLanguage: (language: PracticeLanguage) => void;
  setLayout: (layout: KeyboardLayout) => void;
  toggleLiveHeatmap: () => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  language: "ko",
  layout: "qwerty",
  showLiveHeatmap: true,
};

/**
 * Global app store. Settings persist to LocalStorage so the MVP works fully
 * client-side; high-frequency keystroke state will live in a separate,
 * non-persisted store introduced in Phase 2.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setLanguage: (language) => set((state) => ({ settings: { ...state.settings, language } })),
      setLayout: (layout) => set((state) => ({ settings: { ...state.settings, layout } })),
      toggleLiveHeatmap: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            showLiveHeatmap: !state.settings.showLiveHeatmap,
          },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "typediag-settings",
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);
