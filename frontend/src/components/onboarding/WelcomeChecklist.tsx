import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, PartyPopper, Search, X } from 'lucide-react';
import { Card } from '../ui/Primitives.tsx';
import { useAppStore } from '../../store/useAppStore.ts';
import { useUiStore, type OnboardingStepId } from '../../store/useUiStore.ts';

interface Step {
  id: OnboardingStepId;
  to?: string;
  en: string;
  bn: string;
  hintEn: string;
  hintBn: string;
}

const STEPS: Step[] = [
  {
    id: 'profile',
    to: '/app/accessibility-profile',
    en: 'Set your accessibility profile',
    bn: 'আপনার অ্যাক্সেসিবিলিটি প্রোফাইল ঠিক করুন',
    hintEn: 'Routes will match your needs, e.g. step-free or wheelchair.',
    hintBn: 'রুট আপনার প্রয়োজন অনুযায়ী হবে, যেমন সিঁড়িবিহীন বা হুইলচেয়ার।',
  },
  {
    id: 'route',
    to: '/app/planner',
    en: 'Plan your first accessible route',
    bn: 'প্রথম অ্যাক্সেসিবল রুট পরিকল্পনা করুন',
    hintEn: 'Pick where you are and where you want to go.',
    hintBn: 'আপনি কোথায় আছেন আর কোথায় যাবেন তা বাছুন।',
  },
  {
    id: 'map',
    to: '/app/map',
    en: 'Explore the interactive map',
    bn: 'ইন্টারঅ্যাকটিভ ম্যাপ ঘুরে দেখুন',
    hintEn: 'See verified paths, lifts and ramps across campus.',
    hintBn: 'ক্যাম্পাসের যাচাই করা পথ, লিফট ও র‍্যাম্প দেখুন।',
  },
  {
    id: 'report',
    to: '/app/report/new',
    en: 'See how to report a barrier',
    bn: 'বাধা রিপোর্ট করার নিয়ম দেখুন',
    hintEn: 'Broken lift or blocked ramp? Reporting takes about a minute.',
    hintBn: 'লিফট নষ্ট বা র‍্যাম্প বন্ধ? রিপোর্ট করতে এক মিনিটের মতো লাগে।',
  },
  {
    id: 'palette',
    en: 'Try quick search',
    bn: 'দ্রুত খোঁজ চেষ্টা করুন',
    hintEn: 'Press Ctrl+K (or ⌘K) to jump anywhere or change settings.',
    hintBn: 'যেকোনো জায়গায় যেতে বা সেটিংস বদলাতে Ctrl+K (বা ⌘K) চাপুন।',
  },
];

export const WelcomeChecklist: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const done = useUiStore((s) => s.onboardingDone);
  const dismissed = useUiStore((s) => s.onboardingDismissed);
  const dismissOnboarding = useUiStore((s) => s.dismissOnboarding);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  if (dismissed) return null;

  const bn = language === 'bn';
  const completed = STEPS.filter((s) => done[s.id]).length;
  const percent = Math.round((completed / STEPS.length) * 100);
  const allDone = completed === STEPS.length;

  return (
    <Card className="space-y-4" aria-labelledby="welcome-guide-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="welcome-guide-title" className="flex items-center gap-2 text-lg font-bold text-[var(--ap-text)]">
            {allDone && <PartyPopper className="w-5 h-5 text-[#18C6AD]" aria-hidden="true" />}
            <span>
              {allDone
                ? bn ? 'সব শেষ! আপনি প্রস্তুত।' : "All done — you're set!"
                : bn ? 'শুরু করার গাইড' : 'Getting started'}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-[var(--ap-muted)]">
            {bn ? `${completed}/${STEPS.length} ধাপ সম্পন্ন` : `${completed} of ${STEPS.length} steps done`}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissOnboarding}
          aria-label={bn ? 'গাইড লুকান' : 'Hide the guide'}
          title={bn ? 'গাইড লুকান' : 'Hide the guide'}
          className="shrink-0 rounded-lg p-2 text-[var(--ap-muted)] hover:bg-[var(--ap-surface-2)] hover:text-[var(--ap-text)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={bn ? 'গাইডের অগ্রগতি' : 'Guide progress'}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--ap-surface-2)]"
      >
        <div className="h-full rounded-full bg-[#18C6AD] transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {STEPS.map((step) => {
          const isDone = Boolean(done[step.id]);
          const content = (
            <>
              {isDone ? (
                <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-[#18C6AD]" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 w-4 h-4 shrink-0 text-[var(--ap-muted)]" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${isDone ? 'text-[var(--ap-muted)] line-through' : 'text-[var(--ap-text)]'}`}>
                  {bn ? step.bn : step.en}
                </span>
                <span className="block text-xs text-[var(--ap-muted)]">{bn ? step.hintBn : step.hintEn}</span>
                <span className="sr-only">{isDone ? (bn ? 'সম্পন্ন' : 'Completed') : bn ? 'বাকি আছে' : 'Not done yet'}</span>
              </span>
            </>
          );
          const rowClass =
            'flex w-full items-start gap-2.5 rounded-xl border border-[var(--ap-border)] bg-[var(--ap-surface-2)] p-3 text-left transition-colors hover:border-[#18C6AD]/60';
          return (
            <li key={step.id}>
              {step.to ? (
                <Link to={step.to} className={rowClass}>
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={() => setPaletteOpen(true)} className={`${rowClass} cursor-pointer`}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {allDone && (
        <button
          type="button"
          onClick={dismissOnboarding}
          className="text-xs font-semibold text-[#18C6AD] hover:underline cursor-pointer"
        >
          {bn ? 'এই গাইড লুকান' : 'Hide this guide'}
        </button>
      )}
    </Card>
  );
};

/** "Continue where you left off": shortcuts to the last pages the user opened. */
export const RecentlyVisited: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const recentPages = useUiStore((s) => s.recentPages);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const bn = language === 'bn';

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={bn ? 'সম্প্রতি দেখা পেজ' : 'Recently visited pages'}>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--ap-border)] bg-[var(--ap-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ap-muted)] hover:border-[#18C6AD]/60 hover:text-[#18C6AD] cursor-pointer"
      >
        <Search className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{bn ? 'যেকোনো কিছু খুঁজুন' : 'Search anything'}</span>
        <kbd className="hidden sm:inline rounded border border-[var(--ap-border)] px-1 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      {recentPages.length > 0 && (
        <>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--ap-muted)]">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{bn ? 'সম্প্রতি:' : 'Recent:'}</span>
          </span>
          {recentPages.slice(0, 4).map((page) => (
            <Link
              key={page.to}
              to={page.to}
              className="rounded-full border border-[var(--ap-border)] bg-[var(--ap-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ap-text)] hover:border-[#18C6AD]/60 hover:text-[#18C6AD]"
            >
              {bn ? page.labelBn : page.label}
            </Link>
          ))}
        </>
      )}
    </div>
  );
};
