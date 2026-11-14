import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Flag,
  Square,
  Undo2,
  Volume2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Select } from '../ui/Primitives.tsx';
import type {
  DirectionLanguage,
  DirectionStepDTO,
  RouteDirectionsDTO,
} from '../../../../shared/types.ts';

/** BCP-47 tags used for speech synthesis. */
const SPEECH_LANG: Record<DirectionLanguage, string> = { en: 'en-US', bn: 'bn-BD' };
const SPEECH_RATES = [0.8, 1, 1.2] as const;

const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function pickVoice(language: DirectionLanguage): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(language));
}

const TURN_ICONS = {
  straight: ArrowUp,
  slight_left: ArrowUpLeft,
  slight_right: ArrowUpRight,
  left: ArrowLeft,
  right: ArrowRight,
  sharp_left: CornerDownLeft,
  sharp_right: CornerDownRight,
  u_turn: Undo2,
} as const;

const StepIcon: React.FC<{ step: DirectionStepDTO }> = ({ step }) => {
  const className = 'w-4 h-4';
  if (step.kind === 'arrive') return <Flag className={className} aria-hidden="true" />;
  if (step.kind === 'elevator') return <ArrowDownUp className={className} aria-hidden="true" />;
  const Icon = step.turn ? TURN_ICONS[step.turn] : ArrowUp;
  return <Icon className={className} aria-hidden="true" />;
};

interface DirectionsPanelProps {
  /** Pre-built directions for both languages (see `buildBilingualDirections`). */
  directions: Record<DirectionLanguage, RouteDirectionsDTO>;
  initialLanguage?: DirectionLanguage;
}

/**
 * Localized turn-by-turn directions with read-aloud, copy and a language toggle.
 * Works fully offline: it only renders data that has already been calculated.
 */
export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  directions,
  initialLanguage,
}) => {
  const { t } = useTranslation();
  const uiLanguage = useAppStore((state) => state.language);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const announce = useAppStore((state) => state.announce);

  const [language, setLanguage] = useState<DirectionLanguage>(initialLanguage ?? uiLanguage);
  const [rate, setRate] = useState<number>(1);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const runIdRef = useRef(0);
  const activeStepRef = useRef<HTMLLIElement | null>(null);
  const current = directions[language];

  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) => t(key, { ...options, lng: uiLanguage }),
    [t, uiLanguage]
  );

  const stopSpeaking = useCallback(() => {
    runIdRef.current += 1;
    if (speechSupported()) window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  }, []);

  // Never keep talking after the route, the language or the page changes.
  useEffect(() => stopSpeaking, [stopSpeaking]);
  useEffect(() => {
    stopSpeaking();
  }, [language, current.routeId, stopSpeaking]);

  useEffect(() => {
    activeStepRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [speakingIndex, reducedMotion]);

  const speakStep = useCallback(
    (index: number, runId: number) => {
      const step = current.steps[index];
      if (!step || runId !== runIdRef.current) {
        setSpeakingIndex(null);
        return;
      }
      setSpeakingIndex(index);
      const utterance = new SpeechSynthesisUtterance(step.spoken);
      utterance.lang = SPEECH_LANG[language];
      utterance.rate = rate;
      const voice = pickVoice(language);
      if (voice) utterance.voice = voice;
      utterance.onend = () => speakStep(index + 1, runId);
      utterance.onerror = () => {
        if (runId === runIdRef.current) setSpeakingIndex(null);
      };
      window.speechSynthesis.speak(utterance);
    },
    [current.steps, language, rate]
  );

  const handleReadAloud = () => {
    if (!speechSupported()) {
      setNotice(tr('navAssist.directions.unsupported'));
      return;
    }
    stopSpeaking();
    const languageName = language === 'bn' ? 'বাংলা' : 'English';
    setNotice(pickVoice(language) ? '' : tr('navAssist.directions.noVoice', { language: languageName }));
    const runId = runIdRef.current;
    speakStep(0, runId);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.script);
      setNotice(tr('navAssist.directions.copied'));
      announce(tr('navAssist.directions.copied'));
    } catch {
      setNotice(tr('navAssist.directions.copyFailed'));
    }
  };

  const speaking = speakingIndex !== null;
  const languageButtons = useMemo(
    () =>
      [
        { code: 'en' as const, label: tr('navAssist.directions.english') },
        { code: 'bn' as const, label: tr('navAssist.directions.bengali') },
      ] satisfies Array<{ code: DirectionLanguage; label: string }>,
    [tr]
  );

  return (
    <section aria-labelledby="directions-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="directions-heading" className="text-xs font-bold text-[var(--ap-text)]">
          {tr('navAssist.directions.title')}
        </h3>
        <div
          role="group"
          aria-label={tr('navAssist.directions.language')}
          className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-0.5"
        >
          {languageButtons.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={language === code}
              onClick={() => setLanguage(code)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                language === code ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p lang={language} className="text-xs text-[var(--ap-muted)]">
        {current.summary}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {speaking ? (
          <Button size="sm" variant="outline" onClick={stopSpeaking}>
            <Square className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{tr('navAssist.directions.stop')}</span>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleReadAloud}>
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{tr('navAssist.directions.readAloud')}</span>
          </Button>
        )}
        <Select
          aria-label="Speech rate"
          value={String(rate)}
          onChange={(event) => setRate(Number(event.target.value))}
          className="w-20"
        >
          {SPEECH_RATES.map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{tr('navAssist.directions.copy')}</span>
        </Button>
      </div>

      <p role="status" aria-live="polite" className="min-h-[1rem] text-xs text-[#18C6AD] font-medium">
        {speaking
          ? tr('navAssist.directions.speaking', {
              step: (speakingIndex ?? 0) + 1,
              total: current.steps.length,
            })
          : notice}
      </p>

      {current.highlights.length > 0 && (
        <ul
          lang={language}
          aria-label={tr('navAssist.directions.highlights')}
          className="flex flex-wrap gap-1.5"
        >
          {current.highlights.map((highlight) => (
            <li
              key={highlight}
              className="px-2 py-0.5 text-[11px] rounded-full border border-[var(--ap-border)] bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
            >
              {highlight}
            </li>
          ))}
        </ul>
      )}

      <ol lang={language} className="space-y-2">
        {current.steps.map((step, index) => {
          const active = speakingIndex === index;
          return (
            <li
              key={`${step.index}-${step.edgeId ?? 'arrive'}`}
              ref={active ? activeStepRef : undefined}
              aria-current={active ? 'step' : undefined}
              className={`flex gap-2.5 text-xs rounded-lg border p-2.5 ${
                active
                  ? 'border-[#18C6AD] bg-[#18C6AD]/10'
                  : 'border-[var(--ap-border)] bg-[var(--ap-surface-2)]'
              }`}
            >
              <span className="mt-0.5 shrink-0 text-[#18C6AD]">
                <StepIcon step={step} />
              </span>
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-[var(--ap-text)]">{step.text}</p>
                {step.callouts.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5 text-[var(--ap-warn)]">
                    {step.callouts.map((callout) => (
                      <li key={callout}>{callout}</li>
                    ))}
                  </ul>
                )}
                {step.kind !== 'arrive' && (
                  <p className="text-[var(--ap-muted)] tabular-nums">
                    {tr('navAssist.directions.stepOf', {
                      step: step.index,
                      total: current.steps.length,
                    })}{' '}
                    · {tr('navAssist.directions.remaining', { meters: step.remainingMeters })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
