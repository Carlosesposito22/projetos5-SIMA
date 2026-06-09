import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PERFIL_CIDADAO = 'cidadao'
const PERFIL_DEFESA  = 'defesa_civil'
const PERFIL_ADMIN   = 'admin'

const CREDENCIAIS_DEMO_DEFESA = { email: 'defesa@sima.local', senha: 'defesa123' }
const CREDENCIAIS_DEMO_ADMIN  = { email: 'admin@sima.local',  senha: 'admin123'  }

const ABAS = [
  { value: PERFIL_CIDADAO, rotulo: 'Cidadão' },
  { value: PERFIL_DEFESA,  rotulo: 'Defesa Civil' },
  { value: PERFIL_ADMIN,   rotulo: 'Admin' },
]

export function Login() {
  const { login, logout } = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const destinoSolicitado = location.state?.from?.pathname || null

  const perfilInicial =
    destinoSolicitado === '/dashboard' ? PERFIL_DEFESA : PERFIL_CIDADAO

  const [perfil, setPerfil]       = useState(perfilInicial)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [erro, setErro]           = useState(null)
  const [submetendo, setSubmetendo] = useState(false)

  const ehCidadao  = perfil === PERFIL_CIDADAO
  const ehOperador = perfil === PERFIL_DEFESA
  const ehAdmin    = perfil === PERFIL_ADMIN

  const trocarPerfil = (novo) => {
    if (novo === perfil) return
    setPerfil(novo)
    setEmail('')
    setPassword('')
    setErro(null)
  }

  const preencherDemo = (creds) => {
    setEmail(creds.email)
    setPassword(creds.senha)
    setErro(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro(null)
    setSubmetendo(true)
    try {
      const usuario = await login(email, password)

      if (ehOperador && !['defesa_civil', 'admin'].includes(usuario.role)) {
        await logout()
        setErro('Esta conta não tem acesso ao Painel da Defesa Civil.')
        return
      }

      if (ehAdmin && usuario.role !== 'admin') {
        await logout()
        setErro('Esta conta não tem perfil de administrador.')
        return
      }

      const destino =
        destinoSolicitado || (ehCidadao ? '/' : '/dashboard')
      navigate(destino, { replace: true })
    } catch (err) {
      setErro(
        err.response?.status === 401
          ? 'Email ou senha incorretos.'
          : 'Não foi possível entrar agora. Tente novamente.',
      )
    } finally {
      setSubmetendo(false)
    }
  }

  const titulo = ehCidadao
    ? 'Entrar como cidadão'
    : ehOperador
      ? 'Entrar como operador'
      : 'Entrar como administrador'

  const subtitulo = ehCidadao
    ? 'Acesso ao mapa de alagamentos de Recife.'
    : ehOperador
      ? 'Acesso ao painel de monitoramento da Defesa Civil.'
      : 'Acesso completo ao sistema, incluindo gestão de sensores IoT.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">SIMA</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistema Inteligente de Monitoramento e Alerta
          </p>
        </div>

        {/* Seletor de perfil */}
        <div
          role="tablist"
          aria-label="Tipo de acesso"
          className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg"
        >
          {ABAS.map((aba) => (
            <button
              key={aba.value}
              type="button"
              role="tab"
              aria-selected={perfil === aba.value}
              onClick={() => trocarPerfil(aba.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                perfil === aba.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-1">{titulo}</h2>
        <p className="text-sm text-slate-500 mb-6">{subtitulo}</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {erro && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={submetendo}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submetendo ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Rodapé por perfil */}
        {ehCidadao && (
          <p className="mt-6 text-sm text-center text-slate-600">
            Não tem conta?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        )}

        {ehOperador && (
          <DemoCard
            creds={CREDENCIAIS_DEMO_DEFESA}
            descricao="Pra explorar o painel, o sistema cria automaticamente uma conta de Defesa Civil:"
            onPreencher={() => preencherDemo(CREDENCIAIS_DEMO_DEFESA)}
          />
        )}

        {ehAdmin && (
          <DemoCard
            creds={CREDENCIAIS_DEMO_ADMIN}
            descricao="Pra explorar as funcionalidades de administrador, incluindo gestão de sensores IoT:"
            onPreencher={() => preencherDemo(CREDENCIAIS_DEMO_ADMIN)}
          />
        )}
      </div>
    </div>
  )
}

function DemoCard({ creds, descricao, onPreencher }) {
  return (
    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 text-blue-900 font-semibold">
        <span aria-hidden="true">🔑</span>
        <span>Conta de demonstração</span>
      </div>
      <p className="text-slate-700 leading-snug">{descricao}</p>
      <dl className="font-mono text-slate-800 bg-white border border-blue-100 rounded-md p-2 space-y-0.5">
        <div className="flex gap-2">
          <dt className="text-slate-500 w-12">email:</dt>
          <dd className="select-all">{creds.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-slate-500 w-12">senha:</dt>
          <dd className="select-all">{creds.senha}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onPreencher}
        className="text-blue-700 font-medium hover:underline"
      >
        Preencher automaticamente
      </button>
    </div>
  )
}
