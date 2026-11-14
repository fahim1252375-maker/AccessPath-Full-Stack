import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bookmark,
  Box,
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  History,
  Map as MapIcon,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { useUiStore } from '../../store/useUiStore.ts';
import { CampusMap } from '../../components/maps/CampusMap.tsx';
import { SafeCampusExplorerScene3D } from '../../components/three/LazyCampusScenes.tsx';
import { DirectionsPanel } from '../../components/navigation/DirectionsPanel.tsx';
import { RouteResilienceCard } from '../../components/navigation/RouteResilienceCard.tsx';
import { ShareRouteButton } from '../../components/navigation/ShareRouteButton.tsx';
import {
  Button,
  Card,
  HelpButton,
  Select,
  SkeletonRows,
  StatusLabel,
} from '../../components/ui/Primitives.tsx';
import { NoAccessibleRouteBanner } from '../system/SystemPages.tsx';
import type {
  AccessibilityPreferences,
  BuildingDTO,
  CalculatedRouteDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  RouteCalculationResultDTO,
} from '../../../../shared/types.ts';
import { buildBilingualDirections } from '../../../../shared/directions.ts';

export const SmartRoutePlannerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { selectedCampusId, accessibilityProfile, user, announce } = useAppStore();
  const recentRoutes = useUiStore((s) => s.recentRoutes);
  const pushRecentRoute = useUiStore((s) => s.pushRecentRoute);
  const clearRecentRoutes = useUiStore((s) => s.clearRecentRoutes);
  const completeStep = useUiStore((s) => s.completeStep);

  const [fromId, setFromId] = useState(searchParams.get('from') || 'loc_main_gate');
  const [toId, setToId] = useState(searchParams.get('to') || 'loc_library_entrance');
  const [prefs, setPrefs] = useState<AccessibilityPreferences>(accessibilityProfile);
  const [allowUnverifiedFallback, setAllowUnverifiedFallback] = useState(false);
  const [algorithm, setAlgorithm] = useState<'dijkstra' | 'astar'>('dijkstra');
  const [mapViewMode, setMapViewMode] = useState<'2d' | '3d'>('2d');
  const [result, setResult] = useState<(RouteCalculationResultDTO & { historyId?: string }) | null>(null);
  const [activeRouteIdx, setActiveRouteIdx] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [routeSavedMsg, setRouteSavedMsg] = useState('');
  const [calcError, setCalcError] = useState('');

  useEffect(() => {
    setPrefs(accessibilityProfile);
  }, [accessibilityProfile]);

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['planner-map', selectedCampusId],
    queryFn: () =>
      api.get<{
        campus: CampusDTO;
        buildings: BuildingDTO[];
        locations: LocationNodeDTO[];
        edges: PathEdgeDTO[];
        liveFacilities?: LiveFacilityStatusDTO[];
      }>(`/campuses/${selectedCampusId}/map`),
  });

  const { data: liveStatusData } = useQuery({
    queryKey: ['planner-live-status', selectedCampusId],
    queryFn: () =>
      api.get<{
        facilities: LiveFacilityStatusDTO[];
      }>(`/operations/live-status?campusId=${selectedCampusId}`),
  });

  const activeOutages = (liveStatusData?.facilities || []).filter(
    (f) => f.status === 'outage' || f.status === 'closed'
  );

  const runCalculation = async (
    fallbackFlag = allowUnverifiedFallback,
    algoOverride = algorithm,
    endpoints = { from: fromId, to: toId }
  ) => {
    setCalculating(true);
    setCalcError('');
    setFeedbackSaved(false);
    setRouteSavedMsg('');
    try {
      const res = await api.post<RouteCalculationResultDTO & { historyId?: string }>(
        '/routes/calculate',
        {
          campusId: selectedCampusId,
          fromNodeId: endpoints.from,
          toNodeId: endpoints.to,
          preferences: prefs,
          algorithm: algoOverride,
          topK: 3,
          allowUnverifiedFallback: fallbackFlag,
          includeAlternatives: true,
        }
      );
      setResult(res);
      setActiveRouteIdx(0);
      if (res.found) {
        const nameOf = (id: string) => mapData?.locations.find((l) => l.id === id)?.name ?? id;
        pushRecentRoute({
          fromId: endpoints.from,
          toId: endpoints.to,
          fromName: nameOf(endpoints.from),
          toName: nameOf(endpoints.to),
        });
        completeStep('route');
      }
      announce(
        res.found
          ? `Route calculated: ${res.routes[0]?.totalDistanceMeters} meters, estimated ${res.routes[0]?.estimatedMinutes} minutes.`
          : 'No verified accessible route found.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Route calculation failed.';
      setCalcError(message);
      announce(message);
    } finally {
      setCalculating(false);
    }
  };

  // Once the campus graph is available, make sure the selected endpoints exist in it
  // (the defaults are demo-campus ids) and calculate the first route.
  useEffect(() => {
    if (!mapData) return;
    const knownIds = new Set(mapData.locations.map((location) => location.id));
    const from = knownIds.has(fromId) ? fromId : (mapData.locations[0]?.id ?? fromId);
    const to = knownIds.has(toId)
      ? toId
      : (mapData.locations.find((location) => location.id !== from)?.id ?? toId);
    if (from !== fromId) setFromId(from);
    if (to !== toId) setToId(to);
    void runCalculation(false, algorithm, { from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData]);

  const handleSwap = () => {
    const next = { from: toId, to: fromId };
    setFromId(next.from);
    setToId(next.to);
    void runCalculation(allowUnverifiedFallback, algorithm, next);
  };

  const applyRecentRoute = (from: string, to: string) => {
    setFromId(from);
    setToId(to);
    void runCalculation(allowUnverifiedFallback, algorithm, { from, to });
  };

  const activeRoute: CalculatedRouteDTO | undefined = result?.routes[activeRouteIdx];

  const activeDirections = useMemo(
    () =>
      activeRoute && mapData
        ? buildBilingualDirections(activeRoute, mapData.locations, {
            edgeWidths: Object.fromEntries(mapData.edges.map((edge) => [edge.id, edge.widthMeters])),
          })
        : null,
    [activeRoute, mapData]
  );

  const handleSaveRoute = async () => {
    if (!user || !result?.historyId) {
      setRouteSavedMsg('Sign in to bookmark routes to your personal history.');
      return;
    }
    try {
      await api.patch(`/routes/${result.historyId}/save`, { isSaved: true });
      setRouteSavedMsg('Route saved to Saved & History.');
    } catch {
      setRouteSavedMsg('Could not save the route. Please try again.');
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !result?.historyId) return;
    try {
      await api.post(`/routes/${result.historyId}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment,
      });
      setFeedbackSaved(true);
    } catch {
      announce('Could not send route feedback. Please try again.');
    }
  };

  if (isLoading || !mapData) return <SkeletonRows rows={6} />;

  const map2DFallback = (
    <CampusMap
      centerLat={mapData.campus.centerLat}
      centerLng={mapData.campus.centerLng}
      zoom={mapData.campus.defaultZoom}
      locations={mapData.locations}
      edges={mapData.edges}
      routes={result?.routes || []}
      selectedOriginId={fromId}
      selectedDestinationId={toId}
      heightClass="h-[620px]"
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Smart Accessible Route Planner</h1>
          <p className="text-xs text-[var(--ap-muted)]">
            Constraint-filtered {algorithm === 'astar' ? 'A* (Haversine)' : 'Dijkstra (MinHeap)'} routing with freshness &amp; outage awareness.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-0.5">
            <button
              type="button"
              onClick={() => setMapViewMode('2d')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                mapViewMode === '2d' ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>
            <button
              type="button"
              onClick={() => setMapViewMode('3d')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                mapViewMode === '3d' ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Animated Route</span>
            </button>
          </div>
          <HelpButton featureId="F057" />
          <Button variant="outline" size="sm" onClick={() => runCalculation(false)} disabled={calculating}>
            <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </Button>
        </div>
      </div>

      {activeOutages.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-xs text-[var(--ap-danger)] flex items-start gap-2.5" role="status">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Active Facility Outage Alerts ({activeOutages.length})</p>
            <p className="mt-0.5">
              {activeOutages.map((o) => o.name).join(', ')} — Routing automatically excludes affected segments.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="planner-from" className="block text-xs font-semibold text-[var(--ap-muted)] mb-1">
                  Origin
                </label>
                <Select id="planner-from" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                  {mapData.locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="planner-to" className="block text-xs font-semibold text-[var(--ap-muted)] mb-1">
                  Destination
                </label>
                <Select id="planner-to" value={toId} onChange={(e) => setToId(e.target.value)}>
                  {mapData.locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSwap}
                disabled={calculating || fromId === toId}
                aria-label="Swap origin and destination and recalculate"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Swap &amp; recalculate</span>
              </Button>
            </div>

            {recentRoutes.length > 0 && (
              <div className="space-y-1.5" aria-label="Recent routes">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--ap-muted)] inline-flex items-center gap-1">
                    <History className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Recent routes</span>
                  </p>
                  <button
                    type="button"
                    onClick={clearRecentRoutes}
                    className="text-[11px] font-semibold text-[var(--ap-muted)] hover:text-[#18C6AD] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentRoutes.map((r) => (
                    <button
                      key={`${r.fromId}->${r.toId}`}
                      type="button"
                      onClick={() => applyRecentRoute(r.fromId, r.toId)}
                      disabled={calculating}
                      className="max-w-full truncate rounded-full border border-[var(--ap-border)] bg-[var(--ap-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--ap-text)] hover:border-[#18C6AD]/60 disabled:opacity-50 cursor-pointer"
                      title={`${r.fromName} → ${r.toName}`}
                    >
                      {r.fromName} → {r.toName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="planner-algo" className="block text-xs font-semibold text-[var(--ap-muted)] mb-1">
                Graph Search Algorithm
              </label>
              <Select
                id="planner-algo"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'dijkstra' | 'astar')}
              >
                <option value="dijkstra">Dijkstra Shortest Accessible Path (Default)</option>
                <option value="astar">A* Heuristic Search (Haversine Guided)</option>
              </Select>
            </div>

            <div className="pt-2 border-t border-[var(--ap-border)] space-y-2">
              <p className="text-xs font-semibold text-[var(--ap-text)]">Routing Constraints</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['wheelchairMode', 'Wheelchair Mode'],
                  ['stepFreeMode', 'Step-Free Only'],
                  ['rampRequired', 'Verified Ramp'],
                  ['elevatorRequired', 'Operational Elevator'],
                  ['lowGradientPreference', 'Low Gradient (<=5%)'],
                  ['widePathPreference', 'Wide Path (>=1.5m)'],
                  ['smoothSurfacePreference', 'Smooth Surface'],
                  ['wellLitPreference', 'Well-Lit Paths'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-[var(--ap-text)]">
                    <input
                      type="checkbox"
                      checked={Boolean(prefs[key as keyof AccessibilityPreferences])}
                      onChange={(e) =>
                        setPrefs((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="accent-[#18C6AD]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setAllowUnverifiedFallback(false);
                runCalculation(false, algorithm);
              }}
              disabled={calculating}
            >
              <Compass className="w-4 h-4" />
              <span>{calculating ? 'Calculating...' : 'Calculate Top-3 Accessible Routes'}</span>
            </Button>
          </Card>

          {calcError && (
            <p
              role="alert"
              className="p-3 rounded-xl bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-xs text-[var(--ap-danger)]"
            >
              {calcError}
            </p>
          )}

          {/* Route Results & Turn-by-Turn */}
          {result && !result.found && (
            <NoAccessibleRouteBanner
              message={result.message}
              blockingFactors={result.blockingFactors}
              onRelaxFallback={() => {
                setAllowUnverifiedFallback(true);
                runCalculation(true, algorithm);
              }}
            />
          )}

          {result?.found && activeRoute && (
            <Card className="space-y-4">
              {result.routes.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 bg-[var(--ap-surface-2)] rounded-lg border border-[var(--ap-border)]">
                  {result.routes.map((r, idx) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveRouteIdx(idx)}
                      className={`flex-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        activeRouteIdx === idx
                          ? 'bg-[#18C6AD] text-[#04211E]'
                          : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
                      }`}
                    >
                      {r.isPrimary ? 'Primary' : `Alt ${idx}`} · {r.totalDistanceMeters}m
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#18C6AD]">{activeRoute.label}</h2>
                  <p className="text-sm font-mono text-[var(--ap-text)] tabular-nums mt-0.5">
                    Est. {activeRoute.totalDistanceMeters}m · ~{activeRoute.estimatedMinutes} min
                  </p>
                  <p className="text-xs text-[var(--ap-muted)] tabular-nums mt-0.5">
                    Condition Confidence: <strong>{activeRoute.confidenceScore ?? 'N/A'}%</strong>
                    {typeof activeRoute.diversityScore === 'number' && !activeRoute.isPrimary
                      ? ` · Route Diversity: ${activeRoute.diversityScore}%`
                      : ''}
                  </p>
                </div>
                <StatusLabel status={activeRoute.verificationSummary} />
              </div>

              {activeRoute.trustSummary && (
                <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--ap-text)]">Segment Trust &amp; Freshness</span>
                    <StatusLabel status={activeRoute.trustSummary.overallTrustState} />
                  </div>
                  <p className="text-[var(--ap-muted)] tabular-nums">
                    Current: {activeRoute.trustSummary.verifiedSegmentsCount} · Expiring:{' '}
                    {activeRoute.trustSummary.expiringSegmentsCount} · Stale:{' '}
                    {activeRoute.trustSummary.staleSegmentsCount} · Unverified:{' '}
                    {activeRoute.trustSummary.unverifiedSegmentsCount} · Conflicts:{' '}
                    {activeRoute.trustSummary.conflictingReportsCount}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleSaveRoute}>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Route</span>
                </Button>
              </div>
              {routeSavedMsg && <p className="text-xs text-[#18C6AD] font-medium">{routeSavedMsg}</p>}

              <ShareRouteButton
                campusId={selectedCampusId}
                fromNodeId={fromId}
                toNodeId={toId}
                preferences={prefs}
                algorithm={algorithm}
              />

              <div className="space-y-1.5 text-xs bg-[var(--ap-surface-2)] p-3 rounded-lg border border-[var(--ap-border)]">
                <p className="font-bold text-[var(--ap-text)]">Why this route was selected:</p>
                <ul className="space-y-1 text-[var(--ap-muted)]">
                  {activeRoute.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#18C6AD] shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeRoute.warnings.length > 0 && (
                <div className="space-y-1 text-xs bg-[var(--ap-warn-bg)] p-3 rounded-lg border border-[var(--ap-warn-border)] text-[var(--ap-warn)]">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Condition Warnings</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {activeRoute.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeDirections && (
                <div className="pt-2 border-t border-[var(--ap-border)]">
                  <DirectionsPanel directions={activeDirections} />
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-[var(--ap-border)]">
                <h3 className="text-xs font-bold text-[var(--ap-text)]">Segment Conditions &amp; Verification</h3>
                <ol className="space-y-2.5">
                  {activeRoute.steps.map((step, i) => (
                    <li key={step.edgeId} className="text-xs border-b border-[var(--ap-border)] pb-2 last:border-b-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[var(--ap-text)]">
                          {i + 1}. {step.instruction}
                        </p>
                        {step.trustState && <StatusLabel status={step.trustState} />}
                      </div>
                      <p className="text-[var(--ap-muted)] mt-0.5 tabular-nums">
                        Surface: {step.surface.replace(/_/g, ' ')} · Slope: {step.slopePercent}% ·{' '}
                        {step.hasRamp ? 'Ramp' : step.hasElevator ? 'Elevator' : 'Level Walk'}
                        {step.lastVerifiedAt
                          ? ` · Verified ${new Date(step.lastVerifiedAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <RouteResilienceCard
                campusId={selectedCampusId}
                fromNodeId={fromId}
                toNodeId={toId}
                preferences={prefs}
                algorithm={algorithm}
              />

              {user && result.historyId && (
                <form onSubmit={handleFeedback} className="pt-3 border-t border-[var(--ap-border)] space-y-2">
                  <p className="text-xs font-bold text-[var(--ap-text)]">Route Accuracy Feedback</p>
                  {feedbackSaved ? (
                    <p className="text-xs text-[#18C6AD] font-semibold">Thank you! Route feedback recorded.</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        aria-label="Route rating"
                        value={String(feedbackRating)}
                        onChange={(e) => setFeedbackRating(Number(e.target.value))}
                        className="w-28"
                      >
                        <option value="5">5 / 5</option>
                        <option value="4">4 / 5</option>
                        <option value="3">3 / 5</option>
                        <option value="2">2 / 5</option>
                        <option value="1">1 / 5</option>
                      </Select>
                      <input
                        type="text"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Optional comment..."
                        className="flex-1 min-w-[140px] px-3 py-2 text-xs border border-[var(--ap-border)] rounded-lg bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
                      />
                      <Button type="submit" size="sm" variant="outline">Send</Button>
                    </div>
                  )}
                </form>
              )}
            </Card>
          )}
        </div>

        {/* Map / 3D Visualization Column */}
        <div className="lg:col-span-7">
          <SafeCampusExplorerScene3D
            centerLat={mapData.campus.centerLat}
            centerLng={mapData.campus.centerLng}
            buildings={mapData.buildings || []}
            locations={mapData.locations}
            edges={mapData.edges}
            liveFacilities={liveStatusData?.facilities || mapData.liveFacilities || []}
            routes={result?.routes || []}
            selectedOriginId={fromId}
            selectedDestinationId={toId}
            heightClass="h-[620px]"
            forceFallback={mapViewMode === '2d'}
            fallback={map2DFallback}
          />
        </div>
      </div>
    </div>
  );
};
