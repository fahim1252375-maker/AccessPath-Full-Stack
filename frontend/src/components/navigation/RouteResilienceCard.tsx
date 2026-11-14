import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button } from '../ui/Primitives.tsx';
import type {
  AccessibilityPreferences,
  ResilienceLevel,
  RouteResilienceDTO,
} from '../../../../shared/types.ts';

interface RouteResilienceCardProps {
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  preferences: AccessibilityPreferences;
  algorithm: 'dijkstra' | 'astar';
}

const LEVEL_STYLE: Record<ResilienceLevel, { box: string; Icon: typeof ShieldCheck }> = {
  HIGH: {
    box: 'border-[#18C6AD]/50 bg-[#18C6AD]/10 text-[var(--ap-text)]',
    Icon: ShieldCheck,
  },
  MEDIUM: {
    box: 'border-[var(--ap-warn-border)] bg-[var(--ap-warn-bg)] text-[var(--ap-warn)]',
    Icon: ShieldQuestion,
  },
  LOW: {
    box: 'border-[var(--ap-danger-border)] bg-[var(--ap-danger-bg)] text-[var(--ap-danger)]',
    Icon: ShieldAlert,
  },
};

/**
 * "What if one segment closes?" — shows the single points of failure of the primary route.
 * The analysis runs only on request because it re-runs the router once per segment.
 */
export const RouteResilienceCard: React.FC<RouteResilienceCardProps> = ({
  campusId,
  fromNodeId,
  toNodeId,
  preferences,
  algorithm,
}) => {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const announce = useAppStore((state) => state.announce);
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) => t(key, { ...options, lng: language }),
    [t, language]
  );

  const { mutate, reset, data, isPending, isError } = useMutation({
    mutationFn: () =>
      api.post<RouteResilienceDTO>('/routes/resilience', {
        campusId,
        fromNodeId,
        toNodeId,
        preferences,
        algorithm,
        language,
      }),
    onSuccess: (result) => {
      if (result.found) announce(`${tr('navAssist.resilience.title')}: ${result.message}`);
    },
  });

  // A result is only valid for the inputs it was computed from.
  const inputKey = JSON.stringify([campusId, fromNodeId, toNodeId, preferences, algorithm, language]);
  useEffect(() => {
    reset();
  }, [inputKey, reset]);

  const style = data?.level ? LEVEL_STYLE[data.level] : null;

  return (
    <section
      aria-labelledby="resilience-heading"
      className="space-y-3 pt-2 border-t border-[var(--ap-border)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id="resilience-heading" className="text-xs font-bold text-[var(--ap-text)]">
            {tr('navAssist.resilience.title')}
          </h3>
          <p className="text-xs text-[var(--ap-muted)]">{tr('navAssist.resilience.description')}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => mutate()} disabled={isPending}>
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {isPending ? tr('navAssist.resilience.running') : tr('navAssist.resilience.run')}
          </span>
        </Button>
      </div>

      {isError && (
        <p role="alert" className="text-xs text-[var(--ap-danger)]">
          {tr('navAssist.resilience.error')}
        </p>
      )}

      {data && (
        <div lang={data.language} className="space-y-3" aria-live="polite">
          {data.found && data.level && style ? (
            <>
              <div className={`rounded-lg border p-3 space-y-2 ${style.box}`}>
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <style.Icon className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {tr('navAssist.resilience.score')}: {data.score}/100 ·{' '}
                    {tr(`navAssist.resilience.level.${data.level}`)}
                  </span>
                </p>
                <div
                  role="meter"
                  aria-label={tr('navAssist.resilience.score')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={data.score ?? 0}
                  className="h-1.5 w-full rounded-full bg-[var(--ap-border)]/60 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-current"
                    style={{ width: `${data.score ?? 0}%` }}
                  />
                </div>
                <p className="text-xs">{data.message}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[var(--ap-text)]">
                  {tr('navAssist.resilience.segments')}
                </p>
                <ul className="space-y-1.5">
                  {data.segments.map((segment) => (
                    <li
                      key={segment.edgeId}
                      className="flex items-start justify-between gap-2 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] p-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--ap-text)]">{segment.name}</p>
                        <p className="text-[var(--ap-muted)]">
                          {segment.fromName} → {segment.toName}
                        </p>
                      </div>
                      {segment.critical ? (
                        <span className="shrink-0 inline-flex items-center gap-1 font-semibold text-[var(--ap-danger)]">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          {tr('navAssist.resilience.critical')}
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[var(--ap-muted)] tabular-nums">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#18C6AD]" aria-hidden="true" />
                          {tr('navAssist.resilience.detour', {
                            meters: segment.detourMeters ?? 0,
                            percent: segment.detourPercent ?? 0,
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--ap-text)]">
                {data.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-[var(--ap-muted)]">{data.message}</p>
          )}

          <ul className="space-y-0.5 text-[11px] text-[var(--ap-muted)]">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
