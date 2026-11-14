import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { useUiStore, type OnboardingStepId } from '../../store/useUiStore.ts';
import { findDestinationByPath } from '../../data/quickNav.ts';

const STEP_BY_PATH: Record<string, OnboardingStepId> = {
  '/app/accessibility-profile': 'profile',
  '/app/map': 'map',
  '/app/report/new': 'report',
};

/**
 * Runs on every workspace page change:
 *  - remembers the page for "Recently visited"
 *  - ticks the matching welcome-guide step
 *  - sets a meaningful document title
 *  - scrolls to the top and moves keyboard / screen-reader focus to the main region
 * Renders nothing.
 */
export const RouteTracker: React.FC = () => {
  const { pathname, hash } = useLocation();
  const pushRecentPage = useUiStore((s) => s.pushRecentPage);
  const completeStep = useUiStore((s) => s.completeStep);
  const announce = useAppStore((s) => s.announce);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const destination = findDestinationByPath(pathname);

    if (destination && destination.to !== '/app') {
      pushRecentPage({ to: destination.to, label: destination.label, labelBn: destination.labelBn });
    }

    const step = STEP_BY_PATH[pathname];
    if (step) completeStep(step);

    document.title = destination ? `${destination.label} · AccessPath` : 'AccessPath';

    // Do not steal focus or scroll on the very first load, only on in-app navigation.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!hash) window.scrollTo({ top: 0 });
    document.getElementById('main-content')?.focus({ preventScroll: true });
    if (destination) announce(`${destination.label} page`);
  }, [pathname, hash, pushRecentPage, completeStep, announce]);

  return null;
};

/** Floating "back to top" button that appears after the user has scrolled down a long page. */
export const BackToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  const label = language === 'bn' ? 'উপরে ফিরে যান' : 'Back to top';
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={label}
      title={label}
      className="no-print fixed bottom-5 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] shadow-lg transition-colors hover:border-[#18C6AD]/60 hover:text-[#18C6AD] cursor-pointer"
    >
      <ArrowUp className="w-4 h-4" aria-hidden="true" />
    </button>
  );
};
