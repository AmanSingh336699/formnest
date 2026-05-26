import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicShell } from './components/layout/PublicShell';
import { AuthShell } from './components/layout/AuthShell';
import { DashboardShell } from './components/layout/DashboardShell';
import { RequireAuth } from './components/RequireAuth';
import { LandingPage } from './pages/marketing/Landing';
import { PricingPage } from './pages/marketing/Pricing';
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { ResetPasswordPage } from './pages/auth/ResetPassword';
import { VerifyEmailPage } from './pages/auth/VerifyEmail';
import { OverviewPage } from './pages/dashboard/Overview';
import { FormsListPage } from './pages/dashboard/FormsList';
import { FormBuilderPage } from './pages/dashboard/FormBuilder';
import { FormResponsesPage } from './pages/dashboard/FormResponses';
import { FormAnalyticsPage } from './pages/dashboard/FormAnalytics';
import { FormSharePage } from './pages/dashboard/FormShare';
import { FormSettingsPage } from './pages/dashboard/FormSettings';
import { ApiKeysPage } from './pages/developer/ApiKeys';
import { WebhooksPage } from './pages/developer/Webhooks';
import { ApiDocsPage } from './pages/developer/ApiDocs';
import { ProfilePage } from './pages/account/Profile';
import { BillingPage } from './pages/account/Billing';
import { DangerZonePage } from './pages/account/DangerZone';
import { PublicFormViewPage } from './pages/public/FormView';
import { NotFoundPage } from './pages/public/NotFound';

export const router = createBrowserRouter([
  // Marketing
  {
    element: <PublicShell />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/pricing', element: <PricingPage /> },
    ],
  },

  // Auth
  {
    element: <AuthShell />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },

  // Dashboard (authenticated)
  {
    element: (
      <RequireAuth>
        <DashboardShell />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <OverviewPage /> },
      { path: '/dashboard/forms', element: <FormsListPage /> },
      { path: '/dashboard/forms/:id/responses', element: <FormResponsesPage /> },
      { path: '/dashboard/forms/:id/analytics', element: <FormAnalyticsPage /> },
      { path: '/dashboard/forms/:id/share', element: <FormSharePage /> },
      { path: '/dashboard/forms/:id/settings', element: <FormSettingsPage /> },
      { path: '/developer/api-keys', element: <ApiKeysPage /> },
      { path: '/developer/webhooks', element: <WebhooksPage /> },
      { path: '/developer/api-docs', element: <ApiDocsPage /> },
      { path: '/account/profile', element: <ProfilePage /> },
      { path: '/account/billing', element: <BillingPage /> },
      { path: '/account/danger', element: <DangerZonePage /> },
    ],
  },

  // Form builder uses full-screen layout (not DashboardShell)
  {
    path: '/dashboard/forms/:id',
    element: (
      <RequireAuth>
        <FormBuilderPage />
      </RequireAuth>
    ),
  },

  // Public form view (no shell)
  { path: '/f/:slug', element: <PublicFormViewPage /> },

  // Redirects
  { path: '/home', element: <Navigate to="/" replace /> },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
