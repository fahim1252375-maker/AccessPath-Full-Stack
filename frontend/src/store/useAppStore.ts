import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AccessibilityPreferences,
  CampusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  UserDTO,
} from '../../../shared/types.ts';

export type FontSizeScale = 'sm' | 'base' | 'lg' | 'xl';

export interface OfflineReportDraft {
  id: string;
  clientRequestId: string;
  campusId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  locationLabel: string;
  language: 'en' | 'bn';
  savedAt: string;
}

interface AppState {
  user: UserDTO | null;
  token: string | null;
  accessibilityProfile: AccessibilityPreferences;
  selectedCampusId: string;
  language: 'en' | 'bn';
  theme: 'dark' | 'light';
  highContrast: boolean;
  fontSize: FontSizeScale;
  reducedMotion: boolean;
  lowBandwidth: boolean;
  aiAssistantOpen: boolean;
  offlineDrafts: OfflineReportDraft[];
  cachedCampusGraph: {
    campusId: string;
    graphVersion: number;
    campus: CampusDTO;
    locations: LocationNodeDTO[];
    edges: PathEdgeDTO[];
    cachedAt: string;
  } | null;
  liveAnnouncement: string;

  setAuth: (user: UserDTO | null, token?: string | null) => void;
  setAccessibilityProfile: (profile: AccessibilityPreferences) => void;
  setSelectedCampusId: (campusId: string) => void;
  setLanguage: (lang: 'en' | 'bn') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  toggleHighContrast: () => void;
  setFontSize: (size: FontSizeScale) => void;
  toggleReducedMotion: () => void;
  toggleLowBandwidth: () => void;
  setAiAssistantOpen: (open: boolean) => void;
  addOfflineDraft: (draft: Omit<OfflineReportDraft, 'clientRequestId'> & { clientRequestId?: string }) => void;
  removeOfflineDraft: (id: string) => void;
  setCachedCampusGraph: (data: {
    campusId: string;
    graphVersion?: number;
    campus: CampusDTO;
    locations: LocationNodeDTO[];
    edges: PathEdgeDTO[];
  }) => void;
  announce: (message: string) => void;
}

const defaultProfile: AccessibilityPreferences = {
  wheelchairMode: false,
  stepFreeMode: true,
  limitedMobilityMode: false,
  rampRequired: false,
  elevatorRequired: false,
  stairsAvoidance: true,
  smoothSurfacePreference: false,
  widePathPreference: false,
  lowGradientPreference: false,
  wellLitPreference: false,
  visualAssistanceMode: false,
  customNotes: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      accessibilityProfile: defaultProfile,
      selectedCampusId: 'campus_demo_north',
      language: 'en',
      theme: 'dark',
      highContrast: false,
      fontSize: 'base',
      reducedMotion: false,
      lowBandwidth: false,
      aiAssistantOpen: false,
      offlineDrafts: [],
      cachedCampusGraph: null,
      liveAnnouncement: '',

      setAuth: (user, token) =>
        set((state) => ({
          user,
          token: token === undefined ? state.token : token,
        })),
      setAccessibilityProfile: (accessibilityProfile) => set({ accessibilityProfile }),
      setSelectedCampusId: (selectedCampusId) => set({ selectedCampusId }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
          document.documentElement.setAttribute('data-theme', theme);
        }
        set({ theme });
      },
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next === 'dark');
            document.documentElement.setAttribute('data-theme', next);
          }
          return { theme: next };
        }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
      toggleLowBandwidth: () => set((s) => ({ lowBandwidth: !s.lowBandwidth })),
      setAiAssistantOpen: (aiAssistantOpen) => set({ aiAssistantOpen }),
      addOfflineDraft: (draft) =>
        set((s) => ({
          offlineDrafts: [
            {
              ...draft,
              clientRequestId:
                draft.clientRequestId ||
                `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            },
            ...s.offlineDrafts,
          ],
        })),
      removeOfflineDraft: (id) =>
        set((s) => ({ offlineDrafts: s.offlineDrafts.filter((d) => d.id !== id) })),
      setCachedCampusGraph: (data) =>
        set({
          cachedCampusGraph: {
            ...data,
            graphVersion: data.graphVersion ?? data.campus.graphVersion ?? 1,
            cachedAt: new Date().toISOString(),
          },
        }),
      announce: (liveAnnouncement) => set({ liveAnnouncement }),
    }),
    {
      name: 'accesspath-app-state',
      partialize: (state) => ({
        token: state.token,
        accessibilityProfile: state.accessibilityProfile,
        selectedCampusId: state.selectedCampusId,
        language: state.language,
        theme: state.theme,
        highContrast: state.highContrast,
        fontSize: state.fontSize,
        reducedMotion: state.reducedMotion,
        lowBandwidth: state.lowBandwidth,
        offlineDrafts: state.offlineDrafts,
        cachedCampusGraph: state.cachedCampusGraph,
      }),
    }
  )
);
