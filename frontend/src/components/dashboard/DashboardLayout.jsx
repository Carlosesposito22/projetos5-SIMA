/**
 * Layout compartilhado das páginas do painel da Defesa Civil (US06).
 *
 * Renderiza header com marca + navegação por abas (Visão geral, Gráficos)
 * e delega o corpo pra rota filha via <Outlet />.
 */

import { Link, NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { MenuPerfil } from '../MenuPerfil'
// DEMO-MODE — remover antes de subir em produção (ver lib/demoMode.jsx)
import { BannerDemo } from '../../lib/demoMode'

const ABAS_BASE = [
  { rota: '/dashboard', rotulo: 'Visão geral', end: true },
  { rota: '/dashboard/graficos', rotulo: 'Gráficos', end: false },
  { rota: '/dashboard/painel-cop', rotulo: 'Painel COP', end: false }, // só aqui
]
const ABAS_ADMIN = [
  { rota: '/dashboard/sensores', rotulo: 'Sensores IoT', end: false },
  { rota: '/dashboard/usuarios', rotulo: 'Usuários', end: false },
]

export function DashboardLayout() {
  const { user } = useAuth()
  const abas = user?.role === 'admin' ? [...ABAS_BASE, ...ABAS_ADMIN] : ABAS_BASE

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[1100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard"
              className="text-xl font-bold text-blue-600 tracking-tight"
            >
              SIMA
            </Link>
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="hidden sm:inline text-sm text-slate-600 truncate">
              Painel da Defesa Civil
            </span>
          </div>
          <MenuPerfil />
        </div>

        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 -mb-px"
          aria-label="Seções do painel"
        >
          {abas.map((aba) => (
            <NavLink
              key={aba.rota}
              to={aba.rota}
              end={aba.end}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`
              }
            >
              {aba.rotulo}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 relative">
        {/* DEMO-MODE */}
        <BannerDemo />
        {/* FIM DEMO-MODE */}
        <Outlet />
      </main>
    </div>
  )
}
