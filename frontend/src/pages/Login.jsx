import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState(null)
  const [submetendo, setSubmetendo] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro(null)
    setSubmetendo(true)
    try {
      await login(email, password)
      navigate(destino, { replace: true })
    } catch (err) {
      setErro(
        err.response?.status === 401
          ? 'Email ou senha incorretos.'
          : 'Não foi possível entrar agora. Tente novamente.'
      )
    } finally {
      setSubmetendo(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">SIMA</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistema Inteligente de Monitoramento e Alerta
          </p>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-6">Entrar</h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
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

        <p className="mt-6 text-sm text-center text-slate-600">
          Não tem conta?{' '}
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
