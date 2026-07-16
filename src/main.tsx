import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import CatalogPage from './pages/catalog'
import { AppShell } from './components/composites/app-shell'
import { ProtectedRoute } from './components/composites/protected-route'
import { AuthProvider } from './contexts/auth-context'
import { DashboardFiltersProvider } from './contexts/dashboard-filters-context'
import { RespostasPage } from './pages/respostas'
import { ResultadosPage } from './pages/resultados'

import { PerformancePage } from './pages/performance'

import { AuditoriaPage } from './pages/auditoria'
import { LeadDetailPage } from './pages/lead-detail'
import { LoginPage } from './pages/login'
import { ForgotPasswordPage } from './pages/forgot-password'
import { ResetPasswordPage } from './pages/reset-password'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardFiltersProvider>
          <AppShell />
        </DashboardFiltersProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/respostas" replace />
      },
      {
        path: 'respostas',
        element: <RespostasPage />
      },
      {
        path: 'resultados',
        element: <ResultadosPage />
      },
      {
        path: 'performance',
        element: <PerformancePage />
      },
      {
        path: 'auditoria',
        element: <AuditoriaPage />
      },
      {
        path: 'lead/:id',
        element: <LeadDetailPage />
      }
    ]
  },
  {
    path: '/catalog',
    element: <CatalogPage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
