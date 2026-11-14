import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Contrast, Download, Globe, Moon, Sun, Type, WifiOff, ZapOff } from 'lucide-react';
import { useAppStore, type FontSizeScale } from '../../store/useAppStore.ts';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWAInstall.ts';

export const SkipToContentLink: React.FC = () => (
  <a href="#main-content" className="skip-link">
    Skip to main content
  </a>
);

export const LiveAnnouncer: React.FC = () => {
  const liveAnnouncement = useAppStore((s) => s.liveAnnouncement);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {liveAnnouncement}
    </div>
  );
};

export const ThemeToggleButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { theme, toggleTheme, announce } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => {
        toggleTheme();
        announce(`Switched to ${isDark ? 'light' : 'dark'} theme`);
      }}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] hover:border-[#18C6AD]/60 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-[#18C6AD]" aria-hidden="true" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-[#0E9B87]" aria-hidden="true" />
      )}
      {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
};

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18C6AD] text-[#04211E] hover:bg-[#14B29B] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] hover:border-[#18C6AD] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Install on iOS</span>
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="ap-surface w-full max-w-sm rounded-xl p-6 shadow-xl border border-[var(--ap-border)]">
              <h3 className="text-base font-bold text-[var(--ap-text)]">Install AccessPath on iOS</h3>
              <p className="mt-2 text-sm text-[var(--ap-muted)]">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2 rounded-lg bg-[#18C6AD] text-[#04211E] text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const cachedGraph = useAppStore((s) => s.cachedCampusGraph);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#92400E] px-3.5 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        {t('common.offlineMode')}
        {cachedGraph ? ` (Cached: ${new Date(cachedGraph.cachedAt).toLocaleTimeString()})` : ''}
      </span>
    </div>
  );
};

export const AccessibilitySyncEffect: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const highContrast = useAppStore((s) => s.highContrast);
  const fontSize = useAppStore((s) => s.fontSize);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const language = useAppStore((s) => s.language);
  const { i18n } = useTranslation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('reduced-motion', reducedMotion);
    root.setAttribute('data-font-size', fontSize);
    root.setAttribute('lang', language);
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [theme, highContrast, fontSize, reducedMotion, language, i18n]);

  return null;
};

export const AccessibilityQuickControls: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { t } = useTranslation();
  const {
    language,
    setLanguage,
    highContrast,
    toggleHighContrast,
    fontSize,
    setFontSize,
    reducedMotion,
    toggleReducedMotion,
    lowBandwidth,
    toggleLowBandwidth,
    announce,
  } = useAppStore();

  const cycleFontSize = () => {
    const order: FontSizeScale[] = ['sm', 'base', 'lg', 'xl'];
    const next = order[(order.indexOf(fontSize) + 1) % order.length];
    setFontSize(next);
    announce(`Font size set to ${next}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Accessibility controls">
      <ThemeToggleButton compact={compact} />

      <button
        type="button"
        onClick={() => {
          const next = language === 'en' ? 'bn' : 'en';
          setLanguage(next);
          announce(`Language switched to ${next === 'bn' ? 'Bengali' : 'English'}`);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] hover:border-[#18C6AD]/60 whitespace-nowrap cursor-pointer transition-colors"
        aria-label="Switch language between English and Bengali"
      >
        <Globe className="w-3.5 h-3.5 text-[#18C6AD]" aria-hidden="true" />
        <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          toggleHighContrast();
          announce(`High contrast ${!highContrast ? 'enabled' : 'disabled'}`);
        }}
        aria-pressed={highContrast}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
          highContrast
            ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD] font-semibold'
            : 'bg-[var(--ap-surface)] text-[var(--ap-text)] border-[var(--ap-border)] hover:border-[#18C6AD]/60'
        }`}
      >
        <Contrast className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t('common.highContrast')}</span>
      </button>

      <button
        type="button"
        onClick={cycleFontSize}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] hover:border-[#18C6AD]/60 whitespace-nowrap cursor-pointer transition-colors"
        aria-label={`Adjust text size, current ${fontSize}`}
      >
        <Type className="w-3.5 h-3.5 text-[#32A7D9]" aria-hidden="true" />
        <span>{t('common.fontSize')}: {fontSize.toUpperCase()}</span>
      </button>

      {!compact && (
        <>
          <button
            type="button"
            onClick={toggleReducedMotion}
            aria-pressed={reducedMotion}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
              reducedMotion
                ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD] font-semibold'
                : 'bg-[var(--ap-surface)] text-[var(--ap-text)] border-[var(--ap-border)] hover:border-[#18C6AD]/60'
            }`}
          >
            <ZapOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('common.reducedMotion')}</span>
          </button>

          <button
            type="button"
            onClick={toggleLowBandwidth}
            aria-pressed={lowBandwidth}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
              lowBandwidth
                ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD] font-semibold'
                : 'bg-[var(--ap-surface)] text-[var(--ap-text)] border-[var(--ap-border)] hover:border-[#18C6AD]/60'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('common.lowBandwidth')}</span>
          </button>
        </>
      )}
    </div>
  );
};
