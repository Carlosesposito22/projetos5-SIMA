/**
 * Contexto de autenticação do SIMA.
 *
 * Mantém o usuário em memória e expõe login/cadastro/logout. Ao montar,
 * se houver access token guardado, hidrata o usuário via /api/users/me/.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { api, tokens } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tokens.getAccess()) {
      setLoading(false)
      return
    }
    api
      .get('/api/users/me/')
      .then((res) => setUser(res.data))
      .catch(() => tokens.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/api/users/login/', { email, password })
    tokens.set(data.access, data.refresh)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await api.post('/api/users/register/', payload)
    tokens.set(data.access, data.refresh)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    const refresh = tokens.getRefresh()
    try {
      if (refresh) {
        await api.post('/api/users/logout/', { refresh })
      }
    } catch {
      // Se o servidor rejeitar o token, ainda assim limpamos local.
    }
    tokens.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  }
  return ctx
}
