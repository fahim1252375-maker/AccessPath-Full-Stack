import { describe, expect, it } from 'vitest';
import {
  NAV_DESTINATIONS,
  destinationsForRole,
  findDestinationByPath,
  greetingFor,
  normalizeText,
  scoreItem,
  searchItems,
} from '../src/data/quickNav.ts';

describe('quick navigation search', () => {
  it('has unique ids and unique paths', () => {
    expect(new Set(NAV_DESTINATIONS.map((d) => d.id)).size).toBe(NAV_DESTINATIONS.length);
    expect(new Set(NAV_DESTINATIONS.map((d) => d.to)).size).toBe(NAV_DESTINATIONS.length);
  });

  it('gives every destination a Bengali label', () => {
    for (const d of NAV_DESTINATIONS) expect(d.labelBn.trim().length).toBeGreaterThan(0);
  });

  it('ranks prefix matches above keyword matches', () => {
    const [first] = searchItems(NAV_DESTINATIONS, 'route');
    expect(first.id).toBe('planner');
  });

  it('requires every token to match', () => {
    expect(searchItems(NAV_DESTINATIONS, 'live zzzz')).toHaveLength(0);
    expect(searchItems(NAV_DESTINATIONS, 'live status').map((d) => d.id)).toContain('live-status');
  });

  it('finds pages by Bengali words and Banglish spellings', () => {
    expect(searchItems(NAV_DESTINATIONS, 'ম্যাপ').map((d) => d.id)).toContain('map');
    expect(searchItems(NAV_DESTINATIONS, 'obhijog').map((d) => d.id)).toContain('report-new');
  });

  it('returns everything for an empty query and ignores case and diacritics', () => {
    expect(searchItems(NAV_DESTINATIONS, '   ')).toHaveLength(NAV_DESTINATIONS.length);
    expect(normalizeText('  Café ')).toBe('cafe');
    expect(scoreItem({ label: 'Interactive Map' }, 'MAP')).toBeGreaterThan(0);
  });

  it('hides operations pages from students and shows them to admins', () => {
    const student = destinationsForRole('student').map((d) => d.id);
    expect(student).not.toContain('admin');
    expect(student).not.toContain('audit');
    const campusAdmin = destinationsForRole('campus_admin').map((d) => d.id);
    expect(campusAdmin).toContain('audit');
    expect(campusAdmin).not.toContain('super-admin');
    expect(destinationsForRole('super_admin').map((d) => d.id)).toContain('super-admin');
    expect(destinationsForRole(undefined).map((d) => d.id)).not.toContain('volunteer');
  });

  it('maps pathnames to destinations, including nested paths', () => {
    expect(findDestinationByPath('/app/planner')?.id).toBe('planner');
    expect(findDestinationByPath('/app/planner/')?.id).toBe('planner');
    expect(findDestinationByPath('/app/reports/rep_1')).toBeUndefined();
    expect(findDestinationByPath('/app/admin/reports')?.id).toBe('admin-reports');
    expect(findDestinationByPath('/nowhere')).toBeUndefined();
  });

  it('greets by time of day in both languages', () => {
    expect(greetingFor(new Date(2026, 0, 1, 9), 'en')).toBe('Good morning');
    expect(greetingFor(new Date(2026, 0, 1, 20), 'en')).toBe('Good evening');
    expect(greetingFor(new Date(2026, 0, 1, 9), 'bn')).toBe('শুভ সকাল');
  });
});
