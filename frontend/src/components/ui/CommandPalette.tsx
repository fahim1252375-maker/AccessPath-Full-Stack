import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  BookOpen,
  Clock,
  Compass,
  Contrast,
  CornerDownLeft,
  FileText,
  Globe,
  HelpCircle,
  Keyboard,
  RotateCcw,
  Search,
  Shield,
  Sun,
  Type,
  ZapOff,
} from 'lucide-react';
import { useAppStore, type FontSizeScale } from '../../store/useAppStore.ts';
import { useUiStore } from '../../store/useUiStore.ts';
import { FEATURE_CATALOG } from '../../data/featureCatalog.ts';
import {
  destinationsForRole,
  normalizeText,
  searchItems,
  type NavGroup,
} from '../../data/quickNav.ts';

interface PaletteItem {
  id: string;
  label: string;
  labelBn: string;
  group: string;
  keywords: string[];
  icon: React.ReactNode;
  run: () => void;
}

const FONT_STEPS: FontSizeScale[] = ['sm', 'base', 'lg', 'xl'];

const GROUP_ICONS: Record<NavGroup, React.ReactNode> = {
  Navigate: <Compass className="w-4 h-4" aria-hidden="true" />,
  'Report & Community': <FileText className="w-4 h-4" aria-hidden="true" />,
  Operations: <Shield className="w-4 h-4" aria-hidden="true" />,
  'Help & Info': <HelpCircle className="w-4 h-4" aria-hidden="true" />,
};

const T = {
  placeholder: { en: 'Search pages, actions and features…', bn: 'পেজ, অ্যাকশন বা ফিচার খুঁজুন…' },
  empty: { en: 'No matches. Try a different word.', bn: 'কিছু পাওয়া যায়নি। অন্য শব্দ লিখে দেখুন।' },
  recent: { en: 'Recently visited', bn: 'সম্প্রতি দেখা' },
  actions: { en: 'Quick actions', bn: 'দ্রুত অ্যাকশন' },
  features: { en: 'Feature docs', bn: 'ফিচার ডকুমেন্ট' },
  hint: { en: '↑↓ to move · Enter to open · Esc to close', bn: '↑↓ দিয়ে বাছুন · Enter দিয়ে খুলুন · Esc দিয়ে বন্ধ করুন' },
} as const;

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const open = useUiStore((s) => s.paletteOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const recentPages = useUiStore((s) => s.recentPages);
  const completeStep = useUiStore((s) => s.completeStep);
  const role = useAppStore((s) => s.user?.role);
  const language = useAppStore((s) => s.language);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = React.useCallback(() => setPaletteOpen(false), [setPaletteOpen]);

  // Reset state and manage focus every time the palette opens or closes.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActiveIndex(0);
    completeStep('palette');
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open, completeStep]);

  const items = useMemo<PaletteItem[]>(() => {
    const go = (to: string) => () => navigate(to);
    const ui = () => useUiStore.getState();
    const app = () => useAppStore.getState();
    const say = (en: string, bn: string) => ui().pushToast(app().language === 'bn' ? bn : en, 'success');

    const destinations: PaletteItem[] = destinationsForRole(role).map((d) => ({
      id: `nav:${d.id}`,
      label: d.label,
      labelBn: d.labelBn,
      group: d.group,
      keywords: d.keywords,
      icon: GROUP_ICONS[d.group],
      run: go(d.to),
    }));

    const actions: PaletteItem[] = [
      {
        id: 'act:theme',
        label: 'Toggle dark / light theme',
        labelBn: 'ডার্ক / লাইট থিম বদলান',
        keywords: ['theme', 'dark', 'light', 'mode', 'night', 'color'],
        icon: <Sun className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          app().toggleTheme();
          const dark = app().theme === 'dark';
          say(dark ? 'Dark theme on' : 'Light theme on', dark ? 'ডার্ক থিম চালু' : 'লাইট থিম চালু');
        },
      },
      {
        id: 'act:contrast',
        label: 'Toggle high contrast',
        labelBn: 'হাই কনট্রাস্ট চালু / বন্ধ',
        keywords: ['contrast', 'vision', 'accessibility', 'visibility'],
        icon: <Contrast className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          app().toggleHighContrast();
          const on = app().highContrast;
          say(on ? 'High contrast on' : 'High contrast off', on ? 'হাই কনট্রাস্ট চালু' : 'হাই কনট্রাস্ট বন্ধ');
        },
      },
      {
        id: 'act:text-larger',
        label: 'Make text larger',
        labelBn: 'লেখা বড় করুন',
        keywords: ['font', 'size', 'bigger', 'zoom', 'increase'],
        icon: <Type className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          const next = FONT_STEPS[Math.min(FONT_STEPS.indexOf(app().fontSize) + 1, FONT_STEPS.length - 1)];
          app().setFontSize(next);
          say(`Text size: ${next}`, `লেখার আকার: ${next}`);
        },
      },
      {
        id: 'act:text-smaller',
        label: 'Make text smaller',
        labelBn: 'লেখা ছোট করুন',
        keywords: ['font', 'size', 'smaller', 'decrease'],
        icon: <Type className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          const next = FONT_STEPS[Math.max(FONT_STEPS.indexOf(app().fontSize) - 1, 0)];
          app().setFontSize(next);
          say(`Text size: ${next}`, `লেখার আকার: ${next}`);
        },
      },
      {
        id: 'act:language',
        label: 'Switch language (English / বাংলা)',
        labelBn: 'ভাষা বদলান (English / বাংলা)',
        keywords: ['language', 'bangla', 'bengali', 'english', 'bhasha', 'translate'],
        icon: <Globe className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          const next = app().language === 'en' ? 'bn' : 'en';
          app().setLanguage(next);
          ui().pushToast(next === 'bn' ? 'ভাষা: বাংলা' : 'Language: English', 'success');
        },
      },
      {
        id: 'act:motion',
        label: 'Toggle reduced motion',
        labelBn: 'অ্যানিমেশন কমান / স্বাভাবিক করুন',
        keywords: ['animation', 'motion', 'calm'],
        icon: <ZapOff className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          app().toggleReducedMotion();
          const on = app().reducedMotion;
          say(on ? 'Reduced motion on' : 'Reduced motion off', on ? 'অ্যানিমেশন কমানো হয়েছে' : 'অ্যানিমেশন স্বাভাবিক');
        },
      },
      {
        id: 'act:bandwidth',
        label: 'Toggle low-bandwidth mode',
        labelBn: 'লো-ব্যান্ডউইথ মোড চালু / বন্ধ',
        keywords: ['data', 'slow', 'internet', 'save', 'bandwidth'],
        icon: <ZapOff className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          app().toggleLowBandwidth();
          const on = app().lowBandwidth;
          say(on ? 'Low-bandwidth mode on' : 'Low-bandwidth mode off', on ? 'লো-ব্যান্ডউইথ চালু' : 'লো-ব্যান্ডউইথ বন্ধ');
        },
      },
      {
        id: 'act:ai',
        label: 'Ask AccessPath AI',
        labelBn: 'AccessPath AI-কে জিজ্ঞাসা করুন',
        keywords: ['assistant', 'chat', 'help', 'gemini', 'bot', 'ai'],
        icon: <Bot className="w-4 h-4" aria-hidden="true" />,
        run: () => app().setAiAssistantOpen(true),
      },
      {
        id: 'act:shortcuts',
        label: 'Keyboard shortcuts',
        labelBn: 'কীবোর্ড শর্টকাট',
        keywords: ['keys', 'hotkeys', 'help', 'keyboard'],
        icon: <Keyboard className="w-4 h-4" aria-hidden="true" />,
        run: () => ui().setShortcutsOpen(true),
      },
      {
        id: 'act:guide',
        label: 'Restart the welcome guide',
        labelBn: 'ওয়েলকাম গাইড আবার শুরু করুন',
        keywords: ['onboarding', 'tutorial', 'getting started', 'checklist'],
        icon: <RotateCcw className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          ui().resetOnboarding();
          navigate('/app');
        },
      },
    ].map((a) => ({ ...a, group: 'Quick actions' }));

    return [...destinations, ...actions];
    // `language` is intentionally not a dependency: labels for both languages are stored on each item.
  }, [navigate, role]);

  const results = useMemo<PaletteItem[]>(() => {
    const trimmed = normalizeText(query);

    if (!trimmed) {
      const known = new Map(items.map((item) => [item.id, item]));
      const recent: PaletteItem[] = recentPages
        .slice(0, 4)
        .map((page) => {
          const match = [...known.values()].find((i) => i.id.startsWith('nav:') && i.label === page.label);
          return match ? { ...match, id: `recent:${match.id}`, group: 'Recently visited' } : null;
        })
        .filter((entry): entry is PaletteItem => entry !== null)
        .map((entry) => ({ ...entry, icon: <Clock className="w-4 h-4" aria-hidden="true" /> }));
      return [...recent, ...items];
    }

    const matches = searchItems(items, query).slice(0, 12);

    // Feature docs are only searched from 3 characters on, so single letters stay fast and relevant.
    if (trimmed.length < 3) return matches;
    const featureItems: PaletteItem[] = searchItems(
      FEATURE_CATALOG.map((f) => ({ label: `${f.id} ${f.name}`, labelBn: '', keywords: [f.moduleName], entry: f })),
      query
    )
      .slice(0, 5)
      .map((hit) => ({
        id: `feature:${hit.entry.id}`,
        label: `${hit.entry.id} · ${hit.entry.name}`,
        labelBn: `${hit.entry.id} · ${hit.entry.name}`,
        group: 'Feature docs',
        keywords: [],
        icon: <BookOpen className="w-4 h-4" aria-hidden="true" />,
        run: () => navigate(`/features/${hit.entry.id}`),
      }));
    return [...matches, ...featureItems];
  }, [items, query, recentPages, navigate]);

  // Keep the highlighted row valid when the result list shrinks.
  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(Math.max(results.length - 1, 0));
  }, [results.length, activeIndex]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`palette-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open) return null;

  const label = (item: PaletteItem) => (language === 'bn' && item.labelBn ? item.labelBn : item.label);
  const groupLabel = (group: string) => {
    if (group === 'Recently visited') return T.recent[language];
    if (group === 'Quick actions') return T.actions[language];
    if (group === 'Feature docs') return T.features[language];
    return group;
  };

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    close();
    // Run after closing so focus restoration cannot fight with a route change.
    window.setTimeout(item.run, 0);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(results[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      // Keep focus on the search field; the list is driven by the arrow keys.
      event.preventDefault();
    }
  };

  const showHeaders = normalizeText(query) === '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[10vh] no-print"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={language === 'bn' ? 'দ্রুত খোঁজ' : 'Quick search'}
        className="ap-surface w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--ap-border)] bg-[var(--ap-surface)] shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-[var(--ap-border)] px-4">
          <Search className="w-4 h-4 text-[var(--ap-muted)] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-listbox"
            aria-activedescendant={results.length > 0 ? `palette-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder={T.placeholder[language]}
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full bg-transparent text-base text-[var(--ap-text)] placeholder:text-[var(--ap-muted)] focus:outline-none focus-visible:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded-md border border-[var(--ap-border)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--ap-muted)]">
            Esc
          </kbd>
        </div>

        <ul id="palette-listbox" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-[var(--ap-muted)]" role="presentation">
              {T.empty[language]}
            </li>
          )}
          {results.map((item, index) => {
            const previous = results[index - 1];
            const isActive = index === activeIndex;
            return (
              <React.Fragment key={item.id}>
                {showHeaders && (!previous || previous.group !== item.group) && (
                  <li role="presentation" className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ap-muted)]">
                    {groupLabel(item.group)}
                  </li>
                )}
                <li
                  id={`palette-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => runItem(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    isActive ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-text)]'
                  }`}
                >
                  <span className={isActive ? 'text-[#04211E]' : 'text-[#32A7D9]'}>{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{label(item)}</span>
                  {!showHeaders && (
                    <span className={`shrink-0 text-[11px] ${isActive ? 'text-[#04211E]/80' : 'text-[var(--ap-muted)]'}`}>
                      {groupLabel(item.group)}
                    </span>
                  )}
                  {isActive && <CornerDownLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>

        <div className="border-t border-[var(--ap-border)] bg-[var(--ap-surface-2)] px-4 py-2 text-[11px] text-[var(--ap-muted)]">
          {T.hint[language]}
        </div>
      </div>
    </div>
  );
};
