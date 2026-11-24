import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { RouteFallback } from '../../components/system/RouteFallback';

const AnalyticsPage = lazy(() => import('../../pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const CustomizationPage = lazy(() => import('../../pages/CustomizationPage').then((module) => ({ default: module.CustomizationPage })));
const DesktopPage = lazy(() => import('../../pages/DesktopPage').then((module) => ({ default: module.DesktopPage })));
const ArcadePage = lazy(() => import('../../pages/ArcadePage').then((module) => ({ default: module.ArcadePage })));
const LaboratoryPage = lazy(() => import('../../pages/LaboratoryPage').then((module) => ({ default: module.LaboratoryPage })));
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const OverviewPage = lazy(() => import('../../pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const CommunityPage = lazy(() => import('../../pages/CommunityPage').then((module) => ({ default: module.CommunityPage })));
const ToolsPage = lazy(() => import('../../pages/ToolsPage').then((module) => ({ default: module.ToolsPage })));
const AboutPage = lazy(() => import('../../pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const HelpPage = lazy(() => import('../../pages/HelpPage').then((module) => ({ default: module.HelpPage })));
const PrivacyPage = lazy(() => import('../../pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="laboratory" element={<LaboratoryPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="arcade" element={<ArcadePage />} />
          <Route path="customize" element={<CustomizationPage />} />
          <Route path="desktop" element={<DesktopPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
