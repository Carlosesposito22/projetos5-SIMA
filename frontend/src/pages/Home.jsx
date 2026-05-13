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

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            Você está autenticado
          </h2>
          <p className="text-slate-600 mb-6">
            Esta é a tela placeholder do SIMA. Conforme as histórias US01–US08
            forem implementadas, o mapa de alagamentos, os alertas e o painel
            da Defesa Civil aparecem aqui.
          </p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Linha label="Email" valor={user?.email} />
            <Linha label="Perfil" valor={ROTULOS_ROLE[user?.role] || user?.role} />
            <Linha label="Bairro" valor={user?.bairro || '—'} />
            <Linha label="Telefone" valor={user?.telefone || '—'} />
          </dl>
        </div>
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
