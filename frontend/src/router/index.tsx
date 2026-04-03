import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import OAuthCallbackPage from '../pages/auth/OAuthCallbackPage'

// Lazy placeholders for app pages (to be built next)
import { lazy, Suspense } from 'react'

const DashboardPage    = lazy(() => import('../pages/app/DashboardPage'))
const AgentPage        = lazy(() => import('../pages/app/AgentPage'))
const ChatPage         = lazy(() => import('../pages/app/ChatPage'))
const FinancePage      = lazy(() => import('../pages/app/FinancePage'))
const MessagesPage     = lazy(() => import('../pages/app/MessagesPage'))
const DocumentsPage    = lazy(() => import('../pages/app/DocumentsPage'))
const LabsPage         = lazy(() => import('../pages/app/LabsPage'))
const AppsPage         = lazy(() => import('../pages/app/AppsPage'))
const PlansPage        = lazy(() => import('../pages/app/PlansPage'))
const ProfilePage      = lazy(() => import('../pages/app/ProfilePage'))
const EditProfilePage  = lazy(() => import('../pages/app/EditProfilePage'))

const Loader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#C6A15B', fontFamily: 'Questrial, sans-serif', fontSize: 13,
  }}>
    Cargando...
  </div>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { index: true,           element: <LoginPage /> },
      { path: 'register',      element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'oauth-callback',  element: <OAuthCallbackPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,          element: <Suspense fallback={<Loader />}><DashboardPage /></Suspense> },
      { path: 'agent',        element: <Suspense fallback={<Loader />}><AgentPage /></Suspense> },
      { path: 'chat',         element: <Suspense fallback={<Loader />}><ChatPage /></Suspense> },
      { path: 'finance',      element: <Suspense fallback={<Loader />}><FinancePage /></Suspense> },
      { path: 'messages',     element: <Suspense fallback={<Loader />}><MessagesPage /></Suspense> },
      { path: 'documents',    element: <Suspense fallback={<Loader />}><DocumentsPage /></Suspense> },
      { path: 'labs',         element: <Suspense fallback={<Loader />}><LabsPage /></Suspense> },
      { path: 'apps',         element: <Suspense fallback={<Loader />}><AppsPage /></Suspense> },
      { path: 'plans',        element: <Suspense fallback={<Loader />}><PlansPage /></Suspense> },
      { path: 'profile',      element: <Suspense fallback={<Loader />}><ProfilePage /></Suspense> },
      { path: 'profile/edit', element: <Suspense fallback={<Loader />}><EditProfilePage /></Suspense> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
