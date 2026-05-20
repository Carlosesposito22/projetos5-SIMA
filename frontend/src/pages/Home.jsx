import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROTULOS_ROLE = {
  cidadao: 'Cidadão',
  defesa_civil: 'Defesa Civil',
  admin: 'Administrador',
}

export function Home() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">SIMA</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-700">
              Olá, <strong>{user?.nome}</strong>
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-2">
            Viu um alagamento?
          </h2>
          <p className="text-blue-100 mb-6 max-w-xl">
            Avise outros moradores e ajude a Defesa Civil a chegar mais rápido.
            Seu relato entra no mapa em segundos.
          </p>
          <Link
            to="/reportar"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition"
          >
            Reportar agora
          </Link>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Seu perfil
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Linha label="Email" valor={user?.email} />
            <Linha label="Perfil" valor={ROTULOS_ROLE[user?.role] || user?.role} />
            <Linha label="Bairro" valor={user?.bairro || '—'} />
            <Linha label="Telefone" valor={user?.telefone || '—'} />
          </dl>
        </section>
      </main>
    </div>
  )
}

function Linha({ label, valor }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium">{valor}</dd>
    </div>
  )
}
