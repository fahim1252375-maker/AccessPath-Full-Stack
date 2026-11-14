import React from 'react';
import { WebGLSceneWrapper } from './webglUtils.ts';
import type { HeroCampusScene3DProps } from './HeroCampusScene3D.tsx';
import type { CampusExplorerScene3DProps } from './CampusExplorerScene3D.tsx';
import type { IndoorBuildingScene3DProps } from './IndoorBuildingScene3D.tsx';

const LazyHeroCampus = React.lazy(() =>
  import('./HeroCampusScene3D.tsx').then((m) => ({ default: m.HeroCampusScene3D }))
);
const LazyCampusExplorer = React.lazy(() =>
  import('./CampusExplorerScene3D.tsx').then((m) => ({ default: m.CampusExplorerScene3D }))
);
const LazyIndoorBuilding = React.lazy(() =>
  import('./IndoorBuildingScene3D.tsx').then((m) => ({ default: m.IndoorBuildingScene3D }))
);

export const SafeHeroCampusScene3D: React.FC<
  HeroCampusScene3DProps & { fallback: React.ReactNode; forceFallback?: boolean }
> = ({ fallback, forceFallback, ...props }) => (
  <WebGLSceneWrapper fallback={fallback} forceFallback={forceFallback}>
    <LazyHeroCampus {...props} />
  </WebGLSceneWrapper>
);

export const SafeCampusExplorerScene3D: React.FC<
  CampusExplorerScene3DProps & { fallback: React.ReactNode; forceFallback?: boolean }
> = ({ fallback, forceFallback, ...props }) => (
  <WebGLSceneWrapper fallback={fallback} forceFallback={forceFallback}>
    <LazyCampusExplorer {...props} />
  </WebGLSceneWrapper>
);

export const SafeIndoorBuildingScene3D: React.FC<
  IndoorBuildingScene3DProps & { fallback: React.ReactNode; forceFallback?: boolean }
> = ({ fallback, forceFallback, ...props }) => (
  <WebGLSceneWrapper fallback={fallback} forceFallback={forceFallback}>
    <LazyIndoorBuilding {...props} />
  </WebGLSceneWrapper>
);
