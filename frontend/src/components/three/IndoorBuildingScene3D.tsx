import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore.ts';
import { detectWebGLCapability, useInViewport } from './webglUtils.ts';
import type { FloorPlanDTO, LiveFacilityStatusDTO } from '../../../../shared/types.ts';

interface FloorLayerProps {
  plan: FloorPlanDTO;
  index: number;
  selectedFloorNumber: number;
  elevatorOperational: boolean | null; // null if unknown/not verified operational
  isDark: boolean;
  onSelectFloor: (floorNumber: number) => void;
  onSelectRoom?: (nodeId: string) => void;
}

const FloorLayerGroup: React.FC<FloorLayerProps> = ({
  plan,
  index,
  selectedFloorNumber,
  elevatorOperational,
  isDark,
  onSelectFloor,
  onSelectRoom,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const isSelected = plan.floorNumber === selectedFloorNumber;
  const targetY = index * 2.1 + (plan.floorNumber > selectedFloorNumber ? 0.55 : 0);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.12);
  });

  const scaleX = 9.0 / Math.max(1, plan.svgWidth);
  const scaleZ = 4.8 / Math.max(1, plan.svgHeight);
  const mapCoord = (x: number, y: number): [number, number] => [
    (x - plan.svgWidth / 2) * scaleX,
    (y - plan.svgHeight / 2) * scaleZ,
  ];

  return (
    <group ref={groupRef} position={[0, targetY, 0]}>
      {/* Floor slab */}
      <mesh
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelectFloor(plan.floorNumber);
        }}
      >
        <boxGeometry args={[9.4, 0.14, 5.2]} />
        <meshStandardMaterial
          color={isSelected ? (isDark ? '#153953' : '#D9ECF9') : isDark ? '#0D2235' : '#C8DCEB'}
          transparent
          opacity={isSelected ? 0.96 : 0.58}
          roughness={0.55}
        />
      </mesh>

      {/* Floor border accent */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[9.42, 0.03, 5.22]} />
        <meshStandardMaterial
          color={isSelected ? '#18C6AD' : '#32A7D9'}
          emissive={isSelected ? '#18C6AD' : '#32A7D9'}
          emissiveIntensity={isSelected ? 0.55 : 0.12}
          wireframe
        />
      </mesh>

      {/* Accessible Corridors */}
      {plan.corridors.map((cor) => {
        const pts = cor.points.map(([cx, cy]) => {
          const [mx, mz] = mapCoord(cx, cy);
          return [mx, 0.12, mz] as [number, number, number];
        });
        return (
          <Line
            key={cor.id}
            points={pts}
            color={cor.accessible ? '#18C6AD' : '#F59E0B'}
            lineWidth={isSelected ? 4 : 2}
            dashed={!cor.accessible}
            dashSize={0.35}
            gapSize={0.2}
          />
        );
      })}

      {/* Rooms & Elevator Landings */}
      {plan.rooms.map((room) => {
        const [rx, rz] = mapCoord(room.x + room.w / 2, room.y + room.h / 2);
        const rw = Math.max(0.5, room.w * scaleX);
        const rd = Math.max(0.5, room.h * scaleZ);
        const isElevatorRoom = room.label.toLowerCase().includes('elevator');
        const roomColor = isElevatorRoom
          ? elevatorOperational === true
            ? '#18C6AD'
            : '#EF4444'
          : room.accessible
          ? isDark
            ? '#1E4C6C'
            : '#93C5E3'
          : '#D97706';

        return (
          <group key={room.id} position={[rx, 0.32, rz]}>
            <mesh
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onSelectFloor(plan.floorNumber);
                onSelectRoom?.(room.nodeId);
              }}
            >
              <boxGeometry args={[rw, 0.45, rd]} />
              <meshStandardMaterial
                color={roomColor}
                opacity={isSelected ? 0.92 : 0.45}
                transparent
                roughness={0.4}
              />
            </mesh>
            {isSelected && (
              <Html position={[0, 0.45, 0]} center distanceFactor={12}>
                <div className="pointer-events-none px-2 py-0.5 rounded bg-[#071827]/95 border border-[#224562] text-[10px] font-semibold text-[#F5FAFC] whitespace-nowrap">
                  {room.label}
                  {isElevatorRoom && elevatorOperational !== true && ' (Unavailable)'}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* QR Waypoints */}
      {plan.qrWaypoints.map((qr) => {
        const [qx, qz] = mapCoord(qr.x, qr.y);
        return (
          <mesh key={qr.code} position={[qx, 0.22, qz]}>
            <cylinderGeometry args={[0.12, 0.14, 0.25, 12]} />
            <meshStandardMaterial color="#32A7D9" emissive="#32A7D9" emissiveIntensity={0.65} />
          </mesh>
        );
      })}

      <Html position={[-5.1, 0.25, 0]} center distanceFactor={14}>
        <button
          type="button"
          onClick={() => onSelectFloor(plan.floorNumber)}
          className={`px-2 py-1 rounded text-[11px] font-bold border whitespace-nowrap cursor-pointer ${
            isSelected
              ? 'bg-[#18C6AD] text-[#04211E] border-[#18C6AD]'
              : 'bg-[#071827]/90 text-[#F5FAFC] border-[#224562]'
          }`}
        >
          {plan.floorLabel}
        </button>
      </Html>
    </group>
  );
};

export interface IndoorBuildingScene3DProps {
  floorPlans: FloorPlanDTO[];
  selectedFloorNumber: number;
  liveFacilities: LiveFacilityStatusDTO[];
  buildingId: string;
  onSelectFloor: (floorNumber: number) => void;
  onSelectRoomNode?: (nodeId: string) => void;
}

export const IndoorBuildingScene3D: React.FC<IndoorBuildingScene3DProps> = ({
  floorPlans,
  selectedFloorNumber,
  liveFacilities,
  buildingId,
  onSelectFloor,
  onSelectRoomNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(containerRef);
  const theme = useAppStore((s) => s.theme);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  const isDark = theme === 'dark';
  const cap = detectWebGLCapability();

  const sortedPlans = useMemo(
    () => [...floorPlans].sort((a, b) => a.floorNumber - b.floorNumber),
    [floorPlans]
  );

  // Strict honesty: Elevator is ONLY shown operational if liveFacilities explicitly confirms 'operational'
  const elevatorFacility = useMemo(
    () =>
      liveFacilities.find(
        (f) => f.buildingId === buildingId && f.facilityType === 'elevator'
      ),
    [liveFacilities, buildingId]
  );
  const elevatorOperational = elevatorFacility
    ? elevatorFacility.status === 'operational'
    : null;

  const frameloopMode = inView && !reducedMotion && !lowBandwidth ? 'always' : 'demand';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[380px] sm:h-[420px] rounded-xl border border-[var(--ap-border)] overflow-hidden bg-[#071827]"
      aria-label="Interactive Multi-Floor 3D Indoor Navigation View"
    >
      <Canvas
        shadows={!cap.isSoftware}
        dpr={cap.isSoftware ? 1 : [1, 1.5]}
        camera={{ position: [0, 5.2, 10.2], fov: 42 }}
        frameloop={frameloopMode}
      >
        <color attach="background" args={[isDark ? '#071827' : '#DAEAF8']} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[8, 12, 8]} intensity={1.35} castShadow />
        <OrbitControls minDistance={5} maxDistance={18} maxPolarAngle={Math.PI / 2.1} />

        {/* Vertical Elevator Core Shaft spanning floors */}
        <mesh position={[0, sortedPlans.length * 1.0, -1.3]}>
          <boxGeometry args={[0.7, Math.max(2, sortedPlans.length * 2.2), 0.7]} />
          <meshStandardMaterial
            color={elevatorOperational === true ? '#18C6AD' : '#EF4444'}
            transparent
            opacity={0.35}
            emissive={elevatorOperational === true ? '#18C6AD' : '#EF4444'}
            emissiveIntensity={0.35}
          />
        </mesh>

        {sortedPlans.map((plan, idx) => (
          <FloorLayerGroup
            key={plan.id}
            plan={plan}
            index={idx}
            selectedFloorNumber={selectedFloorNumber}
            elevatorOperational={elevatorOperational}
            isDark={isDark}
            onSelectFloor={onSelectFloor}
            onSelectRoom={onSelectRoomNode}
          />
        ))}
      </Canvas>

      <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="px-2.5 py-1 rounded-md bg-[#071827]/90 border border-[#224562] font-semibold text-[#F5FAFC]">
          Multi-Floor 3D Schematic · Click floor label to switch
        </span>
        <span
          className={`px-2.5 py-1 rounded-md border font-semibold ${
            elevatorOperational === true
              ? 'bg-[#071827]/90 border-[#18C6AD] text-[#18C6AD]'
              : 'bg-[#450A0A]/95 border-[#EF4444] text-[#FCA5A5]'
          }`}
        >
          {elevatorFacility
            ? `Elevator: ${elevatorFacility.status.toUpperCase()} (${elevatorFacility.name})`
            : 'Elevator status not verified operational'}
        </span>
      </div>
    </div>
  );
};
