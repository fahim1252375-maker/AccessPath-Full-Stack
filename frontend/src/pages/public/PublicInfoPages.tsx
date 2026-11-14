import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Compass,
  Map as MapIcon,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { CampusMap } from '../../components/maps/CampusMap.tsx';
import { SafeCampusExplorerScene3D } from '../../components/three/LazyCampusScenes.tsx';
import { AccessibilityQuickControls } from '../../components/accessibility/AccessibilityControls.tsx';
import {
  FEATURE_CATALOG,
  FEATURE_COUNT,
  MODULE_METADATA,
  MODULE_RANGE,
  getFeatureById,
} from '../../data/featureCatalog.ts';
import {
  Button,
  Card,
  FormField,
  HelpButton,
  Input,
  SkeletonRows,
  StatusLabel,
  Textarea,
} from '../../components/ui/Primitives.tsx';
import type {
  BuildingDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  RouteCalculationResultDTO,
} from '../../../../shared/types.ts';

export const ExploreDemoPage: React.FC = () => {
  const [fromId, setFromId] = useState('loc_main_gate');
  const [toId, setToId] = useState('loc_library_entrance');
  const [wheelchairMode, setWheelchairMode] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [routeResult, setRouteResult] = useState<RouteCalculationResultDTO | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['explore-demo-campus'],
    queryFn: () =>
      api.get<{
        campus: CampusDTO;
        buildings: BuildingDTO[];
        locations: LocationNodeDTO[];
        edges: PathEdgeDTO[];
        liveFacilities?: LiveFacilityStatusDTO[];
      }>('/campuses/campus_demo_north/map'),
  });

  const handlePreviewRoute = async () => {
    const res = await api.post<RouteCalculationResultDTO>('/routes/calculate', {
      campusId: 'campus_demo_north',
      fromNodeId: fromId,
      toNodeId: toId,
      preferences: {
        wheelchairMode,
        stepFreeMode: true,
        stairsAvoidance: true,
      },
    });
    setRouteResult(res);
  };

  const filteredLocations = (data?.locations || []).filter(
    (l) =>
      !search.trim() ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.facilities.some((f) => f.toLowerCase().includes(search.toLowerCase()))
  );

  const leaflet2DFallback = data ? (
    <CampusMap
      centerLat={data.campus.centerLat}
      centerLng={data.campus.centerLng}
      zoom={data.campus.defaultZoom}
      locations={data.locations}
      edges={data.edges}
      routes={routeResult?.routes || []}
      selectedOriginId={fromId}
      selectedDestinationId={toId}
      heightClass="h-[560px]"
    />
  ) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#18C6AD]">DEMO CAMPUS — SYNTHETIC DATA</p>
          <h1 className="text-3xl font-bold text-[var(--ap-text)] mt-1">
            Explore Demo North Courtyard Campus
          </h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1 max-w-2xl">
            Switch between interactive 3D Campus Explorer and 2D Leaflet GIS Map, test constraint-filtered routing live, and inspect barriers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-[#18C6AD] text-[#04211E]'
                  : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Explorer</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-[#18C6AD] text-[#04211E]'
                  : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>2D Map</span>
            </button>
          </div>
          <HelpButton featureId="F043" />
          <Link to="/app/planner">
            <Button variant="secondary">Open Full Route Planner</Button>
          </Link>
        </div>
      </div>

      {isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-4">
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-[var(--ap-text)]">Quick Route Test</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="explore-from" className="block text-xs font-semibold text-[var(--ap-muted)] mb-1">
                    Origin
                  </label>
                  <select
                    id="explore-from"
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full min-h-[40px] px-3 text-sm border border-[var(--ap-border)] rounded-lg bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
                  >
                    {data.locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="explore-to" className="block text-xs font-semibold text-[var(--ap-muted)] mb-1">
                    Destination
                  </label>
                  <select
                    id="explore-to"
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full min-h-[40px] px-3 text-sm border border-[var(--ap-border)] rounded-lg bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
                  >
                    {data.locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--ap-text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wheelchairMode}
                    onChange={(e) => setWheelchairMode(e.target.checked)}
                    className="w-4 h-4 accent-[#18C6AD]"
                  />
                  <span>Wheelchair &amp; Step-Free Mode</span>
                </label>
                <Button className="w-full" onClick={handlePreviewRoute}>
                  <Compass className="w-4 h-4" />
                  <span>Calculate Verified Route</span>
                </Button>
              </div>

              {routeResult && (
                <div className="pt-4 border-t border-[var(--ap-border)] space-y-2 text-sm">
                  {routeResult.found ? (
                    <>
                      <p className="font-bold text-[#18C6AD] font-mono tabular-nums">
                        {routeResult.routes[0].totalDistanceMeters}m · ~{routeResult.routes[0].estimatedMinutes} min (Estimate)
                      </p>
                      <ul className="space-y-1 text-xs text-[var(--ap-muted)]">
                        {routeResult.routes[0].steps.map((s) => (
                          <li key={s.edgeId}>{s.instruction}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="p-3 rounded-lg bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-xs text-[var(--ap-danger)]">
                      <strong>No Verified Accessible Route:</strong> {routeResult.message}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--ap-muted)]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter places or facilities..."
                  className="pl-9"
                  aria-label="Filter campus locations"
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[var(--ap-border)]">
                {filteredLocations.map((loc) => (
                  <div key={loc.id} className="py-2.5 text-xs space-y-1">
                    <p className="font-bold text-[var(--ap-text)]">{loc.name}</p>
                    <p className="text-[var(--ap-muted)]">
                      {loc.type} · {loc.isAccessibleEntrance ? 'Step-free' : 'Check access'} ·{' '}
                      {loc.facilities.slice(0, 2).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <SafeCampusExplorerScene3D
              centerLat={data.campus.centerLat}
              centerLng={data.campus.centerLng}
              buildings={data.buildings}
              locations={data.locations}
              edges={data.edges}
              liveFacilities={data.liveFacilities}
              routes={routeResult?.routes || []}
              selectedOriginId={fromId}
              selectedDestinationId={toId}
              heightClass="h-[560px]"
              forceFallback={viewMode === '2d'}
              fallback={leaflet2DFallback}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const AboutPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#18C6AD]">Our Mission</p>
      <h1 className="text-3xl font-bold text-[var(--ap-text)]">About AccessPath</h1>
      <p className="text-base text-[var(--ap-muted)] leading-relaxed">
        AccessPath is an Accessible Campus Navigation &amp; AI-Powered Barrier Reporting System designed to help students, visitors, volunteers, and campus facilities teams collaborate around trustworthy accessibility information.
      </p>
    </div>
    <div className="grid sm:grid-cols-2 gap-6">
      <Card>
        <h2 className="text-lg font-bold text-[var(--ap-text)]">Truthful Accessibility Data</h2>
        <p className="text-sm text-[var(--ap-muted)] mt-2 leading-relaxed">
          Unverified paths and AI classifications are never treated as verified ground truth. Only human-verified segments with current operational status are recommended for strict mobility needs.
        </p>
      </Card>
      <Card>
        <h2 className="text-lg font-bold text-[var(--ap-text)]">Collaborative Maintenance Loop</h2>
        <p className="text-sm text-[var(--ap-muted)] mt-2 leading-relaxed">
          Every student barrier report flows through structured AI triage, volunteer verification, moderator review, and institutional maintenance tracking with complete audit logs.
        </p>
      </Card>
    </div>
  </div>
);

export const HowItWorksPage: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
    <h1 className="text-3xl font-bold text-[var(--ap-text)]">How AccessPath Works</h1>
    <div className="grid md:grid-cols-2 gap-6">
      {[
        {
          step: '01. Campus Weighted Graph',
          desc: 'Entrances, buildings, classrooms, ramps, and elevators are modelled as graph nodes connected by edges carrying distance, width, slope, surface, lighting, and verification timestamps.',
        },
        {
          step: '02. Hard Constraint Filtering',
          desc: 'Before calculating shortest paths, Dijkstra filtering removes stairs, narrow paths, blocked corridors, and unverified ramps according to your profile.',
        },
        {
          step: '03. Bilingual AI Triage',
          desc: 'Students report barriers in English or বাংলা via text, voice, or photo. Server-side Gemini AI extracts structured category, location, and priority without modifying authoritative map data.',
        },
        {
          step: '04. Human Verification & Repair',
          desc: 'Volunteers upload confirmation photos, moderators manage duplicates/disputes, and campus admins update path status and assign maintenance crews.',
        },
      ].map((item) => (
        <Card key={item.step}>
          <h2 className="text-lg font-bold text-[#18C6AD]">{item.step}</h2>
          <p className="text-sm text-[var(--ap-muted)] mt-2 leading-relaxed">{item.desc}</p>
        </Card>
      ))}
    </div>
  </div>
);

export const FeaturesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  const moduleEntries = useMemo(() => Object.entries(MODULE_METADATA), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FEATURE_CATALOG.filter((f) => {
      if (selectedModule !== 'ALL' && f.module !== selectedModule) return false;
      if (!q) return true;
      return (
        f.id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.purpose.toLowerCase().includes(q) ||
        f.moduleName.toLowerCase().includes(q)
      );
    });
  }, [query, selectedModule]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-mono font-bold text-[#18C6AD]">
            COMPLETE SPECIFICATION DIRECTORY · {FEATURE_CATALOG.length} FEATURES
          </p>
          <h1 className="text-3xl font-bold text-[var(--ap-text)]">
            AccessPath Feature Directory (F001 – F{String(FEATURE_COUNT).padStart(3, '0')})
          </h1>
          <p className="text-sm text-[var(--ap-muted)] max-w-2xl">
            Browse all {FEATURE_COUNT} capabilities across {moduleEntries.length} architectural modules ({MODULE_RANGE}). Click any feature card to inspect all 20 documentation, workflow, safety, and test verification specifications.
          </p>
        </div>
        <Link to="/explore">
          <Button variant="primary">Launch 3D Demo Explorer</Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <Card padding="sm" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--ap-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${FEATURE_COUNT} features by ID, name, or capability...`}
            className="pl-9"
            aria-label="Search features directory"
          />
        </div>
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          aria-label="Filter by module"
          className="min-h-[42px] px-3 text-sm rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface-2)] text-[var(--ap-text)]"
        >
          <option value="ALL">All {moduleEntries.length} Modules ({FEATURE_CATALOG.length})</option>
          {moduleEntries.map(([code, meta]) => (
            <option key={code} value={code}>
              Module {code}: {meta.name}
            </option>
          ))}
        </select>
      </Card>

      <p className="text-xs text-[var(--ap-muted)] font-mono">
        Showing {filtered.length} of {FEATURE_CATALOG.length} features
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f) => (
          <Link key={f.id} to={`/features/${f.id}`} className="group">
            <Card className="h-full flex flex-col justify-between space-y-3 group-hover:border-[#18C6AD]/60 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-[#32A7D9]">
                    {f.id} · Module {f.module}
                  </span>
                  <StatusLabel
                    status={f.actualStatus === 'Implemented and tested' ? 'verified' : 'simulated'}
                  />
                </div>
                <h2 className="text-sm font-bold text-[var(--ap-text)] group-hover:text-[#18C6AD]">
                  {f.name}
                </h2>
                <p className="text-xs text-[var(--ap-muted)] leading-relaxed">
                  {f.purpose}
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--ap-border)] flex items-center justify-between text-xs font-semibold text-[#18C6AD]">
                <span className="truncate">{f.targetUser}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const FeatureDetailsPage: React.FC = () => {
  const { featureId } = useParams<{ featureId: string }>();
  const feature = getFeatureById(featureId || '');

  if (!feature) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[var(--ap-text)]">Feature Specification Not Found</h1>
        <p className="text-sm text-[var(--ap-muted)]">
          Choose a valid feature ID between F001 and F{String(FEATURE_COUNT).padStart(3, '0')} in the Feature Directory.
        </p>
        <Link to="/features">
          <Button>Back to Feature Directory</Button>
        </Link>
      </div>
    );
  }

  const prevNum = feature.number > 1 ? `F${String(feature.number - 1).padStart(3, '0')}` : null;
  const nextNum = feature.number < FEATURE_COUNT ? `F${String(feature.number + 1).padStart(3, '0')}` : null;
  const primaryRoute = feature.frontendRoute.split(',')[0].trim();
  const linkTarget = primaryRoute.startsWith('/') ? primaryRoute.replace(':id', 'campus_demo_north') : '/app';

  const specRows: Array<[string, string]> = [
    ['1. Feature Name & ID', `${feature.id} (#${feature.number}) — ${feature.name}`],
    ['2. Module Classification', `Module ${feature.module}: ${feature.moduleName}`],
    ['3. Purpose', feature.purpose],
    ['4. Detailed Explanation', feature.detailedExplanation],
    ['5. Target Users', feature.targetUser],
    ['6. Permissions & Role Access', feature.permissions],
    ['7. Frontend Route(s)', feature.frontendRoute],
    ['8. Backend Endpoint(s)', feature.backendEndpoint],
    ['9. Database Entities / Models', feature.databaseEntities.join(', ')],
    ['10. Step-by-Step Workflow', feature.workflowSteps.map((s, i) => `${i + 1}. ${s}`).join(' | ')],
    ['11. Validated Inputs', feature.inputs],
    ['12. Validation Rules', feature.validationRules],
    ['13. Expected Outputs', feature.expectedOutputs],
    ['14. Error States & Recovery', feature.errorStates],
    ['15. Loading & Empty States', feature.loadingAndEmptyStates],
    ['16. Security & Tenant Checks', feature.securityChecks],
    ['17. AI & Algorithm Involvement', feature.aiInvolvement],
    ['18. Hardware / External Dependency', feature.hardwareOrIntegrationDependency],
    ['19. Implementation Status', feature.actualStatus],
    ['20. Test Verification & Boundaries', `${feature.testCoverage}${feature.limitations ? ` — Boundary: ${feature.limitations}` : ''}`],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/features"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#18C6AD] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {FEATURE_COUNT} Feature Directory</span>
        </Link>
        <div className="flex items-center gap-2">
          {prevNum && (
            <Link to={`/features/${prevNum}`}>
              <Button variant="outline" size="sm">← {prevNum}</Button>
            </Link>
          )}
          {nextNum && (
            <Link to={`/features/${nextNum}`}>
              <Button variant="outline" size="sm">{nextNum} →</Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ap-border)] pb-4">
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-[#32A7D9]">
              {feature.id} · Module {feature.module}: {feature.moduleName}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">{feature.name}</h1>
            <p className="text-sm text-[var(--ap-muted)]">{feature.purpose}</p>
          </div>
          <StatusLabel
            status={feature.actualStatus === 'Implemented and tested' ? 'verified' : 'simulated'}
            size="md"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {specRows.map(([label, value]) => (
            <div
              key={label}
              className="p-3.5 rounded-xl bg-[var(--ap-surface-2)] border border-[var(--ap-border)] space-y-1"
            >
              <p className="text-xs font-mono font-bold text-[#18C6AD]">{label}</p>
              <p className="text-xs sm:text-sm text-[var(--ap-text)] leading-relaxed">{value}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ap-border)]">
          <span className="text-xs text-[var(--ap-muted)] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#18C6AD]" />
            Verified against live codebase registry (FEATURE_REGISTRY.md #{feature.number})
          </span>
          <Link to={linkTarget}>
            <Button size="sm">Open Feature Screen</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export const AccessibilityStatementPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
    <h1 className="text-3xl font-bold text-[var(--ap-text)]">Accessibility &amp; WCAG Guidance</h1>
    <p className="text-sm sm:text-base text-[var(--ap-muted)] leading-relaxed">
      AccessPath is engineered using WCAG 2.2 AA principles: semantic landmarks, keyboard-reachable controls, visible focus indicators, screen-reader live regions, bilingual EN/বাংলা support, high-contrast dual dark/light themes, scalable typography, and reduced-motion safeguards. Note: AccessPath does not claim formal third-party accessibility certification.
    </p>
    <Card className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--ap-text)]">Adjust Interface Accessibility Right Now</h2>
      <AccessibilityQuickControls />
    </Card>
  </div>
);

export const HelpCenterPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
    <h1 className="text-3xl font-bold text-[var(--ap-text)]">Help Center</h1>
    <div className="space-y-4">
      {[
        ['Using Smart Route Planner & 3D View', 'Choose an origin and destination node, review your active accessibility profile, toggle 3D Route View or 2D Leaflet Map, and inspect warnings and alternative paths.'],
        ['Reporting a Barrier in English or বাংলা', 'Open Report Barrier, follow the guided steps, attach a PNG/JPEG/WEBP photo if available, review missing-info prompts, and let AI suggest structured triage fields before submitting.'],
        ['Offline Mode & Cached Graphs', 'AccessPath caches the most recently viewed campus graph in browser storage and stores offline report drafts until connectivity returns.'],
      ].map(([title, body]) => (
        <Card key={title}>
          <h2 className="text-base font-bold text-[var(--ap-text)]">{title}</h2>
          <p className="text-sm text-[var(--ap-muted)] mt-1.5">{body}</p>
        </Card>
      ))}
    </div>
  </div>
);

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes('@') || message.trim().length < 10) return;
    setSent(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-[var(--ap-text)]">Contact AccessPath Team</h1>
      {sent ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-[#18C6AD] font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Inquiry Recorded</span>
          </div>
          <p className="text-sm text-[var(--ap-muted)]">
            Thank you, {name}. Your message has been validated and recorded locally for campus onboarding follow-up.
          </p>
          <Button variant="outline" onClick={() => { setSent(false); setMessage(''); }}>
            Send Another Message
          </Button>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full Name" htmlFor="contact-name" required>
              <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </FormField>
            <FormField label="Institutional Email" htmlFor="contact-email" required>
              <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormField>
            <FormField label="Message" htmlFor="contact-msg" hint="Minimum 10 characters" required>
              <Textarea id="contact-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} />
            </FormField>
            <Button type="submit">Submit Inquiry</Button>
          </form>
        </Card>
      )}
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-4">
    <h1 className="text-3xl font-bold text-[var(--ap-text)]">Privacy Policy</h1>
    <Card className="space-y-3 text-sm text-[var(--ap-muted)] leading-relaxed">
      <p><strong className="text-[var(--ap-text)]">Data Minimization:</strong> AccessPath never requires medical diagnoses. Only functional accessibility routing preferences are stored.</p>
      <p><strong className="text-[var(--ap-text)]">Reporter Anonymity:</strong> Public community reports replace reporter identities with anonymized community aliases.</p>
      <p><strong className="text-[var(--ap-text)]">Location Consent:</strong> Browser geolocation is requested only when explicitly triggered by the user.</p>
      <p><strong className="text-[var(--ap-text)]">AI Safeguards:</strong> Server-side AI calls strip personal emails, tokens, and sensitive user fields from prompts.</p>
    </Card>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-4">
    <h1 className="text-3xl font-bold text-[var(--ap-text)]">Terms of Service</h1>
    <Card className="space-y-3 text-sm text-[var(--ap-muted)] leading-relaxed">
      <p>AccessPath provides campus accessibility guidance using verified records and community reports. Users should exercise personal judgment around active construction or changing weather conditions.</p>
      <p>Emergency evacuation routes shown in demo environments are synthetic unless explicitly approved by an institution&apos;s safety administration.</p>
    </Card>
  </div>
);

export const PublicDataPortalPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['public-portal'],
    queryFn: () =>
      api.get<{
        campus: { id: string; name: string; city: string; isDemoData: boolean; demoBannerText?: string };
        summary: {
          buildingsCount: number;
          accessibleEntrancesCount: number;
          verifiedPathsCount: number;
          stepFreeOpenPathsCount: number;
          blockedPathsCount: number;
          resolvedReportsCount: number;
        };
        buildings: Array<{
          id: string;
          name: string;
          code: string;
          hasElevator: boolean;
          hasAccessibleEntrance: boolean;
          hasAccessibleRestroom: boolean;
          verificationStatus: string;
        }>;
      }>('/campuses/campus_demo_north/public-portal'),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#18C6AD]">Open Institutional Transparency</p>
          <h1 className="text-3xl font-bold text-[var(--ap-text)]">Public Accessibility Data Portal</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            {data?.campus.demoBannerText || 'DEMO CAMPUS — SYNTHETIC DATA'}
          </p>
        </div>
        <HelpButton featureId="F201" />
      </div>

      {isLoading || !data ? (
        <SkeletonRows rows={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ['Buildings', data.summary.buildingsCount],
              ['Accessible Entries', data.summary.accessibleEntrancesCount],
              ['Verified Paths', data.summary.verifiedPathsCount],
              ['Open Step-Free', data.summary.stepFreeOpenPathsCount],
              ['Blocked Paths', data.summary.blockedPathsCount],
              ['Resolved Reports', data.summary.resolvedReportsCount],
            ].map(([label, val]) => (
              <Card key={String(label)} padding="sm">
                <p className="text-xs text-[var(--ap-muted)]">{label}</p>
                <p className="text-2xl font-bold text-[#18C6AD] font-mono tabular-nums mt-1">{val}</p>
              </Card>
            ))}
          </div>

          <Card padding="none" className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] text-xs text-[var(--ap-muted)]">
                <tr>
                  <th className="px-4 py-3">Building</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Accessible Entry</th>
                  <th className="px-4 py-3">Elevator</th>
                  <th className="px-4 py-3">Accessible Restroom</th>
                  <th className="px-4 py-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ap-border)]">
                {data.buildings.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--ap-surface-2)]">
                    <td className="px-4 py-3 font-semibold text-[var(--ap-text)]">{b.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ap-muted)]">{b.code}</td>
                    <td className="px-4 py-3">{b.hasAccessibleEntrance ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{b.hasElevator ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{b.hasAccessibleRestroom ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3"><StatusLabel status={b.verificationStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
};
