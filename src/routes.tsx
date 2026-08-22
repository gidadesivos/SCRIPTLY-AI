import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { AuthCallback } from '@/features/auth/components/AuthCallback'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'

/**
 * Login e callback entram no bundle inicial: são a primeira coisa que um
 * visitante deslogado vê, e adiar isso só adiaria a tela.
 *
 * O resto é carregado sob demanda. Antes, abrir a tela de login baixava também
 * o editor com dnd-kit, os formulários de marca e produto e todo o fluxo de
 * criação — quase 1 MB antes de pintar o primeiro pixel.
 */
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const CreatePage = lazy(() =>
  import('@/features/create/CreatePage').then((m) => ({ default: m.CreatePage })),
)
const ScriptsListPage = lazy(() =>
  import('@/features/scripts/ScriptsListPage').then((m) => ({ default: m.ScriptsListPage })),
)
const ScriptEditorPage = lazy(() =>
  import('@/features/scripts/ScriptEditorPage').then((m) => ({ default: m.ScriptEditorPage })),
)
const BrandsListPage = lazy(() =>
  import('@/features/brands/BrandsListPage').then((m) => ({ default: m.BrandsListPage })),
)
const BrandEditorPage = lazy(() =>
  import('@/features/brands/BrandEditorPage').then((m) => ({ default: m.BrandEditorPage })),
)
const ProductsListPage = lazy(() =>
  import('@/features/products/ProductsListPage').then((m) => ({ default: m.ProductsListPage })),
)
const ProductEditorPage = lazy(() =>
  import('@/features/products/ProductEditorPage').then((m) => ({ default: m.ProductEditorPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/create', element: <CreatePage /> },
          { path: '/scripts', element: <ScriptsListPage /> },
          { path: '/scripts/:scriptId', element: <ScriptEditorPage /> },
          { path: '/brands', element: <BrandsListPage /> },
          { path: '/brands/new', element: <BrandEditorPage /> },
          { path: '/brands/:brandId', element: <BrandEditorPage /> },
          { path: '/products', element: <ProductsListPage /> },
          { path: '/products/new', element: <ProductEditorPage /> },
          { path: '/products/:productId', element: <ProductEditorPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
