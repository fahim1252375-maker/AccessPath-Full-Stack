import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Primitives.tsx';
import { useAppStore } from '../../store/useAppStore.ts';
import { useUiStore } from '../../store/useUiStore.ts';

/** "g" followed by one of these keys jumps to a page (like GitHub / Gmail). */
export const GO_SHORTCUTS: Array<{ key: string; to: string; en: string; bn: string }> = [
  { key: 'd', to: '/app', en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  { key: 'p', to: '/app/planner', en: 'Route planner', bn: 'রুট প্ল্যানার' },
  { key: 'm', to: '/app/map', en: 'Interactive map', bn: 'ইন্টারঅ্যাকটিভ ম্যাপ' },
  { key: 'l', to: '/app/live-status', en: 'Live facility status', bn: 'লাইভ সুবিধার অবস্থা' },
  { key: 'i', to: '/app/indoor', en: 'Indoor floor maps', bn: 'ইনডোর ফ্লোর ম্যাপ' },
  { key: 'r', to: '/app/report/new', en: 'Report a barrier', bn: 'বাধা রিপোর্ট করুন' },
  { key: 'n', to: '/app/notifications', en: 'Notifications', bn: 'বিজ্ঞপ্তি' },
  { key: 's', to: '/app/saved', en: 'Saved & history', bn: 'সংরক্ষিত ও ইতিহাস' },
  { key: 'e', to: '/app/emergency', en: 'Emergency evacuation', bn: 'জরুরি নির্গমন' },
  { key: 'h', to: '/help', en: 'Help center', bn: 'সহায়তা কেন্দ্র' },
];

const SEQUENCE_TIMEOUT_MS = 1200;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-block min-w-[1.5rem] rounded-md border border-[var(--ap-border)] bg-[var(--ap-surface-2)] px-1.5 py-0.5 text-center font-mono text-xs text-[var(--ap-text)]">
    {children}
  </kbd>
);

/**
 * Registers the app-wide shortcuts and renders the "?" help dialog.
 * Shortcuts never fire while the user is typing in a field or while a modal is open.
 */
export const GlobalShortcuts: React.FC = () => {
  const navigate = useNavigate();
  const language = useAppStore((s) => s.language);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const pendingGoRef = useRef<number | null>(null);

  const closeHelp = useCallback(() => setShortcutsOpen(false), [setShortcutsOpen]);

  useEffect(() => {
    const clearPending = () => {
      if (pendingGoRef.current !== null) {
        window.clearTimeout(pendingGoRef.current);
        pendingGoRef.current = null;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUiStore.getState();

      // Ctrl/Cmd + K always toggles the palette, even from inside a text field.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.setShortcutsOpen(false);
        ui.setPaletteOpen(!ui.paletteOpen);
        clearPending();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target) || ui.paletteOpen || ui.shortcutsOpen) return;

      // Second key of a "g then …" sequence.
      if (pendingGoRef.current !== null) {
        const target = GO_SHORTCUTS.find((s) => s.key === event.key.toLowerCase());
        clearPending();
        if (target) {
          event.preventDefault();
          const label = useAppStore.getState().language === 'bn' ? target.bn : target.en;
          ui.pushToast(label, 'info');
          navigate(target.to);
        }
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        ui.setPaletteOpen(true);
      } else if (event.key === '?') {
        event.preventDefault();
        ui.setShortcutsOpen(true);
      } else if (event.key.toLowerCase() === 'g' && !event.shiftKey) {
        pendingGoRef.current = window.setTimeout(clearPending, SEQUENCE_TIMEOUT_MS);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearPending();
    };
  }, [navigate]);

  const bn = language === 'bn';

  return (
    <Modal
      open={shortcutsOpen}
      onClose={closeHelp}
      title={bn ? 'কীবোর্ড শর্টকাট' : 'Keyboard shortcuts'}
    >
      <div className="space-y-5 text-sm">
        <section aria-label={bn ? 'সাধারণ' : 'General'}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ap-muted)]">
            {bn ? 'সাধারণ' : 'General'}
          </h3>
          <ul className="space-y-2">
            <li className="flex items-center justify-between gap-3">
              <span>{bn ? 'দ্রুত খোঁজ খুলুন' : 'Open quick search'}</span>
              <span className="flex items-center gap-1">
                <Kbd>Ctrl</Kbd>
                <span aria-hidden="true">+</span>
                <Kbd>K</Kbd>
                <span className="px-1 text-xs text-[var(--ap-muted)]">{bn ? 'বা' : 'or'}</span>
                <Kbd>/</Kbd>
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>{bn ? 'এই তালিকা দেখান' : 'Show this list'}</span>
              <Kbd>?</Kbd>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>{bn ? 'ডায়ালগ বন্ধ করুন' : 'Close a dialog'}</span>
              <Kbd>Esc</Kbd>
            </li>
          </ul>
        </section>

        <section aria-label={bn ? 'দ্রুত যান' : 'Go to'}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ap-muted)]">
            {bn ? 'দ্রুত যান (আগে G, তারপর অক্ষর)' : 'Go to (press G, then a letter)'}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {GO_SHORTCUTS.map((shortcut) => (
              <li key={shortcut.key} className="flex items-center justify-between gap-3">
                <span>{bn ? shortcut.bn : shortcut.en}</span>
                <span className="flex items-center gap-1">
                  <Kbd>G</Kbd>
                  <Kbd>{shortcut.key.toUpperCase()}</Kbd>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-[var(--ap-muted)]">
          {bn
            ? 'লেখার ঘরে টাইপ করার সময় শর্টকাট কাজ করে না, তাই টাইপ করতে কোনো সমস্যা হবে না।'
            : 'Shortcuts are paused while you type in a field, so they never get in the way of writing.'}
        </p>
      </div>
    </Modal>
  );
};
