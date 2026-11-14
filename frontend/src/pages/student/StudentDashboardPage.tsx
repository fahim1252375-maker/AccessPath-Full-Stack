import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Compass,
  Layers,
  Map as MapIcon,
  PlusCircle,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Card, HelpButton, SkeletonRows, StatusLabel } from '../../components/ui/Primitives.tsx';
import { RecentlyVisited, WelcomeChecklist } from '../../components/onboarding/WelcomeChecklist.tsx';
import { greetingFor } from '../../data/quickNav.ts';
import type {
  AccessibilityReportDTO,
  AnnouncementDTO,
  NotificationDTO,
} from '../../../../shared/types.ts';

export const StudentDashboardPage: React.FC = () => {
  const { user, selectedCampusId, accessibilityProfile, setAiAssistantOpen, language } = useAppStore();

  const { data: announcements } = useQuery({
    queryKey: ['announcements', selectedCampusId],
    queryFn: () => api.get<AnnouncementDTO[]>(`/admin/announcements?campusId=${selectedCampusId}`),
  });

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ['reports', selectedCampusId],
    queryFn: () => api.get<AccessibilityReportDTO[]>(`/reports?campusId=${selectedCampusId}`),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationDTO[]>('/admin/notifications'),
    enabled: Boolean(user),
  });

  const activeModeLabel = accessibilityProfile.wheelchairMode
    ? 'Wheelchair Navigation'
    : accessibilityProfile.stepFreeMode
    ? 'Step-Free Navigation'
    : accessibilityProfile.limitedMobilityMode
    ? 'Limited Mobility Mode'
    : 'Standard Preferences';

  const openReports = (reports || []).filter((r) => !['resolved', 'rejected'].includes(r.status));
  const unreadNotifs = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ap-text)]">
            {greetingFor(new Date(), language)}
            {user ? `, ${user.name.split(' ')[0]}` : language === 'bn' ? ' — AccessPath-এ স্বাগতম' : ' — welcome to AccessPath'}
          </h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Active profile: <strong className="text-[#18C6AD]">{activeModeLabel}</strong> · Campus: Demo North Courtyard
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpButton featureId="F001" />
          <Button variant="outline" size="sm" onClick={() => setAiAssistantOpen(true)}>
            <Sparkles className="w-4 h-4 text-[#32A7D9]" />
            <span>AccessPath AI</span>
          </Button>
          <Link to="/app/planner">
            <Button variant="primary">
              <Compass className="w-4 h-4" />
              <span>Plan Accessible Route</span>
            </Button>
          </Link>
          <Link to="/app/report/new">
            <Button variant="secondary">
              <PlusCircle className="w-4 h-4" />
              <span>Report Barrier</span>
            </Button>
          </Link>
        </div>
      </div>

      <RecentlyVisited />

      <WelcomeChecklist />

      {/* Active Announcements */}
      {announcements && announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} padding="sm" className="bg-[var(--ap-warn-bg)] border-[var(--ap-warn-border)]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-[var(--ap-warn)] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-[var(--ap-warn)]">{a.title}</p>
                  <p className="text-[var(--ap-text)] mt-0.5">{a.message}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--ap-muted)]">3D &amp; 2D Campus Map</p>
            <p className="text-xl font-bold text-[var(--ap-text)] font-mono tabular-nums mt-1">
              14 Locations · 26 Paths
            </p>
          </div>
          <Link to="/app/map" className="text-xs font-semibold text-[#18C6AD] hover:underline inline-flex items-center gap-1">
            <MapIcon className="w-3.5 h-3.5" />
            <span>Open Interactive Map</span>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--ap-muted)]">Active Barrier Reports</p>
            <p className="text-xl font-bold text-[#32A7D9] font-mono tabular-nums mt-1">
              {openReports.length}
            </p>
          </div>
          <Link to="/app/community-reports" className="text-xs font-semibold text-[#18C6AD] hover:underline inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inspect Community Reports</span>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--ap-muted)]">Accessibility Profile</p>
            <p className="text-base font-bold text-[var(--ap-text)] mt-1">{activeModeLabel}</p>
          </div>
          <Link to="/app/accessibility-profile" className="text-xs font-semibold text-[#18C6AD] hover:underline inline-flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Preferences</span>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--ap-muted)]">Unread Notifications</p>
            <p className="text-xl font-bold text-[#18C6AD] font-mono tabular-nums mt-1">
              {unreadNotifs}
            </p>
          </div>
          <Link to="/app/notifications" className="text-xs font-semibold text-[#18C6AD] hover:underline inline-flex items-center gap-1">
            <Bell className="w-3.5 h-3.5" />
            <span>View Alerts &amp; Updates</span>
          </Link>
        </Card>
      </div>

      {/* Workspace Shortcuts Strip */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/app/indoor">
          <Card className="hover:border-[#18C6AD]/60 transition-colors space-y-1">
            <p className="text-xs font-semibold text-[#32A7D9] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Floor 3D Indoor View</span>
            </p>
            <p className="text-xs text-[var(--ap-muted)]">
              Inspect Library &amp; Science Hall floors, QR waypoints, and live lift telemetry.
            </p>
          </Card>
        </Link>
        <Link to="/app/live-status">
          <Card className="hover:border-[#18C6AD]/60 transition-colors space-y-1">
            <p className="text-xs font-semibold text-[#18C6AD]">Live Elevator &amp; Facility Alerts</p>
            <p className="text-xs text-[var(--ap-muted)]">
              Subscribe to elevator outages and construction closures across campus.
            </p>
          </Card>
        </Link>
        <Link to="/app/schedule">
          <Card className="hover:border-[#18C6AD]/60 transition-colors space-y-1">
            <p className="text-xs font-semibold text-[#32A7D9]">Smart Class Schedule Planner</p>
            <p className="text-xs text-[var(--ap-muted)]">
              Verify accessible buffer times between consecutive lectures and labs.
            </p>
          </Card>
        </Link>
      </div>

      {/* Recent Barrier Reports */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ap-text)]">Recent Campus Barrier Reports</h2>
          <Link to="/app/community-reports" className="text-xs font-semibold text-[#18C6AD] hover:underline">
            View All
          </Link>
        </div>

        {loadingReports ? (
          <SkeletonRows rows={3} />
        ) : (
          <div className="divide-y divide-[var(--ap-border)]">
            {(reports || []).slice(0, 5).map((rep) => (
              <div key={rep.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/app/reports/${rep.id}`}
                    className="text-sm font-semibold text-[var(--ap-text)] hover:text-[#18C6AD] hover:underline"
                  >
                    {rep.title}
                  </Link>
                  <p className="text-xs text-[var(--ap-muted)] mt-0.5">
                    {rep.locationLabel} · {rep.category.replace(/_/g, ' ')} · Priority: {rep.priority}
                  </p>
                </div>
                <StatusLabel status={rep.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
