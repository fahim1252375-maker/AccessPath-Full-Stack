import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDownUp, Beaker, CheckCircle2, LockKeyhole, Route, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Card, FormField, Select, SkeletonRows, StatusLabel } from '../../components/ui/Primitives.tsx';
import type {
  CampusDTO,
  GraphSimulationAction,
  GraphSimulationResultDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';

interface CampusGraphResponse {
  campus: CampusDTO;
  locations: LocationNodeDTO[];
  edges: PathEdgeDTO[];
}

const actionOptions: GraphSimulationAction[] = ['fixed', 'closed', 'ramp_added'];

export const AdminDigitalTwinPage: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCampusId, announce } = useAppStore();
  const [edgeId, setEdgeId] = useState('');
  const [action, setAction] = useState<GraphSimulationAction>('fixed');
  const [fromNodeId, setFromNodeId] = useState('');
  const [toNodeId, setToNodeId] = useState('');

  const graphQuery = useQuery({
    queryKey: ['accessibility-twin-graph', selectedCampusId],
    queryFn: () => api.get<CampusGraphResponse>(`/campuses/${selectedCampusId}/map`),
    enabled: Boolean(selectedCampusId),
  });

  const graph = graphQuery.data;
  const locations = graph?.locations || [];
  const edges = graph?.edges || [];
  const selectableEdges = useMemo(
    () => edges.filter((edge) => edge.campusId === selectedCampusId),
    [edges, selectedCampusId]
  );

  useEffect(() => {
    if (!edgeId && selectableEdges.length) setEdgeId(selectableEdges[0].id);
    if (!fromNodeId && locations.length) setFromNodeId(locations[0].id);
    if (!toNodeId && locations.length > 1) setToNodeId(locations[1].id);
  }, [edgeId, fromNodeId, toNodeId, selectableEdges, locations]);

  const simulation = useMutation({
    mutationFn: () => api.post<GraphSimulationResultDTO>('/admin/accessibility-twin/simulate', {
      campusId: selectedCampusId,
      edgeId,
      action,
      routePairs: [{ fromNodeId, toNodeId }],
    }),
    onSuccess: () => announce(t('adminTwin.completed')),
  });

  if (graphQuery.isLoading) return <SkeletonRows rows={5} />;

  if (graphQuery.isError || !graph) {
    return (
      <Card role="alert" className="space-y-2">
        <h1 className="font-bold text-[var(--ap-text)]">{t('adminTwin.title')}</h1>
        <p className="text-sm text-[var(--ap-muted)]">{t('adminTwin.loadError')}</p>
      </Card>
    );
  }

  const result = simulation.data;
  const locationName = (id: string) => locations.find((location) => location.id === id)?.name || id;
  const formatDistance = (value: number | null) => value === null ? t('adminTwin.noRoute') : `${Math.round(value)} m`;

  return (
    <section className="space-y-6" aria-labelledby="twin-heading">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="twin-heading" className="text-2xl font-bold text-[var(--ap-text)]">{t('adminTwin.title')}</h1>
          <StatusLabel status="simulation only" />
        </div>
        <p className="max-w-3xl text-sm text-[var(--ap-muted)]">{t('adminTwin.subtitle')}</p>
      </header>

      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#18C6AD]/10 p-2 text-[#18C6AD]"><Beaker aria-hidden="true" /></div>
          <div>
            <h2 className="font-bold text-[var(--ap-text)]">{t('adminTwin.configure')}</h2>
            <p className="mt-1 text-xs text-[var(--ap-muted)]">{t('adminTwin.noProductionWrites')}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={t('adminTwin.segment')} htmlFor="twin-edge">
            <Select id="twin-edge" value={edgeId} onChange={(event) => setEdgeId(event.target.value)}>
              {selectableEdges.map((edge) => (
                <option key={edge.id} value={edge.id}>{edge.name} · {edge.status} · {edge.verificationStatus}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('adminTwin.action')} htmlFor="twin-action">
            <Select id="twin-action" value={action} onChange={(event) => setAction(event.target.value as GraphSimulationAction)}>
              {actionOptions.map((value) => <option key={value} value={value}>{t(`adminTwin.actions.${value}`)}</option>)}
            </Select>
          </FormField>
          <FormField label={t('adminTwin.origin')} htmlFor="twin-origin">
            <Select id="twin-origin" value={fromNodeId} onChange={(event) => setFromNodeId(event.target.value)}>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
          </FormField>
          <FormField label={t('adminTwin.destination')} htmlFor="twin-destination">
            <Select id="twin-destination" value={toNodeId} onChange={(event) => setToNodeId(event.target.value)}>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
          </FormField>
        </div>

        {fromNodeId && fromNodeId === toNodeId && (
          <p className="text-sm text-red-600" role="alert">{t('adminTwin.distinctLocations')}</p>
        )}
        {simulation.isError && <p className="text-sm text-red-600" role="alert">{t('adminTwin.simulationError')}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => simulation.mutate()}
            disabled={!edgeId || !fromNodeId || !toNodeId || fromNodeId === toNodeId || simulation.isPending}
          >
            <Route className="h-4 w-4" aria-hidden="true" />
            {simulation.isPending ? t('adminTwin.running') : t('adminTwin.run')}
          </Button>
          <p className="text-xs text-[var(--ap-muted)]">{t('adminTwin.verifiedOnly')}</p>
        </div>
      </Card>

      {result && (
        <section className="space-y-4" aria-labelledby="twin-result-heading" aria-live="polite">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#18A77D]" aria-hidden="true" />
            <h2 id="twin-result-heading" className="text-lg font-bold text-[var(--ap-text)]">{t('adminTwin.results')}</h2>
          </div>
          <p className="text-xs text-[var(--ap-muted)]">{t('adminTwin.timestamp')}: {new Date(result.simulatedAt).toLocaleString()}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card padding="sm"><p className="text-xs text-[var(--ap-muted)]">{t('adminTwin.unlocked')}</p><p className="mt-1 text-2xl font-bold tabular-nums text-[var(--ap-text)]">{result.unlockedRoutes.length}</p></Card>
            <Card padding="sm"><p className="text-xs text-[var(--ap-muted)]">{t('adminTwin.lost')}</p><p className="mt-1 text-2xl font-bold tabular-nums text-[var(--ap-text)]">{result.lostRoutes.length}</p></Card>
            <Card padding="sm"><p className="text-xs text-[var(--ap-muted)]">{t('adminTwin.buildingsAffected')}</p><p className="mt-1 text-2xl font-bold tabular-nums text-[var(--ap-text)]">{result.buildingsAffected.length}</p></Card>
          </div>

          <Card className="space-y-3">
            <h3 className="font-semibold text-[var(--ap-text)]">{t('adminTwin.beforeAfter')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--ap-surface-2)] p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--ap-muted)]">{t('adminTwin.before')}</p>
                <code className="text-xs text-[var(--ap-text)]">{JSON.stringify(result.changes.before, null, 2)}</code>
              </div>
              <div className="rounded-lg bg-[var(--ap-surface-2)] p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--ap-muted)]">{t('adminTwin.after')}</p>
                <code className="text-xs text-[var(--ap-text)]">{JSON.stringify(result.changes.after, null, 2)}</code>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold text-[var(--ap-text)]">{t('adminTwin.routeComparison')}</h3>
            {result.unlockedRoutes.concat(result.lostRoutes, result.unchangedRoutes).map((route, index) => (
              <div key={`${route.fromNodeId}-${route.toNodeId}-${index}`} className="rounded-lg border border-[var(--ap-border)] p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--ap-text)]">
                  <span>{locationName(route.fromNodeId)}</span><ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" /><span>{locationName(route.toNodeId)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--ap-muted)]">{t('adminTwin.before')}: {formatDistance(route.beforeDistanceMeters)} · {t('adminTwin.after')}: {formatDistance(route.afterDistanceMeters)}</p>
                <p className="mt-1 text-xs text-[var(--ap-muted)]">{route.beforeFound === route.afterFound ? t('adminTwin.unchanged') : route.afterFound ? t('adminTwin.unlockedStatus') : t('adminTwin.lostStatus')}</p>
              </div>
            ))}
          </Card>

          <Card className="space-y-2">
            <h3 className="font-semibold text-[var(--ap-text)]">{t('adminTwin.safetyNotes')}</h3>
            {result.notes.map((note) => <p key={note} className="text-sm text-[var(--ap-muted)]">{note}</p>)}
            <p className="flex items-start gap-2 text-sm font-medium text-[var(--ap-text)]"><LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />{t('adminTwin.verificationInvariant')}</p>
            <p className="flex items-start gap-2 text-xs text-[var(--ap-muted)]"><ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{t('adminTwin.disclaimer')}</p>
          </Card>
        </section>
      )}
    </section>
  );
};
