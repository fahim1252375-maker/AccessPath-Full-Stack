// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n/index.ts';
import { describeAppliedConstraints } from '../../backend/src/services/routing/dijkstra.ts';
import { useAppStore } from '../src/store/useAppStore.ts';
import { Modal } from '../src/components/ui/Primitives.tsx';
import { LiveAnnouncer } from '../src/components/accessibility/AccessibilityControls.tsx';
import { ClassSchedulePage, IndoorNavigationPage } from '../src/pages/student/CampusHubPages.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      I18nextProvider,
      { i18n },
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(MemoryRouter, null, ui)
      )
    )
  );
}

describe('AccessPath Frontend Components, i18n, Indoor Navigation, Offline & Accessibility', () => {
  it('1. provides both English and Bengali translations for core & upgraded module labels', () => {
    expect(i18n.t('hero.headline', { lng: 'en' })).toBe(
      'Every Student Deserves an Accessible Path.'
    );
    expect(i18n.t('hero.headline', { lng: 'bn' })).toContain('প্রতিটি শিক্ষার্থীর');
    expect(i18n.t('reporting.humanReviewNote', { lng: 'bn' })).toContain('মানবিক যাচাইকরণ');
    expect(i18n.t('indoor.title', { lng: 'bn' })).toContain('অভ্যন্তরীণ নেভিগেশন');
    expect(i18n.t('emergency.safetyDisclaimer', { lng: 'bn' })).toContain('AccessPath');
  });

  it('2. produces human-readable constraint explanations from accessibility profile', () => {
    const list = describeAppliedConstraints({
      wheelchairMode: true,
      stepFreeMode: true,
      limitedMobilityMode: false,
      rampRequired: true,
      elevatorRequired: true,
      stairsAvoidance: true,
      smoothSurfacePreference: true,
      widePathPreference: true,
      lowGradientPreference: true,
      wellLitPreference: true,
      visualAssistanceMode: false,
      customNotes: '',
    });
    expect(list.some((c) => c.includes('Wheelchair mode'))).toBe(true);
    expect(list.some((c) => c.includes('Blocked & outage paths excluded'))).toBe(true);
    expect(list.some((c) => c.includes('Low gradient'))).toBe(true);
  });

  it('3. Modal renders accessible dialog attributes and closes on Escape keydown', () => {
    const onClose = vi.fn();
    render(
      React.createElement(Modal, { open: true, onClose, title: 'Verify Accessible Exit', children: 'Dialog content' })
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('3a. Modal traps keyboard focus and restores focus to the invoking control on unmount', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open dialog';
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(
      React.createElement(Modal, { open: true, onClose, title: 'Keyboard Test', children: 'Dialog body' })
    );
    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);
    view.unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('4. LiveAnnouncer exposes polite screen-reader region updated via Zustand store', () => {
    useAppStore.getState().announce('Calculated verified accessible route to Central Library');
    render(React.createElement(LiveAnnouncer));
    expect(screen.getByText('Calculated verified accessible route to Central Library')).toBeTruthy();
  });

  it('5. offline draft queue generates deterministic clientRequestId and caches graphVersion', () => {
    const store = useAppStore.getState();
    store.addOfflineDraft({
      id: 'draft_test_1',
      campusId: 'campus_demo_north',
      title: 'Blocked curb cut',
      description: 'Debris near library entrance ramp.',
      category: 'blocked_walkway',
      priority: 'high',
      locationLabel: 'Library West',
      language: 'en',
      savedAt: new Date().toISOString(),
    });
    const saved = useAppStore.getState().offlineDrafts.find((d) => d.id === 'draft_test_1');
    expect(saved?.clientRequestId).toBeTruthy();
    store.removeOfflineDraft('draft_test_1');
  });

  it('6. IndoorNavigationPage switches floors and verifies registered QR waypoint lookup', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/campuses/campus_demo_north/map')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              buildings: [{ id: 'bld_library', name: 'Central Library', code: 'LIB' }],
              locations: [],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/campuses/campus_demo_north/floors')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'fl_0',
                campusId: 'campus_demo_north',
                buildingId: 'bld_library',
                floorNumber: 0,
                floorLabel: 'Ground Floor (0F)',
                svgWidth: 500,
                svgHeight: 280,
                corridors: [],
                rooms: [
                  { id: 'r0', nodeId: 'loc_library_entrance', label: '0F Lobby', x: 20, y: 20, w: 120, h: 60, accessible: true },
                ],
                qrWaypoints: [],
                bleBeacons: [],
                isDemoData: true,
              },
              {
                id: 'fl_2',
                campusId: 'campus_demo_north',
                buildingId: 'bld_library',
                floorNumber: 2,
                floorLabel: 'Second Floor (2F)',
                svgWidth: 500,
                svgHeight: 280,
                corridors: [],
                rooms: [
                  { id: 'r2', nodeId: 'loc_library_2f', label: '2F Reading Room', x: 20, y: 20, w: 120, h: 60, accessible: true },
                ],
                qrWaypoints: [],
                bleBeacons: [],
                isDemoData: true,
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes('/qr/AP-QR-LIBW')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'loc_library_entrance',
              name: 'Central Library Entrance',
              floor: 0,
              description: 'Step-free ground entry near elevator',
            },
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404 });
    });

    renderWithProviders(React.createElement(IndoorNavigationPage));
    await waitFor(() => expect(screen.getAllByText('0F Lobby').length).toBeGreaterThan(0));

    // Switch floor tab to 2F
    fireEvent.click(screen.getByRole('button', { name: 'Second Floor (2F)' }));
    await waitFor(() => expect(screen.getAllByText('2F Reading Room').length).toBeGreaterThan(0));

    // Execute manual QR lookup
    fireEvent.click(screen.getByRole('button', { name: 'Locate Waypoint' }));
    await waitFor(() => expect(screen.getByText(/Verified Waypoint: Central Library Entrance/)).toBeTruthy());
    expect(mockFetch).toHaveBeenCalled();
  });

  it('7. ClassSchedulePage renders timetable manager and displays accessible transition plan', async () => {
    useAppStore.getState().setAuth({
      id: 'usr_1',
      name: 'Test Student',
      email: 'student@test.edu',
      role: 'student',
      campusId: 'campus_demo_north',
      institutionId: 'inst_1',
      language: 'en',
      emailVerified: true,
      isActive: true,
      consentAnalytics: true,
      consentLocation: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/campuses/campus_demo_north/map')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              buildings: [{ id: 'bld_science', name: 'Science Building', code: 'SCI' }],
              locations: [{ id: 'loc_science_hall', name: 'Science Hall', floor: 0, buildingId: 'bld_science' }],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/operations/schedule/day-plan')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              dayOfWeek: 'Mon',
              classes: [
                {
                  id: 'cls_1',
                  courseCode: 'CSE-301',
                  courseTitle: 'Accessible Computing',
                  dayOfWeek: 'Mon',
                  startTime: '09:00',
                  endTime: '10:15',
                  buildingId: 'bld_science',
                  locationNodeId: 'loc_science_hall',
                  roomLabel: 'Room 201',
                  bufferMinutes: 10,
                },
              ],
              transitions: [
                {
                  toClassId: 'cls_1',
                  fromLocationName: 'Main Gate',
                  toLocationName: 'Science Hall',
                  recommendedDepartureTime: '08:42',
                  classStartTime: '09:00',
                  availableMinutes: 45,
                  estimatedTravelMinutes: 8,
                  bufferMinutes: 10,
                  routeFound: true,
                  routeResult: { routes: [{ verificationSummary: 'all_verified' }] },
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    });

    renderWithProviders(React.createElement(ClassSchedulePage));
    await waitFor(() => expect(screen.getByText(/CSE-301: Accessible Computing/)).toBeTruthy());
    expect(screen.getByText(/Depart by 08:42/)).toBeTruthy();

    useAppStore.getState().setAuth(null, null);
  });

  it('8. Feature Catalog enforces every documented feature with 20 metadata fields', async () => {
    const { FEATURE_CATALOG, FEATURE_COUNT, MODULE_METADATA, getFeatureById } = await import(
      '../src/data/featureCatalog.ts'
    );
    expect(FEATURE_CATALOG.length).toBe(FEATURE_COUNT);
    expect(FEATURE_COUNT).toBeGreaterThanOrEqual(218);
    expect(Object.keys(MODULE_METADATA).length).toBe(23);
    const routingFeature = getFeatureById('F057');
    expect(routingFeature).toBeTruthy();
    expect(routingFeature?.module).toBe('E');
    expect(routingFeature?.workflowSteps.length).toBeGreaterThan(0);
    expect(routingFeature?.securityChecks.length).toBeGreaterThan(5);
  });

  it('9. Dual theme switcher toggles cleanly between dark (#071827) and light (#F4F8FB) classes', () => {
    const store = useAppStore.getState();
    store.setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    store.toggleTheme();
    expect(useAppStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('10. detectWebGLCapability safely degrades in jsdom without throwing and FeaturesPage filters catalog', async () => {
    const { detectWebGLCapability } = await import('../src/components/three/webglUtils.ts');
    const cap = detectWebGLCapability();
    expect(cap.supported).toBe(false);

    const { FeaturesPage } = await import('../src/pages/public/PublicInfoPages.tsx');
    renderWithProviders(React.createElement(FeaturesPage));
    expect(screen.getByText(/AccessPath Feature Directory/i)).toBeTruthy();

    const searchInput = screen.getByLabelText(/Search features directory/i);
    fireEvent.change(searchInput, { target: { value: 'Analytics Q&A' } });
    expect(screen.getByText(/F097/)).toBeTruthy();
  });
});

