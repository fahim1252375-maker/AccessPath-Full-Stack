import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '../routes/AppRouter.tsx';
import { AccessibilitySyncEffect } from '../components/accessibility/AccessibilityControls.tsx';
import { api } from '../services/api.ts';
import { useAppStore } from '../store/useAppStore.ts';
import type { AccessibilityPreferences, UserDTO } from '../../../shared/types.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const SessionHydrator: React.FC = () => {
  const { token, setAuth, setAccessibilityProfile } = useAppStore();

  useEffect(() => {
    if (!token) return;
    api
      .get<{ user: UserDTO; accessibilityProfile?: AccessibilityPreferences }>('/auth/me')
      .then((res) => {
        setAuth(res.user);
        if (res.accessibilityProfile) setAccessibilityProfile(res.accessibilityProfile);
      })
      .catch(() => {
        setAuth(null, null);
      });
  }, [token, setAuth, setAccessibilityProfile]);

  return null;
};

export const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AccessibilitySyncEffect />
    <SessionHydrator />
    <AppRouter />
  </QueryClientProvider>
);
