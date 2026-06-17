import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute, PublicOnly, RoleProtectedRoute } from './components/ProtectedRoute'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Mapa } from './pages/Mapa'
import { Reportar } from './pages/Reportar'
import { Alertas } from './pages/Alertas'
import { Dashboard } from './pages/Dashboard'
import { DashboardGraficos } from './pages/DashboardGraficos'
import { SensoresAdmin } from './pages/SensoresAdmin'
import { UsuariosAdmin } from './pages/UsuariosAdmin'
import { Perfil } from './pages/Perfil'
import { PainelCOP } from './pages/PainelCop'

function HomePorPerfil() {
  const { user } = useAuth()
  if (user?.role === 'defesa_civil' || user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <Mapa />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/" element={<ProtectedRoute><HomePorPerfil /></ProtectedRoute>} />
          <Route path="/reportar" element={<ProtectedRoute><Reportar /></ProtectedRoute>} />
          <Route path="/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />

          <Route
            element={
              <RoleProtectedRoute roles={['defesa_civil', 'admin']}>
                <DashboardLayout />
              </RoleProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/graficos" element={<DashboardGraficos />} />
            <Route path="/dashboard/painel-cop" element={<PainelCOP />} />
            <Route path="/dashboard/sensores" element={<RoleProtectedRoute roles={['admin']}><SensoresAdmin /></RoleProtectedRoute>} />
            <Route path="/dashboard/usuarios" element={<RoleProtectedRoute roles={['admin']}><UsuariosAdmin /></RoleProtectedRoute>} />
          </Route>

          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
