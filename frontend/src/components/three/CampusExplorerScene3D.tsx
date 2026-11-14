import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore.ts';
import { detectWebGLCapability, useInViewport } from './webglUtils.ts';
import type {
  AccessibilityReportDTO,
  BuildingDTO,
  CalculatedRouteDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';

function projectLatLng(lat: number, lng: number, centerLat: number, centerLng: number): [number, number] {
  const scale = 3200;
  const x = (lng - centerLng) * scale;
  const z = -(lat - centerLat) * scale;
  return [x, z];
}

const ExplorerAnimatedRoute: React.FC<{
  route: CalculatedRouteDTO;
  nodePositions: Map<string, [number, number, number]>;
  reducedMotion: boolean;
}> = ({ route, nodePositions, reducedMotion }) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const pts = useMemo(() => {
    const coords: THREE.Vector3[] = [];
    for (const id of route.nodeIds) {
      const p = nodePositions.get(id);
      if (p) coords.push(new THREE.Vector3(p[0], p[1] + 0.16, p[2]));
    }
    return coords;
  }, [route.nodeIds, nodePositions]);

  const curve = useMemo(
    () => (pts.length >= 2 ? new THREE.CatmullRomCurve3(pts) : null),
    [pts]
  );

  const linePts = useMemo(
    () =>
      curve
        ? curve.getPoints(48).map((v) => [v.x, v.y + 0.04, v.z] as [number, number, number])
        : [],
    [curve]
  );

  const tracker = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!curve || !pulseRef.current) return;
    const t = reducedMotion ? 0.5 : (clock.getElapsedTime() * 0.2) % 1;
    curve.getPointAt(t, tracker.current);
    pulseRef.current.position.copy(tracker.current);
  });

  if (linePts.length < 2) return null;

  const isPrimary = route.isPrimary;
  const color = isPrimary ? '#18C6AD' : '#32A7D9';

  return (
    <group>
      {/* Non-color-only differentiation: Primary uses solid thick track + beacon; alternative uses dashed line */}
      <Line
        points={linePts}
        color={color}
        lineWidth={isPrimary ? 4.5 : 2.5}
        dashed={!isPrimary || route.verificationSummary === 'unverified_included'}
        dashSize={0.45}
        gapSize={0.25}
      />
      {isPrimary && (
        <mesh ref={pulseRef} position={linePts[0]}>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial color="#F5FAFC" emissive="#18C6AD" emissiveIntensity={1.25} />
        </mesh>
      )}
    </group>
  );
};

export interface CampusExplorerScene3DProps {
  centerLat?: number;
  centerLng?: number;
  buildings: BuildingDTO[];
  locations: LocationNodeDTO[];
  edges: PathEdgeDTO[];
  liveFacilities?: LiveFacilityStatusDTO[];
  reports?: AccessibilityReportDTO[];
  routes?: CalculatedRouteDTO[];
  selectedOriginId?: string;
  selectedDestinationId?: string;
  onSelectLocation?: (loc: LocationNodeDTO) => void;
  heightClass?: string;
}

export const CampusExplorerScene3D: React.FC<CampusExplorerScene3DProps> = ({
  centerLat = 23.7276,
  centerLng = 90.3915,
  buildings,
  locations,
  edges,
  liveFacilities = [],
  reports = [],
  routes = [],
  selectedOriginId,
  selectedDestinationId,
  onSelectLocation,
  heightClass = 'h-[480px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(containerRef);
  const theme = useAppStore((s) => s.theme);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<LocationNodeDTO | null>(null);

  const isDark = theme === 'dark';
  const cap = detectWebGLCapability();

  const nodePositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const loc of locations) {
      const [x, z] = projectLatLng(loc.lat, loc.lng, centerLat, centerLng);
      map.set(loc.id, [x, loc.floor * 0.45 + 0.08, z]);
    }
    return map;
  }, [locations, centerLat, centerLng]);

  const activeBarriers = useMemo(
    () =>
      reports.filter(
        (r) =>
          typeof r.lat === 'number' &&
          typeof r.lng === 'number' &&
          !['resolved', 'rejected', 'duplicate'].includes(r.status)
      ),
    [reports]
  );

  const frameloopMode = inView && !reducedMotion && !lowBandwidth ? 'always' : 'demand';

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${heightClass} rounded-xl border border-[var(--ap-border)] overflow-hidden bg-[#071827]`}
      aria-label="Interactive 3D Campus Explorer"
    >
      <Canvas
        shadows={!cap.isSoftware}
        dpr={cap.isSoftware ? 1 : [1, 1.5]}
        camera={{ position: [0, 12.5, 13.5], fov: 44 }}
        frameloop={frameloopMode}
      >
        <color attach="background" args={[isDark ? '#071827' : '#DAEAF8']} />
        <fog attach="fog" args={[isDark ? '#071827' : '#DAEAF8', 18, 42]} />
        <ambientLight intensity={isDark ? 0.55 : 0.78} />
        <directionalLight position={[12, 16, 8]} intensity={1.4} castShadow />
        <directionalLight position={[-10, 6, -8]} intensity={0.45} color="#32A7D9" />
        <OrbitControls minDistance={5} maxDistance={28} maxPolarAngle={Math.PI / 2.15} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[46, 46]} />
          <meshStandardMaterial color={isDark ? '#0B2235' : '#C6DAEC'} roughness={0.9} />
        </mesh>
        <gridHelper args={[36, 36, isDark ? '#183A56' : '#96B5CE', isDark ? '#0F2A40' : '#B5CEE2']} />

        {/* Campus Buildings */}
        {buildings.map((b) => {
          const [bx, bz] = projectLatLng(b.lat, b.lng, centerLat, centerLng);
          const height = Math.max(0.9, b.floors * 0.58);
          const buildingOutage = liveFacilities.some(
            (f) => f.buildingId === b.id && f.facilityType === 'elevator' && (f.status === 'outage' || f.status === 'closed')
          );
          const activeElevator = b.hasElevator && !buildingOutage;

          return (
            <group key={b.id} position={[bx, 0, bz]}>
              <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.1, height, 1.7]} />
                <meshStandardMaterial
                  color={isDark ? '#132B3D' : '#E7F0F7'}
                  roughness={0.45}
                  metalness={0.18}
                />
              </mesh>
              <mesh position={[0, height + 0.04, 0]}>
                <boxGeometry args={[1.95, 0.06, 1.55]} />
                <meshStandardMaterial
                  color={b.hasAccessibleEntrance ? '#18C6AD' : '#F59E0B'}
                  emissive={b.hasAccessibleEntrance ? '#18C6AD' : '#F59E0B'}
                  emissiveIntensity={0.35}
                />
              </mesh>
              {b.hasElevator && (
                <mesh position={[1.15, height + 0.15, 0]}>
                  <sphereGeometry args={[0.14, 12, 12]} />
                  <meshStandardMaterial
                    color={activeElevator ? '#18C6AD' : '#EF4444'}
                    emissive={activeElevator ? '#18C6AD' : '#EF4444'}
                    emissiveIntensity={0.85}
                  />
                </mesh>
              )}
              <Html position={[0, height + 0.45, 0]} center distanceFactor={16}>
                <div className="pointer-events-none px-2 py-0.5 rounded bg-[#071827]/90 border border-[#224562] text-[10px] font-mono font-bold text-[#F5FAFC] whitespace-nowrap">
                  {b.code}
                </div>
              </Html>
            </group>
          );
        })}

        {/* Path Edges (with pattern/shape distinction for verified vs caution vs unverified vs blocked) */}
        {edges.map((edge) => {
          const p1 = nodePositions.get(edge.fromNodeId);
          const p2 = nodePositions.get(edge.toNodeId);
          if (!p1 || !p2) return null;
          const isBlocked = edge.status === 'blocked' || edge.temporaryClosure;
          const isCaution = edge.status === 'caution' || edge.hasStairs || edge.verificationStatus !== 'verified';
          const color = isBlocked
            ? '#EF4444'
            : isCaution
            ? '#F59E0B'
            : '#147D78';

          return (
            <group key={edge.id}>
              <Line
                points={[p1, p2]}
                color={color}
                lineWidth={isBlocked ? 3 : 2}
                dashed={isBlocked || isCaution}
                dashSize={0.3}
                gapSize={0.22}
              />
              {isBlocked && (
                <mesh position={[(p1[0] + p2[0]) / 2, 0.28, (p1[2] + p2[2]) / 2]}>
                  <coneGeometry args={[0.2, 0.46, 10]} />
                  <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.5} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Active Barrier Reports */}
        {activeBarriers.map((rep) => {
          const [rx, rz] = projectLatLng(rep.lat!, rep.lng!, centerLat, centerLng);
          return (
            <mesh key={rep.id} position={[rx, 0.32, rz]}>
              <octahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial color="#F59E0B" emissive="#D97706" emissiveIntensity={0.65} />
            </mesh>
          );
        })}

        {/* Selectable Campus Nodes */}
        {locations.map((loc) => {
          const pos = nodePositions.get(loc.id);
          if (!pos) return null;
          const isOrigin = loc.id === selectedOriginId;
          const isDest = loc.id === selectedDestinationId;
          const isActive = hoveredId === loc.id || selectedLoc?.id === loc.id;
          const col = isOrigin
            ? '#32A7D9'
            : isDest
            ? '#18C6AD'
            : loc.isAccessibleEntrance
            ? '#18C6AD'
            : '#94A3B8';

          return (
            <group key={loc.id} position={pos}>
              <mesh
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(loc.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredId(null);
                  document.body.style.cursor = 'auto';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLoc(loc);
                  onSelectLocation?.(loc);
                }}
              >
                <cylinderGeometry args={[isActive || isOrigin || isDest ? 0.3 : 0.2, 0.25, 0.18, 16]} />
                <meshStandardMaterial color={col} emissive={col} emissiveIntensity={isActive ? 0.9 : 0.4} />
              </mesh>
              {hoveredId === loc.id && (
                <Html position={[0, 0.65, 0]} center distanceFactor={14}>
                  <div className="pointer-events-none px-2.5 py-1 rounded bg-[#071827] border border-[#18C6AD]/60 text-xs text-[#F5FAFC] whitespace-nowrap">
                    {loc.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        {/* Animated Calculated Routes */}
        {routes.map((r) => (
          <ExplorerAnimatedRoute
            key={r.id}
            route={r}
            nodePositions={nodePositions}
            reducedMotion={reducedMotion}
          />
        ))}
      </Canvas>

      {/* Overlay Info */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-[#071827]/90 border border-[#224562] text-[11px] font-semibold text-[#F5FAFC]">
          3D Campus Explorer · Drag to Orbit · Scroll to Zoom
        </span>
      </div>

      {selectedLoc && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 p-3.5 rounded-xl bg-[#071827]/95 border border-[#18C6AD]/60 text-xs text-[#F5FAFC] shadow-xl space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <strong className="text-[#18C6AD]">{selectedLoc.name}</strong>
            <button
              type="button"
              onClick={() => setSelectedLoc(null)}
              className="text-[#9AB0BE] hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-[#9AB0BE]">{selectedLoc.description}</p>
          <p className="text-[11px] text-[#F5FAFC]">
            Step-free entrance: {selectedLoc.isAccessibleEntrance ? 'Yes' : 'No'} · Elevator:{' '}
            {selectedLoc.hasElevator ? 'Yes' : 'No'}
          </p>
        </div>
      )}
    </div>
  );
};
