/**
 * Cliente HTTP do SIMA.
 *
 * Anexa o access token JWT em toda requisição e, ao receber 401,
 * tenta renovar uma única vez via /api/users/refresh/. Se a renovação
 * falhar, limpa os tokens e força redirect pra tela de login.
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ACCESS_KEY = 'sima:access'
const REFRESH_KEY = 'sima:refresh'

export const tokens = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const access = tokens.getAccess()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// Fila de requisições paradas enquanto o refresh está em andamento — evita
// disparar múltiplos refreshes paralelos quando várias chamadas dão 401 juntas.
let refreshing = false
let fila = []

const concluirRefresh = (novoAccess) => {
  fila.forEach((resolver) => resolver(novoAccess))
  fila = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    const ehRequisicaoDeRefresh = original?.url?.includes('/api/users/refresh/')
    if (status !== 401 || original._retry || !tokens.getRefresh() || ehRequisicaoDeRefresh) {
      return Promise.reject(error)
    }

    original._retry = true

    if (refreshing) {
      return new Promise((resolve) => {
        fila.push((novoAccess) => {
          original.headers.Authorization = `Bearer ${novoAccess}`
          resolve(api(original))
        })
      })
    }

    refreshing = true
    try {
      const { data } = await axios.post(`${API_URL}/api/users/refresh/`, {
        refresh: tokens.getRefresh(),
      })
      tokens.set(data.access, data.refresh)
      concluirRefresh(data.access)
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch (refreshErro) {
      tokens.clear()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshErro)
    } finally {
      refreshing = false
    }
  }
)
