import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Compass, Map as MapIcon, PlusCircle } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { CampusMap } from '../../components/maps/CampusMap.tsx';
import { SafeCampusExplorerScene3D } from '../../components/three/LazyCampusScenes.tsx';
import { Button, Card, HelpButton, SkeletonRows } from '../../components/ui/Primitives.tsx';
import type {
  AccessibilityReportDTO,
  BuildingDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';

export const InteractiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedCampusId, setCachedCampusGraph, cachedCampusGraph } = useAppStore();
  const [filterMode, setFilterMode] = useState<'all' | 'step_free' | 'elevators' | 'restrooms'>('all');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showBarriers, setShowBarriers] = useState(true);
  const [selectedLoc, setSelectedLoc] = useState<LocationNodeDTO | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['interactive-map', selectedCampusId],
    queryFn: () =>
      api.get<{
        campus: CampusDTO;
        buildings: BuildingDTO[];
        locations: LocationNodeDTO[];
        edges: PathEdgeDTO[];
        liveFacilities?: LiveFacilityStatusDTO[];
      }>(`/campuses/${selectedCampusId}/map`),
  });

  const { data: reports } = useQuery({
    queryKey: ['map-reports', selectedCampusId],
    queryFn: () => api.get<AccessibilityReportDTO[]>(`/reports?campusId=${selectedCampusId}`),
  });

  useEffect(() => {
    if (data) {
      setCachedCampusGraph({
        campusId: selectedCampusId,
        graphVersion: data.campus.graphVersion || 1,
        campus: data.campus,
        locations: data.locations,
        edges: data.edges,
      });
    }
  }, [data, selectedCampusId, setCachedCampusGraph]);

  const effective = data || (cachedCampusGraph?.campusId === selectedCampusId ? cachedCampusGraph : null);

  if (isLoading && !effective) return <SkeletonRows rows={6} />;

  if (!effective) {
    return (
      <Card className="p-6 text-sm text-[var(--ap-danger)]">
        Unable to load campus map data and no cached offline snapshot exists.
      </Card>
    );
  }

  const filteredLocations = effective.locations.filter((l) => {
    if (filterMode === 'step_free') return l.isAccessibleEntrance;
    if (filterMode === 'elevators') return l.hasElevator;
    if (filterMode === 'restrooms') return l.hasAccessibleRestroom;
    return true;
  });

  const map2D = (
    <CampusMap
      centerLat={effective.campus.centerLat}
      centerLng={effective.campus.centerLng}
      zoom={effective.campus.defaultZoom}
      locations={filteredLocations}
      edges={effective.edges}
      reports={reports || []}
      showBarriers={showBarriers}
      onSelectLocation={setSelectedLoc}
      heightClass="h-[560px]"
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Interactive Campus Map</h1>
          <p className="text-xs text-[var(--ap-muted)]">
            {effective.campus.name} · Graph v{effective.campus.graphVersion || cachedCampusGraph?.graphVersion || 1} ·{' '}
            {isError ? 'Using cached offline map snapshot' : 'Live server graph'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                viewMode === '2d' ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                viewMode === '3d' ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D View</span>
            </button>
          </div>
          {[
            ['all', 'All Nodes'],
            ['step_free', 'Step-Free'],
            ['elevators', 'Elevators'],
            ['restrooms', 'Restrooms'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterMode(key as typeof filterMode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                filterMode === key
                  ? 'bg-[#32A7D9] text-[#041E2B] border-[#32A7D9]'
                  : 'bg-[var(--ap-surface)] text-[var(--ap-text)] border-[var(--ap-border)]'
              }`}
            >
              {label}
            </button>
          ))}
          <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] cursor-pointer">
            <input
              type="checkbox"
              checked={showBarriers}
              onChange={(e) => setShowBarriers(e.target.checked)}
              className="accent-[#18C6AD]"
            />
            <span>Barriers</span>
          </label>
          <HelpButton featureId="F043" />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-9">
          <SafeCampusExplorerScene3D
            centerLat={effective.campus.centerLat}
            centerLng={effective.campus.centerLng}
            buildings={data?.buildings || []}
            locations={filteredLocations}
            edges={effective.edges}
            liveFacilities={data?.liveFacilities || []}
            reports={showBarriers ? reports || [] : []}
            heightClass="h-[560px]"
            onSelectLocation={setSelectedLoc}
            forceFallback={viewMode === '2d'}
            fallback={map2D}
          />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-[#18C6AD]">
              {selectedLoc ? selectedLoc.name : 'Select a Map Marker'}
            </h2>
            {selectedLoc ? (
              <>
                <p className="text-xs text-[var(--ap-muted)]">{selectedLoc.description}</p>
                <div className="text-xs space-y-1 text-[var(--ap-text)]">
                  <p>Type: {selectedLoc.type} · Floor {selectedLoc.floor}</p>
                  <p>Step-free entrance: {selectedLoc.isAccessibleEntrance ? 'Yes' : 'No'}</p>
                  <p>Elevator: {selectedLoc.hasElevator ? 'Yes' : 'No'}</p>
                  <p>Restroom: {selectedLoc.hasAccessibleRestroom ? 'Yes' : 'No'}</p>
                </div>
                <div className="pt-2 space-y-2">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/app/planner?to=${selectedLoc.id}`)}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Route to Here</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/app/report/new?nodeId=${selectedLoc.id}`)}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Report Barrier Here</span>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--ap-muted)]">
                Click any node or path edge in 2D or 3D view to inspect surface type, slope, elevator access, or report a barrier.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
