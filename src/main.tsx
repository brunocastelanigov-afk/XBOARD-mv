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
import { DashboardPage } from './pages/dashboard'
import { UsuariosPage } from './pages/usuarios'
import { ConquistasPage } from './pages/conquistas'
import { ExerciciosPage } from './pages/exercicios'
import { ProtocolosPage } from './pages/protocolos'
import { BannersPage } from './pages/banners'
import { RegrasPage } from './pages/regras'
import { LiberarUsuarioPage } from './pages/liberar-usuario'
import { ConfiguracoesPage } from './pages/configuracoes'
import { RelatoriosPage } from './pages/relatorios'
import { AvaliacaoPage } from './pages/avaliacao'
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
            element: <DashboardPage />
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
            path: 'crm/conquistas',
            element: <ConquistasPage />
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
            path: 'crm/banners',
            element: <BannersPage />
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
          }
        ]
      },
      {
        // Sem group: /crm/relatorios não está na lista final da Story 15.1 (mesmo
        // precedente da Story 15.3 na sidebar) — segue só com o gate base (session +
        // isAllowedTeamUser) do ProtectedRoute pai, sem checagem de role.
        path: 'crm/relatorios',
        element: <RelatoriosPage />
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
