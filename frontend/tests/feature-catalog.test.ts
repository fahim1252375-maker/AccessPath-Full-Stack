import { describe, expect, it } from 'vitest';
import {
  FEATURE_CATALOG,
  FEATURE_COUNT,
  MODULE_METADATA,
  MODULE_RANGE,
  getFeatureById,
} from '../src/data/featureCatalog.ts';

const TOTAL_FEATURES = 218;

describe('feature catalog continuity', () => {
  it('contains consecutive, stable feature identifiers while retaining the original 214', () => {
    expect(FEATURE_CATALOG).toHaveLength(TOTAL_FEATURES);
    expect(FEATURE_COUNT).toBe(TOTAL_FEATURES);
    expect(FEATURE_CATALOG.map((feature) => feature.number)).toEqual(
      Array.from({ length: TOTAL_FEATURES }, (_, index) => index + 1)
    );
    expect(new Set(FEATURE_CATALOG.map((feature) => feature.id)).size).toBe(TOTAL_FEATURES);
  });

  it('keeps module metadata and lookups aligned with the registry', () => {
    expect(Object.keys(MODULE_METADATA)).toHaveLength(23);
    expect(MODULE_RANGE).toBe('A–W');
    expect(getFeatureById('F001')?.id).toBe('F001');
    expect(getFeatureById('214')?.id).toBe('F214');
    expect(getFeatureById('F215')?.name).toContain('What-If');
    expect(getFeatureById('F215')?.module).toBe('V');
  });

  it('documents Module W: bilingual directions, resilience analysis and share links', () => {
    const moduleW = FEATURE_CATALOG.filter((feature) => feature.module === 'W');
    expect(moduleW.map((feature) => feature.id)).toEqual(['F216', 'F217', 'F218']);
    expect(getFeatureById('F216')?.name).toContain('Directions');
    expect(getFeatureById('F217')?.name).toContain('Resilience');
    expect(getFeatureById('F218')?.name).toContain('Share');
    expect(MODULE_METADATA.W.name).toBe('Navigation Assistance & Route Resilience');
  });
});
