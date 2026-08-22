import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
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
import { CampaignRoiPage } from './pages/campaign-roi'
import { LeadDetailPage } from './pages/lead-detail'
import { UsuariosPage } from './pages/usuarios'
import { ExerciciosPage } from './pages/exercicios'
import { ProtocolosPage } from './pages/protocolos'
import { RegrasPage } from './pages/regras'
import { LiberarUsuarioPage } from './pages/liberar-usuario'
import { ConfiguracoesPage } from './pages/configuracoes'
import { AvaliacaoPage } from './pages/avaliacao'
import { SugestoesPage } from './pages/sugestoes'
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
        element: <Navigate to="/roi-campanhas" replace />
      },
      {
        element: <ProtectedRoute group="traffic"><Outlet /></ProtectedRoute>,
        children: [
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
            path: 'roi-campanhas',
            element: <CampaignRoiPage />
          },
          {
            path: 'lead/:id',
            element: <LeadDetailPage />
          }
        ]
      },
      {
        element: <ProtectedRoute group="crm"><Outlet /></ProtectedRoute>,
        children: [
          {
            path: 'crm/dashboard',
            element: <Navigate to="/crm/usuarios" replace />
          },
          {
            path: 'crm/usuarios',
            element: <UsuariosPage />
          },
          {
            path: 'crm/avaliacao',
            element: <AvaliacaoPage />
          },
          {
            path: 'crm/sugestoes',
            element: <SugestoesPage />
          },
          {
            path: 'crm/conquistas',
            element: <Navigate to="/crm/usuarios" replace />
          },
          {
            path: 'crm/exercicios',
            element: <ExerciciosPage />
          },
          {
            path: 'crm/protocolos',
            element: <ProtocolosPage />
          },
          {
            path: 'crm/regras',
            element: <RegrasPage />
          },
          {
            path: 'crm/liberar-usuario',
            element: <LiberarUsuarioPage />
          },
          {
            path: 'crm/configuracoes',
            element: <ConfiguracoesPage />
          },
          {
            path: 'crm/relatorios',
            element: <Navigate to="/crm/usuarios" replace />
          }
        ]
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

import { TooltipProvider } from '@/components/atoms/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </StrictMode>,
)
