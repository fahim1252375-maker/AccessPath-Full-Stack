import React, { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CheckSquare,
  Compass,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Network,
  PlusCircle,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { api } from '../../services/api.ts';
import {
  AccessibilityQuickControls,
  PWAInstallButton,
  ThemeToggleButton,
} from '../accessibility/AccessibilityControls.tsx';
import { Breadcrumbs, Button } from '../ui/Primitives.tsx';
import { FEATURE_COUNT } from '../../data/featureCatalog.ts';
import { PageLoader } from '../ui/PageLoader.tsx';
import { CommandPalette } from '../ui/CommandPalette.tsx';
import { GlobalShortcuts } from '../ui/GlobalShortcuts.tsx';
import { Toaster } from '../ui/Toaster.tsx';
import { BackToTopButton, RouteTracker } from './WorkspaceHelpers.tsx';
import { useUiStore } from '../../store/useUiStore.ts';

interface NavGroup {
  heading: string;
  items: Array<{ to: string; label: string; icon: React.ReactNode; end?: boolean }>;
}

export const WorkspaceLayout: React.FC = () => {
  const { user, setAuth, setAiAssistantOpen, language } = useAppStore();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Let keyboard users dismiss the mobile navigation drawer with Escape.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setAuth(null, null);
    navigate('/');
  };

  const role = user?.role || 'student';
  const isVolunteerUp = ['volunteer', 'moderator', 'campus_admin', 'super_admin'].includes(role);
  const isModUp = ['moderator', 'campus_admin', 'super_admin'].includes(role);
  const isAdminUp = ['campus_admin', 'super_admin'].includes(role);
  const isSuper = role === 'super_admin';

  const groups: NavGroup[] = [
    {
      heading: 'Navigation & Student',
      items: [
        { to: '/app', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
        { to: '/app/explorer', label: '3D Campus Explorer', icon: <Building2 className="w-4 h-4" /> },
        { to: '/app/map', label: 'Interactive Map', icon: <MapIcon className="w-4 h-4" /> },
        { to: '/app/planner', label: 'Smart Route Planner', icon: <Compass className="w-4 h-4" /> },
        { to: '/app/indoor', label: '3D Indoor Floor Maps', icon: <Building2 className="w-4 h-4" /> },
        { to: '/app/live-status', label: 'Live Facility Status', icon: <Activity className="w-4 h-4" /> },
        { to: '/app/schedule', label: 'Class Schedule Plan', icon: <History className="w-4 h-4" /> },
        { to: '/app/emergency', label: 'Emergency Evacuation', icon: <Shield className="w-4 h-4" /> },
        { to: '/app/accessibility-profile', label: 'Accessibility Profile', icon: <Sliders className="w-4 h-4" /> },
        { to: '/app/saved', label: 'Saved & History', icon: <History className="w-4 h-4" /> },
        { to: '/app/report/new', label: 'Report Barrier', icon: <PlusCircle className="w-4 h-4" /> },
        { to: '/app/my-reports', label: 'My Reports', icon: <FileText className="w-4 h-4" /> },
        { to: '/app/community-reports', label: 'Community Reports', icon: <AlertTriangle className="w-4 h-4" /> },
        { to: '/app/advanced', label: 'QR, BLE & AR Hub', icon: <Network className="w-4 h-4" /> },
        { to: '/app/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
        { to: '/app/settings', label: 'Personal Settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  if (isVolunteerUp) {
    groups.push({
      heading: 'Verification',
      items: [
        { to: '/app/volunteer', label: 'Volunteer Queue', icon: <CheckSquare className="w-4 h-4" /> },
      ],
    });
  }

  if (isModUp) {
    groups.push({
      heading: 'Campus Operations',
      items: [
        { to: '/app/admin', label: 'Admin Dashboard', icon: <Shield className="w-4 h-4" />, end: true },
        { to: '/app/admin/reports', label: 'Manage Reports', icon: <FileText className="w-4 h-4" /> },
        ...(isAdminUp
          ? [
              { to: '/app/admin/campus-editor', label: 'Map & Graph Editor', icon: <MapIcon className="w-4 h-4" /> },
              { to: '/app/admin/maintenance', label: 'Maintenance & Closures', icon: <Wrench className="w-4 h-4" /> },
              { to: '/app/admin/accessibility-twin', label: 'Accessibility Digital Twin', icon: <Network className="w-4 h-4" /> },
              { to: '/app/admin/analytics', label: 'Analytics & Impact', icon: <BarChart3 className="w-4 h-4" /> },
              { to: '/app/admin/users', label: 'Users & Volunteers', icon: <Users className="w-4 h-4" /> },
              { to: '/app/admin/integrations', label: 'Integrations & Alerts', icon: <Activity className="w-4 h-4" /> },
              { to: '/app/admin/audit-logs', label: 'Audit Logs', icon: <Shield className="w-4 h-4" /> },
            ]
          : []),
      ],
    });
  }

  if (isSuper) {
    groups.push({
      heading: 'Super Administration',
      items: [
        { to: '/app/super-admin', label: 'Global Platform', icon: <Globe className="w-4 h-4" /> },
      ],
    });
  }

  const segment = location.pathname.split('/').filter(Boolean).slice(-1)[0] || 'Dashboard';
  const crumbLabel = segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[var(--ap-surface)]">
      <div className="px-5 h-16 flex items-center justify-between border-b border-[var(--ap-border)]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-lg font-extrabold text-[var(--ap-text)] font-display whitespace-nowrap"
        >
          <span className="w-7 h-7 rounded-lg bg-[#18C6AD]/15 border border-[#18C6AD]/40 flex items-center justify-center text-[#18C6AD]">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          </span>
          <span>AccessPath</span>
        </Link>
        <button
          type="button"
          className="lg:hidden p-1.5 rounded-lg text-[var(--ap-muted)] hover:text-[var(--ap-text)]"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.heading} className="space-y-1">
            <p className="px-3 text-xs font-semibold text-[var(--ap-muted)] pb-1">{group.heading}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#18C6AD] text-[#04211E] font-semibold'
                      : 'text-[var(--ap-text)] hover:bg-[var(--ap-surface-2)]'
                  }`
                }
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--ap-border)] space-y-3 bg-[var(--ap-surface-2)]">
        {user ? (
          <div className="space-y-2">
            <div className="text-xs">
              <p className="font-bold text-[var(--ap-text)] truncate">{user.name}</p>
              <p className="text-[var(--ap-muted)] truncate">
                {user.role.replace(/_/g, ' ')} · {user.email}
              </p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        ) : (
          <Link to="/auth/signin" className="block">
            <Button size="sm" className="w-full">Sign In</Button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--ap-bg)] text-[var(--ap-text)]">
      <RouteTracker />
      <CommandPalette />
      <GlobalShortcuts />
      <Toaster />
      <BackToTopButton />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[var(--ap-surface)] border-r border-[var(--ap-border)] sticky top-0 h-screen no-print">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/55"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-[var(--ap-surface)] h-full border-r border-[var(--ap-border)] z-10">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-[var(--ap-surface)]/95 backdrop-blur-md border-b border-[var(--ap-border)] px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[var(--ap-border)] text-[var(--ap-text)] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Breadcrumbs
              items={[
                { label: 'AccessPath', to: '/' },
                { label: 'Workspace', to: '/app' },
                { label: crumbLabel },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden xl:flex">
              <AccessibilityQuickControls compact />
            </div>
            <div className="xl:hidden">
              <ThemeToggleButton compact />
            </div>
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={language === 'bn' ? 'দ্রুত খোঁজ খুলুন (Ctrl K)' : 'Open quick search (Ctrl K)'}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] px-3 min-h-[36px] text-xs font-medium text-[var(--ap-muted)] hover:border-[#18C6AD]/60 hover:text-[var(--ap-text)] cursor-pointer"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">{language === 'bn' ? 'খুঁজুন…' : 'Search…'}</span>
              <kbd className="hidden lg:inline rounded border border-[var(--ap-border)] px-1 font-mono text-[10px]">Ctrl K</kbd>
            </button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAiAssistantOpen(true)}
              aria-label="Open AccessPath AI Companion"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AccessPath AI</span>
            </Button>
          </div>
        </header>

        {/* Honest Synthetic Data Notice */}
        <div className="bg-[var(--ap-surface-2)] border-b border-[var(--ap-border)] px-4 sm:px-6 py-2 text-xs text-[var(--ap-muted)] flex flex-wrap items-center justify-between gap-2 no-print">
          <span>
            <strong className="text-[#18C6AD]">DEMO CAMPUS — SYNTHETIC DATA</strong> · Demo North Courtyard Campus (14 nodes, 26 path edges)
          </span>
          <div className="flex items-center gap-4">
            <Link to="/features" className="font-semibold hover:text-[#18C6AD]">
              {FEATURE_COUNT} Features Docs
            </Link>
            <Link to="/public-portal" className="font-semibold underline hover:text-[#18C6AD]">
              Public Accessibility Portal
            </Link>
          </div>
        </div>

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
