import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useAppStore } from '../../store/useAppStore.ts';
import { detectWebGLCapability, useInViewport } from './webglUtils.ts';
import type { BuildingDTO } from '../../../../shared/types.ts';

interface HeroBuildingSpec {
  id: string;
  name: string;
  code: string;
  position: [number, number, number];
  size: [number, number, number];
  accent: string;
  hasElevator: boolean;
  hasRamp: boolean;
  accessibleEntrance: boolean;
  facilities: string[];
  summary: string;
}

const DEFAULT_HERO_BUILDINGS: HeroBuildingSpec[] = [
  {
    id: 'bldg_lib',
    name: 'Central Library',
    code: 'LIB',
    position: [-4.6, 0, -3.2],
    size: [3.2, 2.5, 2.4],
    accent: '#18C6AD',
    hasElevator: true,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['1:14 Ramp', 'Elevator (4F)', 'Braille Lab', 'Accessible Restroom'],
    summary: 'Step-free west ramp entrance with automatic glass doors and elevator to all 4 floors.',
  },
  {
    id: 'bldg_sci',
    name: 'Science & Engineering Hall',
    code: 'SEH',
    position: [4.8, 0, -3.6],
    size: [3.4, 3.0, 2.5],
    accent: '#32A7D9',
    hasElevator: true,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['Elevator Tower B', 'Skybridge', 'Accessible Labs', 'Tactile Hall'],
    summary: 'Connected via Elevator Tower B and tactile corridor to North Lecture Complex.',
  },
  {
    id: 'bldg_nlc',
    name: 'North Lecture Complex',
    code: 'NLC',
    position: [0.1, 0, -5.8],
    size: [4.0, 2.0, 2.0],
    accent: '#18C6AD',
    hasElevator: true,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['North Plaza Entry', 'Elevator', 'Wheelchair Rows'],
    summary: 'Accessible north plaza entry with elevator-served lecture theaters.',
  },
  {
    id: 'bldg_union',
    name: 'Student Union & Commons',
    code: 'SUC',
    position: [1.6, 0, 1.1],
    size: [2.7, 1.4, 2.1],
    accent: '#32A7D9',
    hasElevator: true,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['Auto Push Door', 'Accessible Restroom', 'Help Desk'],
    summary: 'Level entry from Main Courtyard with wide tactile corridors.',
  },
  {
    id: 'bldg_med',
    name: 'Medical & Support Center',
    code: 'CMS',
    position: [-5.2, 0, 3.4],
    size: [2.5, 1.1, 1.9],
    accent: '#18C6AD',
    hasElevator: false,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['Ground Clinic', 'Wheelchair Loan', 'Curb Cut Bay'],
    summary: 'Single-level clinic with wide curb cut and drop-off bay.',
  },
  {
    id: 'bldg_aud',
    name: 'University Auditorium',
    code: 'AUD',
    position: [-7.2, 0, -0.3],
    size: [2.4, 1.7, 2.6],
    accent: '#32A7D9',
    hasElevator: false,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['Wheelchair Seating', 'Hearing Loop'],
    summary: 'Ground floor wheelchair seating accessible via West Courtyard.',
  },
  {
    id: 'bldg_cafe',
    name: 'Central Cafeteria',
    code: 'CAF',
    position: [5.4, 0, 2.6],
    size: [2.6, 1.1, 2.0],
    accent: '#F59E0B',
    hasElevator: false,
    hasRamp: true,
    accessibleEntrance: true,
    facilities: ['Lowered Counters', 'Construction North Caution'],
    summary: 'Ground-level dining hall; north construction trench requires detour via South Courtyard.',
  },
];

const ROUTE_WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(0.0, 0.11, 6.1),
  new THREE.Vector3(-0.9, 0.11, 3.6),
  new THREE.Vector3(-2.3, 0.14, 1.0),
  new THREE.Vector3(-3.3, 0.18, -1.2),
  new THREE.Vector3(-4.2, 0.22, -2.5),
];

const EnvironmentLighting: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    return () => {
      scene.environment = null;
      envTarget.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <ambientLight intensity={isDark ? 0.45 : 0.7} color={isDark ? '#8AB4D8' : '#E2EEF8'} />
      <directionalLight
        position={[11, 16, 10]}
        intensity={isDark ? 1.55 : 1.7}
        color="#FFF5E6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-10, 7, -9]} intensity={0.55} color="#32A7D9" />
      <hemisphereLight args={[isDark ? '#1B3D5A' : '#CFE4F5', isDark ? '#071827' : '#CBD8E4', 0.45]} />
    </>
  );
};

const CameraParallaxRig: React.FC<{ orbitInteractive: boolean; reducedMotion: boolean }> = ({
  orbitInteractive,
  reducedMotion,
}) => {
  const { camera, pointer } = useThree();
  const basePos = useRef(new THREE.Vector3(0, 10.2, 13.8));
  const targetVec = useRef(new THREE.Vector3(0, 0.4, -0.5));

  useFrame(() => {
    if (orbitInteractive || reducedMotion) return;
    const goalX = basePos.current.x + pointer.x * 0.9;
    const goalY = basePos.current.y + pointer.y * 0.45;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, goalX, 0.045);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, goalY, 0.045);
    camera.lookAt(targetVec.current);
  });

  return null;
};

const InstancedCampusTrees: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);

  const treeCoords = useMemo<Array<[number, number, number]>>(
    () => [
      [-2.2, 0, 5.2],
      [2.4, 0, 5.1],
      [-7.8, 0, 3.9],
      [-7.5, 0, -4.4],
      [-2.1, 0, -4.2],
      [2.6, 0, -4.4],
      [7.8, 0, -2.1],
      [7.4, 0, 4.3],
      [-0.4, 0, 2.2],
      [3.8, 0, -0.2],
      [-3.5, 0, 3.6],
      [0.3, 0, -2.5],
    ],
    []
  );

  useEffect(() => {
    const dummy = new THREE.Object3D();
    treeCoords.forEach(([x, y, z], idx) => {
      const scale = 0.85 + ((idx * 17) % 5) * 0.08;
      dummy.position.set(x, y + 0.35 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(x, y + 0.92 * scale, z);
      dummy.scale.set(scale, scale * 1.1, scale);
      dummy.updateMatrix();
      canopyRef.current?.setMatrixAt(idx, dummy.matrix);
    });
    if (trunkRef.current) {
      trunkRef.current.instanceMatrix.needsUpdate = true;
      trunkRef.current.computeBoundingSphere();
    }
    if (canopyRef.current) {
      canopyRef.current.instanceMatrix.needsUpdate = true;
      canopyRef.current.computeBoundingSphere();
    }
  }, [treeCoords]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, treeCoords.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.11, 0.7, 8]} />
        <meshStandardMaterial color="#5B4436" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, treeCoords.length]} castShadow receiveShadow>
        <coneGeometry args={[0.48, 1.05, 8]} />
        <meshStandardMaterial color={isDark ? '#186E68' : '#1E8A7A'} roughness={0.72} />
      </instancedMesh>
    </group>
  );
};

const AnimatedAccessibleRoute: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pulseRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(ROUTE_WAYPOINTS), []);
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.085, 10, false), [curve]);
  const linePoints = useMemo(
    () => curve.getPoints(48).map((p) => [p.x, p.y + 0.05, p.z] as [number, number, number]),
    [curve]
  );

  const pt = useRef(new THREE.Vector3());
  const trailPt = useRef(new THREE.Vector3());

  useEffect(() => {
    return () => {
      tubeGeo.dispose();
    };
  }, [tubeGeo]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0.55 : (clock.getElapsedTime() * 0.16) % 1;
    curve.getPointAt(t, pt.current);
    pulseRef.current?.position.copy(pt.current);

    const t2 = (t + 0.92) % 1;
    curve.getPointAt(t2, trailPt.current);
    trailRef.current?.position.copy(trailPt.current);
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color="#18C6AD"
          emissive="#18C6AD"
          emissiveIntensity={0.7}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <Line points={linePoints} color="#A7F3D0" lineWidth={1.6} dashed dashSize={0.35} gapSize={0.22} />

      {/* Main Gate Origin Marker */}
      <mesh position={[0, 0.28, 6.1]}>
        <cylinderGeometry args={[0.28, 0.34, 0.12, 24]} />
        <meshStandardMaterial color="#32A7D9" emissive="#32A7D9" emissiveIntensity={0.5} />
      </mesh>

      {/* Moving Accessible Navigation Beacon */}
      <mesh ref={pulseRef} position={[0, 0.25, 6.1]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#F5FAFC" emissive="#18C6AD" emissiveIntensity={1.2} />
      </mesh>
      <mesh ref={trailRef} position={[0, 0.22, 6.1]}>
        <sphereGeometry args={[0.12, 14, 14]} />
        <meshStandardMaterial color="#32A7D9" emissive="#32A7D9" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
};

const CampusBuildingMesh: React.FC<{
  spec: HeroBuildingSpec;
  isDark: boolean;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (spec: HeroBuildingSpec) => void;
}> = ({ spec, isDark, isHovered, isSelected, onHover, onSelect }) => {
  const [w, h, d] = spec.size;
  const active = isHovered || isSelected;
  const wallColor = active
    ? isDark
      ? '#1E4663'
      : '#D8ECFA'
    : isDark
    ? '#132B3D'
    : '#E7F0F7';
  const roofColor = isDark ? '#0D2235' : '#C8DCEB';
  const trimColor = active ? '#18C6AD' : spec.accent;

  return (
    <group
      position={spec.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(spec.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spec);
      }}
    >
      {/* Plinth foundation */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + 0.34, 0.16, d + 0.34]} />
        <meshStandardMaterial color={isDark ? '#1B384F' : '#B9CEDF'} roughness={0.75} />
      </mesh>

      {/* Main building body */}
      <mesh position={[0, h / 2 + 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.48} metalness={0.18} />
      </mesh>

      {/* Architectural upper rim & roof deck */}
      <mesh position={[0, h + 0.22, 0]} castShadow>
        <boxGeometry args={[w + 0.1, 0.12, d + 0.1]} />
        <meshStandardMaterial color={roofColor} roughness={0.4} metalness={0.25} />
      </mesh>

      {/* Accent glowing trim strip */}
      <mesh position={[0, h + 0.29, 0]}>
        <boxGeometry args={[w - 0.15, 0.04, d - 0.15]} />
        <meshStandardMaterial
          color={trimColor}
          emissive={trimColor}
          emissiveIntensity={active ? 1.1 : 0.4}
        />
      </mesh>

      {/* Accessible Canopy Entrance */}
      {spec.accessibleEntrance && (
        <group position={[0, 0.28, d / 2 + 0.28]}>
          <mesh castShadow>
            <boxGeometry args={[1.0, 0.07, 0.55]} />
            <meshStandardMaterial color="#18C6AD" emissive="#18C6AD" emissiveIntensity={0.25} />
          </mesh>
          {/* Side ramp slope */}
          {spec.hasRamp && (
            <mesh position={[0.72, -0.14, 0.05]} rotation={[0, 0, -0.14]} receiveShadow>
              <boxGeometry args={[0.9, 0.08, 0.45]} />
              <meshStandardMaterial color="#32A7D9" roughness={0.6} />
            </mesh>
          )}
        </group>
      )}

      {/* Operational Elevator Tower Core */}
      {spec.hasElevator && (
        <group position={[w / 2 + 0.14, h * 0.58 + 0.16, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.36, h * 1.12, 0.42]} />
            <meshStandardMaterial color={isDark ? '#1A3E57' : '#94B8D4'} metalness={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[0, h * 0.58, 0]}>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshStandardMaterial color="#18C6AD" emissive="#18C6AD" emissiveIntensity={0.95} />
          </mesh>
        </group>
      )}

      {/* Crisp Hover Info Tag */}
      {isHovered && !isSelected && (
        <Html position={[0, h + 0.9, 0]} center distanceFactor={14}>
          <div className="pointer-events-none px-3 py-1.5 rounded-lg border border-[#18C6AD]/60 bg-[#071827] text-[#F5FAFC] shadow-lg whitespace-nowrap text-xs">
            <p className="font-bold text-[#18C6AD]">
              {spec.code} · {spec.name}
            </p>
            <p className="text-[11px] text-[#9AB0BE]">
              {spec.accessibleEntrance ? 'Step-free entrance' : 'Stairs only'} ·{' '}
              {spec.hasElevator ? 'Elevator active' : 'Single/Ground level'}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
};

export interface HeroCampusScene3DProps {
  buildings?: BuildingDTO[];
  onSelectBuilding?: (buildingId: string) => void;
  onNavigateBuilding?: (buildingId: string) => void;
}

export const HeroCampusScene3D: React.FC<HeroCampusScene3DProps> = ({
  buildings,
  onSelectBuilding,
  onNavigateBuilding,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInViewport(containerRef);
  const theme = useAppStore((s) => s.theme);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<HeroBuildingSpec | null>(null);
  const [orbitInteractive, setOrbitInteractive] = useState(false);

  const isDark = theme === 'dark';
  const cap = detectWebGLCapability();

  const mergedSpecs = useMemo(() => {
    if (!buildings || buildings.length === 0) return DEFAULT_HERO_BUILDINGS;
    return DEFAULT_HERO_BUILDINGS.map((spec) => {
      const match = buildings.find((b) => b.id === spec.id);
      if (!match) return spec;
      return {
        ...spec,
        name: match.name,
        code: match.code,
        hasElevator: match.hasElevator,
        accessibleEntrance: match.hasAccessibleEntrance,
        summary: match.accessibilitySummary || spec.summary,
      };
    });
  }, [buildings]);

  const frameloopMode = inView && !reducedMotion && !lowBandwidth ? 'always' : 'demand';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[380px] sm:h-[430px] lg:h-[460px] rounded-2xl border border-[var(--ap-border)] overflow-hidden bg-[#071827] dark:bg-[#071827] shadow-2xl"
      aria-label="Interactive 3D Campus Accessibility Preview"
    >
      <Canvas
        shadows={!cap.isSoftware}
        dpr={cap.isSoftware ? 1 : [1, 1.5]}
        camera={{ position: [0, 10.2, 13.8], fov: 40, near: 0.1, far: 80 }}
        frameloop={frameloopMode}
        gl={{ antialias: !cap.isSoftware, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[isDark ? '#071827' : '#D9E9F7']} />
        <fog attach="fog" args={[isDark ? '#071827' : '#D9E9F7', 16, 36]} />
        <EnvironmentLighting isDark={isDark} />
        <CameraParallaxRig orbitInteractive={orbitInteractive} reducedMotion={reducedMotion} />
        {orbitInteractive && (
          <OrbitControls
            enablePan={false}
            minDistance={7}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2.25}
          />
        )}

        {/* Ground plane + subtle campus grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[42, 42]} />
          <meshStandardMaterial color={isDark ? '#0A2033' : '#C3D7E8'} roughness={0.92} />
        </mesh>
        <gridHelper
          args={[34, 34, isDark ? '#1B3E59' : '#96B5CE', isDark ? '#102A40' : '#B2CBE0']}
          position={[0, 0.0, 0]}
        />

        {/* Campus roads & main walkways */}
        <mesh position={[0, 0.01, 5.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 1.3]} />
          <meshStandardMaterial color={isDark ? '#142E44' : '#99B4CA'} roughness={0.85} />
        </mesh>
        <mesh position={[-2.1, 0.015, 0.8]} rotation={[-Math.PI / 2, 0, 0.35]} receiveShadow>
          <planeGeometry args={[1.0, 11.5]} />
          <meshStandardMaterial color={isDark ? '#1A3E59' : '#AFC7DB'} roughness={0.78} />
        </mesh>
        <mesh position={[2.1, 0.015, -0.4]} rotation={[-Math.PI / 2, 0, -0.25]} receiveShadow>
          <planeGeometry args={[0.9, 9.8]} />
          <meshStandardMaterial color={isDark ? '#1A3E59' : '#AFC7DB'} roughness={0.78} />
        </mesh>

        {/* Central Courtyard Stone Ramp Plaza */}
        <mesh position={[-2.3, 0.06, 1.0]} receiveShadow>
          <cylinderGeometry args={[1.1, 1.25, 0.12, 24]} />
          <meshStandardMaterial color={isDark ? '#184A5E' : '#8EBAD1'} roughness={0.6} />
        </mesh>

        {/* Construction warning cone by Cafeteria north path */}
        <mesh position={[4.5, 0.25, 0.8]} castShadow>
          <coneGeometry args={[0.24, 0.52, 12]} />
          <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.4} />
        </mesh>

        {/* Campus Buildings */}
        {mergedSpecs.map((spec) => (
          <CampusBuildingMesh
            key={spec.id}
            spec={spec}
            isDark={isDark}
            isHovered={hoveredId === spec.id}
            isSelected={selected?.id === spec.id}
            onHover={setHoveredId}
            onSelect={(b) => {
              setSelected(b);
              onSelectBuilding?.(b.id);
            }}
          />
        ))}

        <InstancedCampusTrees isDark={isDark} />
        <AnimatedAccessibleRoute reducedMotion={reducedMotion} />
      </Canvas>

      {/* Top HUD Controls (Clean, Zero Heavy Blur) */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#071827]/90 border border-[#224562] text-xs text-[#F5FAFC]">
          <span className="w-2 h-2 rounded-full bg-[#18C6AD]" aria-hidden="true" />
          <span className="font-semibold">3D Campus View · Demo North</span>
        </div>

        <button
          type="button"
          onClick={() => setOrbitInteractive((v) => !v)}
          className="pointer-events-auto px-3 py-1.5 rounded-lg bg-[#071827]/90 border border-[#224562] text-xs font-semibold text-[#18C6AD] hover:border-[#18C6AD] cursor-pointer"
        >
          {orbitInteractive ? 'Lock Camera Parallax' : 'Drag / Zoom 3D'}
        </button>
      </div>

      {/* Bottom Hint or Selected Building Detail Drawer */}
      {selected ? (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 p-4 rounded-xl bg-[#071827]/95 border border-[#18C6AD]/60 text-[#F5FAFC] shadow-2xl space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-semibold text-[#18C6AD]">
                {selected.code} · SYNTHETIC DEMO
              </span>
              <h3 className="text-sm font-bold">{selected.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close building details"
              className="text-xs px-2 py-1 rounded border border-[#224562] text-[#9AB0BE] hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-[#9AB0BE] leading-relaxed">{selected.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {selected.facilities.map((f) => (
              <span
                key={f}
                className="text-[11px] px-2 py-0.5 rounded bg-[#132B3D] border border-[#224562] text-[#F5FAFC]"
              >
                {f}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigateBuilding?.(selected.id)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#18C6AD] text-[#04211E] text-xs font-bold hover:bg-[#14B29B] cursor-pointer"
            >
              Open Building Page
            </button>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#F5FAFC]">
          <span className="px-2.5 py-1 rounded-md bg-[#071827]/90 border border-[#224562]">
            Active route animation: Main Gate → Central Library (1:14 Ramp)
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#071827]/90 border border-[#224562] text-[#9AB0BE]">
            Hover or click any 3D building to inspect
          </span>
        </div>
      )}
    </div>
  );
};
