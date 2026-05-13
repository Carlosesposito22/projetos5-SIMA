import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ESTADO_INICIAL = {
  nome: '',
  email: '',
  telefone: '',
  bairro: '',
  password: '',
  password_confirm: '',
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(ESTADO_INICIAL)
  const [erros, setErros] = useState({})
  const [submetendo, setSubmetendo] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErros({})
    setSubmetendo(true)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setErros(data)
      } else {
        setErros({ _geral: 'Não foi possível cadastrar agora. Tente novamente.' })
      }
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

        <h2 className="text-xl font-semibold text-slate-800 mb-6">Criar conta</h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Campo
            label="Nome completo"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            erro={primeiroErro(erros.nome)}
            required
          />
          <Campo
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            erro={primeiroErro(erros.email)}
            required
          />
          <Campo
            label="Telefone (WhatsApp)"
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            erro={primeiroErro(erros.telefone)}
            placeholder="81999999999"
          />
          <Campo
            label="Bairro"
            name="bairro"
            value={form.bairro}
            onChange={handleChange}
            erro={primeiroErro(erros.bairro)}
            placeholder="Ibura, Boa Viagem..."
          />
          <Campo
            label="Senha"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            erro={primeiroErro(erros.password)}
            required
          />
          <Campo
            label="Confirmar senha"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            value={form.password_confirm}
            onChange={handleChange}
            erro={primeiroErro(erros.password_confirm)}
            required
          />

          {erros._geral && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erros._geral}
            </div>
          )}

          <button
            type="submit"
            disabled={submetendo}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submetendo ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-slate-600">
          Já tem conta?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

function Campo({ label, name, erro, ...inputProps }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...inputProps}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  )
}

// O DRF devolve erros como array de strings por campo; pegamos só o primeiro.
function primeiroErro(valor) {
  if (Array.isArray(valor)) return valor[0]
  return valor || null
}
