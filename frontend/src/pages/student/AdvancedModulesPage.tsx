import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bluetooth,
  Building2,
  Camera,
  CheckCircle2,
  Compass,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Card, HelpButton, Input, StatusLabel } from '../../components/ui/Primitives.tsx';
import type { EmergencyRouteDTO, LocationNodeDTO } from '../../../../shared/types.ts';

export const AdvancedModulesPage: React.FC = () => {
  const { selectedCampusId } = useAppStore();
  const [qrInput, setQrInput] = useState('AP-QR-LIBW');
  const [qrMatch, setQrMatch] = useState<LocationNodeDTO | null>(null);
  const [cameraMsg, setCameraMsg] = useState('');
  const [bleMsg, setBleMsg] = useState('');
  const [arMsg, setArMsg] = useState('');

  const { data: mapData } = useQuery({
    queryKey: ['adv-map', selectedCampusId],
    queryFn: () =>
      api.get<{ locations: LocationNodeDTO[]; emergencyRoutes: EmergencyRouteDTO[] }>(
        `/campuses/${selectedCampusId}/map`
      ),
  });

  const handleQrLookup = () => {
    const found = mapData?.locations.find(
      (l) => l.qrCodeId?.toLowerCase() === qrInput.trim().toLowerCase()
    );
    setQrMatch(found || null);
  };

  const handleTestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMsg('Camera MediaDevices API not supported in this browser; use manual QR code entry above.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      setCameraMsg('Camera permission granted and ready for QR scanning.');
    } catch {
      setCameraMsg('Camera permission declined or unavailable in sandboxed iframe; manual QR entry remains active.');
    }
  };

  const handleTestBluetooth = async () => {
    const nav = navigator as unknown as { bluetooth?: { getAvailability?: () => Promise<boolean> } };
    if (!nav.bluetooth) {
      setBleMsg('Web Bluetooth API is not supported on this browser/device. Simulated indoor beacon mode remains clearly labelled as demo.');
      return;
    }
    try {
      const available = nav.bluetooth.getAvailability ? await nav.bluetooth.getAvailability() : true;
      setBleMsg(
        available
          ? 'Bluetooth adapter detected. Ready to pair with registered campus BLE beacons when deployed.'
          : 'Bluetooth hardware adapter is turned off or unavailable.'
      );
    } catch {
      setBleMsg('Unable to query Bluetooth availability due to browser permissions.');
    }
  };

  const handleTestAR = () => {
    const nav = navigator as unknown as { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } };
    if (!nav.xr?.isSessionSupported) {
      setArMsg('WebXR AR is unsupported on this device. Automatically using 2D/3D Turn-by-Turn & Voice fallback.');
      return;
    }
    nav.xr
      .isSessionSupported('immersive-ar')
      .then((ok) =>
        setArMsg(
          ok
            ? 'Device supports WebXR immersive-ar overlay.'
            : 'immersive-ar unsupported on this device; 2D/3D accessible routing fallback active.'
        )
      )
      .catch(() => setArMsg('AR check blocked by permissions; using 2D/3D fallback.'));
  };

  const indoorNodes = (mapData?.locations || []).filter((l) => l.floor > 0 || l.type === 'elevator');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--ap-text)]">
              Indoor, QR, Beacon, AR &amp; Emergency Hub
            </h1>
            <HelpButton featureId="F145" label="Hardware Adapters Guide" />
          </div>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Hardware-dependent adapters test real browser capabilities and clearly distinguish simulated demo data from live institutional feeds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/indoor"><Button size="sm" variant="outline">3D Floor Schematics</Button></Link>
          <Link to="/app/live-status"><Button size="sm" variant="outline">Live Status</Button></Link>
          <Link to="/app/schedule"><Button size="sm" variant="outline">Class Planner</Button></Link>
          <Link to="/app/emergency"><Button size="sm" variant="danger">Evacuation Plan</Button></Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Wayfinding */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#18C6AD]" />
              <span>QR-Based Building Navigation</span>
            </h2>
            <StatusLabel status="simulated" />
          </div>
          <p className="text-xs text-[var(--ap-muted)]">
            Scan or enter a campus waypoint QR tag (e.g., <code className="font-mono text-[#18C6AD]">AP-QR-LIBW</code>, <code className="font-mono text-[#18C6AD]">AP-QR-GATE01</code>).
          </p>
          <div className="flex gap-2">
            <Input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              aria-label="Campus QR Waypoint Code"
            />
            <Button size="sm" onClick={handleQrLookup}>Locate</Button>
          </div>
          <Button size="sm" variant="outline" onClick={handleTestCamera}>
            <Camera className="w-3.5 h-3.5" />
            <span>Test Camera Permission</span>
          </Button>
          {cameraMsg && <p className="text-xs text-[var(--ap-muted)]">{cameraMsg}</p>}
          {qrMatch && (
            <div className="p-3 rounded-lg bg-[var(--ap-ok-bg)] border border-[var(--ap-ok-border)] text-xs space-y-1">
              <p className="font-bold text-[var(--ap-ok)]">Located: {qrMatch.name}</p>
              <p className="text-[var(--ap-text)]">{qrMatch.description}</p>
              <Link to={`/app/planner?from=${qrMatch.id}`} className="font-semibold underline text-[#18C6AD] inline-block mt-1">
                Start Accessible Route from Here
              </Link>
            </div>
          )}
        </Card>

        {/* Bluetooth Beacon & AR Capability Detection */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-[#32A7D9]" />
              <span>Bluetooth Beacons &amp; AR Capability</span>
            </h2>
            <StatusLabel status="simulated" />
          </div>
          <p className="text-xs text-[var(--ap-muted)]">
            Detects real device support for Web Bluetooth positioning and WebXR AR overlays with automatic 2D/3D routing fallback.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleTestBluetooth}>
              Check Web Bluetooth
            </Button>
            <Button size="sm" variant="outline" onClick={handleTestAR}>
              Check WebXR AR Support
            </Button>
          </div>
          {bleMsg && (
            <p className="text-xs text-[var(--ap-text)] bg-[var(--ap-surface-2)] p-2.5 rounded border border-[var(--ap-border)]">
              {bleMsg}
            </p>
          )}
          {arMsg && (
            <p className="text-xs text-[var(--ap-text)] bg-[var(--ap-surface-2)] p-2.5 rounded border border-[var(--ap-border)]">
              {arMsg}
            </p>
          )}
        </Card>

        {/* Indoor Multi-Floor Navigation & Live Elevator Status */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#18C6AD]" />
              <span>Indoor Levels &amp; Elevator Status (Demo)</span>
            </h2>
            <StatusLabel status="simulated" />
          </div>
          <p className="text-xs text-[var(--ap-muted)]">
            Multi-floor transitions use verified indoor elevator edges. Live BMS sensor feeds require institutional API configuration.
          </p>
          <div className="divide-y divide-[var(--ap-border)]">
            {indoorNodes.map((n) => (
              <div key={n.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[var(--ap-text)]">{n.name}</p>
                  <p className="text-[var(--ap-muted)]">Floor {n.floor} · {n.code}</p>
                </div>
                <Link to={`/app/planner?to=${n.id}`} className="text-[#18C6AD] font-semibold hover:underline inline-flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </Link>
              </div>
            ))}
          </div>
        </Card>

        {/* Emergency Evacuation Routes */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--ap-text)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--ap-danger)]" />
              <span>Emergency Evacuation Routes</span>
            </h2>
            <StatusLabel status="verified" />
          </div>
          <p className="text-xs text-[var(--ap-muted)]">
            Only routes explicitly approved by campus safety administrators are marked approved. Unapproved drafts are labelled pending.
          </p>
          <div className="space-y-2.5">
            {(mapData?.emergencyRoutes || []).map((er) => (
              <div key={er.id} className="p-3 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[var(--ap-text)]">{er.name}</p>
                  {er.adminApproved ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--ap-ok)] whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Admin Approved
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--ap-warn)] whitespace-nowrap">
                      Pending Safety Approval
                    </span>
                  )}
                </div>
                <p className="text-[var(--ap-muted)]">Assembly Point: {er.assemblyPointName}</p>
                <p className="text-[var(--ap-muted)]">{er.notes}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
