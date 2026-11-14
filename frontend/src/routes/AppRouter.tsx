import React, { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.ts';
import type { UserRole } from '../../../shared/types.ts';
import { PublicLayout } from '../components/layout/PublicLayout.tsx';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout.tsx';
import { PageLoader } from '../components/ui/PageLoader.tsx';
import { HomePage } from '../pages/public/HomePage.tsx';
import {
  AccessDeniedPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
  VerifyEmailPage,
} from '../pages/auth/AuthPages.tsx';
import {
  NotFoundPage,
  OfflineFallbackPage,
  ServerErrorPage,
} from '../pages/system/SystemPages.tsx';
import { AIAssistantDrawer } from '../components/ai/AIAssistantDrawer.tsx';
import {
  LiveAnnouncer,
  OfflineIndicator,
  SkipToContentLink,
} from '../components/accessibility/AccessibilityControls.tsx';

/**
 * Route-level code splitting. The landing page, authentication and system pages stay in the
 * main bundle (they are the first thing most visitors see); everything else loads on demand,
 * which keeps the initial JavaScript small for low-bandwidth campus connections.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

function lazyNamed<M extends Record<string, unknown>>(
  loader: () => Promise<M>,
  exportName: keyof M & string
) {
  return React.lazy(() =>
    loader().then((module) => ({ default: module[exportName] as AnyComponent }))
  );
}

const publicInfo = () => import('../pages/public/PublicInfoPages.tsx');
const AboutPage = lazyNamed(publicInfo, 'AboutPage');
const AccessibilityStatementPage = lazyNamed(publicInfo, 'AccessibilityStatementPage');
const ContactPage = lazyNamed(publicInfo, 'ContactPage');
const ExploreDemoPage = lazyNamed(publicInfo, 'ExploreDemoPage');
const FeatureDetailsPage = lazyNamed(publicInfo, 'FeatureDetailsPage');
const FeaturesPage = lazyNamed(publicInfo, 'FeaturesPage');
const HelpCenterPage = lazyNamed(publicInfo, 'HelpCenterPage');
const HowItWorksPage = lazyNamed(publicInfo, 'HowItWorksPage');
const PrivacyPolicyPage = lazyNamed(publicInfo, 'PrivacyPolicyPage');
const PublicDataPortalPage = lazyNamed(publicInfo, 'PublicDataPortalPage');
const TermsPage = lazyNamed(publicInfo, 'TermsPage');
const SharedRoutePage = lazyNamed(() => import('../pages/public/SharedRoutePage.tsx'), 'SharedRoutePage');

const StudentDashboardPage = lazyNamed(
  () => import('../pages/student/StudentDashboardPage.tsx'),
  'StudentDashboardPage'
);
const explorer = () => import('../pages/student/CampusExplorerPage.tsx');
const CampusExplorerPage = lazyNamed(explorer, 'CampusExplorerPage');
const PlaceDetailsPage = lazyNamed(explorer, 'PlaceDetailsPage');
const InteractiveMapPage = lazyNamed(
  () => import('../pages/student/InteractiveMapPage.tsx'),
  'InteractiveMapPage'
);
const SmartRoutePlannerPage = lazyNamed(
  () => import('../pages/student/SmartRoutePlannerPage.tsx'),
  'SmartRoutePlannerPage'
);
const AccessibilityProfilePage = lazyNamed(
  () => import('../pages/student/AccessibilityProfilePage.tsx'),
  'AccessibilityProfilePage'
);
const reporting = () => import('../pages/student/ReportingPages.tsx');
const ReportDetailsPage = lazyNamed(reporting, 'ReportDetailsPage');
const ReportsListPage = lazyNamed(reporting, 'ReportsListPage');
const SubmitReportPage = lazyNamed(reporting, 'SubmitReportPage');
const utility = () => import('../pages/student/StudentUtilityPages.tsx');
const NotificationsPage = lazyNamed(utility, 'NotificationsPage');
const PersonalSettingsPage = lazyNamed(utility, 'PersonalSettingsPage');
const SavedAndHistoryPage = lazyNamed(utility, 'SavedAndHistoryPage');
const AdvancedModulesPage = lazyNamed(
  () => import('../pages/student/AdvancedModulesPage.tsx'),
  'AdvancedModulesPage'
);
const campusHub = () => import('../pages/student/CampusHubPages.tsx');
const ClassSchedulePage = lazyNamed(campusHub, 'ClassSchedulePage');
const EmergencyEvacuationPage = lazyNamed(campusHub, 'EmergencyEvacuationPage');
const IndoorNavigationPage = lazyNamed(campusHub, 'IndoorNavigationPage');
const LiveStatusPage = lazyNamed(campusHub, 'LiveStatusPage');
const VolunteerDashboardPage = lazyNamed(
  () => import('../pages/volunteer/VolunteerPages.tsx'),
  'VolunteerDashboardPage'
);
const adminOps = () => import('../pages/admin/AdminOperationsPages.tsx');
const AdminAuditLogsPage = lazyNamed(adminOps, 'AdminAuditLogsPage');
const AdminCampusEditorPage = lazyNamed(adminOps, 'AdminCampusEditorPage');
const AdminDashboardPage = lazyNamed(adminOps, 'AdminDashboardPage');
const AdminIntegrationsPage = lazyNamed(adminOps, 'AdminIntegrationsPage');
const AdminMaintenancePage = lazyNamed(adminOps, 'AdminMaintenancePage');
const AdminReportsPage = lazyNamed(adminOps, 'AdminReportsPage');
const AdminUsersPage = lazyNamed(adminOps, 'AdminUsersPage');
const AdminAnalyticsPage = lazyNamed(
  () => import('../pages/admin/AdminAnalyticsPage.tsx'),
  'AdminAnalyticsPage'
);
const AdminDigitalTwinPage = lazyNamed(
  () => import('../pages/admin/AdminDigitalTwinPage.tsx'),
  'AdminDigitalTwinPage'
);
const SuperAdminPage = lazyNamed(
  () => import('../pages/admin/SuperAdminPage.tsx'),
  'SuperAdminPage'
);

const RoleGuard: React.FC<{ roles: UserRole[]; children: React.ReactNode }> = ({
  roles,
  children,
}) => {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/auth/signin" replace />;
  if (!roles.includes(user.role)) return <AccessDeniedPage />;
  return <>{children}</>;
};

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <SkipToContentLink />
    <LiveAnnouncer />
    <AIAssistantDrawer />
    <OfflineIndicator />

    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/features/:featureId" element={<FeatureDetailsPage />} />
          <Route path="/accessibility" element={<AccessibilityStatementPage />} />
          <Route path="/explore" element={<ExploreDemoPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/public-portal" element={<PublicDataPortalPage />} />
          <Route path="/shared-route/:token" element={<SharedRoutePage />} />

          {/* Auth */}
          <Route path="/auth/signin" element={<SignInPage />} />
          <Route path="/auth/signup" element={<SignUpPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* System */}
          <Route path="/offline" element={<OfflineFallbackPage />} />
          <Route path="/server-error" element={<ServerErrorPage />} />
        </Route>

        {/* Application Workspace */}
        <Route path="/app" element={<WorkspaceLayout />}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="explorer" element={<CampusExplorerPage />} />
          <Route path="places/:id" element={<PlaceDetailsPage />} />
          <Route path="map" element={<InteractiveMapPage />} />
          <Route path="planner" element={<SmartRoutePlannerPage />} />
          <Route path="accessibility-profile" element={<AccessibilityProfilePage />} />
          <Route path="saved" element={<SavedAndHistoryPage />} />
          <Route path="report/new" element={<SubmitReportPage />} />
          <Route path="my-reports" element={<ReportsListPage mode="mine" />} />
          <Route path="community-reports" element={<ReportsListPage mode="community" />} />
          <Route path="reports/:id" element={<ReportDetailsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<PersonalSettingsPage />} />
          <Route path="advanced" element={<AdvancedModulesPage />} />
          <Route path="indoor" element={<IndoorNavigationPage />} />
          <Route path="live-status" element={<LiveStatusPage />} />
          <Route path="schedule" element={<ClassSchedulePage />} />
          <Route path="emergency" element={<EmergencyEvacuationPage />} />

          {/* Volunteer */}
          <Route
            path="volunteer"
            element={
              <RoleGuard roles={['volunteer', 'moderator', 'campus_admin', 'super_admin']}>
                <VolunteerDashboardPage />
              </RoleGuard>
            }
          />

          {/* Campus Admin & Moderator */}
          <Route
            path="admin"
            element={
              <RoleGuard roles={['moderator', 'campus_admin', 'super_admin']}>
                <AdminDashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/reports"
            element={
              <RoleGuard roles={['moderator', 'campus_admin', 'super_admin']}>
                <AdminReportsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/campus-editor"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminCampusEditorPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/maintenance"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminMaintenancePage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/accessibility-twin"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminDigitalTwinPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/users"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminUsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/analytics"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminAnalyticsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/integrations"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminIntegrationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/audit-logs"
            element={
              <RoleGuard roles={['campus_admin', 'super_admin']}>
                <AdminAuditLogsPage />
              </RoleGuard>
            }
          />

          {/* Super Admin */}
          <Route
            path="super-admin"
            element={
              <RoleGuard roles={['super_admin']}>
                <SuperAdminPage />
              </RoleGuard>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
