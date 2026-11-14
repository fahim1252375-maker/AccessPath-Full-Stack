import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FEATURE_COUNT } from '../../data/featureCatalog.ts';
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  Compass,
  Eye,
  FileWarning,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { CampusMap } from '../../components/maps/CampusMap.tsx';
import { SafeHeroCampusScene3D } from '../../components/three/LazyCampusScenes.tsx';
import { MotionReveal } from '../../components/motion/MotionPrimitives.tsx';
import { Button, Card, StatusLabel } from '../../components/ui/Primitives.tsx';
import type {
  BuildingDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';

const faqs = [
  {
    q: 'Does AccessPath mark a pathway accessible automatically from AI reports?',
    a: 'No. Server-side Gemini AI only assists with categorization, missing-info detection, and Bengali/English structuring. Only verified campus volunteers, moderators, or authorized administrators can update authoritative map routing.',
  },
  {
    q: 'What happens if no verified step-free route exists between two buildings?',
    a: 'AccessPath never invents a route or treats unverified stairs as safe. The constraint-filtered Dijkstra routing engine clearly reports NO_VERIFIED_ACCESSIBLE_ROUTE and lists every blocking segment or elevator outage.',
  },
  {
    q: 'Do students have to share medical diagnoses to use accessibility routing?',
    a: 'Never. AccessPath stores only functional mobility preferences such as step-free routing, wheelchair mode, ramp requirement, low gradient, smooth surfaces, or well-lit paths.',
  },
  {
    q: 'Does AccessPath support Bengali, Dark/Light themes, and offline PWA access?',
    a: 'Yes. The entire workspace, ' + FEATURE_COUNT + '-feature directory, barrier copilot, and AccessPath AI support both English and বাংলা, dual dark/light WCAG-checked themes, and offline cached graphs/drafts with explicit timestamps.',
  },
];

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAiAssistantOpen = useAppStore((s) => s.setAiAssistantOpen);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroMode, setHeroMode] = useState<'3d' | '2d'>('3d');

  const { data: mapData } = useQuery({
    queryKey: ['public-demo-map'],
    queryFn: () =>
      api.get<{
        campus: CampusDTO;
        buildings: BuildingDTO[];
        locations: LocationNodeDTO[];
        edges: PathEdgeDTO[];
        liveFacilities?: LiveFacilityStatusDTO[];
      }>('/campuses/campus_demo_north/map'),
  });

  const { data: portalData } = useQuery({
    queryKey: ['public-portal-summary'],
    queryFn: () =>
      api.get<{
        campus: { id: string; name: string; demoBannerText?: string };
        summary: {
          buildingsCount: number;
          accessibleEntrancesCount: number;
          verifiedPathsCount: number;
          stepFreeOpenPathsCount: number;
          blockedPathsCount: number;
          resolvedReportsCount: number;
        };
        buildings: BuildingDTO[];
      }>('/campuses/campus_demo_north/public-portal'),
  });

  const mapFallback = mapData ? (
    <CampusMap
      centerLat={mapData.campus.centerLat}
      centerLng={mapData.campus.centerLng}
      zoom={mapData.campus.defaultZoom}
      locations={mapData.locations}
      edges={mapData.edges}
      heightClass="h-[420px]"
    />
  ) : (
    <div className="h-[420px] rounded-2xl border border-[var(--ap-border)] bg-[var(--ap-surface)] flex items-center justify-center p-8 text-center">
      <div>
        <Compass className="w-10 h-10 mx-auto mb-2 text-[#18C6AD]" />
        <p className="font-bold text-[var(--ap-text)]">AccessPath Demo North Courtyard Campus</p>
        <p className="text-xs text-[var(--ap-muted)] mt-1">Interactive accessibility graph ready</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-20 pb-14">
      {/* 2. 3D Interactive Campus Hero */}
      <section className="ap-grid-bg border-b border-[var(--ap-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-10">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--ap-surface)] border border-[var(--ap-border)] text-xs font-semibold text-[#18C6AD]">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Verified Routing · AI Copilot · 3D GIS Explorer</span>
              </div>

              <h1
                className="text-3xl sm:text-5xl font-extrabold text-[var(--ap-text)] tracking-tight leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                {t('hero.headline')}
              </h1>

              <p className="text-sm sm:text-base text-[var(--ap-muted)] leading-relaxed">
                {t('hero.subtext')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to="/explore">
                  <Button size="lg" variant="primary">
                    <Compass className="w-4 h-4" />
                    <span>{t('hero.primaryCta')}</span>
                  </Button>
                </Link>
                <Link to="/app/report/new">
                  <Button size="lg" variant="outline">
                    <FileWarning className="w-4 h-4" />
                    <span>{t('hero.secondaryCta')}</span>
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => setAiAssistantOpen(true)}
                  className="border border-[var(--ap-border)]"
                >
                  <Sparkles className="w-4 h-4 text-[#32A7D9]" />
                  <span>Ask AccessPath AI</span>
                </Button>
              </div>

              <div className="pt-3 border-t border-[var(--ap-border)] flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--ap-muted)]">
                <span>Constraint-Filtered Dijkstra</span>
                <span aria-hidden="true">·</span>
                <span>English &amp; বাংলা NLP</span>
                <span aria-hidden="true">·</span>
                <span>{FEATURE_COUNT} Documented Features</span>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold text-[#32A7D9]">
                  {portalData?.campus.demoBannerText || 'DEMO CAMPUS — SYNTHETIC DATA'}
                </span>
                <div className="inline-flex rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setHeroMode('3d')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      heroMode === '3d'
                        ? 'bg-[#18C6AD] text-[#04211E]'
                        : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
                    }`}
                  >
                    3D Scene
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroMode('2d')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      heroMode === '2d'
                        ? 'bg-[#18C6AD] text-[#04211E]'
                        : 'text-[var(--ap-muted)] hover:text-[var(--ap-text)]'
                    }`}
                  >
                    2D Map
                  </button>
                </div>
              </div>

              <SafeHeroCampusScene3D
                buildings={mapData?.buildings}
                forceFallback={heroMode === '2d'}
                fallback={mapFallback}
                onNavigateBuilding={(bId) => navigate(`/app/places/${bId}`)}
              />
            </div>
          </div>

          {/* 3. Live Campus Accessibility Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
            {[
              ['Campus Buildings', portalData?.summary.buildingsCount ?? 8, 'text-[#18C6AD]'],
              ['Step-Free Entries', portalData?.summary.accessibleEntrancesCount ?? 7, 'text-[#32A7D9]'],
              ['Verified Paths', portalData?.summary.verifiedPathsCount ?? 22, 'text-[#18C6AD]'],
              ['Open Step-Free', portalData?.summary.stepFreeOpenPathsCount ?? 18, 'text-[#32A7D9]'],
              ['Active Blockages', portalData?.summary.blockedPathsCount ?? 1, 'text-[#F59E0B]'],
              ['Resolved Barriers', portalData?.summary.resolvedReportsCount ?? 3, 'text-[#18C6AD]'],
            ].map(([label, val, tone]) => (
              <Card key={String(label)} padding="sm" className="text-center sm:text-left">
                <p className="text-[11px] font-medium text-[var(--ap-muted)]">{label}</p>
                <p className={`text-2xl font-extrabold font-mono tabular-nums mt-1 ${tone}`}>
                  {val}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Smart Navigation & Animated Route Differentiation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <MotionReveal className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold text-[#18C6AD]">01 · Safety-First Graph Engine</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
              Constraint-Filtered Dijkstra &amp; Visual Verification Clarity
            </h2>
            <p className="text-sm text-[var(--ap-muted)] leading-relaxed">
              Before computing any shortest path, AccessPath strips stairs, narrow corridors (&lt; 1.2m), active construction trenches, elevator outages, and unverified segments. Visual lines always combine geometry patterns and icons—never relying on color alone.
            </p>
            <ul className="space-y-2.5 text-sm text-[var(--ap-text)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#18C6AD] shrink-0 mt-0.5" />
                <span>Solid High-Glow Track: Verified step-free path with valid inspection dates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#32A7D9] shrink-0 mt-0.5" />
                <span>Dashed Dual Track: Alternative verified path or cautionary gradient segment</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <span>Hazard Cone &amp; Crossed Dash: Blocked corridor or offline elevator excluded from routing</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link to="/app/planner">
                <Button variant="secondary">
                  <span>Open Smart Route Planner</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            {mapData ? (
              <CampusMap
                centerLat={mapData.campus.centerLat}
                centerLng={mapData.campus.centerLng}
                zoom={mapData.campus.defaultZoom}
                locations={mapData.locations}
                edges={mapData.edges}
                heightClass="h-[360px]"
              />
            ) : (
              <Card className="h-[360px] flex items-center justify-center text-sm text-[var(--ap-muted)]">
                Loading live campus topology...
              </Card>
            )}
          </div>
        </MotionReveal>
      </section>

      {/* 5. AI Intelligence & Bilingual Companion */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <MotionReveal>
          <Card className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#32A7D9]">
                <Bot className="w-4 h-4" />
                <span>02 · AccessPath AI — Bilingual Campus Companion</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
                Natural-Language Routing &amp; Triage in English and বাংলা
              </h2>
              <p className="text-sm text-[var(--ap-muted)] leading-relaxed">
                Ask AccessPath AI where to find step-free entrances, accessible restrooms, or live elevator status—and get computed Dijkstra routes grounded directly in verified campus records with source timestamps.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => setAiAssistantOpen(true)}>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch AccessPath AI</span>
                </Button>
                <Link to="/features">
                  <Button variant="outline">Browse All {FEATURE_COUNT} Features</Button>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-xl bg-[var(--ap-surface-2)] border border-[var(--ap-border)] space-y-2">
                <p className="text-xs font-mono text-[#18C6AD]">SAMPLE BENGALI QUERY</p>
                <p className="text-sm font-semibold text-[var(--ap-text)]">
                  “আমি লাইব্রেরিতে যেতে চাই, কিন্তু সিঁড়ি ব্যবহার করতে পারি না।”
                </p>
                <p className="text-xs text-[var(--ap-muted)]">
                  Server extracts stairs-avoidance, executes verified graph search from Main Gate Plaza → Central Library, and returns verified step-by-step instructions.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--ap-surface-2)] border border-[var(--ap-border)] space-y-1">
                <p className="text-xs font-mono text-[#32A7D9]">SAFETY BOUNDARY</p>
                <p className="text-xs text-[var(--ap-muted)]">
                  AI insights are always labeled and never modify map edges without human review.
                </p>
              </div>
            </div>
          </Card>
        </MotionReveal>
      </section>

      {/* 6. 5-Step Reporting & Verification Workflow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#18C6AD]">03 · End-to-End Barrier Resolution</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
            Five-Stage Accountable Barrier Lifecycle
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['01', 'Report Barrier', 'Students submit EN/বাংলা text, voice, or EXIF-scrubbed photo reports.'],
            ['02', 'AI Assistance', 'Gemini detects category, urgency & missing fields without overriding safety.'],
            ['03', 'Human Verification', 'Campus volunteers & moderators verify on-site evidence & resolve duplicates.'],
            ['04', 'Maintenance Task', 'Facilities admins track SLA timers, root cause & reroute traffic safely.'],
            ['05', 'Verified Resolution', 'Path edges reopen with fresh verification timestamps & reporter feedback.'],
          ].map(([step, title, desc]) => (
            <Card key={step} padding="sm" className="space-y-2">
              <span className="text-xs font-mono font-bold text-[#18C6AD]">{step}</span>
              <h3 className="text-sm font-bold text-[var(--ap-text)]">{title}</h3>
              <p className="text-xs text-[var(--ap-muted)] leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 7. Community Verification & 8. Multi-Floor Indoor Navigation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-6">
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#18C6AD]">
              <Users className="w-4 h-4" />
              <span>04 · Community &amp; Volunteer Verification</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--ap-text)]">
              Transparent Field Inspections &amp; Dispute Checks
            </h3>
            <p className="text-sm text-[var(--ap-muted)] leading-relaxed">
              Volunteers inspect pending barrier reports on site, upload confirmation photography, flag stale segments before verification expires, and protect reporter identities through strict privacy aliasing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/app/community-reports">
              <Button variant="outline" size="sm">View Community Reports</Button>
            </Link>
            <Link to="/app/report/new">
              <Button variant="primary" size="sm">Submit New Report</Button>
            </Link>
          </div>
        </Card>

        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#32A7D9]">
              <Layers className="w-4 h-4" />
              <span>05 · Multi-Floor 3D Indoor Navigation</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--ap-text)]">
              Explodable 3D Floor Stacks, QR Waypoints &amp; Lift Sync
            </h3>
            <p className="text-sm text-[var(--ap-muted)] leading-relaxed">
              Switch between multi-floor 3D building views and accessible SVG schematics. Elevator availability is tied directly to live facility telemetry—never displaying an elevator as working during an outage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to="/app/indoor">
              <Button variant="secondary" size="sm">Open 3D Indoor Explorer</Button>
            </Link>
            <Link to="/app/live-status">
              <Button variant="outline" size="sm">Live Facility Status</Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* 9. Analytics Transparency & 10. Institutional Benefits */}
      <section className="border-y border-[var(--ap-border)] bg-[var(--ap-surface-2)] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#18C6AD]">06 · Public Portal &amp; Institutional Outcomes</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
                Built for Every Campus Stakeholder
              </h2>
            </div>
            <Link to="/public-portal">
              <Button variant="outline" size="sm">
                <span>Inspect Public Data Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              [Compass, 'Students & Visitors', 'Plan verified routes, save favorites, check class schedules & evacuate safely.'],
              [Eye, 'Accessibility Volunteers', 'Earn verified inspection records and keep campus graph freshness current.'],
              [Wrench, 'Facilities & Maintenance', 'Track SLA compliance, repeat elevator outages, and capital retrofit plans.'],
              [Building2, 'University Leadership', 'Export real database KPIs, CSV audit trails, and campus-scoped analytics Q&A.'],
            ].map(([IconComp, title, desc]) => {
              const Icon = IconComp as React.ComponentType<{ className?: string }>;
              return (
                <Card key={String(title)} className="space-y-2">
                  <Icon className="w-5 h-5 text-[#18C6AD]" />
                  <h3 className="text-sm font-bold text-[var(--ap-text)]">{String(title)}</h3>
                  <p className="text-xs text-[var(--ap-muted)] leading-relaxed">{String(desc)}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. Honest Pilot Verification Disclosure (Zero Invented Testimonials) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-[#32A7D9]/40">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#32A7D9]" />
              <span className="text-xs font-mono font-bold text-[#32A7D9]">
                HONEST DATA &amp; EVALUATION POLICY
              </span>
            </div>
            <h2 className="text-xl font-bold text-[var(--ap-text)]">
              Verified Metrics Only — No Fabricated Testimonials
            </h2>
            <p className="text-sm text-[var(--ap-muted)] leading-relaxed">
              AccessPath publishes live metrics directly from its database and synthetic demo campus graph. Until approved institutional partner testimonials are submitted, no synthetic student quotes or fabricated endorsements are displayed.
            </p>
          </div>
          <StatusLabel status="verified" size="md" />
        </Card>
      </section>

      {/* 12. Accessible FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[var(--ap-muted)]">
            Clear answers on routing safety, AI boundaries, privacy, and theme accessibility.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="ap-surface bg-[var(--ap-surface)] border border-[var(--ap-border)] rounded-xl overflow-hidden"
              >
                <button
                  id={`faq-question-${idx}`}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[var(--ap-text)] hover:bg-[var(--ap-surface-2)] cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="px-5 pb-4 text-sm text-[var(--ap-muted)] border-t border-[var(--ap-border)] pt-3"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 13. Final Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <Card className="p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-[#18C6AD]/40">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
              Experience All 5 Roles &amp; {FEATURE_COUNT} Documented Features Live
            </h2>
            <p className="text-sm sm:text-base text-[var(--ap-muted)]">
              Sign in with one click using any synthetic demo account (Student, Volunteer, Moderator, Campus Admin, or Super Admin) or inspect the 3D Demo Campus immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link to="/auth/signin">
              <Button variant="primary" size="lg">
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Workspace</span>
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="outline" size="lg">
                Explore {FEATURE_COUNT} Features
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
};
