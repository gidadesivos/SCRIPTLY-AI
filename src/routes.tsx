import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { AuthCallback } from '@/features/auth/components/AuthCallback'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { BrandsListPage } from '@/features/brands/BrandsListPage'
import { BrandEditorPage } from '@/features/brands/BrandEditorPage'
import { ProductsListPage } from '@/features/products/ProductsListPage'
import { ProductEditorPage } from '@/features/products/ProductEditorPage'
import { CreatePage } from '@/features/create/CreatePage'
import { ScriptEditorPage } from '@/features/scripts/ScriptEditorPage'
import { ScriptsListPage } from '@/features/scripts/ScriptsListPage'

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
