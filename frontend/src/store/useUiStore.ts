import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStepId = 'profile' | 'route' | 'map' | 'report' | 'palette';

export interface RecentPage {
  to: string;
  label: string;
  labelBn: string;
  visitedAt: string;
}

export interface RecentRoute {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  usedAt: string;
}

export type ToastTone = 'info' | 'success' | 'warning';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const MAX_RECENT_PAGES = 6;
const MAX_RECENT_ROUTES = 5;
const MAX_TOASTS = 3;

let toastCounter = 0;

interface UiState {
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  recentPages: RecentPage[];
  recentRoutes: RecentRoute[];
  onboardingDismissed: boolean;
  onboardingDone: Partial<Record<OnboardingStepId, boolean>>;
  toasts: Toast[];

  setPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  pushRecentPage: (page: Omit<RecentPage, 'visitedAt'>) => void;
  pushRecentRoute: (route: Omit<RecentRoute, 'usedAt'>) => void;
  clearRecentRoutes: () => void;
  completeStep: (step: OnboardingStepId) => void;
  dismissOnboarding: () => void;
  resetOnboarding: () => void;
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      paletteOpen: false,
      shortcutsOpen: false,
      recentPages: [],
      recentRoutes: [],
      onboardingDismissed: false,
      onboardingDone: {},
      toasts: [],

      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

      pushRecentPage: (page) =>
        set((s) => ({
          recentPages: [
            { ...page, visitedAt: new Date().toISOString() },
            ...s.recentPages.filter((p) => p.to !== page.to),
          ].slice(0, MAX_RECENT_PAGES),
        })),

      pushRecentRoute: (route) =>
        set((s) => ({
          recentRoutes: [
            { ...route, usedAt: new Date().toISOString() },
            ...s.recentRoutes.filter((r) => !(r.fromId === route.fromId && r.toId === route.toId)),
          ].slice(0, MAX_RECENT_ROUTES),
        })),

      clearRecentRoutes: () => set({ recentRoutes: [] }),

      completeStep: (step) =>
        set((s) => (s.onboardingDone[step] ? s : { onboardingDone: { ...s.onboardingDone, [step]: true } })),

      dismissOnboarding: () => set({ onboardingDismissed: true }),
      resetOnboarding: () => set({ onboardingDismissed: false, onboardingDone: {} }),

      pushToast: (message, tone = 'info') =>
        set((s) => {
          toastCounter += 1;
          return { toasts: [...s.toasts, { id: toastCounter, message, tone }].slice(-MAX_TOASTS) };
        }),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'accesspath-ui-state',
      // Only personal, non-sensitive convenience data is persisted; no tokens or report content.
      partialize: (state) => ({
        recentPages: state.recentPages,
        recentRoutes: state.recentRoutes,
        onboardingDismissed: state.onboardingDismissed,
        onboardingDone: state.onboardingDone,
      }),
    }
  )
);
