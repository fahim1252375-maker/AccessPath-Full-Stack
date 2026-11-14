import React, { Suspense, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Menu, ShieldCheck, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.ts';
import { FEATURE_COUNT } from '../../data/featureCatalog.ts';
import { PageLoader } from '../ui/PageLoader.tsx';
import {
  AccessibilityQuickControls,
  PWAInstallButton,
  ThemeToggleButton,
} from '../accessibility/AccessibilityControls.tsx';

export const PublicLayout: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const setAiAssistantOpen = useAppStore((s) => s.setAiAssistantOpen);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/explore', label: t('nav.explore') },
    { to: '/how-it-works', label: t('nav.howItWorks') },
    { to: '/features', label: t('nav.features') },
    { to: '/accessibility', label: t('nav.accessibility') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ap-bg)] text-[var(--ap-text)]">
      {/* Clean 3-Zone Single-Row Top Bar */}
      <header className="sticky top-0 z-40 bg-[var(--ap-bg)]/95 backdrop-blur-md border-b border-[var(--ap-border)] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-[var(--ap-text)] whitespace-nowrap font-display"
            >
              <span className="w-7 h-7 rounded-lg bg-[#18C6AD]/15 border border-[#18C6AD]/40 flex items-center justify-center text-[#18C6AD]">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </span>
              <span>AccessPath</span>
            </Link>
          </div>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--ap-muted)]"
          >
            {navLinks.map((link) => {
              const active =
                location.pathname === link.to ||
                (link.to !== '/' && location.pathname.startsWith(link.to + '/'));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#18C6AD] ${
                    active ? 'text-[#18C6AD] font-semibold' : ''
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggleButton compact />
            <button
              type="button"
              onClick={() => setAiAssistantOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] hover:border-[#18C6AD]/70 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Bot className="w-3.5 h-3.5 text-[#18C6AD]" aria-hidden="true" />
              <span>AI Assistant</span>
            </button>
            <Link
              to={user ? '/app' : '/auth/signin'}
              className="px-4 py-2 text-sm font-semibold text-[#04211E] bg-[#18C6AD] rounded-lg hover:bg-[#14B29B] transition-colors whitespace-nowrap shrink-0"
            >
              {user ? t('nav.dashboard') : t('nav.signIn')}
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg border border-[var(--ap-border)] bg-[var(--ap-surface)] text-[var(--ap-text)] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--ap-border)] bg-[var(--ap-surface)] px-4 py-4 space-y-3">
            <nav aria-label="Mobile navigation" className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--ap-text)] hover:bg-[var(--ap-surface-2)]"
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiAssistantOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[#18C6AD] hover:bg-[var(--ap-surface-2)] text-left"
              >
                <Bot className="w-4 h-4" />
                <span>Open AccessPath AI</span>
              </button>
            </nav>
            <div className="pt-2 border-t border-[var(--ap-border)]">
              <AccessibilityQuickControls compact />
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="bg-[var(--ap-surface)] border-t border-[var(--ap-border)] mt-16 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[var(--ap-border)]">
            <div>
              <p className="text-base font-bold text-[var(--ap-text)] font-display">AccessPath</p>
              <p className="text-xs text-[var(--ap-muted)] mt-1">
                Accessible Campus Navigation &amp; AI-Powered Barrier Reporting System · {t('common.demoNotice')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AccessibilityQuickControls compact />
              <PWAInstallButton />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
            <div className="space-y-2.5">
              <h3 className="font-bold text-[var(--ap-text)]">Platform</h3>
              <ul className="space-y-1.5 text-[var(--ap-muted)]">
                <li><Link to="/about" className="hover:text-[#18C6AD]">About AccessPath</Link></li>
                <li><Link to="/how-it-works" className="hover:text-[#18C6AD]">How It Works</Link></li>
                <li><Link to="/features" className="hover:text-[#18C6AD]">{FEATURE_COUNT} Capabilities</Link></li>
                <li><Link to="/explore" className="hover:text-[#18C6AD]">Explore 3D &amp; 2D Demo</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-bold text-[var(--ap-text)]">Navigation</h3>
              <ul className="space-y-1.5 text-[var(--ap-muted)]">
                <li><Link to="/app/planner" className="hover:text-[#18C6AD]">Smart Route Planner</Link></li>
                <li><Link to="/app/map" className="hover:text-[#18C6AD]">Interactive Campus Map</Link></li>
                <li><Link to="/app/indoor" className="hover:text-[#18C6AD]">3D Indoor Floor Maps</Link></li>
                <li><Link to="/app/report/new" className="hover:text-[#18C6AD]">Report a Barrier</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-bold text-[var(--ap-text)]">Support</h3>
              <ul className="space-y-1.5 text-[var(--ap-muted)]">
                <li><Link to="/accessibility" className="hover:text-[#18C6AD]">Accessibility &amp; WCAG</Link></li>
                <li><Link to="/help" className="hover:text-[#18C6AD]">Help Center &amp; FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-[#18C6AD]">Contact Team</Link></li>
                <li><Link to="/public-portal" className="hover:text-[#18C6AD]">Public Accessibility Portal</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-bold text-[var(--ap-text)]">Governance &amp; Legal</h3>
              <ul className="space-y-1.5 text-[var(--ap-muted)]">
                <li><Link to="/privacy" className="hover:text-[#18C6AD]">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-[#18C6AD]">Terms of Service</Link></li>
                <li><Link to="/auth/signup" className="hover:text-[#18C6AD]">Create Student Account</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--ap-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--ap-muted)]">
            <p>&copy; {new Date().getFullYear()} AccessPath Platform. Built for inclusive campus mobility.</p>
            <p>AI classifications require human verification before updating authoritative routes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
