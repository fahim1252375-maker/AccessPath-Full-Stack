import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, MapPin, Route as RouteIcon } from 'lucide-react';
import { ApiError, api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { DirectionsPanel } from '../../components/navigation/DirectionsPanel.tsx';
import { Button, Card, EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Primitives.tsx';
import type { SharedRouteDTO } from '../../../../shared/types.ts';

/** Public, read-only view of a signed route-share link. The route is recalculated live on load. */
export const SharedRoutePage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) => t(key, { ...options, lng: language }),
    [t, language]
  );

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['shared-route', token],
    queryFn: () => api.get<SharedRouteDTO>(`/routes/shared/${encodeURIComponent(token)}`),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div role="status" aria-label={tr('navAssist.sharedRoute.loading')}>
        <SkeletonRows rows={5} />
      </div>
    );
  } else if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
    body = (
      <EmptyState
        title={
          error.status === 410
            ? tr('navAssist.sharedRoute.expiredTitle')
            : tr('navAssist.sharedRoute.invalidTitle')
        }
        description={error.message}
        action={
          <Link to="/app/planner">
            <Button>{tr('navAssist.sharedRoute.openPlanner')}</Button>
          </Link>
        }
      />
    );
  } else if (error || !data) {
    body = (
      <ErrorState
        message={error instanceof Error ? error.message : 'Request failed'}
        onRetry={() => void refetch()}
      />
    );
  } else {
    const route = data.routes[0];
    body = (
      <>
        <Card className="space-y-3">
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-[var(--ap-muted)]">
                {tr('navAssist.sharedRoute.from')}
              </dt>
              <dd className="font-semibold text-[var(--ap-text)] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#18C6AD]" aria-hidden="true" />
                {data.fromName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--ap-muted)]">
                {tr('navAssist.sharedRoute.to')}
              </dt>
              <dd className="font-semibold text-[var(--ap-text)] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#18C6AD]" aria-hidden="true" />
                {data.toName}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-[var(--ap-muted)] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {tr('navAssist.sharedRoute.expires', { date: formatDate(data.share.expiresAt) })}
          </p>
        </Card>

        {data.found && route && data.directions ? (
          <Card className="space-y-4">
            <p className="text-sm font-mono text-[var(--ap-text)] tabular-nums">
              {route.totalDistanceMeters} m · ~{route.estimatedMinutes} min
            </p>
            <p className="text-xs text-[var(--ap-muted)]">{tr('navAssist.sharedRoute.liveNotice')}</p>
            {route.warnings.length > 0 && (
              <div className="space-y-1 text-xs bg-[var(--ap-warn-bg)] p-3 rounded-lg border border-[var(--ap-warn-border)] text-[var(--ap-warn)]">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{route.warnings.length}</span>
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {route.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <DirectionsPanel directions={data.directions} />
            <Link
              to={`/app/planner?from=${encodeURIComponent(data.fromNodeId)}&to=${encodeURIComponent(data.toNodeId)}`}
            >
              <Button variant="outline" size="sm">
                <RouteIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tr('navAssist.sharedRoute.openPlanner')}</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <EmptyState
            title={tr('navAssist.sharedRoute.title')}
            description={tr('navAssist.sharedRoute.noRoute')}
          />
        )}
        <p className="text-xs text-[var(--ap-muted)]">{tr('navAssist.sharedRoute.disclaimer')}</p>
      </>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <h1 className="text-2xl font-bold text-[var(--ap-text)]">{tr('navAssist.sharedRoute.title')}</h1>
      {body}
    </div>
  );
};
