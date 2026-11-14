import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Bluetooth,
  Box,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  Map as MapIcon,
  Printer,
  QrCode,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { SafeIndoorBuildingScene3D } from '../../components/three/LazyCampusScenes.tsx';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  HelpButton,
  Input,
  Select,
  SkeletonRows,
  StatusLabel,
} from '../../components/ui/Primitives.tsx';
import type {
  BuildingDTO,
  ClassScheduleItemDTO,
  DayPlanTransitionDTO,
  EmergencyRouteDTO,
  FloorPlanDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
} from '../../../../shared/types.ts';

// ---------------------------------------------------------------------------
// PHASE 3: Multi-Floor Indoor Navigation & Waypoints (3D + 2D)
// ---------------------------------------------------------------------------
export const IndoorNavigationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedCampusId } = useAppStore();

  const { data: mapData, isLoading: loadingMap } = useQuery({
    queryKey: ['indoor-map', selectedCampusId],
    queryFn: () =>
      api.get<{ buildings: BuildingDTO[]; locations: LocationNodeDTO[] }>(
        `/campuses/${selectedCampusId}/map`
      ),
  });

  const { data: floors, isLoading: loadingFloors } = useQuery({
    queryKey: ['indoor-floors', selectedCampusId],
    queryFn: () => api.get<FloorPlanDTO[]>(`/campuses/${selectedCampusId}/floors`),
  });

  const { data: liveStatusData } = useQuery({
    queryKey: ['indoor-live-status', selectedCampusId],
    queryFn: () =>
      api.get<{ facilities: LiveFacilityStatusDTO[] }>(
        `/operations/live-status?campusId=${selectedCampusId}`
      ),
  });

  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [qrInput, setQrInput] = useState('AP-QR-LIBW');
  const [qrMatch, setQrMatch] = useState<LocationNodeDTO | null>(null);
  const [qrError, setQrError] = useState('');
  const [cameraMsg, setCameraMsg] = useState('');
  const [bleMsg, setBleMsg] = useState('');
  const [arMsg, setArMsg] = useState('');

  const buildingsWithFloors = useMemo(() => {
    const ids = new Set((floors || []).map((f) => f.buildingId));
    return (mapData?.buildings || []).filter((b) => ids.has(b.id));
  }, [floors, mapData]);

  const effectiveBuildingId =
    selectedBuildingId || buildingsWithFloors[0]?.id || (floors && floors[0]?.buildingId) || '';

  const buildingFloors = useMemo(
    () => (floors || []).filter((f) => f.buildingId === effectiveBuildingId),
    [floors, effectiveBuildingId]
  );

  const activeFloor =
    buildingFloors.find((f) => f.id === selectedFloorId) || buildingFloors[0] || null;

  const liveFacilities = liveStatusData?.facilities || [];
  const buildingElevator = liveFacilities.find(
    (f) => f.buildingId === effectiveBuildingId && f.facilityType === 'elevator'
  );
  const elevatorConfirmedOperational = buildingElevator?.status === 'operational';

  const handleQrLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQrError('');
    setQrMatch(null);
    const trimmed = qrInput.trim();
    if (!trimmed) {
      setQrError('Enter a campus QR waypoint code.');
      return;
    }
    try {
      const node = await api.get<LocationNodeDTO>(
        `/campuses/${selectedCampusId}/qr/${encodeURIComponent(trimmed)}`
      );
      setQrMatch(node);
    } catch (err) {
      setQrError((err as Error).message);
    }
  };

  const handleTestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMsg('Camera MediaDevices API unavailable here; manual QR code lookup remains active.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((tr) => tr.stop());
      setCameraMsg('Camera permission granted and ready for live QR waypoint scanning.');
    } catch {
      setCameraMsg('Camera permission declined or blocked by browser; use manual QR entry above.');
    }
  };

  const handleTestBluetooth = async () => {
    const nav = navigator as unknown as { bluetooth?: { getAvailability?: () => Promise<boolean> } };
    if (!nav.bluetooth) {
      setBleMsg('Web Bluetooth unavailable in this browser. Simulated demo beacons remain clearly marked.');
      return;
    }
    try {
      const ok = nav.bluetooth.getAvailability ? await nav.bluetooth.getAvailability() : true;
      setBleMsg(
        ok
          ? 'Bluetooth adapter available for institutional BLE beacons.'
          : 'Bluetooth adapter is off; showing demo beacon locations only.'
      );
    } catch {
      setBleMsg('Bluetooth query blocked by permissions; demo beacons shown on floor map.');
    }
  };

  const handleTestAR = () => {
    const nav = navigator as unknown as { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } };
    if (!nav.xr?.isSessionSupported) {
      setArMsg('WebXR AR not supported here; 3D/2D accessible floor schematic and voice turn-by-turn active.');
      return;
    }
    nav.xr
      .isSessionSupported('immersive-ar')
      .then((ok) =>
        setArMsg(
          ok
            ? 'Device supports WebXR immersive-ar overlays.'
            : 'immersive-ar unsupported; using 3D/2D accessible floor view.'
        )
      )
      .catch(() => setArMsg('AR check declined; using 3D/2D schematic.'));
  };

  if (loadingMap || loadingFloors) return <SkeletonRows rows={5} />;

  const svg2DFallback = activeFloor ? (
    <div className="border border-[var(--ap-border)] rounded-xl bg-[var(--ap-surface-2)] p-3 overflow-x-auto">
      <svg
        viewBox={`0 0 ${activeFloor.svgWidth} ${activeFloor.svgHeight}`}
        className="w-full min-w-[460px] h-auto"
        role="img"
        aria-label={`Indoor floor plan for ${activeFloor.floorLabel}`}
      >
        <rect
          x="0"
          y="0"
          width={activeFloor.svgWidth}
          height={activeFloor.svgHeight}
          fill="#0B2235"
          stroke="#224562"
          strokeWidth="2"
          rx="8"
        />
        {activeFloor.corridors.map((c) => (
          <g key={c.id}>
            <polyline
              points={c.points.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke={c.accessible ? '#18C6AD' : '#EF4444'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c.accessible ? undefined : '8 6'}
            />
            <text x={c.points[0][0] + 10} y={c.points[0][1] - 10} fontSize="11" fill="#F5FAFC" fontWeight="600">
              {c.name} ({c.widthMeters}m)
            </text>
          </g>
        ))}
        {activeFloor.rooms.map((r) => {
          const isElv = r.label.toLowerCase().includes('elevator');
          const ok = isElv ? elevatorConfirmedOperational : r.accessible;
          return (
            <g key={r.id}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx="6"
                fill={ok ? '#132B3D' : '#450A0A'}
                stroke={ok ? '#18C6AD' : '#EF4444'}
                strokeWidth="2"
              />
              <text
                x={r.x + r.w / 2}
                y={r.y + r.h / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fill="#F5FAFC"
                fontWeight="700"
              >
                {r.label}
              </text>
            </g>
          );
        })}
        {activeFloor.qrWaypoints.map((qr) => (
          <g key={qr.code}>
            <rect x={qr.x - 10} y={qr.y - 10} width="20" height="20" rx="3" fill="#32A7D9" />
            <text x={qr.x} y={qr.y + 4} textAnchor="middle" fontSize="9" fill="#041E2B" fontWeight="700">
              QR
            </text>
            <text x={qr.x + 14} y={qr.y + 4} fontSize="10" fill="#F5FAFC" fontWeight="600">
              {qr.code}
            </text>
          </g>
        ))}
        {activeFloor.bleBeacons.map((b) => (
          <g key={b.uuid}>
            <circle cx={b.x} cy={b.y} r="8" fill="#F59E0B" />
            <text x={b.x + 12} y={b.y + 4} fontSize="10" fill="#FBBF24" fontWeight="600">
              BLE ({b.simulated ? 'Demo Sim' : 'Live'})
            </text>
          </g>
        ))}
      </svg>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">{t('indoor.title')}</h1>
          <p className="text-xs text-[var(--ap-muted)] mt-1">{t('indoor.simulatedNote')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                viewMode === '3d' ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Stack</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                viewMode === '2d' ? 'bg-[#18C6AD] text-[#04211E]' : 'text-[var(--ap-muted)]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D SVG Plan</span>
            </button>
          </div>
          <HelpButton featureId="F175" />
          <Link to="/app/planner">
            <Button size="sm" variant="outline">
              <Compass className="w-3.5 h-3.5" />
              <span>Outdoor Route Planner</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="indoor-building" className="text-xs font-semibold text-[var(--ap-muted)]">
                  {t('indoor.selectBuilding')}:
                </label>
                <Select
                  id="indoor-building"
                  value={effectiveBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setSelectedFloorId('');
                  }}
                  className="w-56"
                >
                  {buildingsWithFloors.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-1.5" role="group" aria-label={t('indoor.selectFloor')}>
                <Layers className="w-4 h-4 text-[#18C6AD]" aria-hidden="true" />
                {buildingFloors.map((fl) => (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => setSelectedFloorId(fl.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap cursor-pointer ${
                      activeFloor?.id === fl.id
                        ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD]'
                        : 'bg-[var(--ap-surface-2)] text-[var(--ap-text)] border-[var(--ap-border)]'
                    }`}
                  >
                    {fl.floorLabel}
                  </button>
                ))}
              </div>
            </div>

            {activeFloor ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ap-muted)]">
                  <span>
                    Current Floor: <strong className="text-[#18C6AD]">{activeFloor.floorLabel}</strong>
                    {' · '}
                    Elevator:{' '}
                    <strong className={elevatorConfirmedOperational ? 'text-[#18C6AD]' : 'text-[var(--ap-danger)]'}>
                      {buildingElevator ? buildingElevator.status.toUpperCase() : 'UNVERIFIED'}
                    </strong>
                  </span>
                  {activeFloor.isDemoData && <StatusLabel status="simulated" />}
                </div>

                <SafeIndoorBuildingScene3D
                  floorPlans={buildingFloors}
                  selectedFloorNumber={activeFloor.floorNumber}
                  liveFacilities={liveFacilities}
                  buildingId={effectiveBuildingId}
                  onSelectFloor={(fn) => {
                    const match = buildingFloors.find((f) => f.floorNumber === fn);
                    if (match) setSelectedFloorId(match.id);
                  }}
                  onSelectRoomNode={(nodeId) => navigate(`/app/planner?to=${nodeId}`)}
                  forceFallback={viewMode === '2d'}
                  fallback={svg2DFallback}
                />

                {/* Rooms & Indoor Transitions */}
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  {activeFloor.rooms.map((rm) => (
                    <div
                      key={rm.id}
                      className="p-3 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[var(--ap-text)]">{rm.label}</p>
                        <p className="text-[var(--ap-muted)]">
                          {rm.accessible ? 'Step-free indoor corridor' : 'Restricted stairs/narrow'}
                        </p>
                      </div>
                      <Link to={`/app/planner?to=${rm.nodeId}`}>
                        <Button size="sm" variant="outline">Navigate</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="No floor plans mapped for this building"
                description="Administrators can register multi-floor schematics in the Campus Graph Editor."
              />
            )}
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <Card className="space-y-3">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#18C6AD]" />
              <span>{t('indoor.qrLookup')}</span>
            </h2>
            <p className="text-xs text-[var(--ap-muted)]">
              Look up a registered campus QR tag (<code className="font-mono text-[#32A7D9]">AP-QR-LIBW</code>, <code className="font-mono text-[#32A7D9]">AP-QR-LIB2</code>, <code className="font-mono text-[#32A7D9]">AP-QR-SCI0</code>).
            </p>
            <form onSubmit={handleQrLookup} className="flex gap-2">
              <Input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder={t('indoor.qrPlaceholder')}
                aria-label="Campus QR Waypoint Code"
              />
              <Button type="submit" size="sm">{t('indoor.locateButton')}</Button>
            </form>
            <Button size="sm" variant="outline" onClick={handleTestCamera} className="w-full">
              <Camera className="w-3.5 h-3.5" />
              <span>Check Camera Permission</span>
            </Button>
            {cameraMsg && <p className="text-xs text-[var(--ap-muted)]">{cameraMsg}</p>}
            {qrError && (
              <p className="text-xs font-semibold text-[var(--ap-danger)] bg-[var(--ap-danger-bg)] p-2.5 rounded border border-[var(--ap-danger-border)]">
                {qrError}
              </p>
            )}
            {qrMatch && (
              <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[#18C6AD]/50 text-xs space-y-1">
                <p className="font-bold text-[#18C6AD]">
                  Verified Waypoint: {qrMatch.name} (Floor {qrMatch.floor})
                </p>
                <p className="text-[var(--ap-text)]">{qrMatch.description}</p>
                <Link to={`/app/planner?from=${qrMatch.id}`} className="font-semibold underline text-[#32A7D9] inline-block pt-1">
                  Start Route From This Waypoint
                </Link>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-[#32A7D9]" />
              <span>Hardware Adapter Status</span>
            </h2>
            <p className="text-xs text-[var(--ap-muted)]">
              Browser capabilities are queried directly. Simulated BLE beacon markers never fabricate real RSSI signals.
            </p>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={handleTestBluetooth}>
                Check Web Bluetooth Support
              </Button>
              <Button size="sm" variant="outline" onClick={handleTestAR}>
                Check WebXR AR Overlay Support
              </Button>
            </div>
            {bleMsg && <p className="text-xs bg-[var(--ap-surface-2)] p-2.5 rounded border border-[var(--ap-border)] text-[var(--ap-text)]">{bleMsg}</p>}
            {arMsg && <p className="text-xs bg-[var(--ap-surface-2)] p-2.5 rounded border border-[var(--ap-border)] text-[var(--ap-text)]">{arMsg}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PHASE 4: Live Campus Accessibility Status
// ---------------------------------------------------------------------------
export const LiveStatusPage: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCampusId, user } = useAppStore();
  const queryClient = useQueryClient();
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['live-status', selectedCampusId],
    queryFn: () =>
      api.get<{
        campusId: string;
        facilities: LiveFacilityStatusDTO[];
        subscribedFacilityIds: string[];
        lastCheckedAt: string;
      }>(`/operations/live-status?campusId=${selectedCampusId}`),
  });

  const canModify = ['moderator', 'campus_admin', 'super_admin'].includes(user?.role || '');

  const handleToggleSubscribe = async (facilityId: string) => {
    if (!user) {
      setFeedbackMsg('Please sign in to subscribe to outage notifications.');
      return;
    }
    const res = await api.post<{ subscribed: boolean }>(`/operations/live-status/${facilityId}/subscribe`, {
      channel: 'in_app',
    });
    setFeedbackMsg(
      res.subscribed
        ? 'Subscribed to real-time in-app outage alerts.'
        : 'Unsubscribed from facility alerts.'
    );
    queryClient.invalidateQueries({ queryKey: ['live-status'] });
  };

  const handleStatusChange = async (
    facility: LiveFacilityStatusDTO,
    nextStatus: LiveFacilityStatusDTO['status']
  ) => {
    const res = await api.patch<{ notifiedSubscribers: number }>(
      `/operations/live-status/${facility.id}`,
      {
        status: nextStatus,
        notes: `Updated to ${nextStatus} via Live Accessibility Operations`,
      }
    );
    setFeedbackMsg(
      `${facility.name} updated to ${nextStatus}. Graph edges synced & ${res.notifiedSubscribers} subscriber(s) alerted.`
    );
    queryClient.invalidateQueries({ queryKey: ['live-status'] });
    queryClient.invalidateQueries({ queryKey: ['planner-map'] });
    queryClient.invalidateQueries({ queryKey: ['indoor-live-status'] });
  };

  if (isLoading || !data) return <SkeletonRows rows={5} />;

  const subscribedSet = new Set(data.subscribedFacilityIds);
  const outages = data.facilities.filter((f) => f.status === 'outage' || f.status === 'closed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">{t('liveStatus.title')}</h1>
          <p className="text-xs text-[var(--ap-muted)] mt-1">{t('liveStatus.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton featureId="F181" />
          <span className="text-xs text-[var(--ap-muted)] tabular-nums">
            Last Synced: {new Date(data.lastCheckedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {outages.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-xs text-[var(--ap-danger)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{outages.length} Active Outage(s):</strong> {t('liveStatus.outageWarning')}
            </span>
          </div>
          <Link to="/app/planner">
            <Button size="sm" variant="danger">Recalculate Routes</Button>
          </Link>
        </div>
      )}

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[#18C6AD]/50 text-xs font-semibold text-[#18C6AD]">
          {feedbackMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {data.facilities.map((fac) => {
          const isSubscribed = subscribedSet.has(fac.id);
          return (
            <Card key={fac.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[var(--ap-text)]">{fac.name}</h2>
                  <p className="text-xs text-[var(--ap-muted)]">
                    {fac.facilityType.replace(/_/g, ' ')} · Source: {fac.source}
                  </p>
                </div>
                <StatusLabel status={fac.status} />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ap-muted)]">
                <StatusLabel status={fac.providerStatus} />
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Updated {new Date(fac.lastSyncAt).toLocaleString()}</span>
              </div>

              {fac.notes && <p className="text-xs text-[var(--ap-text)] bg-[var(--ap-surface-2)] p-2.5 rounded border border-[var(--ap-border)]">{fac.notes}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--ap-border)]">
                <Button
                  size="sm"
                  variant={isSubscribed ? 'secondary' : 'outline'}
                  onClick={() => handleToggleSubscribe(fac.id)}
                >
                  {isSubscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span>{isSubscribed ? t('liveStatus.subscribed') : t('liveStatus.subscribe')}</span>
                </Button>

                {canModify && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(fac, 'operational')}>
                      Operational
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleStatusChange(fac, 'outage')}>
                      Report Outage
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PHASE 5: AI Smart Class Schedule Planner
// ---------------------------------------------------------------------------
const DAYS: Array<ClassScheduleItemDTO['dayOfWeek']> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ClassSchedulePage: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCampusId, user } = useAppStore();
  const queryClient = useQueryClient();

  const [day, setDay] = useState<ClassScheduleItemDTO['dayOfWeek']>('Mon');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:15');
  const [locationNodeId, setLocationNodeId] = useState('loc_science_hall');
  const [roomLabel, setRoomLabel] = useState('Room 201');
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: mapData } = useQuery({
    queryKey: ['sched-map', selectedCampusId],
    queryFn: () =>
      api.get<{ buildings: BuildingDTO[]; locations: LocationNodeDTO[] }>(
        `/campuses/${selectedCampusId}/map`
      ),
  });

  const { data: dayPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ['day-plan', selectedCampusId, day, user?.id],
    queryFn: () =>
      api.get<{
        dayOfWeek: string;
        classes: ClassScheduleItemDTO[];
        transitions: DayPlanTransitionDTO[];
      }>(`/operations/schedule/day-plan?day=${day}`),
    enabled: Boolean(user),
  });

  if (!user) {
    return (
      <EmptyState
        title="Sign in to access Smart Class Schedule Planner"
        description="Save your class timetable and calculate accessible class-to-class transitions using your Accessibility Profile."
        action={<Link to="/auth/signin"><Button>Sign In</Button></Link>}
      />
    );
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const loc = mapData?.locations.find((l) => l.id === locationNodeId);
    const buildingId = loc?.buildingId || mapData?.buildings[0]?.id || 'bld_science';
    try {
      await api.post('/operations/schedule', {
        campusId: selectedCampusId,
        courseCode,
        courseTitle,
        dayOfWeek: day,
        startTime,
        endTime,
        buildingId,
        locationNodeId,
        roomLabel,
        bufferMinutes: Number(bufferMinutes),
      });
      setCourseCode('');
      setCourseTitle('');
      queryClient.invalidateQueries({ queryKey: ['day-plan'] });
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/operations/schedule/${id}`);
    queryClient.invalidateQueries({ queryKey: ['day-plan'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">{t('schedule.title')}</h1>
          <p className="text-xs text-[var(--ap-muted)] mt-1">{t('schedule.subtitle')}</p>
        </div>
        <HelpButton featureId="F186" />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Day of week selector">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap cursor-pointer ${
              day === d
                ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD]'
                : 'bg-[var(--ap-surface)] text-[var(--ap-text)] border-[var(--ap-border)]'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#18C6AD]" />
              <span>{t('schedule.addClass')} ({day})</span>
            </h2>
            {errorMsg && <p className="text-xs font-semibold text-[var(--ap-danger)]">{errorMsg}</p>}
            <form onSubmit={handleAddClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Course Code" htmlFor="cls-code" required>
                  <Input id="cls-code" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CSE-301" required />
                </FormField>
                <FormField label="Room Label" htmlFor="cls-room" required>
                  <Input id="cls-room" value={roomLabel} onChange={(e) => setRoomLabel(e.target.value)} required />
                </FormField>
              </div>
              <FormField label="Course Title" htmlFor="cls-title" required>
                <Input id="cls-title" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Accessible Computing" required />
              </FormField>
              <FormField label="Campus Building / Location" htmlFor="cls-loc" required>
                <Select id="cls-loc" value={locationNodeId} onChange={(e) => setLocationNodeId(e.target.value)}>
                  {(mapData?.locations || []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (Floor {l.floor})
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid grid-cols-3 gap-2">
                <FormField label="Start" htmlFor="cls-start" required>
                  <Input id="cls-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </FormField>
                <FormField label="End" htmlFor="cls-end" required>
                  <Input id="cls-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </FormField>
                <FormField label="Buffer (m)" htmlFor="cls-buf" required>
                  <Input id="cls-buf" type="number" min={0} max={45} value={bufferMinutes} onChange={(e) => setBufferMinutes(Number(e.target.value))} required />
                </FormField>
              </div>
              <Button type="submit" className="w-full">Save Class &amp; Recalculate Plan</Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-[var(--ap-text)]">{t('schedule.dayPlanHeading')} ({day})</h2>
            {loadingPlan ? (
              <SkeletonRows rows={3} />
            ) : !dayPlan || dayPlan.classes.length === 0 ? (
              <p className="text-xs text-[var(--ap-muted)]">
                No classes scheduled for {day}. Add classes on the left to generate verified departure recommendations.
              </p>
            ) : (
              <div className="space-y-3">
                {dayPlan.transitions.map((tr, idx) => {
                  const cls = dayPlan.classes[idx];
                  return (
                    <div key={tr.toClassId} className="p-4 rounded-xl border border-[var(--ap-border)] bg-[var(--ap-surface-2)] space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#18C6AD]">
                            {cls?.courseCode}: {cls?.courseTitle} ({cls?.roomLabel})
                          </p>
                          <p className="text-[var(--ap-muted)] tabular-nums">
                            {cls?.startTime} – {cls?.endTime} · {tr.fromLocationName} &rarr; {tr.toLocationName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(tr.toClassId)}
                          aria-label={`Delete ${cls?.courseCode}`}
                          className="p-1.5 text-[var(--ap-danger)] hover:bg-[var(--ap-danger-bg)] rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[var(--ap-text)] tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#18C6AD]">
                          <Clock className="w-3.5 h-3.5" />
                          Depart by {tr.recommendedDepartureTime}
                        </span>
                        <span>Est. {tr.estimatedTravelMinutes} min travel + {tr.bufferMinutes} min buffer</span>
                        {tr.routeResult.routes[0] && (
                          <StatusLabel status={tr.routeResult.routes[0].verificationSummary} />
                        )}
                      </div>

                      {tr.tightScheduleWarning && (
                        <div className="p-2.5 rounded bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-[var(--ap-danger)] font-medium flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{tr.tightScheduleWarning}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PHASE 6: Accessible Emergency Evacuation Planner
// ---------------------------------------------------------------------------
export const EmergencyEvacuationPage: React.FC = () => {
  const { t } = useTranslation();
  const { selectedCampusId } = useAppStore();
  const [buildingFilter, setBuildingFilter] = useState('all');

  const { data: mapData, isLoading } = useQuery({
    queryKey: ['emergency-map', selectedCampusId],
    queryFn: () =>
      api.get<{ buildings: BuildingDTO[]; emergencyRoutes: EmergencyRouteDTO[] }>(
        `/campuses/${selectedCampusId}/map`
      ),
  });

  if (isLoading || !mapData) return <SkeletonRows rows={4} />;

  const routes = mapData.emergencyRoutes.filter(
    (er) => buildingFilter === 'all' || er.fromBuildingId === buildingFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">{t('emergency.title')}</h1>
          <p className="text-xs text-[var(--ap-muted)] mt-1">{t('emergency.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpButton featureId="F191" />
          <Select
            aria-label="Filter evacuation plans by building"
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="w-52"
          >
            <option value="all">All Campus Buildings</option>
            {mapData.buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span>{t('emergency.printPlan')}</span>
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-xs text-[var(--ap-danger)] flex items-start gap-2.5" role="alert">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="font-semibold">{t('emergency.safetyDisclaimer')}</p>
      </div>

      <div className="space-y-4">
        {routes.map((er) => {
          const building = mapData.buildings.find((b) => b.id === er.fromBuildingId);
          return (
            <Card key={er.id} className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[#18C6AD]">{er.name}</h2>
                  <p className="text-xs text-[var(--ap-muted)]">
                    {building ? `${building.name} (${building.code})` : er.fromBuildingId}
                    {typeof er.floorNumber === 'number' ? ` · Floor ${er.floorNumber}` : ''} ·{' '}
                    {er.wheelchairCompatible ? 'Wheelchair-Compatible Evacuation' : 'Standard Exit Only'}
                    {er.isDemoData ? ' · Demo Seed Data' : ' · Institutional Safety Record'}
                  </p>
                </div>
                {er.adminApproved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18C6AD]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Admin Approved</span>
                  </span>
                ) : (
                  <StatusLabel status="pending" />
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs bg-[var(--ap-surface-2)] p-3 rounded-lg border border-[var(--ap-border)]">
                <div>
                  <p className="font-bold text-[var(--ap-text)]">Accessible Assembly Point</p>
                  <p className="text-[var(--ap-muted)]">{er.assemblyPointName}</p>
                </div>
                <div>
                  <p className="font-bold text-[var(--ap-text)]">Approval Metadata</p>
                  <p className="text-[var(--ap-muted)]">
                    {er.adminApproved
                      ? `Approved by ${er.approvedBy || 'Campus Safety Admin'}${
                          er.approvedAt ? ` on ${new Date(er.approvedAt).toLocaleDateString()}` : ''
                        }`
                      : 'Not yet approved for authoritative emergency evacuation'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--ap-text)]">{er.notes}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
