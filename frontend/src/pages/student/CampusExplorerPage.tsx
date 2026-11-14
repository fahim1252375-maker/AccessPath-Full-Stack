import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Compass, Heart, LayoutGrid, LocateFixed, Search } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { SafeCampusExplorerScene3D } from '../../components/three/LazyCampusScenes.tsx';
import { CampusMap } from '../../components/maps/CampusMap.tsx';
import {
  Button,
  Card,
  HelpButton,
  Input,
  SkeletonRows,
  StatusLabel,
} from '../../components/ui/Primitives.tsx';
import { NoSearchResultsState } from '../system/SystemPages.tsx';
import type {
  BuildingDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const CampusExplorerPage: React.FC = () => {
  const { selectedCampusId, user } = useAppStore();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [explorerMode, setExplorerMode] = useState<'cards' | '3d'>('cards');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [favMsg, setFavMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['campus-explorer', selectedCampusId],
    queryFn: () =>
      api.get<{
        campus: CampusDTO;
        buildings: BuildingDTO[];
        locations: LocationNodeDTO[];
        edges: PathEdgeDTO[];
        liveFacilities?: LiveFacilityStatusDTO[];
      }>(`/campuses/${selectedCampusId}/map`),
  });

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Browser geolocation is unavailable.');
      return;
    }
    setGeoStatus('Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus(`Current position detected (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      () => {
        setGeoStatus('Location permission denied or unavailable.');
      },
      { timeout: 6000 }
    );
  };

  const handleFavorite = async (loc: LocationNodeDTO) => {
    if (!user) {
      setFavMsg('Sign in to save favorite campus locations.');
      return;
    }
    await api.post('/routes/favorites', {
      campusId: selectedCampusId,
      locationNodeId: loc.id,
      label: loc.name,
    });
    setFavMsg(`Saved "${loc.name}" to favorites.`);
  };

  const filtered = useMemo(() => {
    const locs = data?.locations || [];
    return locs
      .filter((l) => {
        if (accessibleOnly && !l.isAccessibleEntrance && !l.hasElevator && !l.hasRamp) {
          return false;
        }
        if (categoryFilter === 'library' && !l.name.toLowerCase().includes('library')) return false;
        if (categoryFilter === 'lab' && !l.name.toLowerCase().includes('lab') && !l.name.toLowerCase().includes('science')) return false;
        if (categoryFilter === 'restroom' && !l.hasAccessibleRestroom) return false;
        if (categoryFilter === 'classroom' && l.type !== 'classroom') return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          return (
            l.name.toLowerCase().includes(q) ||
            (l.nameBn && l.nameBn.toLowerCase().includes(q)) ||
            (l.code && l.code.toLowerCase().includes(q)) ||
            l.facilities.some((f) => f.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .map((l) => ({
        ...l,
        distanceFromUser: userCoords ? haversineMeters(userCoords.lat, userCoords.lng, l.lat, l.lng) : null,
      }))
      .sort((a, b) =>
        a.distanceFromUser !== null && b.distanceFromUser !== null
          ? a.distanceFromUser - b.distanceFromUser
          : a.name.localeCompare(b.name)
      );
  }, [data, query, categoryFilter, accessibleOnly, userCoords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">
            Campus Explorer &amp; Facility Finder
          </h1>
          <p className="text-sm text-[var(--ap-muted)]">
            Search buildings, classrooms, libraries, labs, or inspect the campus in interactive 3D.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-1">
            <button
              type="button"
              onClick={() => setExplorerMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                explorerMode === 'cards'
                  ? 'bg-[#18C6AD] text-[#04211E]'
                  : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>
            <button
              type="button"
              onClick={() => setExplorerMode('3d')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                explorerMode === '3d'
                  ? 'bg-[#18C6AD] text-[#04211E]'
                  : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Explorer</span>
            </button>
          </div>
          <HelpButton featureId="F017" />
          <Button variant="outline" size="sm" onClick={handleDetectLocation}>
            <LocateFixed className="w-4 h-4" />
            <span>Detect Nearby</span>
          </Button>
        </div>
      </div>

      {geoStatus && (
        <p className="text-xs text-[var(--ap-text)] bg-[var(--ap-surface-2)] px-3 py-2 rounded-lg border border-[var(--ap-border)]">
          {geoStatus}
        </p>
      )}
      {favMsg && (
        <p className="text-xs text-[#18C6AD] bg-[var(--ap-surface-2)] px-3 py-2 rounded-lg border border-[#18C6AD]/40">
          {favMsg}
        </p>
      )}

      {explorerMode === '3d' && data ? (
        <SafeCampusExplorerScene3D
          centerLat={data.campus.centerLat}
          centerLng={data.campus.centerLng}
          buildings={data.buildings}
          locations={filtered.length > 0 ? filtered : data.locations}
          edges={data.edges}
          liveFacilities={data.liveFacilities}
          heightClass="h-[520px]"
          fallback={
            <CampusMap
              centerLat={data.campus.centerLat}
              centerLng={data.campus.centerLng}
              zoom={data.campus.defaultZoom}
              locations={filtered}
              edges={data.edges}
              heightClass="h-[520px]"
            />
          }
        />
      ) : null}

      <Card className="space-y-4">
        <div className="grid md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--ap-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buildings, classrooms (NLC-105, SEH-202), library, lab..."
              className="pl-9"
              aria-label="Search campus places"
            />
          </div>
          <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
            {[
              ['all', 'All Places'],
              ['classroom', 'Classrooms'],
              ['library', 'Libraries'],
              ['lab', 'Labs'],
              ['restroom', 'Accessible Restrooms'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  categoryFilter === key
                    ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD]'
                    : 'bg-[var(--ap-surface-2)] text-[var(--ap-text)] border-[var(--ap-border)] hover:border-[#18C6AD]/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--ap-text)] cursor-pointer">
          <input
            type="checkbox"
            checked={accessibleOnly}
            onChange={(e) => setAccessibleOnly(e.target.checked)}
            className="w-4 h-4 accent-[#18C6AD]"
          />
          <span>Show only locations with step-free entrance, ramp, or elevator</span>
        </label>
      </Card>

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : filtered.length === 0 ? (
        <NoSearchResultsState
          query={query || categoryFilter}
          onReset={() => {
            setQuery('');
            setCategoryFilter('all');
            setAccessibleOnly(false);
          }}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((loc) => (
            <Card key={loc.id} className="flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/app/places/${loc.id}`}
                      className="text-base font-bold text-[#18C6AD] hover:underline"
                    >
                      {loc.name}
                    </Link>
                    <p className="text-xs text-[var(--ap-muted)] mt-0.5">
                      {loc.code || loc.type} · Floor {loc.floor}
                      {loc.distanceFromUser !== null ? ` · ~${loc.distanceFromUser}m away` : ''}
                    </p>
                  </div>
                  <StatusLabel status={loc.verificationStatus} />
                </div>
                <p className="text-xs text-[var(--ap-muted)] leading-relaxed">{loc.description}</p>
                <p className="text-xs text-[var(--ap-text)]">
                  {loc.isAccessibleEntrance ? 'Step-free entrance' : 'Check entrance access'}
                  {loc.hasElevator ? ' · Elevator' : ''}
                  {loc.hasAccessibleRestroom ? ' · Accessible Restroom' : ''}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--ap-border)] gap-2">
                <Link to={`/app/planner?to=${loc.id}`}>
                  <Button size="sm" variant="secondary">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Route Here</span>
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => handleFavorite(loc)} aria-label={`Save ${loc.name} to favorites`}>
                  <Heart className="w-3.5 h-3.5" />
                  <span>Save</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const PlaceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedCampusId } = useAppStore();

  const { data, isLoading } = useQuery({
    queryKey: ['place-detail', selectedCampusId, id],
    queryFn: () =>
      api.get<{
        locations: LocationNodeDTO[];
        buildings: BuildingDTO[];
      }>(`/campuses/${selectedCampusId}/map`),
  });

  if (isLoading) return <SkeletonRows rows={4} />;

  const place =
    data?.locations.find((l) => l.id === id) ||
    data?.locations.find((l) => l.buildingId === id);
  const building = place?.buildingId
    ? data?.buildings.find((b) => b.id === place.buildingId)
    : data?.buildings.find((b) => b.id === id);

  if (!place && !building) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--ap-text)]">Location Not Found</h1>
        <Link to="/app/explorer" className="text-sm text-[#18C6AD] underline mt-2 inline-block">
          Back to Campus Explorer
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {place && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--ap-muted)]">
                {place.type.toUpperCase()} · {place.code || 'Campus Node'} · Floor {place.floor}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)] mt-1">{place.name}</h1>
              {place.nameBn && <p className="text-sm text-[var(--ap-muted)] mt-0.5">{place.nameBn}</p>}
            </div>
            <div className="flex gap-2">
              <Link to={`/app/planner?to=${place.id}`}>
                <Button>Navigate Here</Button>
              </Link>
              <Link to={`/app/report/new?nodeId=${place.id}`}>
                <Button variant="outline">Report Issue Here</Button>
              </Link>
            </div>
          </div>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--ap-text)]">Accessibility Attributes</h2>
              <StatusLabel status={place.verificationStatus} size="md" />
            </div>
            <p className="text-sm text-[var(--ap-muted)]">{place.description}</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm pt-2">
              <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)]">
                <strong>Step-Free Entrance:</strong> {place.isAccessibleEntrance ? 'Verified Yes' : 'No / Restricted'}
              </div>
              <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)]">
                <strong>Ramp Available:</strong> {place.hasRamp ? 'Yes' : 'No'}
              </div>
              <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)]">
                <strong>Elevator Access:</strong> {place.hasElevator ? 'Yes' : 'No'}
              </div>
              <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[var(--ap-border)]">
                <strong>Accessible Restroom:</strong> {place.hasAccessibleRestroom ? 'Available' : 'Not listed'}
              </div>
            </div>
            {place.facilities.length > 0 && (
              <p className="text-xs text-[var(--ap-muted)]">
                <strong>Facilities:</strong> {place.facilities.join(' · ')}
              </p>
            )}
            {place.qrCodeId && (
              <p className="text-xs font-mono text-[var(--ap-muted)]">
                QR Waypoint ID: {place.qrCodeId} {place.beaconId ? `· Beacon: ${place.beaconId}` : ''}
              </p>
            )}
          </Card>
        </>
      )}

      {building && (
        <Card className="space-y-2">
          <h2 className="text-base font-bold text-[var(--ap-text)]">
            Building: {building.name} ({building.code})
          </h2>
          <p className="text-sm text-[var(--ap-muted)]">{building.accessibilitySummary}</p>
          <p className="text-xs text-[var(--ap-muted)]">
            Floors: {building.floors} · Category: {building.category}
          </p>
        </Card>
      )}
    </div>
  );
};
