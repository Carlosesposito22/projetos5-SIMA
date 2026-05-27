/**
 * Dropdown de perfil no header — nome, email, role, bairro e sair.
 */

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const ROTULOS_ROLE = {
  cidadao: 'Cidadão',
  defesa_civil: 'Defesa Civil',
  admin: 'Administrador',
}

export function MenuPerfil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [aberto, setAberto] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!aberto) return

    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false)
      }
    }

    document.addEventListener('mousedown', handler)

    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  if (!user) return null

  const inicial = (user.nome || '?').trim().charAt(0).toUpperCase()

  function navegar(rota) {
    navigate(`/${rota}`)
    setAberto(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 text-sm text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition"
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
          {inicial}
        </span>

        <span className="hidden sm:inline font-medium">
          {user.nome}
        </span>

        <span
          className="text-slate-400 text-xs"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-lg p-4 space-y-3"
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {user.nome}
            </div>

            <div className="text-xs text-slate-500 break-all">
              {user.email}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <Linha
              label="Perfil"
              valor={ROTULOS_ROLE[user.role] || user.role}
            />

            <Linha
              label="Bairro"
              valor={user.bairro?.nome || '—'}
            />

            <Linha
              label="Telefone"
              valor={user.telefone || '—'}
            />
          </dl>

          <button
            type="button"
            onClick={() => navegar('alertas')}
            className="w-full text-sm text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg py-2 hover:bg-slate-100 transition"
            role="menuitem"
          >
            Ver Alertas
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-sm text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg py-2 hover:bg-slate-100 transition"
            role="menuitem"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

function Linha({ label, valor }) {
  return (
    <div>
      <dt className="text-slate-500 uppercase tracking-wide text-[10px]">
        {label}
      </dt>

      <dd className="text-slate-800 font-medium truncate">
        {valor}
      </dd>
    </div>
  )
}
